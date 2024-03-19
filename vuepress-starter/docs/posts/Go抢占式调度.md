---
date: 2022-03-05
category:
  - Go
tag:
  - Go
---

## 2.6 抢占式调度
### 2.6.0 sysmon监听抢占时机
sysmon是一个Go里面的一个特殊的线程，不与任何P绑定，不参与调度，主要用于监控整个Go进程，主要有如下作用：
1. 释放闲置超过5分钟的span物理内存
2. 超过2分钟没有垃圾回收，强制启动垃圾回收
3. 将长时间没有处理的netpoll结果添加到任务队列
4. 向长时间执行的G任务发起抢占调度
5. 收回因syscall而长时间阻塞的P


sysmon线程在runtime.main函数里面创建：
```go
func main() {
    ...
      if GOARCH != "wasm" { // no threads on wasm yet, so no sysmon
      // 启动sysmon的代码
      // 在系统栈内生成一个新的M来启动sysmon
      atomic.Store(&sched.sysmonStarting, 1)
        systemstack(func() {
          newm(sysmon, nil, -1)
      })
    }
  ...
}
```
在**线程M的创建过程**中有提到newm函数，该函数用来创建一个内核线程m，设置启动函数为首个参数。执行流程为newm-->newm1-->newosporc->pthread_create-->runtime.mstart-->runtime.mstart1-->mstartfn-->schedule；此处mstartfn便是sysmon函数。由于sysmon函数是死循环的，所以监控线程永远不会执行到后面的调度程序schedule
以下为sysmon函数循环检查Go进程的过程：
```go
func sysmon() {
    lasttrace := int64(0)
    idle := 0 // 每次扫描无需抢占的计数器，无须抢占次数越多，后续sysmon线程休眠时间越高
    delay := uint32(0)
    for {
        // delay按idel值来判断休眠时间，首次20us，1ms之后sleep逐步翻倍，最高10ms
        // ......
        usleep(delay)
        // poll网络监听，处理超过10ms以上的netpoll
        lastpoll := sched.lastpoll.Load()
        if netpollinited() && lastpoll != 0 && lastpoll+10*1000*1000 < now {
            sched.lastpoll.CompareAndSwap(lastpoll, now)
            list := netpoll(0) // non-blocking - returns list of goroutines
            if !list.empty() {
                injectglist(&list)
            }
        }
        //检查是否有协程需要抢占
        if retake(now) != 0 {
            idle = 0 // 发生抢占，计数器设置为0，sysmon休眠时间重设为初始值20us
        } else {
            idle++
        }
        // 检查是否需要强制gc
        if t := (gcTrigger{kind: gcTriggerTime, now: now}); t.test() && forcegc.idle.Load() {
            lock(&forcegc.lock)
            forcegc.idle.Store(false)
            var list gList
            list.push(forcegc.g)
            injectglist(&list)
            unlock(&forcegc.lock)
        }
    }
}
```


sysmon监控线程判断是否需要抢占主要通过retake函数进行检查，遍历所有的P，如果某个P经过10ms没有切换都没有协程，那么就需要被抢占了。
```go
const forcePreemptNS = 10 * 1000 * 1000 // 10ms


func retake(now int64) uint32 {
    // ......
    for i := 0; i < len(allp); i++ {
        pp := allp[i]
        pd := &pp.sysmontick
        s := pp.status
        sysretake := false
        if s == _Prunning || s == _Psyscall {
            // Preempt G if it's running for too long.
            t := int64(pp.schedtick)
            if int64(pd.schedtick) != t {
                pd.schedtick = uint32(t)
                pd.schedwhen = now
            } else if pd.schedwhen+forcePreemptNS <= now {
                // 遍历所有的P，到某个P距离上一次调度在10ms以上，需要执行抢占
                preemptone(pp)
                sysretake = true
            }
        }
        // ......
    }
}
```
找到需要抢占的P后，调用preemptone(pp)对P当前运行的协程进行抢占。抢占的方式有两种，一种是基于协作的抢占，一种是基于信号的抢占
```go
const(
    // 0xfffffade in hex.
    stackPreempt = 0xfffffade // (1<<(8*sys.PtrSize) - 1) & -1314
)
func preemptone(pp *p) bool {
    mp := pp.m.ptr()
    gp := mp.curg
    gp.preempt = true
    // 基于协程的抢占
    // stackPreempt是一个很大的常量，其他地方会检查这个变量，当go的stackgurad0栈为这个数值时，标明需要被抢占
    gp.stackguard0 = stackPreempt
    if preemptMSupported && debug.asyncpreemptoff == 0 {
        pp.preempt = true
        // 设置基于信号的抢占
        preemptM(mp)
    }
    return true
}
```


### 2.6.1 基于协作的抢占式调度
在1.14版本之前，只有基于协作的抢占式调度，即preemptone函数中只有设置`gp.stackguard0 = stackPreempt`，而没有后面的`preemptM(mp)`过程。
由于goroutine初始栈桢很小（2kb），为了避免栈溢出，go语言编译期会在函数头部加上栈增长检测代码，如果在函数调用时编译器发现栈不够用了或者g.stackguard0 = stackPreempt，将会调用runtime.morestack来进行栈增长，而runtime.morestack是个汇编函数，又会调用runtime.newstack。
再morestack中首先要保存好当前协程的上下文，之后该协程继续从这个位置执行。保存完成之后调用newstack
```go
TEXT runtime·morestack(SB),NOSPLIT,$0-0
    ...
    MOVQ    0(SP), AX // f's PC
    MOVQ    AX, (g_sched+gobuf_pc)(SI)
    MOVQ    SI, (g_sched+gobuf_g)(SI)
    LEAQ    8(SP), AX // f's SP
    MOVQ    AX, (g_sched+gobuf_sp)(SI)
    MOVQ    BP, (g_sched+gobuf_bp)(SI)
    MOVQ    DX, (g_sched+gobuf_ctxt)(SI)
    ...
    CALL    runtime·newstack(SB)
```
newstack函数执行的栈扩张逻辑，在扩张之前，首先会检查是否是要协程抢占
```go
func newstack() {
    thisg := getg()
    ...


    gp := thisg.m.curg
    ...
    // 判断是否执行抢占
    preempt := atomic.Loaduintptr(&gp.stackguard0) == stackPreempt


    // 保守的对用户态代码进行抢占，而非抢占运行时代码
    // 如果正持有锁、分配内存或抢占被禁用，则不发生抢占
    if preempt {
        if !canPreemptM(thisg.m) {
            // 不发生抢占，继续调度
            gp.stackguard0 = gp.stack.lo + _StackGuard
            gogo(&gp.sched) // 重新进入调度循环
        }
    }
    ...
    // 如果需要对栈进行调整
    if preempt {
        ...
        if gp.preemptShrink {
            // 我们正在一个同步安全点，因此等待栈收缩
            gp.preemptShrink = false
            shrinkstack(gp)
        }
        if gp.preemptStop {
            preemptPark(gp) // 封存当前状态，之后调用schedule，永不返回
        }
        ...
        // 表现得像是调用了 runtime.Gosched，主动让权
        gopreempt_m(gp) // 重新进入调度循环
    }
    // 执行栈扩张逻辑
    ...
}


// 抢占函数，最终调用goschedImpl
func gopreempt_m(gp *g) {
    goschedImpl(gp)
}
```
当newstack判断是发生了抢占时，会调用到goschedImpl函数，可以看到，会先把当前的g放到全局队列，然后开始调度
```go
func goschedImpl(gp *g) {
    casgstatus(gp, _Grunning, _Grunnable)
    dropg()
    lock(&sched.lock)
    // 将被抢占的协程g，放到全局的sched.runq队列中，等被其他m执行
    globrunqput(gp)
    unlock(&sched.lock)
    // 执行调度
    schedule()
}
```
### 2.6.2 基于信号的抢占式调度
一个不参与任何函数调用的函数，直到执行完毕之前， 是不会被抢占的。如协程里面就一个for{}循环，将无法被抢占
1.14版本增加了基于信号的抢占式调度，`preemptM(mp)`
```go
// src/runtime/signal_unix.go
func preemptM(mp *m) {
    if GOOS == "darwin" || GOOS == "ios" {
        execLock.rlock()
    }
    if atomic.Cas(&mp.signalPending, 0, 1) {
        if GOOS == "darwin" || GOOS == "ios" {
            atomic.Xadd(&pendingPreemptSignals, 1)
        }
        // const sigPreempt=0x17该信号表示抢占信号
        signalM(mp, sigPreempt)
    }
    if GOOS == "darwin" || GOOS == "ios" {
        execLock.runlock()
    }
}


// src/runtime/os_darwin.go
func signalM(mp *m, sig int) {
    // 在苹果系统中，执行pthread_kill来向m所在的进程发送sig信号
    pthread_kill(pthread(mp.procid), uint32(sig))
}


// src/runtime/os_linux.go
func signalM(mp *m, sig int) {
    // linux 执行汇编函数tgkill来发送信号
    tgkill(getpid(), int(mp.procid), sig)
}
```
可见，基于信号的抢占式调度是通过监控线程sysmon发现有10ms以上未调度的P时，通过执行signalM对Go进程发送抢占信号（0x17）
Go进程收到该信号之后是如何执行抢占的呢，我们先来看信号是如何注册的
1. 在初始化时注册信号
```go
// src/runtime/signal_unix.go
func initsig(preinit bool) {
    // 预初始化
    if !preinit {
        signalsOK = true
    }
    //遍历信号数组 _NSIG=65
    for i := uint32(0); i < _NSIG; i++ {
        t := &sigtable[i]
        //略过信号：SIGKILL、SIGSTOP、SIGTSTP、SIGCONT、SIGTTIN、SIGTTOU
        if t.flags == 0 || t.flags&_SigDefault != 0 {
            continue
        }
        ...  
        setsig(i, funcPC(sighandler))
    }
}


// src/runtime/os_unix.go
func setsig(i uint32, fn uintptr) {
    var sa sigactiont
    sa.sa_flags = _SA_SIGINFO | _SA_ONSTACK | _SA_RESTORER | _SA_RESTART
    sigfillset(&sa.sa_mask)
    if fn == abi.FuncPCABIInternal(sighandler) { // abi.FuncPCABIInternal(sighandler) matches the callers in signal_unix.go
        if iscgo {
            // cgoSigtramp函数中还是会调用sighandler函数，多包了一层
            fn = abi.FuncPCABI0(cgoSigtramp)
        } else {
            fn = abi.FuncPCABI0(sigtramp)
        }
    }
    sa.sa_handler = fn
    sigaction(i, &sa, nil)
}
```
在initsig中先遍历信号数组调用setsig进行注册，setsig中会执行系统调用来安装信号和信号处理函数。我们继续看信号处理函数
```go
// src/runtime/signal_unix.go


func sighandler(sig uint32, info *siginfo, ctxt unsafe.Pointer, gp *g) {
    // The g executing the signal handler. This is almost always
    // mp.gsignal. See delayedSignal for an exception.
    gsignal := getg()
    mp := gsignal.m
    c := &sigctxt{info, ctxt}
    // const sigPreempt = _SIGURG = 0x17
    if sig == sigPreempt {
        // 是一个抢占信号
        doSigPreempt(gp, c)
    }
    ...
}


// doSigPreempt handles a preemption signal on gp.
func doSigPreempt(gp *g, ctxt *sigctxt) {
    if wantAsyncPreempt(gp) {
        if ok, newpc := isAsyncSafePoint(gp, ctxt.sigpc(), ctxt.sigsp(), ctxt.siglr()); ok {
            // Adjust the PC and inject a call to asyncPreempt.
            ctxt.pushCall(abi.FuncPCABI0(asyncPreempt), newpc)
        }
    }
    // Acknowledge the preemption.
    gp.m.preemptGen.Add(1)
    gp.m.signalPending.Store(0)
}
```
在信号处理函数sighandler中，对于抢占信号，会执行doSigPreempt函数，其中会通过pushcall插入syncPreempt函数调用
```go
// src/runtime/preempt_arm.s
TEXT ·asyncPreempt(SB),NOSPLIT|NOFRAME,$0-0
    ...
    CALL ·asyncPreempt2(SB)
    ...


```
syncPreempt最终调用了asyncPreempt2()函数
```go
// src/runtime/preempt.go
func asyncPreempt2() {
    gp := getg()
    gp.asyncSafePoint = true
    if gp.preemptStop {
        mcall(preemptPark)
    } else {
        mcall(gopreempt_m)
    }
    gp.asyncSafePoint = false
}
```
可见，兜兜转转，最终跟基于协作的信号抢占一样，执行preemptPark或gopreempt_m函数来执行schedule


信号抢占的整体逻辑如下：
1. M 注册一个 SIGURG 信号的处理函数：sighandler。
2. sysmon 线程检测到执行时间过长的 goroutine、GC stw 时，会向相应的 M（或者说线程，每个线程对应一个 M）发送 SIGURG 信号。
3. 收到信号后，内核执行 sighandler 函数，通过 pushCall 插入 asyncPreempt 函数调用。
4. 回到当前 goroutine 执行 asyncPreempt 函数，通过 mcall 切到 g0 栈执行 gopreempt_m。
5. 将当前 goroutine 插入到全局可运行队列，M 则继续寻找其他 goroutine 来运行。
6. 被抢占的 goroutine 再次调度过来执行时，会继续原来的执行流。
---
date: 2023-03-05
category:
  - Go
  - CategoryB
tag:
  - Go
---

## 2.4 GMP源码剖析


### 2.4.1 协程G结构体
```go
// src/runtime/runtime2.go


type g struct {
    stack       stack   // 保存当前协程栈的上界和下界
    // stackguard0 是对比 Go 栈增长的 prologue 的栈指针
    // 如果 sp 寄存器比 stackguard0 小（由于栈往低地址方向增长），会触发栈拷贝和调度
    // 通常情况下：stackguard0 = stack.lo + StackGuard，但被抢占时会变为 StackPreempt
    stackguard0 uintptr // offset known to liblink
    // stackguard1 是对比 C 栈增长的 prologue 的栈指针
    // 当位于 g0 和 gsignal 栈上时，值为 stack.lo + StackGuard
    // 在其他栈上值为 ~0 用于触发 morestackc (并 crash) 调用
    stackguard1 uintptr // offset known to liblink
    _panic    *_panic   // 这个协程里面的panic列表
    _defer    *_defer   // 这个协程里面的defer列表
    m           *m      // 当前g占用的线程m
    sched       gobuf   // 协程调度的上下文数据 保存PC，SP等寄存器，协程切换的参数，描述了执行现场
    atomicstatus atomic.Uint32 // G 的状态
    syscallsp   uintptr // if status==Gsyscall, syscallsp = sched.sp to use during gc
    syscallpc   uintptr // if status==Gsyscall, syscallpc = sched.pc to use during gc
    stktopsp    uintptr // expected sp at top of stack, to check in traceback
    goid        uint64  // 协程唯一id？
    preempt     bool    // 是否可以抢占 preemption signal, duplicates stackguard0 = stackpreempt
    preemptStop   bool // transition to _Gpreempted on preemption; otherwise, just deschedule
    preemptShrink bool // shrink stack at synchronous safe point
    ...
```
每个协程创建的时候都分配了大小为2k的栈，用stack进行保存，栈范围为[stack.lo, stack.hi),
```go
// src/runtime/runtime2.go


type stack struct {
    lo uintptr // 栈顶，低地址
    hi uintptr // 栈底，高地址
}
```
gobuf结构体用来保存协程切换的上下文信息，协程创建时可以保存协程的初始状态，协程被调度时，可以将当前协程的运行状态保存起来，方便后续恢复，从这个结构体可以看出，协程的切换开销很小
```go
// src/runtime/runtime2.go


type gobuf struct {
    sp   uintptr // sp堆栈寄存器，永远指向栈顶位置
    pc   uintptr // pc寄存器的值
    g    guintptr
    ctxt unsafe.Pointer // gc时候使用
    ret  uintptr // ret用来保存系统调用的返回值
    lr   uintptr // 保存返回地址
    bp   uintptr // 基址寄存器，配合sp寄存器使用，某一时刻的栈顶位置
}
```


协程状态用atomic原子变量来保存，由如下几种状态
```go
const(
    _Gidle = iota // 0
    _Grunnable // 1 在运行队列中等待被调度
    _Grunning // 2 正在m上运行
    _Gsyscall // 3 正在执行系统调用
    _Gwaiting // 4 阻塞状态
    _Gdead // 6 协程处于被销毁状态
    _Gcopystack // 8 栈扩容或缩容阶段
    _Gpreempted // 9 g被抢占后的状态
)
```


### 2.4.2 线程M结构体
结构体m保存了M自身使用的栈信息、当前正在M上执行的G，以及绑定M的P指针等。
```go
// src/runtime/runtime2.go


type m struct {
    // 当前线程执行调度逻辑的协程g0的指针，g0同时使用是系统栈
    g0      *g    
    morebuf gobuf  // gobuf arg to morestack
    gsignal       *g                // 每个m都创建了一个信号处理的协程gsignal
    sigmask       sigset            // 存储信号掩码，当前线程的信号屏蔽字
    ...
    tls           [tlsSlots]uintptr // 线程本地存储 thread-local storage
    mstartfn      func()            // M的起始函数，go协程执行的函数
    curg          *g       // 指向当前运行的协程g
    p             puintptr // 指向当前绑定的处理器p
    nextp         puintptr
    oldp          puintptr // 系统调用之前本协程绑定的P，系统调用结束之后首先找这个P
    id            int64     // 线程id
    spinning      bool      // M当前状态 自旋态表示在寻址可运行的g
    blocked       bool      // M当前状态 阻塞态 m is blocked on a note
    alllink       *m        // on allm 记录所有工作线程的一个链表
```


**g0协程：** 需要注意的是,每个线程m创建时就会创建一个名为g0的协程，该协程使用的是线程的系统栈，负责普通协程在M上面的调度。协程切换时，也是先从当前协程切换到g0协程执行调度代码,g0找到下一个执行的协程之后，再切换到新的协程去执行。
**m0线程：** m0线程便是Go进程启动的初始线程，在进程启动函数rt0_go中将初始线程其赋值给m0，将系统栈赋值给g0，同时完成m0和g0的绑定。
### 2.4.3 处理器P结构体
P中保存了本地协程运行队列，协程运行所需的资源如内存，运行线程等
```go
type p struct {
    id          int32
    status      uint32      // 当前p的状态，空闲、运行、陷入系统调用、停止、死亡
    link        puintptr
    schedtick   uint32     // 协程调度次数计数器（10ms没有调度过，就会启动抢占）
    syscalltick uint32     // 系统调用计数器
    sysmontick  sysmontick // 监听线程sysmon监听次数计数器
    m           muintptr   // 当前p关联的内核线程m
    mcache      *mcache     // 用于分配微小对象和小对象的一个块的缓存空间，里面有各种不同等级的span
    pcache      pageCache   // 一个chunk大小（512kb）的内存空间，用来对堆上内存分配的缓存优化达到无锁访问的目的
    raceprocctx uintptr


    deferpool    []*_defer // pool of available defer structs (see panic.go)
    deferpoolbuf [32]*_defer


    // 可以分配给g的id的缓存，每次会一次性申请16个
    goidcache    uint64
    goidcacheend uint64


    // 保存可运行的g本地队列，后续可以无锁访问
    runqhead uint32
    runqtail uint32
    runq     [256]guintptr
    runnext guintptr


    // 用于复用已经需要销毁的g，将状态改为Gdead，不直接销毁而是存储起来复用
    gFree struct {
        gList
        n int32
    }


    sudogcache []*sudog
    sudogbuf   [128]*sudog


    // 从全局heap中分配128个mspan对象
    mspancache struct {
        len int
        buf [128]*mspan
    }
    ...
}
```
从结构体中可知，P中保存了一个长度为256的协程数组，可以无锁访问。当p的队列满了之后，创建的协程g将会放到全局队列里面。P中也保存了当前关联的内核线程m指针
P中缓存了协程g用于分配的内存块，协程首先从当前p的内存块分配内存，不够再由P去heap中申请新的内存块


### 2.4.5 协程G的创建过程
协程由关键字go创建，go关键字最终会解析成函数调用runtime.newproc(fn *funcval)，过程如下：
1. 在systemstack函数里面执行核心逻辑。systemstack作用是切换到g0系统栈，在系统栈上面执行核心逻辑，执行完成后systemstack函数会切换回当前协程的栈,
    ```go
    // src/runtime/proc.go


    // 协程的启动函数
    func newproc(fn *funcval) {
        gp := getg()
        pc := getcallerpc()
        // 切换到g0栈执行，执行完成后切回原来的栈空间
        systemstack(func() {
            // 核心逻辑创建协程
            newg := newproc1(fn, gp, pc)
            pp := getg().m.p.ptr()
            // 将创建的协程保存到当前p中，局部性原理，放满了就放到全局队列
            runqput(pp, newg, true)


            if mainStarted {
                // 在所有的空闲P链表里面，唤醒第一个P，并调度M（没有则创建）去运行这个P
                wakep()
            }
        })
    }
    ```


2. 协程创建的核心逻辑再runtime.newproc1函数中
    ```go
    // src/runtime/newproc1


    func newproc1(fn *funcval, callergp *g, callerpc uintptr) *g {
        if fn == nil {
            fatal("go of nil func value")
        }


        mp := acquirem() // disable preemption because we hold M and P in local vars.
        pp := mp.p.ptr()
        // 从当前P的gFree协程队列里面取一个来复用，当前P的gFree如果为空，就从全局gFree队列里面取
        newg := gfget(pp)
        if newg == nil {
            // 新建一个栈大小为2k的g对象，将栈顶和栈底保存到newg.stack里面
            newg = malg(_StackMin)
            casgstatus(newg, _Gidle, _Gdead)
            // 将新创建的g的指针保存到全局的allgs数组中，新创建的g未防止被gc扫描，将g的状态改为Gdead
            allgadd(newg)
        }


        totalSize := uintptr(4*goarch.PtrSize + sys.MinFrameSize) // extra space in case of reads slightly beyond frame
        totalSize = alignUp(totalSize, sys.StackAlign)
        sp := newg.stack.hi - totalSize
        spArg := sp
        if usesLR {
            // caller's LR
            *(*uintptr)(unsafe.Pointer(sp)) = 0
            prepGoExitFrame(sp)
            spArg += sys.MinFrameSize
        }
        // 初始化g对象的gobuf，调度用的sp、pc、任务函数等
        memclrNoHeapPointers(unsafe.Pointer(&newg.sched), unsafe.Sizeof(newg.sched))
        newg.sched.sp = sp
        newg.stktopsp = sp
        // 这里先将pc指向goexit地址，后续这个pc值会在gostartcallfn函数中塞在sp中，也就是栈底位置，而这个位置是go函数调用的return addr，所以协程任务函数执行完成后会执行goexit函数
        newg.sched.pc = abi.FuncPCABI0(goexit) + sys.PCQuantum // +PCQuantum so that previous instruction is in same function
        newg.sched.g = guintptr(unsafe.Pointer(newg))
        // 填充sched这个gobuf结构体，设置newg.sched的堆栈指针sp，pc指向协程的任务函数fn
        gostartcallfn(&newg.sched, fn)
        newg.gopc = callerpc
        newg.ancestors = saveAncestors(callergp)
        newg.startpc = fn.fn
        //......
        casgstatus(newg, _Gdead, _Grunnable)
        gcController.addScannableStack(pp, int64(newg.stack.hi-newg.stack.lo))
        // 分配goid
        if pp.goidcache == pp.goidcacheend {
            pp.goidcache = sched.goidgen.Add(_GoidCacheBatch)
            pp.goidcache -= _GoidCacheBatch - 1
            pp.goidcacheend = pp.goidcache + _GoidCacheBatch
        }
        newg.goid = pp.goidcache
        pp.goidcache++
        //......
        releasem(mp)


        return newg
    }
    ```
3. 协程创建完成后，将协程插入到当前M对应的P上面，也就是跟父协程在同一个P上面。
4. 所有的空闲P链表里面，唤醒第一个P，并调度M（没有则创建）去运行这个P，调用链为wakep()-->startm(pp *p, spinning bool)
### 2.4.6 协程G的退出过程
协程的创建过程中已经分析了，通过将goexit函数设置在协程栈底位置，使得协程执行完任务函数fn后会调用goexit函数。
```go
// src/runtime/asm_arm64.s


// 大部分在协程上面运行的函数，最终的返回值都是指向goexit函数
TEXT runtime·goexit(SB),NOSPLIT|NOFRAME|TOPFRAME,$0-0
    MOVD    R0, R0  // NOP
    BL  runtime·goexit1(SB) // does not return
```


runtime.goexit最终会执行runtime.goexit1函数
```go
// src/runtime/proc.go
func goexit1() {
    if raceenabled {
        racegoend()
    }
    if trace.enabled {
        traceGoEnd()
    }
    mcall(goexit0)
}
```
runtime.goexit1函数内，会通过mcall来调用goexit0函数，mcall函数和之前的systemstack函数类似，都是用汇编写的，mcall函数将当前栈切换到所在m的g0的栈，但结束之后不会切会原来的栈。
```go
// src/runtime/asm_arm64.s


// mcall用于切换到m所在g0的栈，由于不会再次切换到之前协程的栈，所以，mcall执行的函数必须没有返回
TEXT runtime·mcall<ABIInternal>(SB), NOSPLIT|NOFRAME, $0-8
    MOVD    R0, R26             // context


    // Save caller state in g->sched
    // 保存当前协程的状态到gobuf里面
    MOVD    RSP, R0
    MOVD    R0, (g_sched+gobuf_sp)(g)
    MOVD    R29, (g_sched+gobuf_bp)(g)
    MOVD    LR, (g_sched+gobuf_pc)(g)
    MOVD    $0, (g_sched+gobuf_lr)(g)


    // Switch to m->g0 & its stack, call fn.
    MOVD    g, R3
    MOVD    g_m(g), R8
    MOVD    m_g0(R8), g // 将g切换到g0，使得后面g.sched是使用的g0的栈
    BL  runtime·save_g(SB)
    CMP g, R3       // 保证调用者g不是g0
    BNE 2(PC)
    B   runtime·badmcall(SB)


    MOVD    (g_sched+gobuf_sp)(g), R0
    MOVD    R0, RSP // sp = m->g0->sched.sp
    MOVD    (g_sched+gobuf_bp)(g), R29
    MOVD    R3, R0              // arg = g
    MOVD    $0, -16(RSP)            // dummy LR
    SUB $16, RSP
    MOVD    0(R26), R4          // code pointer
    BL  (R4)                    // 调用fn函数，该函数不会返回，不然返回后会调用badmcall2
    B   runtime·badmcall2(SB)
```


mcall函数使用g0栈调用goexit0，并最终在goexit0里面执行循环，不会返回
```go
// src/runtime/proc.go


func goexit0(gp *g) {
    mp := getg().m
    pp := mp.p.ptr()
    // 将当前协程状态改为Gdead
    casgstatus(gp, _Grunning, _Gdead)
    gcController.addScannableStack(pp, -int64(gp.stack.hi-gp.stack.lo))
    if isSystemGoroutine(gp, false) {
        sched.ngsys.Add(-1)
    }
    gp.m = nil
    locked := gp.lockedm != 0
    gp.lockedm = 0
    mp.lockedg = 0
    gp.preemptStop = false
    // ......
    // 修改gp的各项值


    if gcBlackenEnabled != 0 && gp.gcAssistBytes > 0 {
        // gc 设置
        assistWorkPerByte := gcController.assistWorkPerByte.Load()
        scanCredit := int64(assistWorkPerByte * float64(gp.gcAssistBytes))
        gcController.bgScanCredit.Add(scanCredit)
        gp.gcAssistBytes = 0
    }
    // 将g设置过不使用，并将g插入到当前p的gFree队列里面，方便后面创建协程的时候复用这些协程
    dropg()
    gfput(pp, gp)
    // mcall已经切换到了g0，在g0栈里面执行下一次协程调度。
    schedule()
}
```
可见，最终goexit0函数会执行协程调度代码，从而在当前协程g退出之后，m开始执行在g0栈上开始执行下一轮调度
### 2.4.7 协程G的切换过程
当协程调度完成，寻找到下一个要执行的协程之后，需要切换到新协程执行，切换的核心逻辑便是用汇编写的gogo函数
```go
// src/runtime/asm_386.s


// void gogo(gpbuf Gobuf*)
// restore state from Gobuf; longjmp
TEXT runtime·gogo(SB), NOSPLIT, $0-4
    MOVL    buf+0(FP), BX       // gobuf
    MOVL    gobuf_g(BX), DX
    MOVL    0(DX), CX       // make sure g != nil
    JMP gogo<>(SB)


TEXT gogo<>(SB), NOSPLIT, $0
    get_tls(CX)
    MOVL    DX, g(CX)
    MOVL    gobuf_sp(BX), SP    // restore SP 将SP寄存器的值设置为新协程的gp.sched.sp
    MOVL    gobuf_ret(BX), AX   //
    MOVL    gobuf_ctxt(BX), DX
    MOVL    $0, gobuf_sp(BX)    // clear to help garbage collector
    MOVL    $0, gobuf_ret(BX)
    MOVL    $0, gobuf_ctxt(BX)
    MOVL    gobuf_pc(BX), BX    // 将要JMP过去的位置设置为新协程的gp.sched.pc
    JMP BX


```
### 2.4.8 协程G的栈内存分配
https://golang.design/under-the-hood/zh-cn/part2runtime/ch06sched/stack/
### 2.4.9 处理器P的创建过程
处理器的创建是在初始化阶段schedinit函数中创建的，通过系统调用获取当前cpu个数，也可也环境变量来配置需要创建多少个P
```go
// src/runtime/proc.go


func schedinit() {
    lock(&sched.lock)
    sched.lastpoll.Store(nanotime())
    procs := ncpu
    if n, ok := atoi32(gogetenv("GOMAXPROCS")); ok && n > 0 {
        procs = n
    }
    if procresize(procs) != nil {
        throw("unknown runnable goroutine during bootstrap")
    }
    unlock(&sched.lock)
}


// scheinit里面的全局变量 ncpu=getncpu()
func getncpu() int32 {
    mib := [2]uint32{_CTL_HW, _HW_NCPU}
    out := uint32(0)
    nout := unsafe.Sizeof(out)
    ret := sysctl(&mib[0], 2, (*byte)(unsafe.Pointer(&out)), &nout, nil, 0)
    if ret >= 0 {
        return int32(out)
    }
    return 1
}
```


创建P的核心函数是procesize(proc)，初始化和后续修改P的数据也都是调用该函数
```go
func procresize(nprocs int32) *p {
    // 创建或者修改P的数量的时候，需要全局加锁，且STW
    assertLockHeld(&sched.lock)
    assertWorldStopped()


    // Grow allp if necessary.
    if nprocs > int32(len(allp)) {
        lock(&allpLock)
        if nprocs <= int32(cap(allp)) {
            // 如果是缩小p的数量，直接从之前的allp里面截取所需的长度
            allp = allp[:nprocs]
        } else {
            nallp := make([]*p, nprocs)
            // 创建一个新的nallp，如果之前的allp里面已经有数据，全部拷贝过去
            copy(nallp, allp[:cap(allp)])
            allp = nallp
        }
    }


    // initialize new P's
    for i := old; i < nprocs; i++ {
        pp := allp[i]
        if pp == nil {
            pp = new(p)
        }
        pp.init(i)
        atomicstorep(unsafe.Pointer(&allp[i]), unsafe.Pointer(pp))
    }


    gp := getg()
    if gp.m.p != 0 && gp.m.p.ptr().id < nprocs {
        //如果当前p的id小于当前p的数量，则继续使用当前p
        gp.m.p.ptr().status = _Prunning
        gp.m.p.ptr().mcache.prepareForSweep()
    } else {
        // 如果
        if gp.m.p != 0 {
            if trace.enabled {
                // Pretend that we were descheduled
                // and then scheduled again to keep
                // the trace sane.
                traceGoSched()
                traceProcStop(gp.m.p.ptr())
            }
            gp.m.p.ptr().m = 0
        }
        gp.m.p = 0
        pp := allp[0]
        pp.m = 0
        pp.status = _Pidle
        acquirep(pp)
        if trace.enabled {
            traceGoStart()
        }
    }


    // g.m.p is now set, so we no longer need mcache0 for bootstrapping.
    mcache0 = nil


    // p的数量缩容，多的需要销毁
    for i := nprocs; i < old; i++ {
        pp := allp[i]
        pp.destroy()
        // can't free P itself because it can be referenced by an M in syscall
    }


    var runnablePs *p
    for i := nprocs - 1; i >= 0; i-- {
        pp := allp[i]
        if gp.m.p.ptr() == pp {
            continue
        }
        pp.status = _Pidle
        if runqempty(pp) {
            pidleput(pp, now)
        } else {
            // 把当前空闲的m绑定到p上面，mget()会循环从空闲m队列里面取，没有了返回nil
            pp.m.set(mget())
            pp.link.set(runnablePs)
            runnablePs = pp
        }
    }
    return runnablePs
}
```



### 2.4.9 线程M的创建过程
首先需要明确的是m0线程是进程启动就创建的初始线程，除m0外的线程m1，m2...才是通过本节所讨论的创建方式创建的
在前面的**协程G的创建过程**一节中，我们分析了创建了协程之后，会将新协程插入到P中，然后调用startm来获取一个m运行P，当没有空闲的m时，则会调用newm(fn func(), pp *p, id int64)创建一个m
```go
// src/runtime/proc.go


func newm(fn func(), pp *p, id int64) {
    acquirem()
    // 创建一个m结构体，m的起始函数为fn
    mp := allocm(pp, fn, id)
    mp.nextp.set(pp)
    mp.sigmask = initSigmask
    // ......
    // 用m参数创建一个系统线程
    newm1(mp)
    releasem(getg().m)
}
```
allocm函数中会创建和初始化一个m结构体，线程的创建过程在
```go
// pp:需要初始化绑定待创建的m的p；fn：线程启动执行的函数，如自旋函数mspinning；id：待创建线程m的id
func allocm(pp *p, fn func(), id int64) *m {
    allocmLock.rlock()
     // 将_g_对应的m的locks加1，防止被抢占
    acquirem()


    gp := getg()
    if gp.m.p == 0 {
        acquirep(pp) // temporarily borrow p for mallocs in this function
    }
    // 创建一个m结构体，并设置起始函数是fn
    mp := new(m)
    mp.mstartfn = fn
    mcommoninit(mp, id)


    if iscgo || mStackIsSystemAllocated() {
        mp.g0 = malg(-1)
    } else {
        // 创建一个设置栈大小为8M的g结构体赋值给m的g0
        mp.g0 = malg(8192 * sys.StackGuardMultiplier)
    }
    // 这个m的g0和自身进行绑定
    mp.g0.m = mp


    if pp == gp.m.p.ptr() {
        releasep()
    }
    // 解除_g_的m的禁止抢占状态
    releasem(gp.m)
    allocmLock.runlock()
    return mp
}
```


```go
func newm1(mp *m) {
    execLock.rlock() // Prevent process clone.
    newosproc(mp)
    execLock.runlock()
}
```
newm1最终调用newosproc函数，在该函数里面通过系统调用pthread_create创建一个系统线程
```go
// src/runtime/os_darwin.go


func newosproc(mp *m) {
    stk := unsafe.Pointer(mp.g0.stack.hi)
    if false {
        print("newosproc stk=", stk, " m=", mp, " g=", mp.g0, " id=", mp.id, " ostk=", &mp, "\n")
    }


    // Initialize an attribute object.
    var attr pthreadattr
    var err int32
    err = pthread_attr_init(&attr)
    if err != 0 {
        write(2, unsafe.Pointer(&failthreadcreate[0]), int32(len(failthreadcreate)))
        exit(1)
    }


    // Find out OS stack size for our own stack guard.
    // 获取线程的系统栈大小赋值给g0
    var stacksize uintptr
    if pthread_attr_getstacksize(&attr, &stacksize) != 0 {
        write(2, unsafe.Pointer(&failthreadcreate[0]), int32(len(failthreadcreate)))
        exit(1)
    }
    mp.g0.stack.hi = stacksize // 设置hi为size， for mstart


    // 通过系统调用创建线程，使用mstart_stub，而mstart_stub最终会调用runtime.mstart
    // Finally, create the thread. It starts at mstart_stub, which does some low-level
    // setup and then calls mstart.
    var oset sigset
    sigprocmask(_SIG_SETMASK, &sigset_all, &oset)
    err = pthread_create(&attr, abi.FuncPCABI0(mstart_stub), unsafe.Pointer(mp))
}
```
pthread_create创建的线程执行的是mstart_stub，并最终执行runtime.mstart。在go程序启动时，初始线程（m0）执行rt0_go代码最终也是会执行到mstart开启调度
```go
TEXT runtime·mstart_stub(SB),NOSPLIT,$0
    PUSH_REGS_HOST_TO_ABI0()
    MOVQ    m_g0(DI), DX // g
    MOVQ    DX, 0x30(GS)


    CALL    runtime·mstart(SB)


    POP_REGS_HOST_TO_ABI0()
    XORL    AX, AX
    RET
```


### 2.4.10 线程M的启动过程
线程M的启动在runtime.mstart中启动，但是该函数在汇编中直接调用了runtime.mstart0。无论是进程初始线程m0，还是后续我们通过newm创建的线程，都会进入该函数进行启动线程并最终陷入协程调度中
```go
func mstart0() {
    gp := getg()
    // gp指向的是g0，newosproc中填充g0的hi为size
    osStack := gp.stack.lo == 0
    if osStack {
        size := gp.stack.hi
        if size == 0 {
            size = 8192 * sys.StackGuardMultiplier
        }
        gp.stack.hi = uintptr(noescape(unsafe.Pointer(&size)))
        gp.stack.lo = gp.stack.hi - size + 1024
    }
    gp.stackguard0 = gp.stack.lo + _StackGuard
    gp.stackguard1 = gp.stackguard0
    mstart1()


    if mStackIsSystemAllocated() {
        osStack = true
    }
    mexit(osStack)
}
```
mstart0会调用mstart1来启动调度
```go
func mstart1() {
    gp := getg()
    // 一定是g0
    if gp != gp.m.g0 {
        throw("bad runtime·mstart")
    }


    // g的gobuf结构体sched保存当前上下文
    gp.sched.g = guintptr(unsafe.Pointer(gp))
    gp.sched.pc = getcallerpc()
    gp.sched.sp = getcallersp()


    asminit()
    // 初始化m并设置m.g0的stack
    minit()


    // 对于m0线程，即进程主线程，需要注册一些信号处理函数
    if gp.m == &m0 {
        mstartm0()
    }
    // 对于m0线程，mstartfn没有设置过？自己创建的m，可以不设置，也可以设置为自旋
    if fn := gp.m.mstartfn; fn != nil {
        fn()
    }


    if gp.m != &m0 {
        acquirep(gp.m.nextp.ptr())
        gp.m.nextp = 0
    }
    // 此时一定是在g0上面执行调度
    schedule()
}
```
## 2.5 调度器源码分析
### 2.5.1 系统全局变量
```go
    // 存储所有的m，通过m.alllink相连。allm指向最新一个m，然后最新m的alllink指向之前一个m，直到m0
    allm       *m      
    gomaxprocs int32
    ncpu       int32    // cpu核数
    forcegc    forcegcstate
    sched      schedt   // 全局调度器
    newprocs   int32    
    allpLock mutex
    allp []*p           // 保存所有的p指针
    gcBgMarkWorkerPool lfstack
    gcBgMarkWorkerCount int32
```
### 2.5.2 调度器schedt结构体
保存调度器的状态信息以及全局空闲的M、P列表、goroutine的全局运行队列。该结构体变量sched是全局变量，保存了很多全局数据，多数要加锁修改。
```go
type schedt struct {
    goidgen   atomic.Uint64
    lastpoll  atomic.Int64 // time of last network poll, 0 if currently polling
    pollUntil atomic.Int64 // time to which current poll is sleeping
    lock mutex
    midle        muintptr // 等待运行的空闲M列表
    nmidle       int32    // 空闲M列表中元素个数
    nmidlelocked int32    // number of locked m's waiting for work
    mnext        int64    // number of m's that have been created and next M ID
    maxmcount    int32    // 最多只能创建maxmcount个工作线程
    nmsys        int32    // number of system m's not counted for deadlock
    nmfreed      int64    // cumulative number of freed m's
    ngsys atomic.Int32 // number of system goroutines
    pidle        puintptr // 由空闲的p结构体对象组成的链表
    npidle       atomic.Int32 // 空闲的p结构体对象的数量
    nmspinning   atomic.Int32  // See "Worker thread parking/unparking" comment in proc.go.
    needspinning atomic.Uint32 // See "Delicate dance" comment in proc.go. Boolean. Must hold sched.lock to set to 1.
    // goroutine的全局运行队列
    runq     gQueue
    runqsize int32
    disable struct {
        // user disables scheduling of user goroutines.
        user     bool
        runnable gQueue // pending runnable Gs
        n        int32  // length of runnable
    }
    // gFree是所有状态已经死亡（dead）的goroutine对应的g结构体对象组成的链表
    // 用于缓存g结构体对象，避免每次创建goroutine时都需要重新分配
    gFree struct {
        lock    mutex
        stack   gList // Gs with stacks
        noStack gList // Gs without stacks
        n       int32
    }


    // Central cache of sudog structs.
    sudoglock  mutex
    sudogcache *sudog


    // 保存已经退出的m，等待被释放
    freem *m


    gcwaiting  atomic.Bool // gc is waiting to run
    stopwait   int32
    stopnote   note
    sysmonwait atomic.Bool
    sysmonnote note
    // ......
}
```




### 2.5.3 调度器初始化
在进程启动入口汇编函数rt0_go里面，完成m0和g0的绑定之后，就会调用调度器初始化函数schedinit，该函数是启动时由主线程m0调用，仅会执行一次
```go
func schedinit() {
    lockInit(&sched.lock, lockRankSched)
    // lockInit......
    gp := getg()
    // 系统线程M最多10000个
    sched.maxmcount = 10000
    // The world starts stopped.
    worldStopped()


    moduledataverify()
    stackinit()
    mallocinit()
    cpuinit()      // must run before alginit
    alginit()      // maps, hash, fastrand must not be used before this call
    fastrandinit() // must run before mcommoninit
    mcommoninit(gp.m, -1)
    gcinit()


    lock(&sched.lock)
    sched.lastpoll.Store(nanotime())
    procs := ncpu
    if n, ok := atoi32(gogetenv("GOMAXPROCS")); ok && n > 0 {
        procs = n
    }
    // 调度器初始化时会创建cpu核数相同或者环境变量GOMAXPROCS个处理器P
    if procresize(procs) != nil {
        throw("unknown runnable goroutine during bootstrap")
    }
    unlock(&sched.lock)


    // World is effectively started now, as P's can run.
    worldStarted()
}
```


### 2.5.4 调度器启动调度流程
启动协程调度主要是通过调用runtime.schedule,多个场景均会启动协程调度
1. 线程m启动时，无论时初始线程m0，还是后来创建的线程，线程都会执行runtime.mstart0初始化m，完成初始化之后便执行调度函数schedule
2. 协程主动让渡其他协程执行Goched
3. 发生协程抢占（preemptPark）的时候
4. 当前协程执行协程挂起操作goyield
5. 当前协程退出时（goexit）


### 2.5.5 调度器调度流程
```go
func schedule() {
    mp := getg().m
top:
    pp := mp.p.ptr()
    pp.preempt = false


    // 调度策略 阻塞在查找可执行的g，用本地p的队列g，没有用全局队列的g
    gp, inheritTime, tryWakeP := findRunnable() // blocks until work is available
    // 在当前m上运行协程g，该函数不再返回
    execute(gp, inheritTime)
}
```
协程调度函数通过协程调度策略在寻找到可以运行的g之后，调用execute来执行该协程。具体调度策略都在findRunable中，后续会介绍
```go
// 入参： gp:待运行的g指针，inheritTime：是否要增加当前P的调度计数tick
func execute(gp *g, inheritTime bool) {
    mp := getg().m


    // Assign gp.m before entering _Grunning so running Gs have an
    // M.
    mp.curg = gp
    gp.m = mp
    casgstatus(gp, _Grunnable, _Grunning)
    gp.waitsince = 0
    gp.preempt = false
    gp.stackguard0 = gp.stack.lo + _StackGuard
    if !inheritTime {
        mp.p.ptr().schedtick++
    }


    // 用来从gobuf中恢复出协程执行状态并跳转到上一次指令处继续执行
    gogo(&gp.sched)
}
```
execute将协程g设置为运行态之后，调用gogo切换到该协程,通过汇编语言，将CPU寄存器以及函数调用栈切换为g的sched中相关指针和协程栈
```go
// src/runtime/asm_arm64.s


TEXT runtime·gogo(SB), NOSPLIT, $16-8
    // 0（FP）表示第一个参数，即buf=&gp.sched
    MOVW    buf+0(FP), R1   //gobuf
    MOVW    gobuf_g(R1), R0
    MOVW    0(R0), R2   // make sure g != nil
    B   gogo<>(SB)


TEXT gogo<>(SB),NOSPLIT|NOFRAME,$0
    BL  setg<>(SB)
    // 栈指针的切换，当前SP指向g0的栈，此处切换回gp.sched里面的sp指针，即完成了从g0到g的栈切换
    MOVW    gobuf_sp(R1), R13   // restore SP==R13
    MOVW    gobuf_lr(R1), LR
    MOVW    gobuf_ret(R1), R0
    MOVW    gobuf_ctxt(R1), R7
    // 切换完成后，将sched里面的字段都清空
    MOVW    $0, R11
    MOVW    R11, gobuf_sp(R1)   // clear to help garbage collector
    MOVW    R11, gobuf_ret(R1)
    MOVW    R11, gobuf_lr(R1)
    MOVW    R11, gobuf_ctxt(R1)
    // 将g.sched里面的pc值保存到BX里面，然后JMP跳转到该位置开始执行，开始执行协程g的代码
    MOVW    gobuf_pc(R1), R11
    CMP R11, R11 // set condition codes for == test, needed by stack split
    B   (R11)
```


### 2.5.6 协程调度策略
在调度器调度流程里面介绍，执行调度函数后，需要通过一定的策略找到下一个可运行的g，调度策略如下图：
<!-- ![tmp.jpg](/img/runnable.jpg) -->



调度策略主要是函数findRunnable()来完成
```go
// 返回参数
// gp: 返回可运行的协程g，可能是P的本地队列里面的，也可能是从别的P窃取过来的，也可能是全局获取的，还可能是poll network唤醒的
// inheriTime: 是否要增加当前P的调度计数tick
// tryWakeP: 如果是GC或者trace的协程，需要去唤醒一个P来执行
func findRunnable() (gp *g, inheritTime, tryWakeP bool) {
    mp := getg().m
    // 每隔61次从全局队列上获取一个可执行的G，P的本地队列都忙，全局协程也能执行。https://github.com/golang/go/issues/20168
    if pp.schedtick%61 == 0 && sched.runqsize > 0 {
        lock(&sched.lock)
        gp := globrunqget(pp, 1)
        unlock(&sched.lock)
        if gp != nil {
            return gp, false, false
        }
    }
    // local runq
    if gp, inheritTime := runqget(pp); gp != nil {
        return gp, inheritTime, false
    }
    // global runq
    if sched.runqsize != 0 {
        lock(&sched.lock)
        gp := globrunqget(pp, 0)
        unlock(&sched.lock)
        if gp != nil {
            return gp, false, false
        }
    }
    // Poll network.
    if netpollinited() && netpollWaiters.Load() > 0 && sched.lastpoll.Load() != 0 {
        if list := netpoll(0); !list.empty() { // non-blocking
            gp := list.pop()
            injectglist(&list)
            casgstatus(gp, _Gwaiting, _Grunnable)
            if trace.enabled {
                traceGoUnpark(gp, 0)
            }
            return gp, false, false
        }
    }


    // Spinning Ms: steal work from other Ps.
    if mp.spinning || 2*sched.nmspinning.Load() < gomaxprocs-sched.npidle.Load() {
        if !mp.spinning {
            mp.becomeSpinning()
        }


        gp, inheritTime, tnow, w, newWork := stealWork(now)
        if gp != nil {
            // Successfully stole.
            return gp, inheritTime, false
        }
        if newWork {
            // There may be new timer or GC work; restart to
            // discover.
            goto top
        }


        now = tnow
        if w != 0 && (pollUntil == 0 || w < pollUntil) {
            // Earlier timer to wait for.
            pollUntil = w
        }
    }
```
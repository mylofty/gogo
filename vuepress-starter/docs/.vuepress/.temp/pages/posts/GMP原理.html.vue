<template><div><h2 id="_2-4-gmp源码剖析" tabindex="-1"><a class="header-anchor" href="#_2-4-gmp源码剖析"><span>2.4 GMP源码剖析</span></a></h2>
<h3 id="_2-4-1-协程g结构体" tabindex="-1"><a class="header-anchor" href="#_2-4-1-协程g结构体"><span>2.4.1 协程G结构体</span></a></h3>
<div class="language-go line-numbers-mode" data-ext="go" data-title="go"><pre v-pre class="language-go"><code><span class="token comment">// src/runtime/runtime2.go</span>


<span class="token keyword">type</span> g <span class="token keyword">struct</span> <span class="token punctuation">{</span>
    stack       stack   <span class="token comment">// 保存当前协程栈的上界和下界</span>
    <span class="token comment">// stackguard0 是对比 Go 栈增长的 prologue 的栈指针</span>
    <span class="token comment">// 如果 sp 寄存器比 stackguard0 小（由于栈往低地址方向增长），会触发栈拷贝和调度</span>
    <span class="token comment">// 通常情况下：stackguard0 = stack.lo + StackGuard，但被抢占时会变为 StackPreempt</span>
    stackguard0 <span class="token builtin">uintptr</span> <span class="token comment">// offset known to liblink</span>
    <span class="token comment">// stackguard1 是对比 C 栈增长的 prologue 的栈指针</span>
    <span class="token comment">// 当位于 g0 和 gsignal 栈上时，值为 stack.lo + StackGuard</span>
    <span class="token comment">// 在其他栈上值为 ~0 用于触发 morestackc (并 crash) 调用</span>
    stackguard1 <span class="token builtin">uintptr</span> <span class="token comment">// offset known to liblink</span>
    _panic    <span class="token operator">*</span>_panic   <span class="token comment">// 这个协程里面的panic列表</span>
    _defer    <span class="token operator">*</span>_defer   <span class="token comment">// 这个协程里面的defer列表</span>
    m           <span class="token operator">*</span>m      <span class="token comment">// 当前g占用的线程m</span>
    sched       gobuf   <span class="token comment">// 协程调度的上下文数据 保存PC，SP等寄存器，协程切换的参数，描述了执行现场</span>
    atomicstatus atomic<span class="token punctuation">.</span>Uint32 <span class="token comment">// G 的状态</span>
    syscallsp   <span class="token builtin">uintptr</span> <span class="token comment">// if status==Gsyscall, syscallsp = sched.sp to use during gc</span>
    syscallpc   <span class="token builtin">uintptr</span> <span class="token comment">// if status==Gsyscall, syscallpc = sched.pc to use during gc</span>
    stktopsp    <span class="token builtin">uintptr</span> <span class="token comment">// expected sp at top of stack, to check in traceback</span>
    goid        <span class="token builtin">uint64</span>  <span class="token comment">// 协程唯一id？</span>
    preempt     <span class="token builtin">bool</span>    <span class="token comment">// 是否可以抢占 preemption signal, duplicates stackguard0 = stackpreempt</span>
    preemptStop   <span class="token builtin">bool</span> <span class="token comment">// transition to _Gpreempted on preemption; otherwise, just deschedule</span>
    preemptShrink <span class="token builtin">bool</span> <span class="token comment">// shrink stack at synchronous safe point</span>
    <span class="token operator">...</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>每个协程创建的时候都分配了大小为2k的栈，用stack进行保存，栈范围为[stack.lo, stack.hi),</p>
<div class="language-go line-numbers-mode" data-ext="go" data-title="go"><pre v-pre class="language-go"><code><span class="token comment">// src/runtime/runtime2.go</span>


<span class="token keyword">type</span> stack <span class="token keyword">struct</span> <span class="token punctuation">{</span>
    lo <span class="token builtin">uintptr</span> <span class="token comment">// 栈顶，低地址</span>
    hi <span class="token builtin">uintptr</span> <span class="token comment">// 栈底，高地址</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>gobuf结构体用来保存协程切换的上下文信息，协程创建时可以保存协程的初始状态，协程被调度时，可以将当前协程的运行状态保存起来，方便后续恢复，从这个结构体可以看出，协程的切换开销很小</p>
<div class="language-go line-numbers-mode" data-ext="go" data-title="go"><pre v-pre class="language-go"><code><span class="token comment">// src/runtime/runtime2.go</span>


<span class="token keyword">type</span> gobuf <span class="token keyword">struct</span> <span class="token punctuation">{</span>
    sp   <span class="token builtin">uintptr</span> <span class="token comment">// sp堆栈寄存器，永远指向栈顶位置</span>
    pc   <span class="token builtin">uintptr</span> <span class="token comment">// pc寄存器的值</span>
    g    guintptr
    ctxt unsafe<span class="token punctuation">.</span>Pointer <span class="token comment">// gc时候使用</span>
    ret  <span class="token builtin">uintptr</span> <span class="token comment">// ret用来保存系统调用的返回值</span>
    lr   <span class="token builtin">uintptr</span> <span class="token comment">// 保存返回地址</span>
    bp   <span class="token builtin">uintptr</span> <span class="token comment">// 基址寄存器，配合sp寄存器使用，某一时刻的栈顶位置</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>协程状态用atomic原子变量来保存，由如下几种状态</p>
<div class="language-go line-numbers-mode" data-ext="go" data-title="go"><pre v-pre class="language-go"><code><span class="token keyword">const</span><span class="token punctuation">(</span>
    _Gidle <span class="token operator">=</span> <span class="token boolean">iota</span> <span class="token comment">// 0</span>
    _Grunnable <span class="token comment">// 1 在运行队列中等待被调度</span>
    _Grunning <span class="token comment">// 2 正在m上运行</span>
    _Gsyscall <span class="token comment">// 3 正在执行系统调用</span>
    _Gwaiting <span class="token comment">// 4 阻塞状态</span>
    _Gdead <span class="token comment">// 6 协程处于被销毁状态</span>
    _Gcopystack <span class="token comment">// 8 栈扩容或缩容阶段</span>
    _Gpreempted <span class="token comment">// 9 g被抢占后的状态</span>
<span class="token punctuation">)</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_2-4-2-线程m结构体" tabindex="-1"><a class="header-anchor" href="#_2-4-2-线程m结构体"><span>2.4.2 线程M结构体</span></a></h3>
<p>结构体m保存了M自身使用的栈信息、当前正在M上执行的G，以及绑定M的P指针等。</p>
<div class="language-go line-numbers-mode" data-ext="go" data-title="go"><pre v-pre class="language-go"><code><span class="token comment">// src/runtime/runtime2.go</span>


<span class="token keyword">type</span> m <span class="token keyword">struct</span> <span class="token punctuation">{</span>
    <span class="token comment">// 当前线程执行调度逻辑的协程g0的指针，g0同时使用是系统栈</span>
    g0      <span class="token operator">*</span>g    
    morebuf gobuf  <span class="token comment">// gobuf arg to morestack</span>
    gsignal       <span class="token operator">*</span>g                <span class="token comment">// 每个m都创建了一个信号处理的协程gsignal</span>
    sigmask       sigset            <span class="token comment">// 存储信号掩码，当前线程的信号屏蔽字</span>
    <span class="token operator">...</span>
    tls           <span class="token punctuation">[</span>tlsSlots<span class="token punctuation">]</span><span class="token builtin">uintptr</span> <span class="token comment">// 线程本地存储 thread-local storage</span>
    mstartfn      <span class="token keyword">func</span><span class="token punctuation">(</span><span class="token punctuation">)</span>            <span class="token comment">// M的起始函数，go协程执行的函数</span>
    curg          <span class="token operator">*</span>g       <span class="token comment">// 指向当前运行的协程g</span>
    p             puintptr <span class="token comment">// 指向当前绑定的处理器p</span>
    nextp         puintptr
    oldp          puintptr <span class="token comment">// 系统调用之前本协程绑定的P，系统调用结束之后首先找这个P</span>
    id            <span class="token builtin">int64</span>     <span class="token comment">// 线程id</span>
    spinning      <span class="token builtin">bool</span>      <span class="token comment">// M当前状态 自旋态表示在寻址可运行的g</span>
    blocked       <span class="token builtin">bool</span>      <span class="token comment">// M当前状态 阻塞态 m is blocked on a note</span>
    alllink       <span class="token operator">*</span>m        <span class="token comment">// on allm 记录所有工作线程的一个链表</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p><strong>g0协程：</strong> 需要注意的是,每个线程m创建时就会创建一个名为g0的协程，该协程使用的是线程的系统栈，负责普通协程在M上面的调度。协程切换时，也是先从当前协程切换到g0协程执行调度代码,g0找到下一个执行的协程之后，再切换到新的协程去执行。
<strong>m0线程：</strong> m0线程便是Go进程启动的初始线程，在进程启动函数rt0_go中将初始线程其赋值给m0，将系统栈赋值给g0，同时完成m0和g0的绑定。</p>
<h3 id="_2-4-3-处理器p结构体" tabindex="-1"><a class="header-anchor" href="#_2-4-3-处理器p结构体"><span>2.4.3 处理器P结构体</span></a></h3>
<p>P中保存了本地协程运行队列，协程运行所需的资源如内存，运行线程等</p>
<div class="language-go line-numbers-mode" data-ext="go" data-title="go"><pre v-pre class="language-go"><code><span class="token keyword">type</span> p <span class="token keyword">struct</span> <span class="token punctuation">{</span>
    id          <span class="token builtin">int32</span>
    status      <span class="token builtin">uint32</span>      <span class="token comment">// 当前p的状态，空闲、运行、陷入系统调用、停止、死亡</span>
    link        puintptr
    schedtick   <span class="token builtin">uint32</span>     <span class="token comment">// 协程调度次数计数器（10ms没有调度过，就会启动抢占）</span>
    syscalltick <span class="token builtin">uint32</span>     <span class="token comment">// 系统调用计数器</span>
    sysmontick  sysmontick <span class="token comment">// 监听线程sysmon监听次数计数器</span>
    m           muintptr   <span class="token comment">// 当前p关联的内核线程m</span>
    mcache      <span class="token operator">*</span>mcache     <span class="token comment">// 用于分配微小对象和小对象的一个块的缓存空间，里面有各种不同等级的span</span>
    pcache      pageCache   <span class="token comment">// 一个chunk大小（512kb）的内存空间，用来对堆上内存分配的缓存优化达到无锁访问的目的</span>
    raceprocctx <span class="token builtin">uintptr</span>


    deferpool    <span class="token punctuation">[</span><span class="token punctuation">]</span><span class="token operator">*</span>_defer <span class="token comment">// pool of available defer structs (see panic.go)</span>
    deferpoolbuf <span class="token punctuation">[</span><span class="token number">32</span><span class="token punctuation">]</span><span class="token operator">*</span>_defer


    <span class="token comment">// 可以分配给g的id的缓存，每次会一次性申请16个</span>
    goidcache    <span class="token builtin">uint64</span>
    goidcacheend <span class="token builtin">uint64</span>


    <span class="token comment">// 保存可运行的g本地队列，后续可以无锁访问</span>
    runqhead <span class="token builtin">uint32</span>
    runqtail <span class="token builtin">uint32</span>
    runq     <span class="token punctuation">[</span><span class="token number">256</span><span class="token punctuation">]</span>guintptr
    runnext guintptr


    <span class="token comment">// 用于复用已经需要销毁的g，将状态改为Gdead，不直接销毁而是存储起来复用</span>
    gFree <span class="token keyword">struct</span> <span class="token punctuation">{</span>
        gList
        n <span class="token builtin">int32</span>
    <span class="token punctuation">}</span>


    sudogcache <span class="token punctuation">[</span><span class="token punctuation">]</span><span class="token operator">*</span>sudog
    sudogbuf   <span class="token punctuation">[</span><span class="token number">128</span><span class="token punctuation">]</span><span class="token operator">*</span>sudog


    <span class="token comment">// 从全局heap中分配128个mspan对象</span>
    mspancache <span class="token keyword">struct</span> <span class="token punctuation">{</span>
        <span class="token builtin">len</span> <span class="token builtin">int</span>
        buf <span class="token punctuation">[</span><span class="token number">128</span><span class="token punctuation">]</span><span class="token operator">*</span>mspan
    <span class="token punctuation">}</span>
    <span class="token operator">...</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>从结构体中可知，P中保存了一个长度为256的协程数组，可以无锁访问。当p的队列满了之后，创建的协程g将会放到全局队列里面。P中也保存了当前关联的内核线程m指针
P中缓存了协程g用于分配的内存块，协程首先从当前p的内存块分配内存，不够再由P去heap中申请新的内存块</p>
<h3 id="_2-4-5-协程g的创建过程" tabindex="-1"><a class="header-anchor" href="#_2-4-5-协程g的创建过程"><span>2.4.5 协程G的创建过程</span></a></h3>
<p>协程由关键字go创建，go关键字最终会解析成函数调用runtime.newproc(fn *funcval)，过程如下：</p>
<ol>
<li>在systemstack函数里面执行核心逻辑。systemstack作用是切换到g0系统栈，在系统栈上面执行核心逻辑，执行完成后systemstack函数会切换回当前协程的栈,
    ```go
    // src/runtime/proc.go</li>
</ol>
<p>// 协程的启动函数
    func newproc(fn *funcval) {
        gp := getg()
        pc := getcallerpc()
        // 切换到g0栈执行，执行完成后切回原来的栈空间
        systemstack(func() {
            // 核心逻辑创建协程
            newg := newproc1(fn, gp, pc)
            pp := getg().m.p.ptr()
            // 将创建的协程保存到当前p中，局部性原理，放满了就放到全局队列
            runqput(pp, newg, true)</p>
<p>if mainStarted {
                // 在所有的空闲P链表里面，唤醒第一个P，并调度M（没有则创建）去运行这个P
                wakep()
            }
        })
    }
    ```</p>
<ol start="2">
<li>协程创建的核心逻辑再runtime.newproc1函数中
    ```go
    // src/runtime/newproc1</li>
</ol>
<p>func newproc1(fn *funcval, callergp *g, callerpc uintptr) *g {
        if fn == nil {
            fatal(&quot;go of nil func value&quot;)
        }</p>
<p>mp := acquirem() // disable preemption because we hold M and P in local vars.
        pp := mp.p.ptr()
        // 从当前P的gFree协程队列里面取一个来复用，当前P的gFree如果为空，就从全局gFree队列里面取
        newg := gfget(pp)
        if newg == nil {
            // 新建一个栈大小为2k的g对象，将栈顶和栈底保存到newg.stack里面
            newg = malg(_StackMin)
            casgstatus(newg, _Gidle, _Gdead)
            // 将新创建的g的指针保存到全局的allgs数组中，新创建的g未防止被gc扫描，将g的状态改为Gdead
            allgadd(newg)
        }</p>
<p>totalSize := uintptr(4*goarch.PtrSize + sys.MinFrameSize) // extra space in case of reads slightly beyond frame
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
        memclrNoHeapPointers(unsafe.Pointer(&amp;newg.sched), unsafe.Sizeof(newg.sched))
        newg.sched.sp = sp
        newg.stktopsp = sp
        // 这里先将pc指向goexit地址，后续这个pc值会在gostartcallfn函数中塞在sp中，也就是栈底位置，而这个位置是go函数调用的return addr，所以协程任务函数执行完成后会执行goexit函数
        newg.sched.pc = abi.FuncPCABI0(goexit) + sys.PCQuantum // +PCQuantum so that previous instruction is in same function
        newg.sched.g = guintptr(unsafe.Pointer(newg))
        // 填充sched这个gobuf结构体，设置newg.sched的堆栈指针sp，pc指向协程的任务函数fn
        gostartcallfn(&amp;newg.sched, fn)
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
        releasem(mp)</p>
<p>return newg
    }
    ```
3. 协程创建完成后，将协程插入到当前M对应的P上面，也就是跟父协程在同一个P上面。
4. 所有的空闲P链表里面，唤醒第一个P，并调度M（没有则创建）去运行这个P，调用链为wakep()--&gt;startm(pp *p, spinning bool)</p>
<h3 id="_2-4-6-协程g的退出过程" tabindex="-1"><a class="header-anchor" href="#_2-4-6-协程g的退出过程"><span>2.4.6 协程G的退出过程</span></a></h3>
<p>协程的创建过程中已经分析了，通过将goexit函数设置在协程栈底位置，使得协程执行完任务函数fn后会调用goexit函数。</p>
<div class="language-go line-numbers-mode" data-ext="go" data-title="go"><pre v-pre class="language-go"><code><span class="token comment">// src/runtime/asm_arm64.s</span>


<span class="token comment">// 大部分在协程上面运行的函数，最终的返回值都是指向goexit函数</span>
TEXT runtime·<span class="token function">goexit</span><span class="token punctuation">(</span>SB<span class="token punctuation">)</span><span class="token punctuation">,</span>NOSPLIT<span class="token operator">|</span>NOFRAME<span class="token operator">|</span>TOPFRAME<span class="token punctuation">,</span>$<span class="token number">0</span><span class="token operator">-</span><span class="token number">0</span>
    MOVD    R0<span class="token punctuation">,</span> R0  <span class="token comment">// NOP</span>
    BL  runtime·<span class="token function">goexit1</span><span class="token punctuation">(</span>SB<span class="token punctuation">)</span> <span class="token comment">// does not return</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>runtime.goexit最终会执行runtime.goexit1函数</p>
<div class="language-go line-numbers-mode" data-ext="go" data-title="go"><pre v-pre class="language-go"><code><span class="token comment">// src/runtime/proc.go</span>
<span class="token keyword">func</span> <span class="token function">goexit1</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token keyword">if</span> raceenabled <span class="token punctuation">{</span>
        <span class="token function">racegoend</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
    <span class="token punctuation">}</span>
    <span class="token keyword">if</span> trace<span class="token punctuation">.</span>enabled <span class="token punctuation">{</span>
        <span class="token function">traceGoEnd</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
    <span class="token punctuation">}</span>
    <span class="token function">mcall</span><span class="token punctuation">(</span>goexit0<span class="token punctuation">)</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>runtime.goexit1函数内，会通过mcall来调用goexit0函数，mcall函数和之前的systemstack函数类似，都是用汇编写的，mcall函数将当前栈切换到所在m的g0的栈，但结束之后不会切会原来的栈。</p>
<div class="language-go line-numbers-mode" data-ext="go" data-title="go"><pre v-pre class="language-go"><code><span class="token comment">// src/runtime/asm_arm64.s</span>


<span class="token comment">// mcall用于切换到m所在g0的栈，由于不会再次切换到之前协程的栈，所以，mcall执行的函数必须没有返回</span>
TEXT runtime·mcall<span class="token operator">&lt;</span>ABIInternal<span class="token operator">></span><span class="token punctuation">(</span>SB<span class="token punctuation">)</span><span class="token punctuation">,</span> NOSPLIT<span class="token operator">|</span>NOFRAME<span class="token punctuation">,</span> $<span class="token number">0</span><span class="token operator">-</span><span class="token number">8</span>
    MOVD    R0<span class="token punctuation">,</span> R26             <span class="token comment">// context</span>


    <span class="token comment">// Save caller state in g->sched</span>
    <span class="token comment">// 保存当前协程的状态到gobuf里面</span>
    MOVD    RSP<span class="token punctuation">,</span> R0
    MOVD    R0<span class="token punctuation">,</span> <span class="token punctuation">(</span>g_sched<span class="token operator">+</span>gobuf_sp<span class="token punctuation">)</span><span class="token punctuation">(</span>g<span class="token punctuation">)</span>
    MOVD    R29<span class="token punctuation">,</span> <span class="token punctuation">(</span>g_sched<span class="token operator">+</span>gobuf_bp<span class="token punctuation">)</span><span class="token punctuation">(</span>g<span class="token punctuation">)</span>
    MOVD    LR<span class="token punctuation">,</span> <span class="token punctuation">(</span>g_sched<span class="token operator">+</span>gobuf_pc<span class="token punctuation">)</span><span class="token punctuation">(</span>g<span class="token punctuation">)</span>
    MOVD    $<span class="token number">0</span><span class="token punctuation">,</span> <span class="token punctuation">(</span>g_sched<span class="token operator">+</span>gobuf_lr<span class="token punctuation">)</span><span class="token punctuation">(</span>g<span class="token punctuation">)</span>


    <span class="token comment">// Switch to m->g0 &amp; its stack, call fn.</span>
    MOVD    g<span class="token punctuation">,</span> R3
    MOVD    <span class="token function">g_m</span><span class="token punctuation">(</span>g<span class="token punctuation">)</span><span class="token punctuation">,</span> R8
    MOVD    <span class="token function">m_g0</span><span class="token punctuation">(</span>R8<span class="token punctuation">)</span><span class="token punctuation">,</span> g <span class="token comment">// 将g切换到g0，使得后面g.sched是使用的g0的栈</span>
    BL  runtime·<span class="token function">save_g</span><span class="token punctuation">(</span>SB<span class="token punctuation">)</span>
    CMP g<span class="token punctuation">,</span> R3       <span class="token comment">// 保证调用者g不是g0</span>
    BNE <span class="token function">2</span><span class="token punctuation">(</span>PC<span class="token punctuation">)</span>
    B   runtime·<span class="token function">badmcall</span><span class="token punctuation">(</span>SB<span class="token punctuation">)</span>


    MOVD    <span class="token punctuation">(</span>g_sched<span class="token operator">+</span>gobuf_sp<span class="token punctuation">)</span><span class="token punctuation">(</span>g<span class="token punctuation">)</span><span class="token punctuation">,</span> R0
    MOVD    R0<span class="token punctuation">,</span> RSP <span class="token comment">// sp = m->g0->sched.sp</span>
    MOVD    <span class="token punctuation">(</span>g_sched<span class="token operator">+</span>gobuf_bp<span class="token punctuation">)</span><span class="token punctuation">(</span>g<span class="token punctuation">)</span><span class="token punctuation">,</span> R29
    MOVD    R3<span class="token punctuation">,</span> R0              <span class="token comment">// arg = g</span>
    MOVD    $<span class="token number">0</span><span class="token punctuation">,</span> <span class="token operator">-</span><span class="token function">16</span><span class="token punctuation">(</span>RSP<span class="token punctuation">)</span>            <span class="token comment">// dummy LR</span>
    SUB $<span class="token number">16</span><span class="token punctuation">,</span> RSP
    MOVD    <span class="token function">0</span><span class="token punctuation">(</span>R26<span class="token punctuation">)</span><span class="token punctuation">,</span> R4          <span class="token comment">// code pointer</span>
    BL  <span class="token punctuation">(</span>R4<span class="token punctuation">)</span>                    <span class="token comment">// 调用fn函数，该函数不会返回，不然返回后会调用badmcall2</span>
    B   runtime·<span class="token function">badmcall2</span><span class="token punctuation">(</span>SB<span class="token punctuation">)</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>mcall函数使用g0栈调用goexit0，并最终在goexit0里面执行循环，不会返回</p>
<div class="language-go line-numbers-mode" data-ext="go" data-title="go"><pre v-pre class="language-go"><code><span class="token comment">// src/runtime/proc.go</span>


<span class="token keyword">func</span> <span class="token function">goexit0</span><span class="token punctuation">(</span>gp <span class="token operator">*</span>g<span class="token punctuation">)</span> <span class="token punctuation">{</span>
    mp <span class="token operator">:=</span> <span class="token function">getg</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">.</span>m
    pp <span class="token operator">:=</span> mp<span class="token punctuation">.</span>p<span class="token punctuation">.</span><span class="token function">ptr</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
    <span class="token comment">// 将当前协程状态改为Gdead</span>
    <span class="token function">casgstatus</span><span class="token punctuation">(</span>gp<span class="token punctuation">,</span> _Grunning<span class="token punctuation">,</span> _Gdead<span class="token punctuation">)</span>
    gcController<span class="token punctuation">.</span><span class="token function">addScannableStack</span><span class="token punctuation">(</span>pp<span class="token punctuation">,</span> <span class="token operator">-</span><span class="token function">int64</span><span class="token punctuation">(</span>gp<span class="token punctuation">.</span>stack<span class="token punctuation">.</span>hi<span class="token operator">-</span>gp<span class="token punctuation">.</span>stack<span class="token punctuation">.</span>lo<span class="token punctuation">)</span><span class="token punctuation">)</span>
    <span class="token keyword">if</span> <span class="token function">isSystemGoroutine</span><span class="token punctuation">(</span>gp<span class="token punctuation">,</span> <span class="token boolean">false</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
        sched<span class="token punctuation">.</span>ngsys<span class="token punctuation">.</span><span class="token function">Add</span><span class="token punctuation">(</span><span class="token operator">-</span><span class="token number">1</span><span class="token punctuation">)</span>
    <span class="token punctuation">}</span>
    gp<span class="token punctuation">.</span>m <span class="token operator">=</span> <span class="token boolean">nil</span>
    locked <span class="token operator">:=</span> gp<span class="token punctuation">.</span>lockedm <span class="token operator">!=</span> <span class="token number">0</span>
    gp<span class="token punctuation">.</span>lockedm <span class="token operator">=</span> <span class="token number">0</span>
    mp<span class="token punctuation">.</span>lockedg <span class="token operator">=</span> <span class="token number">0</span>
    gp<span class="token punctuation">.</span>preemptStop <span class="token operator">=</span> <span class="token boolean">false</span>
    <span class="token comment">// ......</span>
    <span class="token comment">// 修改gp的各项值</span>


    <span class="token keyword">if</span> gcBlackenEnabled <span class="token operator">!=</span> <span class="token number">0</span> <span class="token operator">&amp;&amp;</span> gp<span class="token punctuation">.</span>gcAssistBytes <span class="token operator">></span> <span class="token number">0</span> <span class="token punctuation">{</span>
        <span class="token comment">// gc 设置</span>
        assistWorkPerByte <span class="token operator">:=</span> gcController<span class="token punctuation">.</span>assistWorkPerByte<span class="token punctuation">.</span><span class="token function">Load</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
        scanCredit <span class="token operator">:=</span> <span class="token function">int64</span><span class="token punctuation">(</span>assistWorkPerByte <span class="token operator">*</span> <span class="token function">float64</span><span class="token punctuation">(</span>gp<span class="token punctuation">.</span>gcAssistBytes<span class="token punctuation">)</span><span class="token punctuation">)</span>
        gcController<span class="token punctuation">.</span>bgScanCredit<span class="token punctuation">.</span><span class="token function">Add</span><span class="token punctuation">(</span>scanCredit<span class="token punctuation">)</span>
        gp<span class="token punctuation">.</span>gcAssistBytes <span class="token operator">=</span> <span class="token number">0</span>
    <span class="token punctuation">}</span>
    <span class="token comment">// 将g设置过不使用，并将g插入到当前p的gFree队列里面，方便后面创建协程的时候复用这些协程</span>
    <span class="token function">dropg</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
    <span class="token function">gfput</span><span class="token punctuation">(</span>pp<span class="token punctuation">,</span> gp<span class="token punctuation">)</span>
    <span class="token comment">// mcall已经切换到了g0，在g0栈里面执行下一次协程调度。</span>
    <span class="token function">schedule</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>可见，最终goexit0函数会执行协程调度代码，从而在当前协程g退出之后，m开始执行在g0栈上开始执行下一轮调度</p>
<h3 id="_2-4-7-协程g的切换过程" tabindex="-1"><a class="header-anchor" href="#_2-4-7-协程g的切换过程"><span>2.4.7 协程G的切换过程</span></a></h3>
<p>当协程调度完成，寻找到下一个要执行的协程之后，需要切换到新协程执行，切换的核心逻辑便是用汇编写的gogo函数</p>
<div class="language-go line-numbers-mode" data-ext="go" data-title="go"><pre v-pre class="language-go"><code><span class="token comment">// src/runtime/asm_386.s</span>


<span class="token comment">// void gogo(gpbuf Gobuf*)</span>
<span class="token comment">// restore state from Gobuf; longjmp</span>
TEXT runtime·<span class="token function">gogo</span><span class="token punctuation">(</span>SB<span class="token punctuation">)</span><span class="token punctuation">,</span> NOSPLIT<span class="token punctuation">,</span> $<span class="token number">0</span><span class="token operator">-</span><span class="token number">4</span>
    MOVL    buf<span class="token operator">+</span><span class="token function">0</span><span class="token punctuation">(</span>FP<span class="token punctuation">)</span><span class="token punctuation">,</span> BX       <span class="token comment">// gobuf</span>
    MOVL    <span class="token function">gobuf_g</span><span class="token punctuation">(</span>BX<span class="token punctuation">)</span><span class="token punctuation">,</span> DX
    MOVL    <span class="token function">0</span><span class="token punctuation">(</span>DX<span class="token punctuation">)</span><span class="token punctuation">,</span> CX       <span class="token comment">// make sure g != nil</span>
    JMP gogo<span class="token operator">&lt;</span><span class="token operator">></span><span class="token punctuation">(</span>SB<span class="token punctuation">)</span>


TEXT gogo<span class="token operator">&lt;</span><span class="token operator">></span><span class="token punctuation">(</span>SB<span class="token punctuation">)</span><span class="token punctuation">,</span> NOSPLIT<span class="token punctuation">,</span> $<span class="token number">0</span>
    <span class="token function">get_tls</span><span class="token punctuation">(</span>CX<span class="token punctuation">)</span>
    MOVL    DX<span class="token punctuation">,</span> <span class="token function">g</span><span class="token punctuation">(</span>CX<span class="token punctuation">)</span>
    MOVL    <span class="token function">gobuf_sp</span><span class="token punctuation">(</span>BX<span class="token punctuation">)</span><span class="token punctuation">,</span> SP    <span class="token comment">// restore SP 将SP寄存器的值设置为新协程的gp.sched.sp</span>
    MOVL    <span class="token function">gobuf_ret</span><span class="token punctuation">(</span>BX<span class="token punctuation">)</span><span class="token punctuation">,</span> AX   <span class="token comment">//</span>
    MOVL    <span class="token function">gobuf_ctxt</span><span class="token punctuation">(</span>BX<span class="token punctuation">)</span><span class="token punctuation">,</span> DX
    MOVL    $<span class="token number">0</span><span class="token punctuation">,</span> <span class="token function">gobuf_sp</span><span class="token punctuation">(</span>BX<span class="token punctuation">)</span>    <span class="token comment">// clear to help garbage collector</span>
    MOVL    $<span class="token number">0</span><span class="token punctuation">,</span> <span class="token function">gobuf_ret</span><span class="token punctuation">(</span>BX<span class="token punctuation">)</span>
    MOVL    $<span class="token number">0</span><span class="token punctuation">,</span> <span class="token function">gobuf_ctxt</span><span class="token punctuation">(</span>BX<span class="token punctuation">)</span>
    MOVL    <span class="token function">gobuf_pc</span><span class="token punctuation">(</span>BX<span class="token punctuation">)</span><span class="token punctuation">,</span> BX    <span class="token comment">// 将要JMP过去的位置设置为新协程的gp.sched.pc</span>
    JMP BX


</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_2-4-8-协程g的栈内存分配" tabindex="-1"><a class="header-anchor" href="#_2-4-8-协程g的栈内存分配"><span>2.4.8 协程G的栈内存分配</span></a></h3>
<p>https://golang.design/under-the-hood/zh-cn/part2runtime/ch06sched/stack/</p>
<h3 id="_2-4-9-处理器p的创建过程" tabindex="-1"><a class="header-anchor" href="#_2-4-9-处理器p的创建过程"><span>2.4.9 处理器P的创建过程</span></a></h3>
<p>处理器的创建是在初始化阶段schedinit函数中创建的，通过系统调用获取当前cpu个数，也可也环境变量来配置需要创建多少个P</p>
<div class="language-go line-numbers-mode" data-ext="go" data-title="go"><pre v-pre class="language-go"><code><span class="token comment">// src/runtime/proc.go</span>


<span class="token keyword">func</span> <span class="token function">schedinit</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token function">lock</span><span class="token punctuation">(</span><span class="token operator">&amp;</span>sched<span class="token punctuation">.</span>lock<span class="token punctuation">)</span>
    sched<span class="token punctuation">.</span>lastpoll<span class="token punctuation">.</span><span class="token function">Store</span><span class="token punctuation">(</span><span class="token function">nanotime</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span>
    procs <span class="token operator">:=</span> ncpu
    <span class="token keyword">if</span> n<span class="token punctuation">,</span> ok <span class="token operator">:=</span> <span class="token function">atoi32</span><span class="token punctuation">(</span><span class="token function">gogetenv</span><span class="token punctuation">(</span><span class="token string">"GOMAXPROCS"</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span> ok <span class="token operator">&amp;&amp;</span> n <span class="token operator">></span> <span class="token number">0</span> <span class="token punctuation">{</span>
        procs <span class="token operator">=</span> n
    <span class="token punctuation">}</span>
    <span class="token keyword">if</span> <span class="token function">procresize</span><span class="token punctuation">(</span>procs<span class="token punctuation">)</span> <span class="token operator">!=</span> <span class="token boolean">nil</span> <span class="token punctuation">{</span>
        <span class="token function">throw</span><span class="token punctuation">(</span><span class="token string">"unknown runnable goroutine during bootstrap"</span><span class="token punctuation">)</span>
    <span class="token punctuation">}</span>
    <span class="token function">unlock</span><span class="token punctuation">(</span><span class="token operator">&amp;</span>sched<span class="token punctuation">.</span>lock<span class="token punctuation">)</span>
<span class="token punctuation">}</span>


<span class="token comment">// scheinit里面的全局变量 ncpu=getncpu()</span>
<span class="token keyword">func</span> <span class="token function">getncpu</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token builtin">int32</span> <span class="token punctuation">{</span>
    mib <span class="token operator">:=</span> <span class="token punctuation">[</span><span class="token number">2</span><span class="token punctuation">]</span><span class="token builtin">uint32</span><span class="token punctuation">{</span>_CTL_HW<span class="token punctuation">,</span> _HW_NCPU<span class="token punctuation">}</span>
    out <span class="token operator">:=</span> <span class="token function">uint32</span><span class="token punctuation">(</span><span class="token number">0</span><span class="token punctuation">)</span>
    nout <span class="token operator">:=</span> unsafe<span class="token punctuation">.</span><span class="token function">Sizeof</span><span class="token punctuation">(</span>out<span class="token punctuation">)</span>
    ret <span class="token operator">:=</span> <span class="token function">sysctl</span><span class="token punctuation">(</span><span class="token operator">&amp;</span>mib<span class="token punctuation">[</span><span class="token number">0</span><span class="token punctuation">]</span><span class="token punctuation">,</span> <span class="token number">2</span><span class="token punctuation">,</span> <span class="token punctuation">(</span><span class="token operator">*</span><span class="token builtin">byte</span><span class="token punctuation">)</span><span class="token punctuation">(</span>unsafe<span class="token punctuation">.</span><span class="token function">Pointer</span><span class="token punctuation">(</span><span class="token operator">&amp;</span>out<span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">,</span> <span class="token operator">&amp;</span>nout<span class="token punctuation">,</span> <span class="token boolean">nil</span><span class="token punctuation">,</span> <span class="token number">0</span><span class="token punctuation">)</span>
    <span class="token keyword">if</span> ret <span class="token operator">>=</span> <span class="token number">0</span> <span class="token punctuation">{</span>
        <span class="token keyword">return</span> <span class="token function">int32</span><span class="token punctuation">(</span>out<span class="token punctuation">)</span>
    <span class="token punctuation">}</span>
    <span class="token keyword">return</span> <span class="token number">1</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>创建P的核心函数是procesize(proc)，初始化和后续修改P的数据也都是调用该函数</p>
<div class="language-go line-numbers-mode" data-ext="go" data-title="go"><pre v-pre class="language-go"><code><span class="token keyword">func</span> <span class="token function">procresize</span><span class="token punctuation">(</span>nprocs <span class="token builtin">int32</span><span class="token punctuation">)</span> <span class="token operator">*</span>p <span class="token punctuation">{</span>
    <span class="token comment">// 创建或者修改P的数量的时候，需要全局加锁，且STW</span>
    <span class="token function">assertLockHeld</span><span class="token punctuation">(</span><span class="token operator">&amp;</span>sched<span class="token punctuation">.</span>lock<span class="token punctuation">)</span>
    <span class="token function">assertWorldStopped</span><span class="token punctuation">(</span><span class="token punctuation">)</span>


    <span class="token comment">// Grow allp if necessary.</span>
    <span class="token keyword">if</span> nprocs <span class="token operator">></span> <span class="token function">int32</span><span class="token punctuation">(</span><span class="token function">len</span><span class="token punctuation">(</span>allp<span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
        <span class="token function">lock</span><span class="token punctuation">(</span><span class="token operator">&amp;</span>allpLock<span class="token punctuation">)</span>
        <span class="token keyword">if</span> nprocs <span class="token operator">&lt;=</span> <span class="token function">int32</span><span class="token punctuation">(</span><span class="token function">cap</span><span class="token punctuation">(</span>allp<span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
            <span class="token comment">// 如果是缩小p的数量，直接从之前的allp里面截取所需的长度</span>
            allp <span class="token operator">=</span> allp<span class="token punctuation">[</span><span class="token punctuation">:</span>nprocs<span class="token punctuation">]</span>
        <span class="token punctuation">}</span> <span class="token keyword">else</span> <span class="token punctuation">{</span>
            nallp <span class="token operator">:=</span> <span class="token function">make</span><span class="token punctuation">(</span><span class="token punctuation">[</span><span class="token punctuation">]</span><span class="token operator">*</span>p<span class="token punctuation">,</span> nprocs<span class="token punctuation">)</span>
            <span class="token comment">// 创建一个新的nallp，如果之前的allp里面已经有数据，全部拷贝过去</span>
            <span class="token function">copy</span><span class="token punctuation">(</span>nallp<span class="token punctuation">,</span> allp<span class="token punctuation">[</span><span class="token punctuation">:</span><span class="token function">cap</span><span class="token punctuation">(</span>allp<span class="token punctuation">)</span><span class="token punctuation">]</span><span class="token punctuation">)</span>
            allp <span class="token operator">=</span> nallp
        <span class="token punctuation">}</span>
    <span class="token punctuation">}</span>


    <span class="token comment">// initialize new P's</span>
    <span class="token keyword">for</span> i <span class="token operator">:=</span> old<span class="token punctuation">;</span> i <span class="token operator">&lt;</span> nprocs<span class="token punctuation">;</span> i<span class="token operator">++</span> <span class="token punctuation">{</span>
        pp <span class="token operator">:=</span> allp<span class="token punctuation">[</span>i<span class="token punctuation">]</span>
        <span class="token keyword">if</span> pp <span class="token operator">==</span> <span class="token boolean">nil</span> <span class="token punctuation">{</span>
            pp <span class="token operator">=</span> <span class="token function">new</span><span class="token punctuation">(</span>p<span class="token punctuation">)</span>
        <span class="token punctuation">}</span>
        pp<span class="token punctuation">.</span><span class="token function">init</span><span class="token punctuation">(</span>i<span class="token punctuation">)</span>
        <span class="token function">atomicstorep</span><span class="token punctuation">(</span>unsafe<span class="token punctuation">.</span><span class="token function">Pointer</span><span class="token punctuation">(</span><span class="token operator">&amp;</span>allp<span class="token punctuation">[</span>i<span class="token punctuation">]</span><span class="token punctuation">)</span><span class="token punctuation">,</span> unsafe<span class="token punctuation">.</span><span class="token function">Pointer</span><span class="token punctuation">(</span>pp<span class="token punctuation">)</span><span class="token punctuation">)</span>
    <span class="token punctuation">}</span>


    gp <span class="token operator">:=</span> <span class="token function">getg</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
    <span class="token keyword">if</span> gp<span class="token punctuation">.</span>m<span class="token punctuation">.</span>p <span class="token operator">!=</span> <span class="token number">0</span> <span class="token operator">&amp;&amp;</span> gp<span class="token punctuation">.</span>m<span class="token punctuation">.</span>p<span class="token punctuation">.</span><span class="token function">ptr</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">.</span>id <span class="token operator">&lt;</span> nprocs <span class="token punctuation">{</span>
        <span class="token comment">//如果当前p的id小于当前p的数量，则继续使用当前p</span>
        gp<span class="token punctuation">.</span>m<span class="token punctuation">.</span>p<span class="token punctuation">.</span><span class="token function">ptr</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">.</span>status <span class="token operator">=</span> _Prunning
        gp<span class="token punctuation">.</span>m<span class="token punctuation">.</span>p<span class="token punctuation">.</span><span class="token function">ptr</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">.</span>mcache<span class="token punctuation">.</span><span class="token function">prepareForSweep</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
    <span class="token punctuation">}</span> <span class="token keyword">else</span> <span class="token punctuation">{</span>
        <span class="token comment">// 如果</span>
        <span class="token keyword">if</span> gp<span class="token punctuation">.</span>m<span class="token punctuation">.</span>p <span class="token operator">!=</span> <span class="token number">0</span> <span class="token punctuation">{</span>
            <span class="token keyword">if</span> trace<span class="token punctuation">.</span>enabled <span class="token punctuation">{</span>
                <span class="token comment">// Pretend that we were descheduled</span>
                <span class="token comment">// and then scheduled again to keep</span>
                <span class="token comment">// the trace sane.</span>
                <span class="token function">traceGoSched</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
                <span class="token function">traceProcStop</span><span class="token punctuation">(</span>gp<span class="token punctuation">.</span>m<span class="token punctuation">.</span>p<span class="token punctuation">.</span><span class="token function">ptr</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span>
            <span class="token punctuation">}</span>
            gp<span class="token punctuation">.</span>m<span class="token punctuation">.</span>p<span class="token punctuation">.</span><span class="token function">ptr</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">.</span>m <span class="token operator">=</span> <span class="token number">0</span>
        <span class="token punctuation">}</span>
        gp<span class="token punctuation">.</span>m<span class="token punctuation">.</span>p <span class="token operator">=</span> <span class="token number">0</span>
        pp <span class="token operator">:=</span> allp<span class="token punctuation">[</span><span class="token number">0</span><span class="token punctuation">]</span>
        pp<span class="token punctuation">.</span>m <span class="token operator">=</span> <span class="token number">0</span>
        pp<span class="token punctuation">.</span>status <span class="token operator">=</span> _Pidle
        <span class="token function">acquirep</span><span class="token punctuation">(</span>pp<span class="token punctuation">)</span>
        <span class="token keyword">if</span> trace<span class="token punctuation">.</span>enabled <span class="token punctuation">{</span>
            <span class="token function">traceGoStart</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
        <span class="token punctuation">}</span>
    <span class="token punctuation">}</span>


    <span class="token comment">// g.m.p is now set, so we no longer need mcache0 for bootstrapping.</span>
    mcache0 <span class="token operator">=</span> <span class="token boolean">nil</span>


    <span class="token comment">// p的数量缩容，多的需要销毁</span>
    <span class="token keyword">for</span> i <span class="token operator">:=</span> nprocs<span class="token punctuation">;</span> i <span class="token operator">&lt;</span> old<span class="token punctuation">;</span> i<span class="token operator">++</span> <span class="token punctuation">{</span>
        pp <span class="token operator">:=</span> allp<span class="token punctuation">[</span>i<span class="token punctuation">]</span>
        pp<span class="token punctuation">.</span><span class="token function">destroy</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
        <span class="token comment">// can't free P itself because it can be referenced by an M in syscall</span>
    <span class="token punctuation">}</span>


    <span class="token keyword">var</span> runnablePs <span class="token operator">*</span>p
    <span class="token keyword">for</span> i <span class="token operator">:=</span> nprocs <span class="token operator">-</span> <span class="token number">1</span><span class="token punctuation">;</span> i <span class="token operator">>=</span> <span class="token number">0</span><span class="token punctuation">;</span> i<span class="token operator">--</span> <span class="token punctuation">{</span>
        pp <span class="token operator">:=</span> allp<span class="token punctuation">[</span>i<span class="token punctuation">]</span>
        <span class="token keyword">if</span> gp<span class="token punctuation">.</span>m<span class="token punctuation">.</span>p<span class="token punctuation">.</span><span class="token function">ptr</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">==</span> pp <span class="token punctuation">{</span>
            <span class="token keyword">continue</span>
        <span class="token punctuation">}</span>
        pp<span class="token punctuation">.</span>status <span class="token operator">=</span> _Pidle
        <span class="token keyword">if</span> <span class="token function">runqempty</span><span class="token punctuation">(</span>pp<span class="token punctuation">)</span> <span class="token punctuation">{</span>
            <span class="token function">pidleput</span><span class="token punctuation">(</span>pp<span class="token punctuation">,</span> now<span class="token punctuation">)</span>
        <span class="token punctuation">}</span> <span class="token keyword">else</span> <span class="token punctuation">{</span>
            <span class="token comment">// 把当前空闲的m绑定到p上面，mget()会循环从空闲m队列里面取，没有了返回nil</span>
            pp<span class="token punctuation">.</span>m<span class="token punctuation">.</span><span class="token function">set</span><span class="token punctuation">(</span><span class="token function">mget</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span>
            pp<span class="token punctuation">.</span>link<span class="token punctuation">.</span><span class="token function">set</span><span class="token punctuation">(</span>runnablePs<span class="token punctuation">)</span>
            runnablePs <span class="token operator">=</span> pp
        <span class="token punctuation">}</span>
    <span class="token punctuation">}</span>
    <span class="token keyword">return</span> runnablePs
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_2-4-9-线程m的创建过程" tabindex="-1"><a class="header-anchor" href="#_2-4-9-线程m的创建过程"><span>2.4.9 线程M的创建过程</span></a></h3>
<p>首先需要明确的是m0线程是进程启动就创建的初始线程，除m0外的线程m1，m2...才是通过本节所讨论的创建方式创建的
在前面的<strong>协程G的创建过程</strong>一节中，我们分析了创建了协程之后，会将新协程插入到P中，然后调用startm来获取一个m运行P，当没有空闲的m时，则会调用newm(fn func(), pp *p, id int64)创建一个m</p>
<div class="language-go line-numbers-mode" data-ext="go" data-title="go"><pre v-pre class="language-go"><code><span class="token comment">// src/runtime/proc.go</span>


<span class="token keyword">func</span> <span class="token function">newm</span><span class="token punctuation">(</span>fn <span class="token keyword">func</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">,</span> pp <span class="token operator">*</span>p<span class="token punctuation">,</span> id <span class="token builtin">int64</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token function">acquirem</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
    <span class="token comment">// 创建一个m结构体，m的起始函数为fn</span>
    mp <span class="token operator">:=</span> <span class="token function">allocm</span><span class="token punctuation">(</span>pp<span class="token punctuation">,</span> fn<span class="token punctuation">,</span> id<span class="token punctuation">)</span>
    mp<span class="token punctuation">.</span>nextp<span class="token punctuation">.</span><span class="token function">set</span><span class="token punctuation">(</span>pp<span class="token punctuation">)</span>
    mp<span class="token punctuation">.</span>sigmask <span class="token operator">=</span> initSigmask
    <span class="token comment">// ......</span>
    <span class="token comment">// 用m参数创建一个系统线程</span>
    <span class="token function">newm1</span><span class="token punctuation">(</span>mp<span class="token punctuation">)</span>
    <span class="token function">releasem</span><span class="token punctuation">(</span><span class="token function">getg</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">.</span>m<span class="token punctuation">)</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>allocm函数中会创建和初始化一个m结构体，线程的创建过程在</p>
<div class="language-go line-numbers-mode" data-ext="go" data-title="go"><pre v-pre class="language-go"><code><span class="token comment">// pp:需要初始化绑定待创建的m的p；fn：线程启动执行的函数，如自旋函数mspinning；id：待创建线程m的id</span>
<span class="token keyword">func</span> <span class="token function">allocm</span><span class="token punctuation">(</span>pp <span class="token operator">*</span>p<span class="token punctuation">,</span> fn <span class="token keyword">func</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">,</span> id <span class="token builtin">int64</span><span class="token punctuation">)</span> <span class="token operator">*</span>m <span class="token punctuation">{</span>
    allocmLock<span class="token punctuation">.</span><span class="token function">rlock</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
     <span class="token comment">// 将_g_对应的m的locks加1，防止被抢占</span>
    <span class="token function">acquirem</span><span class="token punctuation">(</span><span class="token punctuation">)</span>


    gp <span class="token operator">:=</span> <span class="token function">getg</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
    <span class="token keyword">if</span> gp<span class="token punctuation">.</span>m<span class="token punctuation">.</span>p <span class="token operator">==</span> <span class="token number">0</span> <span class="token punctuation">{</span>
        <span class="token function">acquirep</span><span class="token punctuation">(</span>pp<span class="token punctuation">)</span> <span class="token comment">// temporarily borrow p for mallocs in this function</span>
    <span class="token punctuation">}</span>
    <span class="token comment">// 创建一个m结构体，并设置起始函数是fn</span>
    mp <span class="token operator">:=</span> <span class="token function">new</span><span class="token punctuation">(</span>m<span class="token punctuation">)</span>
    mp<span class="token punctuation">.</span>mstartfn <span class="token operator">=</span> fn
    <span class="token function">mcommoninit</span><span class="token punctuation">(</span>mp<span class="token punctuation">,</span> id<span class="token punctuation">)</span>


    <span class="token keyword">if</span> iscgo <span class="token operator">||</span> <span class="token function">mStackIsSystemAllocated</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
        mp<span class="token punctuation">.</span>g0 <span class="token operator">=</span> <span class="token function">malg</span><span class="token punctuation">(</span><span class="token operator">-</span><span class="token number">1</span><span class="token punctuation">)</span>
    <span class="token punctuation">}</span> <span class="token keyword">else</span> <span class="token punctuation">{</span>
        <span class="token comment">// 创建一个设置栈大小为8M的g结构体赋值给m的g0</span>
        mp<span class="token punctuation">.</span>g0 <span class="token operator">=</span> <span class="token function">malg</span><span class="token punctuation">(</span><span class="token number">8192</span> <span class="token operator">*</span> sys<span class="token punctuation">.</span>StackGuardMultiplier<span class="token punctuation">)</span>
    <span class="token punctuation">}</span>
    <span class="token comment">// 这个m的g0和自身进行绑定</span>
    mp<span class="token punctuation">.</span>g0<span class="token punctuation">.</span>m <span class="token operator">=</span> mp


    <span class="token keyword">if</span> pp <span class="token operator">==</span> gp<span class="token punctuation">.</span>m<span class="token punctuation">.</span>p<span class="token punctuation">.</span><span class="token function">ptr</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
        <span class="token function">releasep</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
    <span class="token punctuation">}</span>
    <span class="token comment">// 解除_g_的m的禁止抢占状态</span>
    <span class="token function">releasem</span><span class="token punctuation">(</span>gp<span class="token punctuation">.</span>m<span class="token punctuation">)</span>
    allocmLock<span class="token punctuation">.</span><span class="token function">runlock</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
    <span class="token keyword">return</span> mp
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><div class="language-go line-numbers-mode" data-ext="go" data-title="go"><pre v-pre class="language-go"><code><span class="token keyword">func</span> <span class="token function">newm1</span><span class="token punctuation">(</span>mp <span class="token operator">*</span>m<span class="token punctuation">)</span> <span class="token punctuation">{</span>
    execLock<span class="token punctuation">.</span><span class="token function">rlock</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token comment">// Prevent process clone.</span>
    <span class="token function">newosproc</span><span class="token punctuation">(</span>mp<span class="token punctuation">)</span>
    execLock<span class="token punctuation">.</span><span class="token function">runlock</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>newm1最终调用newosproc函数，在该函数里面通过系统调用pthread_create创建一个系统线程</p>
<div class="language-go line-numbers-mode" data-ext="go" data-title="go"><pre v-pre class="language-go"><code><span class="token comment">// src/runtime/os_darwin.go</span>


<span class="token keyword">func</span> <span class="token function">newosproc</span><span class="token punctuation">(</span>mp <span class="token operator">*</span>m<span class="token punctuation">)</span> <span class="token punctuation">{</span>
    stk <span class="token operator">:=</span> unsafe<span class="token punctuation">.</span><span class="token function">Pointer</span><span class="token punctuation">(</span>mp<span class="token punctuation">.</span>g0<span class="token punctuation">.</span>stack<span class="token punctuation">.</span>hi<span class="token punctuation">)</span>
    <span class="token keyword">if</span> <span class="token boolean">false</span> <span class="token punctuation">{</span>
        <span class="token function">print</span><span class="token punctuation">(</span><span class="token string">"newosproc stk="</span><span class="token punctuation">,</span> stk<span class="token punctuation">,</span> <span class="token string">" m="</span><span class="token punctuation">,</span> mp<span class="token punctuation">,</span> <span class="token string">" g="</span><span class="token punctuation">,</span> mp<span class="token punctuation">.</span>g0<span class="token punctuation">,</span> <span class="token string">" id="</span><span class="token punctuation">,</span> mp<span class="token punctuation">.</span>id<span class="token punctuation">,</span> <span class="token string">" ostk="</span><span class="token punctuation">,</span> <span class="token operator">&amp;</span>mp<span class="token punctuation">,</span> <span class="token string">"\n"</span><span class="token punctuation">)</span>
    <span class="token punctuation">}</span>


    <span class="token comment">// Initialize an attribute object.</span>
    <span class="token keyword">var</span> attr pthreadattr
    <span class="token keyword">var</span> err <span class="token builtin">int32</span>
    err <span class="token operator">=</span> <span class="token function">pthread_attr_init</span><span class="token punctuation">(</span><span class="token operator">&amp;</span>attr<span class="token punctuation">)</span>
    <span class="token keyword">if</span> err <span class="token operator">!=</span> <span class="token number">0</span> <span class="token punctuation">{</span>
        <span class="token function">write</span><span class="token punctuation">(</span><span class="token number">2</span><span class="token punctuation">,</span> unsafe<span class="token punctuation">.</span><span class="token function">Pointer</span><span class="token punctuation">(</span><span class="token operator">&amp;</span>failthreadcreate<span class="token punctuation">[</span><span class="token number">0</span><span class="token punctuation">]</span><span class="token punctuation">)</span><span class="token punctuation">,</span> <span class="token function">int32</span><span class="token punctuation">(</span><span class="token function">len</span><span class="token punctuation">(</span>failthreadcreate<span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">)</span>
        <span class="token function">exit</span><span class="token punctuation">(</span><span class="token number">1</span><span class="token punctuation">)</span>
    <span class="token punctuation">}</span>


    <span class="token comment">// Find out OS stack size for our own stack guard.</span>
    <span class="token comment">// 获取线程的系统栈大小赋值给g0</span>
    <span class="token keyword">var</span> stacksize <span class="token builtin">uintptr</span>
    <span class="token keyword">if</span> <span class="token function">pthread_attr_getstacksize</span><span class="token punctuation">(</span><span class="token operator">&amp;</span>attr<span class="token punctuation">,</span> <span class="token operator">&amp;</span>stacksize<span class="token punctuation">)</span> <span class="token operator">!=</span> <span class="token number">0</span> <span class="token punctuation">{</span>
        <span class="token function">write</span><span class="token punctuation">(</span><span class="token number">2</span><span class="token punctuation">,</span> unsafe<span class="token punctuation">.</span><span class="token function">Pointer</span><span class="token punctuation">(</span><span class="token operator">&amp;</span>failthreadcreate<span class="token punctuation">[</span><span class="token number">0</span><span class="token punctuation">]</span><span class="token punctuation">)</span><span class="token punctuation">,</span> <span class="token function">int32</span><span class="token punctuation">(</span><span class="token function">len</span><span class="token punctuation">(</span>failthreadcreate<span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">)</span>
        <span class="token function">exit</span><span class="token punctuation">(</span><span class="token number">1</span><span class="token punctuation">)</span>
    <span class="token punctuation">}</span>
    mp<span class="token punctuation">.</span>g0<span class="token punctuation">.</span>stack<span class="token punctuation">.</span>hi <span class="token operator">=</span> stacksize <span class="token comment">// 设置hi为size， for mstart</span>


    <span class="token comment">// 通过系统调用创建线程，使用mstart_stub，而mstart_stub最终会调用runtime.mstart</span>
    <span class="token comment">// Finally, create the thread. It starts at mstart_stub, which does some low-level</span>
    <span class="token comment">// setup and then calls mstart.</span>
    <span class="token keyword">var</span> oset sigset
    <span class="token function">sigprocmask</span><span class="token punctuation">(</span>_SIG_SETMASK<span class="token punctuation">,</span> <span class="token operator">&amp;</span>sigset_all<span class="token punctuation">,</span> <span class="token operator">&amp;</span>oset<span class="token punctuation">)</span>
    err <span class="token operator">=</span> <span class="token function">pthread_create</span><span class="token punctuation">(</span><span class="token operator">&amp;</span>attr<span class="token punctuation">,</span> abi<span class="token punctuation">.</span><span class="token function">FuncPCABI0</span><span class="token punctuation">(</span>mstart_stub<span class="token punctuation">)</span><span class="token punctuation">,</span> unsafe<span class="token punctuation">.</span><span class="token function">Pointer</span><span class="token punctuation">(</span>mp<span class="token punctuation">)</span><span class="token punctuation">)</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>pthread_create创建的线程执行的是mstart_stub，并最终执行runtime.mstart。在go程序启动时，初始线程（m0）执行rt0_go代码最终也是会执行到mstart开启调度</p>
<div class="language-go line-numbers-mode" data-ext="go" data-title="go"><pre v-pre class="language-go"><code>TEXT runtime·<span class="token function">mstart_stub</span><span class="token punctuation">(</span>SB<span class="token punctuation">)</span><span class="token punctuation">,</span>NOSPLIT<span class="token punctuation">,</span>$<span class="token number">0</span>
    <span class="token function">PUSH_REGS_HOST_TO_ABI0</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
    MOVQ    <span class="token function">m_g0</span><span class="token punctuation">(</span>DI<span class="token punctuation">)</span><span class="token punctuation">,</span> DX <span class="token comment">// g</span>
    MOVQ    DX<span class="token punctuation">,</span> <span class="token function">0x30</span><span class="token punctuation">(</span>GS<span class="token punctuation">)</span>


    CALL    runtime·<span class="token function">mstart</span><span class="token punctuation">(</span>SB<span class="token punctuation">)</span>


    <span class="token function">POP_REGS_HOST_TO_ABI0</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
    XORL    AX<span class="token punctuation">,</span> AX
    RET
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_2-4-10-线程m的启动过程" tabindex="-1"><a class="header-anchor" href="#_2-4-10-线程m的启动过程"><span>2.4.10 线程M的启动过程</span></a></h3>
<p>线程M的启动在runtime.mstart中启动，但是该函数在汇编中直接调用了runtime.mstart0。无论是进程初始线程m0，还是后续我们通过newm创建的线程，都会进入该函数进行启动线程并最终陷入协程调度中</p>
<div class="language-go line-numbers-mode" data-ext="go" data-title="go"><pre v-pre class="language-go"><code><span class="token keyword">func</span> <span class="token function">mstart0</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    gp <span class="token operator">:=</span> <span class="token function">getg</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
    <span class="token comment">// gp指向的是g0，newosproc中填充g0的hi为size</span>
    osStack <span class="token operator">:=</span> gp<span class="token punctuation">.</span>stack<span class="token punctuation">.</span>lo <span class="token operator">==</span> <span class="token number">0</span>
    <span class="token keyword">if</span> osStack <span class="token punctuation">{</span>
        size <span class="token operator">:=</span> gp<span class="token punctuation">.</span>stack<span class="token punctuation">.</span>hi
        <span class="token keyword">if</span> size <span class="token operator">==</span> <span class="token number">0</span> <span class="token punctuation">{</span>
            size <span class="token operator">=</span> <span class="token number">8192</span> <span class="token operator">*</span> sys<span class="token punctuation">.</span>StackGuardMultiplier
        <span class="token punctuation">}</span>
        gp<span class="token punctuation">.</span>stack<span class="token punctuation">.</span>hi <span class="token operator">=</span> <span class="token function">uintptr</span><span class="token punctuation">(</span><span class="token function">noescape</span><span class="token punctuation">(</span>unsafe<span class="token punctuation">.</span><span class="token function">Pointer</span><span class="token punctuation">(</span><span class="token operator">&amp;</span>size<span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">)</span>
        gp<span class="token punctuation">.</span>stack<span class="token punctuation">.</span>lo <span class="token operator">=</span> gp<span class="token punctuation">.</span>stack<span class="token punctuation">.</span>hi <span class="token operator">-</span> size <span class="token operator">+</span> <span class="token number">1024</span>
    <span class="token punctuation">}</span>
    gp<span class="token punctuation">.</span>stackguard0 <span class="token operator">=</span> gp<span class="token punctuation">.</span>stack<span class="token punctuation">.</span>lo <span class="token operator">+</span> _StackGuard
    gp<span class="token punctuation">.</span>stackguard1 <span class="token operator">=</span> gp<span class="token punctuation">.</span>stackguard0
    <span class="token function">mstart1</span><span class="token punctuation">(</span><span class="token punctuation">)</span>


    <span class="token keyword">if</span> <span class="token function">mStackIsSystemAllocated</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
        osStack <span class="token operator">=</span> <span class="token boolean">true</span>
    <span class="token punctuation">}</span>
    <span class="token function">mexit</span><span class="token punctuation">(</span>osStack<span class="token punctuation">)</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>mstart0会调用mstart1来启动调度</p>
<div class="language-go line-numbers-mode" data-ext="go" data-title="go"><pre v-pre class="language-go"><code><span class="token keyword">func</span> <span class="token function">mstart1</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    gp <span class="token operator">:=</span> <span class="token function">getg</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
    <span class="token comment">// 一定是g0</span>
    <span class="token keyword">if</span> gp <span class="token operator">!=</span> gp<span class="token punctuation">.</span>m<span class="token punctuation">.</span>g0 <span class="token punctuation">{</span>
        <span class="token function">throw</span><span class="token punctuation">(</span><span class="token string">"bad runtime·mstart"</span><span class="token punctuation">)</span>
    <span class="token punctuation">}</span>


    <span class="token comment">// g的gobuf结构体sched保存当前上下文</span>
    gp<span class="token punctuation">.</span>sched<span class="token punctuation">.</span>g <span class="token operator">=</span> <span class="token function">guintptr</span><span class="token punctuation">(</span>unsafe<span class="token punctuation">.</span><span class="token function">Pointer</span><span class="token punctuation">(</span>gp<span class="token punctuation">)</span><span class="token punctuation">)</span>
    gp<span class="token punctuation">.</span>sched<span class="token punctuation">.</span>pc <span class="token operator">=</span> <span class="token function">getcallerpc</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
    gp<span class="token punctuation">.</span>sched<span class="token punctuation">.</span>sp <span class="token operator">=</span> <span class="token function">getcallersp</span><span class="token punctuation">(</span><span class="token punctuation">)</span>


    <span class="token function">asminit</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
    <span class="token comment">// 初始化m并设置m.g0的stack</span>
    <span class="token function">minit</span><span class="token punctuation">(</span><span class="token punctuation">)</span>


    <span class="token comment">// 对于m0线程，即进程主线程，需要注册一些信号处理函数</span>
    <span class="token keyword">if</span> gp<span class="token punctuation">.</span>m <span class="token operator">==</span> <span class="token operator">&amp;</span>m0 <span class="token punctuation">{</span>
        <span class="token function">mstartm0</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
    <span class="token punctuation">}</span>
    <span class="token comment">// 对于m0线程，mstartfn没有设置过？自己创建的m，可以不设置，也可以设置为自旋</span>
    <span class="token keyword">if</span> fn <span class="token operator">:=</span> gp<span class="token punctuation">.</span>m<span class="token punctuation">.</span>mstartfn<span class="token punctuation">;</span> fn <span class="token operator">!=</span> <span class="token boolean">nil</span> <span class="token punctuation">{</span>
        <span class="token function">fn</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
    <span class="token punctuation">}</span>


    <span class="token keyword">if</span> gp<span class="token punctuation">.</span>m <span class="token operator">!=</span> <span class="token operator">&amp;</span>m0 <span class="token punctuation">{</span>
        <span class="token function">acquirep</span><span class="token punctuation">(</span>gp<span class="token punctuation">.</span>m<span class="token punctuation">.</span>nextp<span class="token punctuation">.</span><span class="token function">ptr</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span>
        gp<span class="token punctuation">.</span>m<span class="token punctuation">.</span>nextp <span class="token operator">=</span> <span class="token number">0</span>
    <span class="token punctuation">}</span>
    <span class="token comment">// 此时一定是在g0上面执行调度</span>
    <span class="token function">schedule</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h2 id="_2-5-调度器源码分析" tabindex="-1"><a class="header-anchor" href="#_2-5-调度器源码分析"><span>2.5 调度器源码分析</span></a></h2>
<h3 id="_2-5-1-系统全局变量" tabindex="-1"><a class="header-anchor" href="#_2-5-1-系统全局变量"><span>2.5.1 系统全局变量</span></a></h3>
<div class="language-go line-numbers-mode" data-ext="go" data-title="go"><pre v-pre class="language-go"><code>    <span class="token comment">// 存储所有的m，通过m.alllink相连。allm指向最新一个m，然后最新m的alllink指向之前一个m，直到m0</span>
    allm       <span class="token operator">*</span>m      
    gomaxprocs <span class="token builtin">int32</span>
    ncpu       <span class="token builtin">int32</span>    <span class="token comment">// cpu核数</span>
    forcegc    forcegcstate
    sched      schedt   <span class="token comment">// 全局调度器</span>
    newprocs   <span class="token builtin">int32</span>    
    allpLock mutex
    allp <span class="token punctuation">[</span><span class="token punctuation">]</span><span class="token operator">*</span>p           <span class="token comment">// 保存所有的p指针</span>
    gcBgMarkWorkerPool lfstack
    gcBgMarkWorkerCount <span class="token builtin">int32</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_2-5-2-调度器schedt结构体" tabindex="-1"><a class="header-anchor" href="#_2-5-2-调度器schedt结构体"><span>2.5.2 调度器schedt结构体</span></a></h3>
<p>保存调度器的状态信息以及全局空闲的M、P列表、goroutine的全局运行队列。该结构体变量sched是全局变量，保存了很多全局数据，多数要加锁修改。</p>
<div class="language-go line-numbers-mode" data-ext="go" data-title="go"><pre v-pre class="language-go"><code><span class="token keyword">type</span> schedt <span class="token keyword">struct</span> <span class="token punctuation">{</span>
    goidgen   atomic<span class="token punctuation">.</span>Uint64
    lastpoll  atomic<span class="token punctuation">.</span>Int64 <span class="token comment">// time of last network poll, 0 if currently polling</span>
    pollUntil atomic<span class="token punctuation">.</span>Int64 <span class="token comment">// time to which current poll is sleeping</span>
    lock mutex
    midle        muintptr <span class="token comment">// 等待运行的空闲M列表</span>
    nmidle       <span class="token builtin">int32</span>    <span class="token comment">// 空闲M列表中元素个数</span>
    nmidlelocked <span class="token builtin">int32</span>    <span class="token comment">// number of locked m's waiting for work</span>
    mnext        <span class="token builtin">int64</span>    <span class="token comment">// number of m's that have been created and next M ID</span>
    maxmcount    <span class="token builtin">int32</span>    <span class="token comment">// 最多只能创建maxmcount个工作线程</span>
    nmsys        <span class="token builtin">int32</span>    <span class="token comment">// number of system m's not counted for deadlock</span>
    nmfreed      <span class="token builtin">int64</span>    <span class="token comment">// cumulative number of freed m's</span>
    ngsys atomic<span class="token punctuation">.</span>Int32 <span class="token comment">// number of system goroutines</span>
    pidle        puintptr <span class="token comment">// 由空闲的p结构体对象组成的链表</span>
    npidle       atomic<span class="token punctuation">.</span>Int32 <span class="token comment">// 空闲的p结构体对象的数量</span>
    nmspinning   atomic<span class="token punctuation">.</span>Int32  <span class="token comment">// See "Worker thread parking/unparking" comment in proc.go.</span>
    needspinning atomic<span class="token punctuation">.</span>Uint32 <span class="token comment">// See "Delicate dance" comment in proc.go. Boolean. Must hold sched.lock to set to 1.</span>
    <span class="token comment">// goroutine的全局运行队列</span>
    runq     gQueue
    runqsize <span class="token builtin">int32</span>
    disable <span class="token keyword">struct</span> <span class="token punctuation">{</span>
        <span class="token comment">// user disables scheduling of user goroutines.</span>
        user     <span class="token builtin">bool</span>
        runnable gQueue <span class="token comment">// pending runnable Gs</span>
        n        <span class="token builtin">int32</span>  <span class="token comment">// length of runnable</span>
    <span class="token punctuation">}</span>
    <span class="token comment">// gFree是所有状态已经死亡（dead）的goroutine对应的g结构体对象组成的链表</span>
    <span class="token comment">// 用于缓存g结构体对象，避免每次创建goroutine时都需要重新分配</span>
    gFree <span class="token keyword">struct</span> <span class="token punctuation">{</span>
        lock    mutex
        stack   gList <span class="token comment">// Gs with stacks</span>
        noStack gList <span class="token comment">// Gs without stacks</span>
        n       <span class="token builtin">int32</span>
    <span class="token punctuation">}</span>


    <span class="token comment">// Central cache of sudog structs.</span>
    sudoglock  mutex
    sudogcache <span class="token operator">*</span>sudog


    <span class="token comment">// 保存已经退出的m，等待被释放</span>
    freem <span class="token operator">*</span>m


    gcwaiting  atomic<span class="token punctuation">.</span>Bool <span class="token comment">// gc is waiting to run</span>
    stopwait   <span class="token builtin">int32</span>
    stopnote   note
    sysmonwait atomic<span class="token punctuation">.</span>Bool
    sysmonnote note
    <span class="token comment">// ......</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_2-5-3-调度器初始化" tabindex="-1"><a class="header-anchor" href="#_2-5-3-调度器初始化"><span>2.5.3 调度器初始化</span></a></h3>
<p>在进程启动入口汇编函数rt0_go里面，完成m0和g0的绑定之后，就会调用调度器初始化函数schedinit，该函数是启动时由主线程m0调用，仅会执行一次</p>
<div class="language-go line-numbers-mode" data-ext="go" data-title="go"><pre v-pre class="language-go"><code><span class="token keyword">func</span> <span class="token function">schedinit</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token function">lockInit</span><span class="token punctuation">(</span><span class="token operator">&amp;</span>sched<span class="token punctuation">.</span>lock<span class="token punctuation">,</span> lockRankSched<span class="token punctuation">)</span>
    <span class="token comment">// lockInit......</span>
    gp <span class="token operator">:=</span> <span class="token function">getg</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
    <span class="token comment">// 系统线程M最多10000个</span>
    sched<span class="token punctuation">.</span>maxmcount <span class="token operator">=</span> <span class="token number">10000</span>
    <span class="token comment">// The world starts stopped.</span>
    <span class="token function">worldStopped</span><span class="token punctuation">(</span><span class="token punctuation">)</span>


    <span class="token function">moduledataverify</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
    <span class="token function">stackinit</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
    <span class="token function">mallocinit</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
    <span class="token function">cpuinit</span><span class="token punctuation">(</span><span class="token punctuation">)</span>      <span class="token comment">// must run before alginit</span>
    <span class="token function">alginit</span><span class="token punctuation">(</span><span class="token punctuation">)</span>      <span class="token comment">// maps, hash, fastrand must not be used before this call</span>
    <span class="token function">fastrandinit</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token comment">// must run before mcommoninit</span>
    <span class="token function">mcommoninit</span><span class="token punctuation">(</span>gp<span class="token punctuation">.</span>m<span class="token punctuation">,</span> <span class="token operator">-</span><span class="token number">1</span><span class="token punctuation">)</span>
    <span class="token function">gcinit</span><span class="token punctuation">(</span><span class="token punctuation">)</span>


    <span class="token function">lock</span><span class="token punctuation">(</span><span class="token operator">&amp;</span>sched<span class="token punctuation">.</span>lock<span class="token punctuation">)</span>
    sched<span class="token punctuation">.</span>lastpoll<span class="token punctuation">.</span><span class="token function">Store</span><span class="token punctuation">(</span><span class="token function">nanotime</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span>
    procs <span class="token operator">:=</span> ncpu
    <span class="token keyword">if</span> n<span class="token punctuation">,</span> ok <span class="token operator">:=</span> <span class="token function">atoi32</span><span class="token punctuation">(</span><span class="token function">gogetenv</span><span class="token punctuation">(</span><span class="token string">"GOMAXPROCS"</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span> ok <span class="token operator">&amp;&amp;</span> n <span class="token operator">></span> <span class="token number">0</span> <span class="token punctuation">{</span>
        procs <span class="token operator">=</span> n
    <span class="token punctuation">}</span>
    <span class="token comment">// 调度器初始化时会创建cpu核数相同或者环境变量GOMAXPROCS个处理器P</span>
    <span class="token keyword">if</span> <span class="token function">procresize</span><span class="token punctuation">(</span>procs<span class="token punctuation">)</span> <span class="token operator">!=</span> <span class="token boolean">nil</span> <span class="token punctuation">{</span>
        <span class="token function">throw</span><span class="token punctuation">(</span><span class="token string">"unknown runnable goroutine during bootstrap"</span><span class="token punctuation">)</span>
    <span class="token punctuation">}</span>
    <span class="token function">unlock</span><span class="token punctuation">(</span><span class="token operator">&amp;</span>sched<span class="token punctuation">.</span>lock<span class="token punctuation">)</span>


    <span class="token comment">// World is effectively started now, as P's can run.</span>
    <span class="token function">worldStarted</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_2-5-4-调度器启动调度流程" tabindex="-1"><a class="header-anchor" href="#_2-5-4-调度器启动调度流程"><span>2.5.4 调度器启动调度流程</span></a></h3>
<p>启动协程调度主要是通过调用runtime.schedule,多个场景均会启动协程调度</p>
<ol>
<li>线程m启动时，无论时初始线程m0，还是后来创建的线程，线程都会执行runtime.mstart0初始化m，完成初始化之后便执行调度函数schedule</li>
<li>协程主动让渡其他协程执行Goched</li>
<li>发生协程抢占（preemptPark）的时候</li>
<li>当前协程执行协程挂起操作goyield</li>
<li>当前协程退出时（goexit）</li>
</ol>
<h3 id="_2-5-5-调度器调度流程" tabindex="-1"><a class="header-anchor" href="#_2-5-5-调度器调度流程"><span>2.5.5 调度器调度流程</span></a></h3>
<div class="language-go line-numbers-mode" data-ext="go" data-title="go"><pre v-pre class="language-go"><code><span class="token keyword">func</span> <span class="token function">schedule</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    mp <span class="token operator">:=</span> <span class="token function">getg</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">.</span>m
top<span class="token punctuation">:</span>
    pp <span class="token operator">:=</span> mp<span class="token punctuation">.</span>p<span class="token punctuation">.</span><span class="token function">ptr</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
    pp<span class="token punctuation">.</span>preempt <span class="token operator">=</span> <span class="token boolean">false</span>


    <span class="token comment">// 调度策略 阻塞在查找可执行的g，用本地p的队列g，没有用全局队列的g</span>
    gp<span class="token punctuation">,</span> inheritTime<span class="token punctuation">,</span> tryWakeP <span class="token operator">:=</span> <span class="token function">findRunnable</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token comment">// blocks until work is available</span>
    <span class="token comment">// 在当前m上运行协程g，该函数不再返回</span>
    <span class="token function">execute</span><span class="token punctuation">(</span>gp<span class="token punctuation">,</span> inheritTime<span class="token punctuation">)</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>协程调度函数通过协程调度策略在寻找到可以运行的g之后，调用execute来执行该协程。具体调度策略都在findRunable中，后续会介绍</p>
<div class="language-go line-numbers-mode" data-ext="go" data-title="go"><pre v-pre class="language-go"><code><span class="token comment">// 入参： gp:待运行的g指针，inheritTime：是否要增加当前P的调度计数tick</span>
<span class="token keyword">func</span> <span class="token function">execute</span><span class="token punctuation">(</span>gp <span class="token operator">*</span>g<span class="token punctuation">,</span> inheritTime <span class="token builtin">bool</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    mp <span class="token operator">:=</span> <span class="token function">getg</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">.</span>m


    <span class="token comment">// Assign gp.m before entering _Grunning so running Gs have an</span>
    <span class="token comment">// M.</span>
    mp<span class="token punctuation">.</span>curg <span class="token operator">=</span> gp
    gp<span class="token punctuation">.</span>m <span class="token operator">=</span> mp
    <span class="token function">casgstatus</span><span class="token punctuation">(</span>gp<span class="token punctuation">,</span> _Grunnable<span class="token punctuation">,</span> _Grunning<span class="token punctuation">)</span>
    gp<span class="token punctuation">.</span>waitsince <span class="token operator">=</span> <span class="token number">0</span>
    gp<span class="token punctuation">.</span>preempt <span class="token operator">=</span> <span class="token boolean">false</span>
    gp<span class="token punctuation">.</span>stackguard0 <span class="token operator">=</span> gp<span class="token punctuation">.</span>stack<span class="token punctuation">.</span>lo <span class="token operator">+</span> _StackGuard
    <span class="token keyword">if</span> <span class="token operator">!</span>inheritTime <span class="token punctuation">{</span>
        mp<span class="token punctuation">.</span>p<span class="token punctuation">.</span><span class="token function">ptr</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">.</span>schedtick<span class="token operator">++</span>
    <span class="token punctuation">}</span>


    <span class="token comment">// 用来从gobuf中恢复出协程执行状态并跳转到上一次指令处继续执行</span>
    <span class="token function">gogo</span><span class="token punctuation">(</span><span class="token operator">&amp;</span>gp<span class="token punctuation">.</span>sched<span class="token punctuation">)</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>execute将协程g设置为运行态之后，调用gogo切换到该协程,通过汇编语言，将CPU寄存器以及函数调用栈切换为g的sched中相关指针和协程栈</p>
<div class="language-go line-numbers-mode" data-ext="go" data-title="go"><pre v-pre class="language-go"><code><span class="token comment">// src/runtime/asm_arm64.s</span>


TEXT runtime·<span class="token function">gogo</span><span class="token punctuation">(</span>SB<span class="token punctuation">)</span><span class="token punctuation">,</span> NOSPLIT<span class="token punctuation">,</span> $<span class="token number">16</span><span class="token operator">-</span><span class="token number">8</span>
    <span class="token comment">// 0（FP）表示第一个参数，即buf=&amp;gp.sched</span>
    MOVW    buf<span class="token operator">+</span><span class="token function">0</span><span class="token punctuation">(</span>FP<span class="token punctuation">)</span><span class="token punctuation">,</span> R1   <span class="token comment">//gobuf</span>
    MOVW    <span class="token function">gobuf_g</span><span class="token punctuation">(</span>R1<span class="token punctuation">)</span><span class="token punctuation">,</span> R0
    MOVW    <span class="token function">0</span><span class="token punctuation">(</span>R0<span class="token punctuation">)</span><span class="token punctuation">,</span> R2   <span class="token comment">// make sure g != nil</span>
    B   gogo<span class="token operator">&lt;</span><span class="token operator">></span><span class="token punctuation">(</span>SB<span class="token punctuation">)</span>


TEXT gogo<span class="token operator">&lt;</span><span class="token operator">></span><span class="token punctuation">(</span>SB<span class="token punctuation">)</span><span class="token punctuation">,</span>NOSPLIT<span class="token operator">|</span>NOFRAME<span class="token punctuation">,</span>$<span class="token number">0</span>
    BL  setg<span class="token operator">&lt;</span><span class="token operator">></span><span class="token punctuation">(</span>SB<span class="token punctuation">)</span>
    <span class="token comment">// 栈指针的切换，当前SP指向g0的栈，此处切换回gp.sched里面的sp指针，即完成了从g0到g的栈切换</span>
    MOVW    <span class="token function">gobuf_sp</span><span class="token punctuation">(</span>R1<span class="token punctuation">)</span><span class="token punctuation">,</span> R13   <span class="token comment">// restore SP==R13</span>
    MOVW    <span class="token function">gobuf_lr</span><span class="token punctuation">(</span>R1<span class="token punctuation">)</span><span class="token punctuation">,</span> LR
    MOVW    <span class="token function">gobuf_ret</span><span class="token punctuation">(</span>R1<span class="token punctuation">)</span><span class="token punctuation">,</span> R0
    MOVW    <span class="token function">gobuf_ctxt</span><span class="token punctuation">(</span>R1<span class="token punctuation">)</span><span class="token punctuation">,</span> R7
    <span class="token comment">// 切换完成后，将sched里面的字段都清空</span>
    MOVW    $<span class="token number">0</span><span class="token punctuation">,</span> R11
    MOVW    R11<span class="token punctuation">,</span> <span class="token function">gobuf_sp</span><span class="token punctuation">(</span>R1<span class="token punctuation">)</span>   <span class="token comment">// clear to help garbage collector</span>
    MOVW    R11<span class="token punctuation">,</span> <span class="token function">gobuf_ret</span><span class="token punctuation">(</span>R1<span class="token punctuation">)</span>
    MOVW    R11<span class="token punctuation">,</span> <span class="token function">gobuf_lr</span><span class="token punctuation">(</span>R1<span class="token punctuation">)</span>
    MOVW    R11<span class="token punctuation">,</span> <span class="token function">gobuf_ctxt</span><span class="token punctuation">(</span>R1<span class="token punctuation">)</span>
    <span class="token comment">// 将g.sched里面的pc值保存到BX里面，然后JMP跳转到该位置开始执行，开始执行协程g的代码</span>
    MOVW    <span class="token function">gobuf_pc</span><span class="token punctuation">(</span>R1<span class="token punctuation">)</span><span class="token punctuation">,</span> R11
    CMP R11<span class="token punctuation">,</span> R11 <span class="token comment">// set condition codes for == test, needed by stack split</span>
    B   <span class="token punctuation">(</span>R11<span class="token punctuation">)</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_2-5-6-协程调度策略" tabindex="-1"><a class="header-anchor" href="#_2-5-6-协程调度策略"><span>2.5.6 协程调度策略</span></a></h3>
<p>在调度器调度流程里面介绍，执行调度函数后，需要通过一定的策略找到下一个可运行的g，调度策略如下图：</p>
<!-- ![tmp.jpg](/img/runnable.jpg) -->
<p>调度策略主要是函数findRunnable()来完成</p>
<div class="language-go line-numbers-mode" data-ext="go" data-title="go"><pre v-pre class="language-go"><code><span class="token comment">// 返回参数</span>
<span class="token comment">// gp: 返回可运行的协程g，可能是P的本地队列里面的，也可能是从别的P窃取过来的，也可能是全局获取的，还可能是poll network唤醒的</span>
<span class="token comment">// inheriTime: 是否要增加当前P的调度计数tick</span>
<span class="token comment">// tryWakeP: 如果是GC或者trace的协程，需要去唤醒一个P来执行</span>
<span class="token keyword">func</span> <span class="token function">findRunnable</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">(</span>gp <span class="token operator">*</span>g<span class="token punctuation">,</span> inheritTime<span class="token punctuation">,</span> tryWakeP <span class="token builtin">bool</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    mp <span class="token operator">:=</span> <span class="token function">getg</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">.</span>m
    <span class="token comment">// 每隔61次从全局队列上获取一个可执行的G，P的本地队列都忙，全局协程也能执行。https://github.com/golang/go/issues/20168</span>
    <span class="token keyword">if</span> pp<span class="token punctuation">.</span>schedtick<span class="token operator">%</span><span class="token number">61</span> <span class="token operator">==</span> <span class="token number">0</span> <span class="token operator">&amp;&amp;</span> sched<span class="token punctuation">.</span>runqsize <span class="token operator">></span> <span class="token number">0</span> <span class="token punctuation">{</span>
        <span class="token function">lock</span><span class="token punctuation">(</span><span class="token operator">&amp;</span>sched<span class="token punctuation">.</span>lock<span class="token punctuation">)</span>
        gp <span class="token operator">:=</span> <span class="token function">globrunqget</span><span class="token punctuation">(</span>pp<span class="token punctuation">,</span> <span class="token number">1</span><span class="token punctuation">)</span>
        <span class="token function">unlock</span><span class="token punctuation">(</span><span class="token operator">&amp;</span>sched<span class="token punctuation">.</span>lock<span class="token punctuation">)</span>
        <span class="token keyword">if</span> gp <span class="token operator">!=</span> <span class="token boolean">nil</span> <span class="token punctuation">{</span>
            <span class="token keyword">return</span> gp<span class="token punctuation">,</span> <span class="token boolean">false</span><span class="token punctuation">,</span> <span class="token boolean">false</span>
        <span class="token punctuation">}</span>
    <span class="token punctuation">}</span>
    <span class="token comment">// local runq</span>
    <span class="token keyword">if</span> gp<span class="token punctuation">,</span> inheritTime <span class="token operator">:=</span> <span class="token function">runqget</span><span class="token punctuation">(</span>pp<span class="token punctuation">)</span><span class="token punctuation">;</span> gp <span class="token operator">!=</span> <span class="token boolean">nil</span> <span class="token punctuation">{</span>
        <span class="token keyword">return</span> gp<span class="token punctuation">,</span> inheritTime<span class="token punctuation">,</span> <span class="token boolean">false</span>
    <span class="token punctuation">}</span>
    <span class="token comment">// global runq</span>
    <span class="token keyword">if</span> sched<span class="token punctuation">.</span>runqsize <span class="token operator">!=</span> <span class="token number">0</span> <span class="token punctuation">{</span>
        <span class="token function">lock</span><span class="token punctuation">(</span><span class="token operator">&amp;</span>sched<span class="token punctuation">.</span>lock<span class="token punctuation">)</span>
        gp <span class="token operator">:=</span> <span class="token function">globrunqget</span><span class="token punctuation">(</span>pp<span class="token punctuation">,</span> <span class="token number">0</span><span class="token punctuation">)</span>
        <span class="token function">unlock</span><span class="token punctuation">(</span><span class="token operator">&amp;</span>sched<span class="token punctuation">.</span>lock<span class="token punctuation">)</span>
        <span class="token keyword">if</span> gp <span class="token operator">!=</span> <span class="token boolean">nil</span> <span class="token punctuation">{</span>
            <span class="token keyword">return</span> gp<span class="token punctuation">,</span> <span class="token boolean">false</span><span class="token punctuation">,</span> <span class="token boolean">false</span>
        <span class="token punctuation">}</span>
    <span class="token punctuation">}</span>
    <span class="token comment">// Poll network.</span>
    <span class="token keyword">if</span> <span class="token function">netpollinited</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">&amp;&amp;</span> netpollWaiters<span class="token punctuation">.</span><span class="token function">Load</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">></span> <span class="token number">0</span> <span class="token operator">&amp;&amp;</span> sched<span class="token punctuation">.</span>lastpoll<span class="token punctuation">.</span><span class="token function">Load</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">!=</span> <span class="token number">0</span> <span class="token punctuation">{</span>
        <span class="token keyword">if</span> list <span class="token operator">:=</span> <span class="token function">netpoll</span><span class="token punctuation">(</span><span class="token number">0</span><span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token operator">!</span>list<span class="token punctuation">.</span><span class="token function">empty</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span> <span class="token comment">// non-blocking</span>
            gp <span class="token operator">:=</span> list<span class="token punctuation">.</span><span class="token function">pop</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
            <span class="token function">injectglist</span><span class="token punctuation">(</span><span class="token operator">&amp;</span>list<span class="token punctuation">)</span>
            <span class="token function">casgstatus</span><span class="token punctuation">(</span>gp<span class="token punctuation">,</span> _Gwaiting<span class="token punctuation">,</span> _Grunnable<span class="token punctuation">)</span>
            <span class="token keyword">if</span> trace<span class="token punctuation">.</span>enabled <span class="token punctuation">{</span>
                <span class="token function">traceGoUnpark</span><span class="token punctuation">(</span>gp<span class="token punctuation">,</span> <span class="token number">0</span><span class="token punctuation">)</span>
            <span class="token punctuation">}</span>
            <span class="token keyword">return</span> gp<span class="token punctuation">,</span> <span class="token boolean">false</span><span class="token punctuation">,</span> <span class="token boolean">false</span>
        <span class="token punctuation">}</span>
    <span class="token punctuation">}</span>


    <span class="token comment">// Spinning Ms: steal work from other Ps.</span>
    <span class="token keyword">if</span> mp<span class="token punctuation">.</span>spinning <span class="token operator">||</span> <span class="token number">2</span><span class="token operator">*</span>sched<span class="token punctuation">.</span>nmspinning<span class="token punctuation">.</span><span class="token function">Load</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">&lt;</span> gomaxprocs<span class="token operator">-</span>sched<span class="token punctuation">.</span>npidle<span class="token punctuation">.</span><span class="token function">Load</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
        <span class="token keyword">if</span> <span class="token operator">!</span>mp<span class="token punctuation">.</span>spinning <span class="token punctuation">{</span>
            mp<span class="token punctuation">.</span><span class="token function">becomeSpinning</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
        <span class="token punctuation">}</span>


        gp<span class="token punctuation">,</span> inheritTime<span class="token punctuation">,</span> tnow<span class="token punctuation">,</span> w<span class="token punctuation">,</span> newWork <span class="token operator">:=</span> <span class="token function">stealWork</span><span class="token punctuation">(</span>now<span class="token punctuation">)</span>
        <span class="token keyword">if</span> gp <span class="token operator">!=</span> <span class="token boolean">nil</span> <span class="token punctuation">{</span>
            <span class="token comment">// Successfully stole.</span>
            <span class="token keyword">return</span> gp<span class="token punctuation">,</span> inheritTime<span class="token punctuation">,</span> <span class="token boolean">false</span>
        <span class="token punctuation">}</span>
        <span class="token keyword">if</span> newWork <span class="token punctuation">{</span>
            <span class="token comment">// There may be new timer or GC work; restart to</span>
            <span class="token comment">// discover.</span>
            <span class="token keyword">goto</span> top
        <span class="token punctuation">}</span>


        now <span class="token operator">=</span> tnow
        <span class="token keyword">if</span> w <span class="token operator">!=</span> <span class="token number">0</span> <span class="token operator">&amp;&amp;</span> <span class="token punctuation">(</span>pollUntil <span class="token operator">==</span> <span class="token number">0</span> <span class="token operator">||</span> w <span class="token operator">&lt;</span> pollUntil<span class="token punctuation">)</span> <span class="token punctuation">{</span>
            <span class="token comment">// Earlier timer to wait for.</span>
            pollUntil <span class="token operator">=</span> w
        <span class="token punctuation">}</span>
    <span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div></div></template>



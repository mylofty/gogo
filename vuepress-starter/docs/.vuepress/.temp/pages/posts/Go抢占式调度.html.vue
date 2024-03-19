<template><div><h2 id="_2-6-抢占式调度" tabindex="-1"><a class="header-anchor" href="#_2-6-抢占式调度"><span>2.6 抢占式调度</span></a></h2>
<h3 id="_2-6-0-sysmon监听抢占时机" tabindex="-1"><a class="header-anchor" href="#_2-6-0-sysmon监听抢占时机"><span>2.6.0 sysmon监听抢占时机</span></a></h3>
<p>sysmon是一个Go里面的一个特殊的线程，不与任何P绑定，不参与调度，主要用于监控整个Go进程，主要有如下作用：</p>
<ol>
<li>释放闲置超过5分钟的span物理内存</li>
<li>超过2分钟没有垃圾回收，强制启动垃圾回收</li>
<li>将长时间没有处理的netpoll结果添加到任务队列</li>
<li>向长时间执行的G任务发起抢占调度</li>
<li>收回因syscall而长时间阻塞的P</li>
</ol>
<p>sysmon线程在runtime.main函数里面创建：</p>
<div class="language-go line-numbers-mode" data-ext="go" data-title="go"><pre v-pre class="language-go"><code><span class="token keyword">func</span> <span class="token function">main</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token operator">...</span>
      <span class="token keyword">if</span> GOARCH <span class="token operator">!=</span> <span class="token string">"wasm"</span> <span class="token punctuation">{</span> <span class="token comment">// no threads on wasm yet, so no sysmon</span>
      <span class="token comment">// 启动sysmon的代码</span>
      <span class="token comment">// 在系统栈内生成一个新的M来启动sysmon</span>
      atomic<span class="token punctuation">.</span><span class="token function">Store</span><span class="token punctuation">(</span><span class="token operator">&amp;</span>sched<span class="token punctuation">.</span>sysmonStarting<span class="token punctuation">,</span> <span class="token number">1</span><span class="token punctuation">)</span>
        <span class="token function">systemstack</span><span class="token punctuation">(</span><span class="token keyword">func</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
          <span class="token function">newm</span><span class="token punctuation">(</span>sysmon<span class="token punctuation">,</span> <span class="token boolean">nil</span><span class="token punctuation">,</span> <span class="token operator">-</span><span class="token number">1</span><span class="token punctuation">)</span>
      <span class="token punctuation">}</span><span class="token punctuation">)</span>
    <span class="token punctuation">}</span>
  <span class="token operator">...</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>在<strong>线程M的创建过程</strong>中有提到newm函数，该函数用来创建一个内核线程m，设置启动函数为首个参数。执行流程为newm--&gt;newm1--&gt;newosporc-&gt;pthread_create--&gt;runtime.mstart--&gt;runtime.mstart1--&gt;mstartfn--&gt;schedule；此处mstartfn便是sysmon函数。由于sysmon函数是死循环的，所以监控线程永远不会执行到后面的调度程序schedule
以下为sysmon函数循环检查Go进程的过程：</p>
<div class="language-go line-numbers-mode" data-ext="go" data-title="go"><pre v-pre class="language-go"><code><span class="token keyword">func</span> <span class="token function">sysmon</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    lasttrace <span class="token operator">:=</span> <span class="token function">int64</span><span class="token punctuation">(</span><span class="token number">0</span><span class="token punctuation">)</span>
    idle <span class="token operator">:=</span> <span class="token number">0</span> <span class="token comment">// 每次扫描无需抢占的计数器，无须抢占次数越多，后续sysmon线程休眠时间越高</span>
    delay <span class="token operator">:=</span> <span class="token function">uint32</span><span class="token punctuation">(</span><span class="token number">0</span><span class="token punctuation">)</span>
    <span class="token keyword">for</span> <span class="token punctuation">{</span>
        <span class="token comment">// delay按idel值来判断休眠时间，首次20us，1ms之后sleep逐步翻倍，最高10ms</span>
        <span class="token comment">// ......</span>
        <span class="token function">usleep</span><span class="token punctuation">(</span>delay<span class="token punctuation">)</span>
        <span class="token comment">// poll网络监听，处理超过10ms以上的netpoll</span>
        lastpoll <span class="token operator">:=</span> sched<span class="token punctuation">.</span>lastpoll<span class="token punctuation">.</span><span class="token function">Load</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
        <span class="token keyword">if</span> <span class="token function">netpollinited</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">&amp;&amp;</span> lastpoll <span class="token operator">!=</span> <span class="token number">0</span> <span class="token operator">&amp;&amp;</span> lastpoll<span class="token operator">+</span><span class="token number">10</span><span class="token operator">*</span><span class="token number">1000</span><span class="token operator">*</span><span class="token number">1000</span> <span class="token operator">&lt;</span> now <span class="token punctuation">{</span>
            sched<span class="token punctuation">.</span>lastpoll<span class="token punctuation">.</span><span class="token function">CompareAndSwap</span><span class="token punctuation">(</span>lastpoll<span class="token punctuation">,</span> now<span class="token punctuation">)</span>
            list <span class="token operator">:=</span> <span class="token function">netpoll</span><span class="token punctuation">(</span><span class="token number">0</span><span class="token punctuation">)</span> <span class="token comment">// non-blocking - returns list of goroutines</span>
            <span class="token keyword">if</span> <span class="token operator">!</span>list<span class="token punctuation">.</span><span class="token function">empty</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
                <span class="token function">injectglist</span><span class="token punctuation">(</span><span class="token operator">&amp;</span>list<span class="token punctuation">)</span>
            <span class="token punctuation">}</span>
        <span class="token punctuation">}</span>
        <span class="token comment">//检查是否有协程需要抢占</span>
        <span class="token keyword">if</span> <span class="token function">retake</span><span class="token punctuation">(</span>now<span class="token punctuation">)</span> <span class="token operator">!=</span> <span class="token number">0</span> <span class="token punctuation">{</span>
            idle <span class="token operator">=</span> <span class="token number">0</span> <span class="token comment">// 发生抢占，计数器设置为0，sysmon休眠时间重设为初始值20us</span>
        <span class="token punctuation">}</span> <span class="token keyword">else</span> <span class="token punctuation">{</span>
            idle<span class="token operator">++</span>
        <span class="token punctuation">}</span>
        <span class="token comment">// 检查是否需要强制gc</span>
        <span class="token keyword">if</span> t <span class="token operator">:=</span> <span class="token punctuation">(</span>gcTrigger<span class="token punctuation">{</span>kind<span class="token punctuation">:</span> gcTriggerTime<span class="token punctuation">,</span> now<span class="token punctuation">:</span> now<span class="token punctuation">}</span><span class="token punctuation">)</span><span class="token punctuation">;</span> t<span class="token punctuation">.</span><span class="token function">test</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">&amp;&amp;</span> forcegc<span class="token punctuation">.</span>idle<span class="token punctuation">.</span><span class="token function">Load</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
            <span class="token function">lock</span><span class="token punctuation">(</span><span class="token operator">&amp;</span>forcegc<span class="token punctuation">.</span>lock<span class="token punctuation">)</span>
            forcegc<span class="token punctuation">.</span>idle<span class="token punctuation">.</span><span class="token function">Store</span><span class="token punctuation">(</span><span class="token boolean">false</span><span class="token punctuation">)</span>
            <span class="token keyword">var</span> list gList
            list<span class="token punctuation">.</span><span class="token function">push</span><span class="token punctuation">(</span>forcegc<span class="token punctuation">.</span>g<span class="token punctuation">)</span>
            <span class="token function">injectglist</span><span class="token punctuation">(</span><span class="token operator">&amp;</span>list<span class="token punctuation">)</span>
            <span class="token function">unlock</span><span class="token punctuation">(</span><span class="token operator">&amp;</span>forcegc<span class="token punctuation">.</span>lock<span class="token punctuation">)</span>
        <span class="token punctuation">}</span>
    <span class="token punctuation">}</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>sysmon监控线程判断是否需要抢占主要通过retake函数进行检查，遍历所有的P，如果某个P经过10ms没有切换都没有协程，那么就需要被抢占了。</p>
<div class="language-go line-numbers-mode" data-ext="go" data-title="go"><pre v-pre class="language-go"><code><span class="token keyword">const</span> forcePreemptNS <span class="token operator">=</span> <span class="token number">10</span> <span class="token operator">*</span> <span class="token number">1000</span> <span class="token operator">*</span> <span class="token number">1000</span> <span class="token comment">// 10ms</span>


<span class="token keyword">func</span> <span class="token function">retake</span><span class="token punctuation">(</span>now <span class="token builtin">int64</span><span class="token punctuation">)</span> <span class="token builtin">uint32</span> <span class="token punctuation">{</span>
    <span class="token comment">// ......</span>
    <span class="token keyword">for</span> i <span class="token operator">:=</span> <span class="token number">0</span><span class="token punctuation">;</span> i <span class="token operator">&lt;</span> <span class="token function">len</span><span class="token punctuation">(</span>allp<span class="token punctuation">)</span><span class="token punctuation">;</span> i<span class="token operator">++</span> <span class="token punctuation">{</span>
        pp <span class="token operator">:=</span> allp<span class="token punctuation">[</span>i<span class="token punctuation">]</span>
        pd <span class="token operator">:=</span> <span class="token operator">&amp;</span>pp<span class="token punctuation">.</span>sysmontick
        s <span class="token operator">:=</span> pp<span class="token punctuation">.</span>status
        sysretake <span class="token operator">:=</span> <span class="token boolean">false</span>
        <span class="token keyword">if</span> s <span class="token operator">==</span> _Prunning <span class="token operator">||</span> s <span class="token operator">==</span> _Psyscall <span class="token punctuation">{</span>
            <span class="token comment">// Preempt G if it's running for too long.</span>
            t <span class="token operator">:=</span> <span class="token function">int64</span><span class="token punctuation">(</span>pp<span class="token punctuation">.</span>schedtick<span class="token punctuation">)</span>
            <span class="token keyword">if</span> <span class="token function">int64</span><span class="token punctuation">(</span>pd<span class="token punctuation">.</span>schedtick<span class="token punctuation">)</span> <span class="token operator">!=</span> t <span class="token punctuation">{</span>
                pd<span class="token punctuation">.</span>schedtick <span class="token operator">=</span> <span class="token function">uint32</span><span class="token punctuation">(</span>t<span class="token punctuation">)</span>
                pd<span class="token punctuation">.</span>schedwhen <span class="token operator">=</span> now
            <span class="token punctuation">}</span> <span class="token keyword">else</span> <span class="token keyword">if</span> pd<span class="token punctuation">.</span>schedwhen<span class="token operator">+</span>forcePreemptNS <span class="token operator">&lt;=</span> now <span class="token punctuation">{</span>
                <span class="token comment">// 遍历所有的P，到某个P距离上一次调度在10ms以上，需要执行抢占</span>
                <span class="token function">preemptone</span><span class="token punctuation">(</span>pp<span class="token punctuation">)</span>
                sysretake <span class="token operator">=</span> <span class="token boolean">true</span>
            <span class="token punctuation">}</span>
        <span class="token punctuation">}</span>
        <span class="token comment">// ......</span>
    <span class="token punctuation">}</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>找到需要抢占的P后，调用preemptone(pp)对P当前运行的协程进行抢占。抢占的方式有两种，一种是基于协作的抢占，一种是基于信号的抢占</p>
<div class="language-go line-numbers-mode" data-ext="go" data-title="go"><pre v-pre class="language-go"><code><span class="token keyword">const</span><span class="token punctuation">(</span>
    <span class="token comment">// 0xfffffade in hex.</span>
    stackPreempt <span class="token operator">=</span> <span class="token number">0xfffffade</span> <span class="token comment">// (1&lt;&lt;(8*sys.PtrSize) - 1) &amp; -1314</span>
<span class="token punctuation">)</span>
<span class="token keyword">func</span> <span class="token function">preemptone</span><span class="token punctuation">(</span>pp <span class="token operator">*</span>p<span class="token punctuation">)</span> <span class="token builtin">bool</span> <span class="token punctuation">{</span>
    mp <span class="token operator">:=</span> pp<span class="token punctuation">.</span>m<span class="token punctuation">.</span><span class="token function">ptr</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
    gp <span class="token operator">:=</span> mp<span class="token punctuation">.</span>curg
    gp<span class="token punctuation">.</span>preempt <span class="token operator">=</span> <span class="token boolean">true</span>
    <span class="token comment">// 基于协程的抢占</span>
    <span class="token comment">// stackPreempt是一个很大的常量，其他地方会检查这个变量，当go的stackgurad0栈为这个数值时，标明需要被抢占</span>
    gp<span class="token punctuation">.</span>stackguard0 <span class="token operator">=</span> stackPreempt
    <span class="token keyword">if</span> preemptMSupported <span class="token operator">&amp;&amp;</span> debug<span class="token punctuation">.</span>asyncpreemptoff <span class="token operator">==</span> <span class="token number">0</span> <span class="token punctuation">{</span>
        pp<span class="token punctuation">.</span>preempt <span class="token operator">=</span> <span class="token boolean">true</span>
        <span class="token comment">// 设置基于信号的抢占</span>
        <span class="token function">preemptM</span><span class="token punctuation">(</span>mp<span class="token punctuation">)</span>
    <span class="token punctuation">}</span>
    <span class="token keyword">return</span> <span class="token boolean">true</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_2-6-1-基于协作的抢占式调度" tabindex="-1"><a class="header-anchor" href="#_2-6-1-基于协作的抢占式调度"><span>2.6.1 基于协作的抢占式调度</span></a></h3>
<p>在1.14版本之前，只有基于协作的抢占式调度，即preemptone函数中只有设置<code v-pre>gp.stackguard0 = stackPreempt</code>，而没有后面的<code v-pre>preemptM(mp)</code>过程。
由于goroutine初始栈桢很小（2kb），为了避免栈溢出，go语言编译期会在函数头部加上栈增长检测代码，如果在函数调用时编译器发现栈不够用了或者g.stackguard0 = stackPreempt，将会调用runtime.morestack来进行栈增长，而runtime.morestack是个汇编函数，又会调用runtime.newstack。
再morestack中首先要保存好当前协程的上下文，之后该协程继续从这个位置执行。保存完成之后调用newstack</p>
<div class="language-go line-numbers-mode" data-ext="go" data-title="go"><pre v-pre class="language-go"><code>TEXT runtime·<span class="token function">morestack</span><span class="token punctuation">(</span>SB<span class="token punctuation">)</span><span class="token punctuation">,</span>NOSPLIT<span class="token punctuation">,</span>$<span class="token number">0</span><span class="token operator">-</span><span class="token number">0</span>
    <span class="token operator">...</span>
    MOVQ    <span class="token function">0</span><span class="token punctuation">(</span>SP<span class="token punctuation">)</span><span class="token punctuation">,</span> AX <span class="token comment">// f's PC</span>
    MOVQ    AX<span class="token punctuation">,</span> <span class="token punctuation">(</span>g_sched<span class="token operator">+</span>gobuf_pc<span class="token punctuation">)</span><span class="token punctuation">(</span>SI<span class="token punctuation">)</span>
    MOVQ    SI<span class="token punctuation">,</span> <span class="token punctuation">(</span>g_sched<span class="token operator">+</span>gobuf_g<span class="token punctuation">)</span><span class="token punctuation">(</span>SI<span class="token punctuation">)</span>
    LEAQ    <span class="token function">8</span><span class="token punctuation">(</span>SP<span class="token punctuation">)</span><span class="token punctuation">,</span> AX <span class="token comment">// f's SP</span>
    MOVQ    AX<span class="token punctuation">,</span> <span class="token punctuation">(</span>g_sched<span class="token operator">+</span>gobuf_sp<span class="token punctuation">)</span><span class="token punctuation">(</span>SI<span class="token punctuation">)</span>
    MOVQ    BP<span class="token punctuation">,</span> <span class="token punctuation">(</span>g_sched<span class="token operator">+</span>gobuf_bp<span class="token punctuation">)</span><span class="token punctuation">(</span>SI<span class="token punctuation">)</span>
    MOVQ    DX<span class="token punctuation">,</span> <span class="token punctuation">(</span>g_sched<span class="token operator">+</span>gobuf_ctxt<span class="token punctuation">)</span><span class="token punctuation">(</span>SI<span class="token punctuation">)</span>
    <span class="token operator">...</span>
    CALL    runtime·<span class="token function">newstack</span><span class="token punctuation">(</span>SB<span class="token punctuation">)</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>newstack函数执行的栈扩张逻辑，在扩张之前，首先会检查是否是要协程抢占</p>
<div class="language-go line-numbers-mode" data-ext="go" data-title="go"><pre v-pre class="language-go"><code><span class="token keyword">func</span> <span class="token function">newstack</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    thisg <span class="token operator">:=</span> <span class="token function">getg</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
    <span class="token operator">...</span>


    gp <span class="token operator">:=</span> thisg<span class="token punctuation">.</span>m<span class="token punctuation">.</span>curg
    <span class="token operator">...</span>
    <span class="token comment">// 判断是否执行抢占</span>
    preempt <span class="token operator">:=</span> atomic<span class="token punctuation">.</span><span class="token function">Loaduintptr</span><span class="token punctuation">(</span><span class="token operator">&amp;</span>gp<span class="token punctuation">.</span>stackguard0<span class="token punctuation">)</span> <span class="token operator">==</span> stackPreempt


    <span class="token comment">// 保守的对用户态代码进行抢占，而非抢占运行时代码</span>
    <span class="token comment">// 如果正持有锁、分配内存或抢占被禁用，则不发生抢占</span>
    <span class="token keyword">if</span> preempt <span class="token punctuation">{</span>
        <span class="token keyword">if</span> <span class="token operator">!</span><span class="token function">canPreemptM</span><span class="token punctuation">(</span>thisg<span class="token punctuation">.</span>m<span class="token punctuation">)</span> <span class="token punctuation">{</span>
            <span class="token comment">// 不发生抢占，继续调度</span>
            gp<span class="token punctuation">.</span>stackguard0 <span class="token operator">=</span> gp<span class="token punctuation">.</span>stack<span class="token punctuation">.</span>lo <span class="token operator">+</span> _StackGuard
            <span class="token function">gogo</span><span class="token punctuation">(</span><span class="token operator">&amp;</span>gp<span class="token punctuation">.</span>sched<span class="token punctuation">)</span> <span class="token comment">// 重新进入调度循环</span>
        <span class="token punctuation">}</span>
    <span class="token punctuation">}</span>
    <span class="token operator">...</span>
    <span class="token comment">// 如果需要对栈进行调整</span>
    <span class="token keyword">if</span> preempt <span class="token punctuation">{</span>
        <span class="token operator">...</span>
        <span class="token keyword">if</span> gp<span class="token punctuation">.</span>preemptShrink <span class="token punctuation">{</span>
            <span class="token comment">// 我们正在一个同步安全点，因此等待栈收缩</span>
            gp<span class="token punctuation">.</span>preemptShrink <span class="token operator">=</span> <span class="token boolean">false</span>
            <span class="token function">shrinkstack</span><span class="token punctuation">(</span>gp<span class="token punctuation">)</span>
        <span class="token punctuation">}</span>
        <span class="token keyword">if</span> gp<span class="token punctuation">.</span>preemptStop <span class="token punctuation">{</span>
            <span class="token function">preemptPark</span><span class="token punctuation">(</span>gp<span class="token punctuation">)</span> <span class="token comment">// 封存当前状态，之后调用schedule，永不返回</span>
        <span class="token punctuation">}</span>
        <span class="token operator">...</span>
        <span class="token comment">// 表现得像是调用了 runtime.Gosched，主动让权</span>
        <span class="token function">gopreempt_m</span><span class="token punctuation">(</span>gp<span class="token punctuation">)</span> <span class="token comment">// 重新进入调度循环</span>
    <span class="token punctuation">}</span>
    <span class="token comment">// 执行栈扩张逻辑</span>
    <span class="token operator">...</span>
<span class="token punctuation">}</span>


<span class="token comment">// 抢占函数，最终调用goschedImpl</span>
<span class="token keyword">func</span> <span class="token function">gopreempt_m</span><span class="token punctuation">(</span>gp <span class="token operator">*</span>g<span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token function">goschedImpl</span><span class="token punctuation">(</span>gp<span class="token punctuation">)</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>当newstack判断是发生了抢占时，会调用到goschedImpl函数，可以看到，会先把当前的g放到全局队列，然后开始调度</p>
<div class="language-go line-numbers-mode" data-ext="go" data-title="go"><pre v-pre class="language-go"><code><span class="token keyword">func</span> <span class="token function">goschedImpl</span><span class="token punctuation">(</span>gp <span class="token operator">*</span>g<span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token function">casgstatus</span><span class="token punctuation">(</span>gp<span class="token punctuation">,</span> _Grunning<span class="token punctuation">,</span> _Grunnable<span class="token punctuation">)</span>
    <span class="token function">dropg</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
    <span class="token function">lock</span><span class="token punctuation">(</span><span class="token operator">&amp;</span>sched<span class="token punctuation">.</span>lock<span class="token punctuation">)</span>
    <span class="token comment">// 将被抢占的协程g，放到全局的sched.runq队列中，等被其他m执行</span>
    <span class="token function">globrunqput</span><span class="token punctuation">(</span>gp<span class="token punctuation">)</span>
    <span class="token function">unlock</span><span class="token punctuation">(</span><span class="token operator">&amp;</span>sched<span class="token punctuation">.</span>lock<span class="token punctuation">)</span>
    <span class="token comment">// 执行调度</span>
    <span class="token function">schedule</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_2-6-2-基于信号的抢占式调度" tabindex="-1"><a class="header-anchor" href="#_2-6-2-基于信号的抢占式调度"><span>2.6.2 基于信号的抢占式调度</span></a></h3>
<p>一个不参与任何函数调用的函数，直到执行完毕之前， 是不会被抢占的。如协程里面就一个for{}循环，将无法被抢占
1.14版本增加了基于信号的抢占式调度，<code v-pre>preemptM(mp)</code></p>
<div class="language-go line-numbers-mode" data-ext="go" data-title="go"><pre v-pre class="language-go"><code><span class="token comment">// src/runtime/signal_unix.go</span>
<span class="token keyword">func</span> <span class="token function">preemptM</span><span class="token punctuation">(</span>mp <span class="token operator">*</span>m<span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token keyword">if</span> GOOS <span class="token operator">==</span> <span class="token string">"darwin"</span> <span class="token operator">||</span> GOOS <span class="token operator">==</span> <span class="token string">"ios"</span> <span class="token punctuation">{</span>
        execLock<span class="token punctuation">.</span><span class="token function">rlock</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
    <span class="token punctuation">}</span>
    <span class="token keyword">if</span> atomic<span class="token punctuation">.</span><span class="token function">Cas</span><span class="token punctuation">(</span><span class="token operator">&amp;</span>mp<span class="token punctuation">.</span>signalPending<span class="token punctuation">,</span> <span class="token number">0</span><span class="token punctuation">,</span> <span class="token number">1</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
        <span class="token keyword">if</span> GOOS <span class="token operator">==</span> <span class="token string">"darwin"</span> <span class="token operator">||</span> GOOS <span class="token operator">==</span> <span class="token string">"ios"</span> <span class="token punctuation">{</span>
            atomic<span class="token punctuation">.</span><span class="token function">Xadd</span><span class="token punctuation">(</span><span class="token operator">&amp;</span>pendingPreemptSignals<span class="token punctuation">,</span> <span class="token number">1</span><span class="token punctuation">)</span>
        <span class="token punctuation">}</span>
        <span class="token comment">// const sigPreempt=0x17该信号表示抢占信号</span>
        <span class="token function">signalM</span><span class="token punctuation">(</span>mp<span class="token punctuation">,</span> sigPreempt<span class="token punctuation">)</span>
    <span class="token punctuation">}</span>
    <span class="token keyword">if</span> GOOS <span class="token operator">==</span> <span class="token string">"darwin"</span> <span class="token operator">||</span> GOOS <span class="token operator">==</span> <span class="token string">"ios"</span> <span class="token punctuation">{</span>
        execLock<span class="token punctuation">.</span><span class="token function">runlock</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
    <span class="token punctuation">}</span>
<span class="token punctuation">}</span>


<span class="token comment">// src/runtime/os_darwin.go</span>
<span class="token keyword">func</span> <span class="token function">signalM</span><span class="token punctuation">(</span>mp <span class="token operator">*</span>m<span class="token punctuation">,</span> sig <span class="token builtin">int</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token comment">// 在苹果系统中，执行pthread_kill来向m所在的进程发送sig信号</span>
    <span class="token function">pthread_kill</span><span class="token punctuation">(</span><span class="token function">pthread</span><span class="token punctuation">(</span>mp<span class="token punctuation">.</span>procid<span class="token punctuation">)</span><span class="token punctuation">,</span> <span class="token function">uint32</span><span class="token punctuation">(</span>sig<span class="token punctuation">)</span><span class="token punctuation">)</span>
<span class="token punctuation">}</span>


<span class="token comment">// src/runtime/os_linux.go</span>
<span class="token keyword">func</span> <span class="token function">signalM</span><span class="token punctuation">(</span>mp <span class="token operator">*</span>m<span class="token punctuation">,</span> sig <span class="token builtin">int</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token comment">// linux 执行汇编函数tgkill来发送信号</span>
    <span class="token function">tgkill</span><span class="token punctuation">(</span><span class="token function">getpid</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">,</span> <span class="token function">int</span><span class="token punctuation">(</span>mp<span class="token punctuation">.</span>procid<span class="token punctuation">)</span><span class="token punctuation">,</span> sig<span class="token punctuation">)</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>可见，基于信号的抢占式调度是通过监控线程sysmon发现有10ms以上未调度的P时，通过执行signalM对Go进程发送抢占信号（0x17）
Go进程收到该信号之后是如何执行抢占的呢，我们先来看信号是如何注册的</p>
<ol>
<li>在初始化时注册信号</li>
</ol>
<div class="language-go line-numbers-mode" data-ext="go" data-title="go"><pre v-pre class="language-go"><code><span class="token comment">// src/runtime/signal_unix.go</span>
<span class="token keyword">func</span> <span class="token function">initsig</span><span class="token punctuation">(</span>preinit <span class="token builtin">bool</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token comment">// 预初始化</span>
    <span class="token keyword">if</span> <span class="token operator">!</span>preinit <span class="token punctuation">{</span>
        signalsOK <span class="token operator">=</span> <span class="token boolean">true</span>
    <span class="token punctuation">}</span>
    <span class="token comment">//遍历信号数组 _NSIG=65</span>
    <span class="token keyword">for</span> i <span class="token operator">:=</span> <span class="token function">uint32</span><span class="token punctuation">(</span><span class="token number">0</span><span class="token punctuation">)</span><span class="token punctuation">;</span> i <span class="token operator">&lt;</span> _NSIG<span class="token punctuation">;</span> i<span class="token operator">++</span> <span class="token punctuation">{</span>
        t <span class="token operator">:=</span> <span class="token operator">&amp;</span>sigtable<span class="token punctuation">[</span>i<span class="token punctuation">]</span>
        <span class="token comment">//略过信号：SIGKILL、SIGSTOP、SIGTSTP、SIGCONT、SIGTTIN、SIGTTOU</span>
        <span class="token keyword">if</span> t<span class="token punctuation">.</span>flags <span class="token operator">==</span> <span class="token number">0</span> <span class="token operator">||</span> t<span class="token punctuation">.</span>flags<span class="token operator">&amp;</span>_SigDefault <span class="token operator">!=</span> <span class="token number">0</span> <span class="token punctuation">{</span>
            <span class="token keyword">continue</span>
        <span class="token punctuation">}</span>
        <span class="token operator">...</span>  
        <span class="token function">setsig</span><span class="token punctuation">(</span>i<span class="token punctuation">,</span> <span class="token function">funcPC</span><span class="token punctuation">(</span>sighandler<span class="token punctuation">)</span><span class="token punctuation">)</span>
    <span class="token punctuation">}</span>
<span class="token punctuation">}</span>


<span class="token comment">// src/runtime/os_unix.go</span>
<span class="token keyword">func</span> <span class="token function">setsig</span><span class="token punctuation">(</span>i <span class="token builtin">uint32</span><span class="token punctuation">,</span> fn <span class="token builtin">uintptr</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token keyword">var</span> sa sigactiont
    sa<span class="token punctuation">.</span>sa_flags <span class="token operator">=</span> _SA_SIGINFO <span class="token operator">|</span> _SA_ONSTACK <span class="token operator">|</span> _SA_RESTORER <span class="token operator">|</span> _SA_RESTART
    <span class="token function">sigfillset</span><span class="token punctuation">(</span><span class="token operator">&amp;</span>sa<span class="token punctuation">.</span>sa_mask<span class="token punctuation">)</span>
    <span class="token keyword">if</span> fn <span class="token operator">==</span> abi<span class="token punctuation">.</span><span class="token function">FuncPCABIInternal</span><span class="token punctuation">(</span>sighandler<span class="token punctuation">)</span> <span class="token punctuation">{</span> <span class="token comment">// abi.FuncPCABIInternal(sighandler) matches the callers in signal_unix.go</span>
        <span class="token keyword">if</span> iscgo <span class="token punctuation">{</span>
            <span class="token comment">// cgoSigtramp函数中还是会调用sighandler函数，多包了一层</span>
            fn <span class="token operator">=</span> abi<span class="token punctuation">.</span><span class="token function">FuncPCABI0</span><span class="token punctuation">(</span>cgoSigtramp<span class="token punctuation">)</span>
        <span class="token punctuation">}</span> <span class="token keyword">else</span> <span class="token punctuation">{</span>
            fn <span class="token operator">=</span> abi<span class="token punctuation">.</span><span class="token function">FuncPCABI0</span><span class="token punctuation">(</span>sigtramp<span class="token punctuation">)</span>
        <span class="token punctuation">}</span>
    <span class="token punctuation">}</span>
    sa<span class="token punctuation">.</span>sa_handler <span class="token operator">=</span> fn
    <span class="token function">sigaction</span><span class="token punctuation">(</span>i<span class="token punctuation">,</span> <span class="token operator">&amp;</span>sa<span class="token punctuation">,</span> <span class="token boolean">nil</span><span class="token punctuation">)</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>在initsig中先遍历信号数组调用setsig进行注册，setsig中会执行系统调用来安装信号和信号处理函数。我们继续看信号处理函数</p>
<div class="language-go line-numbers-mode" data-ext="go" data-title="go"><pre v-pre class="language-go"><code><span class="token comment">// src/runtime/signal_unix.go</span>


<span class="token keyword">func</span> <span class="token function">sighandler</span><span class="token punctuation">(</span>sig <span class="token builtin">uint32</span><span class="token punctuation">,</span> info <span class="token operator">*</span>siginfo<span class="token punctuation">,</span> ctxt unsafe<span class="token punctuation">.</span>Pointer<span class="token punctuation">,</span> gp <span class="token operator">*</span>g<span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token comment">// The g executing the signal handler. This is almost always</span>
    <span class="token comment">// mp.gsignal. See delayedSignal for an exception.</span>
    gsignal <span class="token operator">:=</span> <span class="token function">getg</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
    mp <span class="token operator">:=</span> gsignal<span class="token punctuation">.</span>m
    c <span class="token operator">:=</span> <span class="token operator">&amp;</span>sigctxt<span class="token punctuation">{</span>info<span class="token punctuation">,</span> ctxt<span class="token punctuation">}</span>
    <span class="token comment">// const sigPreempt = _SIGURG = 0x17</span>
    <span class="token keyword">if</span> sig <span class="token operator">==</span> sigPreempt <span class="token punctuation">{</span>
        <span class="token comment">// 是一个抢占信号</span>
        <span class="token function">doSigPreempt</span><span class="token punctuation">(</span>gp<span class="token punctuation">,</span> c<span class="token punctuation">)</span>
    <span class="token punctuation">}</span>
    <span class="token operator">...</span>
<span class="token punctuation">}</span>


<span class="token comment">// doSigPreempt handles a preemption signal on gp.</span>
<span class="token keyword">func</span> <span class="token function">doSigPreempt</span><span class="token punctuation">(</span>gp <span class="token operator">*</span>g<span class="token punctuation">,</span> ctxt <span class="token operator">*</span>sigctxt<span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token keyword">if</span> <span class="token function">wantAsyncPreempt</span><span class="token punctuation">(</span>gp<span class="token punctuation">)</span> <span class="token punctuation">{</span>
        <span class="token keyword">if</span> ok<span class="token punctuation">,</span> newpc <span class="token operator">:=</span> <span class="token function">isAsyncSafePoint</span><span class="token punctuation">(</span>gp<span class="token punctuation">,</span> ctxt<span class="token punctuation">.</span><span class="token function">sigpc</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">,</span> ctxt<span class="token punctuation">.</span><span class="token function">sigsp</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">,</span> ctxt<span class="token punctuation">.</span><span class="token function">siglr</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span> ok <span class="token punctuation">{</span>
            <span class="token comment">// Adjust the PC and inject a call to asyncPreempt.</span>
            ctxt<span class="token punctuation">.</span><span class="token function">pushCall</span><span class="token punctuation">(</span>abi<span class="token punctuation">.</span><span class="token function">FuncPCABI0</span><span class="token punctuation">(</span>asyncPreempt<span class="token punctuation">)</span><span class="token punctuation">,</span> newpc<span class="token punctuation">)</span>
        <span class="token punctuation">}</span>
    <span class="token punctuation">}</span>
    <span class="token comment">// Acknowledge the preemption.</span>
    gp<span class="token punctuation">.</span>m<span class="token punctuation">.</span>preemptGen<span class="token punctuation">.</span><span class="token function">Add</span><span class="token punctuation">(</span><span class="token number">1</span><span class="token punctuation">)</span>
    gp<span class="token punctuation">.</span>m<span class="token punctuation">.</span>signalPending<span class="token punctuation">.</span><span class="token function">Store</span><span class="token punctuation">(</span><span class="token number">0</span><span class="token punctuation">)</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>在信号处理函数sighandler中，对于抢占信号，会执行doSigPreempt函数，其中会通过pushcall插入syncPreempt函数调用</p>
<div class="language-go line-numbers-mode" data-ext="go" data-title="go"><pre v-pre class="language-go"><code><span class="token comment">// src/runtime/preempt_arm.s</span>
TEXT ·<span class="token function">asyncPreempt</span><span class="token punctuation">(</span>SB<span class="token punctuation">)</span><span class="token punctuation">,</span>NOSPLIT<span class="token operator">|</span>NOFRAME<span class="token punctuation">,</span>$<span class="token number">0</span><span class="token operator">-</span><span class="token number">0</span>
    <span class="token operator">...</span>
    CALL ·<span class="token function">asyncPreempt2</span><span class="token punctuation">(</span>SB<span class="token punctuation">)</span>
    <span class="token operator">...</span>


</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>syncPreempt最终调用了asyncPreempt2()函数</p>
<div class="language-go line-numbers-mode" data-ext="go" data-title="go"><pre v-pre class="language-go"><code><span class="token comment">// src/runtime/preempt.go</span>
<span class="token keyword">func</span> <span class="token function">asyncPreempt2</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    gp <span class="token operator">:=</span> <span class="token function">getg</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
    gp<span class="token punctuation">.</span>asyncSafePoint <span class="token operator">=</span> <span class="token boolean">true</span>
    <span class="token keyword">if</span> gp<span class="token punctuation">.</span>preemptStop <span class="token punctuation">{</span>
        <span class="token function">mcall</span><span class="token punctuation">(</span>preemptPark<span class="token punctuation">)</span>
    <span class="token punctuation">}</span> <span class="token keyword">else</span> <span class="token punctuation">{</span>
        <span class="token function">mcall</span><span class="token punctuation">(</span>gopreempt_m<span class="token punctuation">)</span>
    <span class="token punctuation">}</span>
    gp<span class="token punctuation">.</span>asyncSafePoint <span class="token operator">=</span> <span class="token boolean">false</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>可见，兜兜转转，最终跟基于协作的信号抢占一样，执行preemptPark或gopreempt_m函数来执行schedule</p>
<p>信号抢占的整体逻辑如下：</p>
<ol>
<li>M 注册一个 SIGURG 信号的处理函数：sighandler。</li>
<li>sysmon 线程检测到执行时间过长的 goroutine、GC stw 时，会向相应的 M（或者说线程，每个线程对应一个 M）发送 SIGURG 信号。</li>
<li>收到信号后，内核执行 sighandler 函数，通过 pushCall 插入 asyncPreempt 函数调用。</li>
<li>回到当前 goroutine 执行 asyncPreempt 函数，通过 mcall 切到 g0 栈执行 gopreempt_m。</li>
<li>将当前 goroutine 插入到全局可运行队列，M 则继续寻找其他 goroutine 来运行。</li>
<li>被抢占的 goroutine 再次调度过来执行时，会继续原来的执行流。</li>
</ol>
</div></template>



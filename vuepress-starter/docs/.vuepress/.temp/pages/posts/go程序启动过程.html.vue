<template><div><nav class="table-of-contents"><ul><li><router-link to="#_1-1-第一个go程序">1.1 第一个go程序</router-link></li><li><router-link to="#_1-2-生产力工具lensm">1.2 生产力工具lensm</router-link></li><li><router-link to="#_1-3-启动流程">1.3 启动流程</router-link></li></ul></nav>
<h1 id="一、go启动流程" tabindex="-1"><a class="header-anchor" href="#一、go启动流程"><span>一、go启动流程</span></a></h1>
<h2 id="_1-1-第一个go程序" tabindex="-1"><a class="header-anchor" href="#_1-1-第一个go程序"><span>1.1 第一个go程序</span></a></h2>
<ol>
<li>首先，我们来看一个简单的go程序启动流程</li>
</ol>
<div class="language-go line-numbers-mode" data-ext="go" data-title="go"><pre v-pre class="language-go"><code><span class="token comment">// main.go</span>
<span class="token keyword">import</span> <span class="token string">"fmt"</span>


<span class="token keyword">func</span> <span class="token function">main</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    str <span class="token operator">:=</span> <span class="token function">make</span><span class="token punctuation">(</span><span class="token punctuation">[</span><span class="token punctuation">]</span><span class="token builtin">string</span><span class="token punctuation">,</span> <span class="token number">0</span><span class="token punctuation">)</span>
    str <span class="token operator">=</span> <span class="token function">append</span><span class="token punctuation">(</span>str<span class="token punctuation">,</span> <span class="token string">"zhiminding"</span><span class="token punctuation">)</span>
    fmt<span class="token punctuation">.</span><span class="token function">Printf</span><span class="token punctuation">(</span><span class="token string">"hello,%v"</span><span class="token punctuation">,</span> str<span class="token punctuation">)</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><ol start="2">
<li>对上面的go程序进行编译，生成main</li>
</ol>
<div class="language-bash line-numbers-mode" data-ext="sh" data-title="sh"><pre v-pre class="language-bash"><code>go build <span class="token parameter variable">-gcflags</span><span class="token operator">=</span><span class="token string">"-l -N"</span> <span class="token comment"># -l 禁止内联, -N 禁止优化</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div></div></div><ol start="3">
<li>查看编译出来的二进制和汇编代码</li>
</ol>
<div class="language-bash line-numbers-mode" data-ext="sh" data-title="sh"><pre v-pre class="language-bash"><code>go tool objdump <span class="token parameter variable">-s</span> <span class="token string">"main.main"</span> <span class="token parameter variable">-S</span> ./main <span class="token comment"># 用户实现的main函数，在源码中是main.main</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div></div></div><p>该方法在控制台输出汇编代码，阅读和调试起来不方便，我们可以用lensm工具查看汇编代码</p>
<h2 id="_1-2-生产力工具lensm" tabindex="-1"><a class="header-anchor" href="#_1-2-生产力工具lensm"><span>1.2 生产力工具lensm</span></a></h2>
<p>为了方便看汇编和源代码，在go源码之间方便跳转，我们可以安装一个可交互的源码分析器：lensm，通过lensm可以方便地将编译出来的golang可执行文件映射到源码中，并点击某个函数就可以跳转到对应实现上面</p>
<ol>
<li>git地址：
    https://github.com/loov/lensm</li>
<li>如下进行安装：
    <code v-pre>sh     go install loov.dev/lensm@main     </code></li>
<li>利用该工具分析上面生成的二进制文件的源码
    <code v-pre>sh     lensm -watch main     # lensm -watch -filter main main  # -filter用来直接过滤到main函数，也可以在页面内选择     </code></li>
<li>该二进制文件用lensm打开如下：</li>
</ol>
<!--     ![img](img/lensm_hello1.png) -->
<h2 id="_1-3-启动流程" tabindex="-1"><a class="header-anchor" href="#_1-3-启动流程"><span>1.3 启动流程</span></a></h2>
<p>在lensm的左上角的搜索栏可以搜索到，go进程的入口函数（在mac M1平台）是_rt0_arm64_darwin(SB)，对应代码段如下：</p>
<div class="language-go line-numbers-mode" data-ext="go" data-title="go"><pre v-pre class="language-go"><code><span class="token comment">// src/runtime/rt0_darwin_arm64.s</span>


TEXT <span class="token function">_rt0_arm64_darwin</span><span class="token punctuation">(</span>SB<span class="token punctuation">)</span><span class="token punctuation">,</span>NOSPLIT<span class="token operator">|</span>NOFRAME<span class="token punctuation">,</span>$<span class="token number">0</span>
    MOVD    $runtime·<span class="token function">rt0_go</span><span class="token punctuation">(</span>SB<span class="token punctuation">)</span><span class="token punctuation">,</span> R2
    BL  <span class="token punctuation">(</span>R2<span class="token punctuation">)</span>
exit<span class="token punctuation">:</span>
    MOVD    $<span class="token number">0</span><span class="token punctuation">,</span> R0
    MOVD    $<span class="token number">1</span><span class="token punctuation">,</span> R16 <span class="token comment">// sys_exit</span>
    SVC $<span class="token number">0x80</span>
    B   exit
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>其实，无论是哪个平台启动go程序，最终都会跳转到runtime.rt0_go(SB)，只是在不同平台该函数实现不同，lensm中搜索该函数，跳转到具体平台的具体实现文件之中</p>
<div class="language-go line-numbers-mode" data-ext="go" data-title="go"><pre v-pre class="language-go"><code><span class="token comment">// src/runtime/asm_arm64.s</span>


TEXT runtime·<span class="token function">rt0_go</span><span class="token punctuation">(</span>SB<span class="token punctuation">)</span><span class="token punctuation">,</span>NOSPLIT<span class="token operator">|</span>TOPFRAME<span class="token punctuation">,</span>$<span class="token number">0</span>
    <span class="token comment">// SP = stack; R0 = argc; R1 = argv</span>
    SUB $<span class="token number">32</span><span class="token punctuation">,</span> RSP
    MOVW    R0<span class="token punctuation">,</span> <span class="token function">8</span><span class="token punctuation">(</span>RSP<span class="token punctuation">)</span> <span class="token comment">// argc</span>
    MOVD    R1<span class="token punctuation">,</span> <span class="token function">16</span><span class="token punctuation">(</span>RSP<span class="token punctuation">)</span> <span class="token comment">// argv</span>
    <span class="token operator">...</span>
    BL  runtime·<span class="token function">args</span><span class="token punctuation">(</span>SB<span class="token punctuation">)</span>        <span class="token comment">// 参数初始化</span>
    BL  runtime·<span class="token function">osinit</span><span class="token punctuation">(</span>SB<span class="token punctuation">)</span>      <span class="token comment">// 操作系统初始化</span>
    BL  runtime·<span class="token function">schedinit</span><span class="token punctuation">(</span>SB<span class="token punctuation">)</span>   <span class="token comment">// 调度器初始化</span>


    <span class="token comment">// create a new goroutine to start program 创建一个协程来启动程序</span>
    MOVD    $runtime·<span class="token function">mainPC</span><span class="token punctuation">(</span>SB<span class="token punctuation">)</span><span class="token punctuation">,</span> R0     <span class="token comment">// 指向runtime.main函数，main入口函数</span>
    SUB $<span class="token number">16</span><span class="token punctuation">,</span> RSP
    MOVD    R0<span class="token punctuation">,</span> <span class="token function">8</span><span class="token punctuation">(</span>RSP<span class="token punctuation">)</span> <span class="token comment">// arg R0即是上一步的runtime.mainPC函数地址</span>
    MOVD    $<span class="token number">0</span><span class="token punctuation">,</span> <span class="token function">0</span><span class="token punctuation">(</span>RSP<span class="token punctuation">)</span> <span class="token comment">// dummy LR 这个变量位0，因为runtime.mainPC函数无参数</span>
    BL  runtime·<span class="token function">newproc</span><span class="token punctuation">(</span>SB<span class="token punctuation">)</span>     <span class="token comment">// 创建出一个协程，协程运行的函数就是上面mianPC指向的rutime.main() newProc接收这个参数</span>
    ADD $<span class="token number">16</span><span class="token punctuation">,</span> RSP


    <span class="token comment">// start this M 开启调度器进行协程调度，跳转到runtime.mstart0</span>
    BL  runtime·<span class="token function">mstart</span><span class="token punctuation">(</span>SB<span class="token punctuation">)</span>


<span class="token comment">// mainPC指向runtime.main</span>
DATA    runtime·mainPC<span class="token operator">+</span><span class="token function">0</span><span class="token punctuation">(</span>SB<span class="token punctuation">)</span><span class="token operator">/</span><span class="token number">8</span><span class="token punctuation">,</span>$runtime·main<span class="token operator">&lt;</span>ABIInternal<span class="token operator">></span><span class="token punctuation">(</span>SB<span class="token punctuation">)</span>
GLOBL   runtime·<span class="token function">mainPC</span><span class="token punctuation">(</span>SB<span class="token punctuation">)</span><span class="token punctuation">,</span>RODATA<span class="token punctuation">,</span>$<span class="token number">8</span>
<span class="token comment">// runtime.mstart 最终跳转到runtime.mstart0</span>
TEXT runtime·<span class="token function">mstart</span><span class="token punctuation">(</span>SB<span class="token punctuation">)</span><span class="token punctuation">,</span>NOSPLIT<span class="token operator">|</span>TOPFRAME<span class="token punctuation">,</span>$<span class="token number">0</span>
    BL  runtime·<span class="token function">mstart0</span><span class="token punctuation">(</span>SB<span class="token punctuation">)</span>
    RET <span class="token comment">// not reached。 mstart0中循环调度协程，永远不会返回</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>从rt0_go函数可知，初始化协程调度器之后，我们首先构造首个协程（即执行main函数的协程）所需的参数，将runtime.mainPC函数作为参数，调用创建协程的函数runtime.newproc(fn *funcval)来创建首个协程，该协程的运行函数为runtime.mainPC，即runtime.main函数，我们跳转到runtime.main函数中继续分析</p>
<div class="language-go line-numbers-mode" data-ext="go" data-title="go"><pre v-pre class="language-go"><code><span class="token comment">// src/rumtime/proc.go</span>


<span class="token comment">// The main goroutine.</span>
<span class="token keyword">func</span> <span class="token function">main</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    g <span class="token operator">:=</span> <span class="token function">getg</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
    <span class="token operator">...</span>
    <span class="token comment">// 32/64位机器设置不同大小的最大栈空间</span>
    <span class="token keyword">if</span> goarch<span class="token punctuation">.</span>PtrSize <span class="token operator">==</span> <span class="token number">8</span> <span class="token punctuation">{</span>
        maxstacksize <span class="token operator">=</span> <span class="token number">1000000000</span>
    <span class="token punctuation">}</span> <span class="token keyword">else</span> <span class="token punctuation">{</span>
        maxstacksize <span class="token operator">=</span> <span class="token number">250000000</span>
    <span class="token punctuation">}</span>
    <span class="token operator">...</span>
    <span class="token function">lockOSThread</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token comment">// 初始化时要锁死线程</span>
    <span class="token function">doInit</span><span class="token punctuation">(</span><span class="token operator">&amp;</span>runtime_inittask<span class="token punctuation">)</span> <span class="token comment">// Must be before defer.</span>
    <span class="token function">gcenable</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token comment">// 启动gc</span>
    <span class="token function">doInit</span><span class="token punctuation">(</span><span class="token operator">&amp;</span>main_inittask<span class="token punctuation">)</span>
    <span class="token operator">...</span><span class="token operator">...</span>
    fn <span class="token operator">:=</span> main_main <span class="token comment">// main_main指向main.main，即用户实现的main函数</span>
    <span class="token function">fn</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token comment">// 执行用户的main函数</span>
    <span class="token operator">...</span>
    <span class="token function">exit</span><span class="token punctuation">(</span><span class="token number">0</span><span class="token punctuation">)</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>可以看到，在runtime.main函数中执行了用户实现的main.main函数，至此，整个go进程启动逻辑就很清晰了，整个启动过程核心步骤如下图所示</p>
<!-- ![go启动过程](/img/start2.png) --></div></template>



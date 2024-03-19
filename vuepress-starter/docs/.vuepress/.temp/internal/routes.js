export const redirects = JSON.parse("{}")

export const routes = Object.fromEntries([
  ["/", { loader: () => import(/* webpackChunkName: "index.html" */"/Users/jimmy/workspace/gogo/vuepress/docs/.vuepress/.temp/pages/index.html.js"), meta: {"title":"首页"} }],
  ["/get-started.html", { loader: () => import(/* webpackChunkName: "get-started.html" */"/Users/jimmy/workspace/gogo/vuepress/docs/.vuepress/.temp/pages/get-started.html.js"), meta: {"title":"Get Started"} }],
  ["/posts/GMP%E5%8E%9F%E7%90%86.html", { loader: () => import(/* webpackChunkName: "GMP原理.html" */"/Users/jimmy/workspace/gogo/vuepress/docs/.vuepress/.temp/pages/posts/GMP原理.html.js"), meta: {"_blog":{"title":"","author":"","date":"2023-03-05T00:00:00.000Z","category":["Go","CategoryB"],"tag":["Go"],"excerpt":"<h2>2.4 GMP源码剖析</h2>\n<h3>2.4.1 协程G结构体</h3>\n<div class=\"language-go\" data-ext=\"go\" data-title=\"go\"><pre class=\"language-go\"><code><span class=\"token comment\">// src/runtime/runtime2.go</span>\n\n\n<span class=\"token keyword\">type</span> g <span class=\"token keyword\">struct</span> <span class=\"token punctuation\">{</span>\n    stack       stack   <span class=\"token comment\">// 保存当前协程栈的上界和下界</span>\n    <span class=\"token comment\">// stackguard0 是对比 Go 栈增长的 prologue 的栈指针</span>\n    <span class=\"token comment\">// 如果 sp 寄存器比 stackguard0 小（由于栈往低地址方向增长），会触发栈拷贝和调度</span>\n    <span class=\"token comment\">// 通常情况下：stackguard0 = stack.lo + StackGuard，但被抢占时会变为 StackPreempt</span>\n    stackguard0 <span class=\"token builtin\">uintptr</span> <span class=\"token comment\">// offset known to liblink</span>\n    <span class=\"token comment\">// stackguard1 是对比 C 栈增长的 prologue 的栈指针</span>\n    <span class=\"token comment\">// 当位于 g0 和 gsignal 栈上时，值为 stack.lo + StackGuard</span>\n    <span class=\"token comment\">// 在其他栈上值为 ~0 用于触发 morestackc (并 crash) 调用</span>\n    stackguard1 <span class=\"token builtin\">uintptr</span> <span class=\"token comment\">// offset known to liblink</span>\n    _panic    <span class=\"token operator\">*</span>_panic   <span class=\"token comment\">// 这个协程里面的panic列表</span>\n    _defer    <span class=\"token operator\">*</span>_defer   <span class=\"token comment\">// 这个协程里面的defer列表</span>\n    m           <span class=\"token operator\">*</span>m      <span class=\"token comment\">// 当前g占用的线程m</span>\n    sched       gobuf   <span class=\"token comment\">// 协程调度的上下文数据 保存PC，SP等寄存器，协程切换的参数，描述了执行现场</span>\n    atomicstatus atomic<span class=\"token punctuation\">.</span>Uint32 <span class=\"token comment\">// G 的状态</span>\n    syscallsp   <span class=\"token builtin\">uintptr</span> <span class=\"token comment\">// if status==Gsyscall, syscallsp = sched.sp to use during gc</span>\n    syscallpc   <span class=\"token builtin\">uintptr</span> <span class=\"token comment\">// if status==Gsyscall, syscallpc = sched.pc to use during gc</span>\n    stktopsp    <span class=\"token builtin\">uintptr</span> <span class=\"token comment\">// expected sp at top of stack, to check in traceback</span>\n    goid        <span class=\"token builtin\">uint64</span>  <span class=\"token comment\">// 协程唯一id？</span>\n    preempt     <span class=\"token builtin\">bool</span>    <span class=\"token comment\">// 是否可以抢占 preemption signal, duplicates stackguard0 = stackpreempt</span>\n    preemptStop   <span class=\"token builtin\">bool</span> <span class=\"token comment\">// transition to _Gpreempted on preemption; otherwise, just deschedule</span>\n    preemptShrink <span class=\"token builtin\">bool</span> <span class=\"token comment\">// shrink stack at synchronous safe point</span>\n    <span class=\"token operator\">...</span>\n</code></pre></div>"},"title":""} }],
  ["/posts/Go%E6%8A%A2%E5%8D%A0%E5%BC%8F%E8%B0%83%E5%BA%A6.html", { loader: () => import(/* webpackChunkName: "Go抢占式调度.html" */"/Users/jimmy/workspace/gogo/vuepress/docs/.vuepress/.temp/pages/posts/Go抢占式调度.html.js"), meta: {"_blog":{"title":"","author":"","date":"2022-03-05T00:00:00.000Z","category":["Go"],"tag":["Go"],"excerpt":"<h2>2.6 抢占式调度</h2>\n<h3>2.6.0 sysmon监听抢占时机</h3>\n<p>sysmon是一个Go里面的一个特殊的线程，不与任何P绑定，不参与调度，主要用于监控整个Go进程，主要有如下作用：</p>\n<ol>\n<li>释放闲置超过5分钟的span物理内存</li>\n<li>超过2分钟没有垃圾回收，强制启动垃圾回收</li>\n<li>将长时间没有处理的netpoll结果添加到任务队列</li>\n<li>向长时间执行的G任务发起抢占调度</li>\n<li>收回因syscall而长时间阻塞的P</li>\n</ol>\n<p>sysmon线程在runtime.main函数里面创建：</p>"},"title":""} }],
  ["/posts/Tendis%E5%AE%9E%E7%8E%B0.html", { loader: () => import(/* webpackChunkName: "Tendis实现.html" */"/Users/jimmy/workspace/gogo/vuepress/docs/.vuepress/.temp/pages/posts/Tendis实现.html.js"), meta: {"_blog":{"title":"Tendis冷热混合存储方案","author":"","date":"2023-03-14T00:00:00.000Z","category":["存储"],"tag":["缓存"],"excerpt":"<p>tendis实现原理.</p>"},"title":"Tendis冷热混合存储方案"} }],
  ["/posts/golang%E5%9E%83%E5%9C%BE%E5%9B%9E%E6%94%B6.html", { loader: () => import(/* webpackChunkName: "golang垃圾回收.html" */"/Users/jimmy/workspace/gogo/vuepress/docs/.vuepress/.temp/pages/posts/golang垃圾回收.html.js"), meta: {"_blog":{"title":"golang三关","author":"","date":"2023-03-05T00:00:00.000Z","category":["Go"],"tag":["Go"],"excerpt":"\n<p>https://learnku.com/blog/Aceld/tags/three-passes-of-golang_67253</p>\n<p>垃圾回收：</p>\n<p>https://learnku.com/articles/68141</p>\n"},"title":"golang三关"} }],
  ["/posts/go%E5%8D%8F%E7%A8%8B%E8%B0%83%E5%BA%A6.html", { loader: () => import(/* webpackChunkName: "go协程调度.html" */"/Users/jimmy/workspace/gogo/vuepress/docs/.vuepress/.temp/pages/posts/go协程调度.html.js"), meta: {"_blog":{"title":"二、协程调度","author":"","date":"2023-03-05T00:00:00.000Z","category":["Go"],"tag":["Go"],"excerpt":"\n<h2>2.1 线程和协程</h2>\n<h3>2.1.1 线程调度开销</h3>\n<p>在操作系统中，线程是cpu调度的基本单位，然而，线程是由操作系统负责调度。线程切换时：</p>\n<ol>\n<li>线程需要从用户态陷入内核态，栈指针指向内核态栈地址，同时保存上下文，如各种用户空间寄存器的数据（通用寄存器，段寄存器，标识寄存器等等）</li>\n<li>操作系统调度算法找到需要调度的线程之后，又要从内核态切换回用户态，恢复上下文，栈指针指向新线程的用户态栈地址。</li>\n<li>整个切换过程中，为了安全，需要引入更强的内核检查。</li>\n</ol>\n<p>这些操作导致线程切换存在不小的开销</p>"},"title":"二、协程调度"} }],
  ["/posts/go%E7%A8%8B%E5%BA%8F%E5%90%AF%E5%8A%A8%E8%BF%87%E7%A8%8B.html", { loader: () => import(/* webpackChunkName: "go程序启动过程.html" */"/Users/jimmy/workspace/gogo/vuepress/docs/.vuepress/.temp/pages/posts/go程序启动过程.html.js"), meta: {"_blog":{"title":"一、go启动流程","author":"","date":"2023-03-05T00:00:00.000Z","category":["Go"],"tag":["Go"],"excerpt":"\n<h1>一、go启动流程</h1>\n<h2>1.1 第一个go程序</h2>\n<ol>\n<li>首先，我们来看一个简单的go程序启动流程</li>\n</ol>\n<div class=\"language-go\" data-ext=\"go\" data-title=\"go\"><pre class=\"language-go\"><code><span class=\"token comment\">// main.go</span>\n<span class=\"token keyword\">import</span> <span class=\"token string\">\"fmt\"</span>\n\n\n<span class=\"token keyword\">func</span> <span class=\"token function\">main</span><span class=\"token punctuation\">(</span><span class=\"token punctuation\">)</span> <span class=\"token punctuation\">{</span>\n    str <span class=\"token operator\">:=</span> <span class=\"token function\">make</span><span class=\"token punctuation\">(</span><span class=\"token punctuation\">[</span><span class=\"token punctuation\">]</span><span class=\"token builtin\">string</span><span class=\"token punctuation\">,</span> <span class=\"token number\">0</span><span class=\"token punctuation\">)</span>\n    str <span class=\"token operator\">=</span> <span class=\"token function\">append</span><span class=\"token punctuation\">(</span>str<span class=\"token punctuation\">,</span> <span class=\"token string\">\"zhiminding\"</span><span class=\"token punctuation\">)</span>\n    fmt<span class=\"token punctuation\">.</span><span class=\"token function\">Printf</span><span class=\"token punctuation\">(</span><span class=\"token string\">\"hello,%v\"</span><span class=\"token punctuation\">,</span> str<span class=\"token punctuation\">)</span>\n<span class=\"token punctuation\">}</span>\n</code></pre></div>"},"title":"一、go启动流程"} }],
  ["/posts/vue%20nginx%E8%BF%90%E8%A1%8C.html", { loader: () => import(/* webpackChunkName: "vue nginx运行.html" */"/Users/jimmy/workspace/gogo/vuepress/docs/.vuepress/.temp/pages/posts/vue nginx运行.html.js"), meta: {"_blog":{"title":"","author":"","date":"2023-01-06T00:00:00.000Z","category":["vue"],"tag":["vue"],"excerpt":"<p>注：这里开始认为各位都会使用nginx</p>\n<p>打包vue项目</p>\n<div class=\"language-bash\" data-ext=\"sh\" data-title=\"sh\"><pre class=\"language-bash\"><code><span class=\"token function\">npm</span> run build\n</code></pre></div><p>测试打包的项目是否可以运行</p>\n<div class=\"language-bash\" data-ext=\"sh\" data-title=\"sh\"><pre class=\"language-bash\"><code>serve dist\n</code></pre></div>"},"title":""} }],
  ["/posts/%E5%AF%B9%E8%B1%A1%E5%AD%98%E5%82%A8%E4%BD%BF%E7%94%A8.html", { loader: () => import(/* webpackChunkName: "对象存储使用.html" */"/Users/jimmy/workspace/gogo/vuepress/docs/.vuepress/.temp/pages/posts/对象存储使用.html.js"), meta: {"_blog":{"title":"","author":"","date":"2023-01-06T00:00:00.000Z","category":["存储"],"tag":["cos"],"excerpt":"<p>上传流程</p>\n<p>文件上传分为客户端上传（主要是指网页端和移动端等面向终端用户的场景）和服务端上传两种场景，具体可以参考文档业务流程。</p>\n<p>服务端SDK在上传方面主要提供两种功能，一种是生成客户端上传所需要的上传凭证，另外一种是直接上传文件到云端。</p>\n<p>客户端上传凭证</p>\n<p>客户端（移动端或者Web端）上传文件的时候，需要从客户自己的业务服务器获取上传凭证，而这些上传凭证是通过服务端的SDK来生成的，然后通过客户自己的业务API分发给客户端使用。根据上传的业务需求不同，七牛云 Go SDK支持丰富的上传凭证生成方式。</p>\n<p>拷贝\n// 存储相关功能的引入包只有这两个，后面不再赘述\nimport (\n\"github.com/qiniu/go-sdk/v7/auth/qbox\"\n\"github.com/qiniu/go-sdk/v7/storage\"\n)</p>"},"title":""} }],
  ["/posts/%E7%BC%93%E5%AD%98%E4%B8%80%E8%87%B4%E6%80%A7.html", { loader: () => import(/* webpackChunkName: "缓存一致性.html" */"/Users/jimmy/workspace/gogo/vuepress/docs/.vuepress/.temp/pages/posts/缓存一致性.html.js"), meta: {"_blog":{"title":"缓存一致性","author":"","date":"2024-03-19T00:00:00.000Z","category":["存储"],"tag":["缓存"],"excerpt":"\n<h1>缓存一致性</h1>\n<h2>一、缓存常见问题</h2>\n<ol>\n<li>缓存与数据库数据一致性</li>\n<li>缓存雪崩</li>\n<li>缓存击穿</li>\n<li>缓存穿透</li>\n</ol>\n<h2>二、缓存一致性问题</h2>\n<p>缓存一致性问题的产生主要是因为请求需要事务地处理缓存和数据库。但实际操作中，难以保证事务性。</p>\n<ol>\n<li>操作隔离性：并发请求时，无法保证多个请求在处理缓存和处理数据库两个步骤上的时序。</li>\n<li>操作原子性：即使单个请求，也无法保证处理缓存和处理数据库的原子性，可能存在某个操作失败的情况</li>\n</ol>\n<h3>2.1 缓存更新策略</h3>"},"title":"缓存一致性"} }],
  ["/404.html", { loader: () => import(/* webpackChunkName: "404.html" */"/Users/jimmy/workspace/gogo/vuepress/docs/.vuepress/.temp/pages/404.html.js"), meta: {"title":""} }],
  ["/category/", { loader: () => import(/* webpackChunkName: "index.html" */"/Users/jimmy/workspace/gogo/vuepress/docs/.vuepress/.temp/pages/category/index.html.js"), meta: {"title":"Categories"} }],
  ["/category/go/", { loader: () => import(/* webpackChunkName: "index.html" */"/Users/jimmy/workspace/gogo/vuepress/docs/.vuepress/.temp/pages/category/go/index.html.js"), meta: {"title":"Category Go"} }],
  ["/category/categoryb/", { loader: () => import(/* webpackChunkName: "index.html" */"/Users/jimmy/workspace/gogo/vuepress/docs/.vuepress/.temp/pages/category/categoryb/index.html.js"), meta: {"title":"Category CategoryB"} }],
  ["/category/%E5%AD%98%E5%82%A8/", { loader: () => import(/* webpackChunkName: "index.html" */"/Users/jimmy/workspace/gogo/vuepress/docs/.vuepress/.temp/pages/category/存储/index.html.js"), meta: {"title":"Category 存储"} }],
  ["/category/vue/", { loader: () => import(/* webpackChunkName: "index.html" */"/Users/jimmy/workspace/gogo/vuepress/docs/.vuepress/.temp/pages/category/vue/index.html.js"), meta: {"title":"Category vue"} }],
  ["/tag/", { loader: () => import(/* webpackChunkName: "index.html" */"/Users/jimmy/workspace/gogo/vuepress/docs/.vuepress/.temp/pages/tag/index.html.js"), meta: {"title":"Tags"} }],
  ["/tag/go/", { loader: () => import(/* webpackChunkName: "index.html" */"/Users/jimmy/workspace/gogo/vuepress/docs/.vuepress/.temp/pages/tag/go/index.html.js"), meta: {"title":"Tag Go"} }],
  ["/tag/%E7%BC%93%E5%AD%98/", { loader: () => import(/* webpackChunkName: "index.html" */"/Users/jimmy/workspace/gogo/vuepress/docs/.vuepress/.temp/pages/tag/缓存/index.html.js"), meta: {"title":"Tag 缓存"} }],
  ["/tag/vue/", { loader: () => import(/* webpackChunkName: "index.html" */"/Users/jimmy/workspace/gogo/vuepress/docs/.vuepress/.temp/pages/tag/vue/index.html.js"), meta: {"title":"Tag vue"} }],
  ["/tag/cos/", { loader: () => import(/* webpackChunkName: "index.html" */"/Users/jimmy/workspace/gogo/vuepress/docs/.vuepress/.temp/pages/tag/cos/index.html.js"), meta: {"title":"Tag cos"} }],
  ["/article/", { loader: () => import(/* webpackChunkName: "index.html" */"/Users/jimmy/workspace/gogo/vuepress/docs/.vuepress/.temp/pages/article/index.html.js"), meta: {"title":"Articles"} }],
  ["/timeline/", { loader: () => import(/* webpackChunkName: "index.html" */"/Users/jimmy/workspace/gogo/vuepress/docs/.vuepress/.temp/pages/timeline/index.html.js"), meta: {"title":"Timeline"} }],
]);

if (import.meta.webpackHot) {
  import.meta.webpackHot.accept()
  if (__VUE_HMR_RUNTIME__.updateRoutes) {
    __VUE_HMR_RUNTIME__.updateRoutes(routes)
  }
  if (__VUE_HMR_RUNTIME__.updateRedirects) {
    __VUE_HMR_RUNTIME__.updateRedirects(redirects)
  }
}

if (import.meta.hot) {
  import.meta.hot.accept(({ routes, redirects }) => {
    __VUE_HMR_RUNTIME__.updateRoutes(routes)
    __VUE_HMR_RUNTIME__.updateRedirects(redirects)
  })
}
import comp from "/Users/jimmy/workspace/gogo/vuepress/docs/.vuepress/.temp/pages/posts/Go抢占式调度.html.vue"
const data = JSON.parse("{\"path\":\"/posts/Go%E6%8A%A2%E5%8D%A0%E5%BC%8F%E8%B0%83%E5%BA%A6.html\",\"title\":\"\",\"lang\":\"zh-cn\",\"frontmatter\":{\"date\":\"2022-03-05T00:00:00.000Z\",\"category\":[\"Go\"],\"tag\":[\"Go\"]},\"headers\":[{\"level\":2,\"title\":\"2.6 抢占式调度\",\"slug\":\"_2-6-抢占式调度\",\"link\":\"#_2-6-抢占式调度\",\"children\":[{\"level\":3,\"title\":\"2.6.0 sysmon监听抢占时机\",\"slug\":\"_2-6-0-sysmon监听抢占时机\",\"link\":\"#_2-6-0-sysmon监听抢占时机\",\"children\":[]},{\"level\":3,\"title\":\"2.6.1 基于协作的抢占式调度\",\"slug\":\"_2-6-1-基于协作的抢占式调度\",\"link\":\"#_2-6-1-基于协作的抢占式调度\",\"children\":[]},{\"level\":3,\"title\":\"2.6.2 基于信号的抢占式调度\",\"slug\":\"_2-6-2-基于信号的抢占式调度\",\"link\":\"#_2-6-2-基于信号的抢占式调度\",\"children\":[]}]}],\"git\":{\"updatedTime\":null,\"contributors\":[]},\"filePathRelative\":\"posts/Go抢占式调度.md\",\"excerpt\":\"<h2>2.6 抢占式调度</h2>\\n<h3>2.6.0 sysmon监听抢占时机</h3>\\n<p>sysmon是一个Go里面的一个特殊的线程，不与任何P绑定，不参与调度，主要用于监控整个Go进程，主要有如下作用：</p>\\n<ol>\\n<li>释放闲置超过5分钟的span物理内存</li>\\n<li>超过2分钟没有垃圾回收，强制启动垃圾回收</li>\\n<li>将长时间没有处理的netpoll结果添加到任务队列</li>\\n<li>向长时间执行的G任务发起抢占调度</li>\\n<li>收回因syscall而长时间阻塞的P</li>\\n</ol>\\n<p>sysmon线程在runtime.main函数里面创建：</p>\"}")
export { comp, data }

if (import.meta.webpackHot) {
  import.meta.webpackHot.accept()
  if (__VUE_HMR_RUNTIME__.updatePageData) {
    __VUE_HMR_RUNTIME__.updatePageData(data)
  }
}

if (import.meta.hot) {
  import.meta.hot.accept(({ data }) => {
    __VUE_HMR_RUNTIME__.updatePageData(data)
  })
}

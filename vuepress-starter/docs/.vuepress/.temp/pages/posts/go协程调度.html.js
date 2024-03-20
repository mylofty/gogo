import comp from "/Users/jimmy/workspace/gogo/vuepress-starter/docs/.vuepress/.temp/pages/posts/go协程调度.html.vue"
const data = JSON.parse("{\"path\":\"/posts/go%E5%8D%8F%E7%A8%8B%E8%B0%83%E5%BA%A6.html\",\"title\":\"二、协程调度\",\"lang\":\"zh-cn\",\"frontmatter\":{\"date\":\"2023-03-05T00:00:00.000Z\",\"category\":[\"Go\"],\"tag\":[\"Go\"]},\"headers\":[{\"level\":2,\"title\":\"2.1 线程和协程\",\"slug\":\"_2-1-线程和协程\",\"link\":\"#_2-1-线程和协程\",\"children\":[{\"level\":3,\"title\":\"2.1.1 线程调度开销\",\"slug\":\"_2-1-1-线程调度开销\",\"link\":\"#_2-1-1-线程调度开销\",\"children\":[]},{\"level\":3,\"title\":\"2.1.2 协程调度\",\"slug\":\"_2-1-2-协程调度\",\"link\":\"#_2-1-2-协程调度\",\"children\":[]}]},{\"level\":2,\"title\":\"2.2 GMP调度模型\",\"slug\":\"_2-2-gmp调度模型\",\"link\":\"#_2-2-gmp调度模型\",\"children\":[{\"level\":3,\"title\":\"2.2.1 GM模型\",\"slug\":\"_2-2-1-gm模型\",\"link\":\"#_2-2-1-gm模型\",\"children\":[]},{\"level\":3,\"title\":\"2.2.2 GMP模型\",\"slug\":\"_2-2-2-gmp模型\",\"link\":\"#_2-2-2-gmp模型\",\"children\":[]}]}],\"git\":{\"updatedTime\":1710837763000,\"contributors\":[{\"name\":\"zhiminding\",\"email\":\"zhiminding@tencent.com\",\"commits\":1}]},\"filePathRelative\":\"posts/go协程调度.md\",\"excerpt\":\"\\n<h2>2.1 线程和协程</h2>\\n<h3>2.1.1 线程调度开销</h3>\\n<p>在操作系统中，线程是cpu调度的基本单位，然而，线程是由操作系统负责调度。线程切换时：</p>\\n<ol>\\n<li>线程需要从用户态陷入内核态，栈指针指向内核态栈地址，同时保存上下文，如各种用户空间寄存器的数据（通用寄存器，段寄存器，标识寄存器等等）</li>\\n<li>操作系统调度算法找到需要调度的线程之后，又要从内核态切换回用户态，恢复上下文，栈指针指向新线程的用户态栈地址。</li>\\n<li>整个切换过程中，为了安全，需要引入更强的内核检查。</li>\\n</ol>\\n<p>这些操作导致线程切换存在不小的开销</p>\"}")
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

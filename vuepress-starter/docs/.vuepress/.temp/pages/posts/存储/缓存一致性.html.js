import comp from "/Users/jimmy/workspace/gogo/docs/.vuepress/.temp/pages/posts/存储/缓存一致性.html.vue"
const data = JSON.parse("{\"path\":\"/posts/%E5%AD%98%E5%82%A8/%E7%BC%93%E5%AD%98%E4%B8%80%E8%87%B4%E6%80%A7.html\",\"title\":\"一、缓存常见问题\",\"lang\":\"zh-cn\",\"frontmatter\":{},\"headers\":[{\"level\":2,\"title\":\"2.1 缓存更新策略\",\"slug\":\"_2-1-缓存更新策略\",\"link\":\"#_2-1-缓存更新策略\",\"children\":[]},{\"level\":2,\"title\":\"2.2 旁路缓存(cache aside)\",\"slug\":\"_2-2-旁路缓存-cache-aside\",\"link\":\"#_2-2-旁路缓存-cache-aside\",\"children\":[]},{\"level\":2,\"title\":\"2.3 写穿(write through)\",\"slug\":\"_2-3-写穿-write-through\",\"link\":\"#_2-3-写穿-write-through\",\"children\":[]},{\"level\":2,\"title\":\"2.4 异步写回(write behind)\",\"slug\":\"_2-4-异步写回-write-behind\",\"link\":\"#_2-4-异步写回-write-behind\",\"children\":[]},{\"level\":2,\"title\":\"3.1 缓存雪崩\",\"slug\":\"_3-1-缓存雪崩\",\"link\":\"#_3-1-缓存雪崩\",\"children\":[]},{\"level\":2,\"title\":\"3.2 缓存击穿\",\"slug\":\"_3-2-缓存击穿\",\"link\":\"#_3-2-缓存击穿\",\"children\":[]},{\"level\":2,\"title\":\"3.3 缓存穿透\",\"slug\":\"_3-3-缓存穿透\",\"link\":\"#_3-3-缓存穿透\",\"children\":[]}],\"git\":{\"updatedTime\":null,\"contributors\":[]},\"filePathRelative\":\"posts/存储/缓存一致性.md\",\"excerpt\":\"<p>[toc]</p>\\n<h1>一、缓存常见问题</h1>\\n<ol>\\n<li>缓存与数据库数据一致性</li>\\n<li>缓存雪崩</li>\\n<li>缓存击穿</li>\\n<li>缓存穿透</li>\\n</ol>\\n<h1>二、缓存一致性问题</h1>\\n<p>缓存一致性问题的产生主要是因为请求需要事务地处理缓存和数据库。但实际操作中，难以保证事务性。</p>\\n<ol>\\n<li>操作隔离性：并发请求时，无法保证多个请求在处理缓存和处理数据库两个步骤上的时序。</li>\\n<li>操作原子性：即使单个请求，也无法保证处理缓存和处理数据库的原子性，可能存在某个操作失败的情况</li>\\n</ol>\\n<h2>2.1 缓存更新策略</h2>\"}")
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

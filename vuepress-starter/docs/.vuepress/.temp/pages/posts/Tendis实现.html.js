import comp from "/Users/jimmy/workspace/gogo/vuepress/docs/.vuepress/.temp/pages/posts/Tendis实现.html.vue"
const data = JSON.parse("{\"path\":\"/posts/Tendis%E5%AE%9E%E7%8E%B0.html\",\"title\":\"Tendis冷热混合存储方案\",\"lang\":\"zh-cn\",\"frontmatter\":{\"date\":\"2023-03-14T00:00:00.000Z\",\"category\":[\"存储\"],\"tag\":[\"缓存\"],\"sticky\":true,\"excerpt\":\"<p>tendis实现原理.</p>\"},\"headers\":[{\"level\":2,\"title\":\"技术实现原理\",\"slug\":\"技术实现原理\",\"link\":\"#技术实现原理\",\"children\":[]},{\"level\":2,\"title\":\"读数据\",\"slug\":\"读数据\",\"link\":\"#读数据\",\"children\":[]},{\"level\":2,\"title\":\"写数据\",\"slug\":\"写数据\",\"link\":\"#写数据\",\"children\":[]},{\"level\":2,\"title\":\"潜在常见问题\",\"slug\":\"潜在常见问题\",\"link\":\"#潜在常见问题\",\"children\":[{\"level\":3,\"title\":\"1. 缓存与数据库数据一致性\",\"slug\":\"_1-缓存与数据库数据一致性\",\"link\":\"#_1-缓存与数据库数据一致性\",\"children\":[]},{\"level\":3,\"title\":\"2. 缓存穿透\",\"slug\":\"_2-缓存穿透\",\"link\":\"#_2-缓存穿透\",\"children\":[]},{\"level\":3,\"title\":\"3. 缓存击穿\",\"slug\":\"_3-缓存击穿\",\"link\":\"#_3-缓存击穿\",\"children\":[]},{\"level\":3,\"title\":\"4. 缓存雪崩\",\"slug\":\"_4-缓存雪崩\",\"link\":\"#_4-缓存雪崩\",\"children\":[]}]}],\"git\":{\"updatedTime\":null,\"contributors\":[]},\"filePathRelative\":\"posts/Tendis实现.md\"}")
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

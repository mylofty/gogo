import comp from "/Users/jimmy/workspace/gogo/vuepress-starter/docs/.vuepress/.temp/pages/posts/golang垃圾回收.html.vue"
const data = JSON.parse("{\"path\":\"/posts/golang%E5%9E%83%E5%9C%BE%E5%9B%9E%E6%94%B6.html\",\"title\":\"golang三关\",\"lang\":\"zh-cn\",\"frontmatter\":{\"date\":\"2023-03-05T00:00:00.000Z\",\"category\":[\"Go\"],\"tag\":[\"Go\"]},\"headers\":[],\"git\":{\"updatedTime\":1710837763000,\"contributors\":[{\"name\":\"zhiminding\",\"email\":\"zhiminding@tencent.com\",\"commits\":1}]},\"filePathRelative\":\"posts/golang垃圾回收.md\",\"excerpt\":\"\\n<p>https://learnku.com/blog/Aceld/tags/three-passes-of-golang_67253</p>\\n<p>垃圾回收：</p>\\n<p>https://learnku.com/articles/68141</p>\\n\"}")
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

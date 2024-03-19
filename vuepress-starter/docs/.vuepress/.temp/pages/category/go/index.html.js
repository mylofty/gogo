import comp from "/Users/jimmy/workspace/gogo/vuepress/docs/.vuepress/.temp/pages/category/go/index.html.vue"
const data = JSON.parse("{\"path\":\"/category/go/\",\"title\":\"Category Go\",\"lang\":\"zh-cn\",\"frontmatter\":{\"title\":\"Category Go\",\"sidebar\":false,\"blog\":{\"type\":\"category\",\"name\":\"Go\",\"key\":\"category\"},\"layout\":\"Category\"},\"headers\":[],\"git\":{},\"filePathRelative\":null,\"excerpt\":\"\"}")
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

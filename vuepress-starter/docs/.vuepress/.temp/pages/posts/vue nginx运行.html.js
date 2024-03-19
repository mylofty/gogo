import comp from "/Users/jimmy/workspace/gogo/vuepress/docs/.vuepress/.temp/pages/posts/vue nginx运行.html.vue"
const data = JSON.parse("{\"path\":\"/posts/vue%20nginx%E8%BF%90%E8%A1%8C.html\",\"title\":\"\",\"lang\":\"zh-cn\",\"frontmatter\":{\"date\":\"2023-01-06T00:00:00.000Z\",\"category\":[\"vue\"],\"tag\":[\"vue\"]},\"headers\":[],\"git\":{\"updatedTime\":null,\"contributors\":[]},\"filePathRelative\":\"posts/vue nginx运行.md\",\"excerpt\":\"<p>注：这里开始认为各位都会使用nginx</p>\\n<p>打包vue项目</p>\\n<div class=\\\"language-bash\\\" data-ext=\\\"sh\\\" data-title=\\\"sh\\\"><pre class=\\\"language-bash\\\"><code><span class=\\\"token function\\\">npm</span> run build\\n</code></pre></div><p>测试打包的项目是否可以运行</p>\\n<div class=\\\"language-bash\\\" data-ext=\\\"sh\\\" data-title=\\\"sh\\\"><pre class=\\\"language-bash\\\"><code>serve dist\\n</code></pre></div>\"}")
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

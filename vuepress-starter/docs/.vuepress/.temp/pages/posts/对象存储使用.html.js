import comp from "/Users/jimmy/workspace/gogo/vuepress/docs/.vuepress/.temp/pages/posts/对象存储使用.html.vue"
const data = JSON.parse("{\"path\":\"/posts/%E5%AF%B9%E8%B1%A1%E5%AD%98%E5%82%A8%E4%BD%BF%E7%94%A8.html\",\"title\":\"\",\"lang\":\"zh-cn\",\"frontmatter\":{\"date\":\"2023-01-06T00:00:00.000Z\",\"category\":[\"存储\"],\"tag\":[\"cos\"]},\"headers\":[],\"git\":{\"updatedTime\":null,\"contributors\":[]},\"filePathRelative\":\"posts/对象存储使用.md\",\"excerpt\":\"<p>上传流程</p>\\n<p>文件上传分为客户端上传（主要是指网页端和移动端等面向终端用户的场景）和服务端上传两种场景，具体可以参考文档业务流程。</p>\\n<p>服务端SDK在上传方面主要提供两种功能，一种是生成客户端上传所需要的上传凭证，另外一种是直接上传文件到云端。</p>\\n<p>客户端上传凭证</p>\\n<p>客户端（移动端或者Web端）上传文件的时候，需要从客户自己的业务服务器获取上传凭证，而这些上传凭证是通过服务端的SDK来生成的，然后通过客户自己的业务API分发给客户端使用。根据上传的业务需求不同，七牛云 Go SDK支持丰富的上传凭证生成方式。</p>\\n<p>拷贝\\n// 存储相关功能的引入包只有这两个，后面不再赘述\\nimport (\\n\\\"github.com/qiniu/go-sdk/v7/auth/qbox\\\"\\n\\\"github.com/qiniu/go-sdk/v7/storage\\\"\\n)</p>\"}")
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

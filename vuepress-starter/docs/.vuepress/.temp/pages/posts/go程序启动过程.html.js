import comp from "/Users/jimmy/workspace/gogo/vuepress/docs/.vuepress/.temp/pages/posts/go程序启动过程.html.vue"
const data = JSON.parse("{\"path\":\"/posts/go%E7%A8%8B%E5%BA%8F%E5%90%AF%E5%8A%A8%E8%BF%87%E7%A8%8B.html\",\"title\":\"一、go启动流程\",\"lang\":\"zh-cn\",\"frontmatter\":{\"date\":\"2023-03-05T00:00:00.000Z\",\"category\":[\"Go\"],\"tag\":[\"Go\"]},\"headers\":[{\"level\":2,\"title\":\"1.1 第一个go程序\",\"slug\":\"_1-1-第一个go程序\",\"link\":\"#_1-1-第一个go程序\",\"children\":[]},{\"level\":2,\"title\":\"1.2 生产力工具lensm\",\"slug\":\"_1-2-生产力工具lensm\",\"link\":\"#_1-2-生产力工具lensm\",\"children\":[]},{\"level\":2,\"title\":\"1.3 启动流程\",\"slug\":\"_1-3-启动流程\",\"link\":\"#_1-3-启动流程\",\"children\":[]}],\"git\":{\"updatedTime\":null,\"contributors\":[]},\"filePathRelative\":\"posts/go程序启动过程.md\",\"excerpt\":\"\\n<h1>一、go启动流程</h1>\\n<h2>1.1 第一个go程序</h2>\\n<ol>\\n<li>首先，我们来看一个简单的go程序启动流程</li>\\n</ol>\\n<div class=\\\"language-go\\\" data-ext=\\\"go\\\" data-title=\\\"go\\\"><pre class=\\\"language-go\\\"><code><span class=\\\"token comment\\\">// main.go</span>\\n<span class=\\\"token keyword\\\">import</span> <span class=\\\"token string\\\">\\\"fmt\\\"</span>\\n\\n\\n<span class=\\\"token keyword\\\">func</span> <span class=\\\"token function\\\">main</span><span class=\\\"token punctuation\\\">(</span><span class=\\\"token punctuation\\\">)</span> <span class=\\\"token punctuation\\\">{</span>\\n    str <span class=\\\"token operator\\\">:=</span> <span class=\\\"token function\\\">make</span><span class=\\\"token punctuation\\\">(</span><span class=\\\"token punctuation\\\">[</span><span class=\\\"token punctuation\\\">]</span><span class=\\\"token builtin\\\">string</span><span class=\\\"token punctuation\\\">,</span> <span class=\\\"token number\\\">0</span><span class=\\\"token punctuation\\\">)</span>\\n    str <span class=\\\"token operator\\\">=</span> <span class=\\\"token function\\\">append</span><span class=\\\"token punctuation\\\">(</span>str<span class=\\\"token punctuation\\\">,</span> <span class=\\\"token string\\\">\\\"zhiminding\\\"</span><span class=\\\"token punctuation\\\">)</span>\\n    fmt<span class=\\\"token punctuation\\\">.</span><span class=\\\"token function\\\">Printf</span><span class=\\\"token punctuation\\\">(</span><span class=\\\"token string\\\">\\\"hello,%v\\\"</span><span class=\\\"token punctuation\\\">,</span> str<span class=\\\"token punctuation\\\">)</span>\\n<span class=\\\"token punctuation\\\">}</span>\\n</code></pre></div>\"}")
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

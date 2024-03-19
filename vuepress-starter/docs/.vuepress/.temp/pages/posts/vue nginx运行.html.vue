<template><div><p>注：这里开始认为各位都会使用nginx</p>
<p>打包vue项目</p>
<div class="language-bash line-numbers-mode" data-ext="sh" data-title="sh"><pre v-pre class="language-bash"><code><span class="token function">npm</span> run build
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div></div></div><p>测试打包的项目是否可以运行</p>
<div class="language-bash line-numbers-mode" data-ext="sh" data-title="sh"><pre v-pre class="language-bash"><code>serve dist
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div></div></div><p>可以正常运行</p>
<p>编译报错请移步到：​​renren-fast-vue@1.2.2 项目编译报错: build <code v-pre>gulp</code>​​</p>
<p>部署vue项目到nginx
接下来将renren-fast-vue 项目生成的dist 目录修改为：renren-fast-vue 并压缩为：renren-fast-vue.zip</p>
<p>复制renren-fast-vue.zip 到服务器</p>
<p>解压到：<code v-pre>/usr/local/nginx/</code></p>
<p>vue项目的nginx配置文件不直接在nginx.conf中进行配置，将配置保存在/usr/local/nginx/conf/vhost/renren-fast-vue.conf</p>
<p>配置内容为：<code v-pre>vi /usr/local/nginx/conf/vhost/renren-fast-vue.conf</code></p>
<div class="language-bash line-numbers-mode" data-ext="sh" data-title="sh"><pre v-pre class="language-bash"><code>server <span class="token punctuation">{</span>
        listen   <span class="token number">7000</span><span class="token punctuation">;</span>
        server_name  www.renrenfastvue.com<span class="token punctuation">;</span>

        <span class="token comment">#charset koi8-r;</span>
        <span class="token comment">#access_log  logs/host.access.log  main;</span>
        <span class="token comment">#项目的根目录</span>
        root /usr/local/nginx/renren-fast-vue<span class="token punctuation">;</span>

        <span class="token comment">#网站根入口</span>
        location / <span class="token punctuation">{</span>
            <span class="token comment"># 此处的 @router 实际上是引用下面的转发，否则在 Vue 路由刷新时可能会抛出 404</span>
            try_files <span class="token variable">$uri</span> <span class="token variable">$uri</span>/ @router<span class="token punctuation">;</span>
            <span class="token comment"># 请求指向的首页</span>
            index index.html<span class="token punctuation">;</span>
        <span class="token punctuation">}</span>

        <span class="token comment"># 由于路由的资源不一定是真实的路径，无法找到具体文件</span>
        <span class="token comment"># 所以需要将请求重写到 index.html 中，然后交给真正的 Vue 路由处理请求资源</span>
        location @router <span class="token punctuation">{</span>
                rewrite ^.*$ /index.html last<span class="token punctuation">;</span>
        <span class="token punctuation">}</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>将renren-fast-vue项目的配置文件：/usr/local/nginx/conf/vhost/renren-fast-vue.conf 导入到nginx.conf</p>
<div class="language-bash line-numbers-mode" data-ext="sh" data-title="sh"><pre v-pre class="language-bash"><code><span class="token function">vi</span> /usr/local/nginx/conf/nginx.conf
<span class="token comment"># 在nginx.conf中http块导入文件的指令</span>
include ./vhost/renren-fast-vue.conf
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>管理nginx</p>
<p>检查语法：nginx -t
启动：nginx
重启：nginx -s reload
停止：nginx -s stop</p>
<p>测试服务</p>
<p>检查nginx 监听的端口是否启动成功：netstat -anp|grep nginx
测试renren-fast-vue的首页是否可以访问：curl -I http://127.0.0.1:7000</p>
<p>到目前为止vue项目部署成功了，接下来通过浏览器，用域名访问</p>
<p>域名为：server_name www.renrenfastvue.com;</p>
<p>在windows 的 C:\Windows\System32\drivers\etc\hosts 文件配置DNS 域名解析</p>
<p>在浏览器地址栏输入：http://www.renrenfastvue.com:7000/</p>
<p>登录的默认账号密码是：admin</p>
<p>ps：如果监听端口为80，则不需要在域名后面添加端口</p>
</div></template>



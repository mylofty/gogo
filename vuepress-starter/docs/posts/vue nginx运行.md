---
date: 2023-01-06
category:
  - vue
tag:
  - vue
---

注：这里开始认为各位都会使用nginx 

打包vue项目
```sh
npm run build
```
测试打包的项目是否可以运行
```sh
serve dist
```
可以正常运行

编译报错请移步到：​​renren-fast-vue@1.2.2 项目编译报错: build `gulp`​​

部署vue项目到nginx
接下来将renren-fast-vue 项目生成的dist 目录修改为：renren-fast-vue 并压缩为：renren-fast-vue.zip

复制renren-fast-vue.zip 到服务器

解压到：`/usr/local/nginx/`

vue项目的nginx配置文件不直接在nginx.conf中进行配置，将配置保存在/usr/local/nginx/conf/vhost/renren-fast-vue.conf

配置内容为：`vi /usr/local/nginx/conf/vhost/renren-fast-vue.conf`
```sh
server {
        listen   7000;
        server_name  www.renrenfastvue.com;

        #charset koi8-r;
        #access_log  logs/host.access.log  main;
        #项目的根目录
        root /usr/local/nginx/renren-fast-vue;

        #网站根入口
        location / {
            # 此处的 @router 实际上是引用下面的转发，否则在 Vue 路由刷新时可能会抛出 404
            try_files $uri $uri/ @router;
            # 请求指向的首页
            index index.html;
        }

        # 由于路由的资源不一定是真实的路径，无法找到具体文件
        # 所以需要将请求重写到 index.html 中，然后交给真正的 Vue 路由处理请求资源
        location @router {
                rewrite ^.*$ /index.html last;
        }
}
```

将renren-fast-vue项目的配置文件：/usr/local/nginx/conf/vhost/renren-fast-vue.conf 导入到nginx.conf
```sh
vi /usr/local/nginx/conf/nginx.conf
# 在nginx.conf中http块导入文件的指令
include ./vhost/renren-fast-vue.conf
```

管理nginx

检查语法：nginx -t
启动：nginx
重启：nginx -s reload
停止：nginx -s stop


测试服务

检查nginx 监听的端口是否启动成功：netstat -anp|grep nginx
测试renren-fast-vue的首页是否可以访问：curl -I http://127.0.0.1:7000


到目前为止vue项目部署成功了，接下来通过浏览器，用域名访问

域名为：server_name www.renrenfastvue.com;

在windows 的 C:\Windows\System32\drivers\etc\hosts 文件配置DNS 域名解析




 在浏览器地址栏输入：http://www.renrenfastvue.com:7000/

登录的默认账号密码是：admin




 ps：如果监听端口为80，则不需要在域名后面添加端口
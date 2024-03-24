# gogo
爱开源GoGo博客系统

- Node.js v18.16.0+

## hexo项目搭建
前往[hexo官方文档](https://hexo.io/zh-cn/docs/commands.html)
### 项目创建
1. 安装hexo
```sh
npm i hexo-cli -g
```
2. 创建hexo项目
```sh
hexo init blog
```
3. 创建一个新的一个markdown页面

``` bash
# EG  注意双引号中的是博客标题，不需要加.md等后缀。
$ hexo new "My New Post"
```
也可以直接在source/_posts目录下面创建一个`xxx.md`文件
4. 启动服务
``` bash
# npm install 首次拉取代码需要安装node_modules
$ hexo server
```

5. 生成静态文件
``` bash
$ hexo generate
```

6. 部署到站点
``` bash
$ hexo deploy
```

### 博客编写
#### 布局 (Layout)
Hexo提供了三种默认布局：post（文章）、draft（草稿）、page（页面）

创建MD文件时，可以指定要使用的布局，不指定布局类型的话，则会默认使用post布局（可以在站点配置文件中修改default_layout来指定默认布局）
```sh
# 命令格式 
hexo new [layout] <title>
# 指定布局类型为page
hexo new page "我的页面"
# 不指定布局类型
hexo new "我的文章"
```
以不同布局新建的MD文件会存储在不同路径

- post布局：保存在source/_posts文件夹中。文章布局，顾名思义就是你已发布的文章，会在博客网站里显示。
- draft布局：保存在source/_drafts文件夹中。草稿布局，顾名思义就是你还没写完不想发布的文章，默认不会在博客网站里显示。
- page布局：Hexo会创建一个目录，并在其中新建index.md文件。页面布局，顾名思义就是用来DIY我们博客页面的。

#### Front-matter
用---包围起来并置于文件头部的内容称为Front-matter，用于指定MD文件的变量

举例来说，修改已发布的文章，设置如下Front-matter
```md
---
title: Hello World
date: 2022-08-12
update: 2022-08-13
categories:
- 个人博客
- Hexo博客
tags:
- Hexo
- 博客
---

```

#### 图片导入
1. 绝对路径本地引用
当Hexo项目中只用到少量图片时，可以将图片统一放在source/images文件夹中，通过markdown语法访问它们。
```md
![](/images/image.jpg)
```
图片既可以在首页内容中访问到，也可以在文章正文中访问到。
2. 相对目录导入
图片除了可以放在统一的images文件夹中，还可以放在文章自己的目录中。文章的目录可以通过站点配置文件_config.yml来生成。
post_asset_folder: true
将_config.yml文件中的配置项post_asset_folder设为true后，执行命令$ hexo new post_name，在source/_posts中会生成文章post_name.md和同名文件夹post_name。将图片资源放在post_name中，文章就可以使用相对路径引用图片资源了。
```md
![](image.jpg)
```


### 主题选择
使用butterfly主题
```sh
npm install hexo-renderer-pug hexo-renderer-stylus --save
git clone -b master https://github.com/jerryc127/hexo-theme-butterfly.git themes/butterfly
```
clone之后，会在themes目录下包含该主题
之后编辑 `_config.yml`
```
theme: butterfly
```
#### bufferfly主题安装
前往官方[安装文档](https://butterfly.js.org/posts/dc584b87/#Page-Front-matter)

#### 主题保存到git中
由于clone下来的butterfly是一个git仓库，所以没办法加入到当前仓库中，需要删除themes/butterfly中的`.git`目录才可以执行`git add .`

当仍然无法add进去，可以copy一份，然后再加入到路径中

#### 配置tags和category
1. 配置tags
前往你的 Hexo 博客的根目錄,輸入 `hexo new page tags`,你會找到 `source/tags/index.md` 這個文件

修改這個文件：,記得添加 `type: "tags"`
```md
---
title: 标签
date: 2018-01-05 00:00:00
type: "tags"
orderby: random
order: 1
---
```
| 參數      | 解釋 |
| ----------- | ----------- |
| type	|【必須】頁面類型，必須為 tags |
| orderby	| 【可選】排序方式 ：random/name/length | 
| order	| 【可選】排序次序： 1, asc for ascending; -1, desc for descending | 


2. 配置分类
輸入 `hexo new page categories`,修改這個index.md文件
```sh
---
title: 分类
date: 2024-03-19 00:00:00
type: "categories"
---
```

### flow插件安装

#### mermaid配置
修改主题butterfly的_config.yml，将mermaid设置为true
需要使用的地方，使用如下语法来写
```
{% mermaid %}
sequenceDiagram
title: 写策略二：先删缓存再更新数据库
participant 请求A
participant 缓存
请求A ->> 缓存: [A]读缓存 
{% endmermaid %}
```

### github部署
1. github创建命名为{username}.github.io的仓库
2. 安装git工具
```
npm install hexo-deployer-git --save
```
3. _config.yml配置
配置url和root，还有deploy信息
```sh
# URL
## Set your site url here. For example, if you use GitHub Page, set url as 'https://username.github.io/project'
url: https://mylofty.github.io
root: /mylofty.github.io
deploy:
  type: git
  repo: https://github.com/mylofty/mylofty.github.io.git
  branch: main
```
4. 发布部署
```sh
hexo deploy
# hexo clean && hexo generate && hexo deploy
```
5. 访问 https://mylofty.github.io

### 私有服务器部署
#### 项目nginx配置
1. 创建hexo项目目录
```sh
# 1. 创建文件目录, 用于博客站点文件存放, 并更改目录读写权限
mkdir /data/www/hexo
chmod -R 755 /data/www/hexo
```
2. 添加index.html文件  `vim /data/www/hexo/index.html`
```html
<!DOCTYPE html>
<html>
  <head>
    <title></title>
    <meta charset="UTF-8">
  </head>
  <body>
    <p>Nginx running</p>
  </body>
</html>
```
3. 配置nginx（默认服务器已经配置了nginx） `/etc/nginx/nginx.conf`
```sh
    server {
        listen       8080;
        listen       [::]:8080;
        server_name  _;
        root          /data/www/hexo;
    }
```
4. 重启服务并验证，访问http://ip:8080
```sh
nginx -s reload
```

#### 云端git仓库配置

1. 创建文件目录, 用于私人 Git 仓库搭建, 并更改目录读写权限
```sh
mkdir /data/GitLibrary
chmod -R 755 /data/GitLibrary
```
2. 初始化hexo裸库
```sh
cd /data/GitLibrary
git init --bare hexo.git
```
3. 创建钩子
```sh
vim /data/GitLibrary/hexo.git/hooks/post-receive
```
用于指定 Git 的源代码 和 Git 配置文件
```sh
#!/bin/bash
git --work-tree=/data/www/hexo --git-dir=/data/GitLibrary/hexo.git checkout -f
```
4. 保存并退出后, 给该文件添加可执行权限
```sh
chmod +x /data/GitLibrary/hexo.git/hooks/post-receive
```
#### 本地仓库配置
修改本地_config.yml文件，添加部署自建git仓库
```sh
deploy:
  - type: git
    repo: https://github.com/mylofty/mylofty.github.io.git
    branch: main
  - type: git
    repo: root@175.178.117.77:/data/GitLibrary/hexo.git
    branch: master
```
#### 访问
```
http://175.178.117.77:8080/
http://www.ddlofty.com:8080/
```





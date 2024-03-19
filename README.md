# gogo
爱开源GoGo博客系统

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


## vuepress项目搭建
根据vuepress2[官方文档](https://v2.vuepress.vuejs.org/zh/guide/introduction.html)进行搭建
### 项目创建
```shell
# Node.js v18.16.0+
npm init vuepress vuepress-starter
```
### 项目本地启动
```shell
npm run docs:dev
```
### 博客目录
博客均在docs/posts文件夹下面
```
.
├── README.md
├── get-started.md
└── posts
    ├── archive1.md
    ├── archive2.md
    ├── article1.md
    ├── article10.md
    ├── article11.md
    ├── article12.md
    ├── article2.md
    ├── sticky.md
    └── sticky2.md
```

### markdown扩展语法
#### 1. 分类信息插入
Markdown 文件可以包含一个 YAML Frontmatter 。Frontmatter 必须在 Markdown 文件的顶部，并且被包裹在一对三短划线中间。下面是一个基本的示例：
在博客首部插入日志，分类，tag等信息
```shell
---
date: 1998-01-01
category:
  - History
tag:
  - WWI
  - tag B
# archive: true 是否归档，归档后不在文章页面展示
# sticky: true 是否置顶,可以为数字，越大排在越前面
---
```
前往[frontmatter](https://v2.vuepress.vuejs.org/zh/reference/frontmatter.html)查看 VuePress 支持的 Frontmatter 配置。
#### 1. 静态图片导入
静态文件需放置在docs/.vuepress/public目录下面，如放置图片`docs/.vuepress/public/images/缓存一致性.jpeg`
博客使用时，使用语法
```md
![img](/images/缓存一致性.jpeg)
```
### 目录导入
```sh
[[toc]]
```







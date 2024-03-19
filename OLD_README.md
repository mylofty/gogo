# gogo
爱开源GoGo博客系统

- Node.js v18.16.0+

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







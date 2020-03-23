---
layout: post
title: 为你的 Github 博客加个 CMS -「内容管理」
subtitle: Github 博客内容管理解决方案 - 「netlifycms」
cover: /assets/uploads/screenshot-editor-1fa7f845bc0c9ed177d2c98a7339f2f6.jpg
date: '2020-03-21 01:05:43'
tags: netlifycms 博客 CMS Github
color: 'rgb(30, 31, 32)'
---
# Github 博客内容管理解决方案 - 「netlifycms」

在使用 `Github` 作为博客很长一段时间在发愁，主要是有以下几个痛点：  

* 每次写文章都要打开编辑器，感觉自己不是在写文章而是在写代码  
* 写完只是想打个草稿，都要用 `git` 提交以下更改，更像写代码了  
* 不能随时随地的编辑，有时候我想用 ipad 修改点什么都不可以  

由于以上几个痛点，每次写 Blog 感觉自己都需要费很大的力气，还不如自己写个笔记就过去了。  

但是有些好的东西总是要分享出来才会有价值啊，于是我开始寻找 Github Blog 的 CMS 解决方案。    

先来一张效果图。  

![blog_admin](/assets/uploads/elfgzp_admin.gif)

## netlifycms 与 jekyll-admin 的对比

刚开始我找到的是 `jekyll-admin` 这款 `jekyll` 的 `CMS`，因为本人用的是 `jekyll`。但是发现这款 `jeklly` 还需要一台服务器，也就是他编辑的只是服务器上的文件。  

当初选择使用 `Github` 作为 Blog 就是想在没有个人服务器的情况下 Blog 依然能工作。虽然目前是利用 `CI` 部署在自己的服务器上方便国内的搜索引擎爬虫进行爬取，目的是优化 `SEO`，提高国内的访问速度。但是还是想要一个不需要自己部署后端的 CMS。

于是我就找到了 netlifycms，经过配置完后我大概了解了他的工作原理。  

首先你的 CMS admin 页面是跟你博客一起部署在 Github 上面的，admin 的权限则是通过 Github OAuth 来控制的。在你修改了页面之后，会通过 `js` 提交给 `netlify`，`netlify` 会通过 Github OAuth 获取的权限来在你修改了文章之后帮你做 `git commit` 的操作，大概的原理图如下。  

![netlifycms](/assets/uploads/netlifycms.png)

废话不多说，我们跟着官方文档开始吧。  

## 为你的博客添加 netlifycms

由于本人用的是 jeklly 博客，文章中的演示部分均为 jeklly。当然 netlifycms 不只支持 jeklly，还支持很多其他类型的 Blog。如果是其他类型的 Blog 可以参考[官方文档](https://www.netlifycms.org/docs/intro/)的 `Guides`，不过应该都是大同小异的，不过建议对比本片文章来配置，如何创建 Oauth 应用可以参考本文，因为官方文档没有讲的太详细。   

当然开始之前你需要有一个已经部署好的博客，没有部署好的可以参考 [jeklly 的部署指引文档](https://jekyllrb.com/docs/step-by-step/01-setup/)。  

### 增加 admin/index.html 文件

创建一个 `admin/index.html` 在你的仓库根目录下，这个文件内容看起来像这样。注意官方文档中并没有添加 `netlify-identity-widget.js` 这个 `js` ，这个是用来校验你的身份的，需要加上。  

```html
<!-- admin/index.html -->
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script src="https://identity.netlify.com/v1/netlify-identity-widget.js"></script>
    <title>Content Manager</title>
  </head>
  <body>
    <!-- Include the script that builds the page and powers Netlify CMS -->
    <script src="https://unpkg.com/netlify-cms@^2.0.0/dist/netlify-cms.js"></script>
  </body>
</html>
```

可以参考我的仓库文件，<https://github.com/elfgzp/elfgzp.cn/blob/master/admin/index.html>  

然后在你的首页的 `index.html` 的 `header` 增加一段 `js` 代码。这段代码的作用是在你登录你的 `cms` admin 页面之后，`netlify-identity-widget.js` 会将你重定向到首页，然后这段代码会把你带回 admin 页面。

```javascript
<header>
  <!-- ... -->
<script>
    if (window.netlifyIdentity) {
    window.netlifyIdentity.on("init", function (user) {
        if (!user) {
        window.netlifyIdentity.on("login", function () {
            document.location.href = "/admin/";
        });
        }
    });
    }
    </script>
</header>
```

### 增加一个 admin/config.yml 文件

同样在仓库根目录下创建一个 `admin/config.yml` 文件，这个文件内容看起来是这样。注意官方文档中的 `backend:name` 是 `git-gateway` ，我们需要修改成 `github`。  

```yaml
backend:
  name: github
  branch: master # 默认是 master 分支
media_folder: 'assets/uploads'
collections:
  - name: 'blog'
    label: 'Blog'
    folder: '_posts/'
    fields: # 这里这些字段对应到你写文章的 markdown 上方的一些文章属性 widget 的配置可以参考官方文档的 widget 部分
      - {label: "Layout", name: "layout", widget: "hidden", default: "post"}
      - {label: "Title", name: "title", widget: "string", tagname: "h1"}
      - {label: "Date", name: "date", widget: "datetime", format: "YYYY-MM-DD hh:mm:ss"}
      - {label: "Tags", name: "tags", widget: "string"}
      - {label: "Body", name: "body", widget: "markdown"}
```

可以参考我的仓库文件，<https://github.com/elfgzp/elfgzp.cn/blob/master/admin/config.yml>  

### 在 netlify 配置好你的仓库

在使用 Github 账号登录了 `netlify` 后，点击 「New site from Git」，如果搜索不到的话记得给你的 `netlify` 授权访问你的仓库。  

![create_a_new_site](/assets/uploads/create_a_new_site.png)

跟着指引创建，注意 `deploy` 这个部分如果你有别的 `CI` 可以将他的 `build command` 去掉。  

![create_a_new_site_2](/assets/uploads/create_a_new_site_2.png)

创建完成后，你就会在你的网站列表里面看到你的网站了。如果你有自己的域名，需要到 `Site Settings` > `Domain Management` 设置你的个人域名。  

![domain_management](/assets/uploads/domain_management.png)

### 配置 Oauth App

上面几个步骤完成后，将修改 `push` 到仓库，你已经可以在你的 `admin` 页面看到一些东西了。  

![login](/assets/uploads/login.png)

但是这个时候你点击登录肯定是登录不了的，我们还需要配置一个 Oauth App。  

首先打开你的 Github 页面，依次按步骤 `Settings` > `Developer settings` > `Oauth Apps` > `New Oauth App`。  

按照下图填好你的 Blog 信息，注意 `Authorization callback URL` 需要填 `https://api.netlify.com/auth/done`。  

![oauth_app_1](/assets/uploads/oauth_app_1.png)

然后复制好你的 `Oauth Client ID` 和 `Oauth Client Secret`。  

![oauth_app_2](/assets/uploads/oauth_app_2.png)

打开 `netlify`到 `Site Settings` > `Access control` > `Oauth - install provider`，将复制的信息粘贴进去。

![oauth_app_3](/assets/uploads/oauth_app_3.png)

完成上面的步骤就大功告成了，你就可以登录你的 Blog Admin 管理你的文章了。  

## 使用技巧

这里有一些使用的技巧想分享一下。  

### 新建一个 CMS 分支用来打草稿

因为本人加了 `CI` 所以 `push` 到 `master` 之后就会更新了，这样就不能打草稿了，所以我开了一个 `cms` 的分支。文章保存后都会 `commit` 到这个分支上，等你需要发布的时候在提交 `PR` 到 `master`。  

```yaml
backend:
  name: github
  branch: cms # 默认是 master 分支
```

### Markdown 效果预览

netlifycms 的 Markdown 预览非常的丑，我直接把他关了，代替预览的方案就是切换编辑框的 `Rich Text` 和 `Markdown` 模式。

### 在文章中添加图片

肯定有读者注意到了在增加了 `![]()` 的 Markdown 图片标签后，切换到 `Rich Text` 就可以选择上传图片了。  

## 总结

以上就是为 Github 增加 CMS 的解决方案，如果有什么问题或者有更好的解决方案，可以在下方留言。
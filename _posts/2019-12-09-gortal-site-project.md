---
layout: post
title:  'Github 上的个人项目开源心得'
date:   2019-12-09 22:00:00 +0800
tags: 'Github gortal siteproject'
color: rgb(56, 173, 216)
cover: '/assets/images/2019-12-09-gortal-site-project/github.jpeg'
subtitle: '🚪「gortal」一个使用 Go 语言开发的，超级轻量的堡垒机（跳板机）服务'
---

由于最近在 Github 发了一个个人开源项目 - [「gortal」一个使用 Go 语言开发的，超级轻量的堡垒机（跳板机）服务](https://github.com/TNK-Studio/gortal)，于是想写一篇博文来记录一下自己的开源心得。  

![gortal](/assets/images/2019-12-09-gortal-site-project/gortal.gif)

虽然不是第一次写开源项目了，但是不能放过这次写博文的热情，下一次就不知道啥时候写了。  

而且这篇文章的主要目的也是想分享一些开源的心得给读者们。  

## 产生 Idea 💡  

首先不管是个人项目还是开源项目都得有一个 Idea，我先来说说 `gortal` 这个项目的 idea 是怎么来的。  

笔者有一群热爱开源技术的小伙伴们，[TNK-Studio](https://github.com/TNK-Studio/gortal) - `technical studio` 技术小作坊。  

[@mayneyao](https://github.com/mayneyao) 同学的开源项目 [中文独立博客调研](https://github.com/TNK-Studio/zh-independent-blog-research) 需要服务器来跑爬虫，于是我们便将手上的闲置云计算资源都贡献出来。  

我想了想没准以后还会有这样的需求，于是想到了公司使用的 [jumpserver 堡垒机](https://github.com/jumpserver/jumpserver)，想在组织的其中一个服务器搭起来。  

于是就 `docker` 一把梭，两三下就跑起来了。  

结果就是，服务器卡死了 ...  

去 `jumpserver` 的官方文档看了一眼。  
> Jumpserver 环境要求：  
> 硬件配置: 2个CPU核心, 4G 内存, 50G 硬盘（最低）  
> ...  

![ni-rang-wo-shuo-dian-shen-me-hao](/assets/images/2019-12-09-gortal-site-project/ni-rang-wo-shuo-dian-shen-me-hao.jpeg)

我们闲置的云计算资源基本都是 `1 核 2 G` 的配置，这配置要求玩不起呀。  

然后搜了一下有没有其他同类型的，轻量一点的项目能拿来用，最后也是没有找到合适的。  

## 自己来造 🔧  

既然没有，那就自己来造！  

`Idea` 有了，就差程序员了，现在程序员也不缺了，就差用啥语言了。  这时候肯定是选世界上最好的语言 P ..  

![kan-zhe-wo-de-dao](/assets/images/2019-12-09-gortal-site-project/kan-zhe-wo-de-dao.jpeg)

刚开始想考虑使用自己的本命语言 `Python`，但是后来考虑到 `Go` 语言相比之下部署简单，而且不管是生成的可执行程序还是 `docker` 镜像都非常的小，于是果断选择了 `Go`。  

那么应该做成什么样子的呢，因为体验过了 `jumpserver` 的终端交互的模式，所以也想开发成相同的方式。当然为了轻量，肯定是抛弃了 `Web`，完全使用终端来交互。  

接下来就是开源的轮子选择了，当然在实现你的 Idea 的时候切忌从头到位自己做，如果有优秀的开源方案一定要拿来用，如果不满足自己的需求在针对其进行修改。在使用其中一个开源项目 [manifoldco/promptui](https://github.com/manifoldco/promptui) 的时候就发现不满足需求的地方，这时候就可以 fork 一份到自己的仓库，自己改了自己用。  

最终根据技术方案选择的轮子如下：  

* 终端交互 - [manifoldco/promptui](https://github.com/manifoldco/promptui)  

* sshd 服务开发 - [gliderlabs/ssh](github.com/gliderlabs/ssh)  

* ssh 中转客户端 - [helloyi/go-sshclient]("github.com/helloyi/go-sshclient")  

* 其他个人开源项目 - [fatih/color](github.com/fatih/color)、[op/go-logging](github.com/op/go-logging) 等等  

## 项目 To-do 📝  

啥都选好了，准备开始动手了，却发现我该从哪里开始好呢？  

这时候就需要列一个 `To-do` 了，笔者使用的是 [notion](https://www.notion.so/?r=617c987258674dbb9fc8d31f1dcc0b9d) 的笔记工具。使用看板将项目各个待实现的功能列出来，实现完一个将其拖入完成项中。  

![notion-gif](/assets/images/2019-12-09-gortal-site-project/notion.gif)  

这样不仅仅是自己可以梳理当前需要做的，而且在多人协作开发也非常有帮助。  

[Notion](https://www.notion.so/?r=617c987258674dbb9fc8d31f1dcc0b9d) 牛批！！！  

准备好 To-do 就可以正式开工了，当功能完成得差不多的时候，才是正式开始的时候。  

## 加个 CI ⚙️  

基础功能做好了，准备发布 `Release` 了，`Go` 开发的程序只需要打包成不同平台的二进制可执行文件就可以了。  

但是那么多平台，一个一个的手动 `build` 然后上传，这哪是程序员干的事，这是 `CI` - 持续集成（Continuous integration，简称CI）要干的事情。  

在开发这个项目之前，有使用过 `Travis CI`，它对 `Github` 开源项目是免费的。  但是前一段时间 `Github` 推出了 `Github Actions` 于是抱着尝尝鲜的态度就选择了它。  

它使用起来也非常的简单，点击仓库上方的 `Actions` 菜单就可以进入仓库的 `Actions` 配置页面。  

笔者在使用过程中觉得 `Github Actions` 跟 `Travis CI` 相比，其最大的优势是它的 `Marketplace`，里面有非常多开源的别人写好的 `Actions`，可以直接拿来简单修改后使用，而且这些 `Actions` 当然也是使用 `Github` 进行版本管理的。  

![github-actions](/assets/images/2019-12-09-gortal-site-project/github-actions.gif)  

如何使用这里就不做详细介绍了，感兴趣的可以查看 [Github Actions 官方文档](https://help.github.com/en/actions/automating-your-workflow-with-github-actions)。  

这里我给仓库添加了一个「创建 Release」就自动打包所有镜像的 `actions`，它的仓库地址我也放在这里 [ngs/go-release.action](https://github.com/ngs/go-release.action)。  

最后它的效果就是自动帮你打包所有平台的二进制可执行程序，并压缩上传到 `Github`。

![github-release](/assets/images/2019-12-09-gortal-site-project/github-release.png)  

## 来个 Docker 镜像 🐳  

当然一个服务怎么少的了 `Docker` 镜像，还不了解 `Docker` 的同学可以看看[阮一峰的 Docker 入门教程](http://www.ruanyifeng.com/blog/2018/02/docker-tutorial.html)，笔者觉得 `Docker` 简直就是 21 世纪程序员最伟大的发明之一。  

而且官方的 `Docker Hub` 与 `Github` 结合使用简直不能再香。  

不需要写额外的 `Github Actions` 配置或其他的 `CI` 配置文件，你只需要将你的仓库与 `Docker Hub` 仓库关联起来，当然不要忘了在你的仓库放 `Dockerfile` 文件。  

然后在 `Docker Hub` 仓库配置好自动构建镜像的逻辑，就大功告成了。  

而且 `Docker Hub` 的配置指引也做的非常好，非常容易理解。  

![docker-hub](/assets/images/2019-12-09-gortal-site-project/docker-hub.gif)  

当然这里非常非常重要的就是如果你是用的是 `Go` 语言进行开发的项目，`Docker` 镜像构建一定要分成两步。一个是编译镜像，一个是正式镜像，这样最终打包的镜像只会包含一个二进制文件，而不是将源码一起打包。  

```Dockerfile
FROM golang:1.12-alpine AS builder
# ... 省略代码

FROM alpine:latest
LABEL maintainer="Elf Gzp <gzp@741424975@gmail.com> (https://elfgzp.cn)"
COPY --from=builder /opt/gortal ./
RUN chmod +x /gortal
# ... 省略代码
```

本项目完整的 `Dockerfile` 链接如下，可以通过链接查看完整的 `Dockerfile`。  

[https://github.com/TNK-Studio/gortal/blob/master/Dockerfile](https://github.com/TNK-Studio/gortal/blob/master/Dockerfile)  

可以通过图片看到使用分两步构建和一步构建，最终打包的 `Docker` 镜像大小差异是非常大的。  

![docker-hub-2](/assets/images/2019-12-09-gortal-site-project/docker-hub-2.png)  

## 让 Readme 看着更高大上 🤪  

接下来是最重要的一步，写好 `Readme`，它是你项目的封面。 很多时候我在浏览别人的开源项目，我可能都不在乎他这个项目做了什么，但从他的 `Readme` 写的非常的好，我就给他点个 `star` ⭐️。

而且最好是能弄双语的 `Readme`，这样能让老外也能看懂，再不行就写一份中文的，剩下交给谷歌翻译。  

当然 `Readme` 最好不能都是字，要有演示的 `GIF`，这样进来的人第一眼就知道你这个项目是干啥的。  

这里笔者推荐 [LICEcap](https://www.cockos.com/licecap/) 这个工具，本片文章所有的动图都是使用这个工具录制的。  

`Readme` 写好之后，给它加上 `Badges` - 徽章 就是画龙点睛之笔了。  

![badges](/assets/images/2019-12-09-gortal-site-project/badges.png)  

`Badges` 的添加也是非常简单的，我们只需要使用这个开源项目 [shields](https://shields.io/)，并选择我们想要的徽章、填写好 URL、复制粘贴到 `Readme`，搞定。  

![shields](/assets/images/2019-12-09-gortal-site-project/shields.gif)  

复制粘贴后你会得到一个 `shields` 的链接，你只需要将链接改成 `Markdown` 的图片链接格式就可以了，[参考链接](https://raw.githubusercontent.com/TNK-Studio/gortal/master/README.md)。

## 乞讨 Star ⭐️  

项目做完了，当然不能就放着不管了，除非你的项目非常非常的优秀，否则他是不会自己涨星星的。  

以本项目为例，笔者就去 [V2EX](https://www.v2ex.com/t/626902) 分享了自己的项目，也收获了不少星星 ⭐️。

你需要去各种社区分享你的开源项目，例如：[V2EX](https://v2ex.com/go/create)、[稀土掘金](https://v2ex.com/go/create)、[segmentfault](https://segmentfault.com/) 等等。  

让你的项目给更多的人看到，同理写文章也是如此，不分享出去就没有正反馈，就少了很多动力。  

## 稍微总结一下 👻  

笔者在这片文章没有过多的去介绍项目的开发过程，因为觉得开发以外的过程更值得分享。  

开源项目不只是实现了 `Idea` 就完事了，你可能还需要去让它更加的方便维护，自动的做一些重复的事情。还要去包装它分享它，这样才会有更多的人使用。当有更多人时候的时候，这个项目就需要花时间去迭代和维护了。  
最后的最后，觉得文章还不错的，觉得这个开源项目还可以的，赏个 `star` ⭐️ 吧，[https://github.com/TNK-Studio/gortal](https://github.com/TNK-Studio/gortal)。  

![qi-tao](/assets/images/2019-12-09-gortal-site-project/qi-tao.gif)  

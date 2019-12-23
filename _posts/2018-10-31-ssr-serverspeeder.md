---
layout: post
title:  "SSR 速锐 实现科学上网，提高外网访问速度"
date:   2018-10-31 23:00:00 +0800
tags: 'SSR 速锐 vultr 科学上网 Google 技术'
color: rgb(215, 135, 160)
cover: '/assets/images/2018-10-31-ssr-serverspeeder/shadowsocksR-logo.png'
subtitle: '程序员访问 Google 解决方案'
hidden: true
---
> 本篇说明仅供交流与学习使用，请勿作出任何违反国家法律的行为。

由于最近一些同事跟朋友有遇到自己的科学上网工具不好用，速度很慢，所以分享一下自己的解决方案。

这篇解决方案教程会从云服务提供商的挑选开始，到SSR搭建和配合速锐提高外网访问速度，然后介绍一些实用的工具。

自己动手丰衣足食。

## 云服务提供商Vultr
这里给我用的这个国外的云服务提供商打个免费的广告。因为国内的很多云服务器都是按包月计费的，所以虽然购买方便，但是不会像这个提供商一样良心，按小时计费的。

在购买时有2.5刀、3.5刀跟5刀的不同选择，但是2.5刀只有ipv6所以在3.5跟5之间选择就好  
而这两个的区别主要是内存和每个月的流量，512G和1T在我的使用看来是完全够的。  
![img1](/assets/images/2018-10-31-ssr-serverspeeder/WX20181031-224742@2x.png)  
这里是注册链接[Vultr](https://www.vultr.com/?ref=6896340)。

购买之后不会立即扣费，他会按照你的使用时常按月计费。也就是说你在这个月期间不满意，销毁了服务器实例，它只会按照你的使用时长来计费。

由于我是在我朋友的服务器上部署的实例，但是需要走一下部署流程，这里我从购买开始。

这里我选择新加波的是新加波的服务器，可以按照自己习惯的使用地区来选择。  
操作系统选择的是`CentOS 7`，因为我后面的教程都是按照CentOS来部署的所以不要选错了。  
![img2](/assets/images/2018-10-31-ssr-serverspeeder/WX20181031-224302@2x.png)

购买成功后需要等待实例初始化，等初始化完成之后可以到服务器的`manage`页面查看`ssh`的用户名和密码。
![img3](/assets/images/2018-10-31-ssr-serverspeeder/WX20181031-225731@2x.png)  

## SSR - ShadowsocksR Server 部署
这里感谢[Toyo](https://doub.io/author/toyo/)为我们提供了方便的一键式安装脚本。

登陆到vultr服务器后，  
我们只需要在命令行执行：
```shell
wget -N --no-check-certificate https://raw.githubusercontent.com/ToyoDAdoubi/doubi/master/ssr.sh && chmod +x ssr.sh && bash ssr.sh
```
![gif1](/assets/images/2018-10-31-ssr-serverspeeder/gif1.gif)
然后输入`1`，选择`1. 安装 ShadowsocksR`。

然后接下来会需要配置：
> 以下配置后面可以更改  

1.SSR服务器的端口号（默认2333）
```shell
[信息] 开始设置 ShadowsocksR账号配置...
请输入要设置的ShadowsocksR账号 端口
(默认: 2333):

——————————————————————————————
	端口 : 2333
——————————————————————————————
```
2.SSR服务器密码
```shell
请输入要设置的ShadowsocksR账号 密码
(默认: doub.io):********

——————————————————————————————
	密码 : *****
——————————————————————————————
```
3.加密方式，这里我选择了`10.aes-256-cfb`  
```shell
(默认: 5. aes-128-ctr):10

——————————————————————————————
	加密 : aes-256-cfb
——————————————————————————————
```
4.协议，我选择了`origin`
```shell

(默认: 2. auth_sha1_v4):1

——————————————————————————————
	协议 : origin
——————————————————————————————
```
5.混淆
```shell

(默认: 1. plain):1

——————————————————————————————
	混淆 : plain
——————————————————————————————
```
其他的配置按照自己需求来，剩下的我都是直接回车。  
配置完成后程序会开始安装相关依赖。

安装完成后，会显示以下信息，将其中的SSR二维码链接复制到浏览器，并将显示的二维码保存下来。
![img4](/assets/images/2018-10-31-ssr-serverspeeder/WX20181031-232921@2x.png)
这里我利用`telnet`命令测试了一下`ssr`服务是否跑起来了
```shell
telnet host port
```
若`ssr`成功运行，并且没有防火墙的影响，则运行结果应该是如下：
![img5](/assets/images/2018-10-31-ssr-serverspeeder/WX20181031-234040@2x.png)

如果被防火墙影响了，解决的命令如下：
```shell
firewall-cmd --zone=public --add-port=端口号/tcp --permanent
firewall-cmd --reload
```

>SSR服务的相关命令
>启动 ShadowsocksR：`/etc/init.d/ssr start`  
>停止 ShadowsocksR：`/etc/init.d/ssr stop`  
>重启 ShadowsocksR：`/etc/init.d/ssr restart`  
>查看 ShadowsocksR状态：`/etc/init.d/ssr status`    

## SSR客户端

Windows: [C# SSR客户端](https://oss2.mzyyun.com/ssr.zip)  
Mac OS: [SSR客户端](https://oss2.mzyyun.com/SS-X-R.zip)  
IOS: [Detour - 一款低调到家的双S客户端](https://itunes.apple.com/cn/app/detour-%E4%B8%80%E6%AC%BE%E4%BD%8E%E8%B0%83%E5%88%B0%E5%AE%B6%E7%9A%84%E5%8F%8Cs%E5%AE%A2%E6%88%B7%E7%AB%AF/id1260141606?mt=8)  
安卓: [SSR客户端](https://github.com/shadowsocksr-backup/shadowsocksr-android/releases/download/3.4.0.8/shadowsocksr-release.apk)  

安装好客户端后，使用客户端的扫描二维码功能来扫描SSR服务端的二维码来添加服务器。
![img6](/assets/images/2018-10-31-ssr-serverspeeder/WX20181031-235503@2x.png)
完成以上配置后就可以访问[Google](www.google.com)了！但是还不够，我们还需要配置速锐来提高外网的访问速度。

## 速锐
关于速锐和BBR这里有一篇文章介绍，[锐速与BBR的原理简单解析](https://www.zhujiboke.com/2017/08/673.html)，这里就不做介绍了。
这一同样感谢[91yun](https://www.91yun.co/archives/683)提供的一键安装脚本。  
```shell
wget -N --no-check-certificate https://github.com/91yun/serverspeeder/raw/master/serverspeeder.sh && bash serverspeeder.sh
```
在运行后出现以下提示，则代表系统的内核不支持需要更换内核。
![gif2](/assets/images/2018-10-31-ssr-serverspeeder/gif2.gif)

```shell
rpm -ivh http://soft.91yun.org/ISO/Linux/CentOS/kernel/kernel-3.10.0-229.1.2.el7.x86_64.rpm --force
```
输入命令安装完内核后，查看是否安装成功
```shell
rpm -qa | grep kernel
```
![img7](/assets/images/2018-10-31-ssr-serverspeeder/WX20181101-001310@2x.png)
重启服务器
```shell
reboot
```
重启成功后再次输入一键安装脚本命令，安装成功后结果如下：
![img8](/assets/images/2018-10-31-ssr-serverspeeder/WX20181101-001637@2x.png)
由于更换了内核的原因，`CentOS`的防火墙启动了，需要执行上文提到的防火墙端口开放命令来保证`ssr`服务的正常链接。

接下来我们使用[speedtest](http://www.speedtest.net/zh-Hans)进行测速，我家是百兆光纤，测速结果一目了然。
![img9](/assets/images/2018-10-31-ssr-serverspeeder/WX20181101-002619@2x.png)

## Proxy SwitchyOmega
>  方便的使用SSR客户端，不用切换全局代理  

`Proxy SwitchyOmega`是一款谷歌浏览器的插件，[链接](https://chrome.google.com/webstore/detail/proxy-switchyomega/padekgcemlokbadohgkifijomclgjgif)

它可以方便的定义访问规则，那些需要走代理，哪些不需要。

## 总结
以上就是`程序员访问Google解决方案`的主要内容。   
*`工欲善其事，必先利其器`*


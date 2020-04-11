---
layout: post
title: 「K8s 学习日记」Kubeadm 部署 kubernetes 集群
subtitle: 在 Vultr 上部署 kubernetest 集群
cover: /assets/uploads/v2-582b2a32df399cc3f40ef62fd099e438_1200x500.jpg
date: '2020-04-11 01:00:01'
tags: K8s Kubernetes Vultr
color: 'rgb(37, 126, 235)'
---
最近在学习 `kubernetest` 但是 Google 上有非常多的教程关于如何部署 `kubernetes`。

原本是想在自己买的 `JD` 和 `HUAWEI` 的 `ECS` 上面部署的，但是折腾了很久无果。无奈还是选用同一个云服务商提供的 ECS，在有 `VPC` 的条件下部署会更方便。

## ECS 配置选择

由于只是学习，笔者就不部署高可用的 `k8s` 集群了，所以准备一台 `Master` 和 `Node` 节点。  

由于 `Master` 至少需要 2 个 CPU 核心。这里选择了 `Vultr` 上 `2 核 4G 内存` 配置的 `ECS`。

![2c4g](/assets/uploads/wx20200411-125004-2x.png)

`Node` 节点配置当然是内存越大越好，当然只是处于学习的目的，这里就选择与 `Master` 相同的配置。  

国外的云服务厂商一般是没有带宽限制的，一般是按照流量计算的，这个配置有 `3T` 的流量是肯定够的。  

然后他的收费模式是按小时计算的这个配置 `0.03 $ / h` 相当于 `0.21 ¥ / h`，也就是每小时两毛钱！就算你用一天也就四块钱。   

笔者打算在学习 `k8s` 的时候在部署两个实例，不用了直接销毁，岂不美哉。  

新用户的话还能免费到账 `100 $` ，这里是邀请的连接 [Vultr Give $100](https://www.vultr.com/?ref=8382877-6G)，要是觉得还不错的话可以试试，笔者是真的觉得他们的服务还不错，所以给他们打个广告。  

这里选择两个`Singapore 新加坡` `CentOS 7 Without SELinux` 的实例。  

`SELinux` 是 `Linux` 下的一个安全相关的软件，为了方便学习和部署，我们直接关闭它，所以选择 `Without SELinux` 就准备开始部署了。  

注意在 `Additional Features` 处勾选 `Enable Private Networking`，让 `Vultr` 为你的服务器分配内网 `IP`。

在 `Deploy Now` 之前将 `Servers Qty` 增加为 `2` ，这样就不用反复打开部署页面了，直接部署两个实例。  

别被这 `$20.00 /mo` 吓到了，这是每月 `$20`，我们只需要用完了及时销毁就好，而且新用户赠送的 `100$` 可以用很久了。

## ECS 环境配置

部署完成两个实例后，就可以在 `Instances` 列表找到他们。  （考虑到没有使用过云服务的读者，这里笔者讲详细一点。）

![ins2](/assets/uploads/wx20200411-132424-2x.png)

在点进这个实例可以在 `Overview` 找到他的登录账号密码，默认用户是 `root`。  

然后在 `Settings` 可以看到这两个实例的内网 `IP`。  

这里笔者的两个实例的内网如下：

|  实例   |核心数| 内存|内网 IP  |
|  ----  | --- |------|----  |
| Master  | 2 |  4G   |10.40.96.4 |
| Node    | 2 |  4G   |10.40.96.5 |

接下来就正式开始了，不过 `ssh` 进入系统后还需要做一些准备工作。  


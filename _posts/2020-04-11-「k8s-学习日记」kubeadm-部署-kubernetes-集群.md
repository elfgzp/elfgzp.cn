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

| 实例     | 核心数 | 内存  | 内网 IP      |
| ------ | --- | --- | ---------- |
| Master | 2   | 4G  | 10.40.96.4 |
| Node   | 2   | 4G  | 10.40.96.5 |

接下来就正式开始了，不过 `ssh` 进入系统后还需要做一些准备工作。  

## K8s 部署准备工作
首先避免不必要的麻烦，先关闭 `CentOS 7` 的防火墙，因为本身云服务厂商会有安全组，我们也可以通过配置安全组来实现网络安全防护。  

```bash
systemctl disable firewalld && systemctl stop firewalld
```

若是前面在部署实例的时候没有选择 `Without SELinux` 这里则需要让容器可以访问主机文件，需要输入以下命令。  

```bash
# 将 SELinux 设置为 permissive 模式（相当于将其禁用）
setenforce 0
sed -i 's/^SELINUX=enforcing$/SELINUX=permissive/' /etc/selinux/config
```

我们还需要关闭 swap，至于为什么感兴趣可以去搜一下。  

```bash
swapoff -a
```

确保在 `sysctl` 配置中的 `net.bridge.bridge-nf-call-iptables` 被设置为 1。

```bash
cat <<EOF >  /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-ip6tables = 1
net.bridge.bridge-nf-call-iptables = 1
EOF
sysctl --system
```

确保已加载了 `br_netfilter` 模块。这可以通过运行 `lsmod | grep br_netfilter` 来完成。要显示加载它，请调用 `modprobe br_netfilter`。

```bash
modprobe br_netfilter
lsmod | grep br_netfilter
```

安装 `docker`：

```bash
yum install -y docker
systemctl enable docker && systemctl start docker
```

笔者已经将上述步骤做成了脚本，可以查看 [https://gist.github.com/elfgzp/02485648297823060a7d8ddbafebf140#file-vultr_k8s_prepare-sh](https://gist.github.com/elfgzp/02485648297823060a7d8ddbafebf140#file-vultr_k8s_prepare-sh)。  
为了快速进入下一步可以执行以下命令直接跳过准备操作。  

```bash
curl https://gist.githubusercontent.com/elfgzp/02485648297823060a7d8ddbafebf140/raw/781c2cd7e6dba8f099e2b6b1aba9bb91d9f60fe2/vultr_k8s_prepare.sh | sh
```

## 安装 Kubeadm

接下来的步骤可以完全参考官方文档来了，[官方文档链接](https://kubernetes.io/zh/docs/setup/production-environment/tools/kubeadm/install-kubeadm/)。

```bash
# 配置 yum 源
cat <<EOF > /etc/yum.repos.d/kubernetes.repo
[kubernetes]
name=Kubernetes
baseurl=https://packages.cloud.google.com/yum/repos/kubernetes-el7-x86_64
enabled=1
gpgcheck=1
repo_gpgcheck=1
gpgkey=https://packages.cloud.google.com/yum/doc/yum-key.gpg https://packages.cloud.google.com/yum/doc/rpm-package-key.gpg
EOF

# 安装 kubelet kubeadm kubectl
yum install -y kubelet kubeadm kubectl --disableexcludes=kubernetes

# 启动 kubelet
systemctl enable --now kubelet
```

由于 `Vultr` 是国外的云主机，所以我们根本不用考虑 `Google` 的访问问题，但是如果是国内的主机需要将 `yum` 源的 `repo` 修改为以下配置。  

```bash
cat << EOF > /etc/yum.repos.d/kubernetes.repo
[kuebrnetes]
name=KubernetesRepository
baseurl=http://mirrors.aliyun.com/kubernetes/yum/repos/kubernetes-el7-x86_64/
enabled=1
gpgcheck=0
EOF
```

上述操作的脚本，[https://gist.github.com/elfgzp/02485648297823060a7d8ddbafebf140#file-vultr_k8s_install_kubeadm-sh](https://gist.github.com/elfgzp/02485648297823060a7d8ddbafebf140#file-vultr_k8s_install_kubeadm-sh)。

```bash
curl https://gist.githubusercontent.com/elfgzp/02485648297823060a7d8ddbafebf140/raw/#/vultr_k8s_prepare.sh | sh
```

## 使用 Kubeadm 创建 k8s 集群

### 创建 k8s Master 节点

我们首先要在 `Master` 的实例上执行 `kubeadm`。但是我们先使用 `kubeadm config print init-defaults` 来看看它的默认初始化文件。  

```bash
kubeadm config print init-defaults
```

当然你也可以生成一个配置文件后，指定配置文件进行初始化：
```bash
kubeadm config print init-defaults > kubeadm.yaml
# 修改 kubeadm.yml
kubeadm init --config kubeadm.yaml
```

如果初始化失败可以执行以下命令，进行重制：

```bash
kubeadm reset
rm -rf $HOME/.kube/config
rm -rf /var/lib/cni/
rm -rf /etc/kubernetes/
rm -rf /etc/cni/
ifconfig cni0 down
ip link delete cni0
```

接下来直接执行 `kubeadm init` 进行初始化，国内的主机可能需要修改 `imageRepository` 的配置，来修改 `k8s` 的镜像仓库。

```bash
cat <<EOF > kubeadm.yaml
apiVersion: kubeadm.k8s.io/v1beta2
kind: ClusterConfiguration
apiServer:
    extraArgs:
        runtime-config: "api/all=true"
kubernetesVersion: "v1.18.1"
imageRepository: registry.aliyuncs.com/google_containers
EOF
kubeadm init --config kubeadm.yaml
```

执行完成后，我们会得到以下输出：
```
Your Kubernetes control-plane has initialized successfully!

To start using your cluster, you need to run the following as a regular user:

  mkdir -p $HOME/.kube
  sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
  sudo chown $(id -u):$(id -g) $HOME/.kube/config

You should now deploy a pod network to the cluster.
Run "kubectl apply -f [podnetwork].yaml" with one of the options listed at:
  https://kubernetes.io/docs/concepts/cluster-administration/addons/

Then you can join any number of worker nodes by running the following on each as root:

kubeadm join {你的IP}:6443 --token 3prn7r.iavgjxcmrlh3ust3 \
    --discovery-token-ca-cert-hash sha256:95283a2e81464ba5290bf4aeffc4376b6d708f506fcee278cd2a647f704ed55d
```

按照他的提示，我们将 `kubectl` 的配置放到 `$HOME/.kube/config` 下，注意每次执行完成 `kubeadm init` 之后，配置文件都会变化，所以需要重新复制。`kubeadm` 还会输出 join 命令的配置信息，用于 `Node` 加入集群。  

```bash
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
```

如果你们是使用 `root` 用户的话，可以直接利用环境变量指定配置文件：  

```bash
echo 'export KUBECONFIG=/etc/kubernetes/admin.conf' >> ~/.bashrc
. ~/.bashrc
```

接下来使用 `kubectl get nodes` 来查看节点的状态：  

```bash
NAME          STATUS     ROLES    AGE   VERSION
vultr.guest   NotReady   master   1m   v1.18.1
```

此时的状态为 `NotReady` 当然这个状态是对的，因为我们还没有安装网络插件。接下来安装网络插件，这里是用的是 `Weave` 网络插件：  

```bash
kubectl apply -f "https://cloud.weave.works/k8s/net?k8s-version=$(kubectl version | base64 | tr -d '\n')"
```

还有其他的网络插件可以参考官方文档，[Installing a Pod network add-on](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/#pod-network)。  

可以通过查看 `Pods` 状态查看是否安装成功：  

```bash
kubectl get pods -A
NAMESPACE     NAME                       READY   STATUS    RESTARTS   AGE
kube-system   coredns-66bff467f8-br94l   1/1     Running   0          14m
kube-system   coredns-66bff467f8-pvsfn   1/1     Running   0          14m
kube-system   kube-proxy-b2phr           1/1     Running   0          14m
kube-system   weave-net-8wv4k            2/2     Running   0          2m2s
```

如果发现 `STATUS` 不是 `Running` 可以通过，`kubectl logs` 和 `kubectl describe` 命令查看详细的错误信息。  

```bash
kubectl logs weave-net-8wv4k -n kube-system weave
kubectl logs weave-net-8wv4k -n kube-system weave-npc
kubectl describe pods weave-net-8wv4k -n kube-system 
```

此时的 `Master` 节点状态就变为 `Ready` 了。  

```bash
NAME          STATUS   ROLES    AGE   VERSION
vultr.guest   Ready    master   22m   v1.18.1
```

### 部署 `Node` 节点

部署 `Node` 节点同样需要「准备阶段」的工作，这里就不一一讲解了，直接执行脚本：  

```bash
curl https://gist.githubusercontent.com/elfgzp/02485648297823060a7d8ddbafebf140/raw/781c2cd7e6dba8f099e2b6b1aba9bb91d9f60fe2/vultr_k8s_prepare.sh | sh
```

我们需要执行 `kubeadm` 在 `Master` 节点初始化后输出的 `join` 命令。如果不记得了，可以通过在 `Master` 执行以下命令重新获得 `join` 命令。  

```bash
kubeadm token create --print-join-command
kubeadm join {你的IP}:6443 --token m239ha.ot52q6goyq0pcadx     --discovery-token-ca-cert-hash sha256:95283a2e81464ba5290bf4aeffc4376b6d708f506fcee278cd2a647f704ed55d
```

若加入时出现问题同样可以使用 `kubeadm rest` 来重置。
```bash
kubeadm reset
```

当然 `join` 命令也是可以提供配置文件的，我们只需要在 `Node` 上执行以下命令就可以生成默认配置文件了。  

```bash
kubeadm config print join-defaults > kubeadm-join.yaml
kubeadm join --config kubeadm-join.yaml
```

接下来执行 `kubeadm join` 来加入集群会发现如下错误，是因为节点名称 vultr.guest 已经存在了：

```bash
a Node with name "vultr.guest" and status "Ready" already exists in the cluster. You must delete the existing Node or change the name of this new joining Node
To see the stack trace of this error execute with --v=5 or higher
```

可以通过 `--node-name` 来指定 `node` 的名称：

```bash
kubeadm join {你的 IP}:6443 --token m239ha.ot52q6goyq0pcadx     --discovery-token-ca-cert-hash sha256:95283a2e81464ba5290bf4aeffc4376b6d708f506fcee278cd2a647f704ed55d --node-name vultr.guest2
```

然后再次通过 `kubectl` 查看 `nodes` 状态，如果希望在 `Node` 节点上执行的话，需要将 `Master` 上的 `/etc/kubernetes/admin.conf` 复制到 `Node` 节点上。  

接下来我们验证 `Node` 的状态为 `Ready` 则加入成功：

```bash
kubectl get nodes
NAME           STATUS   ROLES    AGE   VERSION
vultr.guest    Ready    master   42m   v1.18.1
vultr.guest2   Ready    <none>   34s   v1.18.1
```

## 


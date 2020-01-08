---
layout: post
title:  "Travis CI  Jekyll  Docker 自动化部署博客到云服务器"
date:   2018-10-02 18:00:00 +0800
tags: 'Travis Jekyll Docker 技术 Linux'
color: rgb(92,167,96)
cover: '/assets/images/2018-10-02-travis-jekyll-docker/WX20181002-174437@2x-squashed.png'
subtitle: '解决Github pages百度爬虫被禁用'
---
> 本篇文章讲解了如何利用云Travis CI  Jekyll  Docker 自动化部署博客到云服务器，从而解决Github pages百度爬虫禁用的问题。
>
> 本文章不包含Github pages 如何配置，相信Google上有类似的文章就不说明了

## Jekyll Docker 容器构建

在开始`Jekyll`容器构建之前，先说一下我用的是一款叫[HardCandy-Jekyll](https://github.com/xukimseven/HardCandy-Jekyll)的主题，作者是[xukimseven](https://github.com/xukimseven)。  

这款主题非常简洁清新，而且对移动端也有适配，在这里也感谢这位作者开源这个主题。  

在依照作者提供的部署说明在自己的仓库部署好该主题后，在仓库下先新建一个`Dockerfile`文件用于容器构建，`Dockerfile`文件内容如下。  

```dockerfile
FROM ruby:latest
RUN gem sources --add https://gems.ruby-china.com/ --remove https://rubygems.org/
RUN gem install jekyll bundler
COPY . /blog/
RUN bundle config mirror.https://rubygems.org https://gems.ruby-china.com
RUN cd blog \
         && bundler install
WORKDIR /blog
CMD bundle exec jekyll serve --host 0.0.0.0
```

文件内容主要是使用`ruby`容器为基础，用`gem`命令安装`jekyll`和`bundler`，由于国内使用国外的`gem`源比较慢，所以我将源替换为`gems.ruby-china.com`。

### Centos 安装Docker CE

> 在安装前确保linux内核版本是3.10以上并且是64位的centos版本。如果不能满足这个前提，建议看官的教程。

1. 升级yum  
```shell
sudo yum update
```
2. 安装Docker CE  
```shell
sudo yum -y install docker
```
在安装完`docker`后，还需要配置免`sudo`使用`docker`命令，步骤如下：
```shell
sudo groupadd docker
sudo gpasswd -a gzp docker # gzp为我的用户名
sudo service docker restart
newgrp - docker
```
运行完后重新打开`ssh`会话。
### 使用Dockerfile构建容器并运行Jekyll
1. 使用Dockerfile构建容器
```shell
 docker build -t elfgzp.github.io . # elfgzp.github.io为我的容器名称
```
运行结果如下：
```shell
Sending build context to Docker daemon  203.5MB
Step 1/8 : FROM ruby:latest
 ---> eb8759981348
Step 2/8 : RUN gem sources --add https://gems.ruby-china.com/ --remove https://rubygems.org/
 ---> Using cache
 ---> 9825055ad6ed
Step 3/8 : RUN gem install jekyll bundler
 ---> Using cache
 ---> 1f6bad52f4e4
Step 4/8 : COPY . /blog/
 ---> e252fdb8d16a
Step 5/8 : RUN bundle config mirror.https://rubygems.org https://gems.ruby-china.com
 ---> Running in aeb0a7c21689
Removing intermediate container aeb0a7c21689
 ---> 2a3944c701f0
Step 6/8 : RUN cd blog          && bundler install
 ---> Running in 494cbc520804
Fetching gem metadata from https://gems.ruby-china.com/...........
Fetching public_suffix 3.0.2
Installing public_suffix 3.0.2
Using addressable 2.5.2
Using bundler 1.16.5
Using colorator 1.1.0
Using concurrent-ruby 1.0.5
Using eventmachine 1.2.7
Using http_parser.rb 0.6.0
Using em-websocket 0.5.1
Fetching ffi 1.9.23
Installing ffi 1.9.23 with native extensions
Using forwardable-extended 2.6.0
Using i18n 0.9.5
Using rb-fsevent 0.10.3
Using rb-inotify 0.9.10
Using sass-listen 4.0.0
Fetching sass 3.5.6
Installing sass 3.5.6
Using jekyll-sass-converter 1.5.2
Using ruby_dep 1.5.0
Using listen 3.1.5
Using jekyll-watch 2.0.0
Fetching kramdown 1.16.2
Installing kramdown 1.16.2
Using liquid 4.0.0
Using mercenary 0.3.6
Using pathutil 0.16.1
Fetching rouge 3.1.1
Installing rouge 3.1.1
Using safe_yaml 1.0.4
Fetching jekyll 3.8.1
Installing jekyll 3.8.1
Fetching jekyll-feed 0.9.3
Installing jekyll-feed 0.9.3
Fetching jekyll-seo-tag 2.4.0
Installing jekyll-seo-tag 2.4.0
Fetching minima 2.5.0
Installing minima 2.5.0
Bundle complete! 4 Gemfile dependencies, 29 gems now installed.
Bundled gems are installed into `/usr/local/bundle`
Removing intermediate container 494cbc520804
 ---> c5cadba1e55e
Step 7/8 : WORKDIR /blog
 ---> Running in ccff546be8e0
Removing intermediate container ccff546be8e0
 ---> 70d0f72ed6b1
Step 8/8 : CMD bundle exec jekyll serve --host 0.0.0.0
 ---> Running in ae3fd7719de5
Removing intermediate container ae3fd7719de5
 ---> e9973d4dac75
Successfully built e9973d4dac75
Successfully tagged elfgzp.github.io:latest
```

2. 构建成功后测试Jekyll是否能够运行
```shell
docker run -d -p 4000:4000 elfgzp.github.io
```
运行后使用`docker ps`查看容器是否成功运行，或者使用`curl http://127.0.0.1:4000`访问`4000`端口。

### 使用docker-compose来运行容器

由于我们要实现自动化构建和运行容器，这里使用了`docker-compose`

#### Centos 安装 docker-compose
```shell
sudo yum -y install epel-release
sudo yum -y install python-pip
pip install docker-compose
```

#### 编写docker-compose.yml
`docker-compose.yml`的内容非常简单，内容如下：
```yml
version: '3'
services:
  blog:
    build:
      context: .
      dockerfile: Dockerfile
    image: elfgzp.github.io:latest # 这里是我镜像的名字
    network_mode: host
```
#### 使用docker-compose构建并运行容器
这里将更新代码的`git pull`命令也加进去了，运行代码如下：
```
git pull origin master && \
docker-compose build && \
docker-compose down && \
docker-compose up -d
```
运行后会从`git`仓库拉取最新的代码，并根据`Dockerfile`进行容器构建，并且重启容器。

到这里我们已经可以直接使用上面的命令拉取最新的代码，并且能够构建运行新的容器，我们只剩下一个自动触发这个命令的工具，这里就需要用到`Travis`，接下来我会讲解`Travis`如何使用。



## Travis 配置和使用

首先我们需要注册一个[Travis](https://travis-ci.org)账号，并且关联`Github`。

1. 在创建好账号并关联`Github`后，需要添加你的`Github pages`仓库。  
  ![img2](/assets/images/2018-10-02-travis-jekyll-docker/WX20181003-002426@2x.png)

2. 在添加好后进入仓库的设置，点击仓库右边的`more action`，并选择`settings`。
  ![img3](/assets/images/2018-10-02-travis-jekyll-docker/WX20181003-002806@2x.png)

3. 然后需要从`Github`获取一个`DEPLOY_TOKEN`，步骤如下：

   1. 进入`Github`设置页面，点击`Developer Settings`

      ![WX20181003-003201@2x.png](/assets/images/2018-10-02-travis-jekyll-docker/WX20181003-003201@2x.png)

   2. 然后在点击`Personal access tokens`，在点击右上角的`Generate new token`

      ![WX20181003-003247@2x.png](/assets/images/2018-10-02-travis-jekyll-docker/WX20181003-003247@2x.png)

   3. 输入生成的`token`名称，然后勾选`admin:public_key, admin:repo_hook, repo`

      ![WX20181003-003327@2x.png](/assets/images/2018-10-02-travis-jekyll-docker/WX20181003-003327@2x.png)

   4. 最后将成的`DEPLOY_TOKEN`填入`Travis`的`Environment Variables`中

      ![WX20181003-021647@2x.png](/assets/images/2018-10-02-travis-jekyll-docker/WX20181003-021647@2x.png)

4. 最后我们还需要配置`Travis`远程登陆我们云服务器的`ssh key`

   1. 首先需要在本地生成`id_ras_deploy`和`id_ras_deploy.pub`

      ```shell
      ssh-keygen -t rsa -C "deploy_key" -f ~/.ssh/id_ras_deploy
      ```

   2. 然后将生成的`id_ras_deploy.pub`复制到云服务器中

      ```shell
      ssh-copy-id -i ~/.ssh/id_ras_deploy.pub  gzp@cloud.elfgzp.cn # 我的服务器域名
      ```

   3. 在仓库中创建`ssh_config`文件，内容如下

      ```
      Host cloud.elfgzp.cn
          HostName cloud.elfgzp.cn
          StrictHostKeyChecking no
          User gzp
          IdentityFile ~/.ssh/id_ras_deploy
      ```

   4. 最后在安装好`Travis`，运行命令

      ```shell
      gem install travis
      travis login --auto  # 注意这里登陆会要求输入Github账号密码，账号是邮箱不是用户名
      touch .travis.yml
      travis encrypt-file ~/.ssh/id_ras_deploy --add
      ```

   5. 会在生成的`.travis.yml`中看到

      ```yml
      before_install:
      - openssl aes-256-cbc -K $encrypted_f91baf41390f_key -iv $encrypted_f91baf41390f_iv
        -in id_ras_deploy.enc -out ~/.ssh/id_ras_deploy -d 
      ```

      注意`~/.ssh`有可能为`~\/.ssh `需要去掉` \`

   6. 我们还需要在`after_success`中加入成功之后访问云服务器执行响应的操作更新容器并运行

      ```yml
      after_success:
      - ssh gzp@cloud.elfgzp.cn "cd ~/workspace/elfgzp.github.io && source ~/.zshrc  && git pull origin master
        && docker-compose build && docker-compose down && docker-compose up -d"
      ```

      注意这里我使用的是`zsh`所以配置是`~/.zshrc`，如果使用的是默认的`bash`，请使用`~/.bashrc`

      最后的`.travis`文件格式如下：

      ```yml
      language: ruby
      rvm:
      - 2.3.3
      addons:
        ssh_known_hosts: cloud.elfgzp.cn
      before_install:
      - openssl aes-256-cbc -K $encrypted_f91baf41390f_key -iv $encrypted_f91baf41390f_iv
        -in id_ras_deploy.enc -out ~/.ssh/id_ras_deploy -d
      - chmod 600 ~/.ssh/id_ras_deploy
      - cp ssh_config ~/.ssh/config
      script:
      - bundle install
      - bundle exec jekyll build
      after_success:
      - ssh gzp@cloud.elfgzp.cn "cd ~/workspace/elfgzp.github.io && source ~/.zshrc  && git pull origin master
        && docker-compose build && docker-compose down && docker-compose up -d"
      branches:
        only:
        - master
      env:
        global:
        - NOKOGIRI_USE_SYSTEM_LIBRARIES=true
      ```

      大功告成，最后我们只需要把代码提交到`master`分支，然后到`Travis`中查看代码的`build`结果，如果成功则最后的结果应该与运行`docker-compose`的结果相同。

## 总结

在网上其实还有很多通过`coding pages`与`github pages`同步的方式来解决百度爬虫被禁用的问题，之所以我会选择这种方式，因为这种方式能学到更多使用的技术知识。



希望看完本文章由收获的别忘了给我留言哦。

## 参考文章
> [centos安装docker,docker-compose](https://www.jianshu.com/p/dbc0fb6e9149)  
> [基于Docker搭建Jekyll并实现自动部署](https://xxblog.cn/2018/01/Run-jekyll-based-docker-and-auto-deployment/)  
> [Jekyll + Travis CI 自动化部署博客](https://mritd.me/2017/02/25/jekyll-blog-+-travis-ci-auto-deploy/)  
> [Travis-ci远程部署到服务器](https://blog.csdn.net/sp1206/article/details/80430493)  
> [使用travis自动部署hexo日志](https://blog.tomyail.com/writing-hexo-blog-with-travis-ci/)  
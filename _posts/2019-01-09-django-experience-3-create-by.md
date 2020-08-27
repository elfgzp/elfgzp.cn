---
# layout: post
title:  'Django 使用心得 （三）利用 middleware 和 signal 实现数据的 「create_by」 记录功能'
date:   2019-01-09 13:30:00 +0800
tags: 'Django'
color: rgb(222, 11, 123)
cover: '/assets/images/2019-01-09-django-experience-3-create-by/django-exp-3.png'
subtitle: 'middleware 与 signal 使用小技巧'
---
记录数据的创建者和更新者是一个在实际项目中非常常见的功能，但是若是在每个接口都增加这个业务逻辑就很不 Pythonic。

笔者在 Google 上无意发现了一种非常巧妙的实现方式，在这里分享给大家。  

## Middleware 代码实现
在做了一些小修小改，处理掉了一些代码的版本问题后，最终的代码如下，我们一起来看看它是怎么实现的。

{% github_sample_ref /elfgzp/django_experience/blob/b896f97029f4eb371aef3ed369e601e3817145b6/create_by/middleware.py %}
```python
from django import conf
from django.db.models import signals
from django.core.exceptions import FieldDoesNotExist
from django.utils.deprecation import MiddlewareMixin
from django.utils.functional import curry


class WhoDidMiddleware(MiddlewareMixin):
    def process_request(self, request):
        if request.method not in ('GET', 'HEAD', 'OPTIONS', 'TRACE'):
            if hasattr(request, 'user') and request.user.is_authenticated:
                user = request.user
            else:
                user = None

            mark_whodid = curry(self.mark_whodid, user)
            signals.pre_save.connect(mark_whodid, dispatch_uid=(self.__class__, request,), weak=False)

    def process_response(self, request, response):
        if request.method not in ('GET', 'HEAD', 'OPTIONS', 'TRACE'):
            signals.pre_save.disconnect(dispatch_uid=(self.__class__, request,))
        return response

    def mark_whodid(self, user, sender, instance, **kwargs):
        create_by_field, update_by_field = conf.settings.CREATE_BY_FIELD, conf.settings.UPDATE_BY_FIELD

        try:
            instance._meta.get_field(create_by_field)
        except FieldDoesNotExist:
            pass
        else:
            if not getattr(instance, create_by_field):
                setattr(instance, create_by_field, user)

        try:
            instance._meta.get_field(update_by_field)
        except FieldDoesNotExist:
            pass
        else:
            setattr(instance, update_by_field, user)
```

通过 `WhoDidMiddleware` 这个类继承了 `MiddlewareMixin` 我们可以知道他的主要是通过 Django 的 `middleware` 来实现记录 create_by（数据修改者）的。  

```python
...

class WhoDidMiddleware(MiddlewareMixin):
...
```

由于 Django 调用到达模型层后，我们就无法获取到当前 request（请求）的用户，所以一般做法是在是视图层在创建数据的时候将 request 所对应的用户直接传递给模型，
用于创建数据。  

这里的 middleware 是用于处理 request，那么 request的用户该如何传递下去呢，我们继续看代码，这里出现了 signal（信号）。  
  
```python
...
signals.pre_save.connect(mark_whodid, dispatch_uid=(self.__class__, request,), weak=False)
...
```

Signal 在 Django 中常用来处理`在某些数据之前我要做一些处理`或者`在某些数据处理之后我要执行些逻辑`等等的业务需求。例如：  

```python
class Book(models.Model):
    name = models.CharField(max_length=32)
    author = models.ForeignKey(to=Author, on_delete=models.CASCADE, null=False)
    remark = models.CharField(max_length=32, null=True)

...

@receiver(pre_save, sender=Book)
def generate_book_remark(sender, instance, *args, **kwargs):
    print(instance)
    if not instance.remark:
        instance.remark = 'This is a book.'
```

### Signal connect 中的参数
那么在这里他又是如何使用的呢，我们需要去看看 Django 源码中 signals.pre_save.connect 这个函数的定义和参数。
{% github_sample_ref /django/django/blob/e90af8bad44341cf8ebd469dac57b61a95667c1d/django/dispatch/dispatcher.py %}

```python
    def connect(self, receiver, sender=None, weak=True, dispatch_uid=None):
        """
        Connect receiver to sender for signal.

        Arguments:

            receiver
                A function or an instance method which is to receive signals.
                Receivers must be hashable objects.

                If weak is True, then receiver must be weak referenceable.

                Receivers must be able to accept keyword arguments.

                If a receiver is connected with a dispatch_uid argument, it
                will not be added if another receiver was already connected
                with that dispatch_uid.

            sender
                The sender to which the receiver should respond. Must either be
                a Python object, or None to receive events from any sender.

            weak
                Whether to use weak references to the receiver. By default, the
                module will attempt to use weak references to the receiver
                objects. If this parameter is false, then strong references will
                be used.

            dispatch_uid
                An identifier used to uniquely identify a particular instance of
                a receiver. This will usually be a string, though it may be
                anything hashable.
        """
        ...
```

这里稍微解释一下每个参数的含义：

* `receiver` 接收到此信号回调函数
* `sender` 这个信号的发送对象，若为空则可以为任意对象
* `weak` 是否将 receiver 转换成 弱引用对象，Signal 中默认 会将所有的 receiver 转成弱引用，所以 如果你的receiver是个局部对象的话，
那么receiver 可能会被垃圾回收期回收，receiver 也就变成一个 dead_receiver 了，Signal 会在 connect 和 disconnect 方法调用的时候，清除 dead_receiver。
* `dispatch_uid` 这个参数用于唯一标识这个 receiver 函数，主要的作用是防止 receiver 函数被注册多次。

## Middleware 代码分析

接下来我们一步步来分析 Middleware 中的代码

### process_request 函数代码分析

当一个客户端请求来到服务器并经过 WoDidMiddleware 时，首先 request 会进入 `process_request` 函数。

#### 提取 request 中的 user
依照 RestFul 规范，我们先把非数据修改的方法都过滤掉，然后取出请求中的 user。

{% github_sample_ref /elfgzp/django_experience/blob/b896f97029f4eb371aef3ed369e601e3817145b6/create_by/middleware.py %}
```python
def process_request(self, request):
    if request.method not in ('GET', 'HEAD', 'OPTIONS', 'TRACE'):
        if hasattr(request, 'user') and request.user.is_authenticated:
            user = request.user
        else:
            user = None
    ...
```

#### mark_whodid 函数代码分析
然后我们对 `mark_whodid` 函数做一些处理，在说明做了什么处理之前，我们先看看 mark_whodid 函数实现了什么逻辑。  

{% github_sample_ref /elfgzp/django_experience/blob/b896f97029f4eb371aef3ed369e601e3817145b6/create_by/middleware.py %}
```python
...
def mark_whodid(self, user, sender, instance, **kwargs):
    create_by_field, update_by_field = conf.settings.CREATE_BY_FIELD, conf.settings.UPDATE_BY_FIELD

    try:
        instance._meta.get_field(create_by_field)
    except FieldDoesNotExist:
        pass
    else:
        if not getattr(instance, create_by_field):
            setattr(instance, create_by_field, user)

    try:
        instance._meta.get_field(update_by_field)
    except FieldDoesNotExist:
        pass
    else:
        setattr(instance, update_by_field, user)
...
```

这段代码非常的容易理解，主要功能就是根据 settings 中设置的 `CREATE_BY_FIELD` 和 `UPDATE_BY_FIELD`（创建者字段和更新者字段）的名称，
对 instance（数据对象实例）的对应的字段附上用户值。  


#### curry 函数的作用

让我们回到 process_request 这个函数，这里对 mark_whodid 函数做了一个处理。

{% github_sample_ref /elfgzp/django_experience/blob/b896f97029f4eb371aef3ed369e601e3817145b6/create_by/middleware.py %}
```shell
...
mark_whodid = curry(self.mark_whodid, user)
...
```

我这里通过一个简单的代码例子解释一下 `curry` 函数的作用。

```plain
>>> from django.utils.functional import curry
>>> def p1(a, b, c):
…     print a, b, c
>>> p2 = curry(a, ‘a’, ‘b’)
>>> p2(‘c’)
a b c
```

其实 curry 实现了类似装饰器的功能，他将 p1 函数的参数通过 curry 函数设置了两个默认值 'a' 和 'b' 分别按顺序赋值给 a 和 b，产生了一个新的函数 p2。
这样相当于我们如果要调用 p1 函数只想传入 c 参数但是 a 和 b 参数并没有设置默认值，我们就可以用 curry 函数封装成一个新的函数 p2 来调用。  

所以上面的代码中，我们将 mark_whodid 的 user 参数的默认值设置为从 request 中获取的 user，并且再次生成一个 mark_whodid 函数。  

#### 注册 signal

从代码我们可以知道 connect 函数传入了 receiver、dispatch_uid 和 weak 参数，每个参数的作用上文中已经说明了，sender 参数为空则所有 `models` 的
pre_save（在数据保存之前）都会触发 receiver，也就是我们的 mark_whodid 函数。

{% github_sample_ref /elfgzp/django_experience/blob/b896f97029f4eb371aef3ed369e601e3817145b6/create_by/middleware.py %}
```shell
...
signals.pre_save.connect(mark_whodid, dispatch_uid=(self.__class__, request,), weak=False)
...
```

### process_response 函数代码分析

完成客户端的请求处理，当然是要返回 response（服务端响应）了。因为我们在 process_request 函数注册了信号，我们用完当然要把信号注销。  

这里就用到了 disconnect 函数，由于我们在注册时传入了 dispatch_uid 所以我们不需要过多的参数，对这个函数感兴趣的可以看一看官方的文档 [Disconnecting signals](https://docs.djangoproject.com/en/dev/topics/signals/#django.dispatch.Signal.disconnect)。  

{% github_sample_ref /elfgzp/django_experience/blob/b896f97029f4eb371aef3ed369e601e3817145b6/create_by/middleware.py %}
```shell
...
def process_response(self, request, response):
    if request.method not in ('GET', 'HEAD', 'OPTIONS', 'TRACE'):
        signals.pre_save.disconnect(dispatch_uid=(self.__class__, request,))
    return response
...
```

## 总结

这个实现方式非常巧妙，同时也可以学习到 Django 中的 Middleware 和 Signal 的简单用法，以上就是本文的主要内容，希望能给大家带来帮助。

## 参考文章

[django get current user in model save - Django: Populate user ID when saving a model](https://code.i-harness.com/en/q/d293a)  

[Django 学习 curry 函数](https://my.oschina.net/memorybox/blog/74628)  
  
[Django Signal 解析](https://blog.csdn.net/zhuoxiuwu/article/details/52498003)

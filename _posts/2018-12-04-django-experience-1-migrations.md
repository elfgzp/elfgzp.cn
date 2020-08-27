---
# layout: post
title:  "Django使用心得（一） 善用migrations"
date:   2018-12-04 10:30:00 +0800
tags: 'Django'
color: rgb(101, 25, 160)
cover: '/assets/images/2018-12-04-django-experience-1-migrations/django-migrations.png'
subtitle: '善用migrations'
---

在使用和学习`Django`框架时，发现很多人包括我自己在对`Django`项目进行版本管理时，通常把`migrations`文件添加到了`.gitignore`中。  

笔者也一直有疑问这种做法是否正确，于是去查看官方文档，找到以下这段。  

原文：
> You should think of migrations as a version control system for your database schema. makemigrations is responsible for packaging up your model changes into individual migration files - analogous to commits - and migrate is responsible for applying those to your database.
>
> The migration files for each app live in a “migrations” directory inside of that app, and are designed to be committed to, and distributed as part of, its codebase. You should be making them once on your development machine and then running the same migrations on your colleagues’ machines, your staging machines, and eventually your production machines.

中文翻译：
> 你可以想象 migrations 相当一个你的数据库的一个版本控制系统。makemigrations 命令负责保存你的模型变化到一个迁移文件 - 和 commits 很类似 - 同时 migrate负责将改变提交到数据库。
> 
> 每个 app 的迁移文件会保存到每个相应 app 的“migrations”文件夹里面,并且准备如何去执行它, 作为一个分布式代码库。 每当在你的开发机器或是你同事的机器并且最终在你的生产机器上运行同样的迁移，你应当再创建这些文件。

根据官方文档的说法，不将`migrations`提交到仓库的做法时错误的。

而且如果要使用`django`自带的封装好的`TestCase`进行单元测试，`migrations`也必须保留。

下一篇文章笔者也会介绍一下`django`中的`TestCase`的使用心得。

下面介绍一下，在项目中`migrations`的一些使用心得和遇到的一些问题。

## 利用migrations初始化数据

我们现在有一个`Book`的模型，我想在`migrate`之后初始化一些数据。

{% github_sample_ref /elfgzp/django_experience/blob/42e1f6ca6d68b49d7e87f0d5121aa80cfd692372/make_good_use_of_migrations/models.py %}
{% highlight python %}
class Book(models.Model):
    name = models.CharField(max_length=32)
{% endhighlight %}

例如：生成三本名称分别为`Hamlet`、`Tempest`、`The Little Prince`的书。

在执行了`python manage.py makemigrations`之后`migrations`文件夹会生成`0001_initial.py`的文件。

文件中包含了`Book`这个模型初始化的一些代码。

在介绍如何利用`migrations`初始化数据时，先介绍一下`migrations`常用的两个操作：

`RunSQL`、`RunPython`

顾名思义分别是执行`SQL语句`和`Python函数`。

下面我用`migrations`中的`RunPython`来初始化数据。
  1. 在相应app下的`migrations`文件新建`0002_init_book_data.py`
     migrations/.   
     ​      ├── 0001_initial.py.   
     ​      └── 0002_init_book_data.py. 

  2. 然后增加`Migration`类继承`django.db.migrations.Migration`，并在`operations`中增加需要执行的代码。

{% github_sample_ref /elfgzp/django_experience/blob/6f5dafb69e282051dbd0f65458dc56762f03c437/make_good_use_of_migrations/migrations/0002_init_book_data.py %}
{% highlight python %}
from django.db import migrations

"""
make_good_use_of_migrations 是App的名字
"""


def init_book_data(apps, schema_editor):
    Book = apps.get_model('make_good_use_of_migrations', 'Book')
    init_data = ['Hamlet', 'Tempest', 'The Little Prince']
    for name in init_data:
        book = Book(name=name)
        book.save()


class Migration(migrations.Migration):
    dependencies = [
        ('make_good_use_of_migrations', '0001_initial'),
    ]

    # 这里要注意dependencies为上一次migrations的文件名称

    operations = [
        migrations.RunPython(init_book_data)
    ]
{% endhighlight %}

3. 运行`python manage.py migrate`，可以看到数据已经在数据库中生成了。 

## 利用migrations修复数据

我们常常遇到这种情况，例如我需要给`Book`模型增加一个外键字段，而且这个字段不能为空，所以旧的数据就要进行处理修复，我们可以这样处理。

1. 先将需要增加的字段`null`属性设置为`True`，然后执行`makemigrations`

{% github_sample_ref /elfgzp/django_experience/blob/ede5c73dbb87b6f3f6a93c77d39a2488daaf6acf/make_good_use_of_migrations/models.py %}
{% highlight python %}
class Author(models.Model):
    name = models.CharField(max_length=32)


class Book(models.Model):
    name = models.CharField(max_length=32)
    author = models.ForeignKey(to=Author, on_delete=models.CASCADE, null=False)
{% endhighlight %}

2. 在相应app下的`migrations`文件新建`0004_fix_book_data.py`
   migrations/.    
   ├── 0001_initial.py.   
   ├── 0002_init_book_data.py.   
   ├── 0003_auto_20181204_0533.py.   
   └──  0004_fix_book_data.py. 

{% github_sample_ref /elfgzp/django_experience/blob/ede5c73dbb87b6f3f6a93c77d39a2488daaf6acf/make_good_use_of_migrations/migrations/0004_fix_book_data.py %}
{% highlight python %}
from django.db import migrations


def fix_book_data(apps, schema_editor):
    Book = apps.get_model('make_good_use_of_migrations', 'Book')
    Author = apps.get_model('make_good_use_of_migrations', 'Author')
    for book in Book.objects.all():
        author, _ = Author.objects.get_or_create(name='%s author' % book.name)
        book.author = author
        book.save()


class Migration(migrations.Migration):
    dependencies = [
        ('make_good_use_of_migrations', '0003_auto_20181204_0533'),
    ]

    operations = [
        migrations.RunPython(fix_book_data)
    ]
{% endhighlight %}


3. 最后再将`Book`模型中的`author`字段属性`null`设为`False`，并执行`makemigrations`。执行后会出现，

   ```shell
   You are trying to change the nullable field 'author' on book to non-nullable without a default; we can't do that (the database needs something to populate existing rows).
   Please select a fix:
    1) Provide a one-off default now (will be set on all existing rows with a null value for this column)
    2) Ignore for now, and let me handle existing rows with NULL myself (e.g. because you added a RunPython or RunSQL operation to handle NULL values in a previous data migration)
    3) Quit, and let me add a default in models.py
   Select an option:
   ```

   这里选择第`2`项，意思是忽略该字段已经为空的数据，使用`RunPython`或者`RunSQL`自行处理。

   选择完成后在执行`python manage.py migrate`，会发现数据库中的数据会按照我们的预期处理完成。

## 解决多人开发时migrations产生的冲突

为了模拟多人多分支开发，新建一个`master-2`的分支，并且版本在创建`Author`类之前，并且在`Book`模型中增加`remark`字段。

`model.py`文件中的内容如下：

{% github_sample_ref /elfgzp/django_experience/blob/62e58772a112ac46251fbb1c40de711d832feb35/make_good_use_of_migrations/models.py %}
{% highlight python %}
class Book(models.Model):
    name = models.CharField(max_length=32)
    remark = models.CharField(max_length=32, null=True)
{% endhighlight %}

`migrations`文件目录如下：

migrations/.   
├── 0001_initial.py.   
├── 0002_init_book_data.py.   
└──0003_book_remark.py.   

当我们把`master-2`的代码合并到`master`时，会发现`migrations`中出现了重复的编号`0003`并且他们共同依赖于`0002_init_book_data`。

migrations/.   
├── 0001_initial.py.   
├── 0002_init_book_data.py.   
├── 0003_auto_20181204_0533.py  
├── 0003_book_remark.py  
├── 0004_fix_book_data.py  
└──0005_auto_20181204_0610.py.   

这时候就需要用到命令：

```shell
python manage.py makemigrations --merge
```

然后就会在`migrations`目录生成一个`0006_merge_20181204_0622.py`文件

{% github_sample_ref /elfgzp/django_experience/blob/6f5dafb69e282051dbd0f65458dc56762f03c437/make_good_use_of_migrations/migrations/0006_merge_20181204_0622.py %}
{% highlight python %}
from django.db import migrations

class Migration(migrations.Migration):

    dependencies = [
        ('make_good_use_of_migrations', '0005_auto_20181204_0610'),
        ('make_good_use_of_migrations', '0003_book_remark'),
    ]

    operations = [
    ]
{% endhighlight %}

这时候在执行`python manage.py migrate`就可以了。

## 使用migrations.RunPython需要注意的问题

### 在函数中是无法调用模型类的函数的

假设在`Book`模型中定义了两个函数`print_name`和类函数`print_class_name`

{% github_sample_ref /elfgzp/django_experience/blob/6f5dafb69e282051dbd0f65458dc56762f03c437/make_good_use_of_migrations/models.py %}
{% highlight python %}
class Book(models.Model):
    name = models.CharField(max_length=32)
    author = models.ForeignKey(to=Author, on_delete=models.CASCADE, null=False)
    remark = models.CharField(max_length=32, null=True)

    def print_name(self):
        print(self.name)

    @classmethod
    def print_class_name(cls):
        print(cls.__name__)
{% endhighlight %}

在`migrations`中是无法调用的，笔者也没有仔细研究，推测是`Book`类初始化时只把字段初始化了。

{% github_sample_ref /elfgzp/django_experience/blob/6f5dafb69e282051dbd0f65458dc56762f03c437/make_good_use_of_migrations/migrations/0004_fix_book_data.py %}
{% highlight python %}

from django.db import migrations


def fix_book_data(apps, schema_editor):
    Book = apps.get_model('make_good_use_of_migrations', 'Book')
    Author = apps.get_model('make_good_use_of_migrations', 'Author')
    for book in Book.objects.all():
        author, _ = Author.objects.get_or_create(name='%s author' % book.name)
        book.author = author
        """
        book.print_name()
        book.print_class_name()
        这样调用会报错
        """
        book.save()


class Migration(migrations.Migration):
    dependencies = [
        ('make_good_use_of_migrations', '0003_auto_20181204_0533'),
    ]

    operations = [
        migrations.RunPython(fix_book_data)
    ]
{% endhighlight %}

### 在函数中模型的类所重写的save方法无效，包括继承的save方法
在`migrations`中所有重写的`save`方法都不会运行，例如：
{% github_sample_ref /elfgzp/django_experience/blob/0ab98dbec094bb115d9adf3547bf3eccbd0800af/make_good_use_of_migrations/models.py %}
{% highlight python %}
class Book(models.Model):
    name = models.CharField(max_length=32)
    author = models.ForeignKey(to=Author, on_delete=models.CASCADE, null=False)
    remark = models.CharField(max_length=32, null=True)

    def print_name(self):
        print(self.name)

    @classmethod
    def print_class_name(cls):
        print(cls.__name__)

    def save(self, *args, **kwargs):
        if not self.remark:
            self.remark = 'This is a book.'
{% endhighlight %}
最后初始化生成的数据的`remark`字段的值仍然为空。

### 在函数中模型注册的所有signal无效
虽然给`Book`模型注册了`signal`，但是在`migrations`中仍然不会起作用
{% github_sample_ref /elfgzp/django_experience/blob/0ab98dbec094bb115d9adf3547bf3eccbd0800af/make_good_use_of_migrations/models.py %}
{% highlight python %}
@receiver(pre_save, sender=Book)
def generate_book_remark(sender, instance, *args, **kwargs):
    print(instance)
    if not instance.remark:
        instance.remark = 'This is a book.'
{% endhighlight %}


### 不要将数据处理放到模型变更的migrations文件中

在做数据修复或者生成初始化数据时，不要将处理函数放到自动生成的变更或生成字段、模型的`migrations`文件中，例如：

{% github_sample_ref /elfgzp/django_experience/blob/6f5dafb69e282051dbd0f65458dc56762f03c437/make_good_use_of_migrations/migrations/0005_auto_20181204_0610.py %}
{% highlight python %}
class Migration(migrations.Migration):
    dependencies = [
        ('make_good_use_of_migrations', '0004_fix_book_data'),
    ]

    operations = [
        migrations.AlterField(
            model_name='book',
            name='author',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,
                                    to='make_good_use_of_migrations.Author'),
        ),
        """
        migrations.RunPython(xxx) 不要把数据处理放到模型变更中
        """
    ]
{% endhighlight %}

不要放在一起的主要原因是，当`RunPython`中函数的处理逻辑一旦出现异常无法向下执行，   

`django_migrations`将不会记录这一次处理，**但是表结构的变更已经执行了！**

这也是`Django migrations`做的不好的地方，正确应该是出现异常需要做数据库回滚。



一旦出现这种情况，只能手动将`migrations`的名称如`0005_auto_20181204_0610`，写入到数据库表`django_migrations`中，然后将`RunPython`中的逻辑单独剥离出来。



## 总结

以上就是笔者在项目中使用`Django`框架的`migrations`的心得，下一篇会介绍`Django`框架的`TestCase`。

本文的源码会放到`github`上，[https://github.com/elfgzp/django_experience](https://github.com/elfgzp/django_experience)

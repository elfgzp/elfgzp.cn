---
layout: post
title:  'Django 使用心得 （四）多数据库'
date:   2019-01-09 13:30:00 +0800
tags: 'Django'
color: rgb(222, 11, 123)
cover: '/assets/images/2019-01-27-django-experience-4-multidatabases/django-exp-4.png'
subtitle: 'django 多数据库'
---

相信有开发者在项目中可能会有需要将不同的 `app` 数据库分离，这样就需要使用多个数据库。  
网上也有非常多的与 `db_router` 相关的文章，本篇文章也会简单介绍一下。  
除此之外，还会介绍一下笔者在具体项目中使用多数据库的一些心得和一些`坑`。希望能给读者带来一定的帮助，若是读者们也有相关的心得别忘了留言，可以一起交流学习。  


## 使用 Router 来实现多数据库
首先我们可以从 `Django` 的官方文档了解到如何使用 `routers` 来使用多数据库。  

> 官方文档 [Using Routers](https://docs.djangoproject.com/zh-hans/2.1/topics/db/multi-db/#using-routers)

官方文档中定义了一个 `AuthRouter` 用于存储将 `Auth` app 相关的表结构。  

```python
class AuthRouter:
    """
    A router to control all database operations on models in the
    auth application.
    """
    def db_for_read(self, model, **hints):
        """
        Attempts to read auth models go to auth_db.
        """
        if model._meta.app_label == 'auth':
            return 'auth_db'
        return None

    def db_for_write(self, model, **hints):
        """
        Attempts to write auth models go to auth_db.
        """
        if model._meta.app_label == 'auth':
            return 'auth_db'
        return None

    def allow_relation(self, obj1, obj2, **hints):
        """
        Allow relations if a model in the auth app is involved.
        """
        if obj1._meta.app_label == 'auth' or \
           obj2._meta.app_label == 'auth':
           return True
        return None

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        """
        Make sure the auth app only appears in the 'auth_db'
        database.
        """
        if app_label == 'auth':
            return db == 'auth_db'
        return None
```

但是我在实际使用中遇到一个问题，在运行 `python manage.py test` 来进行单元测试时，这个数据库内依然会生成其他 app 的表结构。  
正常情况下是没什么问题的，但是我使用了 `mysql` 与 `mongodb` 的多数据库结构，造成了一些异常。  

于是我去查阅 `Django` 单元测试的源码发现这样一段代码，他是用于判断某个 app 的 `migrations` （数据库迁移）是否要在某个数据库执行。  

{% github_sample_ref /django/django/222caab68a2a7345043d0c50161203cb2cfe70eb/django/db/utils.py %}
```python
    def allow_migrate(self, db, app_label, **hints):
        for router in self.routers:
            try:
                method = router.allow_migrate
            except AttributeError:
                # If the router doesn't have a method, skip to the next one.
                continue

            allow = method(db, app_label, **hints)

            if allow is not None:
                return allow
        return True
```

他这个函数相当于是在执行 `Router` 中的 `allow_migrate`，并取其结果来判断是否要执行数据库迁移。  
也就是官方给的例子：  

```python
def allow_migrate(self, db, app_label, model_name=None, **hints):
    """
    Make sure the auth app only appears in the 'auth_db'
    database.
    """
    if app_label == 'auth':
        return db == 'auth_db'
    return None
```

但是这里有一个问题，假设 `app_label` 不等于 `auth`（相当于你设定的 app 名称），但是 db 却等于 `auth_db`，此时这个函数会返回 `None`。  

回到 `utils.py` 的函数中来，可以看到 `allow` 就得到了这个 `None` 的返回值，但是他判断了 `is not None` 为`假命题`，那么循环继续。  

这样导致了所有对于这个数据库 `auth_db` 并且 `app_label` 不为 `auth` 的结果均返回 `None`。最后循环结束，返回结果为 `True`，这意味着，
所有其他 `app_label` 的数据库迁移均会在这个数据库中执行。  

为了解决这个问题，我们需要对官方给出的示例作出修改：  

```python
def allow_migrate(self, db, app_label, model_name=None, **hints):
    """
    Make sure the auth app only appears in the 'auth_db'
    database.
    """
    if app_label == 'auth':
        return db == 'auth_db'
    elif db == 'auth_db':  # 若数据库名称为 auth_db 但 app_label 不为 auth 直接返回 False
        return False
    else:
        return None
```

## 执行 migrate 时指定 --database

我们定义好 `Router` 后，在执行 `python manage.py migrate` 时可以发现，数据库迁移动作并没有执行到除默认数据库以外的数据库中，
这是因为 `migrate` 这个 `command` 必须要指定额外的参数。  

> 官方文档 [Synchronizing your databases](https://docs.djangoproject.com/zh-hans/2.1/topics/db/multi-db/#synchronizing-your-databases)

阅读官方文档可以知道，若要将数据库迁移执行到非默认数据库中时，`必须`要指定数据库 `--database`。  

```shell
$ ./manage.py migrate --database=users
$ ./manage.py migrate --database=customers
```

但是这样的话会导致我们使用 `CI/CD` 部署服务非常的不方便，所以我们可以通过自定义 `command` 来实现 `migrate` 指定数据库。  

其实实现方式非常简单，就是基于 django 默认的 migrate 进行改造，在最外层加一个循环，然后在自定义成一个新的命令 `multidbmigrate`。  


{% github_sample_ref /elfgzp/django_experience/blob/5b863c23fe8637bcf127297cd2a5af2d34063ab4/multidatabases/management/commands/multidbmigrate.py %}

```python
...
    def handle(self, *args, **options):
        self.verbosity = options['verbosity']
        self.interactive = options['interactive']

        # Import the 'management' module within each installed app, to register
        # dispatcher events.
        for app_config in apps.get_app_configs():
            if module_has_submodule(app_config.module, "management"):
                import_module('.management', app_config.name)

        db_routers = [import_string(router)() for router in conf.settings.DATABASE_ROUTERS] # 对所有的 routers 进行 migrate 操作
        for connection in connections.all():
            # Hook for backends needing any database preparation
            connection.prepare_database()
            # Work out which apps have migrations and which do not
            executor = MigrationExecutor(connection, self.migration_progress_callback)

            # Raise an error if any migrations are applied before their dependencies.
            executor.loader.check_consistent_history(connection)

            # Before anything else, see if there's conflicting apps and drop out
            # hard if there are any
            conflicts = executor.loader.detect_conflicts()
...
```

由于代码过长，这里就不全部 copy 出来，只放出其中最关键部分，完整部分可以参阅 [elfgzp/django_experience](https://github.com/elfgzp/django_experience) 仓库。  

## 在`支持事务`数据库与`不支持事务`数据库混用在单元测试遇到的问题 

在笔者使用 Mysql 和 Mongodb 时，遇到了个问题。  

总所周知，Mysql 是支持事务的数据库，而 Mongodb 是不支持的。在项目中笔者同时使用了这两个数据库，并且运行了单元测试。  

发现在运行完某一个单元测试后，我在 Mysql 数据库所生成的初始化数据（即笔者在 migrate 中使用 RunPython 生成了一些 demo 数据）全部被清除了，导致其他单元测试测试失败。  

通过 TestCase 类的特性可以知道，单元测试在运行完后会去执行 `tearDown` 来做清除垃圾的操作。于是顺着这个函数，笔者去阅读了 `Django` 中对应函数的源码，发现有一段这样的逻辑。  

```python
...
def connections_support_transactions():  # 判断是否所有数据库支持事务
    """Return True if all connections support transactions."""
    return all(conn.features.supports_transactions for conn in connections.all())
...

class TransactionTestCase(SimpleTestCase):
    ...
    multi_db = False
    ...
    @classmethod
        def _databases_names(cls, include_mirrors=True):
            # If the test case has a multi_db=True flag, act on all databases,
            # including mirrors or not. Otherwise, just on the default DB.
            if cls.multi_db:
                return [
                    alias for alias in connections
                    if include_mirrors or not connections[alias].settings_dict['TEST']['MIRROR']
                ]
            else:
                return [DEFAULT_DB_ALIAS]
    ...
    def _fixture_teardown(self):
        # Allow TRUNCATE ... CASCADE and don't emit the post_migrate signal
        # when flushing only a subset of the apps
        for db_name in self._databases_names(include_mirrors=False):
            # Flush the database
            inhibit_post_migrate = (
                self.available_apps is not None or
                (   # Inhibit the post_migrate signal when using serialized
                    # rollback to avoid trying to recreate the serialized data.
                    self.serialized_rollback and
                    hasattr(connections[db_name], '_test_serialized_contents')
                )
            )
            call_command('flush', verbosity=0, interactive=False,  # 清空数据库表
                         database=db_name, reset_sequences=False,
                         allow_cascade=self.available_apps is not None,
                         inhibit_post_migrate=inhibit_post_migrate)
    ...

class TestCase(TransactionTestCase):
    ...
        def _fixture_teardown(self):
            if not connections_support_transactions():  # 判断是否所有数据库支持事务
                return super()._fixture_teardown()
            try:
                for db_name in reversed(self._databases_names()):
                    if self._should_check_constraints(connections[db_name]):
                        connections[db_name].check_constraints()
            finally:
                self._rollback_atomics(self.atomics)
    ...
```

看到这段代码后笔者都快气死了，这个单元测试明明只是只对单个数据库起作用，`multi_db` 这个属性默认也是为 `False`，这个单元测试作用在 Mysql 跟 Mongodb 有什么关系呢！？正确的逻辑应应该是判断 `_databases_names` 即这个单元测试所涉及的数据库支不支持事务才对。

于是需要对 TestCase 进行了改造，并且将单元测试继承的 TestCase 修改为新的 TestCase。修改结果如下：  

{% github_sample_ref /elfgzp/django_experience/blob/5b863c23fe8637bcf127297cd2a5af2d34063ab4//multidatabases/testcases.py %}

```python
class TestCase(TransactionTestCase):
    """
    此类修复 Django TestCase 中由于使用了多数据库，但是 multi_db 并未指定多数据库，单元测试依然只是在一个数据库上运行。
    但是源码中的 connections_support_transactions 将所有数据库都包含进来了，导致在同时使用 MangoDB 和 MySQL 数据库时，
    MySQL 数据库无法回滚，清空了所有的初始化数据，导致单元测试无法使用初始化的数据。
    """

    @classmethod
    def _databases_support_transactions(cls):
        return all(
            conn.features.supports_transactions
            for conn in connections.all()
            if conn.alias in cls._databases_names()
        )
    ...
    
    def _fixture_setup(self):
        if not self._databases_support_transactions():
            # If the backend does not support transactions, we should reload
            # class data before each test
            self.setUpTestData()
            return super()._fixture_setup()

        assert not self.reset_sequences, 'reset_sequences cannot be used on TestCase instances'
        self.atomics = self._enter_atomics()
    ... 
```

除了 `_fixture_setup` 以外还有其他成员函数需要将判断函数改为 `_databases_support_transactions`，完整代码参考 [elfgzp/django_experience](https://github.com/elfgzp/django_experience) 仓库

## 总结

踩过这些坑，笔者更加坚信不能太相信官方文档和源码，要自己去学习研究源码的实现，才能找到解决问题的办法。  
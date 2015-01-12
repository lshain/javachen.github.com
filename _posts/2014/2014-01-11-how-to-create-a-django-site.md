---
layout: post
title: 如何创建一个Django网站
category: Python
tags: [python,django]
description: 本文演示如何创建一个简单的 django 网站，使用的 django 版本为1.7。
---

本文演示如何创建一个简单的 django 网站，使用的 django 版本为1.7。

# 1. 创建工程

运行下面命令就可以创建一个 django 工程，工程名字叫 todo_site ：

```bash
$ django-admin.py startproject todo_site
```

创建后的工程目录如下：

```
todo_site
├── manage.py
└── todo_site
    ├── __init__.py
    ├── settings.py
    ├── templates
    ├── urls.py
    └── wsgi.py
```

说明：

- `__init__.py` ：让 Python 把该目录当成一个开发包 (即一组模块)所需的文件。 这是一个空文件，一般你不需要修改它。
- `manage.py` ：一种命令行工具，允许你以多种方式与该 Django 项目进行交互。 键入`python manage.py help`，看一下它能做什么。 你应当不需要编辑这个文件；在这个目录下生成它纯是为了方便。
- `settings.py` ：该 Django 项目的设置或配置。
- `urls.py`：Django项目的URL路由设置。目前，它是空的。

# 2. 运行项目

在todo工程下运行下面命令：

```bash
$ python manage.py runserver
```

你会看到些像这样的

```
Performing system checks...

System check identified no issues (0 silenced).
October 28, 2014 - 09:10:27
Django version 1.7.1, using settings 'todo_site.settings'
Starting development server at http://127.0.0.1:8000/
Quit the server with CONTROL-C.
```

这将会在端口8000启动一个本地服务器, 并且只能从你的这台电脑连接和访问。 既然服务器已经运行起来了，现在用网页浏览器访问 <http://127.0.0.1:8000/>。你应该可以看到一个令人赏心悦目的淡蓝色 Django 欢迎页面它开始工作了。

你也可以指定启动端口:

```bash
$ python manage.py runserver 8080
```

以及指定ip：

```bash	
$ python manage.py runserver 0.0.0.0:8000
```

接下来，在另一个终端，输入命令初始化数据库：

```bash	
$ python manage.py syncdb
```

这里会提示你是否创建一个超级用户，输入yes，再输入 email 和密码，当超级用户创建成功了的时候，再到浏览器里输入 <http://127.0.0.1:8000/admin> 这时就可以进行站点管理了！

注意：提示需要创建超级用户，是因为 settings.py 中默认安装了 `django.contrib.admin`、`django.contrib.auth`、`django.contrib.sessions` 等应用模块。

# 3. 创建 todo app

在终端输入：

```bash	
$ cd todo
$ python manage.py startapp todo
```

如果操作成功，你会在 todo_site 文件夹下看到已经多了一个叫 todo 的文件夹，目录结构如下：

```
.
├── manage.py
├── todo_site
│   ├── __init__.py
│   ├── __init__.pyc
│   ├── settings.py
│   ├── settings.pyc
│   ├── urls.py
│   └── wsgi.py
└── todo
    ├── __init__.py
    ├── admin.py
    ├── migrations
    │   └── __init__.py
    ├── models.py
    ├── tests.py
    └── views.py

3 directories, 13 files
```

# 4. 模型

- 每一个 Django Model 都继承自 django.db.models.Model
- 在 Model 当中每一个属性 attribute 都代表一个 database field
- 通过 Django Model API 可以执行数据库的增删改查, 而不需要写一些数据库的查询语句

打开 todo 文件夹下的 models.py 文件。创建两个模型以及注册后台的管理：

```python
from django.db import models
from todo.models import *
from django.contrib import admin

import datetime
 
# Create your models here.
class List(models.Model):
    name = models.CharField(max_length=60)
    slug = models.SlugField(max_length=60, editable=False)
    group = models.ForeignKey(Group)

    def __unicode__(self):
        return self.name

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "Lists"

        # Prevents (at the database level) creation of two lists with the same name in the same group
        unique_together = ("group", "slug")

class Item(models.Model):
    title = models.CharField(max_length=140)
    list = models.ForeignKey(List)
    created_date = models.DateField(auto_now=True, auto_now_add=True)
    due_date = models.DateField(blank=True, null=True, )
    completed = models.BooleanField()
    completed_date = models.DateField(blank=True, null=True)
    created_by = models.ForeignKey(User, related_name='todo_created_by')
    assigned_to = models.ForeignKey(User, related_name='todo_assigned_to')
    note = models.TextField(blank=True, null=True)
    priority = models.PositiveIntegerField(max_length=3)

    def __unicode__(self):
        return self.title

    class Meta:
        ordering = ["priority"]

class Comment(models.Model):
    """
    Not using Django's built-in comments because we want to be able to save
    a comment and change task details at the same time. Rolling our own since it's easy.
    """
    author = models.ForeignKey(User)
    task = models.ForeignKey(Item)
    date = models.DateTimeField(default=datetime.datetime.now)
    body = models.TextField(blank=True)

    def __unicode__(self):
        return '%s - %s' % (
            self.author,
            self.date,
        )                
```

然后在 settings.py 中安装模型：

```python
INSTALLED_APPS = (
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'todo',
)
```

用下面的命令验证模型的有效性：

```bash
$ python manage.py validate
```

validate 命令检查你的模型的语法和逻辑是否正确。 如果一切正常，你会看到 `System check identified no issues (0 silenced).` 消息。如果出错，请检查你输入的模型代码。 错误输出会给出非常有用的错误信息来帮助你修正你的模型。

一旦你觉得你的模型可能有问题，运行 `python manage.py validate` 。 它可以帮助你捕获一些常见的模型定义错误。

模型确认没问题了，运行下面的命令来生成 CREATE TABLE 语句：

```bash
$ python manage.py sqlall todo
```

在这个命令行中，todo 是 app 的名称。 和你运行 `manage.py startapp` 中的一样。执行之后，如果输出如下：

```
CommandError: App 'todo' has migrations. Only the sqlmigrate and sqlflush commands can be used when an app has migrations.
```

则，执行数据迁移：

```bash
$ python manage.py makemigrations
$ python manage.py migrate
```

最后同步数据库：

```bash
python manage.py syncdb
```

# 5. 视图和URL配置

Django 中 views 里面的代码就是一个一个函数逻辑，处理客户端(浏览器)发送的HTTPRequest，然后返回HTTPResponse。

创建 `view.py` 文件并添加如下内容：

```python
from django.http import HttpResponse
def hello(request):
    return HttpResponse('hello, world!')
```

在 `urls.py` 中添加一个 url 映射：

```python
from django.conf.urls import patterns, include, url
from view import hello

urlpatterns = patterns('',
    url(r'^hello/$', hello),
)
```

在上面视图文件中，三我们只是告诉 Django，所有指向 URL `/hello/` 的请求都应由 hello 这个视图函数来处理。

Django 在检查 URL 模式前，移除每一个申请的URL开头的斜杠(`/`)。 这意味着我们为 `/hello/` 写URL模式不用包含斜杠(`/`)。

模式包含了一个尖号(`^`)和一个美元符号(`$`)。这些都是正则表达式符号，并且有特定的含义： ^要求表达式对字符串的头部进行匹配，$符号则要求表达式对字符串的尾部进行匹配。

如果你访问 `/hello`，默认会重定向到末尾带有反斜杠的请求上去，这是受配置文件setting中`APPEND_SLASH`项控制的。

如果你是喜欢所有URL都以 '/'结尾的人（Django开发者的偏爱），那么你只需要在每个 URL 后添加斜杠，并且设置 `APPEND_SLASH` 为 "True"。如果不喜欢URL以斜杠结尾或者根据每个 URL 来决定，那么需要设置 `APPEND_SLASH` 为 "False"，并且根据你自己的意愿来添加结尾斜杠/在URL模式后。


## 正则表达式 

正则表达式是通用的文本模式匹配的方法。 Django URLconfs 允许你使用任意的正则表达式来做强有力的 URL 映射，不过通常你实际上可能只需要使用很少的一部分功能。这里是一些基本的语法。

|符号|匹配|
|:---|:---|
|.    		|任意单一字符|
|\d   		|任意一位数字|
|[A-Z]		|A 到 Z中任意一个字符（大写）|
|[a-z]		|a 到 z中任意一个字符（小写）|
|[A-Za-z]	|a 到 z中任意一个字符（不区分大小写）|
|+		|匹配一个或更多 (例如, \d+ 匹配一个或 多个数字字符)|
|[^/]+  	|一个或多个不为‘/’的字符|
|*		|零个或一个之前的表达式（例如：\d? 匹配零个或一个数字）|
|*		|匹配0个或更多 (例如, \d* 匹配0个 或更多数字字符)|
|{1,3}		|介于一个和三个（包含）之前的表达式（例如，\d{1,3}匹配一个或两个或三个数字）|

有关正则表达式的更多内容，请访问[http://www.djangoproject.com/r/python/re-module/](http://www.djangoproject.com/r/python/re-module/)

## Django 是怎么处理请求的

当你运行 `python manage.py runserver`，脚本将在于 manage.py 同一个目录下查找名为 `setting.py` 的文件。这个文件包含了所有有关这个 Django 项目的配置信息，均大写： `TEMPLATE_DIRS` ，`DATABASE_NAME` 等。 最重要的设置时 `ROOT_URLCONF`，它将作为 URLconf 告诉 Django 在这个站点中那些 Python 的模块将被用到。

打开文件 `settings.py` 你将看到如下：

```python
ROOT_URLCONF = 'todo.urls'
```

当访问 `/index1/` 时，Django 根据 `ROOT_URLCONF` 的设置装载 URLconf 。然后按顺序逐个匹配 URLconf 里的 URLpatterns，直到找到一个匹配的。 当找到这个匹配的 URLpatterns 就调用相关联的view函数，并把 HttpRequest 对象作为第一个参数。一个视图功能必须返回一个 HttpResponse，Django 将转换 Python 的对象到一个合适的带有 HTTP 头和 body 的 Web Response。

## 动态内容

接下来创建动态内容，修改 todo/views.py 内容如下：

```python
from django.http import HttpResponse
import datetime

def hello(request):
    return HttpResponse("Hello world")

def current_datetime(request):
    now = datetime.datetime.now()
    html = "<html><body>It is now %s.</body></html>" % now
    return HttpResponse(html)
```

上面添加了一个 `current_datetime` 方法，返回值是一个动态的 html 内容。该方法没有接收参数，我们可以再添加一个方法：

```python
def hours_ahead(request, offset):
    try:
        offset = int(offset)
    except ValueError:
        raise Http404()
    dt = datetime.datetime.now() + datetime.timedelta(hours=offset)
    html = "<html><body>In %s hour(s), it will be %s.</body></html>" % (offset, dt)
    return HttpResponse(html)
```

这个方法接收一个整数型参数，将当期时间加上指定参数的小时数，返回到前台页面。

增加了两个方法后，todo_site/urls.py 修改成如下：

```python
from django.conf.urls.defaults import *
from todo.views import hello, current_datetime, hours_ahead

urlpatterns = patterns(
    '',
    url(r'^admin/(.*)', admin.site.root),
    url(r'^hello/$', hello),
    url(r'^time/$', current_datetime),
    url(r'^time/plus/(\d{1,2})/$', hours_ahead),
)
```

查看第三个 url 表达式，可以发现正则匹配的内容会作为参数传递到 `hours_ahead` 方法里。

另外你访问 <http://localhost:8000/time/plus/2/> ，会发现时区似乎设置不对。解决办法是修改 settings.py 中的 `TIME_ZONE` 值为 `Asia/Shanghai` 即可。

接下来创建一个页面展示所有的 Item，名称为 item-list.html 该页面保存在 todo_site/todo/templates/ 目录下，内容如下：

```html
<h2>todo</h2>
 
{% for x in items %}
<p>{{ x.title }} - {{ x.created_date|date:"D d M Y" }}</p>
 
<p>{{ x.note }}</p>
<hr />
{% endfor %}
```

然后在 todo/views.py 中增加一个方法：

```python
from django.shortcuts import render
from django.http import HttpResponse
from django.shortcuts import render_to_response
from models import Item
import datetime

# Create your views here.

def hello(request):
    return HttpResponse("Hello world")

def current_datetime(request):
    now = datetime.datetime.now()
    html = "<html><body>It is now %s.</body></html>" % now
    return HttpResponse(html)

def hours_ahead(request, offset):
    try:
        offset = int(offset)
    except ValueError:
        raise Http404()
    dt = datetime.datetime.now() + datetime.timedelta(hours=offset)
    html = "<html><body>In %s hour(s), it will be %s.</body></html>" % (offset, dt)
    return HttpResponse(html)  

def list_item(request):
    items = Item.objects.all()
    return render_to_response('item-list.html', {'items': items})
```


因为用到了模板，需要设置模板位置，在 settings.py 中添加下面代码：

```python
TEMPLATE_DIRS = (
    # Put strings here, like "/home/html/django_templates" or "C:/www/django/templates".
    # Always use forward slashes, even on Windows.
    # Don't forget to use absolute paths, not relative paths.
    '/Users/june/workspace/pythonProjects/todo_site/todo/templates',
)
```

或者，使用编码的方式：

```python
TEMPLATE_DIRS = (
    os.path.join(BASE_DIR,'templates'),
)
```

在 todo/urls.py 添加一个映射：

```python
from django.conf.urls import patterns, include, url
from django.contrib import admin
from todo.views import hello, current_datetime, hours_ahead, list_item

urlpatterns = patterns('',
    # Examples:
    # url(r'^$', 'todo.views.home', name='home'),
    # url(r'^blog/', include('blog.urls')),

    url(r'^admin/', include(admin.site.urls)),

    url(r'^hello/$', hello),
    url(r'^time/$', current_datetime),
    url(r'^time/plus/(\d{1,2})/$', hours_ahead),
    url(r'^item/list/$', list_item),

)
```

在浏览器里访问 <http://127.0.0.1:8000/item/list/>

# 6. Admin

Django有一个优秀的特性, 内置了Django admin后台管理界面, 方便管理者进行添加和删除网站的内容.

新建的项目系统已经为我们设置好了后台管理功能，见 todo/settings.py：

```python
INSTALLED_APPS = (
    'django.contrib.admin', #默认添加后台管理功能
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'todo',
)
```

同时也已经添加了进入后台管理的 url, 可以在  todo/urls.py 中查看：

```python
url(r'^admin/', include(admin.site.urls)), #可以使用设置好的url进入网站后台
```

使用如下命令账号创建超级用户(如果使用了 `python manage.py syncdb` 会要求你创建一个超级用户)

```python
$ python manage.py createsuperuser
Username (leave blank to use 'root'): root
Email address:
Password:
Password (again):
Superuser created successfully.
```

输入用户名, 邮箱, 密码就能够创建一个超级用户 现在可以在浏览器中输入 <http://127.0.0.1:8000/admin> ，然后输入账户和密码进入后台管理

但是你会发现并没有数据库信息的增加和删除, 现在我们编辑 todoapp/admin.py，将三个 model 注册到 admin 应用中去，todoapp/admin.py 修改成如下：

```python
from django.contrib import admin
from todo.models import Item, List, Comment

# Register your models here.

class ItemAdmin(admin.ModelAdmin):
    list_display = ('title', 'list', 'priority', 'due_date')
    list_filter = ('list',)
    ordering = ('priority',)
    search_fields = ('name',)

admin.site.register(List)
admin.site.register(Comment)
admin.site.register(Item, ItemAdmin)
```

## 使用第三方插件

Django现在已经相对成熟, 已经有许多不错的可以使用的第三方插件可以使用, 这些插件各种各样, 现在我们使用一个第三方插件使后台管理界面更加美观, 目前大部分第三方插件可以在 [Django Packages](https://www.djangopackages.com/) 中查看，尝试使用 [django-admin-bootstrap](https://github.com/douglasmiranda/django-admin-bootstrap) 美化后台管理界面。

安装：

```bash
$ pip install bootstrap-admin
```

然后在 todo/settings.py 中修改 INSTALLED_APPS：

```python
INSTALLED_APPS = (
    'bootstrap_admin',  #一定要放在`django.contrib.admin`前面
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'todo',
)

from django.conf import global_settings
TEMPLATE_CONTEXT_PROCESSORS = global_settings.TEMPLATE_CONTEXT_PROCESSORS + (
    'django.core.context_processors.request',
)
BOOTSTRAP_ADMIN_SIDEBAR_MENU = True
```

保存后，再次刷新页面，访问 <http://127.0.0.1:8000/admin>。

# 7. 总结

通过上面的介绍，对 django 的安装、运行以及如何创建视图和模型有了一个清晰的认识，接下来就可以深入的学习 django 的模板、持久化、中间件、国际化等知识。

# 8. 参考文章

- [django实例教程–blog(1)](http://markchen.me/django-instance-tutorial-blog-1/)
- [The Django book 2.0](http://djangobook.py3k.cn/2.0/)
- [Django搭建简易博客](http://andrew-liu.gitbooks.io/django-blog/content/)

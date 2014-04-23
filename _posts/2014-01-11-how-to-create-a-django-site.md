---
layout: post
title: 如何创建一个Django网站
category: python
tags: [python,django]
description: 使用django创建一个简单的网站
---

# 1. 创建工程

运行下面命令就可以创建一个django工程，工程名字叫todo：

```
	django-admin.py startproject todo
```

创建后的工程目录如下：

```
	todo
	├── manage.py
	└── todo
	    ├── __init__.py
	    ├── settings.py
	    ├── templates
	    ├── urls.py
	    └── wsgi.py
```

说明：

- `__init__.py` ：让 Python 把该目录当成一个开发包 (即一组模块)所需的文件。 这是一个空文件，一般你不需要修改它。
- manage.py ：一种命令行工具，允许你以多种方式与该 Django 项目进行交互。 键入`python manage.py help`，看一下它能做什么。 你应当不需要编辑这个文件；在这个目录下生成它纯是为了方便。
- settings.py ：该 Django 项目的设置或配置。
- urls.py：Django项目的URL路由设置。目前，它是空的。

# 2. 运行项目

在todo工程下运行下面命令：

```
	python manage.py runserver
```

你会看到些像这样的

```
	Validating models...
	0 errors found.

	Django version 1.0, using settings 'mysite.settings'
	Development server is running at http://127.0.0.1:8000/
	Quit the server with CONTROL-C.
```

这将会在端口8000启动一个本地服务器, 并且只能从你的这台电脑连接和访问。 既然服务器已经运行起来了，现在用网页浏览器访问 `http://127.0.0.1:8000/`。你应该可以看到一个令人赏心悦目的淡蓝色Django欢迎页面它开始工作了。

你也可以指定启动端口:

```
	python manage.py runserver 8080
```

以及指定ip：

```	
	python manage.py runserver 0.0.0.0:8000
```

# 3. 视图和URL配置

创建view.py文件并添加如下内容：

```
	from django.http import HttpResponse
	def index1(request):
	    return HttpResponse('hello, world!')
```

在urls.py中添加一个url映射：

```
	from django.conf.urls import patterns, include, url
	from view import index1

	urlpatterns = patterns('',
	    url(r'^index1/$', index1),
	)
```

在上面视图文件中，三我们只是告诉 Django，所有指向 URL `/index1/` 的请求都应由 index1 这个视图函数来处理。

Django在检查URL模式前，移除每一个申请的URL开头的斜杠(/)。 这意味着我们为/index1/写URL模式不用包含斜杠(/)。

模式包含了一个尖号(^)和一个美元符号($)。这些都是正则表达式符号，并且有特定的含义： ^要求表达式对字符串的头部进行匹配，$符号则要求表达式对字符串的尾部进行匹配。

如果你访问`/index1`，默认会重定向到末尾带有反斜杠的请求上去，这是受配置文件setting中`APPEND_SLASH`项控制的。

如果你是喜欢所有URL都以'/'结尾的人（Django开发者的偏爱），那么你只需要在每个URL后添加斜杠，并且设置`APPEND_SLASH`为"True". 如果不喜欢URL以斜杠结尾或者根据每个URL来决定，那么需要设置`APPEND_SLASH`为"False",并且根据你自己的意愿来添加结尾斜杠/在URL模式后.


## 3.1 正则表达式 

正则表达式是通用的文本模式匹配的方法。 Django URLconfs 允许你使用任意的正则表达式来做强有力的URL映射，不过通常你实际上可能只需要使用很少的一部分功能。这里是一些基本的语法。

|符号|匹配|
|:---|:---|
|.    		|任意单一字符|
|\d   		|任意一位数字|
|[A-Z]		|A 到 Z中任意一个字符（大写）|
|[a-z]		|a 到 z中任意一个字符（小写）|
|[A-Za-z]	|a 到 z中任意一个字符（不区分大小写）|
|+			|匹配一个或更多 (例如, \d+ 匹配一个或 多个数字字符)|
|[^/]+  	|一个或多个不为‘/’的字符|
|*			|零个或一个之前的表达式（例如：\d? 匹配零个或一个数字）|
|*			|匹配0个或更多 (例如, \d* 匹配0个 或更多数字字符)|
|{1,3}		|介于一个和三个（包含）之前的表达式（例如，\d{1,3}匹配一个或两个或三个数字）|

有关正则表达式的更多内容，请访问[http://www.djangoproject.com/r/python/re-module/](http://www.djangoproject.com/r/python/re-module/)

# 4. Django是怎么处理请求的

当你运行`python manage.py runserver`，脚本将在于manage.py同一个目录下查找名为setting.py的文件。这个文件包含了所有有关这个Django项目的配置信息，均大写： `TEMPLATE_DIRS` , `DATABASE_NAME`等. 最重要的设置时`ROOT_URLCONF`，它将作为URLconf告诉Django在这个站点中那些Python的模块将被用到。

打开文件`settings.py`你将看到如下：

```
	ROOT_URLCONF = 'todo.urls'
```

当访问 /index1/ 时，Django 根据`ROOT_URLCONF`的设置装载URLconf 。然后按顺序逐个匹配URLconf里的URLpatterns，直到找到一个匹配的。 当找到这个匹配的URLpatterns就调用相关联的view函数，并把 HttpRequest对象作为第一个参数。一个视图功能必须返回一个HttpResponse，Django将转换Python的对象到一个合适的带有HTTP头和body的Web Response。



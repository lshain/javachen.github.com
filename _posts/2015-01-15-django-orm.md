---
layout: post

title: Django中的ORM

category: python

tags: [ python,django ]

description: 这篇文章主要介绍 Django 中 ORM 相关知识。

published: true

---

通过《[如何创建一个Django网站](/2014/01/11/how-to-create-a-django-site/)》大概清楚了如何创建一个简单的 Django 网站，并了解了Django 中[模板](http://blog.javachen.com/2014/10/30/django-template)和[模型](http://blog.javachen.com/2015/01/14/django-model)使用方法。本篇文章主要在此基础上，了解 Django 中 ORM 相关的用法。

Django 中查询数据库需要 Manager 和 QuerySet 两个对象。从数据库里检索对象，可以通过模型的 Manage 来建立 QuerySet,一个 QuerySet 表现为一个数据库中对象的结合，他可以有0个一个或多个过滤条件，在 SQL里 QuerySet 相当于 select 语句用 where 或 limit 过滤。你通过模型的 Manage 来获取 QuerySet。

### Manager 类
Manager 对象附在模型类里，如果没有特指定，每个模型类都会有一个 objects 属性，它构成了这个模型在数据库所有基本查询。

Manager 的几个常用方法：

- `all`：返回一个包含模式里所有数据库记录的 QuerySet
- `filter`：返回一个包含符合指定条件的模型记录的 QuerySet
- `exclude`：和 filter 相反，查找不符合条件的那些记录
- `get`：获取单个符合条件的记录（没有找到或者又超过一个结果都会抛出异常）
- `order_by`：改变 QuerySet 默认的排序

举例，有如下模型：

```python
#作者
class Author(models.Model):
  name = models.CharField(max_length=100)
  email = models.EmailField()

#书籍
class Book(models.Model):
  title = models.CharField(max_length=100)
  pub_date = models.DateTimeField()
  view_num = models.IntegerField()
  comment_num = models.IntegerField()
  
#目录
class Entry(models.Model):
    headline = models.CharField(max_length=255)
    book = models.ForeignKey(Book)
    authors = models.ManyToManyField(Author)
```

保存、删除、修改操作：

```python
#保存对象
book.save()

#删除对象
book.delete()

#删除所有
Book.objects.all().delete()

#修改满足过滤条件的记录
Book.objects.filter(id=1).update(title='Hadoop in Action')
```

获取一本书：

```python
book = Book.objects.get(title="Python Web Dev Django")
```

获取所有书:

```python
books = Book.objects.all()

#正向排序
Book.objects.all().order_by("title")
#反向排序
Book.objects.all().order_by("-title")
```

获取标题为 Python 开头的书:

```python
books = Book.objects.filter(title__startswith="Python")

#支持链式操作
books = Book.objects.filter(title__startswith="Python").exclude(pub_date__gte=datetime.now()).filter(pub_date__gte=datetime(2014, 1, 1))
```

### QuerySet 类

QuerySet 接受动态的关键字参数，然后转换成合适的 SQL 语句在数据库上执行。

QuerySet 的几个常用方法：

- `distinct`
- `values`
- `values_list`
- `select_related`
- `filter`：返回一个包含符合指定条件的模型记录的 QuerySet
- `extra`：增加结果集以外的字段

#### 延时查询

每次你完成一个 QuerySet，你获得一个全新的结果集，不包括前面的。每次完成的结果集是可以贮存，使用或复用：

```python
q1 = Book.objects.filter(title__startswith="Python")
q2 = q1.exclude(pub_date__gte=datetime.now())
q3 = q1.filter(pub_date__gte=datetime.now())
```

三个 QuerySets 是分开的，第一个是 title 以 "Python" 单词开头的结果集，第二个是第一个的子集，即 pub_date 不大于现在的，第三个是第一个的子集 ，pub_date 大于现在的。

QuerySets 是延迟的，创建 QuerySets 不会触及到数据库操作，你可以多个过滤合并到一起，直到求值的时候 django才会开始查询。如：

```python
q = Book.objects.filter(title__startswith="Python")
q = q.filter(pub_date__lte=datetime.now())
q = q.exclude(pub_date__gte=datetime(2015, 1, 15))
print q
```

虽然看起来执行了三个过滤条件，实际上最后执行 `print q` 的时候，django 才开始查询执行 SQL 到数据库。

可以使用 python 的数组限制语法限定 QuerySet，如：

```python
Book.objects.all()[:4]
Book.objects.all()[4:8]

Book.objects.all().order_by("title")[:4]
Book.objects.all().order_by("title")[4:8]
```

一般的，限制 QuerySet 返回新的 QuerySet，不会立即求值查询，除非你使用了 "step" 参数

```python
Book.objects.all()[:10:2]
Book.objects.order_by('title')[0]
Book.objects.order_by('title')[0:1].get()
```

#### 字段过滤

字段查找是指定 SQL 语句的 WHERE 条件从句，通过 QuerySet 的方法 `filter()`, `exclude()` 和 `get()` 指定查询关键字。

格式为：`field__lookuptype=value`。

lookuptype 有以下几种：

- `gt` ： 大于 
- `gte` : 大于等于 
- `in` : 包含
- `lt` : 小于
- `lte` : 小于等于 
- `exact`：
- `iexact`：
- `contains`：包含查询，区分大小写
- `icontains`：不区分大小写
- `startswith`：匹配开头
- `endswith`：匹配结尾
- `istartswith`：匹配开头，不区分大小写
- `iendswith`：匹配结尾，不区分大小写

下面是一些举例：

a、exact

```python
Book.objects.get(title__exact="Python Web Dev Django")
```

等价于:

```sql
SELECT ... WHERE title = 'Python Web Dev Django';
```

如果查询没有提供双下划线，那么会默认 `__exact`:

```python
Book.objects.get(id__exact=14) # Explicit form
Book.objects.get(id=14) # __exact is implied

#主键查询
Book.objects.get(pk=14) # pk implies id__exact
```

b、iexact——忽略大小写

```python
Book.objects.get(title__iexact="python Web Dev Django")
```

c、contains——包含查询，区分大小写

```python
Book.objects.get(title__contains='Python')
```

转化为 SQL:

```sql
SELECT ... WHERE title LIKE '%Python%';
```

如果有百分号，则会进行转义：

```python
Book.objects.filter(title__contains='%')
```

转义为：

```sql
SELECT ... WHERE title LIKE '%\%%';
```

d、in 查询

```python
# Get books  with id 1, 4 and 7
Book.objects.filter(pk__in=[1,4,7])
```

#### 跨关系查询

跨关系查询是针对有主外键依赖关系的对象而言的，例如上面的 Author 和 Entry 对象是多对多的映射，可以通过 Entry 对象来过滤 Author的 name：

```python
Entry.objects.filter(author__name__exact='Lennon')
```

也可以反向查询：

```python
Book.objects.filter(entry__headline__exact=' somethings')
```

如果跨越多层关系查询，中间模型没有值，django会作为空对待不会发生异常。

```python
Book.objects.filter(entry__author__name='beijing');
Book.objects.filter(entry__author__name__isnull=True);
Book.objects.filter(
entry__author__isnull=False,
entry__author__name__isnull=True);
```


#### 使用 Extra 调整 SQL

用extra可以修复QuerySet生成的原始SQL的各个部分，它接受四个关键字参数。如下：

- `select`：修改select语句
- `where`：提供额外的where子句
- `tables`：提供额外的表
- `params`：安全的替换动态参数

增加结果集以外的字段：

```python
queryset.extra(select={'成年':'age>18'}) 
```

提供额外的 where 条件：

```python
queryset.extra(where=["first like '%小明%' "])
```

提供额外的表：

```python
queryset.extra(tables=['myapp_person'])
```

安全的替换动态参数

```python
##'%s' is not replaced with normal string 
matches = Author.objects.all().extra(where=["first = '%s' "], params= [unknown-input ( ) ]
```

#### F 关键字参数

前面给的例子里，我们建立了过滤，比照模型字段值和一个固定的值，但是如果我们想比较同一个模型里的一个字段和另一个字段的值，django 提供 `F()`——专门取对象中某列值的操作。

```python
from django.db.models import F

Book.objects.filter(view_num__lt=F('comment_num'))
```

当然，还支持加减乘除和模计算：

```python
Book.objects.filter(view_num__lt=F('comment_num') * 2) 
```

#### Q 关键字参数

QuerySet 可以通过一个叫 Q 的关键字参数封装类进一步参数化，允许使用更复杂的逻辑查询。其结果 Q对 象可以作为 filter 或 exclude 方法的关键字参数。

例子：

```python
from django.db.models import Q

specific_does = Person.objects.filter(last='Doe').exclude(Q(first='John') | Q(middle = 'Quincy'))

#获取所有姓 Doe，名伟 John Smith，但不是叫 John W.Smith 的人。
Person.objects.filter(Q(last='Doe') | (Q(last='Smith')&Q(first='John')&~Q(middle_startwith='W')))  
```

### 关系对象

当对象之间存在映射关系或者关联时，该如何查询呢？

当你在模型里定义一个关系时，模型实例会有一个方便的 API 来访问关系对象。以下分几种映射关系分别描述。

#### One-to-many关系

如果一个对象有ForeignKey，这个模型实例访问关系对象通过简单的属性:

```python
e = Entry.objects.get(id=2)
e.book # Returns the related Blog object.
```

你可以凭借外键属性获取和赋值，修改外键值知道执行 `save()` 方法才会保存到数据库:

```python
e = Entry.objects.get(id=2)
e.book = some_book
e.save()
```

你也可以通过 `模型_set` 来访问关系对象的另一边，在 Book 对象并没有维护 Entry 列表，但是你可以通过下面方式从 Book 对象访问 Entry 列表：

```python
b = Book.objects.get(id=1)

#b.entry_set is a Manager that returns QuerySets.
b.entry_set.all() # 返回所有book的关联对象.
b.entry_set.count()
```

#### Many-to-many关系

```python
e = Entry.objects.get(id=3)
e.authors.all() # 返回Entry所有authors .
e.authors.count()
e.authors.filter(name__contains='John')

a = Author.objects.get(id=5)
a.entry_set.all()  # 返回Author所有entry .
```

#### One-to-one关系

```python
class EntryDetail(models.Model):
    entry = models.OneToOneField(Entry)
    details = models.TextField()

ed = EntryDetail.objects.get(id=2)
ed.entry # 返回 Entry 对象.
```

### 参考资料

- [Eclipse的django开发学习笔记（2）--模型（M）](http://my.oschina.net/u/877170/blog/288334)
- [Django：模型的使用](http://www.pythontip.com/blog/post/6358/)
- [django orm总结](http://www.cnblogs.com/linjiqin/archive/2014/07/01/3817954.html)
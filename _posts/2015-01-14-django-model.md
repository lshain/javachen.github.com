---
layout: post

title: Django中的模型

category: python

tags: [ python,django ]

description: 这篇文章主要介绍 Django 中模型的定义方法以及模型之间存在的几种映射关系。

published: true

---

通过《[如何创建一个Django网站](/2014/01/11/how-to-create-a-django-site/)》大概清楚了如何创建一个简单的 Django 网站，这篇文章主要是在此基础上介绍 Django 中模型的定义方法以及模型之间存在的几种映射关系。

# 模型的定义

- Django 中每一个 Model 都继承自 `django.db.models.Model`。
- 在 Model 当中每一个属性 attribute 都代表一个数据库字段。
- 通过 Django Model API 可以执行数据库的增删改查, 而不需要写一些数据库的查询语句。

在 [如何创建一个Django网站](/2014/01/11/how-to-create-a-django-site/) 中创建的 List 模型定义如下：

```python
from django.db import models
from todo.models import *
from django.contrib import admin

import datetime

#模型继承django.db.models.Model
class List(models.Model):
    #定义字段，每个字段都是 Field 类的子类
    name = models.CharField(max_length=60)
    slug = models.SlugField(max_length=60, editable=False)
    group = models.ForeignKey(Group)

    #返回对一个对象的字符串表示
    def __unicode__(self):
        return self.name

    #内部类，定义模型类元数据
    class Meta:
        ordering = ["name"]
        verbose_name_plural = "Lists"

        # Prevents (at the database level) creation of two lists with the same name in the same group
        unique_together = ("group", "slug")
```

模型的字段可能的类型如下：

|字段名| 参数|  意义|
|:---|:---|:---|
|AutoField   |   | 一个能够根据可用ID自增的 IntegerField |
|BooleanField   |     |一个真/假字段 |
|CharField    |(max_length)  | 适用于中小长度的字符串。对于长段的文字，请使用 TextField|
|CommaSeparatedIntegerField |  (max_length)  | 一个用逗号分隔开的整数字段 |
|DateField |  ([auto_now], [auto_now_add])  |  日期字段|
|DateTimeField   | |    时间日期字段,接受跟 DateField 一样的额外选项|
|EmailField    | |  一个能检查值是否是有效的电子邮件地址的 CharField  |
|FileField  | (upload_to) |一个文件上传字段|
|FilePathField  | (path,[match],[recursive])  |一个拥有若干可选项的字段，选项被限定为文件系统中某个目录下的文件名|
|FloatField | (max_digits,decimal_places) |一个浮点数，对应 Python 中的 float 实例|
ImageField | (upload_to, [height_field] ,[width_field])  | 像 FileField 一样，只不过要验证上传的对象是一个有效的图片。|
IntegerField    | |    一个整数。|
IPAddressField   | |   一个IP地址，以字符串格式表示（例如： "24.124.1.30" ）。|
|NullBooleanField   | |     就像一个 BooleanField ，但它支持 None /Null 。|
|PhoneNumberField   ||     它是一个 CharField ，并且会检查值是否是一个合法的美式电话格式|
|PositiveIntegerField     ||   和 IntegerField 类似，但必须是正值。|
|PositiveSmallIntegerField    ||      与 PositiveIntegerField 类似，但只允许小于一定值的值,最大值取决于数据库 |
|SlugField   ||     嵌条 就是一段内容的简短标签，这段内容只能包含字母、数字、下划线或连字符。通常用于 URL 中 |
|SmallIntegerField    | |   和 IntegerField 类似，但是只允许在一个数据库相关的范围内的数值（通常是-32,768到 |+32,767）|
|TextField    ||   一个不限长度的文字字段|
|TimeField   ||    时分秒的时间显示。它接受的可指定参数与 DateField 和 DateTimeField 相同。|
|URLField   |  |   用来存储 URL 的字段。|
|USStateField    ||    美国州名称缩写，两个字母。|
|XMLField |   (schema_path)   |它就是一个 TextField ，只不过要检查值是匹配指定schema的合法XML。|

通用字段参数列表如下（所有的字段类型都可以使用下面的参数，所有的都是可选的。）：

|参数名| 意义|
|:---|:---|
|null   | 如果设置为 True 的话，Django将在数据库中存储空值为 NULL 。默认False 。 |
|blank |  如果是 True ，该字段允许留空，默认为 False 。|
|choices |一个包含双元素元组的可迭代的对象，用于给字段提供选项。|
|db_column |  当前字段在数据库中对应的列的名字。|
|db_index   | 如果为 True ，Django会在创建表时对这一列创建数据库索引。|
|default |字段的默认值|
|editable |   如果为 False ，这个字段在管理界面或表单里将不能编辑。默认为 True 。|
|help_text  | 在管理界面表单对象里显示在字段下面的额外帮助文本。|
|primary_key| 如果为 True ，这个字段就会成为模型的主键。|
|radio_admin  |   如果 radio_admin 设置为 True 的话，Django 就会使用单选按钮界面。 |
|unique | 如果是 True ，这个字段的值在整个表中必须是唯一的。|
|unique_for_date  |   把它的值设成一个 DataField 或者 DateTimeField 的字段的名称，可以确保字段在这个日期内不会出现重复值。|
|unique_for_month  |  和 unique_for_date 类似，只是要求字段在指定字段的月份内唯一。|
|unique_for_year |和 unique_for_date 及 unique_for_month 类似，只是时间范围变成了一年。|
|verbose_name  |  除 ForeignKey 、 ManyToManyField 和 OneToOneField 之外的字段都接受一个详细名称作为第一个位置参数。|

**主键和唯一性**：

如果你没有明确指定，Django会自动生成主键 id（AutoField，自增整数，如果你希望有更多的控制主键，只需要在某个变量上指定 `primary_key = True`，这个变量会取代 id 成为这个表的主键。类似于 SQL 中的 UNIQUE 索引，Django 也提供了 `unique=True` 的参数

定义了模型之后，可以用下面校验模型：

```bash
$ python manage.py validate
    System check identified no issues (0 silenced).
```

validate 命令检查你的模型的语法和逻辑是否正确。 如果一切正常，你会看到 `System check identified no issues (0 silenced). `消息。如果出错，请检查你输入的模型代码。 错误输出会给出非常有用的错误信息来帮助你修正你的模型。

模型确认没问题了，运行下面的命令来生成建表语句：

```bash
# 在 django1.7之后先执行这个命令
$ python manage.py migrate
$ python manage.py makemigrations

$ python manage.py  sql todo
    CommandError: App 'todo' has migrations. Only the sqlmigrate and sqlflush commands can be used when an app has migrations.

# 出现上面错误，则删除 todo/migrations
$ rm -rf todo/migrations

# 再次执行，可以看到建表语句
$ python manage.py sql todo
```

当然，你也可以执行下面的命令：

```bash
# 显示 CREATE TABLE 语句
$ python manage.py sql todo  

#输出为应用定义的任何 custom SQL statements ( 例如表或约束的修改 )
$ python manage.py sqlcustom todo

#为应用输出必要的 DROP TABLE 
$ python manage.py sqlclear todo    

#为应用输出 CREATE INDEX 语句
$ python manage.py sqlindexes todo   

# sqlclear和sql的组合 
$ python manage.py sqlreset todo  
```

manage.py参数列表

- `syncdb`：创建所有应用所需的数据表
- `sql `：显示CREATETABLE调用
- `sqlall` 如同上面的sql一样，从sql文件中初始化数据载入语句
- `sqlindexs`：显示对主键创建索引的调用
- `sqlclear`：显示DROP TABLE的调用
- `sqlcustom`：显示指定.sql文件里的自定义SQL语句
- `loaddata`：载入初始数据
- `dumpdata`：把原有的数据库里的数据输出伟JSON，XML等格式

sql、sqlall、sql、sqlindexs、sqlclear、sqlcustom不更新数据库，只打印SQL语句以作检验之用。

# 模型之间的关系

## 多对一

```python
class Author(models.Model):
    name = models.CharField(max_length=100)

class Book(models.Model):
    title = models.CharField(max_length=100)
    author = models.ForeignKey(Author)
```

Django 的外键表现很直观，其主要参数就是它要引用的模型类；但是注意要把被引用的类放在前面。不过，如果不想留意顺序，也可以用字符串代替。

```python
class Book(models.Model):
  title = models.CharField(max_length=100)
  author = models.ForeignKey("Author")
  #if Author class is defined in another file myapp/models.py
  #author = models.ForeignKey("myapp.Author")

class Author(models.Model):
   name = models.CharField(max_length=100)
```

如果要引用自己为外键，可以设置 `models.ForeignKey("self")` ，这在定义层次结构等类似场景很常用，比如 Employee 类可以具有类似 supervisor 或是 hired_by 这样的属性。

外键 ForeignKey 只定义了关系的一端，但是另一端可以根据关系追溯回来，因为这是一种多对一的关系，多个子对象可以引用同一个父对象，而父对象可以访问到一组子对象。看下面的例子：

```python
#取一本书“Moby Dick”
book = Book.objects.get(title="Moby Dick")

#取作者名字
author = Book.author

#获取这个作者所有的书
books = author.book_set.all()
```

这里从 Author 到 Book 的反向关系式通过 `Author.book_set` 属性来表示的（这是一个manager对象），是由 ORM 自动添加的，可以通过在 ForeignKey 里指定 `related_name` 参数来改变它的名字。比如：

```python
class Book(models.Model):
  author = models.ForeignKey("Author", related_name = "books")

#获取这个作者所有的书
books = author.books.all()
```

对简单的对象层次来说， `related_name` 不是必需的，但是更复杂的关系里，比如当有多个 ForeignKey 的时候就一定要指定了。

## 多对多

上面的例子假设的是一本书只有一个作者，一个作者有多本书，所以是多对一的关系；但是如果一本书也有多个作者呢？这就是多对多的关系；由于SQL没有定义这种关系，必须通过外键用它能理解的方式实现多对多

这里 Django 提供了第二种关系对象映射变量 `ManyToManyField`，语法上来讲， 这和 ForeignKey 是一模一样的，你在关系的一端定义，把要关联的类传递进来，ORM 会自动为另一端生成使用这个关系必要的方法和属性

不过由于 ManyToManyField 的特性，在哪一端定义它通常都没有关系，因为这个关系是对称的。

```python
class Author(models.Model):
  name = models.CharField(max_length=100)

class Book(models.Model):
  title = models.CharField(max_length=100)
  authors = models.ManyToManyField(Author)

#获取一本书
book = Book.objects.get(title="Python Web Dev Django")

#获取该书所有的作者
authors = Book.author_set.all()

#获取第三个作者出版过的所有的书
books = authors[2].book_set.all()
```

ManyToManyField 的秘密在于它在背后创建了一张新的表来满足这类关系的查询的需要，而这张表用的则是 SQL 外键，其中每一行都代表了两个对象的一个关系，同时包含了两端的外键

这张查询表在 Django ORM 中一般是隐藏的，不可以单独查询，只能通过关系的某一端查询；不过可以在 MTMField 上指定一个特殊的选项 through 来指向一个显式的中间模型类，更方便你的手动管理关系的两端

```python
class Author(models.Model):
  name = models.CharField(max_length=100)

class Book(models.Model):
  title = models.CharField(max_length=100)
  authors = models.ManyToManyField(Author, through = "Authoring")

class Authoring(models.Model):
  collaboration_type = models.CharField(max_length=100)
  book = model.ForeignKey(Book)
  author = model.ForeignKey(Author)
```

查询 Author 和 Book 的方法和之前完全一样，另外还能构造对 authoring 的查询：

```python
chan_essay_compilations = Book.objects.filter(
    author__name__endswith = 'Chun'
    authoring__collaboration_type = 'essays'
)
```

## 一对一

类似的，Django 提供了 OneToOneField 属性，几乎和 ForeignKey 一样，接受一个参数（要关联的类或者"self"），同样也接受一个可选参数 related_name ，这样就可以在两个相同的类里区分出多个这样的关系来。

不同的是，OTOField 没有在反向关系中添加 `reverse manager `，而只是增加了一个普通属性而已，因为关系的另一端一定只有一个对象。

这种关系最常用的是用来支持对象组合或者是拥有关系，所以相比现实世界，它更加面向对象一点。

在 Django直接支持模型继承之前，OTOField 主要是用来实现模型继承，而现在，则是转向对这个特性的幕后支持了。

关于定义关系的最后一点，ForeignKey 和 MTMField 都可以指定一个 `limit_choices_to `参数，这个参数接受一个字典，键值对是查询的关键字和值

```python
class Author(models.Model):
  name = models.CharField(max_length=100)

class SmithBook(models.Model):
  title = models.CharField(max_length=100)
  authors = models.ManyToManyField(Author, limit_choices_to={
    'name__endswith' : 'Smith'
  })
```

这个例子中，Book 模型就只能和姓 Smith 的 Authors 类一起工作。当然这个问题最好用另一种解决方案-------ModelChoiceField,ModelMultipleChoiceField

# 模型继承

Django目前支持几种不同的继承方式：

- 使用单个表。整个继承树共用一张表。使用唯一的表，包含所有基类和子类的字段。
- 每个具体类一张表，这种方式下，每张表都包含具体类和继承树上所有父类的字段。因为多个表中有重复字段，从整个继承树上来说，字段是冗余的。
- 每个类一张表，继承关系通过表的JOIN操作来表示。这种方式下，每个表只包含类中定义的字段，不存在字段冗余，但是要同时操作子类和所有父类所对应的表。

方式一：每个类一张表

```python
from django.db import models
 
class Person(models.Model):
  name = models.CharField(max_length=20)
  sex = models.BooleanField(default=True)
 
class teacher(Person):
  subject = models.CharField(max_length=20)
 
class student(Person):
  course = models.CharField(max_length=20)
```

执行 `python manage.py sqlall`：

```sql
BEGIN;
CREATE TABLE "blog_person" (
    "id" integer NOT NULL PRIMARY KEY,
    "name" varchar(20) NOT NULL,
    "sex" bool NOT NULL
)
;
CREATE TABLE "blog_teacher" (
    "person_ptr_id" integer NOT NULL PRIMARY KEY REFERENCES "blog_person" ("id"),
    "subject" varchar(20) NOT NULL
)
;
CREATE TABLE "blog_student" (
    "person_ptr_id" integer NOT NULL PRIMARY KEY REFERENCES "blog_person" ("id"),
    "course" varchar(20) NOT NULL
)
;
 
COMMIT;
```


方式二：每个具体类一张表，父类不需要创建表

```python
from django.db import models
 
class Person(models.Model):
  name = models.CharField(max_length=20)
  sex = models.BooleanField(default=True)
 
  class Meta:
    abstract = True
 
class teacher(Person):
  subject = models.CharField(max_length=20)
 
class student(Person):
  course = models.CharField(max_length=20)
```

执行 `python manage.py sqlall`：

```sql
BEGIN;
CREATE TABLE "blog_teacher" (
    "id" integer NOT NULL PRIMARY KEY,
    "name" varchar(20) NOT NULL,
    "sex" bool NOT NULL,
    "subject" varchar(20) NOT NULL
)
;
CREATE TABLE "blog_student" (
    "id" integer NOT NULL PRIMARY KEY,
    "name" varchar(20) NOT NULL,
    "sex" bool NOT NULL,
    "course" varchar(20) NOT NULL
)
;
 
COMMIT;
```

可以通过 Meta 嵌套类自定义每个子类的表名：

```python
from django.db import models
 
class Person(models.Model):
  name = models.CharField(max_length=20)
  sex = models.BooleanField(default=True)
 
  class Meta:
    abstract = True
 
class teacher(Person):
  subject = models.CharField(max_length=20)
 
  class Meta:
    db_table = "Teacher"
 
class student(Person):
  course = models.CharField(max_length=20)
 
  class Meta:
    db_table = "Student"
 ```   

方式三：代理模型，为子类增加方法，但不能增加属性

 ``` python  
from django.db import models
 
class Person(User):
  class Meta:
    proxy = True
 
  def some_function(self):
    ……
 ```   

这样的方式不会改变数据存储结构，但可以纵向的扩展子类Person的方法，并且基础User父类的所有属性和方法。

# Meta 嵌套类

模型里定义的变量 fields 和关系 relationships 提供了数据库的布局以及稍后查询模型时要用的变量名--经常你还需要添加__unicode__ 和 get_absolute_url 方法或是重写 内置的 save 和 delete方法。

然而，模型的定义还有第三个方面--告知Django关于这个模型的各种元数据信息的嵌套类 Meta，Meta 类处理的是模型的各种元数据的使用和显示：

- 比如在一个对象对多个对象是，它的名字应该怎么显示
- 查询数据表示默认的排序顺序是什么
- 数据表的名字是什么
- 多变量唯一性 （这种限制没有办法在每个单独的变量声明上定义）

Meta类有以下属性：

- `abstract`：定义当前的模型类是不是一个抽象类。
- `app_label`：这个选项只在一种情况下使用，就是你的模型类不在默认的应用程序包下的 models.py 文件中，这时候你需要指定你这个模型类是那个应用程序的
- `db_table`：指定自定义数据库表名
- `db_tablespace`：指定这个模型对应的数据库表放在哪个数据库表空间
- `get_latest_by`：由于 Django 的管理方法中有个 `lastest()`方法，就是得到最近一行记录。如果你的数据模型中有 DateField 或 DateTimeField 类型的字段，你可以通过这个选项来指定 `lastest()` 是按照哪个字段进行选取的。
- `managed`：由于 Django 会自动根据模型类生成映射的数据库表，如果你不希望 Django 这么做，可以把 managed 的值设置为 False。
- `order_with_respect_to`：这个选项一般用于多对多的关系中，它指向一个关联对象。就是说关联对象找到这个对象后它是经过排序的。指定这个属性后你会得到一个 `get_XXX_order()` 和 `set_XXX_order()` 的方法,通过它们你可以设置或者返回排序的对象。
- `ordering`：定义排序字段
- `permissions`：为了在 Django Admin 管理模块下使用的，如果你设置了这个属性可以让指定的方法权限描述更清晰可读
- `proxy`：为了实现代理模型使用的
- `unique_together`：定义多个字段保证数据的唯一性
- `verbose_name`：给你的模型类起一个更可读的名字
- `verbose_name_plural`：这个选项是指定模型的复数形式是什么

# 参考文章

- [Django 数据模型的字段列表整理](http://www.c77cc.cn/article-64.html)
- [跟我一起Django - 04 定义和使用模型](http://www.tuicool.com/articles/vU7vIz)
- [django的模型总结](http://iluoxuan.iteye.com/blog/1703061)
- [django ORM数据模型的定义](http://blog.coocla.org/414.html)
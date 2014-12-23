---
layout: post
title: Python基础入门
description: 本文介绍python的一些基础知识和语法。Python是一种解释性的面向对象的语言。Python使用C语言编写，不需要事先声明变量的类型（动态类型），但是一旦变量有了值，那么这个变脸是有一个类型的，不同类型的变量之间赋值需要类型转换（强类型）。
category: Python
tags: [python]
---

# 1. Python介绍

Python是一种解释性的面向对象的语言。Python使用C语言编写，不需要事先声明变量的类型（动态类型），但是一旦变量有了值，那么这个变脸是有一个类型的，不同类型的变量之间赋值需要类型转换（强类型）。

## 1.1 安装 Python

现在的操作系统都自带安装了 Python，要测试你是否安装了Python，你可以打开一个shell程序（就像konsole或gnome-terminal），然后输入如下所示的命令`python -V`

```
$ python -V
Python 2.7.4
```

如果你看见向上面所示的那样一些版本信息，那么你已经安装了Python了。

# 2. Python 基础

## 2.1 注释

无论是行注释还是段注释，均以 `#` 加一个空格来注释。

如果需要在代码中使用中文注释，必须在 python 文件的最前面加上如下注释说明：

```python
# -* - coding: UTF-8 -* -
```

如下注释用于指定解释器：

```python
#! /usr/bin/python
```

## 2.2 数据类型和变量

- python的数字类型分为整型、长整型、浮点型、布尔型、复数类型、None类型。
- python没有字符类型
- python内部没有普通类型，任何类型都是对象。
- 如果需要查看变量的类型，可以使用type类，该类可以返回变量的类型或创建一个新的类型。
 python有3种表示字符串类型的方式，即单引号、双引号、三引号。单引号和双引号的作用是相同的。python程序员更喜欢用单引号，C/Java程序员则习惯使用双引号表示字符串。三引号中可以输入单引号、双引号或换行等字符。

变量命名规则：

- 第一个字符必须是字母表中的字母（大写或小写）或者一个下划线（‘ _ ’）
- 其他部分可以由字母（大写或小写）、下划线（‘ _ ’）或数字（0-9）组成
- 对大小写敏感

python中的变量不需要声明，变量的赋值操作即使变量声明和定义的过程。

```python
>>>a = 10
```

那么你的内存里就有了一个变量a， 它的值是10，它的类型是integer (整数)。 在此之前你不需要做什么特别的声明，而数据类型是Python自动决定的。

```python
>>>print a
>>>print type(a)
```

那么会有如下输出：

```
10
<type 'int'>
```

这里，我们学到一个内置函数type(), 用以查询变量的类型。

如果你想让a存储不同的数据，你不需要删除原有变量就可以直接赋值。

```python
>>>a = 1.3
>>>print a,type(a)
```

会有如下输出：

```
1.3 <type 'float'>
```

python 中一次新的赋值，将创建一个新的变量。即使变量的名称相同，变量的标识并不相同。用id()函数可以获取变量标识：

```python
x = 1
print id(x)
x = 2
print id(x)
```

如果变量没有赋值，则python认为该变量不存在。

在函数之外定义的变量都可以称为全局变量。全局变量可以被文件内部的任何函数和外部文件访问。

全局变量建议在文件的开头定义，也可以把全局变量放到一个专门的文件中，然后通过import来引用

## 2.3 序列

sequence(序列)是一组有顺序的元素的集合。

- 序列包括字符串、列表、元组。
- 序列可以包含一个或多个元素，也可以没有任何元素。
- 使用索引来访问序列，索引从0开始。
- 可以使用分片操作来访问一定范围内的元素。


序列有两种：tuple（定值表； 也有翻译为元组） 和 list (表)。tuple 和 list 的主要区别在于，一旦建立，tuple 的各个元素不可再变更，而 list 的各个元素可以再变更。

```python
>>>s1 = (2, 1.3, 'love', 5.6, 9, 12, False)         # s1是一个tuple
>>>s2 = [True, 5, 'smile']                          # s2是一个list
>>>print s1,type(s1)
>>>print s2,type(s2)
```

序列可以进行相加和乘法等操作：

```python
>>> [1,2]+[3,4]
  [1,2,3,4]

#列表和字符串是无法连接在一起的
>>> "hello,"+"world!"
  "hello,world!"

>>> "a" * 5
  "aaaaa"
>>> [2] * 5
  [2,2,2,2,2]

#初始化一个长度为3的空序列
>>> seq=[None] * 3
  [None,None,Noe]

#判断一个元素是否存在于序列中
>>> permissions='rw'  
>>> 'w' in permissions
  True

>>> users=['a','b','c']
>>> 'a' in users
  True

>>> database=[
  ['a','1234'],
  ['b','2344']
]  
>>> ['c','1234'] in database
  False
```

切片操作示例：

```python
>>> num=[1,2,3,4,5,6,7,8,9,10]

>>> num[3:6]
  [4,5,6]

#索引从0开始
>>> num[0:1]
  [1]

#索引可以为负数
>>> num[-3:-1]
  [8,9]

#取最后三个元素
>>> num[-3:]
  [8,9,10]

#取所有元素
>>> num[:]
  [1,2,3,4,5,6,7,8,9,10]


#指定步长,步长可以是正数或者负数，但不能为0，为负数时，分片从右到左提取元素
>>> num[0:10:2]
  [1,3,5,7,9]

>>> num[10:0:-2]
  [10,8,6,4,2]
>>> num[0:10:-2]
  []
```

## 2.4. 列表

列表类似于c语言中的数组，用于存储顺序结构。例如：`[1,2,3,4,5]`。列表中的各个元素可以是任意类型，元素之间用逗号分隔。列表的下标从0开始，和c语言类似，但是增加了负下标的使用。

对列表的操作：

```python
>>> names=['zhangsan','lisi','lili','wangwu']

#删除
>>> del names[0]

#分片赋值
>>> names[1:]=list('ab') #list函数用于将字符串转换为列表
>>> names
  ['lisi','a','b']

#在不需要替换任何原有元素的情况下插入新元素
>>> names[1:1]=['c','d']
>>> names
  ['lisi','c','d','a','b']
>>> names[1:4]=[]
>>> names
  ['lisi','b']

#添加
>>> names.append('bb')
>>> names.count('b')

#extend效率高于连接操作
>>> names.extend(['c','e','d'])
>>> names
  ['lisi','b','bb','c','e','d']

>>> names.index('lisi')
>>> names.insert(1,'a')
>>> names.pop()
  'e'
>>> names.remove('lisi')
>>> names
  ['a','b','bb','c','e','d']
>>> names.reverse()
  ['d','e','c','bb','b','a']

#排序
>>> names.sort()
  ['a','b','bb','c','d','e']
>>> sorted(names)
  ['a','b','bb','c','d','e']

#高级排序
>>> names.sort(cmp)
>>> names.sort(key=len)
>>> names.sort(reverse=True)
```

## 2.5 元组

元组 tuple 是常量 list。tuple 不能 pop,remove,insert 等方法。
- tuple 用 `()` 表示，如 `a=(1,2,3,4)`,括号可以省略。
- tuple 可以用下标返回元素或者子 tuple
- tuple 可以用于多个变量的赋值。例如：`a,b=(1,2)`
- 表示只含有一个元素的 tuple 的方法是：`(1,)`,后面有个逗号，用来和单独的变量相区分。
- 字符串是一种特殊的元素，因此可以执行元组的相关操作。

tuple 比 list 性能好，也就是不用提供动态内存管理的功能。

```python
#定义一个元组
>>> 1,2,3
  (1,2,3)

#空的元组
>>> ()

>>> 42
  42
>>> 42,
  (42,)
>>> (42,)
  (42,)

#tuple函数
>>> tuple([1,2,3])
  (1,2,3)
>>> tuple('abc')
  ('a','b','c')
>>> tuple((1,2,3))
  (1,2,3)

>>> x=1,2,3
>>> x[1]
  2
>>> x[0:2]
  (1,2)
```

## 2.6 字典

字典是一个无序存储结构。每一个元素是一个 pair，包括 key 和 value 两个不服。key 的类型是 integer 或者 string 或者任何同时含有 `__hash__`和`__cmp__` 的对象。字典中没有重复的 key，其每一个元素是一个元组。

创建和使用字典：

```python
phonebook = {'zhangsan':'1234',"lisi":'1231'}
```

dict函数：

```python
>>> items = [('name','aa'),('age',18)]
>>> d = dict(items)
>>> d
  {'age':18,'name':'aa'}

>>> d = dict(name='aa',age=18)
>>> d
  {'age':18,'name':'aa'}
```

字典的基本操作：

## 2.7 set

set和dict类似，也是一组key的集合，但不存储value。由于key不能重复，所以，在set中，没有重复的key。

要创建一个set，需要提供一个list作为输入集合：

```python
>>> s = set([1, 2, 3])
>>> s
set([1, 2, 3])
```

注意，传入的参数[1, 2, 3]是一个list，而显示的set([1, 2, 3])只是告诉你这个set内部有1，2，3这3个元素，显示的[]不表示这是一个list。

重复元素在set中自动被过滤：

```python
>>> s = set([1, 1, 2, 2, 3, 3])
>>> s
set([1, 2, 3])

通过add(key)方法可以添加元素到set中，可以重复添加，但不会有效果：

```python
>>> s.add(4)
>>> s
set([1, 2, 3, 4])
>>> s.add(4)
>>> s
set([1, 2, 3, 4])
```

通过remove(key)方法可以删除元素：

```python
>>> s.remove(4)
>>> s
set([1, 2, 3])
```

set可以看成数学意义上的无序和无重复元素的集合，因此，两个set可以做数学意义上的交集、并集等操作：

```python
>>> s1 = set([1, 2, 3])
>>> s2 = set([2, 3, 4])
>>> s1 & s2
set([2, 3])
>>> s1 | s2
set([1, 2, 3, 4])
```

set和dict的唯一区别仅在于没有存储对应的value，但是，set的原理和dict一样，所以，同样不可以放入可变对象，因为无法判断两个可变对象是否相等，也就无法保证set内部“不会有重复元素”。试试把list放入set，看看是否会报错。

## 2.8 字符串

### 字符串

普通字符串使用双引号或者单引号或者 `"""` 来表示。例如：

```python
print "hello,world !"

print "hello,\
world !"

print '''
    hello,world!
'''

print """
    hello,world!
"""
```

### 自然字符串

如果你想要指示某些**不需要如转义符那样的特别处理**的字符串，那么你需要指定一个自然字符串。自然字符串通过给字符串加上前缀 `r` 或 `R` 来指定。例如

```python
r"Newlines are indicated by \n".
```

注意：**自然字符串结尾不能输入反斜线**

### Unicode字符串

Unicode 是书写国际文本的标准方法。如果你想要用你的母语如北印度语或阿拉伯语写文本，那么你需要有一个支持 Unicode  的编辑器。类似地，Python 允许你处理 Unicode 文本——你只需要在字符串前加上前缀 `u` 或 `U`。例如：

```python
u"This is a Unicode string.".
```

Python 中的普通字符串在内部是以8位的 ascii 码形式存储的，而 Unicode 字符串则存储为16位 Unicode 字符。

记住，在你处理文本文件的时候使用 Unicode 字符串，特别是当你知道这个文件含有用非英语的语言写的文本。

# 3. 函数

- python程序由包(package)、模块(module)和函数组成。包是由一系列模块组成的集合。模块是处理某一类问题的函数和类的集合。
- 包就是一个完成特定任务的工具箱。
- 包必须含有一个`__init__.py`文件，它用于标识当前文件夹是一个包。
- python的程序是由一个个模块组成的。模块把一组相关的函数或代码组织到一个文件中，一个文件即是一个模块。模块由代码、函数和类组成。导入模块使用import语句。
- 包的作用是实现程序的重用。
- 函数是一段可以重复多次调用的代码。
- 函数返回值可以用return来控制。

## 3.1 定义函数

函数定义示例如下：

```python
def arithmetic(x,y,operator):
   result={
      "+":x+y,
      "-":x-y,
      "*":x*y,
      "/":x/y
   }
```

## 3.2 函数的参数

### 默认参数

最有用的形式是为一个或更多参数指定默认值。这样创建的函式调用时可以不用给足参数.。例如:

```python
def ask_ok(prompt, retries=4, complaint='Yes or no, please!'):
    pass
```

### 关键字参数

函式也可以通过 keyword = value 形式的关键字参数来调用。例如:

```python
ask_ok('ok?',complaint='Yes or no, please!')
```

### 可变参数

在Python函数中，还可以定义可变参数。顾名思义，可变参数就是传入的参数个数是可变的，可以是1个、2个到任意个，还可以是0个。


```python
def calc(*numbers):
    sum = 0
    for n in numbers:
        sum = sum + n * n
    return sum

>>> calc(1, 2)
5
>>> calc()
0

>>> nums = [1, 2, 3]
>>> calc(*nums)
14
```

### 关键字参数

可变参数允许你传入0个或任意个参数，这些可变参数在函数调用时自动组装为一个tuple。而关键字参数允许你传入0个或任意个含参数名的参数，这些关键字参数在函数内部自动组装为一个dict。请看示例：

```python
def person(name, age, **kw):
    print 'name:', name, 'age:', age, 'other:', kw
```

函数person除了必选参数name和age外，还接受关键字参数kw。在调用该函数时，可以只传入必选参数：

```python
>>> person('Michael', 30)
name: Michael age: 30 other: {}
```

也可以传入任意个数的关键字参数：

```python
>>> person('Bob', 35, city='Beijing')
name: Bob age: 35 other: {'city': 'Beijing'}
>>> person('Adam', 45, gender='M', job='Engineer')
name: Adam age: 45 other: {'gender': 'M', 'job': 'Engineer'}
```

### 参数组合

在Python中定义函数，可以用必选参数、默认参数、可变参数和关键字参数，这4种参数都可以一起使用，或者只用其中某些，但是请注意，参数定义的顺序必须是：必选参数、默认参数、可变参数和关键字参数。

比如定义一个函数，包含上述4种参数：

```python
def func(a, b, c=0, *args, **kw):
    print 'a =', a, 'b =', b, 'c =', c, 'args =', args, 'kw =', kw
```

在函数调用的时候，Python解释器自动按照参数位置和参数名把对应的参数传进去。

```python
>>> func(1, 2)
a = 1 b = 2 c = 0 args = () kw = {}
>>> func(1, 2, c=3)
a = 1 b = 2 c = 3 args = () kw = {}
>>> func(1, 2, 3, 'a', 'b')
a = 1 b = 2 c = 3 args = ('a', 'b') kw = {}
>>> func(1, 2, 3, 'a', 'b', x=99)
a = 1 b = 2 c = 3 args = ('a', 'b') kw = {'x': 99}
```

最神奇的是通过一个tuple和dict，你也可以调用该函数：

```python
>>> args = (1, 2, 3, 4)
>>> kw = {'x': 99}
>>> func(*args, **kw)
a = 1 b = 2 c = 3 args = (4,) kw = {'x': 99}
```

所以，对于任意函数，都可以通过类似`func(*args, **kw)`的形式调用它，无论它的参数是如何定义的。

### 参数列表解包

也存在相反的情形: 当参数存在于一个既存的列表或者元组之中, 但却需要解包以若干位置参数的形式被函数调用. 例如, 内建的 range() 函数期望接收分别的开始和结束的位置参数. 如果它们不是分别可用 (而是同时存在于一个列表或者元组中), 下面是一个利用 * 操作符解从列表或者元组中解包参数以供函数调用的例子:

```python
>>> x,y,z=1,2,3
>>> print x,y,z
  1 2 3

#交换值
>>> x,y=y,x

>>> phonebook = {'zhangsan':'1234',"lisi":'1231'}
>>> key,value=phonebook.popitem()

>>> list(range(3, 6))            # 使用分离的参数正常调用
[3, 4, 5]
>>> args = [3, 6]
>>> list(range(*args))           # 通过解包列表参数调用
[3, 4, 5]
```

同样的, 字典可以通过 ** 操作符来解包参数:

```python
>>> def parrot(voltage, state='a stiff', action='voom'):
     print("-- This parrot wouldn't", action, end=' ')
     print("if you put", voltage, "volts through it.", end=' ')
     print("E's", state, "!")

>>> d = {"voltage": "four million", "state": "bleedin' demised", "action": "VOOM"}
>>> parrot(**d)
-- This parrot wouldn't VOOM if you put four million volts through it. E's bleedin' demised !
```

# 4. 流程控制

## 4.1 if 语句

```python
>>> x = int(input("Please enter an integer: "))
Please enter an integer: 42
>>> if x < 0:
      x = 0
      print('Negative changed to zero')
 elif x == 0:
      print('Zero')
 elif x == 1:
      print('Single')
 else:
      print('More')
```

## 4.2 for 语句

Python中的 for 语句与你在 C 或是 Pascal 中使用的略有不同. 不同于在 Pascal 中总是依据一个等差的数值序列迭代, 也不同于在 C 中允许用户同时定义迭代步骤和终止条件, Python中的 for 语句在任意序列 (列表或者字符串) 中迭代时, 总是按照元素在序列中的出现顺序依次迭代.

```python
 a = ['cat', 'window', 'defenestrate']
>>> for x in a:
     print(x, len(x))

```

在循环过程中修改被迭代的对象是不安全的 (这只可能发生在可变序列类型上,如列表)。

若想在循环体内修改你正迭代的序列 (例如复制序列中选定的项), 最好是先制作一个副本。

而切片则让这种操作十分方便:

```python
>>> for x in a[:]: # 制造整个列表的切片复本
    if len(x) > 6: a.insert(0, x)
```

## 4.4 pass 语句

pass 语句什么都不做. 当语法上需要一个语句, 但程序不要动作时, 就可以使用它. 例如:

```python
>>> while True:
     pass  # 忙等待键盘中断 (Ctrl+C)

```

一般也可以用于创建最小类:

```python
>>> class MyEmptyClass:
     pass
```

另一个使用 pass 的地方是, 作为函式或条件体的占位符, 当你在新代码工作时, 它让你能保持在更抽象的级别思考. pass 会被默默地被忽略:

```python
>>> def initlog(*args):
     pass   # 记得实现这里!
```

# 5. 高级特性

## 5.1 切片

## 5.2 迭代

## 5.3 列表推导式

```python
>>> [x*x for x in range(7)]
 [0,1,4,9,16,25,36]

>>> [x*x for x in range(7) if x%3 ==0 ]
 [0,9,36]

>>> [(x,y) for x in range(3) for y in range(2)]
  [(0,0),(0,1),(1,0),(1,1),(2,0),(2,1)]
```

## 5.4 生成器

# 6. 函数式编程

# 7. 模块

# 8. 面向对象

# 9. 异常处理

# 10. IO 编程

# 11. 多线程

# 12. 常见内置函数

# 参考文章

 - [Python教程](http://www.liaoxuefeng.com/wiki/001374738125095c955c1e6d8bb493182103fac9270762a000)

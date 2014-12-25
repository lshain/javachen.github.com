---
layout: post

title: Python中常见模块

category: python

tags: [ python ]

description: 主要记录 python 中常见的一些模块的用法和说明。

published: false

---

### 文件管理

使用 glob 模块可以用通配符的方式搜索某个目录下的特定文件，返回结果是一个 list：

```python
import glob

flist=glob.glob('*.jpeg')
```

使用 `os.getcwd()` 可以得到当前目录，如果想切换到其他目录，可以使用 `os.chdir('str/to/path')`，如果想执行 Shell 脚本，可以使用 `os.system('mkdir newfolder')`。

对于日常文件和目录的管理, shutil 模块提供了更便捷、更高层次的接口

```python
import shutil

shutil.copyfile('data.db', 'archive.db')
shutil.move('/build/executables', 'installdir')
```

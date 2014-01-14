---
layout: post
title: vim配置和插件管理
category: java
tags: [vim、plguin]
description: 这篇文章主要是记录vim配置中各个配置项的含义并且收藏一些常用的插件及其使用方法。
---

这篇文章主要是记录vim配置中各个配置项的含义并且收藏一些常用的插件及其使用方法。

# 1. vim配置

目前我的vimrc配置放置在:[https://github.com/javachen/snippets/blob/master/dotfiles/.vimrc](https://github.com/javachen/snippets/blob/master/dotfiles/.vimrc)，其中大多数用英文注释。

# 2. 插件管理

## pathogen

项目地址:	[https://github.com/tpope/vim-pathogen](https://github.com/tpope/vim-pathogen)

首选需要安装神器 pathogen 来管理所有的插件，具体安装可以看官网的介绍。

要记得把以下内容加入到vimrc文件中:

```
execute pathogen#infect()
```
<!-- more -->

## NERDTree

NERD tree允许你在Vim编辑器中以树状方式浏览系统中的文件和目录, 支持快捷键与鼠标操作, 使用起来十分方便. NERD tree能够以不同颜色高亮显示节点类型, 并包含书签, 过滤等实用功能. 配合taglist或txtviewer插件, 右边窗口显示本文件夹的文件, 左边窗口显示本文的文档结构, 将会使管理一个工程变得相当容易.

项目地址:	[https://github.com/scrooloose/nerdtree](https://github.com/scrooloose/nerdtree)

因为我是从Ulipad转到Vim的，刚开始的时候没了目录树。总感觉非常的不习惯，于是找到了这个目录树插件。

安装方法很简单，只要把项目clone一份到bundle目录就可以了。

```
cd ~/.vim/bundle
git clone https://github.com/scrooloose/nerdtree.git
```

之后的插件也都是这么安装。

### 使用

1. 在linux命令行界面，输入vim
2. 输入  :NERDTree ，回车
3. 入当前目录的树形界面，通过小键盘上下键，能移动选中的目录或文件
4. 目录前面有+号，摁Enter会展开目录，文件前面是-号，摁Enter会在右侧窗口展现该文件的内容，并光标的焦点focus右侧。
5. ctr+w+h  光标focus左侧树形目录，ctrl+w+l 光标focus右侧文件显示窗口。多次摁 ctrl+w，光标自动在左右侧窗口切换
6. 光标focus左侧树形窗口，按 ? 弹出NERDTree的帮助，再次按？关闭帮助显示
7. 输入:q回车，关闭光标所在窗口

除了使用鼠标可以基本操作以外，还可以使用键盘。下面列出常用快捷键

```
o 打开关闭文件或者目录
t 在标签页中打开
T 在后台标签页中打开
! 执行此文件
p 到上层目录
P 到根目录
K 到第一个节点
J 到最后一个节点
u 打开上层目录
m 显示文件系统菜单（添加、删除、移动操作）
? 帮助
q 关闭
```

## NERDTree-Tabs

项目地址:[https://github.com/jistr/vim-nerdtree-tabs](https://github.com/jistr/vim-nerdtree-tabs)

安装完NERDTree以后我觉得还需要安装一下NERDTree-Tabs这个插件，提供了很多NERDTree的加强功能，包括保持 目录树状态、优化tab标题等等。

可以把一下内容添加到vimrc文件中

```
let g:nerdtree_tabs_open_on_console_startup=1       "设置打开vim的时候默认打开目录树
map <leader>n <plug>NERDTreeTabsToggle <CR>         "设置打开目录树的快捷键
```

## supertab

项目地址:	[https://github.com/ervandew/supertab](https://github.com/ervandew/supertab)

增强tab键的功能，建议安装。

## ctrlp

项目地址:	[https://github.com/kien/ctrlp.vim](https://github.com/kien/ctrlp.vim)

快捷键：`ctrl+p`

# 3. 参考

- [https://github.com/wklken/k-vim](https://github.com/wklken/k-vim)
- [http://www.zhihu.com/question/19989337](http://www.zhihu.com/question/19989337)
- [http://www.cnblogs.com/ma6174/archive/2011/12/10/2283393.html](http://www.cnblogs.com/ma6174/archive/2011/12/10/2283393.html)

---
layout: post
title:  安装RHadoop
date: 2013-07-20 15:10
category: hadoop
tags: [hadoop, R, rhadoop]
keywords: hadoop, rhadoop
description: 安装RHadoop
---

## 安装R
### 安装相关依赖

	yum install -y perl* pcre-devel tcl-devel zlib-devel bzip2-devel libX11-devel tk-devel tetex-latex *gfortran*  compat-readline5

### 安装R

	yum install libRmath-*
	rpm -Uvh --force --nodeps  R-core-2.10.0-2.el5.x86_64.rpm
	rpm -Uvh R-2.10.0-2.el5.x86_64.rpm R-devel-2.10.0-2.el5.x86_64.rpm

### 编译安装：R-3.0.1

	tar -zxvf R-3.0.1 
	./configure 	
	make 
	make install #R运行
	export HADOOP_CMD=/usr/bin/hadoop

### 排错

1、error: --with-readline=yes (default) 

安装yum install readline*

2、error: No F77 compiler found 

安装gfortran

3、error: –with-x=yes (default) and X11 headers/libs are not available 

安装yum install libXt*

4、error: C++ preprocessor "/lib/cpp" fails sanity check 

安装g++或build-essential（redhat6.2安装gcc-c++和glibc-headers）

### 验证是否安张成功

	[root@node1 bin]# R

	R version 3.0.1 (2013-05-16) -- "Good Sport"
	Copyright (C) 2013 The R Foundation for Statistical Computing
	Platform: x86_64-unknown-linux-gnu (64-bit)

	R是自由软件，不带任何担保。
	在某些条件下你可以将其自由散布。
	用'license()'或'licence()'来看散布的详细条件。

	R是个合作计划，有许多人为之做出了贡献.
	用'contributors()'来看合作者的详细情况
	用'citation()'会告诉你如何在出版物中正确地引用R或R程序包。

	用'demo()'来看一些示范程序，用'help()'来阅读在线帮助文件，或
	用'help.start()'通过HTML浏览器来看帮助文件。
	用'q()'退出R.

	>

## 安装Rhadoop

	cd Rhadoop/
	R CMD javareconf
	R CMD INSTALL 'plyr_1.8.tar.gz'
	R CMD INSTALL 'stringr_0.6.2.tar.gz'
	R CMD INSTALL 'reshape2_1.2.2.tar.gz'
	R CMD INSTALL 'digest_0.6.3.tar.gz'
	R CMD INSTALL 'functional_0.4.tar.gz'
	R CMD INSTALL 'iterators_1.0.6.tar.gz'
	R CMD INSTALL 'itertools_0.1-1.tar.gz'
	R CMD INSTALL 'Rcpp_0.10.3.tar.gz'
	R CMD INSTALL 'rJava_0.9-4.tar.gz'
	R CMD INSTALL 'RJSONIO_1.0-3.tar.gz'
	R CMD INSTALL 'reshape2_1.2.2.tar.gz'
	R CMD INSTALL 'rhdfs_1.0.5.tar.gz'
	R CMD INSTALL 'rmr2_2.2.0.tar.gz'

R library(rhdfs)检查是否能正常工作

## 安装rhbase    thrift-0.9.0

	yum install boost*
	yum install openssl*
 	tar -zxvf thrift-0.9.0.tar.gz
 	./configure --with-boost=/usr/include/boost JAVAC=/usr/java/jdk1.6.0_31/bin/javac
 	make
 	make install


	yum install openssl*
	export PKG_CONFIG_PATH=$PKG_CONFIG_PATH:/usr/local/lib/pkgconfig/
 	pkg-config --cflags thrift    ##返回：-I/usr/local/include/thrift为正确
 	cp /usr/local/lib/libthrift-0.9.0.so /usr/lib/
 	cp /usr/local/lib/libthrift-0.9.0.so /usr/lib64/
 
启动hbase：

	/usr/lib/hbase/bin/hbase-daemon.sh  start  thrift 

使用jps查看thrift进程
 
安装rhbase

	R CMD INSTALL 'rhbase_1.1.1.tar.gz'

R载入 library(rhbase) 检查rhbase是否可用

## 验证并测试 

在R命令行中输入library(rmr2)、library(rhdfs)、library(rhbase)，载入成功即表示安装成功



---
layout: post
title:  通过Cloudera Manager安装CDH
date:  2013-06-24 21:00
categories: Hadoop
tags: Hadoop
---

你可以从[https://ccp.cloudera.com/display/SUPPORT/Downloads](https://ccp.cloudera.com/display/SUPPORT/Downloads)下载cloudera-manager-installer.bin，然后修改执行权限并执行该脚本。
该脚本中配置的rhel6的yum源为：[http://archive.cloudera.com/cm4/redhat/6/x86_64/cm/4/](http://archive.cloudera.com/cm4/redhat/6/x86_64/cm/4/)，下载的过程必须连网并且rpm的过程会非常慢，这种方法对虚拟机或者是无法连网的内网机器来说根本无法使用。

因为知道所有的rpm都在上面网址可以下载到，故你可以手动下载这些rpm然后手动安装，详细过程请参考：[通过cloudera-manager来安装hadoop](http://dreamyue.com/post/41090075449/cloudera-manager-hadoop)。

这里还有一种方法，就是手动下载`Cloudera Manager`的yum tar包，在虚拟机中搭建一个本地yum源，然后修改hosts文件，使`archive.cloudera.com`域名映射到本地ip。

出于好奇，想破解`cloudera-manager-installer.bin`，然后看看其中做了哪些操作。通过以下脚本即可解压该文件：

```
[june@june-fedora cdh]$ mv cloudera-manager-installer.bin cloudera-manager-installer.zip
[june@june-fedora cdh]$ unzip cloudera-manager-installer.zip 
```

解压之后的目录如下：

```
[june@june-fedora cloudera-manager-installer]$ ll
总用量 512
-rwxrwxr-x. 1 june june 501698 5月  25 09:53 cloudera-manager-installer.zip
drwxr-xr-x. 2 june june   4096 5月  23 03:05 data
drwxr-xr-x. 2 june june   4096 5月  22 21:48 guis
drwxr-xr-x. 2 june june   4096 5月  22 21:48 meta
drwxr-xr-x. 2 june june   4096 5月  22 21:48 scripts
```

查看解压之后的文件可以看到安装脚本是用lua编写并用MojoSetup编译的，从scripts/config.lua脚本中大概可以看出安装脚本的执行过程。

整理下该脚本逻辑，主要是做了以下操作：

```
yum install -y jdk.x86_64 
yum install -y cloudera-manager-server 
yum install -y cloudera-manager-server-db
/etc/init.d/cloudera-scm-server start
/etc/init.d/cloudera-scm-server-db start
```

知道了上面这点之后，就可以在本地的cloudera-manager yum中，执行以上操作完成cloudera-manager的安装，安装成功之后即可以访问web界面。

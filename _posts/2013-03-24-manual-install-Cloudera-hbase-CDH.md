---
layout: post
title: 手动安装Cloudera HBase CDH
date: 2013-03-24 15:05
category: Hadoop
tags: [hbase, cdh]
keywords: hbase, cdh, cloudera manager
description: 主要记录手动安装cloudera HBase cdh4.2.0集群过程，环境设置及Hadoop安装过程见上篇文章。
---

本文主要记录手动安装cloudera HBase cdh4.2.0集群过程，环境设置及Hadoop安装过程见上篇文章。

### 安装HBase
HBase安装在desktop3、desktop4、desktop6、desktop7、desktop8机器上。

1. 上传文件
上传hbase-0.94.2-cdh4.2.0.zip到desktop3上，先在desktop3上修改好配置文件，在同步到其他机器上。

2. hbase-site.xml 

	# pwd
	/opt/hbase-0.94.2-cdh4.2.0/conf
	# cat hbase-site.xml 
	<?xml version="1.0"?>
	<?xml-stylesheet type="text/xsl" href="configuration.xsl"?>
	<configuration>
	<property>
	<name>hbase.rootdir</name>
	<value>hdfs://desktop1/hbase-${user.name}</value>
	</property>
	<property>
	<name>hbase.cluster.distributed</name>
	<value>true</value>
	</property>
	<property>
	<name>hbase.tmp.dir</name>
	<value>/opt/data/hbase-${user.name}</value>
	</property>
	<property>
	<name>hbase.zookeeper.quorum</name>
	<value>desktop3,desktop4,desktop6,desktop7,desktop8</value>
	</property>
	</configuration>

3. regionservers

	# cat regionservers 
	desktop3
	desktop4
	desktop6
	desktop7
	desktop8

4. 环境变量
参考hadoop中环境变量的设置

5. 同步文件
同步文件到其他4台机器上

6. 启动脚本
可以在desktop3上配置无密码登陆到其他机器，然后在desktop3上启动hbase，这样其他节点上hbase都可以启动，否则，需要每台机器上单独启动hbase

	# start-hbase.sh 


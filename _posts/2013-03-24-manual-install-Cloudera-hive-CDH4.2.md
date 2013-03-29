---
layout: post
title: 手动安装Cloudera Hive CDH4.2
date: 2013-03-24 15:00
categories: Hadoop
tags: hadoop
summary: 主要记录手动安装cloudera Hive cdh4.2.0集群过程，环境设置及Hadoop、HBase安装过程见上篇文章。
---

本文主要记录手动安装cloudera Hive cdh4.2.0集群过程，环境设置及Hadoop、HBase安装过程见上篇文章。

### 安装hive
hive安装在desktop1上

####  上传文件
上传hive-0.10.0-cdh4.2.0.tar到desktop1的/opt，并解压缩

#### 安装postgres
1. 创建数据库

```
psql -U postgres

CREATE DATABASE metastore;
 \c metastore;
CREATE USER hiveuser WITH PASSWORD 'password';
GRANT ALL ON DATABASE metastore TO hiveuser;
\q
```

2. 初始化数据库

```
psql  -U hiveuser -d metastore
 \i /opt/hive-0.10.0-cdh4.2.0/scripts/metastore/upgrade/postgres/hive-schema-0.10.0.postgres.sql 
```

3. 编辑配置文件

```
[root@desktop1 ~]# vi /opt/PostgreSQL/9.1/data/pg_hba.conf

# IPv4 local connections:
host    all             all             0.0.0.0/0            md5

[root@desktop1 ~]# vi postgresql.conf

standard_conforming_strings = off
```

4. 重起postgres

```
su -c '/opt/PostgreSQL/9.1/bin/pg_ctl -D /opt/PostgreSQL/9.1/data restart' postgres
```

5. 拷贝postgres 的jdbc驱动到/opt/hive-0.10.0-cdh4.2.0/lib

####  修改配置文件
1. hive-site.xml 
注意修改下面配置文件中postgres数据库的密码

```
[root@desktop1 ~]# cd /opt/hive-0.10.0-cdh4.2.0/conf/
[root@desktop1 conf]# cat hive-site.xml 
<?xml version="1.0"?>
<?xml-stylesheet type="text/xsl" href="configuration.xsl"?>
<configuration>
<property>
  <name>javax.jdo.option.ConnectionURL</name>
  <value>jdbc:postgresql://127.0.0.1/metastore</value>
  <description>JDBC connect string for a JDBC metastore</description>
</property>

<property>
  <name>javax.jdo.option.ConnectionDriverName</name>
  <value>org.postgresql.Driver</value>
  <description>Driver class name for a JDBC metastore</description>
</property>

<property>
  <name>javax.jdo.option.ConnectionUserName</name>
  <value>hiveuser</value>
  <description>username to use against metastore database</description>
</property>

<property>
  <name>javax.jdo.option.ConnectionPassword</name>
  <value>redhat</value>
  <description>password to use against metastore database</description>
</property>

<property>
 <name>mapred.job.tracker</name>
 <value>desktop1:8031</value>
</property>

<property>
 <name>mapreduce.framework.name</name>
 <value>yarn</value>
</property>

<property>
  <name>hive.aux.jars.path</name>
  <value>file:///opt/hive-0.10.0-cdh4.2.0/lib/zookeeper-3.4.5-cdh4.2.0.jar,
	file:///opt/hive-0.10.0-cdh4.2.0/lib/hive-hbase-handler-0.10.0-cdh4.2.0.jar,
	file:///opt/hive-0.10.0-cdh4.2.0/lib/hbase-0.94.2-cdh4.2.0.jar,
	file:///opt/hive-0.10.0-cdh4.2.0/lib/guava-11.0.2.jar</value>
</property>

<property>
  <name>hive.metastore.warehouse.dir</name>
  <value>/opt/data/warehouse-${user.name}</value>
  <description>location of default database for the warehouse</description>
</property>

<property>
  <name>hive.exec.scratchdir</name>
  <value>/opt/data/hive-${user.name}</value>
  <description>Scratch space for Hive jobs</description>
</property>

<property>
  <name>hive.querylog.location</name>
  <value>/opt/data/querylog-${user.name}</value>
  <description>
    Location of Hive run time structured log file
  </description>
</property>

<property>
  <name>hive.support.concurrency</name>
  <description>Enable Hive's Table Lock Manager Service</description>
  <value>true</value>
</property>

<property>
  <name>hive.zookeeper.quorum</name>
  <description>Zookeeper quorum used by Hive's Table Lock Manager</description>
  <value>desktop3,desktop4,desktop6,desktop7,desktop8</value>
</property>

<property>
  <name>hive.hwi.listen.host</name>
  <value>desktop1</value>
  <description>This is the host address the Hive Web Interface will listen on</description>
</property>

<property>
  <name>hive.hwi.listen.port</name>
  <value>9999</value>
  <description>This is the port the Hive Web Interface will listen on</description>
</property>

<property>
  <name>hive.hwi.war.file</name>
  <value>lib/hive-hwi-0.10.0-cdh4.2.0.war</value>
  <description>This is the WAR file with the jsp content for Hive Web Interface</description>
</property>
</configuration>
```

2. 环境变量
参考hadoop中环境变量的设置

3. 启动脚本

```
[root@desktop1 ~] hive
```

4. hive与hbase集成
在hive-site.xml中配置hive.aux.jars.path
在环境变量中配置hadoop、mapreduce的环境变量


### 异常说明
* FAILED: Error in metadata: MetaException(message:org.apache.hadoop.hbase.ZooKeeperConnectionException: An error is preventing HBase from connecting to ZooKeeper

hadoop配置文件没有zk

* FAILED: Error in metadata: MetaException(message:Got exception: org.apache.hadoop.hive.metastore.api.MetaException javax.jdo.JDODataStoreException: Error executing JDOQL query "SELECT "THIS"."TBL_NAME" AS NUCORDER0 FROM "TBLS" "THIS" LEFT OUTER JOIN "DBS" "THIS_DATABASE_NAME" ON "THIS"."DB_ID" = "THIS_DATABASE_NAME"."DB_ID" WHERE "THIS_DATABASE_NAME"."NAME" = ? AND (LOWER("THIS"."TBL_NAME") LIKE ? ESCAPE '\\' ) ORDER BY NUCORDER0 " : ERROR: invalid escape string 建议：Escape string must be empty or one character..

https://issues.apache.org/jira/browse/HIVE-3994

* hive> select count(*) from hive_userinfo; 没反应

* zookeeper.ClientCnxn (ClientCnxn.java:logStartConnect(966)) - Opening socket connection to server localhost/127.0.0.1:2181. Will not attempt to authenticate using SASL (无法定位登录配置)

hive中没有设置zk

* hbase 中提示：WARN util.NativeCodeLoader: Unable to load native-hadoop library for your platform... using builtin-java classes where applicable

* Exception in thread "main" java.lang.NoClassDefFoundError: org/apache/hadoop/mapreduce/v2/app/MRAppMaster
Caused by: java.lang.ClassNotFoundException: org.apache.hadoop.mapreduce.v2.app.MRAppMaster

检查环境变量以及yarn的classpath



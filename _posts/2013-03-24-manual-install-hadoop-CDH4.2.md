---
layout: post
title: 手动安装Cloudera Hadoop CDH4
date: 2013-03-24 15:00
categories: Hadoop
tags: hadoop
summary: 主要记录手动安装cloudera hadoop cdh4-2.0集群过程，包括hadoop、hbase、hive的安装过程。
---

## 安装版本

	hadoop-2.0.0-cdh4.2.0
	hbase-0.94.2-cdh4.2.0
	hive-0.10.0-cdh4.2.0
	jdk1.6.0_38

## 安装前说明

* 安装目录为/opt
* 检查hosts文件
* 关闭防火墙
* 设置时钟同步

## 使用说明
* 启动dfs和mapreduce
desktop1上执行start-dfs.sh和start-yarn.sh
* 启动hbase
desktop3上执行start-hbase.xml
* 启动hive
desktop1上执行hive

## 规划
```
	192.168.0.1             NameNode、Hive、ResourceManager
	192.168.0.2             SSNameNode
	192.168.0.3             DataNode、HBase、NodeManager
	192.168.0.4             DataNode、HBase、NodeManager
	192.168.0.6             DataNode、HBase、NodeManager
	192.168.0.7             DataNode、HBase、NodeManager
	192.168.0.8             DataNode、HBase、NodeManager
```

## 部署过程
### 系统和网络配置
1. 修改每台机器的名称
<pre>
	[root@desktop1 ~]# cat /etc/sysconfig/network
	NETWORKING=yes
	HOSTNAME=desktop1
</pre>

2. 在各个节点上修改/etc/hosts增加以下内容:
<pre>
	[root@desktop1 ~]# cat /etc/hosts
	127.0.0.1   localhost localhost.localdomain localhost4 localhost4.localdomain4
	::1         localhost localhost.localdomain localhost6 localhost6.localdomain6
	192.168.0.1		desktop1
	192.168.0.2		desktop2
	192.168.0.3		desktop3
	192.168.0.4		desktop4
	192.168.0.6		desktop6
	192.168.0.7		desktop7
	192.168.0.8		desktop8
</pre>

3. 配置ssh无密码登陆
<pre>
	[root@desktop1 ~]# ssh-keygen
	[root@desktop1 ~]# ssh-copy-id -i .ssh/id_rsa.pub desktop2
	[root@desktop1 ~]# ssh-copy-id -i .ssh/id_rsa.pub desktop3
	[root@desktop1 ~]# ssh-copy-id -i .ssh/id_rsa.pub desktop4
	[root@desktop1 ~]# ssh-copy-id -i .ssh/id_rsa.pub desktop6
	[root@desktop1 ~]# ssh-copy-id -i .ssh/id_rsa.pub desktop7
	[root@desktop1 ~]# ssh-copy-id -i .ssh/id_rsa.pub desktop8
</pre>

4. 每台机器上关闭防火墙：

```
	[root@desktop1 ~]# service iptables stop
```

### 安装Hadoop
#### 配置Hadoop
将jdk1.6.0_38.zip上传到/opt，并解压缩
将hadoop-2.0.0-cdh4.2.0.zip上传到/opt，并解压缩

在NameNode上配置以下文件：

	core-site.xml fs.defaultFS指定NameNode文件系统，开启回收站功能。
	hdfs-site.xml 
		dfs.namenode.name.dir指定NameNode存储meta和editlog的目录，
		dfs.datanode.data.dir指定DataNode存储blocks的目录，
		dfs.namenode.secondary.http-address指定Secondary NameNode地址。
		开启WebHDFS。
	slaves 添加DataNode节点主机

1. core-site.xml

```
[root@desktop1 hadoop]# pwd
/opt/hadoop-2.0.0-cdh4.2.0/etc/hadoop
[root@desktop1 hadoop]# cat core-site.xml 
<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="configuration.xsl"?>
<configuration>
<!--fs.default.name for MRV1 ,fs.defaultFS for MRV2(yarn) -->
<property>
     <name>fs.defaultFS</name>
         <!--这个地方的值要和hdfs-site.xml文件中的dfs.federation.nameservices一致-->
     <value>hdfs://desktop1</value>
</property>
<property>
<name>fs.trash.interval</name>
<value>10080</value>
</property>
<property>
<name>fs.trash.checkpoint.interval</name>
<value>10080</value>
</property>
</configuration>
```

2. hdfs-site.xml

```
[root@desktop1 hadoop]# cat hdfs-site.xml 
<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="configuration.xsl"?>
<configuration>
<property>
  <name>dfs.replication</name>
  <value>1</value>
</property>

<property>
  <name>hadoop.tmp.dir</name>
  <value>/opt/data/hadoop-${user.name}</value>
</property>

<property>
<name>dfs.namenode.http-address</name>
<value>desktop1:50070</value>
</property>

<property>
<name>dfs.namenode.secondary.http-address</name>
<value>desktop2:50090</value>
</property>

<property>
<name>dfs.webhdfs.enabled</name>
<value>true</value>
</property>
</configuration>
```

3. masters

```
[root@desktop1 hadoop]# cat masters 
desktop1
desktop2
```

4. slaves
```
[root@desktop1 hadoop]# cat slaves 
desktop3
desktop4
desktop6
desktop7
desktop8
```

#### 配置MapReduce
1. mapred-site.xml

```
[root@desktop1 hadoop]# cat mapred-site.xml
<?xml version="1.0"?>
<?xml-stylesheet type="text/xsl" href="configuration.xsl"?>
<configuration>
<property>
 <name>mapreduce.framework.name</name>
 <value>yarn</value>
</property>

<property>
 <name>mapreduce.jobhistory.address</name>
 <value>desktop1:10020</value>
</property>

<property>
 <name>mapreduce.jobhistory.webapp.address</name>
 <value>desktop1:19888</value>
</property>
</configuration>
```

2. yarn-site.xml

```
[root@desktop1 hadoop]# cat yarn-site.xml 
<?xml version="1.0"?>
<configuration>
<property>
    <name>yarn.resourcemanager.resource-tracker.address</name>
    <value>desktop1:8031</value>
  </property>
  <property>
    <name>yarn.resourcemanager.address</name>
    <value>desktop1:8032</value>
  </property>
  <property>
    <name>yarn.resourcemanager.scheduler.address</name>
    <value>desktop1:8030</value>
  </property>
  <property>
    <name>yarn.resourcemanager.admin.address</name>
    <value>desktop1:8033</value>
  </property>
  <property>
    <name>yarn.resourcemanager.webapp.address</name>
    <value>desktop1:8088</value>
  </property>
  <property>
    <description>Classpath for typical applications.</description>
    <name>yarn.application.classpath</name>
    <value>$HADOOP_CONF_DIR,$HADOOP_COMMON_HOME/share/hadoop/common/*,
	$HADOOP_COMMON_HOME/share/hadoop/common/lib/*,
	$HADOOP_HDFS_HOME/share/hadoop/hdfs/*,$HADOOP_HDFS_HOME/share/hadoop/hdfs/lib/*,
	$YARN_HOME/share/hadoop/yarn/*,$YARN_HOME/share/hadoop/yarn/lib/*,
	$YARN_HOME/share/hadoop/mapreduce/*,$YARN_HOME/share/hadoop/mapreduce/lib/*</value>
  </property>
  <property>
    <name>yarn.nodemanager.aux-services</name>
    <value>mapreduce.shuffle</value>
  </property>
  <property>
    <name>yarn.nodemanager.aux-services.mapreduce.shuffle.class</name>
    <value>org.apache.hadoop.mapred.ShuffleHandler</value>
  </property>

  <property>
    <name>yarn.nodemanager.local-dirs</name>
    <value>/opt/data/yarn/local</value>
  </property>
  <property>
    <name>yarn.nodemanager.log-dirs</name>
    <value>/opt/data/yarn/logs</value>
  </property>
  <property>
    <description>Where to aggregate logs</description>
    <name>yarn.nodemanager.remote-app-log-dir</name>
    <value>/opt/data/yarn/logs</value>
  </property>

  <property>
    <name>yarn.app.mapreduce.am.staging-dir</name>
    <value>/user</value>
 </property>

</configuration>
```

#### 同步配置文件
修改.bashrc环境变量，并将其同步到其他几台机器，并且source .bashrc

```
[root@desktop1 ~]# cat .bashrc 
# .bashrc
alias rm='rm -i'
alias cp='cp -i'
alias mv='mv -i'

# Source global definitions
if [ -f /etc/bashrc ]; then
        . /etc/bashrc
fi
# User specific environment and startup programs
export LANG=zh_CN.utf8

export JAVA_HOME=/opt/jdk1.6.0_38
export JRE_HOME=$JAVA_HOME/jre
export CLASSPATH=./:$JAVA_HOME/lib:$JRE_HOME/lib:$JRE_HOME/lib/tools.jar

export HADOOP_HOME=/opt/hadoop-2.0.0-cdh4.2.0
export HIVE_HOME=/opt/hive-0.10.0-cdh4.2.0
export HBASE_HOME=/opt/hbase-0.94.2-cdh4.2.0

export HADOOP_MAPRED_HOME=${HADOOP_HOME}
export HADOOP_COMMON_HOME=${HADOOP_HOME}
export HADOOP_HDFS_HOME=${HADOOP_HOME}
export YARN_HOME=${HADOOP_HOME}
export HADOOP_YARN_HOME=${HADOOP_HOME}
export HADOOP_CONF_DIR=${HADOOP_HOME}/etc/hadoop
export HDFS_CONF_DIR=${HADOOP_HOME}/etc/hadoop
export YARN_CONF_DIR=${HADOOP_HOME}/etc/hadoop

export PATH=$PATH:$HOME/bin:$JAVA_HOME/bin:$HADOOP_HOME/sbin:$HBASE_HOME/bin:$HIVE_HOME/bin
```

```
[root@desktop1 ~]# source .bashrc 
```

将desktop1上的/opt/hadoop-2.0.0-cdh4.2.0拷贝到其他机器上

#### 启动脚本
第一次启动hadoop需要先格式化NameNode，该操作只做一次。当修改了配置文件时，需要重新格式化

```
[root@desktop1 hadoop]hadoop namenode -format
```

在desktop1上启动hdfs：
```
[root@desktop1 hadoop]#start-dfs.sh
```

在desktop1上启动mapreduce：
```
[root@desktop1 hadoop]#start-yarn.sh
```

在desktop1上启动historyserver：
```
[root@desktop1 hadoop]#mr-jobhistory-daemon.sh start historyserver
```

查看MapReduce：

```
http://desktop1:8088/cluster
```

查看节点：

```
http://desktop2:8042/
http://desktop2:8042/node
```

#### 检查集群进程 

```
[root@desktop1 ~]# jps
5389 NameNode
5980 Jps
5710 ResourceManager
7032 JobHistoryServer

[root@desktop2 ~]# jps
3187 Jps
3124 SecondaryNameNode

[root@desktop3 ~]# jps
3187 Jps
3124 DataNode
5711 NodeManager
```

### 安装HBase
HBase安装在desktop3、desktop4、desktop6、desktop7、desktop8机器上。

1. 上传文件
上传hbase-0.94.2-cdh4.2.0.zip到desktop3上，先在desktop3上修改好配置文件，在同步到其他机器上。

2. hbase-site.xml 

```
[root@desktop3 conf]# pwd
/opt/hbase-0.94.2-cdh4.2.0/conf
[root@desktop3 conf]# cat hbase-site.xml 
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
```

3. regionservers

```
[root@desktop3 conf]# cat regionservers 
desktop3
desktop4
desktop6
desktop7
desktop8
```

4. 环境变量
参考hadoop中环境变量的设置

5. 同步文件
同步文件到其他4台机器上

6. 启动脚本
可以在desktop3上配置无密码登陆到其他机器，然后在desktop3上启动hbase，这样其他节点上hbase都可以启动，否则，需要每台机器上单独启动hbase

```
[root@desktop3 ~]# start-hbase.sh 
```

7. HBase 

```
[root@desktop3 ~]# hbase 
HBase ; enter 'help<RETURN>' for list of supported commands.
Type "exit<RETURN>" to leave the HBase 
Version 0.94.2-cdh4.2.0, r, Fri Feb 15 11:37:00 PST 2013

hbase(main):001:0> 
```

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



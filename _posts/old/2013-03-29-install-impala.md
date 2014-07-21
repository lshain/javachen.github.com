---
layout: post
title: 安装Impala过程
category: hadoop
tags: [hadoop, impala, cdh]
keywords: impala
---

与Hive类似，Impala也可以直接与HDFS和HBase库直接交互。只不过Hive和其它建立在MapReduce上的框架适合需要长时间运行的批处理任务。例如：那些批量提取，转化，加载（ETL）类型的Job，而Impala主要用于实时查询。

Hadoop集群各节点的环境设置及安装过程见[使用yum安装CDH Hadoop集群](/2013/04/06/install-cloudera-cdh-by-yum/),参考这篇文章。

# 1. 环境

- CentOS 6.4 x86_64
- CDH 5.0.1
- jdk1.6.0_31

集群规划为3个节点，每个节点的ip、主机名和部署的组件分配如下：

```
192.168.56.121        cdh1     NameNode、Hive、ResourceManager、HBase、impala
192.168.56.122        cdh2     DataNode、SSNameNode、NodeManager、HBase、impala
192.168.56.123        cdh3     DataNode、HBase、NodeManager、impala
```

# 2. 安装

目前最新版本为`1.4.0`，下载repo文件到 /etc/yum.repos.d/:

 - 如果你安装的是 CDH4，请下载Red Hat/CentOS 6
 - 如果你安装的是 CDH5，请下载Red Hat/CentOS 6
 
然后，可以执行下面的命令安装所有的 impala 组件。

```
$ sudo yum install impala impala-server impala-state-store impala-catalog impala-shell -y
```

但是，通常只是在需要的节点上安装对应的服务：

 - 在 hive metastore 所在节点安装impala-state-store和impala-catalog
 - 在 DataNode 所在节点安装 impala-server 和 impala-shell

# 3. 配置

## 3.1 修改配置文件

查看安装路径：

```bash
$ find / -name impala
	/var/run/impala
	/var/lib/alternatives/impala
	/var/log/impala
	/usr/lib/impala
	/etc/alternatives/impala
	/etc/default/impala
	/etc/impala
	/etc/default/impala
```

impalad的配置文件路径由环境变量`IMPALA_CONF_DIR`指定，默认为`/usr/lib/impala/conf`，impala 的默认配置在/etc/default/impala，修改该文件中的 `IMPALA_CATALOG_SERVICE_HOST` 和 `IMPALA_STATE_STORE_HOST`

```
IMPALA_CATALOG_SERVICE_HOST=desktop1
IMPALA_STATE_STORE_HOST=desktop1
IMPALA_STATE_STORE_PORT=24000
IMPALA_BACKEND_PORT=22000
IMPALA_LOG_DIR=/var/log/impala

IMPALA_CATALOG_ARGS=" -log_dir=${IMPALA_LOG_DIR} "
IMPALA_STATE_STORE_ARGS=" -log_dir=${IMPALA_LOG_DIR} -state_store_port=${IMPALA_STATE_STORE_PORT}"
IMPALA_SERVER_ARGS=" \
    -log_dir=${IMPALA_LOG_DIR} \
    -catalog_service_host=${IMPALA_CATALOG_SERVICE_HOST} \
    -state_store_port=${IMPALA_STATE_STORE_PORT} \
    -use_statestore \
    -state_store_host=${IMPALA_STATE_STORE_HOST} \
    -be_port=${IMPALA_BACKEND_PORT}"

ENABLE_CORE_DUMPS=false

# LIBHDFS_OPTS=-Djava.library.path=/usr/lib/impala/lib
# MYSQL_CONNECTOR_JAR=/usr/share/java/mysql-connector-java.jar
# IMPALA_BIN=/usr/lib/impala/sbin
# IMPALA_HOME=/usr/lib/impala
# HIVE_HOME=/usr/lib/hive
# HBASE_HOME=/usr/lib/hbase
# IMPALA_CONF_DIR=/etc/impala/conf
# HADOOP_CONF_DIR=/etc/impala/conf
# HIVE_CONF_DIR=/etc/impala/conf
# HBASE_CONF_DIR=/etc/impala/conf
```

在节点cdh1上拷贝`hive-site.xml`、`core-site.xml`、`hdfs-site.xml`至`/usr/lib/impala/conf`目录并作下面修改在`hdfs-site.xml`文件中添加如下内容：

```xml
	<property>
	    <name>dfs.client.read.shortcircuit</name>
	    <value>true</value>
	</property>
	 
	<property>
	    <name>dfs.domain.socket.path</name>
	    <value>/var/run/hadoop-hdfs/dn._PORT</value>
	</property>

	<property>
	  <name>dfs.datanode.hdfs-blocks-metadata.enabled</name>
	  <value>true</value>
	</property>
```

同步以上文件到其他节点。


## 3.2 创建socket path

在每个节点上创建/var/run/hadoop-hdfs:

```
$ mkdir -p /var/run/hadoop-hdfs
```

拷贝postgres jdbc jar：

```
$ ln -s /usr/share/java/postgresql-jdbc.jar /usr/lib/impala/lib/
```

# 4. 启动服务

在 cdh1节点启动：

```
$ service impala-state-store start
$ service impala-catalog start
```

如果impalad正常启动，可以在`/tmp/ impalad.INFO`查看。如果出现异常，可以查看`/tmp/impalad.ERROR`定位错误信息。

# 5. 使用shell

使用`impala-shell`启动Impala Shell，连接 cdh1，并刷新元数据

```
>impala-shell
[Not connected] >connect cdh1
[cdh1:21000] >invalidate metadata
[cdh2:21000] >connect cdh2
[cdh2:21000] >invalidate metadata
[cdh2:21000] >select * from t
```

# 6. 参考文章
* [Impala安装文档完整版](http://yuntai.1kapp.com/?p=904)
* [Impala入门笔记](http://tech.uc.cn/?p=817)
* [Installing and Using Cloudera Impala](https://ccp.cloudera.com/display/IMPALA10BETADOC/Installing+and+Using+Cloudera+Impala)

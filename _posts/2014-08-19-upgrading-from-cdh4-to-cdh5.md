---
layout: post

title:  升级cdh4到cdh5

description: 现在的集群安装的是 cdh4.7 并配置了 NameNode HA，现在需要将其升级到 cdh5.1，本文主要记录升级过程和遇到的问题。

keywords:  

category:  hadoop

tags: [hadoop,cdh]

published: true

---

现在的集群安装的是 cdh4.7 并配置了 NameNode HA，现在需要将其升级到 cdh5.2，升级原因这里不做说明。

# 1. 不兼容的变化

升级前，需要注意 cdh5 有哪些不兼容的变化，具体请参考：[Apache Hadoop Incompatible Changes](http://www.cloudera.com/content/cloudera-content/cloudera-docs/CDH5/latest/CDH5-Release-Notes/cdh5rn_incompatible_changes.html#topic_3)。这里列出一些关键的地方：

## 1.1 YARN 的变化

- `YARN_HOME` 属性修改为` HADOOP_YARN_HOME`
- `yarn-site.xml` 中做如下改变：
  - `mapreduce.shuffle to mapreduce_shuffle` 修改为 `yarn.nodemanager.aux-services`
  - `yarn.nodemanager.aux-services.mapreduce.shuffle.class` 改名为 `yarn.nodemanager.aux-services.mapreduce_shuffle.class`
  - `yarn.application.classpath` 中的环境变量 `YARN_HOME` 属性修改为` HADOOP_YARN_HOME`

需要特别注意的是 `YARN_HOME` 属性修改为` HADOOP_YARN_HOME`，要不然运行 mapreduce 会出现一些异常，我也是花了很长时间才注意到这一点。

## 1.2 HBase 的变化

1、CDH 5 Beta 1 (HBase 0.95) 中 `hbase.regionserver.checksum.verify` 默认值修改为 true

2、[HBASE-8218](https://issues.apache.org/jira/browse/HBASE-8218) 修改了 AggregationClient 的参数类型为 HTable

3、CDH5 不再使用 HTablePool，改为如下方式：

```java
HConnection connection = HConnectionManager.createConnection(config);
HTableInterface table = connection.getTable(tableName);
table.put(put);
table.close();
connection.close();
```

你可以使用 `hbase.hconnection.threads.max` 来指定连接池大小：

```java
ExecutorService pool = ...;
HConnection connection = HConnectionManager.createConnection(conf, pool);
```

4、删除了一些 API

- [HBASE-7315](https://issues.apache.org/jira/browse/HBASE-7315) 和 [HBASE-7263](https://issues.apache.org/jira/browse/HBASE-7263)  Row lock user API has been removed
- [HBASE-6706](https://issues.apache.org/jira/browse/HBASE-6706)  Removed total order partitioner
- [ API Differences between CDH 4.5 and CDH 5 Beta ](http://www.cloudera.com/content/cloudera-content/cloudera-docs/shared/CDH5-Beta-2-RNs/hbase_jdiff_report-p-cdh4.5-c-cdh5b2/changes.html)

5、Operator Interface Changes

- CDH 4 的 hbase-default.xml 中的很多默认值做了修改，参考 [HBASE-845](https://issues.apache.org/jira/browse/HBASE-8450)
- [HBASE-6553](https://issues.apache.org/jira/browse/HBASE-6553) Removed Avro Gateway

6、HBase User API Incompatibility

- [HBASE-8015](https://issues.apache.org/jira/browse/HBASE-8015) The HBase Namespaces feature has changed HBase’s HDFS file layout
- [HBASE-4451](https://issues.apache.org/jira/browse/HBASE-4451) 重命名 ZooKeeper 节点名称
- [HBASE-3171](https://issues.apache.org/jira/browse/HBASE-3171) META表改名为 hbase:meta，ROOT 表被删除
- [HBASE-8352](https://issues.apache.org/jira/browse/HBASE-8352) snapshots保存在 `/<hbase>/.hbase-snapshot`
- [HBASE-766](https://issues.apache.org/jira/browse/HBASE-7660) 删除对HFile V1的支持
- [HBASE-6170](https://issues.cloudera.org/browse/HBASE-6170) 和 [HBASE-8909](https://issues.cloudera.org/browse/HBASE-8909) ` hbase.regionserver.lease.period`参数过时，使用 `hbase.client.scanner.timeout.period` 替换


# 2. 升级过程

## 2.1. 备份数据和停止所有服务

### 2.1.1 让 namenode 进入安全模式

在NameNode或者配置了 HA 中的 active NameNode上运行下面命令：

```
$ sudo -u hdfs hdfs dfsadmin -safemode enter
```

保存 fsimage：

```
$ sudo -u hdfs hdfs dfsadmin -saveNamespace
```

### 2.1.2 备份配置文件、数据库和其他重要文件

配置文件包括：

```
/etc/hadoop/conf
/etc/hive/conf
/etc/hbase/conf
/etc/zookeeper/conf
/etc/impala/conf
/etc/default/impala
```

### 2.1.3 停止所有服务

在每个节点上运行：

```
$ for x in `cd /etc/init.d ; ls hbase-*` ; do sudo service $x stop ; done
$ for x in `cd /etc/init.d ; ls hive-*` ; do sudo service $x stop ; done
$ for x in `cd /etc/init.d ; ls zookeeper-*` ; do sudo service $x stop ; done
$ for x in `cd /etc/init.d ; ls hadoop-*` ; do sudo service $x stop ; done
$ for x in `cd /etc/init.d ; ls impala-*` ; do sudo service $x stop ; done
```

### 2.1.4 在每个节点上查看进程

```
$ ps -aef | grep java
```
## 2.2. 备份 hdfs 元数据（可选，防止在操作过程中对数据的误操作）

 a，查找本地配置的文件目录（属性名为 `dfs.name.dir` 或者 `dfs.namenode.name.dir或者hadoop.tmp.dir` ）

```bash
grep -C1 hadoop.tmp.dir /etc/hadoop/conf/hdfs-site.xml
```

通过上面的命令，可以看到一下信息

```
<property>
<name>hadoop.tmp.dir</name>
<value>/data/dfs/nn</value>
</property>
```

b，对hdfs数据进行备份

```bash
cd /data/dfs/nn
tar -cvf /root/nn_backup_data.tar .
```

## 2.3. 更新 yum 源

更新 cdh5 仓库（或者使用本地仓库）：

```bash
$ sudo rpm --import http://archive.cloudera.com/cdh5/redhat/6/x86_64/cdh/RPM-GPG-KEY-cloudera
```

## 2.4. 升级组件

```
$ sudo yum update hadoop* hbase* hive* zookeeper* bigtop* impala* spark* llama* lzo* sqoop* parquet* sentry* avro* mahout* -y
```

启动ZooKeeper集群，然后在原来的所有 Journal Nodes 上安装 hadoop-hdfs-journalnode并启动：

```bash
# 在安装zookeeper-server的节点上运行
$ /etc/init.d/zookeeper-server start

# 在安装zkfc的节点上运行
$ /etc/init.d/hadoop-hdfs-zkfc

# 在安装journalnode的节点上运行
$ /etc/init.d/hadoop-hdfs-journalnode start
```

## 2.5. 更新 hdfs 元数据

在NameNode或者配置了 HA 中的 active NameNode上运行下面命令：

```
$ sudo service hadoop-hdfs-namenode upgrade
```

查看日志，检查是否完成升级，例如查看日志中是否出现`/var/lib/hadoop-hdfs/cache/hadoop/dfs/<name> is complete`

```
$ sudo tail -f /var/log/hadoop-hdfs/hadoop-hdfs-namenode-<hostname>.log
```

如果配置了 HA，在另一个 NameNode 节点上运行：

```bash
# 输入 Y
$ sudo -u hdfs hdfs namenode -bootstrapStandby
$ sudo service hadoop-hdfs-namenode start
```

启动所有的 DataNode：

```bash
$ sudo service hadoop-hdfs-datanode start
```

打开 web 界面查看 hdfs 文件是否都存在。

待集群稳定运行一段时间，可以完成升级：

```
$ sudo -u hdfs hadoop dfsadmin -finalizeUpgrade
```

## 2.6. 更新 YARN

更新 YARN 需要注意以下节点：

- `yarn-site.xml` 中做如下改变：
  - `mapreduce.shuffle to mapreduce_shuffle` 修改为 `yarn.nodemanager.aux-services`
  - `yarn.nodemanager.aux-services.mapreduce.shuffle.class` 改名为 `yarn.nodemanager.aux-services.mapreduce_shuffle.class`
  - `yarn.application.classpath` 中的环境变量 `YARN_HOME` 属性修改为` HADOOP_YARN_HOME`

然后在期待 YARN 的相关服务。

## 2.7. 更新 HBase

升级 HBase 之前，先启动 zookeeper。

在启动hbase-master进程和hbase-regionserver进程之前，更新 HBase：

```
$ sudo -u hdfs hbase upgrade -execute
```

如果你使用了 phoenix，则请删除 HBase lib 目录下对应的 phoenix 的 jar 包。

启动 HBase：

```
$ service hbase-master start
$ service hbase-regionserver start
```

## 2.8. 更新 hive

在启动hive之前，进入 `/usr/lib/hive/bin` 执行下面命令升级元数据：

```bash
# ./schematool -dbType 数据库类型 -upgradeSchemaFrom 版本号
# 升级之前 hive 版本为 0.12.0，下面命令会运行  /usr/lib/hive/scripts/metastore/upgrade/mysql/upgrade-0.12.0-to-0.13.0.mysql.sql
$ ./schematool -dbType mysql -upgradeSchemaFrom 0.12.0
```

确认 /etc/hive/conf/hive-site.xml 和 /etc/hive/conf/hive-env.sh 是否需要修改，例如 /etc/hive/conf/hive-env.sh 配置了如下参数，需要修改到 cdh-5.2 对应的版本：

```bash
# 请修改到 cdh5.2对应的 jar 包
export HIVE_AUX_JARS_PATH=/usr/lib/hive/lib/hive-contrib-0.12.0-cdh5.1.0.jar
```

修改完之后，请同步到其他节点。

然后启动 hive 服务：

```bash
$ service hive-metastore start
$ service hive-server2 start
```

# 3. 参考文章

- [Upgrading from CDH 4 to CDH 5](http://www.cloudera.com/content/cloudera-content/cloudera-docs/CDH5/latest/CDH5-Installation-Guide/cdh5ig_cdh4_to_cdh5_upgrade.html)
- [CDH 5 Incompatible Changes](http://www.cloudera.com/content/cloudera-content/cloudera-docs/CDH5/latest/CDH5-Release-Notes/cdh5rn_incompatible_changes.html)

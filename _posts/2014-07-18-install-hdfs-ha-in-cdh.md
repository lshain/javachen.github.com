---
layout: post

title:  CDH 中配置 HDFS HA

description: 最近又安装 hadoop 集群， 故尝试了一下配置 HDFS 的 HA，这里使用的是 QJM 的 HA 方案。

keywords:  

category: hadoop

tags: [hadoop]

published: true

---

最近又安装 hadoop 集群， 故尝试了一下配置 HDFS 的 HA，这里使用的是 QJM 的 HA 方案。

关于 hadoop 集群的安装部署过程你可以参考 [使用yum安装CDH Hadoop集群](/2013/04/06/install-cloudera-cdh-by-yum/) 或者 [手动安装 hadoop 集群的过程](/2014/07/17/manual-install-cdh-hadoop/)。

## 集群规划

我一共安装了三个节点的集群，对于 HA 方案来说，三个节点准备安装如下服务：

- cdh1：hadoop-hdfs-namenode(primary) 、hadoop-hdfs-journalnode、hadoop-hdfs-zkfc
- cdh2：hadoop-hdfs-namenode(standby)、hadoop-hdfs-journalnode、hadoop-hdfs-zkfc
- cdh3: hadoop-hdfs-journalnode

根据上面规划，在对应节点上安装相应的服务。

## 安装步骤

### 停掉集群

```bash
​sh /opt/cmd.sh ' for x in `ls /etc/init.d/|grep impala` ; do service $x stop ; done'
sh /opt/cmd.sh ' for x in `ls /etc/init.d/|grep hive` ; do service $x stop ; done'
sh /opt/cmd.sh ' for x in `ls /etc/init.d/|grep hbase` ; do service $x stop ; done'
sh /opt/cmd.sh ' for x in `ls /etc/init.d/|grep hadoop` ; do service $x stop ; done'
```

### 修改配置文件

修改/etc/hadoop/conf/core-site.xml，做如下修改：

```xml
<configuration>
	<property>
		<name>fs.defaultFS</name>
		<value>hdfs://mycluster:8020</value>
	</property>
	<property>
		<name>ha.zookeeper.quorum</name>
	</property>
</configuration>
```

修改/etc/hadoop/conf/hdfs-site.xml，删掉一些原来的 namenode 配置，增加如下：

```xml
<!--  hadoop  HA -->
<property>
	<name>dfs.nameservices</name>
	<value>mycluster</value>
</property>
<property>
	<name>dfs.ha.namenodes.mycluster</name>
	<value>nn1,nn2</value>
</property>
<property>
	<name>dfs.namenode.rpc-address.mycluster.nn1</name>
	<value>cdh1:8020</value>
</property>
<property>
	<name>dfs.namenode.rpc-address.mycluster.nn2</name>
	<value>cdh2:8020</value>
</property>
<property>
	<name>dfs.namenode.http-address.mycluster.nn1</name>
	<value>cdh1:50070</value>
</property>
<property>
	<name>dfs.namenode.http-address.mycluster.nn2</name>
	<value>cdh2:50070</value>
</property>
<property>
	<name>dfs.namenode.shared.edits.dir</name>
	<value>qjournal://cdh1:8485;cdh2,cdh3:8485/mycluster</value>
</property>
<property>
	<name>dfs.journalnode.edits.dir</name>
	<value>/data/dfs/jn</value>
</property>
<property>
	<name>dfs.client.failover.proxy.provider.mycluster</name>
	<value>org.apache.hadoop.hdfs.server.namenode.ha.ConfiguredFailoverProxyProvider</value>
</property>
<property>
	<name>dfs.ha.fencing.methods</name>
	<value>sshfence(hdfs)</value>
</property>
<property>
	<name>dfs.ha.fencing.ssh.private-key-files</name>
	<value>/var/lib/hadoop-hdfs/.ssh/id_rsa</value>
</property>
<property>
	<name>dfs.ha.automatic-failover.enabled</name>
	<value>true</value>
</property>
```
### 同步配置文件

```
sh /opt/syn.sh /etc/hadoop/conf /etc/hadoop/
```

在journalnode的三个节点上创建目录：

```bash
ssh cdh1 'mkdir -p /data/dfs/nn /data/dfs/jn ; chown -R hdfs:hdfs /data/dfs'
ssh cdh2 'mkdir -p /data/dfs/jn ; chown -R hdfs:hdfs /data/dfs/jn'
ssh cdh3 'mkdir -p /data/dfs/jn ; chown -R hdfs:hdfs /data/dfs/jn'
```

### 启动journalnode

```bash
ssh cdh1 'service hadoop-hdfs-journalnode start'
ssh cdh2 'service hadoop-hdfs-journalnode start'
ssh cdh3 'service hadoop-hdfs-journalnode start'
```

### 格式化集群

```bash
ssh cdh1 'sudo -u hdfs hdfs namenode -format'
ssh cdh2 'sudo -u hdfs hdfs namenode -format'
ssh cdh3 'sudo -u hdfs hdfs namenode -format'
```

### 初始化Shared Edits directory：

```bash
sudo -u hdfs hdfs namenode -initializeSharedEdits
```

### 配置无密码登陆

在两个NN上配置hdfs用户间无密码登陆：

对于 cdh1： 
 
```bash           
passwd hdfs
su - hdfs
ssh-keygen
ssh-copy-id  cdh2
```

对于 cdh2： 

```bash
passwd hdfs
su - hdfs
ssh-keygen
ssh-copy-id   cdh1
```

### 安装hadoop-hdfs-zkfc

在两个NameNode上安装hadoop-hdfs-zkfc

```bash
ssh cdh1 '
yum install hadoop-hdfs-zkfc;
hdfs zkfc -formatZK;
service hadoop-hdfs-zkfc start
'

ssh cdh2 '
yum install hadoop-hdfs-zkfc;
hdfs zkfc -formatZK;
service hadoop-hdfs-zkfc start
'
```

### 启动 NameNode

Start the primary (formatted) NameNode:

```bash
ssh cdh1 'service hadoop-hdfs-namenode start'
```

Start the standby NameNode：

```bash
ssh cdh2 'sudo -u hdfs hdfs namenode -bootstrapStandby ; sudo service hadoop-hdfs-namenode start'
```

## 配置HBase HA

先停掉 hbase，然后修改/etc/hbase/conf/hbase-site.xml，做如下修改：

``` xml
<!-- Configure HBase to use the HA NameNode nameservice -->
<property>
    <name>hbase.rootdir</name>
    <value>hdfs://mycluster:8020/hbase</value>       
  </property>
```

在 zookeeper 节点上运行/usr/lib/zookeeper/bin/zkCli.sh

```
ls /hbase/splitlogs
rmr /hbase/splitlogs
```

最后启动 hbase 服务。

## 配置 Hive HA

运行下面命令：

```
$ metatool -listFSRoot  
hdfs://cdh1/user/hive/warehouse  
$ metatool -updateLocation hdfs://mycluster hdfs://cdh1 -tablePropKey avro.schema.url 
-serdePropKey schema.url  
$ metatool -listFSRoot 
hdfs://cdh1/user/hive/warehouse
```

## 配置 Impala 

不需要做什么修改，但是一定要记住 core-site.xml 中fs.defaultFS参数值要带上端口号。
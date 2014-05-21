---
layout: post
title:  使用yum安装CDH Hadoop集群
description: 使用yum安装CDH Hadoop集群，包括hdfs、yarn、hive和hbase。
category: Hadoop
tags: [hadoop, hdfs, yarn, hive ,hbase]
---

Update:

- `2014.05.20` 修改cdh4为cdh5进行安装。

集群规划为3个节点，每个节点的ip、主机名和部署的组件分配如下：

```
	192.168.56.121        cdh1     NameNode、Hive、ResourceManager、HBase
	192.168.56.122        cdh2     DataNode、SSNameNode、NodeManager、HBase
	192.168.56.123        cdh3     DataNode、HBase、NodeManager
```

# 1. 准备工作

## 1.1 配置hosts

> CDH 要求使用 IPv4，IPv6 不支持。

1、设置hostname，以cdh1为例

```
$ sudo hostname cdh1
```

2、确保`/etc/hosts`中包含ip和FQDN，如果你在使用DNS，保存这些信息到`/etc/hosts`不是必要的，却是最佳实践。

3、确保`/etc/sysconfig/network`中包含`hostname=cdh1`

4、检查网络，运行下面命令检查是否配置了hostname以及其对应的ip是否正确。

运行`uname -a`查看hostname是否匹配`hostname`命令运行的结果：

```
$ uname -a
Linux cdh1 2.6.32-358.23.2.el6.x86_64 #1 SMP Wed Oct 16 18:37:12 UTC 2013 x86_64 x86_64 x86_64 GNU/Linux
$ hostname
cdh1
```

运行`/sbin/ifconfig`查看ip:

```
$ ifconfig
eth1      Link encap:Ethernet  HWaddr 08:00:27:75:E0:95  
          inet addr:192.168.56.121  Bcast:192.168.56.255  Mask:255.255.255.0
......
```

先安装bind-utils，才能运行host命令：

```
$ yum install bind-utils -y
```

运行`host -v -t A `hostname`` 查看hostname和ip是否匹配:

```
$ host -v -t A `hostname` 
Trying "cdh1"
...
;; ANSWER SECTION:
cdh1. 60 IN	A	192.168.56.121
```


5、hadoop的所有配置文件中配置节点名称时，请使用hostname和不是ip

## 1.2 关闭防火墙

```
$ setenforce 0
$ vim /etc/sysconfig/selinux #修改SELINUX=disabled
```

清空iptables 

```
$ iptables -F
```

## 1.3 时钟同步

在所有节点安装ntp:
	
```
$ yum install ntp
```

设置开机启动:

```
$ chkconfig ntpd on
```
在所有节点启动ntp:

```
$ /etc/init.d/ntpd start
```

是client使用local NTP server，修改/etc/ntp.conf，添加以下内容：

```
server $LOCAL_SERVER_IP OR HOSTNAME
```


## 1.4 安装jdk

以下是手动安装jdk，你也可以通过yum方式安装，见下文。

检查jdk版本

```
$ java -version
```

如果其版本低于v1.6 update 31，则将其卸载

```
$ rpm -qa | grep java
$ yum remove {java-1.*}
```

验证默认的jdk是否被卸载

```
$ which java
```

安装jdk，使用yum安装或者手动下载安装jdk-6u31-linux-x64.bin，下载地址：[这里](http://www.oracle.com/technetwork/java/javasebusiness/downloads/java-archive-downloads-javase6-419409.html#jdk-6u31-oth-JPR)

```	
$ yum install jdk -y
```

创建符号连接

```
$ ln -s XXXXX/jdk1.6.0_31 /usr/java/default
$ ln -s /usr/java/default/bin/java /usr/bin/java
```

设置环境变量:

```
$ echo "export JAVA_HOME=/usr/java/latest" >>/root/.bashrc
$ echo "export PATH=\$JAVA_HOME/bin:\$PATH" >> /root/.bashrc
$ source /root/.bashrc
```

验证版本

```
$ java -version
	java version "1.6.0_31"
	Java(TM) SE Runtime Environment (build 1.6.0_31-b04)
	Java HotSpot(TM) 64-Bit Server VM (build 20.6-b01, mixed mode)
```

检查环境变量中是否有设置`JAVA_HOME`

```
$ sudo env | grep JAVA_HOME
```

如果env中没有`JAVA_HOM`E变量，则修改`/etc/sudoers`文件

```	
$ vi /etc/sudoers
	Defaults env_keep+=JAVA_HOME
```

## 1.5 设置本地yum源

你可以从[这里](http://archive.cloudera.com/cdh4/repo-as-tarball/)下载cdh4的仓库，或者从[这里](http://archive.cloudera.com/cdh5/repo-as-tarball/) 下载cdh5的仓库压缩包。

这里我是使用的cdh5的仓库，将其下载之后解压配置cdh的yum源：

```
[hadoop]
name=hadoop
baseurl=file:///vagrant/repo/cdh/5/
enabled=1
gpgcheck=0
```

操作系统的yum是使用的CentOS6-Base-163.repo，其配置如下：

```
[base]
name=CentOS-$releasever - Base - 163.com
baseurl=http://mirrors.163.com/centos/$releasever/os/$basearch/
#mirrorlist=http://mirrorlist.centos.org/?release=$releasever&arch=$basearch&repo=os
gpgcheck=1
gpgkey=http://mirror.centos.org/centos/RPM-GPG-KEY-CentOS-6

#released updates 
[updates]
name=CentOS-$releasever - Updates - 163.com
baseurl=http://mirrors.163.com/centos/$releasever/updates/$basearch/
#mirrorlist=http://mirrorlist.centos.org/?release=$releasever&arch=$basearch&repo=updates
gpgcheck=1
gpgkey=http://mirror.centos.org/centos/RPM-GPG-KEY-CentOS-6

#additional packages that may be useful
[extras]
name=CentOS-$releasever - Extras - 163.com
baseurl=http://mirrors.163.com/centos/$releasever/extras/$basearch/
#mirrorlist=http://mirrorlist.centos.org/?release=$releasever&arch=$basearch&repo=extras
gpgcheck=1
gpgkey=http://mirror.centos.org/centos/RPM-GPG-KEY-CentOS-6

#additional packages that extend functionality of existing packages
[centosplus]
name=CentOS-$releasever - Plus - 163.com
baseurl=http://mirrors.163.com/centos/$releasever/centosplus/$basearch/
#mirrorlist=http://mirrorlist.centos.org/?release=$releasever&arch=$basearch&repo=centosplus
gpgcheck=1
enabled=0
gpgkey=http://mirror.centos.org/centos/RPM-GPG-KEY-CentOS-6

#contrib - packages by Centos Users
[contrib]
name=CentOS-$releasever - Contrib - 163.com
baseurl=http://mirrors.163.com/centos/$releasever/contrib/$basearch/
#mirrorlist=http://mirrorlist.centos.org/?release=$releasever&arch=$basearch&repo=contrib
gpgcheck=1
enabled=0
gpgkey=http://mirror.centos.org/centos/RPM-GPG-KEY-CentOS-6
```

其实，在配置了CDH的yum之后，可以通过yum来安装jdk：

```
$ yum install jdk -y
```

然后，设置JAVA HOME:

```
$ echo "export JAVA_HOME=/usr/java/latest" >>/root/.bashrc
$ echo "export PATH=\$JAVA_HOME/bin:\$PATH" >> /root/.bashrc
$ source /root/.bashrc
```

验证版本

```
$ java -version
	java version "1.6.0_31"
	Java(TM) SE Runtime Environment (build 1.6.0_31-b04)
	Java HotSpot(TM) 64-Bit Server VM (build 20.6-b01, mixed mode)
```

# 2. 安装和配置HDFS

在NameNode节点安装 hadoop-hdfs-namenode

```
$ yum install hadoop hadoop-hdfs hadoop-client hadoop-doc hadoop-debuginfo hadoop-hdfs-namenode
```

在NameNode节点中选择一个节点作为secondarynamenode，并安装 hadoop-hdfs-secondarynamenode

```
$ yum install hadoop-hdfs-secondarynamenode -y
```

在DataNode节点安装 hadoop-hdfs-datanode 

```
$ yum install hadoop hadoop-hdfs hadoop-client hadoop-doc hadoop-debuginfo hadoop-hdfs-datanode -y
```

> 配置 NameNode HA 请参考[Introduction to HDFS High Availability](https://ccp.cloudera.com/display/CDH4DOC/Introduction+to+HDFS+High+Availability)

## 2.1 自定义hadoop配置文件

拷贝默认的配置文件为一个新的文件，并设置新文件为hadoop的默认配置文件：

```
$ sudo cp -r /etc/hadoop/conf.empty /etc/hadoop/conf.my_cluster
$ sudo alternatives --verbose --install /etc/hadoop/conf hadoop-conf /etc/hadoop/conf.my_cluster 50 
$ sudo alternatives --set hadoop-conf /etc/hadoop/conf.my_cluster
```

hadoop默认使用`/etc/hadoop/conf`路径读取配置文件，经过上述配置之后，`/etc/hadoop/conf`会软连接到`/etc/hadoop/conf.my_cluster`目录

## 2.2 自定义配置

> 更多的配置信息说明，请参考 [Apache Cluster Setup](http://hadoop.apache.org/docs/stable/hadoop-project-dist/hadoop-common/ClusterSetup.html)

1. 在`core-site.xml`中设置`fs.defaultFS`属性值，该属性指定NameNode是哪一个节点以及使用的文件系统是file还是hdfs，格式：`hdfs://<namenode host>:<namenode port>/`，默认的文件系统是`file:///`
1. 在`hdfs-site.xml`中设置`dfs.permissions.superusergroup`属性，该属性指定hdfs的超级用户，默认为hdfs，你可以修改为hadoop

示例配置如下：

core-site.xml:

```xml
<property>
 <name>fs.defaultFS</name>
 <value>hdfs://cdh1:8020</value>
</property>
```

hdfs-site.xml:

```xml
<property>
 <name>dfs.permissions.superusergroup</name>
 <value>hadoop</value>
</property>
```

## 2.3 指定本地文件目录

在hadoop中默认的文件路径以及权限要求如下：

```
目录									所有者		权限		默认路径
hadoop.tmp.dir						hdfs:hdfs	drwx------	/var/hadoop
dfs.namenode.name.dir				hdfs:hdfs	drwx------	file://${hadoop.tmp.dir}/dfs/name
dfs.datanode.data.dir				hdfs:hdfs	drwx------	file://${hadoop.tmp.dir}/dfs/data
dfs.namenode.checkpoint.dir			hdfs:hdfs	drwx------	file://${hadoop.tmp.dir}/dfs/namesecondary
```

示例配置如下：

hdfs-site.xml on the NameNode:

```xml
<property>
 <name>dfs.namenode.name.dir</name>
 <value>file:///data/dfs/nn</value>
</property>
```

hdfs-site.xml on each DataNode:

```xml
<property>
 <name>dfs.datanode.data.dir</name>
<value>file:///data/dfs/dn</value>
</property>
```

在**NameNode**上手动创建 `dfs.name.dir` 或 `dfs.namenode.name.dir` 的本地目录：

```
$ sudo mkdir -p /data/dfs/nn
```

在**DataNode**上手动创建 `dfs.data.dir` 或 `dfs.datanode.data.dir` 的本地目录：

```
$ sudo mkdir -p /data/dfs/dn
```

修改上面目录所有者：

```
$ sudo chown -R hdfs:hdfs /data/dfs/nn /data/dfs/dn
```
> hadoop的进程会自动设置 `dfs.data.dir` 或 `dfs.datanode.data.dir`，但是 `dfs.name.dir` 或 `dfs.namenode.name.dir` 的权限默认为755，需要手动设置为700。

故，修改上面目录权限：

```
$ sudo chmod 700 /data/dfs/nn
```

或者：

```
$ sudo chmod go-rx /data/dfs/nn
```

**说明：**

DataNode的本地目录可以设置多个，你可以设置 `dfs.datanode.failed.volumes.tolerated` 参数的值，表示能够容忍不超过该个数的目录失败。

**SecondaryNameNode**在 `hdfs-site.xml` 中可以配置以下参数：

```
	dfs.namenode.checkpoint.check.period
	dfs.namenode.checkpoint.txns
	dfs.namenode.checkpoint.dir
	dfs.namenode.checkpoint.edits.dir
	dfs.namenode.num.checkpoints.retained
```

如果想配置SecondaryNameNode节点，请从NameNode中单独选择一台机器，然后做以下设置：

- 将运行SecondaryNameNode的机器名称加入到masters
- 在 `hdfs-site.xml` 中加入如下配置：

```xml
<property>
  <name>dfs.namenode.http-address</name>
  <value>cdh1:50070</value>
  <description>
    The address and the base port on which the dfs NameNode Web UI will listen.
  </description>
</property>
```

设置多个secondarynamenode，请参考[multi-host-secondarynamenode-configuration](http://blog.cloudera.com/blog/2009/02/multi-host-secondarynamenode-configuration/).

## 2.4 (可选)开启回收站功能

> 回收站功能默认是关闭的，建议打开。

在 `core-site.xml` 中添加如下两个参数：

- `fs.trash.interval`,该参数值为时间间隔，单位为分钟，默认为0，表示回收站功能关闭。该值表示回收站中文件保存多长时间，如果服务端配置了该参数，则忽略客户端的配置；如果服务端关闭了该参数，则检查客户端是否有配置该参数；
- `fs.trash.checkpoint.interval`，该参数值为时间间隔，单位为分钟，默认为0。该值表示检查回收站时间间隔，该值要小于`fs.trash.interval`，该值在服务端配置。如果该值设置为0，则使用 `fs.trash.interval` 的值。

## 2.5 (可选)配置DataNode存储的负载均衡

在 `hdfs-site.xml` 中配置以下三个参数（详细说明，请参考 [Optionally configure DataNode storage balancing](http://www.cloudera.com/content/cloudera-content/cloudera-docs/CDH5/latest/CDH5-Installation-Guide/cdh5ig_hdfs_cluster_deploy.html#concept_ncq_nnk_ck_unique_1)）：

- dfs.datanode.fsdataset. volume.choosing.policy
- dfs.datanode.available-space-volume-choosing-policy.balanced-space-threshold
- dfs.datanode.available-space-volume-choosing-policy.balanced-space-preference-fraction

## 2.6 (可选)开启WebHDFS

请参考 [Optionally enable WebHDFS](http://www.cloudera.com/content/cloudera-content/cloudera-docs/CDH5/latest/CDH5-Installation-Guide/cdh5ig_hdfs_cluster_deploy.html#topic_11_2_9_unique_1)

## 2.7 (可选)配置LZO

下载[Red Hat/CentOS 6](http://archive.cloudera.com/gplextras5/redhat/6/x86_64/gplextras/cloudera-gplextras5.repo)文件到 `/etc/yum.repos.d/`。

然后，安装lzo:

```
$ sudo yum install hadoop-lzo  -y
```

最后，在 `core-site.xml` 中添加如下配置：

```xml
<property>
  <name>io.compression.codecs</name>
<value>org.apache.hadoop.io.compress.DefaultCodec,org.apache.hadoop.io.compress.GzipCodec,
org.apache.hadoop.io.compress.BZip2Codec,com.hadoop.compression.lzo.LzoCodec,
com.hadoop.compression.lzo.LzopCodec,org.apache.hadoop.io.compress.SnappyCodec</value>
</property>
```

更多关于LZO信息，请参考：[Using LZO Compression](http://wiki.apache.org/hadoop/UsingLzoCompression)

## 2.8 (可选)配置Snappy

cdh 的 rpm 源中默认已经包含了 snappy ，可以再不用安装。

在每个节点安装Snappy

```
$ yum install snappy snappy-devel  -y
```

然后，在 `core-site.xml` 中修改`io.compression.codecs`的值：

```xml
<property>
  <name>io.compression.codecs</name>
<value>org.apache.hadoop.io.compress.DefaultCodec,org.apache.hadoop.io.compress.GzipCodec,
org.apache.hadoop.io.compress.BZip2Codec,com.hadoop.compression.lzo.LzoCodec,
com.hadoop.compression.lzo.LzopCodec,org.apache.hadoop.io.compress.SnappyCodec</value>
</property>
```

使 snappy 对 hadoop 可用：

```	
$ ln -sf /usr/lib64/libsnappy.so /usr/lib/hadoop/lib/native/
```

## 2.9 启动HDFS

将配置文件同步到每一个节点：

```
$ scp -r /etc/hadoop/conf.my_cluster root@cdh2:/etc/hadoop/conf.my_cluster
$ scp -r /etc/hadoop/conf.my_cluster root@cdh3:/etc/hadoop/conf.my_cluster
```

在每个节点上设置默认配置文件：

```
$ sudo alternatives --verbose --install /etc/hadoop/conf hadoop-conf /etc/hadoop/conf.my_cluster 50 
$ sudo alternatives --set hadoop-conf /etc/hadoop/conf.my_cluster
```

格式化NameNode：

```
$ sudo -u hdfs hadoop namenode -format
```	
	
在每个节点运行下面命令启动hdfs：

```bash
$ for x in `cd /etc/init.d ; ls hadoop-hdfs-*` ; do sudo service $x start ; done
```

在 hdfs 运行之后，创建 `/tmp` 临时目录，并设置权限为 `1777`：

```
$ sudo -u hdfs hadoop fs -mkdir /tmp
$ sudo -u hdfs hadoop fs -chmod -R 1777 /tmp
```

## 2.10 总结

在NameNode上做过的操作：

在DataNode上做过的操作：

在SecondaryNameNode上做过的操作：

# 3. 安装和配置YARN

在resourcemanager节点安装:

```
$ yum install hadoop-yarn-resourcemanager
$ yum install hadoop-mapreduce-historyserver
```

在nodemanager节点安装:

```
$ yum install hadoop-yarn-nodemanager
$ yum install hadoop-mapreduce
```
**要想使用YARN**，需要在 `mapred-site.xml` 中做如下配置:

```
<property>
 <name>mapreduce.framework.name</name>
 <value>yarn</value>
</property>
```

**配置YARN进程：**

- yarn.nodemanager.aux-services ,该值设为`mapreduce_shuffle`
- yarn.resourcemanager.hostname ,该值设为cdh1
- yarn.log.aggregation.enable ,该值设为true
- yarn.application.classpath ,该值设为:

```
$HADOOP_CONF_DIR, $HADOOP_COMMON_HOME/*, $HADOOP_COMMON_HOME/lib/*, $HADOOP_HDFS_HOME/*, $HADOOP_HDFS_HOME/lib/*, $HADOOP_MAPRED_HOME/*, $HADOOP_MAPRED_HOME/lib/*, $HADOOP_YARN_HOME/*, $HADOOP_YARN_HOME/lib/*
```

在hadoop中默认的文件路径以及权限要求如下：

```
目录									所有者		权限		默认路径
yarn.nodemanager.local-dirs			yarn:yarn	drwxr-xr-x ${hadoop.tmp.dir}/nm-local-dir
yarn.nodemanager.log-dirs			yarn:yarn	drwxr-xr-x	${yarn.log.dir}/userlogs
yarn.nodemanager.remote-app-log-dir							hdfs://var/log/hadoop-yarn/apps
```

最后，`yarn-site.xml`文件如下:

```xml
	<configuration>
	<property>
	    <name>yarn.resourcemanager.resource-tracker.address</name>
	    <value>cdh1:8031</value>
	</property>
	<property>
	    <name>yarn.resourcemanager.address</name>
	    <value>cdh1:8032</value>
	</property>
	<property>
	    <name>yarn.resourcemanager.scheduler.address</name>
	    <value>cdh1:8030</value>
	</property>
	<property>
	    <name>yarn.resourcemanager.admin.address</name>
	    <value>cdh1:8033</value>
	</property>
	<property>
	    <name>yarn.resourcemanager.webapp.address</name>
	    <value>cdh1:8088</value>
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
	    <name>yarn.log-aggregation-enable</name>
	    <value>true</value>
	</property>
	<property>
	    <name>yarn.application.classpath</name>
	    <value>
		$HADOOP_CONF_DIR,
		$HADOOP_COMMON_HOME/*,$HADOOP_COMMON_HOME/lib/*,
		$HADOOP_HDFS_HOME/*,$HADOOP_HDFS_HOME/lib/*,
		$HADOOP_MAPRED_HOME/*,$HADOOP_MAPRED_HOME/lib/*,
		$YARN_HOME/*,$YARN_HOME/lib/*
	    </value>
	</property>
	<property>
	    <name>yarn.nodemanager.local-dirs</name>
	    <value>file:///data/yarn/local</value>
	</property>
	<property>
	    <name>yarn.nodemanager.log-dirs</name>
	    <value>file:///var/log/hadoop-yarn</value>
	</property>
	<property>
	    <name>yarn.nodemanager.remote-app-log-dir</name>
	    <value>hdfs://var/log/hadoop-yarn/apps</value>
	</property>
	</configuration>
```

**创建本地目录：**

创建 `yarn.nodemanager.local-dirs` 参数对应的目录：

```
$ sudo mkdir -p /data/yarn/local 
$ sudo chown -R yarn:yarn /data/yarn/local
```

创建 `yarn.nodemanager.log-dirs` 参数对应的目录：

```
$ sudo mkdir -p /var/log/hadoop-yarn
$ sudo chown -R yarn:yarn /var/log/hadoop-yarn
```

**配置History Server：**

在 `mapred-site.xml` 中添加如下参数：

- mapreduce.jobhistory.address，该值为 `historyserver.company.com:10020`
- mapreduce.jobhistory.webapp.address，该值为 `historyserver.company.com:19888`

此外，确保 mapred 用户能够使用代理，在 `core-site.xml` 中添加如下参数：

- hadoop.proxyuser.mapred.groups，默认值为`*`，Allows the mapreduser to move files belonging to users in these groups
- hadoop.proxyuser.mapred.hosts，默认值为`*`，Allows the mapreduser to move files belonging to users in these groups


**配置Staging目录：**

在 `mapred-site.xml` 中配置 `yarn.app.mapreduce.am.staging-dir` 参数：

<property>
    <name>yarn.app.mapreduce.am.staging-dir</name>
    <value>/user</value>
</property>

在 HDFS 运行之后，你需要手动创建 history 子目录：

```
$ sudo -u hdfs hadoop fs -mkdir -p /user/history
$ sudo -u hdfs hadoop fs -chmod -R 1777 /user/history
$ sudo -u hdfs hadoop fs -chown mapred:hadoop /user/history
```

可选的，你可以在 `mapred-site.xml` 设置以下两个参数：

- mapreduce.jobhistory.intermediate-done-dir，该目录权限应该为1777
- mapreduce.jobhistory.done-dir，该目录权限应该为750

如果你设置了上面两个参数，那你可以不用手动去创建history子目录。

**创建Log目录**

创建 `/var/log/hadoop-yarn` ，因为 `yarn-site.xml` 中配置了 `/var/log/hadoop-yarn/apps` ，故需要手动创建它的父目录：

```
$ sudo -u hdfs hadoop fs -mkdir -p /var/log/hadoop-yarn
$ sudo -u hdfs hadoop fs -chown yarn:mapred /var/log/hadoop-yarn
```

验证 HDFS 结构：

```
$ sudo -u hdfs hadoop fs -ls -R /
```

你应该看到如下结构：

```
drwxrwxrwt   - hdfs hadoop          0 2014-04-19 14:31 /tmp
drwxr-xr-x   - hdfs hadoop          0 2014-04-31 10:26 /user
drwxrwxrwt   - yarn hadoop          0 2014-04-19 14:31 /user/history
drwxr-xr-x   - hdfs   hadoop        0 2014-04-31 15:31 /var
drwxr-xr-x   - hdfs   hadoop        0 2014-04-31 15:31 /var/log
drwxr-xr-x   - yarn   mapred        0 2014-04-31 15:31 /var/log/hadoop-yarn
```


同步配置文件到整个集群:

```
$ scp -r /etc/hadoop/conf root@cdh2:/etc/hadoop/conf
$ scp -r /etc/hadoop/conf root@cdh3:/etc/hadoop/conf
```

启动 mapred-historyserver :

```
$ /etc/init.d/hadoop-mapreduce-historyserver start
```

在每个节点启动YARN:

```
$ for x in `cd /etc/init.d ; ls hadoop-yarn-*` ; do sudo service $x start ; done
```

为每个 MapReduce 用户创建主目录

```
$ sudo -u hdfs hadoop fs -mkdir /user/$USER
$ sudo -u hdfs hadoop fs -chown $USER /user/$USER
```

设置 `HADOOP_MAPRED_HOME` ,或者把其加入到 hadoop 的配置文件中

```
$ export HADOOP_MAPRED_HOME=/usr/lib/hadoop-mapreduce
```

设置开机启动

```
	sudo chkconfig hadoop-hdfs-namenode on
	sudo chkconfig hadoop-hdfs-datanode on
	sudo chkconfig hadoop-hdfs-secondarynamenode on
	sudo chkconfig hadoop-yarn-resourcemanager on
	sudo chkconfig hadoop-yarn-nodemanager on
	sudo chkconfig hadoop-mapreduce-historyserver on
	sudo chkconfig hbase-master on
	sudo chkconfig hbase-regionserver on
	sudo chkconfig hive-metastore  on
	sudo chkconfig hive-server2 on
	sudo chkconfig zookeeper-server on
	sudo chkconfig hadoop-httpfs on
```

# 4. 安装HttpFS

# 5. 安装Zookeeper

安装zookeeper

```
$ yum install zookeeper*
```

拷贝默认的配置文件为一个新的文件，并设置新文件为 zookeeper 的默认配置文件：

```
$ sudo cp -r /etc/zookeeper/conf.empty /etc/hadoop/conf.my_cluster
$ sudo alternatives --verbose --install /etc/zookeeper/conf zookeeper-conf /etc/zookeeper/conf.my_cluster 50 
$ sudo alternatives --set zookeeper-conf /etc/zookeeper/conf.my_cluster
```

zookeeper 默认使用 `/etc/zookeeper/conf` 路径读取配置文件，经过上述配置之后，`/etc/zookeeper/conf` 会软连接到 `/etc/zookeeper/conf.my_cluster` 目录

设置crontab:

```	
$ crontab -e
	15 * * * * java -cp $classpath:/usr/lib/zookeeper/lib/log4j-1.2.15.jar:\
	/usr/lib/zookeeper/lib/jline-0.9.94.jar:\	
	/usr/lib/zookeeper/zookeeper.jar:/usr/lib/zookeeper/conf\
	org.apache.zookeeper.server.PurgeTxnLog /var/zookeeper/ -n 5
```

在每个需要安装 zookeeper 的节点上创建 zookeeper 的目录

```
$ mkdir -p /opt/data/zookeeper
$ chown -R zookeeper:zookeeper /opt/data/zookeeper
```

设置 zookeeper 配置 `/etc/zookeeper/conf/zoo.cfg` ，并同步到其他机器

```
	tickTime=2000
	initLimit=10
	syncLimit=5
	dataDir=/opt/data/zookeeper
	clientPort=2181
	server.1=node1:2888:3888
	server.2=node2:2888:3888
	server.3=node3:2888:3888
```

在每个节点上初始化并启动zookeeper，注意修改n值
 
```
$ service zookeeper-server init --myid=n
$ service zookeeper-server restart
```

# 6. 安装HBase

```
$ yum install hbase*
``` 

拷贝默认的配置文件为一个新的文件，并设置新文件为 hbase 的默认配置文件：

```
$ sudo cp -r /etc/hbase/conf.empty /etc/hbase/conf.my_cluster
$ sudo alternatives --verbose --install /etc/hbase/conf hbase-conf /etc/hbase/conf.my_cluster 50 
$ sudo alternatives --set hbase-conf /etc/hbase/conf.my_cluster
```

hbase 默认使用 `/etc/hbase/conf` 路径读取配置文件，经过上述配置之后，`/etc/hbase/conf` 会软连接到 `/etc/hbase/conf.my_cluster`目录

在hdfs中创建/hbase

```
$ sudo -u hdfs hadoop fs -mkdir /hbase
$ sudo -u hdfs hadoop fs -chown hbase:hbase /hbase
```

设置crontab：

```
$ crontab -e
	* 10 * * * cd /var/log/hbase/; rm -rf\
	`ls /var/log/hbase/|grep -P 'hbase\-hbase\-.+\.log\.[0-9]'\`>> /dev/null &
```

修改配置文件并同步到其他机器：

修改hbase-site.xml文件：

```xml
	<configuration>
	<property>
	    <name>hbase.distributed</name>
	    <value>true</value>
	</property>
	<property>
	    <name>hbase.rootdir</name>
	    <value>hdfs://cdh1:8020/hbase</value>
	</property>
	<property>
	    <name>hbase.tmp.dir</name>
	    <value>/opt/data/hbase</value>
	</property>
	<property>
	    <name>hbase.zookeeper.quorum</name>
	    <value>cdh1,cdh2,cdh3</value>
	</property>
	<property>
	    <name>hbase.hregion.max.filesize</name>
	    <value>536870912</value>
	  </property>
	  <property>
	    <name>hbase.hregion.memstore.flush.size</name>
	    <value>67108864</value>
	  </property>
	  <property>
	    <name>hbase.regionserver.lease.period</name>
	    <value>600000</value>
	  </property>
	  <property>
	    <name>hbase.client.retries.number</name>
	    <value>3</value>
	  </property> 
	  <property>
	    <name>hbase.regionserver.handler.count</name>
	    <value>100</value>
	  </property>
	  <property>
	    <name>hbase.zookeeper.property.maxClientCnxns</name>
	    <value>2000</value>
	  </property>
	  <property>
	    <name>hfile.block.cache.size</name>
	    <value>0.1</value>
	  </property>
	  <property>
	    <name>hbase.regions.slop</name>
	    <value>0</value>
	  </property>
	  <property>
	    <name>hbase.hstore.compactionThreshold</name>
	    <value>10</value>
	  </property>
	  <property>
	    <name>hbase.hstore.blockingStoreFiles</name>
	    <value>30</value>
	  </property>
	</configuration>
```

修改regionserver文件


## 启动HBase

```
$ service hbase-master start
$ service hbase-regionserver start
```

# 7. 安装hive

在一个节点上安装 hive

```
$ sudo yum install hive*
```

拷贝默认的配置文件为一个新的文件，并设置新文件为 hive 的默认配置文件：

```
$ sudo cp -r /etc/hive/conf.empty /etc/hive/conf.my_cluster
$ sudo alternatives --verbose --install /etc/hive/conf hive-conf /etc/hive/conf.my_cluster 50 
$ sudo alternatives --set hive-conf /etc/hive/conf.my_cluster
```

hive 默认使用 `/etc/hive/conf` 路径读取配置文件，经过上述配置之后，`/etc/hive/conf` 会软连接到 `/etc/hive/conf.my_cluster`目录

## 安装postgresql

手动安装、配置postgresql数据库，请参考[手动安装Cloudera Hive CDH](http://blog.javachen.com/hadoop/2013/03/24/manual-install-Cloudera-hive-CDH/)

yum方式安装：

```
$ sudo yum install postgresql-server
```

初始化数据库：

```
$ sudo service postgresql initdb
```

修改配置文件postgresql.conf，修改完后内容如下：

```
$ sudo cat /var/lib/pgsql/data/postgresql.conf  | grep -e listen -e standard_conforming_strings
	listen_addresses = '*'
	standard_conforming_strings = off
```

修改 pg_hba.conf，添加以下一行内容：

```
	host    all         all         0.0.0.0         0.0.0.0               md5
```

启动数据库

```
$ sudo service postgresql start
```

配置开启启动

```
$ chkconfig postgresql on
```

安装jdbc驱动

```
$ sudo yum install postgresql-jdbc
$ ln -s /usr/share/java/postgresql-jdbc.jar /usr/lib/hive/lib/postgresql-jdbc.jar
```

创建数据库和用户

```
	bash# sudo –u postgres psql
	bash$ psql
	postgres=# CREATE USER hiveuser WITH PASSWORD 'redhat';
	postgres=# CREATE DATABASE metastore owner=hiveuser;
	postgres=# GRANT ALL privileges ON DATABASE metastore TO hiveuser;
	postgres=# \q;
	bash$ psql  -U hiveuser -d metastore
	postgres=# \i /usr/lib/hive/scripts/metastore/upgrade/postgres/hive-schema-0.10.0.postgres.sql
	SET
	SET
	..
```

**修改配置文件**

修改hive-site.xml文件：

```xml
	<configuration>
	<property>
	    <name>fs.defaultFS</name>
	    <value>hdfs://cdh1:8020</value>
	</property>
	<property>
	  <name>javax.jdo.option.ConnectionURL</name>
	  <value>jdbc:postgresql://cdh1/metastore</value>
	</property>
	<property>
	  <name>javax.jdo.option.ConnectionDriverName</name>
	  <value>org.postgresql.Driver</value>
	</property>
	<property>
	  <name>javax.jdo.option.ConnectionUserName</name>
	  <value>hiveuser</value>
	</property>
	<property>
	  <name>javax.jdo.option.ConnectionPassword</name>
	  <value>redhat</value>
	</property>
	<property>
	 <name>mapred.job.tracker</name>
	 <value>cdh1:8031</value>
	</property>
	<property>
	 <name>mapreduce.framework.name</name>
	 <value>yarn</value>
	</property>
	<property>
	    <name>datanucleus.autoCreateSchema</name>
	    <value>false</value>
	</property>
	<property>
	    <name>datanucleus.fixedDatastore</name>
	    <value>true</value>
	</property>
	<property>
	    <name>hive.metastore.warehouse.dir</name>
	    <value>/user/hive/warehouse</value>
	</property>
	<property>
	    <name>hive.metastore.uris</name>
	    <value>thrift://cdh1:9083</value>
	</property>
	<property>
	    <name>hive.metastore.local</name>
	    <value>false</value>
	</property>
	<property>
	  <name>hive.support.concurrency</name>
	  <value>true</value>
	</property>
	<property>
	  <name>hive.zookeeper.quorum</name>
	  <value>cdh1,cdh2,cdh3</value>
	</property>
	<property>
	  <name>hive.hwi.listen.host</name>
	  <value>cdh1</value>
	</property>
	<property>
	  <name>hive.hwi.listen.port</name>
	  <value>9999</value>
	</property>
	<property>
	  <name>hive.hwi.war.file</name>
	  <value>lib/hive-hwi-0.10.0-cdh4.2.0.war</value>
	</property>
	<property>
	  <name>hive.merge.mapredfiles</name>
	  <value>true</value>
	</property>
	</configuration>
```

修改`/etc/hadoop/conf/hadoop-env.sh`:

添加环境变量`HADOOP_MAPRED_HOME`，如果不添加，则当你使用yarn运行mapreduce时候会出现`UNKOWN RPC TYPE`的异常

```
export HADOOP_MAPRED_HOME=/usr/lib/hadoop-mapreduce
```


在hdfs中创建hive数据仓库目录:

- hive的数据仓库在hdfs中默认为`/user/hive/warehouse`,建议修改其访问权限为1777，以便其他所有用户都可以创建、访问表，但不能删除不属于他的表。
- 每一个查询hive的用户都必须有一个hdfs的home目录(`/user`目录下，如root用户的为`/user/root`)
- hive所在节点的 `/tmp`必须是world-writable权限的。

创建目录并设置权限：

```
$ sudo -u hdfs hadoop fs -mkdir /user/hive/warehouse
$ sudo -u hdfs hadoop fs -chmod 1777 /user/hive/warehouse
$ sudo -u hdfs hadoop fs -chown hive /user/hive/warehouse
```

启动hive-server和metastore:

```
$ service hive-metastore start
$ service hive-server start
$ service hive-server2 start
```

访问beeline:

```
$ /usr/lib/hive/bin/beeline
	beeline> !connect jdbc:hive2://localhost:10000 username password org.apache.hive.jdbc.HiveDriver
	0: jdbc:hive2://localhost:10000> SHOW TABLES;
	show tables;
	+-----------+
	| tab_name  |
	+-----------+
	+-----------+
	No rows selected (0.238 seconds)
	0: jdbc:hive2://localhost:10000> 
```

其 sql语法参考[SQLLine CLI](http://sqlline.sourceforge.net/)，在这里，你不能使用HiveServer的sql语句

## 与hbase集成

需要在hive里添加以下jar包：

```
$ ADD JAR /usr/lib/hive/lib/zookeeper.jar;
$ ADD JAR /usr/lib/hive/lib/hbase.jar;
$ ADD JAR /usr/lib/hive/lib/hive-hbase-handler-0.12.0-cdh5.0.1.jar
$ ADD JAR /usr/lib/hive/lib/guava-11.0.2.jar;
```

# 8. 参考文章

* [1] [CDH5-Installation-Guide](http://www.cloudera.com/content/cloudera-content/cloudera-docs/CDH5/latest/CDH5-Installation-Guide/CDH5-Installation-Guide.html)
* [2] [hadoop cdh 安装笔记](http://roserouge.iteye.com/blog/1558498)

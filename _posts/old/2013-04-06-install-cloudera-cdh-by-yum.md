---
layout: post
title:  使用yum安装CDH Hadoop集群
description: 使用yum安装CDH Hadoop集群，包括hdfs、yarn、hive和hbase。
category: Hadoop
tags: [hadoop, hdfs, yarn, hive ,hbase]
---

Update:

- `2014.07.21` 添加 lzo 的安装
- `2014.05.20` 修改cdh4为cdh5进行安装。
- `2014.10.22` 添加安装 cdh5.2 注意事项。
 - 1、[cdh5.2](http://blog.javachen.com/2014/10/20/cdh5.2-release/) 发布了，其中 YARN 的一些配置参数做了修改，需要特别注意。
 - 2、Hive 的元数据如果使用 PostgreSql9.X，需要设置 `standard_conforming_strings` 为 off

# 环境

- CentOS 6.4 x86_64
- CDH 5.0.1
- jdk1.6.0_31

集群规划为3个节点，每个节点的ip、主机名和部署的组件分配如下：

```
	192.168.56.121        cdh1     NameNode、Hive、ResourceManager、HBase
	192.168.56.122        cdh2     DataNode、SSNameNode、NodeManager、HBase
	192.168.56.123        cdh3     DataNode、HBase、NodeManager
```

# 1. 准备工作

安装 Hadoop 集群前先做好下面的准备工作，在修改配置文件的时候，建议在一个节点上修改，然后同步到其他节点，例如：对于 hdfs 和 yarn ，在 NameNode 节点上修改然后再同步，对于 HBase，选择一个节点再同步。因为要同步配置文件和在多个节点启动服务，建议配置 ssh 无密码登陆。

## 1.1 配置hosts

> CDH 要求使用 IPv4，IPv6 不支持。

**禁用IPv6方法：**

```bash
$ vim /etc/sysctl.conf
#disable ipv6
net.ipv6.conf.all.disable_ipv6=1
net.ipv6.conf.default.disable_ipv6=1
net.ipv6.conf.lo.disable_ipv6=1
```

使其生效：

```bash
$ sysctl -p
```

最后确认是否已禁用：

```bash
$ cat /proc/sys/net/ipv6/conf/all/disable_ipv6
1
```

1、设置hostname，以cdh1为例

```bash
$ hostname cdh1
```

2、确保`/etc/hosts`中包含ip和FQDN，如果你在使用DNS，保存这些信息到`/etc/hosts`不是必要的，却是最佳实践。

3、确保`/etc/sysconfig/network`中包含`hostname=cdh1`

4、检查网络，运行下面命令检查是否配置了hostname以及其对应的ip是否正确。

运行`uname -a`查看hostname是否匹配`hostname`命令运行的结果：

```bash
$ uname -a
Linux cdh1 2.6.32-358.23.2.el6.x86_64 #1 SMP Wed Oct 16 18:37:12 UTC 2013 x86_64 x86_64 x86_64 GNU/Linux
$ hostname
cdh1
```

运行`/sbin/ifconfig`查看ip:

```bash
$ ifconfig
eth1      Link encap:Ethernet  HWaddr 08:00:27:75:E0:95  
          inet addr:192.168.56.121  Bcast:192.168.56.255  Mask:255.255.255.0
......
```

先安装bind-utils，才能运行host命令：

```bash
$ yum install bind-utils -y
```

运行下面命令查看hostname和ip是否匹配:

```bash
$ host -v -t A `hostname` 
Trying "cdh1"
...
;; ANSWER SECTION:
cdh1. 60 IN	A	192.168.56.121
```


5、hadoop的所有配置文件中配置节点名称时，请使用hostname和不是ip

## 1.2 关闭防火墙

```bash
$ setenforce 0
$ vim /etc/sysconfig/selinux #修改SELINUX=disabled
```

清空iptables 

```bash
$ iptables -F
```

## 1.3 时钟同步

## 搭建时钟同步服务器

这里选择 cdh1 节点为时钟同步服务器，其他节点为客户端同步时间到该节点。、

安装ntp:
	
```bash
$ yum install ntp
```

修改 cdh1 上的配置文件 `/etc/ntp.conf` :

```
restrict default ignore   //默认不允许修改或者查询ntp,并且不接收特殊封包
restrict 127.0.0.1        //给于本机所有权限
restrict 192.168.56.0 mask 255.255.255.0 notrap nomodify  //给于局域网机的机器有同步时间的权限
server  192.168.56.121     # local clock
driftfile /var/lib/ntp/drift
fudge   127.127.1.0 stratum 10
```

启动 ntp：

```bash
$ service ntpd start
```

设置开机启动:

```bash
$ chkconfig ntpd on
```

ntpq用来监视ntpd操作，使用标准的NTP模式6控制消息模式，并与NTP服务器通信。

`ntpq -p` 查询网络中的NTP服务器，同时显示客户端和每个服务器的关系。

```
$ ntpq -p
     remote           refid      st t when poll reach   delay   offset  jitter
==============================================================================
*LOCAL(1)        .LOCL.           5 l    6   64    1    0.000    0.000   0.000
```

- "* "：响应的NTP服务器和最精确的服务器。
- "+"：响应这个查询请求的NTP服务器。
- "blank（空格）"：没有响应的NTP服务器。
- "remote" ：响应这个请求的NTP服务器的名称。
- "refid "：NTP服务器使用的更高一级服务器的名称。
- "st"：正在响应请求的NTP服务器的级别。
- "when"：上一次成功请求之后到现在的秒数。
- "poll"：当前的请求的时钟间隔的秒数。
- "offset"：主机通过NTP时钟同步与所同步时间源的时间偏移量，单位为毫秒（ms）。

## 客户端的配置

在cdh2和cdh3节点上执行下面操作：

```bash
$ ntpdate cdh1
```

Ntpd启动的时候通常需要一段时间大概5分钟进行时间同步，所以在ntpd刚刚启动的时候还不能正常提供时钟服务，报错"no server suitable for synchronization found"。启动时候需要等待5分钟。

如果想定时进行时间校准，可以使用crond服务来定时执行。

```
00 1 * * * root /usr/sbin/ntpdate 192.168.56.121 >> /root/ntpdate.log 2>&1 
```

这样，每天 1:00 Linux 系统就会自动的进行网络时间校准。

## 1.4 安装jdk

以下是手动安装jdk，你也可以通过yum方式安装，见下文。

检查jdk版本

```bash
$ java -version
```

如果其版本低于v1.6 update 31，则将其卸载

```bash
$ rpm -qa | grep java
$ yum remove {java-1.*}
```

验证默认的jdk是否被卸载

```bash
$ which java
```

安装jdk，使用yum安装或者手动下载安装jdk-6u31-linux-x64.bin，下载地址：[这里](http://www.oracle.com/technetwork/java/javasebusiness/downloads/java-archive-downloads-javase6-419409.html#jdk-6u31-oth-JPR)

```bash	
$ yum install jdk -y
```

创建符号连接

```bash
$ ln -s XXXXX/jdk1.6.0_31 /usr/java/latest
$ ln -s /usr/java/latest/bin/java /usr/bin/java
```

设置环境变量:

```bash
$ echo "export JAVA_HOME=/usr/java/latest" >>/root/.bashrc
$ echo "export PATH=\$JAVA_HOME/bin:\$PATH" >> /root/.bashrc
$ source /root/.bashrc
```

验证版本

```bash
$ java -version
	java version "1.6.0_31"
	Java(TM) SE Runtime Environment (build 1.6.0_31-b04)
	Java HotSpot(TM) 64-Bit Server VM (build 20.6-b01, mixed mode)
```

检查环境变量中是否有设置`JAVA_HOME`

```bash
$ env | grep JAVA_HOME
```

如果env中没有`JAVA_HOM`E变量，则修改`/etc/sudoers`文件

```bash	
$ vi /etc/sudoers
	Defaults env_keep+=JAVA_HOME
```

## 1.5 设置本地yum源

你可以从[这里](http://archive.cloudera.com/cdh4/repo-as-tarball/)下载 cdh4 的仓库压缩包，或者从[这里](http://archive.cloudera.com/cdh5/repo-as-tarball/) 下载 cdh5 的仓库压缩包。

因为我是使用的centos操作系统，故这里使用的cdh5的centos6仓库，将其下载之后解压配置cdh的yum源：

```
[hadoop]
name=hadoop
baseurl=ftp://cdh1/cdh/5/
enabled=1
gpgcheck=0
```

这里使用的是 ftp 搭建 yum 源，需要安装 ftp 服务，并将解压后的目录拷贝到 ftp 存放文件的目录下。

操作系统的yum源，建议你通过下载 centos 的 dvd 然后配置一个本地的 yum 源。

其实，在配置了CDH 的 yum 源之后，可以通过 yum 来安装 jdk，然后，设置 JAVA HOME：

```bash
$ yum install jdk -y
```

# 2. 安装和配置HDFS

**说明：** 

- 根据文章开头的节点规划，cdh1 为NameNode节点和SecondaryNameNode
- 根据文章开头的节点规划，cdh2 和 cdh3 为DataNode节点

在 NameNode 节点安装 hadoop-hdfs-namenode

```bash
$ yum install hadoop hadoop-hdfs hadoop-client hadoop-doc hadoop-debuginfo hadoop-hdfs-namenode
```

在 NameNode 节点中选择一个节点作为 secondarynamenode ，并安装 hadoop-hdfs-secondarynamenode

```bash
$ yum install hadoop-hdfs-secondarynamenode -y
```

在DataNode节点安装 hadoop-hdfs-datanode 

```bash
$ yum install hadoop hadoop-hdfs hadoop-client hadoop-doc hadoop-debuginfo hadoop-hdfs-datanode -y
```

> 配置 NameNode HA 请参考[Introduction to HDFS High Availability](https://ccp.cloudera.com/display/CDH4DOC/Introduction+to+HDFS+High+Availability)

## 2.1 修改hadoop配置文件

> 更多的配置信息说明，请参考 [Apache Cluster Setup](http://hadoop.apache.org/docs/stable/hadoop-project-dist/hadoop-common/ClusterSetup.html)

1. 在`/etc/hadoop/conf/core-site.xml`中设置`fs.defaultFS`属性值，该属性指定NameNode是哪一个节点以及使用的文件系统是file还是hdfs，格式：`hdfs://<namenode host>:<namenode port>/`，默认的文件系统是`file:///`
1. 在`/etc/hadoop/conf/hdfs-site.xml`中设置`dfs.permissions.superusergroup`属性，该属性指定hdfs的超级用户，默认为hdfs，你可以修改为hadoop

配置如下：

/etc/hadoop/conf/core-site.xml:

```xml
<property>
 <name>fs.defaultFS</name>
 <value>hdfs://cdh1:8020</value>
</property>
```

/etc/hadoop/conf/hdfs-site.xml:

```xml
<property>
 <name>dfs.permissions.superusergroup</name>
 <value>hadoop</value>
</property>
```

## 2.2 指定本地文件目录

在hadoop中默认的文件路径以及权限要求如下：

```
目录									所有者		权限		默认路径
hadoop.tmp.dir						hdfs:hdfs	drwx------	/var/hadoop
dfs.namenode.name.dir				hdfs:hdfs	drwx------	file://${hadoop.tmp.dir}/dfs/name
dfs.datanode.data.dir				hdfs:hdfs	drwx------	file://${hadoop.tmp.dir}/dfs/data
dfs.namenode.checkpoint.dir			hdfs:hdfs	drwx------	file://${hadoop.tmp.dir}/dfs/namesecondary
```

说明你可以在hdfs-site.xml中只配置　｀hadoop.tmp.dir`,也可以分别配置上面的路径。

这里使用分别配置的方式，hdfs-site.xml中配置如下：

```xml
<property>
 <name>dfs.namenode.name.dir</name>
 <value>file:///data/dfs/nn</value>
</property>

<property>
 <name>dfs.datanode.data.dir</name>
<value>file:///data/dfs/dn</value>
</property>
```

在**NameNode**上手动创建 `dfs.name.dir` 或 `dfs.namenode.name.dir` 的本地目录：

```bash
$ mkdir -p /data/dfs/nn
```

在**DataNode**上手动创建 `dfs.data.dir` 或 `dfs.datanode.data.dir` 的本地目录：

```bash
$ mkdir -p /data/dfs/dn
```

修改上面目录所有者：

```
$ chown -R hdfs:hdfs /data/dfs/nn /data/dfs/dn
```
> hadoop的进程会自动设置 `dfs.data.dir` 或 `dfs.datanode.data.dir`，但是 `dfs.name.dir` 或 `dfs.namenode.name.dir` 的权限默认为755，需要手动设置为700。

故，修改上面目录权限：

```bash
$ chmod 700 /data/dfs/nn
```

或者：

```bash
$ chmod go-rx /data/dfs/nn
```

**说明：**

DataNode的本地目录可以设置多个，你可以设置 `dfs.datanode.failed.volumes.tolerated` 参数的值，表示能够容忍不超过该个数的目录失败。

## 2.3 配置 SecondaryNameNode

在 `/etc/hadoop/conf/hdfs-site.xml` 中可以配置以下参数：

```
dfs.namenode.checkpoint.check.period
dfs.namenode.checkpoint.txns
dfs.namenode.checkpoint.dir
dfs.namenode.checkpoint.edits.dir
dfs.namenode.num.checkpoints.retained
```

如果想配置SecondaryNameNode节点，请从NameNode中单独选择一台机器，然后做以下设置：

- 将运行SecondaryNameNode的机器名称加入到masters
- 在 `/etc/hadoop/conf/hdfs-site.xml` 中加入如下配置：

```xml
<property>
  <name>dfs.secondary.http.address</name>
  <value>cdh1:50090</value>
</property>
```

设置多个secondarynamenode，请参考[multi-host-secondarynamenode-configuration](http://blog.cloudera.com/blog/2009/02/multi-host-secondarynamenode-configuration/).

## 2.4 (可选)开启回收站功能

> 回收站功能默认是关闭的，建议打开。

在 `/etc/hadoop/conf/core-site.xml` 中添加如下两个参数：

- `fs.trash.interval`,该参数值为时间间隔，单位为分钟，默认为0，表示回收站功能关闭。该值表示回收站中文件保存多长时间，如果服务端配置了该参数，则忽略客户端的配置；如果服务端关闭了该参数，则检查客户端是否有配置该参数；
- `fs.trash.checkpoint.interval`，该参数值为时间间隔，单位为分钟，默认为0。该值表示检查回收站时间间隔，该值要小于`fs.trash.interval`，该值在服务端配置。如果该值设置为0，则使用 `fs.trash.interval` 的值。

## 2.5 (可选)配置DataNode存储的负载均衡

在 `/etc/hadoop/conf/hdfs-site.xml` 中配置以下三个参数（详细说明，请参考 [Optionally configure DataNode storage balancing](http://www.cloudera.com/content/cloudera-content/cloudera-docs/CDH5/latest/CDH5-Installation-Guide/cdh5ig_hdfs_cluster_deploy.html#concept_ncq_nnk_ck_unique_1)）：

- dfs.datanode.fsdataset. volume.choosing.policy
- dfs.datanode.available-space-volume-choosing-policy.balanced-space-threshold
- dfs.datanode.available-space-volume-choosing-policy.balanced-space-preference-fraction

## 2.6 (可选)开启WebHDFS

这里只在一个NameNode节点（ CDH1 ）上安装：

```bash
$ yum install hadoop-httpfs -y
```

然后配置代理用户，修改 /etc/hadoop/conf/core-site.xml，添加如下代码：

```xml
<property>  
<name>hadoop.proxyuser.httpfs.hosts</name>  
<value>*</value>  
</property>  
<property>  
<name>hadoop.proxyuser.httpfs.groups</name>  
<value>*</value>  
</property> 
```

然后重启 Hadoop 使配置生效。

接下来，启动 HttpFS 服务：

```bash
$ service hadoop-httpfs start
```

> By default, HttpFS server runs on port 14000 and its URL is http://<HTTPFS_HOSTNAME>:14000/webhdfs/v1.

简单测试，使用 curl 运行下面命令，并查看执行结果：

```
$ curl "http://localhost:14000/webhdfs/v1?op=gethomedirectory&user.name=hdfs"
{"Path":"\/user\/hdfs"}
```

更多的 API，请参考 [WebHDFS REST API](http://archive.cloudera.com/cdh5/cdh/5/hadoop/hadoop-project-dist/hadoop-hdfs/WebHDFS.html)

## 2.7 (可选)配置LZO

下载repo文件到 `/etc/yum.repos.d/`:

 - 如果你安装的是 CDH4，请下载[Red Hat/CentOS 6](http://archive.cloudera.com/gplextras/redhat/6/x86_64/gplextras/cloudera-gplextras4.repo)
 - 如果你安装的是 CDH5，请下载[Red Hat/CentOS 6](http://archive.cloudera.com/gplextras5/redhat/6/x86_64/gplextras/cloudera-gplextras5.repo) 

然后，安装lzo:

```bash
$ yum install hadoop-lzo* impala-lzo  -y
```

最后，在 `/etc/hadoop/conf/core-site.xml` 中添加如下配置：

```xml
<property>
  <name>io.compression.codecs</name>
 <value>org.apache.hadoop.io.compress.DefaultCodec,org.apache.hadoop.io.compress.GzipCodec,
org.apache.hadoop.io.compress.BZip2Codec,com.hadoop.compression.lzo.LzoCodec,
com.hadoop.compression.lzo.LzopCodec,org.apache.hadoop.io.compress.SnappyCodec</value>
</property>
<property> 
  <name>io.compression.codec.lzo.class</name> 
  <value>com.hadoop.compression.lzo.LzoCodec</value> 
</property>
```

更多关于LZO信息，请参考：[Using LZO Compression](http://wiki.apache.org/hadoop/UsingLzoCompression)

## 2.8 (可选)配置Snappy

cdh 的 rpm 源中默认已经包含了 snappy ，直接安装即可。

在每个节点安装Snappy：

```bash
$ yum install snappy snappy-devel  -y
```

然后，在 `core-site.xml` 中修改`io.compression.codecs`的值，添加 `org.apache.hadoop.io.compress.SnappyCodec` ：

```xml
<property>
<name>io.compression.codecs</name>
<value>org.apache.hadoop.io.compress.DefaultCodec,
org.apache.hadoop.io.compress.GzipCodec,
org.apache.hadoop.io.compress.BZip2Codec,
com.hadoop.compression.lzo.LzoCodec,
com.hadoop.compression.lzo.LzopCodec,
org.apache.hadoop.io.compress.SnappyCodec</value>
</property>
```

使 snappy 对 hadoop 可用：

```bash	
$ ln -sf /usr/lib64/libsnappy.so /usr/lib/hadoop/lib/native/
```

## 2.9 启动HDFS

将配置文件同步到每一个节点：

```bash
$ scp -r /etc/hadoop/conf root@cdh2:/etc/hadoop/
$ scp -r /etc/hadoop/conf root@cdh3:/etc/hadoop/
```

格式化NameNode：

```bash
$ sudo -u hdfs hadoop namenode -format
```	
	
在每个节点运行下面命令启动hdfs：

```bash
$ for x in `ls /etc/init.d/|grep  hadoop-hdfs` ; do service $x start ; done
```

在 hdfs 运行之后，创建 `/tmp` 临时目录，并设置权限为 `1777`：

```bash
$ sudo -u hdfs hadoop fs -mkdir /tmp
$ sudo -u hdfs hadoop fs -chmod -R 1777 /tmp
```

## 2.10 访问web

通过 <http://cdh1:50070/> 可以访问 NameNode 页面。

# 3. 安装和配置YARN

## 节点规划

- 根据文章开头的节点规划，cdh1 为resourcemanager节点
- 根据文章开头的节点规划，cdh2 和 cdh3 为nodemanager节点
- 为了简单，historyserver也装在 cdh1 节点上

## 安装服务

在 resourcemanager 节点安装:

```bash
$ yum install hadoop-yarn hadoop-yarn-resourcemanager -y
```

在 nodemanager 节点安装:

```bash
$ yum install hadoop-yarn hadoop-yarn-nodemanager hadoop-mapreduce -y
```

安装 historyserver：

```bash
$ yum install hadoop-mapreduce-historyserver hadoop-yarn-proxyserver -y
```

## 修改配置参数

**要想使用YARN**，需要在 `/etc/hadoop/conf/mapred-site.xml` 中做如下配置:

```xml
<property>
	<name>mapreduce.framework.name</name>
	<value>yarn</value>
</property>
```

**配置resourcemanager的节点名称以及一些服务的端口号**，修改/etc/hadoop/conf/yarn-site.xml：

```xml
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
```

**配置YARN进程：**

- `yarn.nodemanager.aux-services`，在CDH4中该值设为 `mapreduce.shuffle`，在CDH5中该值设为 `mapreduce_shuffle`
- `yarn.nodemanager.aux-services.mapreduce.shuffle.class`，该值设为 `org.apache.hadoop.mapred.ShuffleHandler`
- `yarn.resourcemanager.hostname`，该值设为 cdh1
- `yarn.log.aggregation.enable`，该值设为 true
- `yarn.application.classpath`，该值设为:

```
$HADOOP_CONF_DIR, $HADOOP_COMMON_HOME/*, $HADOOP_COMMON_HOME/lib/*, $HADOOP_HDFS_HOME/*, $HADOOP_HDFS_HOME/lib/*, $HADOOP_MAPRED_HOME/*, $HADOOP_MAPRED_HOME/lib/*, $HADOOP_YARN_HOME/*, $HADOOP_YARN_HOME/lib/*
```

即，在 `/etc/hadoop/conf/yarn-site.xml` 中添加如下配置：

```xml
<property>
    <name>yarn.nodemanager.aux-services</name>
    <value>mapreduce_shuffle</value>
</property>
<property>
    <name>yarn.nodemanager.aux-services.mapreduce_shuffle.class</name>
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
    $HADOOP_COMMON_HOME/*,
    $HADOOP_COMMON_HOME/lib/*,
    $HADOOP_HDFS_HOME/*,
    $HADOOP_HDFS_HOME/lib/*,
    $HADOOP_MAPRED_HOME/*,
    $HADOOP_MAPRED_HOME/lib/*,
    $HADOOP_YARN_HOME/*,
    $HADOOP_YARN_HOME/lib/*
    </value>
</property>
<property>
	<name>yarn.log.aggregation.enable</name>
	<value>true</value>
</property>
```

**注意：**

a. `yarn.nodemanager.aux-services` 的值在 cdh4 中应该为 `mapreduce.shuffle`，并配置参数`yarn.nodemanager.aux-services.mapreduce.shuffle.class`值为 org.apache.hadoop.mapred.ShuffleHandler ，在cdh5中为`mapreduce_shuffle`，这时候请配置`yarn.nodemanager.aux-services.mapreduce_shuffle.class`参数

b. 这里配置了 `yarn.application.classpath` ，需要设置一些喜欢环境变量：

```bash
export HADOOP_HOME=/usr/lib/hadoop
export HIVE_HOME=/usr/lib/hive
export HBASE_HOME=/usr/lib/hbase
export HADOOP_HDFS_HOME=/usr/lib/hadoop-hdfs
export HADOOP_MAPRED_HOME=/usr/lib/hadoop-mapreduce
export HADOOP_COMMON_HOME=${HADOOP_HOME}
export HADOOP_HDFS_HOME=/usr/lib/hadoop-hdfs
export HADOOP_LIBEXEC_DIR=${HADOOP_HOME}/libexec
export HADOOP_CONF_DIR=${HADOOP_HOME}/etc/hadoop
export HDFS_CONF_DIR=${HADOOP_HOME}/etc/hadoop
export HADOOP_YARN_HOME=/usr/lib/hadoop-yarn
export YARN_CONF_DIR=${HADOOP_HOME}/etc/hadoop
```

**配置文件路径**

在hadoop中默认的文件路径以及权限要求如下：

```
目录									                   所有者		 权限		        默认路径
yarn.nodemanager.local-dirs			      yarn:yarn	  drwxr-xr-x    ${hadoop.tmp.dir}/nm-local-dir
yarn.nodemanager.log-dirs			        yarn:yarn	  drwxr-xr-x	  ${yarn.log.dir}/userlogs
yarn.nodemanager.remote-app-log-dir							                hdfs://cdh1:8020/var/log/hadoop-yarn/apps
```

在 `/etc/hadoop/conf/yarn-site.xml`文件中添加如下配置:

```xml
<property>
    <name>yarn.nodemanager.local-dirs</name>
    <value>file:///data/yarn/local</value>
</property>
<property>
    <name>yarn.nodemanager.log-dirs</name>
    <value>file:///data/yarn/logs</value>
</property>
<property>
    <name>yarn.nodemanager.remote-app-log-dir</name>
    <value>/yarn/apps</value>
</property>
```

**创建本地目录**

创建 `yarn.nodemanager.local-dirs` 和 `yarn.nodemanager.log-dirs` 参数对应的目录：

```bash
$ mkdir -p /data/yarn/{local,logs} 
$ chown -R yarn:yarn /data/yarn
```

**创建Log目录**

在 hdfs 上创建 `yarn.nodemanager.remote-app-log-dir` 对应的目录：

```
$ sudo -u hdfs hadoop fs -mkdir -p /yarn/apps
$ sudo -u hdfs hadoop fs -chown yarn:mapred /yarn/apps
$ sudo -u hdfs hadoop fs -chmod 1777 /yarn/apps
```

**配置History Server：**

在 `/etc/hadoop/conf/mapred-site.xml` 中添加如下：

```xml
<property>
    <name>mapreduce.jobhistory.address</name>
    <value>cdh1:10020</value>
</property>

<property>
    <name>mapreduce.jobhistory.webapp.address</name>
    <value>cdh1:19888</value>
</property>
```

此外，确保 mapred 用户能够使用代理，在 `/etc/hadoop/conf/core-site.xml` 中添加如下参数：

```xml
<property>
    <name>hadoop.proxyuser.mapred.groups</name>
    <value>*</value>
</property>

<property>
    <name>hadoop.proxyuser.mapred.hosts</name>
    <value>*</value>
</property>
```

**配置Staging目录：**

在 `/etc/hadoop/conf/mapred-site.xml` 中配置如下参数：

```xml
<property>
    <name>yarn.app.mapreduce.am.staging-dir</name>
    <value>/user</value>
</property>
```

**创建 history 子目录**

在 HDFS 运行之后，你需要手动创建 history 子目录：

```bash
$ sudo -u hdfs hadoop fs -mkdir -p /user
$ sudo -u hdfs hadoop fs -chmod 777 /user
$ sudo -u hdfs hadoop fs -mkdir -p /user/history
$ sudo -u hdfs hadoop fs -chmod -R 1777 /user/history
$ sudo -u hdfs hadoop fs -chown mapred:hadoop /user/history
```

可选的，你可以在 `/etc/hadoop/conf/mapred-site.xml` 设置以下两个参数：

- mapreduce.jobhistory.intermediate-done-dir，该目录权限应该为1777
- mapreduce.jobhistory.done-dir，该目录权限应该为750

如果你设置了上面两个参数，那你可以不用手动去创建 history 子目录。


另外设置 /tmp/hadoop-yarn 权限

```bash
sudo -u hdfs hadoop fs -mkdir -p /tmp/hadoop-yarn
sudo -u hdfs hadoop fs -chmod -R 777 /tmp/hadoop-yarn
```

## 验证 HDFS 结构：

```bash
$ sudo -u hdfs hadoop fs -ls -R /
```

你应该看到如下结构：

```bash
drwxrwxrwt   - hdfs hadoop          0 2014-04-19 14:31 /tmp
drwxrwxrwx   - hdfs hadoop          0 2014-04-19 14:31 /tmp/hadoop-yarn
drwxrwxrwx   - hdfs hadoop          0 2014-04-31 10:26 /user
drwxrwxrwt   - yarn hadoop          0 2014-04-19 14:31 /user/history
drwxr-xr-x   - hdfs   hadoop        0 2014-04-31 15:31 /var
drwxr-xr-x   - hdfs   hadoop        0 2014-04-31 15:31 /var/log
drwxrwxrwt   - yarn   mapred        0 2014-04-31 15:31 /yarn/apps
```

看到上面的目录结构，你就将NameNode上的配置文件同步到其他节点了，并且启动 yarn 的服务。

## 同步配置文件

同步配置文件到整个集群:

```bash
$ scp -r /etc/hadoop/conf root@cdh2:/etc/hadoop/
$ scp -r /etc/hadoop/conf root@cdh3:/etc/hadoop/
```

## 启动服务

在 cdh1 节点启动 mapred-historyserver :

```bash
$ /etc/init.d/hadoop-mapreduce-historyserver start
```

在每个节点启动 YARN :

```bash
$ for x in `ls /etc/init.d/|grep hadoop-yarn` ; do service $x start ; done
```

为每个 MapReduce 用户创建主目录，比如说 hive 用户或者当前用户：

```bash
$ sudo -u hdfs hadoop fs -mkdir /user/$USER
$ sudo -u hdfs hadoop fs -chown $USER /user/$USER
```

设置 `HADOOP_MAPRED_HOME` ,或者把其加入到 hadoop 的配置文件中

```bash
$ export HADOOP_MAPRED_HOME=/usr/lib/hadoop-mapreduce
```

## 访问 web

通过 <http://cdh1:8088/> 可以访问 Yarn 的管理页面。

通过 <http://cdh1:19888/> 可以访问 JobHistory 的管理页面。

查看在线的节点：<http://cdh1:8088/cluster/nodes>。

运行下面的测试程序，看是否报错：

```
$ sudo -u hdfs hadoop jar /usr/lib/hadoop-mapreduce/hadoop-mapreduce-examples.jar randomwriter out
```

# 4. 安装 Zookeeper

简单说明：

Zookeeper 至少需要3个节点，并且节点数要求是基数，这里在所有节点上都安装 Zookeeper。

## 安装

在每个节点上安装zookeeper

```bash
$ yum install zookeeper* -y
```

## 修改配置文件

设置 zookeeper 配置 `/etc/zookeeper/conf/zoo.cfg` 

```
maxClientCnxns=50
tickTime=2000
initLimit=10
syncLimit=5
dataDir=/var/lib/zookeeper
clientPort=2181
server.1=cdh1:2888:3888
server.2=cdh3:2888:3888
server.3=cdh3:2888:3888
```

## 同步配置文件

将配置文件同步到其他节点：

```bash
$ scp -r /etc/zookeeper/conf root@cdh2:/etc/zookeeper/
$ scp -r /etc/zookeeper/conf root@cdh3:/etc/zookeeper/
```

## 初始化并启动服务

在每个节点上初始化并启动 zookeeper，注意 n 的值需要和 zoo.cfg 中的编号一致。
 
在 cdh1 节点运行

```bash
$ service zookeeper-server init --myid=1
$ service zookeeper-server start
```

在 cdh2 节点运行

```bash
$ service zookeeper-server init --myid=2
$ service zookeeper-server start
```

在 cdh3 节点运行

```
$ service zookeeper-server init --myid=3
$ service zookeeper-server start
```

## 测试

通过下面命令测试是否启动成功：

```bash
$ zookeeper-client -server cdh1:2181
```

# 5. 安装 HBase

HBase 依赖 ntp 服务，故需要提前安装好 ntp。

## 安装前设置

1）修改系统 ulimit 参数:

在 `/etc/security/limits.conf` 中添加下面两行并使其生效：

```
hdfs  -       nofile  32768
hbase -       nofile  32768
```

2）修改 `dfs.datanode.max.xcievers`

在 `hdfs-site.xml` 中修改该参数值，将该值调整到较大的值：

```xml
<property>
  <name>dfs.datanode.max.xcievers</name>
  <value>8192</value>
</property>
```

## 安装

在每个节点上安装 master 和 regionserver

```bash
$ yum install hbase hbase-master hbase-regionserver -y
``` 

如果需要你可以安装 hbase-rest、hbase-solr-indexer、hbase-thrift

## 修改配置文件

修改 `hbase-site.xml`文件，关键几个参数及含义如下：

- hbase.distributed：是否为分布式模式
- hbase.rootdir：HBase在hdfs上的目录路径
- hbase.tmp.dir：本地临时目录
- hbase.zookeeper.quorum：zookeeper集群地址，逗号分隔
- hbase.hregion.max.filesize：hregion文件最大大小
- hbase.hregion.memstore.flush.size：memstore文件最大大小

另外，在CDH5中建议`关掉Checksums`（见[Upgrading HBase](http://www.cloudera.com/content/cloudera-content/cloudera-docs/CDH5/latest/CDH5-Installation-Guide/cdh5ig_hbase_upgrade.html)）以提高性能，修改为如下：

```xml
 <property>
    <name>hbase.regionserver.checksum.verify</name>
    <value>false</value>
   </property>
  <property>
    <name>hbase.hstore.checksum.algorithm</name>
    <value>NULL</value>
    </property>
```

最后的配置如下，供参考：

```xml
<configuration>
<property>
    <name>hbase.cluster.distributed</name>
    <value>true</value>
</property>
<property>
    <name>hbase.rootdir</name>
    <value>hdfs://cdh1:8020/hbase</value>
</property>
<property>
    <name>hbase.tmp.dir</name>
    <value>/data/hbase</value>
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
    <name>hbase.hstore.compactionThreshold</name>
    <value>10</value>
  </property>
  <property>
    <name>hbase.hstore.blockingStoreFiles</name>
    <value>30</value>
  </property>

  <property>
    <name>hbase.regionserver.checksum.verify</name>
    <value>false</value>
  </property>
  <property>
    <name>hbase.hstore.checksum.algorithm</name>
    <value>NULL</value>
  </property>
</configuration>
```

在 hdfs 中创建 `/hbase` 目录

```bash
$ sudo -u hdfs hadoop fs -mkdir /hbase
$ sudo -u hdfs hadoop fs -chown hbase:hbase /hbase
```

设置crontab 定时删除日志：

```bash
$ crontab -e
* 10 * * * cd /var/log/hbase/; rm -rf `ls /var/log/hbase/|grep -P 'hbase\-hbase\-.+\.log\.[0-9]'\`>> /dev/null &
```

## 同步配置文件

将配置文件同步到其他节点：

```bash
$ scp -r /etc/hbase/conf root@cdh2:/etc/hbase/
$ scp -r /etc/hbase/conf root@cdh3:/etc/hbase/
```

## 创建本地目录

在 hbase-site.xml 配置文件中配置了 `hbase.tmp.dir` 值为 `/data/hbase`，现在需要在每个hbase节点创建该目录并设置权限：

```bash
$ mkdir /data/hbase
$ chown -R hbase:hbase /data/hbase/
```

## 启动HBase

```bash
$ for x in `ls /etc/init.d/|grep hbase` ; do service $x start ; done
```

## 访问web

通过 <http://cdh1:60030/> 可以访问 RegionServer 页面，然后通过该页面可以知道哪个节点为 Master，然后再通过60010端口访问 Master管理界面。

# 6. 安装hive

在一个NameNode节点上安装 hive：

```bash
$ yum install hive hive-metastore hive-server2 hive-jdbc hive-hbase  -y
```

在其他DataNode上安装：

```bash
$ yum install hive hive-server2 hive-jdbc hive-hbase -y
```

## 安装postgresql

这里使用postgresql数据库来存储元数据，如果你想使用mysql数据库，请参考下文。

手动安装、配置postgresql数据库，请参考[手动安装Cloudera Hive CDH](http://blog.javachen.com/hadoop/2013/03/24/manual-install-Cloudera-hive-CDH/)

yum方式安装：

```
$ yum install postgresql-server -y
```

初始化数据库：

```bash
$ service postgresql initdb
```

修改配置文件postgresql.conf，修改完后内容如下：

```bash
$ cat /var/lib/pgsql/data/postgresql.conf  | grep -e listen -e standard_conforming_strings
	listen_addresses = '*'
	standard_conforming_strings = off
```

修改 /var/lib/pgsql/data/pg_hba.conf，添加以下一行内容：

```
	host    all         all         0.0.0.0/0                      md5
```

启动数据库

```bash
$ service postgresql start
```

配置开启启动

```bash
$ chkconfig postgresql on
```

安装jdbc驱动

```bash
$ yum install postgresql-jdbc -y
$ ln -s /usr/share/java/postgresql-jdbc.jar /usr/lib/hive/lib/postgresql-jdbc.jar
```

创建数据库和用户

```bash
	bash# su postgres
	bash$ psql
	postgres=# CREATE USER hiveuser WITH PASSWORD 'redhat';
	postgres=# CREATE DATABASE metastore owner=hiveuser;
	postgres=# GRANT ALL privileges ON DATABASE metastore TO hiveuser;
	postgres=# \q;
	bash$ psql  -U hiveuser -d metastore
	postgres=# \i /usr/lib/hive/scripts/metastore/upgrade/postgres/hive-schema-0.12.0.postgres.sql
	SET
	SET
	..
```

注意：创建的用户为hiveuser，密码为redhat，你可以按自己需要进行修改。

这时候的hive-site.xml文件内容如下：

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
	  <value>lib/hive-hwi-0.12.0-cdh5.0.1.war</value>
	</property>
	<property>
	  <name>hive.merge.mapredfiles</name>
	  <value>true</value>
	</property>
	</configuration>
```

## 安装mysql

yum方式安装mysql：

```bash
$ yum install mysql mysql-devel mysql-server mysql-libs -y
```

启动数据库：

```bash
$ service mysqld start
```

配置开启启动：

```bash
$ chkconfig mysqld on
```

安装jdbc驱动：

```bash
$ yum install mysql-connector-java
$ ln -s /usr/share/java/mysql-connector-java.jar /usr/lib/hive/lib/mysql-connector-java.jar
```

我是在 cdh1 节点上创建 mysql 数据库和用户：

```bash
$ mysql -e "
	CREATE DATABASE metastore;
	USE metastore;
	SOURCE /usr/lib/hive/scripts/metastore/upgrade/mysql/hive-schema-0.12.0.mysql.sql;
	CREATE USER 'hiveuser'@'%' IDENTIFIED BY 'redhat';
	CREATE USER 'hiveuser'@'localhost' IDENTIFIED BY 'redhat';
	REVOKE ALL PRIVILEGES, GRANT OPTION FROM 'hiveuser'@'%';
	REVOKE ALL PRIVILEGES, GRANT OPTION FROM 'hiveuser'@'localhost';
	REVOKE ALL PRIVILEGES, GRANT OPTION FROM 'hiveuser'@'cdh1';
	GRANT SELECT,INSERT,UPDATE,DELETE,LOCK TABLES,EXECUTE ON metastore.* TO 'hiveuser'@'%';
	GRANT SELECT,INSERT,UPDATE,DELETE,LOCK TABLES,EXECUTE ON metastore.* TO 'hiveuser'@'localhost';
	GRANT SELECT,INSERT,UPDATE,DELETE,LOCK TABLES,EXECUTE ON metastore.* TO 'hiveuser'@'cdh1';
	FLUSH PRIVILEGES;
"
```

注意：创建的用户为hiveuser，密码为redhat，你可以按自己需要进行修改。

修改hive-site.xml文件中以下内容：

```xml
	<property>
	  <name>javax.jdo.option.ConnectionURL</name>
	  <value>jdbc:mysql://cdh1:3306/metastore?useUnicode=true&amp;characterEncoding=UTF-8</value>
	</property>
	<property>
	  <name>javax.jdo.option.ConnectionDriverName</name>
	  <value>com.mysql.jdbc.Driver</value>
	</property>
```

## 配置hive
修改`/etc/hadoop/conf/hadoop-env.sh`:

添加环境变量`HADOOP_MAPRED_HOME`，如果不添加，则当你使用yarn运行mapreduce时候会出现`UNKOWN RPC TYPE`的异常

```bash
export HADOOP_MAPRED_HOME=/usr/lib/hadoop-mapreduce
```


在hdfs中创建hive数据仓库目录:

- hive的数据仓库在hdfs中默认为`/user/hive/warehouse`,建议修改其访问权限为1777，以便其他所有用户都可以创建、访问表，但不能删除不属于他的表。
- 每一个查询hive的用户都必须有一个hdfs的home目录(`/user`目录下，如root用户的为`/user/root`)
- hive所在节点的 `/tmp`必须是world-writable权限的。

创建目录并设置权限：

```bash
$ sudo -u hdfs hadoop fs -mkdir /user/hive
$ sudo -u hdfs hadoop fs -chown hive /user/hive

$ sudo -u hdfs hadoop fs -mkdir /user/hive/warehouse
$ sudo -u hdfs hadoop fs -chmod 1777 /user/hive/warehouse
$ sudo -u hdfs hadoop fs -chown hive /user/hive/warehouse
```

启动hive-server和metastore:

```bash
$ service hive-metastore start
$ service hive-server start
$ service hive-server2 start
```

测试：

```bash
$ hive -e 'create table t(id int);'
$ hive -e 'select * from t limit 2;'
$ hive -e 'select id from t;'
```

访问beeline:

```bash
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

先安装hive-hbase:

```bash
$ yum install hive-hbase -y
```

如果你是使用的cdh4，则需要在hive shell里执行以下命令添加jar：

```bash
$ ADD JAR /usr/lib/hive/lib/zookeeper.jar;
$ ADD JAR /usr/lib/hive/lib/hbase.jar;
$ ADD JAR /usr/lib/hive/lib/hive-hbase-handler-<hive_version>.jar
$ ADD JAR /usr/lib/hive/lib/guava-11.0.2.jar;
```

如果你是使用的cdh5，则需要在hive shell里执行以下命令添加jar：

```
ADD JAR /usr/lib/hive/lib/zookeeper.jar;
ADD JAR /usr/lib/hive/lib/hive-hbase-handler.jar;
ADD JAR /usr/lib/hbase/lib/guava-12.0.1.jar;
ADD JAR /usr/lib/hbase/hbase-client.jar;
ADD JAR /usr/lib/hbase/hbase-common.jar;
ADD JAR /usr/lib/hbase/hbase-hadoop-compat.jar;
ADD JAR /usr/lib/hbase/hbase-hadoop2-compat.jar;
ADD JAR /usr/lib/hbase/hbase-protocol.jar;
ADD JAR /usr/lib/hbase/hbase-server.jar;
```

以上你也可以在hive-site.xml中通过 `hive.aux.jars.path` 参数来配置，或者你也可以在hive-env.sh 中通过 `export HIVE_AUX_JARS_PATH=` 来设置。


# 8. 参考文章

* [1] [CDH5-Installation-Guide](http://www.cloudera.com/content/cloudera-content/cloudera-docs/CDH5/latest/CDH5-Installation-Guide/CDH5-Installation-Guide.html)
* [2] [hadoop cdh 安装笔记](http://roserouge.iteye.com/blog/1558498)

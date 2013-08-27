---
layout: post
title:  从yum安装Cloudera CDH集群
category: hadoop
tags: [hadoop, impala, cloudera]
keywords: yum, cdh, hadoop, hbase, hive, zookeeper, cloudera
description: 从yum安装Cloudera CDH集群，包括hadoop、yarn、HBase
---

记录使用yum通过rpm方式安装Cloudera CDH中的hadoop、yarn、HBase，需要注意初始化namenode之前需要手动创建一些目录并设置权限。

## 0.环境准备
 1.设置hosts
临时设置hostname，以node1为例
	
	 sudo hostname node1

确保`/etc/hosts`中包含ip和FQDN，如果你在使用DNS，保存这些信息到`/etc/hosts`不是必要的，却是最佳实践。
确保`/etc/sysconfig/network`中包含hostname=node1
检查网络，运行下面命令检查是否配置了hostname以及其对应的ip是否正确。

	host -v -t A `hostname` 

hadoop的配置文件`core-site.xml`、`mapred-site.xml`和`yarn-site.xml`配置节点时，请使用hostname和不是ip

2.关闭防火墙

	setenforce 0
	vim /etc/sysconfig/selinux #修改SELINUX=disabled
	


3.清空iptables `iptables -F`

4.检查每个节点上的`/tmp`目录权限是否为`1777`，如果不是请修改。

5.设置时钟同步服务

在所有节点安装ntp
	
	yum install ntp

设置开机启动

	chkconfig ntpd on

在所有节点启动ntp

	/etc/init.d/ntpd start

是client使用local NTP server，修改/etc/ntp.conf，添加以下内容：

	server $LOCAL_SERVER_IP OR HOSTNAME



## 1. 安装jdk
检查jdk版本
	
	java -version

如果其版本低于v1.6 update 31，则将其卸载

	rpm -qa | grep java
	yum remove {java-1.*}

验证没人的jdk是否被卸载

	which java

安装jdk，使用yum安装或者手动下载安装jdk-6u31-linux-x64.bin，下载地址：[这里](http://www.oracle.com/technetwork/java/javasebusiness/downloads/java-archive-downloads-javase6-419409.html#jdk-6u31-oth-JPR)
	
	yum install jdk -y

创建符号连接

	ln -s XXXXX/jdk1.6.0_31 /usr/java/default
	ln -s /usr/java/default/bin/java /usr/bin/java

设置环境变量:

	echo "export JAVA_HOME=/usr/java/latest" >>/root/.bashrc
	echo "export PATH=\$JAVA_HOME/bin:\$PATH" >> /root/.bashrc
	source /root/.bashrc

验证版本

	java -version

你将看到以下输出：

	java version "1.6.0_31"
	Java(TM) SE Runtime Environment (build 1.6.0_31-b04)
	Java HotSpot(TM) 64-Bit Server VM (build 20.6-b01, mixed mode)

检查环境变量中是否有设置`JAVA_HOME`

	sudo env | grep JAVA_HOME

如果env中没有`JAVA_HOM`E变量，则修改`/etc/sudoers`文件
	
	vi /etc/sudoers
	Defaults env_keep+=JAVA_HOME

## 2. 设置yum源
从[这里](http://archive.cloudera.com/cdh4/repo-as-tarball/4.2.0/cdh4.2.0-centos6.tar.gz) 下载压缩包解压并设置本地或ftp yum源，可以参考[Creating a Local Yum Repository](http://www.cloudera.com/content/cloudera-content/cloudera-docs/CDH4/4.2.0/CDH4-Installation-Guide/cdh4ig_topic_30.html)

## 3. 安装HDFS
### 在NameNode节点yum安装

	yum list hadoop
	yum install hadoop-hdfs-namenode
	yum install hadoop-hdfs-secondarynamenode
	yum install hadoop-yarn-resourcemanager
	yum install hadoop-mapreduce-historyserver

### 在DataNode节点yum安装 

	yum list hadoop
	yum install hadoop-hdfs-datanode
	yum install hadoop-yarn-nodemanager
	yum install hadoop-mapreduce
	yum install zookeeper-server
	yum install hadoop-httpfs
	yum install hadoop-debuginfo


## 4. 配置hadoop
### 自定义hadoop配置文件

	sudo cp -r /etc/hadoop/conf.dist /etc/hadoop/conf.my_cluster
	sudo alternatives --verbose --install /etc/hadoop/conf hadoop-conf /etc/hadoop/conf.my_cluster 50 
	sudo alternatives --set hadoop-conf /etc/hadoop/conf.my_cluster

hadoop默认使用`/etc/hadoop/conf`路径读取配置文件，经过上述配置之后，`/etc/hadoop/conf`会软连接到`/etc/hadoop/conf.my_cluster`目录

### 修改配置文件
进入/etc/hadoop/conf编辑配置文件。

修改core-site.xml配置:

```
	<configuration>
	<property>
	  <name>fs.defaultFS</name>
	  <value>hdfs://node1</value>
	</property>
	<property>
	  <name>fs.trash.interval</name>
	  <value>10080</value>
	</property>
	<property>
	  <name>fs.trash.checkpoint.interval</name>
	  <value>10080</value>
	</property>
	<property>
	  <name>io.bytes.per.checksum</name>
	  <value>4096</value>
	</property>
	</configuration>
```

修改hdfs-site.xml:

```
	<configuration>
	<property>
	  <name>dfs.replication</name>
	  <value>3</value>
	</property>
	<property>
	  <name>hadoop.tmp.dir</name>
	  <value>/opt/data/hadoop</value>
	</property>
	<property>
	    <name>dfs.block.size</name>
	    <value>268435456</value>
	</property>
	<property>
	  <name>dfs.permissions.superusergroup</name>
	  <value>hadoop</value>
	</property>
	<property>
	  <name>dfs.namenode.handler.count</name>
	  <value>100</value>
	</property>
	<property>
	  <name>dfs.datanode.handler.count</name>
	  <value>100</value>
	</property>
	<property>
	  <name>dfs.datanode.balance.bandwidthPerSec</name>
	  <value>1048576</value>
	</property>
	<property>
		<name>dfs.namenode.http-address</name>
		<value>node1:50070</value>
	</property>
	<property>
		<name>dfs.namenode.secondary.http-address</name>
		<value>node1:50090</value>
	</property>
	<property>
		<name>dfs.webhdfs.enabled</name>
		<value>true</value>
	</property>
	</configuration>
```

修改master和slaves文件

注意：

The value of NameNode new generation size should be 1/8 of maximum heap size (-Xmx). Please check, as the default setting may not be accurate.
To change the default value, edit the /etc/hadoop/conf/hadoop-env.sh file and change the value of the -XX:MaxnewSize parameter to 1/8th the value of the maximum heap size (-Xmx) parameter.

### 配置NameNode HA
请参考[Introduction to HDFS High Availability](https://ccp.cloudera.com/display/CDH4DOC/Introduction+to+HDFS+High+Availability)

### 配置Secondary NameNode
在hdfs-site.xml中可以配置以下参数：

	dfs.namenode.checkpoint.check.period
	dfs.namenode.checkpoint.txns
	dfs.namenode.checkpoint.dir
	dfs.namenode.checkpoint.edits.dir
	dfs.namenode.num.checkpoints.retained

#### 多个secondarynamenode的配置
设置多个secondarynamenode，请参考[multi-host-secondarynamenode-configuration](http://blog.cloudera.com/blog/2009/02/multi-host-secondarynamenode-configuration/).

### 文件路径配置清单
在hadoop中默认的文件路径以及权限要求如下：

	目录							所有者		权限		默认路径
	hadoop.tmp.dir					hdfs:hdfs	drwx------	/var/hadoop
	dfs.namenode.name.dir				hdfs:hdfs	drwx------	file://${hadoop.tmp.dir}/dfs/name
	dfs.datanode.data.dir				hdfs:hdfs	drwx------	file://${hadoop.tmp.dir}/dfs/data
	dfs.namenode.checkpoint.dir			hdfs:hdfs	drwx------	file://${hadoop.tmp.dir}/dfs/namesecondary
	yarn.nodemanager.local-dirs			yarn:yarn	drwxr-xr-x	${hadoop.tmp.dir}/nm-local-dir
	yarn.nodemanager.log-dirs			yarn:yarn	drwxr-xr-x	${yarn.log.dir}/userlogs
	yarn.nodemanager.remote-app-log-dir						/tmp/logs

我的配置如下:

	hadoop.tmp.dir					/opt/data/hadoop
	dfs.namenode.name.dir				${hadoop.tmp.dir}/dfs/name
	dfs.datanode.data.dir				${hadoop.tmp.dir}/dfs/data
	dfs.namenode.checkpoint.dir			${hadoop.tmp.dir}/dfs/namesecondary
	yarn.nodemanager.local-dirs			/opt/data/yarn/local
	yarn.nodemanager.log-dirs			/var/log/hadoop-yarn/logs
	yarn.nodemanager.remote-app-log-dir 		/var/log/hadoop-yarn/app

在hadoop中`dfs.permissions.superusergroup`默认为hdfs，我的`hdfs-site.xml`配置文件将其修改为了hadoop。

### 配置CDH4组件端口
请参考[Configuring Ports for CDH4](http://www.cloudera.com/content/cloudera-content/cloudera-docs/CDH4/latest/CDH4-Installation-Guide/cdh4ig_topic_9.html)

### 创建数据目录
在namenode节点创建name目录

	mkdir -p /opt/data/hadoop/dfs/name
	chown -R hdfs:hadoop /opt/data/hadoop/dfs/name
	chmod 700 /opt/data/hadoop/dfs/name

在所有datanode节点创建data目录

	mkdir -p /opt/data/hadoop/dfs/data
	chown -R hdfs:hadoop /opt/data/hadoop/dfs/data
	chmod 700 /opt/data/hadoop/dfs/data

在secondarynode节点创建namesecondary目录

	mkdir -p /opt/data/hadoop/dfs/namesecondary
	chown -R hdfs:hadoop /opt/data/hadoop/dfs/namesecondary
	chmod 700 /opt/data/hadoop/dfs/namesecondary

在所有datanode节点创建yarn的local目录

	mkdir -p /opt/data/hadoop/yarn/local
	chown -R yarn:yarn /opt/data/hadoop/yarn/local
	chmod 700 /opt/data/hadoop/yarn/local

### 同步配置文件到整个集群

	sudo scp -r /etc/hadoop/conf root@nodeX:/etc/hadoop/conf

### 格式化NameNode

	sudo -u hdfs hdfs namenode -format

### 定期检查datanode状态

	#!/bin/bash
	if ! jps | grep -q DataNode ; then
	 echo ERROR: datanode not up
	fi

### 在每个节点启动hdfs

	for x in `cd /etc/init.d ; ls hadoop-hdfs-*` ; do sudo service $x restart ; done

### 验证测试
* 打开浏览器访问：http://node1:50070 


## 5. 安装YARN
先在一台机器上配置好，然后在做同步。

修改mapred-site.xml文件:

```
	<configuration>
	<property>
	    	<name>mapreduce.framework.name</name>
	    	<value>yarn</value>
	</property>
      <property>
          	<name>mapreduce.jobtracker.staging.root.dir</name>
          	<value>/user</value>
      </property>
	<property>
	 	<name>mapreduce.jobhistory.address</name>
	 	<value>node1:10020</value>
	</property>
	<property>
	 	<name>mapreduce.jobhistory.webapp.address</name>
	 	<value>node1:19888</value>
	</property>
 	<property>
    		<name>mapred.child.java.opts</name>
    		<value>-Xmx512m -XX:+UseConcMarkSweepGC -XX:ParallelCMSThreads=1 -XX:ParallelGCThreads=1</value>
  	</property>
	<property>
	  <name>mapreduce.task.io.sort.factor</name>
	  <value>100</value>
	</property>
	<property>
	  <name>mapreduce.task.io.sort.mb</name>
	  <value>200</value>
	</property>
	<property>
	  <name>mapreduce.reduce.shuffle.parallelcopies</name>
	  <value>16</value>
	   <!-- 一般介于节点数开方和节点数一半之间，小于20节点，则为节点数-->
	</property>
	<property>
	  <name>mapreduce.task.timeout</name>
	  <value>1800000</value>
	</property>
	<property>
	  <name>mapreduce.tasktracker.map.tasks.maximum</name>
	  <value>4</value>
	</property>
	<property>
	  <name>mapreduce.tasktracker.reduce.tasks.maximum</name>
	  <value>2</value>
	</property>
	</configuration>
```

修改yarn-site.xml文件:

```
	<configuration>
	<property>
	    <name>yarn.resourcemanager.resource-tracker.address</name>
	    <value>node1:8031</value>
	</property>
	<property>
	    <name>yarn.resourcemanager.address</name>
	    <value>node1:8032</value>
	</property>
	<property>
	    <name>yarn.resourcemanager.scheduler.address</name>
	    <value>node1:8030</value>
	</property>
	<property>
	    <name>yarn.resourcemanager.admin.address</name>
	    <value>node1:8033</value>
	</property>
	<property>
	    <name>yarn.resourcemanager.webapp.address</name>
	    <value>node1:8088</value>
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
	    <value>/opt/hadoop/yarn/local</value>
	</property>
	<property>
	    <name>yarn.nodemanager.log-dirs</name>
	    <value>/var/log/hadoop-yarn/logs</value>
	</property>
	<property>
	    <name>yarn.nodemanager.remote-app-log-dir</name>
	    <value>/var/log/hadoop-yarn/apps</value>
	</property>
	</configuration>
```

### HDFS创建临时目录

	sudo -u hdfs hadoop fs -mkdir /tmp
	sudo -u hdfs hadoop fs -chmod -R 1777 /tmp

### 创建日志目录

	sudo -u hdfs hadoop fs -mkdir /user/history
	sudo -u hdfs hadoop fs -chmod 1777 /user/history
	sudo -u hdfs hadoop fs -chown yarn /user/history
	sudo -u hdfs hadoop fs -mkdir /user/history/done
	sudo -u hdfs hadoop fs -chmod 777 /user/history/done
	sudo -u hdfs hadoop fs -chown yarn /user/history/done
	sudo -u hdfs hadoop fs -mkdir /var/log/hadoop-yarn
	sudo -u hdfs hadoop fs -chown yarn:mapred /var/log/hadoop-yarn

### 验证hdfs结构是否正确

	[root@node1 data]# sudo -u hdfs hadoop fs -ls -R /
	drwxrwxrwt   - hdfs   hadoop          0 2012-04-19 14:31 /tmp
	drwxr-xr-x   - hdfs   hadoop          0 2012-05-31 10:26 /user
	drwxrwxrwt   - yarn   hadoop          0 2012-04-19 14:31 /user/history
	drwxrwxrwx   - yarn   hadoop          0 2012-04-19 14:31 /user/history/done
	drwxr-xr-x   - hdfs   hadoop          0 2012-05-31 15:31 /var
	drwxr-xr-x   - hdfs   hadoop          0 2012-05-31 15:31 /var/log
	drwxr-xr-x   - yarn   mapred        	 0 2012-05-31 15:31 /var/log/hadoop-yarn


### 启动mapred-historyserver 

	/etc/init.d/hadoop-mapreduce-historyserver start

### 在每个节点启动YARN

	for x in `cd /etc/init.d ; ls hadoop-yarn-*` ; do sudo service $x start ; done

### 验证
* 打开浏览器：http://node1:8088/
* 运行测试程序

### 为每个MapReduce用户创建主目录

	sudo -u hdfs hadoop fs -mkdir /user/$USER
	sudo -u hdfs hadoop fs -chown $USER /user/$USER

### Set HADOOP_MAPRED_HOME

	export HADOOP_MAPRED_HOME=/usr/lib/hadoop-mapreduce

### 设置开机启动

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

## 6. 安装Zookeeper
安装zookeeper

	yum install zookeeper*

设置crontab
	
	crontab -e
	15 * * * * java -cp $classpath:/usr/lib/zookeeper/lib/log4j-1.2.15.jar:\
	/usr/lib/zookeeper/lib/jline-0.9.94.jar:\	
	/usr/lib/zookeeper/zookeeper.jar:/usr/lib/zookeeper/conf\
	org.apache.zookeeper.server.PurgeTxnLog /var/zookeeper/ -n 5

在每个需要安装zookeeper的节点上创建zookeeper的目录

	mkdir -p /opt/data/zookeeper
	chown -R zookeeper:zookeeper /opt/data/zookeeper

设置zookeeper配置：/etc/zookeeper/conf/zoo.cfg，并同步到其他机器

	tickTime=2000
	initLimit=10
	syncLimit=5
	dataDir=/opt/data/zookeeper
	clientPort=2181
	server.1=node1:2888:3888
	server.2=node2:2888:3888
	server.3=node3:2888:3888

在每个节点上初始化并启动zookeeper，注意修改n值
 
	service zookeeper-server init --myid=n
	service zookeeper-server restart
 
## 7. 安装HBase

	yum install hbase*

### 在hdfs中创建/hbase

	sudo -u hdfs hadoop fs -mkdir /hbase
	sudo -u hdfs hadoop fs -chown hbase:hbase /hbase
 
### 设置crontab：

	crontab -e
	* 10 * * * cd /var/log/hbase/; rm -rf\
	`ls /var/log/hbase/|grep -P 'hbase\-hbase\-.+\.log\.[0-9]'\`>> /dev/null &


### 修改配置文件并同步到其他机器：
修改hbase-site.xml文件：

	<configuration>
	<property>
	    <name>hbase.distributed</name>
	    <value>true</value>
	</property>
	<property>
	    <name>hbase.rootdir</name>
	    <value>hdfs://node1:8020/hbase</value>
	</property>
	<property>
	    <name>hbase.tmp.dir</name>
	    <value>/opt/data/hbase</value>
	</property>
	<property>
	    <name>hbase.zookeeper.quorum</name>
	    <value>node1,node2,node3</value>
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


### 修改regionserver文件


### 启动HBase

	service hbase-master start
	service hbase-regionserver start

## 8. 安装hive
### 在一个节点上安装hive

	sudo yum install hive*

### 安装postgresql
手动安装、配置postgresql数据库，请参考[手动安装Cloudera Hive CDH4.2](http://blog.javachen.com/hadoop/2013/03/24/manual-install-Cloudera-hive-CDH4.2/)

yum方式安装：

	sudo yum install postgresql-server

初始化数据库：

	 sudo service postgresql initdb

修改配置文件postgresql.conf，修改完后内容如下：

	sudo cat /var/lib/pgsql/data/postgresql.conf  | grep -e listen -e standard_conforming_strings
	listen_addresses = '*'
	standard_conforming_strings = off

修改 pg_hba.conf，添加以下一行内容：

	host    all         all         0.0.0.0         0.0.0.0               md5

启动数据库

	sudo service postgresql start

配置开启启动

	chkconfig postgresql on

安装jdbc驱动

	sudo yum install postgresql-jdbc
	ln -s /usr/share/java/postgresql-jdbc.jar /usr/lib/hive/lib/postgresql-jdbc.jar

创建数据库和用户

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



### 修改配置文件
修改hive-site.xml文件：

	<configuration>
	<property>
	    <name>fs.defaultFS</name>
	    <value>hdfs://node1:8020</value>
	</property>
	<property>
	  <name>javax.jdo.option.ConnectionURL</name>
	  <value>jdbc:postgresql://node1/metastore</value>
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
	 <value>node1:8031</value>
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
	    <value>thrift://node1:9083</value>
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
	  <value>node2,node3,node1</value>
	</property>
	<property>
	  <name>hive.hwi.listen.host</name>
	  <value>node1</value>
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


### 在hdfs中创建hive数据仓库目录

* hive的数据仓库在hdfs中默认为`/user/hive/warehouse`,建议修改其访问权限为1777，以便其他所有用户都可以创建、访问表，但不能删除不属于他的表。
* 每一个查询hive的用户都必须有一个hdfs的home目录(`/user`目录下，如root用户的为`/user/root`)
* hive所在节点的 `/tmp`必须是world-writable权限的。

创建目录并设置权限：

	sudo -u hdfs hadoop fs -mkdir /user/hive/warehouse
	sudo -u hdfs hadoop fs -chmod 1777 /user/hive/warehouse
	sudo -u hdfs hadoop fs -chown hive /user/hive/warehouse


### 启动hive-server和metastore

	service hive-metastore start
	service hive-server start
	service hive-server2 start

### 访问beeline

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

其 sql语法参考[SQLLine CLI](http://sqlline.sourceforge.net/)，在这里，你不能使用HiveServer的sql语句

### 与hbase集成
需要在hive里添加以下jar包：

	ADD JAR /usr/lib/hive/lib/zookeeper.jar;
	ADD JAR /usr/lib/hive/lib/hbase.jar;
	ADD JAR /usr/lib/hive/lib/hive-hbase-handler-0.10.0-cdh4.2.0.jar
	ADD JAR /usr/lib/hive/lib/guava-11.0.2.jar;


## 9. 其他
### 安装Snappy

在每个节点安装Snappy

	yum install snappy snappy-devel

使snappy对hadoop可用
	
	ln -sf /usr/lib64/libsnappy.so /usr/lib/hadoop/lib/native/

### 安装LZO
在每个节点安装：

	yum install lzo lzo-devel hadoop-lzo hadoop-lzo-native



## 10. 参考文章

* [Creating a Local Yum Repository](http://www.cloudera.com/content/cloudera-content/cloudera-docs/CDH4/4.2.0/CDH4-Installation-Guide/cdh4ig_topic_30.html)
* [Java Development Kit Installation](http://www.cloudera.com/content/cloudera-content/cloudera-docs/CDH4/4.2.0/CDH4-Installation-Guide/cdh4ig_topic_29.html)
* [Deploying HDFS on a Cluster](http://www.cloudera.com/content/cloudera-content/cloudera-docs/CDH4/4.2.0/CDH4-Installation-Guide/cdh4ig_topic_11_2.html)
* [HBase Installation](http://www.cloudera.com/content/cloudera-content/cloudera-docs/CDH4/4.2.0/CDH4-Installation-Guide/cdh4ig_topic_20.html)
* [ZooKeeper Installation](http://www.cloudera.com/content/cloudera-content/cloudera-docs/CDH4/4.2.0/CDH4-Installation-Guide/cdh4ig_topic_21.html)
* [hadoop cdh 安装笔记](http://roserouge.iteye.com/blog/1558498)

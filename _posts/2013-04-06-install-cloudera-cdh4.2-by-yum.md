---
layout: post
title:  从yum安装Cloudera CDH4.2
date:  2013-04-06 17:00
categories: Hadoop
tags: hadoop,impala,cloudera
---

记录使用yum通过rpm方式安装Cloudera CDH4.2中的hadoop、yarn、HBase，需要注意初始化namenode之前需要手动创建一些目录并设置权限。

## 目录
1. 安装jdk
2. 设置yum源
3. 安装HDFS
4. 配置hadoop
5. 安装YARN
6. 安装zookeeper
7. 安装HBase
8. 参考文章

## 1. 安装jdk
安装jdk并设置环境变量

	export JAVA_HOME=<jdk-install-dir>
	export PATH=$JAVA_HOME/bin:$PATH

检查环境变量中是否有设置JAVA_HOME

	sudo env | grep JAVA_HOME

如果env中没有JAVA_HOME变量，则修改/etc/sudoers文件
	
	vi /etc/sudoers
	Defaults env_keep+=JAVA_HOME

## 2. 设置yum源
从http://archive.cloudera.com/cdh4/repo-as-tarball/4.2.0/cdh4.2.0-centos6.tar.gz 下载压缩包解压并设置本地或ftp yum源，可以参考[Creating a Local Yum Repository](http://www.cloudera.com/content/cloudera-content/cloudera-docs/CDH4/4.2.0/CDH4-Installation-Guide/cdh4ig_topic_30.html)

## 3. 安装HDFS
### install NameNode

	yum list hadoop
	yum install hadoop-hdfs-namenode
	yum install hadoop-hdfs-secondarynamenode
	yum install hadoop-yarn-resourcemanager
	yum install hadoop-mapreduce-historyserver

### install DataNode

	yum list hadoop
	yum install hadoop-hdfs-datanode
	yum install hadoop-yarn-nodemanager
	yum install hadoop-mapreduce
	yum install zookeeper-server
	yum install hadoop-httpfs
	yum install hadoop-debuginfo


## 4. 配置hadoop
### Copying the Hadoop Configuration

	sudo cp -r /etc/hadoop/conf.dist /etc/hadoop/conf.cluster
	sudo alternatives --verbose --install /etc/hadoop/conf hadoop-conf /etc/hadoop/conf.cluster 50
	sudo alternatives --set hadoop-conf /etc/hadoop/conf.cluster

### Customizing Configuration Files
1. core-site.xml:

```
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
```

2. hdfs-site.xml:

```
	<property>
	  <name>dfs.replication</name>
	  <value>1</value>
	</property>
	<property>
	  <name>hadoop.tmp.dir</name>
	  <value>/opt/data/hadoop</value>
	</property>
	<property>
	    <name>dfs.block.size</name>
	    <value>134217728</value>
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
 ```

### NameNode HA
https://ccp.cloudera.com/display/CDH4DOC/Introduction+to+HDFS+High+Availability

### Secondary NameNode Parameters
在hdfs-site.xml中可以配置以下参数：

	dfs.namenode.checkpoint.check.period
	dfs.namenode.checkpoint.txns
	dfs.namenode.checkpoint.dir
	dfs.namenode.checkpoint.edits.dir
	dfs.namenode.num.checkpoints.retained

#### multi-host-secondarynamenode-configuration
http://blog.cloudera.com/blog/2009/02/multi-host-secondarynamenode-configuration/.

### Config list

	Directory							Owner		Permissions	Default Path
	hadoop.tmp.dir						hdfs:hdfs	drwx------	/var/hadoop
	dfs.namenode.name.dir				hdfs:hdfs	drwx------	file://${hadoop.tmp.dir}/dfs/name
	dfs.datanode.data.dir				hdfs:hdfs	drwx------	file://${hadoop.tmp.dir}/dfs/data
	dfs.namenode.checkpoint.dir			hdfs:hdfs	drwx------	file://${hadoop.tmp.dir}/dfs/namesecondary
	yarn.nodemanager.local-dirs			yarn:yarn	drwxr-xr-x	${hadoop.tmp.dir}/nm-local-dir
	yarn.nodemanager.log-dirs			yarn:yarn	drwxr-xr-x	${yarn.log.dir}/userlogs
	yarn.nodemanager.remote-app-log-dir							/tmp/logs

my set:

	hadoop.tmp.dir						/opt/data/hadoop
	dfs.namenode.name.dir				${hadoop.tmp.dir}/dfs/name
	dfs.datanode.data.dir				${hadoop.tmp.dir}/dfs/data
	dfs.namenode.checkpoint.dir			${hadoop.tmp.dir}/dfs/namesecondary
	yarn.nodemanager.local-dirs			/opt/data/yarn/local
	yarn.nodemanager.log-dirs			/var/log/hadoop-yarn/logs
	yarn.nodemanager.remote-app-log-dir /var/log/hadoop-yarn/app


### Create the data Directory in the Cluster
创建namenode的name目录

	mkdir -p /opt/data/hadoop/dfs/name
	chown -R hdfs:hdfs /opt/data/hadoop/dfs/name
	chmod 700 /opt/data/hadoop/dfs/name

创建datanode的data目录

	mkdir -p /opt/data/hadoop/dfs/data
	chown -R hdfs:hdfs /opt/data/hadoop/dfs/data
	chmod 700 /opt/data/hadoop/dfs/data

创建namesecondary目录

	mkdir -p /opt/data/hadoop/dfs/namesecondary
	chown -R hdfs:hdfs /opt/data/hadoop/dfs/namesecondary
	chmod 700 /opt/data/hadoop/dfs/namesecondary

创建yarn的local目录

	mkdir -p /opt/data/hadoop/yarn/local
	chown -R yarn:yarn /opt/data/hadoop/yarn/local
	chmod 700 /opt/data/hadoop/yarn/local

### Deploy your custom Configuration to your Entire Cluster

	sudo scp -r /etc/hadoop/conf.cluster root@nodeX:/etc/hadoop/conf.cluster

### To manually set the configuration on Red Hat-compatible systems

	sudo update-alternatives --install /etc/hadoop/conf hadoop-conf /etc/hadoop/conf.cluster 50
	sudo update-alternatives --set hadoop-conf /etc/hadoop/conf.cluster

### Format the NameNode

	sudo -u hdfs hdfs namenode -format

### Start HDFS on Every Node in the Cluster

	for x in `cd /etc/init.d ; ls hadoop-hdfs-*` ; do sudo service $x restart ; done


## 5. 安装YARN
1. mapred-site.xml:

```
	<property>
	    <name>mapreduce.framework.name</name>
	    <value>yarn</value>
	</property>
	<property>
	 	<name>mapreduce.jobhistory.address</name>
	 	<value>node1:10020</value>
	</property>
	<property>
	 	<name>mapreduce.jobhistory.webapp.address</name>
	 	<value>node1:19888</value>
	</property>
```

2. yarn-site.xml:

```
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
	<property>
	    <name>yarn.app.mapreduce.am.staging-dir</name>
	    <value>/user</value>
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
	    <description>Classpath for typical applications.</description>
	    <name>yarn.application.classpath</name>
	    <value>
		$HADOOP_CONF_DIR,
		$HADOOP_COMMON_HOME/*,$HADOOP_COMMON_HOME/lib/*,
		$HADOOP_HDFS_HOME/*,$HADOOP_HDFS_HOME/lib/*,
		$HADOOP_MAPRED_HOME/*,$HADOOP_MAPRED_HOME/lib/*,
		$YARN_HOME/*,$YARN_HOME/lib/*
	    </value>
	</property>
```

### Create the HDFS /tmp Directory

	sudo -u hdfs hadoop fs -mkdir /tmp
	sudo -u hdfs hadoop fs -chmod -R 1777 /tmp

### Create Staging and Log Directories

	sudo -u hdfs hadoop fs -mkdir /user/history
	sudo -u hdfs hadoop fs -chmod -R 1777 /user/history
	sudo -u hdfs hadoop fs -chown yarn /user/history
	sudo -u hdfs hadoop fs -mkdir /var/log/hadoop-yarn
	sudo -u hdfs hadoop fs -chown yarn:supergroup /var/log/hadoop-yarn

### Verify the HDFS File Structure

	[root@node1 data]# sudo -u hdfs hadoop fs -ls -R /
	drwxrwxrwt   - hdfs supergroup          0 2012-04-19 14:31 /tmp
	drwxr-xr-x   - hdfs supergroup          0 2012-05-31 10:26 /user
	drwxrwxrwt   - yarn supergroup          0 2012-04-19 14:31 /user/history
	drwxr-xr-x   - hdfs   supergroup        0 2012-05-31 15:31 /var
	drwxr-xr-x   - hdfs   supergroup        0 2012-05-31 15:31 /var/log
	drwxr-xr-x   - yarn   supergroup        0 2012-05-31 15:31 /var/log/hadoop-yarn


### Start mapred-historyserver on ResourceNode in the Cluster

	/etc/init.d/hadoop-mapreduce-historyserver start

### Start YARN on Every Node in the Cluster

	for x in `cd /etc/init.d ; ls hadoop-yarn-*` ; do sudo service $x start ; done

### Create a Home Directory for each MapReduce User

	sudo -u hdfs hadoop fs -mkdir /user/$USER
	sudo -u hdfs hadoop fs -chown $USER /user/$USER

### Set HADOOP_MAPRED_HOME

	export HADOOP_MAPRED_HOME=/usr/lib/hadoop-mapreduce

### Configure the Hadoop Daemons to Start at Boot Time
https://ccp.cloudera.com/display/CDH4DOC/Maintenance+Tasks+and+Notes#MaintenanceTasksandNotes-ConfiguringinittoStartCoreHadoopSystemServices

## 6. 安装Zookeeper
安装zookeeper

	yum install zookeeper*

设置crontab
	
	crontab -e
	15 * * * * java -cp $classpath:/usr/lib/zookeeper/lib/log4j-1.2.15.jar:\
	/usr/lib/zookeeper/lib/jline-0.9.94.jar:\	
	/usr/lib/zookeeper/zookeeper.jar:/usr/lib/zookeeper/conf\
	org.apache.zookeeper.server.PurgeTxnLog /var/zookeeper/ -n 5

创建zookeeper的目录

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

在hdfs中创建/hbase

	sudo -u hdfs hadoop fs -mkdir /hbase
	sudo -u hdfs hadoop fs -chown hbase:hbase /hbase
 
设置crontab：

	crontab -e
	* 10 * * * cd /var/log/hbase/; rm -rf\
	`ls /var/log/hbase/|grep -P 'hbase\-hbase\-.+\.log\.[0-9]'\`>> /dev/null &

创建HBase目录
	
	mkdir -p /opt/data/hbase
	chown -R hbase:hbase /opt/data/hbase

修改配置文件：
	
	vi /etc/hbase/conf/hbase-site.xml
	<configuration>
		<property>
		    <name>hbase.cluster.distributed</name>
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
	</configuration>

启动HBase

	service hbase-master start
	service hbase-regionserver start

## 8. 参考文章

* [Creating a Local Yum Repository](http://www.cloudera.com/content/cloudera-content/cloudera-docs/CDH4/4.2.0/CDH4-Installation-Guide/cdh4ig_topic_30.html)
* [Java Development Kit Installation](http://www.cloudera.com/content/cloudera-content/cloudera-docs/CDH4/4.2.0/CDH4-Installation-Guide/cdh4ig_topic_29.html)
* [Deploying HDFS on a Cluster](https://ccp.cloudera.com/display/CDH4DOC/Deploying+HDFS+on+a+Cluster)
* [HBase Installation](http://www.cloudera.com/content/cloudera-content/cloudera-docs/CDH4/4.2.0/CDH4-Installation-Guide/cdh4ig_topic_20.html)
* [ZooKeeper Installation](http://www.cloudera.com/content/cloudera-content/cloudera-docs/CDH4/4.2.0/CDH4-Installation-Guide/cdh4ig_topic_21.html)
* [hadoop cdh 安装笔记](http://roserouge.iteye.com/blog/1558498)

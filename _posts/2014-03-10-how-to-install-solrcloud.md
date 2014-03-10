---
layout: post
title: Apache SolrCloud安装
description: 本文基于Solr最新的4.4.0版本进行安装配置SolrCloud集群。SolrCloud通过ZooKeeper集群来进行协调，使一个索引进行分片，各个分片可以分布在不同的物理节点上，多个物理分片组成一个完成的索引Collection。SolrCloud自动支持Solr Replication，可以同时对分片进行复制，冗余存储。
category: solr
tags: [solr, solrcloud]
---

SolrCloud通过ZooKeeper集群来进行协调，使一个索引进行分片，各个分片可以分布在不同的物理节点上，多个物理分片组成一个完成的索引Collection。SolrCloud自动支持Solr Replication，可以同时对分片进行复制，冗余存储。下面，我们基于Solr最新的4.4.0版本进行安装配置SolrCloud集群。

# 1. 安装环境

我使用的安装程序各版本如下：

- Solr: [Apache Solr-4.4.0](http://archive.apache.org/dist/lucene/solr/4.4.0/)
- Tomcat: [Apache Tomcat 6.0.36](http://archive.apache.org/dist/tomcat/tomcat-6/v6.0.36/)
- ZooKeeper: [Apache ZooKeeper 3.4.5](http://www.apache.org/dyn/closer.cgi/zookeeper/)


说明：

所有的程序安装在/opt目录下，你可以依照你的实际情况下修改安装目录。

# 2. 规划SolrCloud

单一SolrCloud数据集合:product
ZooKeeper集群:3台
SolrCloud实例:3节点
复制因子：3
索引分片：2

手动将3个索引分片(Shard)的复本(Replica)分布在3个SolrCloud节点上

三个节点：

- 192.168.56.121
- 192.168.56.122
- 192.168.56.123

# 3. 安装ZooKeeper集群

由于需要用到ZooKeeper，故我们先安装好ZooKeeper集群

首先，再第一个节点上将zookeeper-3.4.5.tar.gz解压到/opt目录：

```
tar zxvf zookeeper-3.4.5.tar.gz
mv zookeeper-3.4.5 /opt/
```

创建zookeeper配置文件zookeeper-3.4.5/conf/zoo.cfg,内容如下：

```
tickTime=2000
initLimit=10
syncLimit=5
dataDir=/data/zookeeper/data
clientPort=2181
server.1=192.168.56.121:2888:3888
server.2=192.168.56.122:2888:3888
server.3=172.168.56.123:2888:3888
```

zookeeper的数据目录指定在`/data/zookeeper/data`，你也可以使用其他目录，通过下面命令进行创建该目录：

```
mkdir /data/zookeeper/data -p
```

然后，初始化myid，三个节点编号依次为`1,2,3`，在其余节点上分别执行命令（注意修改编号）。

```
echo "1" >/data/zookeeper/data/myid
```

然后，在第二个和第三个节点上依次重复上面的操作。

最后，启动ZooKeeper集群，在每个节点上分别启动ZooKeeper服务：

```
cd /opt
sh zookeeper-3.4.5/bin/zkServer.sh start
```

可以查看ZooKeeper集群的状态，保证集群启动没有问题：

```
[root@cdh1 opt]# sh zookeeper-3.4.5/bin/zkServer.sh status
JMX enabled by default
Using config: /opt/zookeeper-3.4.5/bin/../conf/zoo.cfg
Mode: follower
```

# 4. 安装Solr

你可以参考[《Apache Solr介绍及安装》](http://blog.javachen.com/solr/2014/02/26/how-to-install-solr/index.html)

简单来说，执行以下命令：

```
unzip apache-tomcat-6.0.36.zip  -d /opt
unzip solr-4.4.0.zip  -d /opt

cd /opt
chmod +x apache-tomcat-6.0.36/bin/*.sh

cp solr-4.4.0/example/webapps/solr.war apache-tomcat-6.0.36/webapps/
cp solr-4.4.0/example/lib/ext/* apache-tomcat-6.0.36/webapps/solr/WEB-INF/lib/
cp solr-4.4.0/example/resources/log4j.properties apache-tomcat-6.0.36/lib/
```

在其他节点上重复以上操作完成所有节点的solr的安装。


# 5. ZooKeeper管理配置文件

1、 创建一个solrcloud目录，并将solr的lib文件拷贝到这个目录：

```
mkdir -p /usr/local/solrcloud/solr-lib/
cp apache-tomcat-6.0.36/webapps/solr/WEB-INF/lib/* /usr/local/solrcloud/solr-lib/
```

2、 通过bootstrap设置solrhome：

```
java -classpath .:/usr/local/solrcloud/solr-lib/* org.apache.solr.cloud.ZkCLI -zkhost 192.168.56.121:2181,192.168.56.122:2181,192.168.56.123:2181 -cmd bootstrap -solrhome /usr/local/solrhome 
```

3、SolrCloud是通过ZooKeeper集群来保证配置文件的变更及时同步到各个节点上，所以，需要将配置文件上传到ZooKeeper集群中：

```
java -classpath .:/usr/local/solrcloud/solr-lib/* org.apache.solr.cloud.ZkCLI -zkhost 192.168.56.121:2181,192.168.56.122:2181,192.168.56.123:2181 -cmd upconfig -confdir /usr/local/solrhome/core0/conf -confname productconf
```

说明：

- zkhost指定ZooKeeper地址，逗号分割
- `/usr/local/solrhome/core0/conf`目录下存在schema.xml和solrconfig.xml两个配置文件，你可以修改为你自己的目录。
- productconf为在ZooKeeper上的配置文件名称。

4、把配置文件和目标collection联系起来：

```
java -classpath .:/usr/local/solrcloud/solr-lib/* org.apache.solr.cloud.ZkCLI -zkhost 192.168.56.121:2181,192.168.56.122:2181,192.168.56.123:2181 -cmd linkconfig -collection product -confname productconf
```

说明：

- 创建的collection叫做product，并指定和productconf连接

5、查看ZooKeeper上状态

在任意一个节点的/opt目录下执行如下命令：

```
[root@192.168.56.121 opt]# zookeeper-3.4.5/bin/zkCli.sh 

[zk: localhost:2181(CONNECTED) 0] ls /
[configs, zookeeper, clusterstate.json, aliases.json, live_nodes, overseer, collections, overseer_elect]

[zk: localhost:2181(CONNECTED) 1] ls /configs
[productconf]

[zk: localhost:2181(CONNECTED) 1] ls /collections
[product]

```


# 6. Tomcat配置与启动

1、修改每个节点上的tomcat配置文件，在环境变量中添加zkHost变量

编辑`apache-tomcat-6.0.36/bin/catalina.sh`,添加如下代码：

```
JAVA_OPTS='-DzkHost=192.168.56.122:2181,192.168.56.122:2181,192.168.56.123:2181'
```

注意：你也可以在这里指定`solr.home`，例如：

```
JAVA_OPTS='-Dsolr.solr.home=/usr/local/solrhome -DzkHost=192.168.56.122:2181,192.168.56.122:2181,192.168.56.123:2181'
```

或者，通过如下方式配置solr/home:

```
mkdir  /opt/apache-tomcat-6.0.36/conf/Catalina/localhost -p
vi /opt/apache-tomcat-6.0.36/conf/Catalina/localhost/solr.xml

<?xml version="1.0" encoding="utf-8"?>
<Context docBase="TOMCAT_HOME/webapps/solr.war" debug="0" crossContext="true">
   <Environment name="solr/home" type="java.lang.String" value="/usr/local/solrhome" override="true"/>
</Context>
```

在`/usr/local/solrhome/`目录创建solr.xml：

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<solr persistent="true" sharedLib="lib">
    <cores adminPath="/admin/cores" zkClientTimeout="20000" hostPort="${jetty.port:8080}" hostContext="${hostContext:solr}"></cores>
</solr>
```

说明：

- hostPort值应该和tomcat的端口保持一致
- solr默认使用jetty服务器，端口默认为8983

最后，在/opt目录下启动tomcat：

```
sh apache-tomcat-6.0.36/bin/startup.sh
```

通过http://192.168.56.121:8080/solr/进行访问，界面如图提示`There are no SolrCores running. `，这是因为配置文件尚未配置solrcore。

![There are no SolrCores running](/assets/images/2014/solr-no-solrcores.png)

# 7. 创建Collection、Shard和Replication

## 创建Collection及初始Shard

直接通过REST接口来创建Collection，你也可以通过浏览器访问下面地址，如下所示：

```
curl 'http://192.168.56.121:8080/solr/admin/collections?action=CREATE&name=product&numShards=3&replicationFactor=1'
```

如果成功，会输出如下响应内容：

```xml
<response>
<lst name="responseHeader">
	<int name="status">0</int>
	<int name="QTime">2649</int>
</lst>
<lst name="success">
	<lst>
		<lst name="responseHeader">
			<int name="status">0</int>
			<int name="QTime">2521</int>
		</lst>
		<str name="core">product_shard2_replica1</str>
		<str name="saved">/usr/local/solrhome/solr.xml</str>
	</lst>
	<lst>
		<lst name="responseHeader">
			<int name="status">0</int>
			<int name="QTime">2561</int>
		</lst>
		<str name="core">product_shard3_replica1</str>
		<str name="saved">/usr/local/solrhome/solr.xml</str>
	</lst>
	<lst>
		<lst name="responseHeader">
		<int name="status">0</int>
		<int name="QTime">2607</int>
		</lst>
		<str name="core">product_shard1_replica1</str>
		<str name="saved">/usr/local/solrhome/solr.xml</str>
	</lst>
</lst>
</response>
```

上面链接中的几个参数的含义，说明如下：

- name                待创建Collection的名称
- numShards           分片的数量
- replicationFactor   复制副本的数量

可以通过Web管理页面，访问`http://192.168.56.121:8888/solr/#/~cloud`，查看SolrCloud集群的分片信息，如图所示:

![solrcloud-collection-shard](/assets/images/2014/solrcloud-collection-shard.png)

实际上，我们从192.168.56.121节点可以看到，SOLR的配置文件内容，已经发生了变化，如下所示：

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<solr persistent="true" sharedLib="lib">
  <cores adminPath="/admin/cores" zkClientTimeout="20000" hostPort="${jetty.port:8080}" hostContext="${hostContext:solr}">
    <core shard="shard2" instanceDir="product_shard2_replica1/" name="product_shard2_replica1" collection="product"/>
  </cores>
</solr>
```

同时，你还可以看另外两个节点上的solr.xml文件的变化。

## 手动创建Replication

下面对已经创建的初始分片进行复制。 shard1已经在192.168.56.123上，我们复制分片到192.168.56.121和192.168.56.122上，执行如下命令：

```
curl 'http://192.168.56.121:8080/solr/admin/cores?action=CREATE&collection=product&name=product_shard1_replica_2&shard=shard1'

curl 'http://192.168.56.122:8080/solr/admin/cores?action=CREATE&collection=product&name=product_shard1_replica_3&shard=shard1'
```

最后的结果是，192.168.56.123上的shard1，在192.168.56.121节点上有1个副本，名称为`product_shard1_replica_2`，在192.168.56.122节点上有一个副本，名称为`product_shard1_replica_3`。也可以通过查看192.168.56.121和192.168.56.122上的目录变化，如下所示：

```
[root@cdh1 opt]# ll /usr/local/solrhome/
total 16
drwxr-xr-x 3 root root 4096 Mar 10 17:11 product_shard1_replica2
drwxr-xr-x 3 root root 4096 Mar 10 17:02 product_shard2_replica1
-rw-r--r-- 1 root root  444 Mar 10 17:16 solr.xml
```

你还可以对shard2和shard3添加副本。

我们再次从192.168.56.121节点可以看到，SOLR的配置文件内容，又发生了变化，如下所示：

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<solr persistent="true" sharedLib="lib">
  <cores adminPath="/admin/cores" zkClientTimeout="20000" hostPort="${jetty.port:8080}" hostContext="${hostContext:solr}">
    <core shard="shard2" instanceDir="product_shard2_replica1/" name="product_shard2_replica1" collection="product"/>
    <core shard="shard1" instanceDir="product_shard1_replica2/" name="product_shard1_replica_2" collection="product"/>
  </cores>
</solr>
```

到此为止，我们已经基于3个节点，配置完成了SolrCloud集群。

# 8. 总结

本文记录了如何zookeeper、SolrCloud的安装和配置过程，solrcore是通过restapi进行创建，是否可以直接在配置文件中设置尚未做验证。

# 9. 参考文章

- [1] [SolrCloud 4.3.1+Tomcat 7安装配置实践](http://shiyanjun.cn/archives/100.html)



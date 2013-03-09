---
layout: post
title: 使用DataStax Community Edition安装Cassandra单节点
categories:
- Cassandra
tags:
- cassandra
- DataStax
---

本文主要记录使用DataStax Community Edition安装Cassandra单节点的过程.配置单节点的Cassandra,是为了方便快速的了解学习Cassandra.

<h1>检查java环境</h1>
Cassandra由java编写,需要运行中jvm虚拟机之上.如果用于生产环境,则需要jre 1.6.0-19或更高版本.
<h3>1.检查是否安装java:</h3>
<pre>
# java -version
</pre>
如果你没有安装java,可以参考网上相关文章.这里主要记录在RHEL系统上安装jdk的方法.
<h3>2.安装jdk</h3>
下载<a href="http://www.oracle.com/technetwork/java/javase/downloads/index.html" target="_blank">Oracle JRE</a>
1）修改执行权限:
<pre>
$ cd /tmp
$ chmod a+x jre-6u25-linux-x64-rpm.bin
</pre>
<!--more-->
2）解压执行RPM文件,例如:
<pre>
$ sudo ./jre-6u25-linux-x64-rpm.bin
</pre>
这样JRE会安装在/usr/java/
3）配置Oracle JRE取代OpenJDK JRE
可以使用alternatives命令添加一个链接到Oracle JRE.
<pre>
$ sudo alternatives --install /usr/bin/java java /usr/java/jre1.6.0_25/bin/java 20000
</pre>
4）确认是否安装JRE
<pre>
$ java -version
  java version "1.6.0_25"
  Java(TM) SE Runtime Environment (build 1.6.0_25-b06)
  Java HotSpot(TM) 64-Bit Server VM (build 20.0-b11, mixed mode)
</pre>
如果OpenJDK JRE仍然被使用,可以使用alternatives命令切换到Oracle JRE.例如:
<pre>
$ sudo alternatives --config java
There are 2 programs which provide 'java'.

Selection      Command
-----------------------------------------------
   1           /usr/lib/jvm/jre-1.6.0-openjdk.x86_64/bin/java
*+ 2           /usr/java/jre1.6.0_25/bin/java
</pre>

<h1>在Linux系统上安装DataStax Community二进制文件</h1>
<h3>1.在用户目录创建一个目录,如datas</h3>
<pre>
$ cd $HOME
$ mkdir datas
$ cd datas
</pre>
<h3>2.下载cassandra(必须的)和OpsCenter包(可选的)</h3>
<pre>
$ wget http://downloads.datastax.com/community/dsc.tar.gz
$ wget http://downloads.datastax.com/community/opscenter.tar.gz
$ wget http://downloads.datastax.com/community/dsc-1.0.1-demo-bin.tar.gz
</pre>
<h3>3.解压</h3>
<pre>
$ tar -xzvf dsc.tar.gz
$ tar -xzvf opscenter.tar.gz
$ tar -xzvf dsc-1.0.1-demo-bin.tar.gz
$ rm *.tar.gz
</pre>
<h3>4.设置环境变量</h3>
1)编辑 .bashrc 
<pre>
 vi $HOME/.bashrc
</pre>
2)添加以下代码
<pre>
export CASSANDRA_HOME=$HOME/datas/dsc_package_name
export DSCDEMO_HOME=$HOME/datas/dsc-1.0.1/demos/portfolio_manager
export OPSC_HOME=$HOME/datas/opscenter_package_name
export PATH="$PATH:$CASSANDRA_HOME/bin:$DSCDEMO_HOME/bin:$OPSC_HOME/bin"
</pre>

注意替换<font color="red">dsc_package_name</font>和<font color="red">opscenter_package_name</font>
3)保存退出
4)使该文件生效
<pre>
source $HOME/.bashrc
</pre>
<h3>5.创建保存Cassandra数据的文件和日志目录</h3>
<pre>
$ mkdir $HOME/datas/cassandra-data
</pre>

<h1>配置并启动单节点</h1>
<h3>1.编辑配置环境</h3>
修改$CASSANDRA_HOME/conf/cassandra.yaml
<pre>
$ sed -i -e "s,initial_token:,initial_token: 0," \
  $CASSANDRA_HOME/conf/cassandra.yaml

$ sed -i -e "s,- /var/lib/cassandra/data,- $HOME/datastax/cassandra-data," \
  $CASSANDRA_HOME/conf/cassandra.yaml

$ sed -i -e "s,saved_caches_directory: /var/lib/cassandra/saved_caches, \
  saved_caches_directory: $HOME/datastax/cassandra-data/saved_caches," \
  $CASSANDRA_HOME/conf/cassandra.yaml

$ sed -i -e "s,commitlog_directory: /var/lib/cassandra/commitlog,commitlog_directory: \
  $HOME/datastax/cassandra-data/commitlog," $CASSANDRA_HOME/conf/cassandra.yaml
</pre>

<h3>2.设置日志文件位置</h3> 
修改：$CASSANDRA_HOME/conf/log4j-server.properties
<pre>
$ sed -i -e "s,log4j.appender.R.File=/var/log/cassandra/system.log, \
  log4j.appender.R.File=$HOME/datastax/cassandra-data/system.log," \
  $CASSANDRA_HOME/conf/log4j-server.properties
</pre>
<h3>3.配置DataStax示例程序指向Cassandra的安装位置</h3>
<pre>
$ sed -i -e "s,/usr/share/cassandra,$HOME/datastax/<dsc_package_name>," \
  $DSCDEMO_HOME/bin/pricer
</dsc_package_name>
</pre>

<h3>4.后台启动Cassandra</h3>
<pre>
$ cassandra
</pre>
<h3>5.检查cassandra环是否在运行</h3>
<pre>
$ nodetool ring -h localhost
</pre>
<h3>6.运行Portfolio Demo示例程序</h3>
1)进入Portfolio目录
<pre>
$ cd $DSCDEMO_HOME
</pre>
2)运行 ./bin/pricer工具生成数据
<pre>
./bin/pricer --help
</pre>
下面代码生成100天的历史数据
<pre>
./bin/pricer -o INSERT_PRICES
./bin/pricer -o UPDATE_PORTFOLIOS
./bin/pricer -o INSERT_HISTORICAL_PRICES -n 100
</pre>
3)启动服务(必须在$DSCDEMO_HOME/website目录下启动)
<pre>
$ cd $DSCDEMO_HOME/website
$ java -jar start.jar &
</pre>
4)浏览程序 http://localhost:8983/portfolio

<h1>参考文章</h1>
1.<a href="http://www.datastax.com/docs/1.0/getting_started/install_singlenode" target="_blank">Installing a Single-Node Instance of Cassandra</a>

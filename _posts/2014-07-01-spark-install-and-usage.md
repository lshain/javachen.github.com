---
layout: post

title:  Spark安装和使用

description: 本文主要记录Spark的安装过程（包括Standalone模式和基于yarn的部署模式）以及一些基本使用方法。

keywords:  

category: hadoop

tags: [spark]

published: true

---

为了方便，这里使用CDH的yum源方式来安装spark。

- 操作系统：centos6.4
- CDH版本：5.0.1

关于yum源的配置以及hadoop的安装，请参考[使用yum安装CDH Hadoop集群](/2013/04/06/install-cloudera-cdh-by-yum)。

# Spark安装

选择一个节点来安装spark，首先查看spark相关的包有哪些：

```bash
$ yum list |grep spark
spark-core.noarch                        0.9.0+cdh5.0.1+33-1.cdh5.0.1.p0.25.el6
spark-master.noarch                      0.9.0+cdh5.0.1+33-1.cdh5.0.1.p0.25.el6
spark-python.noarch                      0.9.0+cdh5.0.1+33-1.cdh5.0.1.p0.25.el6
spark-worker.noarch                      0.9.0+cdh5.0.1+33-1.cdh5.0.1.p0.25.el6
hue-spark.x86_64                         3.5.0+cdh5.0.1+371-1.cdh5.0.1.p0.30.el6
```

以上包作用如下：

- spark-core: spark核心功能
- spark-worker: spark-worker初始化脚本
- spark-master: spark-master初始化脚本
- spark-python: spark的Python客户端
- hue-spark: spark和hue集成包

## 安装

安装脚本如下：

```bash
$ sudo yum install spark-core spark-master spark-worker spark-python
```

## 配置
修改配置文件：

可以修改配置文件/etc/spark/conf/spark-env.sh，其内容如下，你可以根据需要做一些修改。

```
export STANDALONE_SPARK_MASTER_HOST=`hostname`

export SPARK_MASTER_IP=$STANDALONE_SPARK_MASTER_HOST

### Let's run everything with JVM runtime, instead of Scala
export SPARK_LAUNCH_WITH_SCALA=0
export SPARK_LIBRARY_PATH=${SPARK_HOME}/lib
export SCALA_LIBRARY_PATH=${SPARK_HOME}/lib
export SPARK_MASTER_WEBUI_PORT=18080
export SPARK_MASTER_PORT=7077
export SPARK_WORKER_PORT=7078
export SPARK_WORKER_WEBUI_PORT=18081
export SPARK_WORKER_DIR=/var/run/spark/work
export SPARK_LOG_DIR=/var/log/spark

if [ -n "$HADOOP_HOME" ]; then
  export SPARK_LIBRARY_PATH=$SPARK_LIBRARY_PATH:${HADOOP_HOME}/lib/native
fi

### Comment above 2 lines and uncomment the following if
### you want to run with scala version, that is included with the package
#export SCALA_HOME=${SCALA_HOME:-/usr/lib/spark/scala}
#export PATH=$PATH:$SCALA_HOME/bin
```

> 注意：这里使用的是CDH中的spark，其中一些参数的默认值和Apache的spark中的不一致。

## 启动和停止

spark目前支持三种集群管理模式：

- Standalone
- Apache Mesos 
- Hadoop YARN

这里只是部署了一个节点，即使用的Standalone模式。

启动脚本：

```bash
$ sudo service spark-master start
$ sudo service spark-worker start
```

停止脚本：

```bash
$ sudo service spark-worker stop
$ sudo service spark-master stop
```

当然，你还可以设置开机启动：

```bash
$ sudo chkconfig spark-worker on
$ sudo chkconfig spark-master on
```

运行日志保存在/var/log/spark，你可以通过<http://master:18080/>（我这里master为cdh1）访问spark master的web界面

当然，你也可以使用spark自带的脚本来启动和停止，这些脚本在/usr/lib/spark/sbin目录下：

```bash
$ ls /usr/lib/spark/sbin
slaves.sh        spark-daemons.sh  start-master.sh  stop-all.sh
spark-config.sh  spark-executor    start-slave.sh   stop-master.sh
spark-daemon.sh  start-all.sh      start-slaves.sh  stop-slaves.sh
```

例如，你也可以通过下面脚本启动master：

```bash
$ cd /usr/lib/spark/sbin
$ ./start-master.sh
```

类似地，通过下面命令启动worker：

./bin/spark-class org.apache.spark.deploy.worker.Worker spark://master:18080

## 测试

你可以通过spark-shell运行下面的wordcount例子，因为hdfs上的输入和输出文件都涉及到用户的访问权限，故这里使用hive用户来启动spark-shell：

```bash
$ sudo -u hive spark-shell
scala> val file = sc.textFile("hdfs://master:8020/user/hive/warehouse/test/test.txt")
scala> val counts = file.flatMap(line => line.split(" ")).map(word => (word, 1)).reduceByKey(_ + _)
scala> counts.saveAsTextFile("hdfs://master:8020/user/hive/warehouse/output")
```

运行完成之后，你可以查看hdfs://master:8020/user/hive/warehouse/output目录下的文件内容。

spark-shell后面还可以加上其他参数，例如指定IP和端口、运行核数：

```
spark-shell --master spark://IP:PORT  --cores <numCores> 
```

## Spark on Yarn

关于Spark on Yarn的运行方式，暂不做介绍，待以后补充。

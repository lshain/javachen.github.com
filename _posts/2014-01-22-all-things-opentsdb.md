---
layout: post
title: All Things OpenTSDB
category: post
tags: [OpenTSDB , hbase]
---

# OpenTSDB介绍
[OpenTSDB](http://opentsdb.net/index.html)用hbase存储所有的时序（无须采样）来构建一个分布式、可伸缩的时间序列数据库。它支持秒级数据采集所有metrics，支持永久存储，可以做容量规划，并很容易的接入到现有的报警系统里。OpenTSDB可以从大规模的集群（包括集群中的网络设备、操作系统、应用程序）中获取相应的metrics并进行存储、索引以及服务，从而使得这些数据更容易让人理解，如web化、图形化等。

对于运维工程师而言，OpenTSDB可以获取基础设施和服务的实时状态信息，展示集群的各种软硬件错误，性能变化以及性能瓶颈。对于管理者而言，OpenTSDB可以衡量系统的SLA，理解复杂系统间的相互作用，展示资源消耗情况。集群的整体作业情况，可以用以辅助预算和集群资源协调。对于开发者而言，OpenTSDB可以展示集群的主要性能瓶颈，经常出现的错误，从而可以着力重点解决重要问题。

OpenTSDB使用LGPLv2.1+开源协议。

# 安装OpenTSDB
## 依赖
OpenTSDB依赖jdk和[Gnuplot](http://www.gnuplot.info/)，Gnuplot需要提前安装，版本要求为最小4.2,最大4.4,执行以下命令安装即可：

```
yum install gnuplot autoconf
apt-get install gnuplot
```

OpenTSDB是用java编写的，但是项目构建不是用的java的方式而是使用的C、C++程序员构建项目的方式。运行时依赖：

- JDK 1.6
- [asynchbase](http://github.com/OpenTSDB/asynchbase) 1.3.0 (BSD)
- [Guava](http://code.google.com/p/guava-libraries/) 12.0 (ASLv2)
- [logback](http://logback.qos.ch/) 1.0 (LGPLv2.1 / EPL)
- [Netty](http://jboss.org/netty) 3.4 (ASLv2)
- [SLF4J](http://slf4j.org/) 1.6 (MIT) with Log4J and JCL adapters
- [suasync](http://github.com/OpenTSDB/async) 1.2 (BSD)
- [ZooKeeper](http://hadoop.apache.org/zookeeper/) 3.3 (ASLv2)

可选的编译时依赖：

- [GWT](http://gwt.google.com/) 2.4 (ASLv2)

可选的单元测试依赖：

- [Javassist](http://www.javassist.org/) 3.15 (MPL / LGPL)
- [JUnit](http://www.junit.org/) 4.10 (CPL)
- [Mockito](http://mockito.org/) 1.9 (MIT)
- [PowerMock](http://code.google.com/p/powermock/) 1.4 (ASLv2)

## 下载并编译源代码

```
git clone git://github.com/OpenTSDB/opentsdb.git
cd opentsdb
./build.sh
```

## 安装

1. 首先安装一个单节点或者多节点集群的hbase环境，hbase版本要求为0.94
2. 设置环境变量并创建opentsdb使用的表，需要设置的环境变量为`COMPRESSION`和`HBASE_HOME`，前者设置是否启用压缩，或者设置hbase home目录。如果使用压缩，则还需要安装lzo
3. 执行建表语句`src/create_table.sh`
4. 启动TSD

```
tsdtmp=${TMPDIR-'/tmp'}/tsd    # For best performance, make sure
mkdir -p "$tsdtmp"             # your temporary directory uses tmpfs
./build/tsdb tsd --port=4242 --staticroot=build/staticroot --cachedir="$tsdtmp" --auto-metric
```

如果你使用的是hbase集群，则你还需要设置`--zkquorum`，`--cachedir`对应的目录会产生一些临时文件，你可以设置cron定时任务进行删除。添加`--auto-metric`，则当新的数据被搜集时自动创建指标。
5. 启动成功之后，你可以通过[127.0.0.1:4242](http://127.0.0.1:4242)进行访问。

从源代码安装gnuplot、autoconf、opentsdb以及tcollector，可以参考：[OpenTSDB & tcollector 安装部署（Installation and Deployment）](http://www.adintellig.com/blog/14)

# 使用OpenTSDB
## 命令说明

tsdb支持以下参数：

```
[root@cdh1 build]# ./tsdb 
usage: tsdb <command> [args]
Valid commands: fsck, import, mkmetric, query, tsd, scan, uid
```


## 创建指标

通过以下命令创建指标：

```
./tsdb mkmetric mysql.bytes_received mysql.bytes_sent
```

执行上述命令的结果如下：

```
metrics mysql.bytes_received: [0, 0, -93]
metrics mysql.bytes_sent: [0, 0, -92]
```

OpenTSDB目前支持的最大指标数为：2的24次方 = 16777216，每个指标都会对应一个3 bytes的 UID。

## Schema

OpenTSDB的tsdb启动之后，会监控指定的socket端口（默认为4242），接收到监控数据，包括指标、时间戳、数据、tag标签，tag标签包括tag名称ID和tag值ID。例如：

```
myservice.latency.avg 1292148123 42 reqtype=foo host=web42
```

对于指标myservice.latency.avg的ID为：[0, 0, -69],reqtype标签名称的ID为：[0, 0, 1], foo标签值的ID为：[0, 1, 11], 标签名称的ID为：[0, 0, 2] web42标签值的ID为：[0, -7, 42]，他们组成rowkey：

```
[0, 0, -69, 77, 4, -99, 32, 0, 0, 1, 0, 1, 11, 0, 0, 2, 0, -7, 42]
 `-------'  `------------'  `-----'  `------'  `-----'  `-------'
 metric ID  base timestamp  name ID  value ID  name ID  value ID
                            `---------------'  `---------------'
                                first tag         second tag
```

row表示格式为： 每个数字对应1 byte

- [0, 0, -69] metric ID
- [77, 4, -99, 32] base timestamp = 1292148000. timestamps in the row key are rounded down to a 60 minute boundary。也就是说对于同一个小时的metric + tags相同的数据都会存放在一个row下面
- [0, 0, 1] "reqtype" index
- [0, 1, 11] "foo" index
- [0, 0, 2] "host" index
- [0, -7, 42] "web42" index

NOTE（dirlt）：可以看到，对于metric + tags相同的数据都会连续存放，且metic相同的数据也会连续存放，这样对于scan以及做aggregation都非常有帮助

column qualifier占用2 bytes，表示格式为：

- 12 bits delta in seconds.(相对row表示的小时的delta, 最多2^ 12 = 4096 > 3600因此没有问题）
- 4 bits
- 1 bit (long or double)
- 3 bits (reserved)

value使用8bytes存储，既可以存储long,也可以存储double。

## 查询

## HTTP API

# 谁在用OpenTSDB

- [StumbleUpon](http://www.stumbleupon.com/) StumbleUpon is the easiest way to find cool new websites, videos, photos and images from across the Web
- [box](https://www.box.com/) Box simplifies online file storage, replaces FTP and connects teams in online workspaces.
- [tumblr](http://www.tumblr.com/) 一个轻量级博客，用户可以跟进其他的会员并在自己的页面上看到跟进会员发表的文章，还可以转发他人在Tumblr上的文章

# 参考资料

- http://luoshi0801.iteye.com/blog/1938835
- http://blog.csdn.net/bingjie1217/article/category/1751285
- [OpenTSDB的设计之道](http://www.binospace.com/index.php/opentsdb-design-road/)
- [opentsdb](http://dirlt.com/opentsdb.html)

---
layout: post

title: Impala配置Kerberos认证

category: hadoop

tags: [hadoop,kerberos,cdh,impala]

description: 记录 CDH Hadoop 集群上配置 Impala 集成 Kerberos 的过程，包括 Kerberos 的安装和 Impala 相关配置修改说明。

---

关于 Kerberos 的安装和 HDFS 配置 kerberos 认证，请参考 [HDFS配置kerberos认证](/2014/11/04/config-kerberos-in-cdh-hdfs/)。

关于 Kerberos 的安装和 YARN 配置 kerberos 认证，请参考 [YARN配置kerberos认证](/2014/11/04/config-kerberos-in-cdh-yarn/)。

关于 Kerberos 的安装和 Hive 配置 kerberos 认证，请参考 [Hive配置kerberos认证](/2014/11/04/config-kerberos-in-cdh-hive/)。


> 请先完成 HDFS 、YARN、Hive 配置 Kerberos 认证，再来配置 Impala 集成 Kerberos 认证 ！

参考 [使用yum安装CDH Hadoop集群](http://blog.javachen.com/2013/04/06/install-cloudera-cdh-by-yum/) 安装 hadoop 集群，集群包括三个节点，每个节点的ip、主机名和部署的组件分配如下：

```
192.168.56.121        cdh1     NameNode、Hive、ResourceManager、HBase、impala-state-store、impala-catalog
192.168.56.122        cdh2     DataNode、SSNameNode、NodeManager、HBase、impala-server
192.168.56.123        cdh3     DataNode、HBase、NodeManager、impala-server
```

# 1. 生成 keytab

在 cdh1 节点的 `/etc/hive/conf` 目录，即 KDC server 节点上运行 `kadmin.local` ，然后执行下面命令：

```
addprinc -randkey hive/cdh1@JAVACHEN.COM
addprinc -randkey hive/cdh2@JAVACHEN.COM
addprinc -randkey hive/cdh3@JAVACHEN.COM

xst  -k hive-unmerged.keytab  hive/cdh1@JAVACHEN.COM
xst  -k hive-unmerged.keytab  hive/cdh1@JAVACHEN.COM
xst  -k hive-unmerged.keytab  hive/cdh1@JAVACHEN.COM
```

然后，使用 `ktutil` 合并前面创建的 keytab ：

```bash
$ cd /etc/hive/conf

$ ktutil
ktutil: rkt hive-unmerged.keytab
ktutil: rkt HTTP.keytab
ktutil: wkt hive.keytab
```

这样会在 `/etc/hive/conf` 目录下生成 hive.keytab。

拷贝 hive.keytab 文件到其他节点的 `/etc/hive/conf` 目录

```bash
$ scp hive.keytab cdh2:/etc/hive/conf
$ scp hive.keytab cdh3:/etc/hive/conf
```

并设置权限，分别在 cdh1、cdh2、cdh3 上执行：

```bash
$ chown hive:hadoop /etc/hive/conf/hive.keytab
$ chmod 600 /etc/hive/conf/hive.keytab
```

# 2. 修改 hive 配置文件

修改 hive-site.xml，添加下面配置：

```xml
<property>
  <name>hive.server2.authentication</name>
  <value>KERBEROS</value>
</property>
<property>
  <name>hive.server2.authentication.kerberos.principal</name>
  <value>hive/_HOST@JAVACHEN.COM</value>
</property>
<property>
  <name>hive.server2.authentication.kerberos.keytab</name>
  <value>/etc/hive/conf/hive.keytab</value>
</property>

<property>
  <name>hive.metastore.sasl.enabled</name>
  <value>true</value>
</property>
<property>
  <name>hive.metastore.kerberos.keytab.file</name>
  <value>/etc/hive/conf/hive.keytab</value>
</property>
<property>
  <name>hive.metastore.kerberos.principal</name>
  <value>hive/_HOST@JAVACHEN.COM</value>
</property>
```

开启 HiveServer2 impersonation，在 hive-site.xml 中添加：

```xml
<property>
  <name>hive.server2.enable.impersonation</name>
  <value>true</value>
</property>
```

在 core-site.xml 中添加：

```xml
<property>
  <name>hadoop.proxyuser.hive.hosts</name>
  <value>*</value>
</property>
<property>
  <name>hadoop.proxyuser.hive.groups</name>
  <value>*</value>
</property>
<property>
  <name>hadoop.proxyuser.hdfs.hosts</name>
  <value>*</value>
</property>
<property>
  <name>hadoop.proxyuser.hdfs.groups</name>
  <value>*</value>
</property>
<property>
  <name>hadoop.proxyuser.HTTP.hosts</name>
  <value>*</value>
</property>
<property>
  <name>hadoop.proxyuser.HTTP.groups</name>
  <value>*</value>
</property>
```

记住将修改的上面文件同步到其他节点：cdh2、cdh3，并再次一一检查权限是否正确。

# 3. 启动服务

## 启动 Hive MetaStore

hive-metastore 是通过 hive 用户启动的，故在 cdh1 上先获取 hive 用户的 ticket 再启动服务：

```bash
$ kinit -k -t /etc/hive/conf/hive.keytab hive/cdh1@JAVACHEN.COM
$ service hive-metastore start
```

然后查看日志，确认是否启动成功。

## 启动 Hive Server2

hive-server2 是通过 hive 用户启动的，故在 cdh2 和 cdh3 上先获取 hive 用户的 ticket 再启动服务：

```bash
$ kinit -k -t /etc/hive/conf/hive.keytab hive/cdh1@JAVACHEN.COM
$ service hive-server2 start
```

然后查看日志，确认是否启动成功。

# 4. 测试

## Hive CLI 

在没有配置 kerberos 之前，想要通过 hive 用户运行 hive 命令需要执行下面的命令：

```bash
sudo -u hive hive
```

现在配置了 kerberos 之后，不再需要 `sudo` 了，hive 会通过 ticket 中的用户去执行该命令：

```bash
$ klist
Ticket cache: FILE:/tmp/krb5cc_0
Default principal: hdfs/dn5.h.lashou-inc.com@lashou_hadoop

Valid starting     Expires            Service principal
11/06/14 11:39:09  11/07/14 11:39:09  krbtgt/lashou_hadoop@lashou_hadoop
  renew until 11/08/14 11:39:09


Kerberos 4 ticket cache: /tmp/tkt0
klist: You have no tickets cached

$ hive
hive> set system:user.name;
system:user.name=root
hive> show tables;
OK
t
Time taken: 1.349 seconds
hive> select * from t;
OK
Time taken: 1.116 seconds
```

可以看到在获取了 hdfs 用户的 ticket 之后，进入 hive cli 可以执行查看表、查询数据等命令。当然，你也可以获取 hive 的 ticket 之后再来运行 hive 命令。

## JDBC 客户端

客户端通过 jdbc 代码连结 hive-server2：

```java
String url = "jdbc:hive2://cdh1:10000/default;principal=hive/cdh1@JAVACHEN.COM"
Connection con = DriverManager.getConnection(url);
```

## Beeline

Beeline 连结 hive-server2：

```bash
$ beeline
beeline> !connect jdbc:hive2://cdh1:10000/default;principal=hive/cdh1@JAVACHEN.COM
scan complete in 4ms
Connecting to jdbc:hive2://localhost:10000/default;principal=hive/cdh1@JAVACHEN.COM;
Enter username for jdbc:hive2://localhost:10000/default;principal=hive/cdh1@JAVACHEN.COM;:
Enter password for jdbc:hive2://localhost:10000/default;principal=hive/cdh1@JAVACHEN.COM;:
Connected to: Apache Hive (version 0.13.1)
Driver: Hive (version 0.13.1-cdh5.2.0)
Transaction isolation: TRANSACTION_REPEATABLE_READ
```


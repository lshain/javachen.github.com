---
layout: post

title: Hive配置Kerberos认证

category: hadoop

tags: [hadoop,kerberos,cdh,hive]

description: 记录 CDH Hadoop 集群上配置 Hive 集成 Kerberos 的过程，包括 Kerberos 的安装和 Hive 相关配置修改说明。

---

关于 Kerberos 的安装和 HDFS 配置 kerberos 认证，请参考 [HDFS配置kerberos认证](/2014/11/04/config-kerberos-in-cdh-hdfs/)。

关于 Kerberos 的安装和 YARN 配置 kerberos 认证，请参考 [YARN配置kerberos认证](/2014/11/04/config-kerberos-in-cdh-yarn/)。


> 请先完成 HDFS 和 YARN 配置 Kerberos 认证，再来配置 Hive 集成 Kerberos 认证 ！

参考 [使用yum安装CDH Hadoop集群](http://blog.javachen.com/2013/04/06/install-cloudera-cdh-by-yum/) 安装 hadoop 集群，集群包括三个节点，每个节点的ip、主机名和部署的组件分配如下：

```
192.168.56.121        cdh1     NameNode、Hive、ResourceManager、HBase
192.168.56.122        cdh2     DataNode、SSNameNode、NodeManager、HBase
192.168.56.123        cdh3     DataNode、HBase、NodeManager
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

## jdbc 客户端

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
0: jdbc:hive2://cdh1:10000/default>
```


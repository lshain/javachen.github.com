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
192.168.56.121        cdh1     NameNode、Hive、ResourceManager、HBase、impala-state-store、impala-catalog、Kerberos Server
192.168.56.122        cdh2     DataNode、SSNameNode、NodeManager、HBase、impala-server
192.168.56.123        cdh3     DataNode、HBase、NodeManager、impala-server
```

# 1. 安装必须的依赖

在每个节点上运行下面的命令：

```bash
$ yum install python-devel openssl-devel python-pip cyrus-sasl cyrus-sasl-gssapi cyrus-sasl-devel -y
$ pip-python install ssl
```

# 2. 生成 keytab

在 cdh1 节点的 `/etc/impala/conf` 目录，即 KDC server 节点上运行 `kadmin.local` ，然后执行下面命令：

```bash
$ cd /var/kerberos/krb5kdc/

kadmin.local -q "addprinc -randkey impala/cdh1@JAVACHEN.COM "
kadmin.local -q "addprinc -randkey impala/cdh2@JAVACHEN.COM "
kadmin.local -q "addprinc -randkey impala/cdh3@JAVACHEN.COM "

kadmin.local -q "xst  -k impala-unmerged.keytab  impala/cdh1@JAVACHEN.COM "
kadmin.local -q "xst  -k impala-unmerged.keytab  impala/cdh2@JAVACHEN.COM "
kadmin.local -q "xst  -k impala-unmerged.keytab  impala/cdh3@JAVACHEN.COM "
```

然后，使用 ktutil 合并前面创建的 keytab 生成 impala.keytab

```bash
$ cd /var/kerberos/krb5kdc/

$ ktutil
ktutil: rkt impala-unmerged.keytab
ktutil: rkt HTTP-unmerged.keytab
ktutil: wkt impala.keytab
```

拷贝 impala.keytab 文件到其他节点的 /etc/impala/conf 目录

```bash
$ scp impala.keytab cdh1:/etc/impala/conf
$ scp impala.keytab cdh2:/etc/impala/conf
$ scp impala.keytab cdh3:/etc/impala/conf
```

并设置权限，分别在 cdh1、cdh2、cdh3 上执行：

```bash
$ ssh cdh1 "cd /etc/impala/conf/;chown impala:hadoop impala.keytab ;chmod 400 *.keytab"
$ ssh cdh2 "cd /etc/impala/conf/;chown impala:hadoop impala.keytab ;chmod 400 *.keytab"
$ ssh cdh3 "cd /etc/impala/conf/;chown impala:hadoop impala.keytab ;chmod 400 *.keytab"
```

由于 keytab 相当于有了永久凭证，不需要提供密码(如果修改 kdc 中的 principal 的密码，则该 keytab 就会失效)，所以其他用户如果对该文件有读权限，就可以冒充 keytab 中指定的用户身份访问 hadoop，所以 keytab 文件需要确保只对 owner 有读权限(0400)

# 3. 修改 impala 配置文件

修改 cdh1 节点上的 /etc/default/impala，在 `IMPALA_CATALOG_ARGS` 、`IMPALA_SERVER_ARGS` 和 `IMPALA_STATE_STORE_ARGS` 中添加下面参数：

```
-kerberos_reinit_interval=60
-principal=impala/_HOST@JAVACHEN.COM
-keytab_file=/etc/impala/conf/impala.keytab
```

在 `IMPALA_CATALOG_ARGS` 中添加：

```
-state_store_host=${IMPALA_STATE_STORE_HOST} \
```

将修改的上面文件同步到其他节点。最后，/etc/default/impala 文件如下：

```bash
IMPALA_CATALOG_SERVICE_HOST=cdh1
IMPALA_STATE_STORE_HOST=cdh1
IMPALA_STATE_STORE_PORT=24000
IMPALA_BACKEND_PORT=22000
IMPALA_LOG_DIR=/var/log/impala

IMPALA_MEM_DEF=$(free -m |awk 'NR==2{print $2-5120}')

IMPALA_CATALOG_ARGS=" -log_dir=${IMPALA_LOG_DIR} -state_store_host=${IMPALA_STATE_STORE_HOST} \
    -kerberos_reinit_interval=60\
    -principal=impala/_HOST@JAVACHEN.COM \
    -keytab_file=/etc/impala/conf/impala.keytab
"

IMPALA_STATE_STORE_ARGS=" -log_dir=${IMPALA_LOG_DIR} -state_store_port=${IMPALA_STATE_STORE_PORT}\
    -statestore_subscriber_timeout_seconds=15 \
    -kerberos_reinit_interval=60 \
    -principal=impala/_HOST@JAVACHEN.COM \
    -keytab_file=/etc/impala/conf/impala.keytab
"
IMPALA_SERVER_ARGS=" \
    -log_dir=${IMPALA_LOG_DIR} \
    -catalog_service_host=${IMPALA_CATALOG_SERVICE_HOST} \
    -state_store_port=${IMPALA_STATE_STORE_PORT} \
    -use_statestore \
    -state_store_host=${IMPALA_STATE_STORE_HOST} \
    -be_port=${IMPALA_BACKEND_PORT} \
    -kerberos_reinit_interval=60 \
    -principal=impala/_HOST@JAVACHEN.COM \
    -keytab_file=/etc/impala/conf/impala.keytab \
    -mem_limit=${IMPALA_MEM_DEF}m
"

ENABLE_CORE_DUMPS=false
```

将修改的上面文件同步到其他节点：cdh2、cdh3：

```bash
$ scp /etc/default/impala cdh2:/etc/default/impala
$ scp /etc/default/impala cdh3:/etc/default/impala
```

更新 impala 配置文件下的文件并同步到其他节点：

```bash
cp /etc/hadoop/conf/core-site.xml /etc/impala/conf/
cp /etc/hadoop/conf/hdfs-site.xml /etc/impala/conf/
cp /etc/hive/conf/hive-site.xml /etc/impala/conf/

scp -r /etc/impala/conf cdh2:/etc/impala
scp -r /etc/impala/conf cdh3:/etc/impala
```

# 4. 启动服务

## 启动 impala-state-store

impala-state-store 是通过 impala 用户启动的，故在 cdh1 上先获取 impala 用户的 ticket 再启动服务：

```bash
$ kinit -k -t /etc/impala/conf/impala.keytab impala/cdh1@JAVACHEN.COM
$ service impala-state-store start
```

然后查看日志，确认是否启动成功。

```bash
$ tailf /var/log/impala/statestored.INFO
```

## 启动 impala-catalog

impala-catalog 是通过 impala 用户启动的，故在 cdh1 上先获取 impala 用户的 ticket 再启动服务：

```bash
$ kinit -k -t /etc/impala/conf/impala.keytab impala/cdh1@JAVACHEN.COM
$ service impala-catalog start
```

然后查看日志，确认是否启动成功。

```bash
$ tailf /var/log/impala/catalogd.INFO
```

## 启动 impala-server

impala-server 是通过 impala 用户启动的，故在 cdh1 上先获取 impala 用户的 ticket 再启动服务：

```bash
$ kinit -k -t /etc/impala/conf/impala.keytab impala/cdh1@JAVACHEN.COM
$ service impala-server start
```

然后查看日志，确认是否启动成功。

```bash
$ tailf /var/log/impala/impalad.INFO
```

# 5. 测试

## 测试 impala-shell

在启用了 kerberos 之后，运行 impala-shell 时，需要添加 `-k` 参数：

```bash
$ impala-shell -k
Starting Impala Shell using Kerberos authentication
Using service name 'impala'
Connected to cdh1:21000
Server version: impalad version 1.3.1-cdh4 RELEASE (build 907481bf45b248a7bb3bb077d54831a71f484e5f)
Welcome to the Impala shell. Press TAB twice to see a list of available commands.

Copyright (c) 2012 Cloudera, Inc. All rights reserved.

(Shell build version: Impala Shell v1.3.1-cdh4 (907481b) built on Wed Apr 30 14:23:48 PDT 2014)
[cdh1:21000] >
[cdh1:21000] > show tables;
Query: show tables
+------+
| name |
+------+
| a    |
| b    |
| c    |
| d    |
+------+
Returned 4 row(s) in 0.08s
```

# 6. 排除

如果出现下面异常：

```
[cdh1:21000] > select * from test limit 10;
Query: select * from test limit 10
ERROR: AnalysisException: Failed to load metadata for table: default.test
CAUSED BY: TableLoadingException: Failed to load metadata for table: test
CAUSED BY: TTransportException: java.net.SocketTimeoutException: Read timed out
CAUSED BY: SocketTimeoutException: Read timed out
```

则需要在 hive-site.xml 中添加下面参数：

```xml
<property>
  <name>hive.metastore.client.socket.timeout</name>
  <value>3600</value>
</property>
```
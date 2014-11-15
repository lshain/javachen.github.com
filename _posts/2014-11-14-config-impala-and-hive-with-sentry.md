---
layout: post

title: Impala和Hive集成Sentry

category: hadoop

tags: [hadoop,sentry,cdh,impala]

description: 本文主要记录 CDH 5.2 Hadoop 集群中配置 Impala 和 Hive 集成 Sentry 的过程，包括 Sentry 的安装、配置以及和 Impala、Hive 集成后的测试。

published: true

---

本文主要记录 CDH 5.2 Hadoop 集群中配置 Impala 和 Hive 集成 Sentry 的过程，包括 Sentry 的安装、配置以及和 Impala、Hive 集成后的测试。

使用 Sentry 来管理集群的权限，需要先在集群上配置好 Kerberos。

关于 Hadoop 集群上配置 kerberos 以及 ldap 的过程请参考本博客以下文章：

 - [HDFS配置Kerberos认证](/2014/11/04/config-kerberos-in-cdh-hdfs)
 - [YARN配置Kerberos认证](/2014/11/04/config-kerberos-in-cdh-yarn)
 - [Hive配置Kerberos认证](/2014/11/04/config-kerberos-in-cdh-hive)
 - [Impala配置Kerberos认证](/2014/11/04/config-kerberos-in-cdh-impala)
 - [Hadoop配置LDAP集成Kerberos](/2014/11/12/config-ldap-with-kerberos-in-cdh-hadoop)

Sentry 会安装在三个节点的 hadoop 集群上，每个节点的ip、主机名和部署的组件分配如下：

```
192.168.56.121        cdh1     NameNode、Hive、ResourceManager、HBase、impala-state-store、impala-catalog、Kerberos Server、sentry-store
192.168.56.122        cdh2     DataNode、SSNameNode、NodeManager、HBase、impala-server
192.168.56.123        cdh3     DataNode、HBase、NodeManager、impala-server
```

# 1. 安装 Sentry

Sentry 的使用有两种方式，一是基于文件的存储方式（SimpleFileProviderBackend），一是基于数据库的存储方式（SimpleDbProviderBackend），如果使用基于文件的存储则只需要安装 `sentry`，否则还需要安装 `sentry-store`。

如上，sentry-store 服务会安装在 cdh1 节点上：

```bash
yum install sentry sentry-store -y
```

如果使用基于数据库的存储方式来使用 Sentry ，则需要修改 Sentry 的配置文件 `/etc/sentry/conf/sentry-store-site.xml` ，否则，你可以忽略下面的内容：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <property>
        <name>sentry.service.admin.group</name>
        <value>impala,hive,hue</value>
    </property>
    <property>
        <name>sentry.service.allow.connect</name>
        <value>impala,hive,hue</value>
    </property>
    <property>
        <name>sentry.verify.schema.version</name>
        <value>true</value>
    </property>
    <property>
    <name>sentry.service.server.rpc-address</name>
    <value>cdh1</value>
    </property>
    <property>
    <name>sentry.service.server.rpc-port</name>
    <value>8038</value>
    </property>
    <property>
        <name>sentry.store.jdbc.url</name>
        <value>jdbc:postgresql://cdh1/sentry</value>
    </property>
    <property>
        <name>sentry.store.jdbc.driver</name>
        <value>org.postgresql.Driver</value>
    </property>
    <property>
        <name>sentry.store.jdbc.user</name>
        <value>sentry</value>
    </property>
    <property>
        <name>sentry.store.jdbc.password</name>
        <value>redhat</value>
    </property>
    <property>
     <name>datanucleus.autoCreateSchema</name>
     <value>true</value>
    </property>
    <property>
        <name>sentry.hive.server</name>
        <value>server1</value>
    </property>
    <property>
        <name>sentry.store.group.mapping</name>
        <value>org.apache.sentry.provider.common.HadoopGroupMappingService</value>
    </property>
</configuration>
```

因为使用到了数据库，请安装数据库并修改配置文件中用户名和密码等信息，这部分内容本文不做介绍。需要注意的是 `datanucleus.autoCreateSchema`设置为 true，会自动创建表结构。

如果集群开启了 Kerberos 验证，则需要在该节点上生成 Sentry 服务的 principal 并导出为 ticket：

```bash
$ cd /etc/sentry/conf

kadmin.local -q "addprinc -randkey sentry/cdh1@JAVACHEN.COM "
kadmin.local -q "xst -k sentry.keytab sentry/cdh1@JAVACHEN.COM "

chown sentry:hadoop sentry.keytab ; chmod 400 *.keytab
```

然后，在/etc/sentry/conf/sentry-store-site.xml 中添加如下内容：

```xml
<property>
    <name>sentry.service.security.mode</name>
    <value>kerberos</value>
</property>
<property>
   <name>sentry.service.server.principal</name>
    <value>sentry/cdh1@JAVACHEN.COM</value>
</property>
<property>
    <name>sentry.service.server.keytab</name>
    <value>/etc/sentry/conf/sentry.keytab</value>
</property>
```

# 2. 准备测试数据

参考 [Securing Impala for analysts](http://blog.evernote.com/tech/2014/06/09/securing-impala-for-analysts/)，准备测试数据：

```bash
$ cat /tmp/events.csv
10.1.2.3,US,android,createNote
10.200.88.99,FR,windows,updateNote
10.1.2.3,US,android,updateNote
10.200.88.77,FR,ios,createNote
10.1.4.5,US,windows,updateTag

$ hive -S
hive> create database sensitive;
hive> create table sensitive.events (
    ip STRING, country STRING, client STRING, action STRING
  ) ROW FORMAT DELIMITED FIELDS TERMINATED BY ',';

hive> load data local inpath '/tmp/events.csv' overwrite into table sensitive.events;
hive> create database filtered;
hive> create view filtered.events as select country, client, action from sensitive.events;
hive> create view filtered.events_usonly as
  select * from filtered.events where country = 'US';
```

# 3. Hive-server2 集成 sentry

在使用 Sentry 时，有如下要求：

1、需要修改 `/user/hive/warehouse` 权限：

```bash 
hdfs dfs -chmod -R 770 /user/hive/warehouse
hdfs dfs -chown -R hive:hive /user/hive/warehouse
```

2、修改 hive-site.xml 文件，关掉 `HiveServer2 impersonation`

3、taskcontroller.cfg 文件中确保 `min.user.id=0`。


## 3.1 基于 SimpleFileProviderBackend 方式

在 hive 的 /etc/hive/conf 目录下创建 sentry-site.xml 文件，内容如下：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <property>
    <name>hive.sentry.server</name>
    <value>server1</value>
  </property>
  <property>
    <name>sentry.hive.provider.backend</name>
    <value>org.apache.sentry.provider.file.SimpleFileProviderBackend</value>
  </property>
  <property>
    <name>hive.sentry.provider</name>
    <value>org.apache.sentry.provider.file.HadoopGroupResourceAuthorizationProvider</value>
  </property>
  <property>
    <name>hive.sentry.provider.resource</name>
    <value>/user/hive/sentry/sentry-provider.ini</value>
  </property>
</configuration>
```

创建 sentry-provider.ini 文件并将其上传到 hdfs 的 `/user/hive/sentry/` 目录：

```bash
$ cat /tmp/sentry-provider.ini
[databases]
# Defines the location of the per DB policy file for the customers DB/schema
#db1 = hdfs://cdh1:8020/user/hive/sentry/db1.ini

[groups]
hive = any_operation
global_analysts = select_filtered
us_analysts = select_us

[roles]
any_operation = server=server1->db=*->table=*->action=*
select_filtered = server=server1->db=filtered->table=*->action=SELECT
select_us = server=server1->db=filtered->table=events_usonly->action=SELECT

[users]
analyst1 = global_analysts
analyst2 = us_analysts
hive= hive

$ hdfs dfs -rm -r /user/hive/sentry/sentry-provider.ini
$ hdfs dfs -put /tmp/sentry-provider.ini /user/hive/sentry/
$ hdfs dfs -chown hive:hive /user/hive/sentry/sentry-provider.ini
$ hdfs dfs -chmod 640 /user/hive/sentry/sentry-provider.ini
```

关于 sentry-provider.ini 文件的语法说明，请参考官方文档。这里我指定了 Hive 组有全部权限，并指定 Hive 用户属于 Hive 分组，而其他两个分组只有部分权限。

然后在 hive-site.xml 中添加如下配置：

```xml
<property>
    <name>hive.security.authorization.task.factory</name>
        <value>org.apache.sentry.binding.hive.SentryHiveAuthorizationTaskFactoryImpl</value>
</property>

<property>
    <name>hive.semantic.analyzer.hook</name>
    <value>org.apache.sentry.binding.hive.HiveAuthzBindingHook</value>
</property>
<property>
    <name>hive.server2.session.hook</name>
    <value>org.apache.sentry.binding.hive.HiveAuthzBindingSessionHook</value>
</property>
<property>
    <name>hive.sentry.conf.url</name>
    <value>file:///etc/hive/conf/sentry-site.xml</value>
</property>
```

将配置文件同步到其他节点，并重启 hive-server2 服务，然后进行测试。这里，我集群中 hive-server2 开启了 kerberos 认证，故通过 hive 用户来连接 hive-server2。

```bash
$ kinit -k -t /etc/hive/conf/hive.keytab hive/cdh1@JAVACHEN.COM

$ beeline -u "jdbc:hive2://cdh1:10000/default;principal=hive/cdh1@JAVACHEN.COM"
    scan complete in 10ms
    Connecting to jdbc:hive2://cdh1:10000/default;principal=hive/cdh1@JAVACHEN.COM
    Connected to: Apache Hive (version 0.13.1-cdh5.2.0)
    Driver: Hive JDBC (version 0.13.1-cdh5.2.0)
    Transaction isolation: TRANSACTION_REPEATABLE_READ
    Beeline version 0.13.1-cdh5.2.0 by Apache Hive
    5 rows selected (0.339 seconds)

    0: jdbc:hive2://cdh1:10000/default> show databases;
    +----------------+--+
    | database_name  |
    +----------------+--+
    | default        |
    | filtered       |
    | sensitive      |
    +----------------+--+
    10 rows selected (0.145 seconds)

    0: jdbc:hive2://cdh1:10000/default> use filtered
    No rows affected (0.132 seconds)

    0: jdbc:hive2://cdh1:10000/default> show tables;
    +----------------+--+
    |    tab_name    |
    +----------------+--+
    | events         |
    | events_usonly  |
    +----------------+--+
    2 rows selected (0.158 seconds)
    0: jdbc:hive2://cdh1:10000/default> use sensitive;
    No rows affected (0.115 seconds)

    0: jdbc:hive2://cdh1:10000/default> show tables;
    +-----------+--+
    | tab_name  |
    +-----------+--+
    | events    |
    +-----------+--+
    1 row selected (0.148 seconds)
```

## 3.2 基于 SimpleDbProviderBackend 方式

todo

# 4. Impala 集成 Sentry

## 4.1 基于 SimpleFileProviderBackend 方式

修改 /etc/default/impala 文件中的 `IMPALA_SERVER_ARGS` 参数，添加：

```bash
-server_name=server1 
-authorization_policy_file=/user/hive/sentry/sentry-provider.ini 
-authorization_policy_provider_class=org.apache.sentry.provider.file.LocalGroupResourceAuthorizationProvider
```

注意：server1 必须和 sentry-provider.ini 文件中的保持一致。

`IMPALA_SERVER_ARGS` 参数最后如下：

```bash
IMPALA_SERVER_ARGS=" \
    -log_dir=${IMPALA_LOG_DIR} \
    -catalog_service_host=${IMPALA_CATALOG_SERVICE_HOST} \
    -state_store_port=${IMPALA_STATE_STORE_PORT} \
    -use_statestore \
    -state_store_host=${IMPALA_STATE_STORE_HOST} \
    -be_port=${IMPALA_BACKEND_PORT} \
    -server_name=server1 \
    -authorization_policy_file=/user/hive/sentry/sentry-provider.ini \
    -authorization_policy_provider_class=org.apache.sentry.provider.file.LocalGroupResourceAuthorizationProvider \
    -enable_ldap_auth=true -ldap_uri=ldaps://cdh1 -ldap_baseDN=ou=people,dc=javachen,dc=com \
    -kerberos_reinit_interval=60 \
    -principal=impala/_HOST@JAVACHEN.COM \
    -keytab_file=/etc/impala/conf/impala.keytab \
"
```

重启 impala-server 服务，然后进行测试。因为我这里 impala-server 集成了 kerberos 和 ldap，现在通过 ldap 来进行测试。

先通过 ldap 的 test 用户来测试：

```bash
impala-shell -l -u test
    Starting Impala Shell using LDAP-based authentication
    LDAP password for test:
    Connected to cdh1:21000
    Server version: impalad version 2.0.0-cdh5 RELEASE (build ecf30af0b4d6e56ea80297df2189367ada6b7da7)
    Welcome to the Impala shell. Press TAB twice to see a list of available commands.

    Copyright (c) 2012 Cloudera, Inc. All rights reserved.

    (Shell build version: Impala Shell v2.0.0-cdh5 (ecf30af) built on Sat Oct 11 13:56:06 PDT 2014)

[cdh1:21000] > show databases;
    Query: show databases
    +---------+
    | name    |
    +---------+
    | default |
    +---------+
    Fetched 1 row(s) in 0.11s

[cdh1:21000] > show tables;

    Query: show tables
    ERROR: AuthorizationException: User 'test' does not have privileges to access: default.*

[cdh1:21000] >
```

可以看到 test 用户没有权限查看和数据库，这是因为 sentry-provider.ini 文件中并没有给 test 用户分配任何权限。

下面使用 hive 用户来测试。使用下面命令在 ldap 中创建 hive 用户和组并给 hive 用户设置密码。

```bash
$ grep hive /etc/passwd  >/opt/passwd.txt
$ /usr/share/migrationtools/migrate_passwd.pl /opt/passwd.txt /opt/passwd.ldif

$ ldapadd -x -D "uid=ldapadmin,ou=people,dc=javachen,dc=com" -w secret -f /opt/passwd.ldif

$ grep hive /etc/group  >/opt/group.txt
$ /usr/share/migrationtools/migrate_group.pl /opt/group.txt /opt/group.ldif

$ ldapadd -x -D "uid=ldapadmin,ou=people,dc=javachen,dc=com" -w secret -f /opt/group.ldif

# 修改 ldap 中 hive 用户密码
$ ldappasswd -x -D 'uid=ldapadmin,ou=people,dc=javachen,dc=com' -w secret "uid=hive,ou=people,dc=javachen,dc=com" -S
```

然后，使用 hive 用户测试：

```
$ impala-shell -l -u hive
    Starting Impala Shell using LDAP-based authentication
    LDAP password for hive:
    Connected to cdh1:21000
    Server version: impalad version 2.0.0-cdh5 RELEASE (build ecf30af0b4d6e56ea80297df2189367ada6b7da7)
    Welcome to the Impala shell. Press TAB twice to see a list of available commands.

    Copyright (c) 2012 Cloudera, Inc. All rights reserved.

    (Shell build version: Impala Shell v2.0.0-cdh5 (ecf30af) built on Sat Oct 11 13:56:06 PDT 2014)

[cdh1:21000] > show databases;
    Query: show databases
    +------------------+
    | name             |
    +------------------+
    | _impala_builtins |
    | default          |
    | filtered         |
    | sensitive        |
    +------------------+
    Fetched 11 row(s) in 0.11s

[cdh1:21000] > use sensitive;
    Query: use sensitive

[cdh1:21000] > show tables;
    Query: show tables
    +--------+
    | name   |
    +--------+
    | events |
    +--------+
    Fetched 1 row(s) in 0.11s

[cdh1:21000] > select * from events;
    Query: select * from events
    +--------------+---------+---------+------------+
    | ip           | country | client  | action     |
    +--------------+---------+---------+------------+
    | 10.1.2.3     | US      | android | createNote |
    | 10.200.88.99 | FR      | windows | updateNote |
    | 10.1.2.3     | US      | android | updateNote |
    | 10.200.88.77 | FR      | ios     | createNote |
    | 10.1.4.5     | US      | windows | updateTag  |
    +--------------+---------+---------+------------+
    Fetched 5 row(s) in 0.76s
```

同样，你还可以使用 analyst1 和 analyst2 用户来测试，这里不做说明。

## 4.2 基于 SimpleDbProviderBackend 方式

todo

# 5. 参考文章

- [Securing Impala for analysts](http://blog.evernote.com/tech/2014/06/09/securing-impala-for-analysts/)  
- [Setting Up Hive Authorization with Sentry](http://www.cloudera.com/content/cloudera/en/documentation/cloudera-manager/v4-8-0/Cloudera-Manager-Managing-Clusters/cmmc_sentry_config.html)



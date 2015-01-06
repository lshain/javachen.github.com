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

Sentry 的使用有两种方式，一是基于文件的存储方式（SimpleFileProviderBackend），一是基于数据库的存储方式（SimpleDbProviderBackend），如果使用基于文件的存储则只需要安装 `sentry`，否则还需要安装 `sentry-store`。

# 1. 基于数据库的存储方式

## 1.1 安装服务

在 cdh1 节点上安装 sentry-store 服务：

```bash
yum install sentry sentry-store -y
```

修改 Sentry 的配置文件 `/etc/sentry/conf/sentry-store-site.xml`，下面的配置参考了 [Sentry源码中的配置例子](https://github.com/cloudera/sentry/tree/cdh5-1.4.0_5.2.0/conf)：

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
        <name>sentry.hive.server</name>
        <value>server1</value>
    </property>
    <property>
        <name>sentry.store.group.mapping</name>
        <value>org.apache.sentry.provider.common.HadoopGroupMappingService</value>
    </property>
</configuration>
```

创建数据库，请参考 [Hadoop自动化安装shell脚本](/2013/08/02/hadoop-install-script/)：

```bash
yum install postgresql-server postgresql-jdbc -y

ln -s /usr/share/java/postgresql-jdbc.jar /usr/lib/hive/lib/postgresql-jdbc.jar
ln -s /usr/share/java/postgresql-jdbc.jar /usr/lib/sentry/lib/postgresql-jdbc.jar

su -c "cd ; /usr/bin/pg_ctl start -w -m fast -D /var/lib/pgsql/data" postgres
su -c "cd ; /usr/bin/psql --command \"create user sentry with password 'redhat'; \" " postgres
su -c "cd ; /usr/bin/psql --command \"CREATE DATABASE sentry owner=sentry;\" " postgres
su -c "cd ; /usr/bin/psql --command \"GRANT ALL privileges ON DATABASE sentry TO sentry;\" " postgres
su -c "cd ; /usr/bin/psql -U sentry -d sentry -f /usr/lib/sentry/scripts/sentrystore/upgrade/sentry-postgres-1.4.0-cdh5.sql" postgres
su -c "cd ; /usr/bin/pg_ctl restart -w -m fast -D /var/lib/pgsql/data" postgres
```

/var/lib/pgsql/data/pg_hba.conf 内容如下：

```
# TYPE  DATABASE    USER        CIDR-ADDRESS          METHOD

# "local" is for Unix domain socket connections only
local   all         all                               md5
# IPv4 local connections:
#host    all         all         0.0.0.0/0             trust
host    all         all         127.0.0.1/32          md5

# IPv6 local connections:
#host    all         all         ::1/128               nd5
```

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

## 1.2. 准备测试数据

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

## 1.3 Hive-server2 集成 sentry

### 要求
在使用 Sentry 时，有如下要求：

1、需要修改 `/user/hive/warehouse` 权限：

```bash
hdfs dfs -chmod -R 770 /user/hive/warehouse
hdfs dfs -chown -R hive:hive /user/hive/warehouse
```

2、修改 hive-site.xml 文件，关掉 `HiveServer2 impersonation`

3、taskcontroller.cfg 文件中确保 `min.user.id=0`。

### 修改配置文件

修改 hive-site.xml，添加如下：

```xml
<property>
    <name>hive.security.authorization.task.factory</name>
        <value>org.apache.sentry.binding.hive.SentryHiveAuthorizationTaskFactoryImpl</value>
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

在 /etc/hive/conf/ 目录创建 sentry-site.xml：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
<property>
   <name>sentry.service.client.server.rpc-port</name>
   <value>8038</value>
</property>
<property>
   <name>sentry.service.client.server.rpc-address</name>
   <value>cdh1</value>
</property>
<property>
   <name>sentry.service.client.server.rpc-connection-timeout</name>
   <value>200000</value>
</property>
<property>
    <name>sentry.service.security.mode</name>
    <value>kerberos</value>
</property>
<property>
   <name>sentry.service.server.principal</name>
    <value>sentry/_HOST@JAVACHEN.COM</value>
</property>
<property>
    <name>sentry.service.server.keytab</name>
    <value>/etc/sentry/conf/sentry.keytab</value>
</property>
<property>
    <name>sentry.hive.provider</name>
    <value>org.apache.sentry.provider.file.HadoopGroupResourceAuthorizationProvider</value>
  </property>
<property>
    <name>sentry.hive.provider.backend</name>
    <value>org.apache.sentry.provider.db.SimpleDBProviderBackend</value>
  </property>
<property>
    <name>sentry.hive.server</name>
    <value>server1</value>
  </property>
  <property>
    <name>sentry.metastore.service.users</name>
    <value>hive</value>
  </property>
<property>
    <name>sentry.hive.testing.mode</name>
    <value>false</value>
  </property>
</configuration>
```

### sentry-store 中创建角色和组

在 beeline 中通过 hive（注意，在 sentry 中 hive 为管理员用户）的 ticket 连接 hive-server2，创建 role、group 等等，执行下面语句：

```sql
create role admin_role;
GRANT ALL ON SERVER server1 TO ROLE admin_role;
GRANT ROLE admin_role TO GROUP admin;
GRANT ROLE admin_role TO GROUP hive;

create role test_role;
GRANT ALL ON DATABASE filtered TO ROLE test_role;
GRANT ALL ON DATABASE sensitive TO ROLE test_role;
GRANT ROLE test_role TO GROUP test;
```

上面创建了两个角色，一个是 admin_role，具有管理员权限，可以读写所有数据库，并授权给 admin 和 hive 组（对应操作系统上的组）；一个是 test_role，只能读写 filtered 和 sensitive 数据库，并授权给 test 组

### 在 ldap 创建测试用户

在 ldap 服务器上创建系统用户 yy_test，并使用 migrationtools 工具将该用户导入 ldap，最后设置 ldap 中该用户密码。

```bash
# 创建 yy_test用户
useradd yy_test

grep -E "yy_test" /etc/passwd  >/opt/passwd.txt
/usr/share/migrationtools/migrate_passwd.pl /opt/passwd.txt /opt/passwd.ldif
ldapadd -x -D "uid=ldapadmin,ou=people,dc=lashou,dc=com" -w secret -f /opt/passwd.ldif

#使用下面语句修改密码，填入上面生成的密码，输入两次：

ldappasswd -x -D 'uid=ldapadmin,ou=people,dc=lashou,dc=com' -w secret "uid=yy_test,ou=people,dc=lashou,dc=com" -S
```

在每台 datanode 机器上创建 test 分组，并将 yy_test 用户加入到 test 分组：

```bash
groupadd test ; useradd yy_test; usermod -G test,yy_test yy_test
```

### 测试

通过 beeline 连接 hive-server2，进行测试：

```bash
# 切换到 test 用户进行测试
$ su test

$ kinit -k -t test.keytab test/cdh1@JAVACHEN.COM

$ beeline -u "jdbc:hive2://cdh1:10000/default;principal=test/cdh1@JAVACHEN.COM"
```

## 1.4 Impala 集成 Sentry

### 修改配置

修改 /etc/default/impala 文件中的 `IMPALA_SERVER_ARGS` 参数，添加：

```bash
-server_name=server1
-sentry_config=/etc/impala/conf/sentry-site.xml
```

在 `IMPALA_CATALOG_ARGS` 中添加：

```bash
-sentry_config=/etc/impala/conf/sentry-site.xml
```

注意：server1 必须和 sentry-provider.ini 文件中的保持一致。

`IMPALA_SERVER_ARGS` 参数最后如下：

```bash
hostname=`hostname -f |tr "[:upper:]" "[:lower:]"`

IMPALA_SERVER_ARGS=" \
    -log_dir=${IMPALA_LOG_DIR} \
    -catalog_service_host=${IMPALA_CATALOG_SERVICE_HOST} \
    -state_store_port=${IMPALA_STATE_STORE_PORT} \
    -use_statestore \
    -state_store_host=${IMPALA_STATE_STORE_HOST} \
    -kerberos_reinit_interval=60 \
    -principal=impala/${hostname}@JAVACHEN.COM \
    -keytab_file=/etc/impala/conf/impala.keytab \
    -enable_ldap_auth=true -ldap_uri=ldaps://cdh1 -ldap_baseDN=ou=people,dc=javachen,dc=com \
    -server_name=server1 \
    -sentry_config=/etc/impala/conf/sentry-site.xml \
    -be_port=${IMPALA_BACKEND_PORT} -default_pool_max_requests=-1 -mem_limit=60%"
```

创建 /etc/impala/conf/sentry-site.xml 内容如下：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
<property>
   <name>sentry.service.client.server.rpc-port</name>
   <value>8038</value>
</property>
<property>
   <name>sentry.service.client.server.rpc-address</name>
   <value>cdh1</value>
</property>
<property>
   <name>sentry.service.client.server.rpc-connection-timeout</name>
   <value>200000</value>
</property>
<property>
    <name>sentry.service.security.mode</name>
    <value>kerberos</value>
</property>
<property>
   <name>sentry.service.server.principal</name>
    <value>sentry/_HOST@JAVACHEN.COM</value>
</property>
<property>
    <name>sentry.service.server.keytab</name>
    <value>/etc/sentry/conf/sentry.keytab</value>
</property>
</configuration>
```

### 测试

请参考下午基于文件存储方式中 impala 的测试。

# 2. 基于文件存储方式

## 2.1 hive 集成 sentry

### 修改配置文件

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
admin = any_operation
hive = any_operation
test = select_filtered

[roles]
any_operation = server=server1->db=*->table=*->action=*
select_filtered = server=server1->db=filtered->table=*->action=SELECT
select_us = server=server1->db=filtered->table=events_usonly->action=SELECT

[users]
test = test
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
    <name>hive.server2.session.hook</name>
    <value>org.apache.sentry.binding.hive.HiveAuthzBindingSessionHook</value>
</property>
<property>
    <name>hive.sentry.conf.url</name>
    <value>file:///etc/hive/conf/sentry-site.xml</value>
</property>
```

将配置文件同步到其他节点，并重启 hive-server2 服务。

### 测试

这里，我集群中 hive-server2 开启了 kerberos 认证，故通过 hive 用户来连接 hive-server2。

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

## 2.3  impala 集成 sentry

### 修改配置文件

修改 /etc/default/impala 文件中的 `IMPALA_SERVER_ARGS` 参数，添加：

```bash
-server_name=server1
-authorization_policy_file=/user/hive/sentry/sentry-provider.ini
-authorization_policy_provider_class=org.apache.sentry.provider.file.LocalGroupResourceAuthorizationProvider
```

注意：server1 必须和 sentry-provider.ini 文件中的保持一致。

`IMPALA_SERVER_ARGS` 参数最后如下：

```bash
hostname=`hostname -f |tr "[:upper:]" "[:lower:]"`

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
    -principal=impala/${hostname}@JAVACHEN.COM \
    -keytab_file=/etc/impala/conf/impala.keytab \
"
```

### 测试

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

同样，你还可以使用其他用户来测试。

也可以使用 beeline 来连接 impala-server 来进行测试：

```bash
$ beeline -u "jdbc:hive2://cdh1:21050/default;" -n test -p test
  scan complete in 2ms
  Connecting to jdbc:hive2://cdh1:21050/default;
  Connected to: Impala (version 2.0.0-cdh5)
  Driver: Hive JDBC (version 0.13.1-cdh5.2.0)
  Transaction isolation: TRANSACTION_REPEATABLE_READ
  Beeline version 0.13.1-cdh5.2.0 by Apache Hive
  0: jdbc:hive2://cdh1:21050/default>
```

# 3. 参考文章

- [Securing Impala for analysts](http://blog.evernote.com/tech/2014/06/09/securing-impala-for-analysts/)  
- [Setting Up Hive Authorization with Sentry](http://www.cloudera.com/content/cloudera/en/documentation/cloudera-manager/v4-8-0/Cloudera-Manager-Managing-Clusters/cmmc_sentry_config.html)
- [Sentry源码中的配置例子](https://github.com/cloudera/sentry/tree/cdh5-1.4.0_5.2.0/conf)

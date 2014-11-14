---
layout: post

title: Hadoop集群上配置Sentry

category: hadoop

tags: [hadoop,sentry,cdh,impala]

description: 本文主要记录 CDH 5.2 Hadoop 集群上配置 Sentry 的过程，使用 Sentry 来管理集群的权限，需要先在集群上配置好 Kerberos。

published: false

---

本文主要记录 CDH 5.2 Hadoop 集群上配置 Sentry 的过程，使用 Sentry 来管理集群的权限，需要先在集群上配置好 Kerberos。

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

如上，sentry-store 服务会安装在 cdh1 节点上。

# 1. 安装 sentry

yum install sentry sentry-store -y

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

# 2. 生成 ticket

sentry 只安装在一台机器上，即 cdh1 节点，故在该节点上生成 sentry 服务的 principal 并导出为 ticket：

```bash
$ cd /etc/sentry/conf

kadmin.local -q "addprinc -randkey sentry/cdh1@JAVACHEN.COM "
kadmin.local -q "xst -k sentry.keytab sentry/cdh1@JAVACHEN.COM "

chown sentry:hadoop sentry.keytab ;chmod 400 *.keytab
```

# 3. 修改配置文件

sentry 的配置文件在 /etc/sentry/conf，修改该文件如下：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <property>
        <name>sentry.service.admin.group</name>
        <value>hadoop</value>
    </property>
    <property>
        <name>sentry.service.allow.connect</name>
        <value>impala,hive</value>
    </property>
    <property>
        <name>sentry.verify.schema.version</name>
        <value>true</value>
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
        <value>testimpala</value>
    </property>
    <property>
        <name>sentry.store.group.mapping</name>
        <value>org.apache.sentry.provider.common.HadoopGroupMappingService</value>
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

参数说明：

 - sentry 使用了数据库来保存元数据，这里我使用的是 postgresql 数据库，请先创建好该数据库，`datanucleus.autoCreateSchema`参数配置为 true，表示在启动时候会会自动建表
 - 

创建 sentry-provider.ini 文件并将其上传到 hdfs ：

```bash
$ cat /tmp/sentry-provider.ini
[groups]
sysadmins = any_operation
global_analysts = select_filtered
us_analysts = select_us

[roles]
any_operation = server=testimpala->db=*->table=*->action=*
select_filtered = server=testimpala->db=filtered->table=*->action=SELECT
select_us = server=testimpala->db=filtered->table=events_usonly->action=SELECT

[users]
sysadmin1 = sysadmins
analyst1 = global_analysts
analyst2 = us_analysts

$ hdfs dfs -put /tmp/sentry-provider.ini /user/hive/warehouse/
```

关于 impala-policy.ini 文件的说明，请参考官方文档。

上面指定了三个分组，三个角色以及三个用户，需要在 hive 中创建对于的用户和角色。

CREATE ROLE any_operation;


# 3. 配置 hive-metastore 使用 sentry

sentry-site.xml

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <property>
        <name>sentry.hive.provider</name>
        <value>org.apache.sentry.provider.common.HadoopGroupResourceAuthorizationProvider</value>
    </property>
    <property>
        <name>sentry.hive.testing.mode</name>
        <value>false</value>
    </property>
    <property>
        <name>sentry.service.client.server.rpc-port</name>
        <value>8038</value>
    </property>
    <property>
        <name>sentry.service.client.server.rpc-address</name>
        <value>cdh1</value>
    </property>

    <property>
        <name>sentry.hive.server</name>
        <value>testimpala</value>
    </property>

    <property>
        <name>sentry.hive.provider.backend</name>
        <value>org.apache.sentry.provider.db.SimpleDBProviderBackend</value>
    </property>  

    <property>
        <name>sentry.service.security.mode</name>
        <value>kerberos</value>
    </property>
    <property>
        <name>sentry.service.server.principal</name>
        <value>hive/_HOST@JAVACHEN.COM</value>
    </property>
    <property>
        <name>sentry.metastore.service.users</name>
        <value>hive,impala</value>
    </property>
</configuration>
```

hive-site.xml 中添加如下配置：

```
<property>
        <name>hive.sentry.conf.url</name>
        <value>file:///etc/hive/conf/hive-site.xml</value>
</property>
<property>
        <name>hive.metastore.client.impl</name>
        <value>org.apache.sentry.binding.metastore.SentryHiveMetaStoreClient</value>
</property>
<property>
        <name>hive.metastore.pre.event.listeners</name>
        <value>org.apache.sentry.binding.metastore.MetastoreAuthzBinding</value>
</property>
<property>
        <name>hive.metastore.event.listeners</name>
        <value>org.apache.sentry.binding.metastore.SentryMetastorePostEventListener</value>
</property>

<property>
        <name>hive.security.authorization.task.factory</name>
        <value>org.apache.sentry.binding.hive.SentryHiveAuthorizationTaskFactoryImpl</value>
</property>

```

重启 hive-metastore 观察日志输出是否报错：

```
/etc/init.d/hive-metastore restart
```

使用 hive cli 进行测试：

[root@cdh1 hive]# hive
14/11/14 15:45:11 WARN conf.HiveConf: DEPRECATED: Configuration property hive.metastore.local no longer has any effect. Make sure to provide a valid value for hive.metastore.uris if you are connecting to a remote metastore.

Logging initialized using configuration in file:/etc/hive/conf.dist/hive-log4j.properties
hive> show tables;
FAILED: Execution Error, return code 1 from org.apache.hadoop.hive.ql.exec.DDLTask. java.lang.NullPointerException


# 配置 hive-server2 使用 sentry

hive-site.xml 中添加如下配置：

```
<property>
        <name>hive.semantic.analyzer.hook</name>
        <value>org.apache.sentry.binding.hive.HiveAuthzBindingHook</value>
</property>
<property>
        <name>hive.server2.session.hook</name>
        <value>org.apache.sentry.binding.hive.HiveAuthzBindingSessionHook</value>
</property>
```

beeline --verbose=true

beeline -u "jdbc:hive2://cdh1:10000/default;principal=hive/cdh1@JAVACHEN.COM"

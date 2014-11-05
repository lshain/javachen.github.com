---
layout: post

title: YARN配置Kerberos认证

category: hadoop

tags: [hadoop,kerberos,cdh,yarn]

description: 记录 CDH Hadoop 集群上配置 YARN 集成 Kerberos 的过程，包括 Kerberos 的安装和 YARN 相关配置修改说明。

---

关于 Kerberos 的安装和 HDFS 配置 kerberos 认证，请参考 [HDFS配置kerberos认证](/2014/11/04/config-kerberos-in-hdfs/)。

> 请先完成 HDFS 配置 Kerberos 认证，再来配置 YARN 集成 Kerberos 认证 ！

参考 [使用yum安装CDH Hadoop集群](http://blog.javachen.com/2013/04/06/install-cloudera-cdh-by-yum/) 安装 hadoop 集群，集群包括三个节点，每个节点的ip、主机名和部署的组件分配如下：

```
192.168.56.121        cdh1     NameNode、Hive、ResourceManager、HBase
192.168.56.122        cdh2     DataNode、SSNameNode、NodeManager、HBase
192.168.56.123        cdh3     DataNode、HBase、NodeManager
```

# 1. 生成 keytab

在 cdh1节点的 /etc/hadoop/conf 目录，即 KDC server 节点上运行 kadmin.local ，然后执行下面命令：

```
addprinc -randkey yarn/cdh1@lashou_hadoop
addprinc -randkey yarn/cdh2@lashou_hadoop
addprinc -randkey yarn/cdh3@lashou_hadoop

addprinc -randkey mapred/cdh1@lashou_hadoop
addprinc -randkey mapred/cdh2@lashou_hadoop
addprinc -randkey mapred/cdh3@lashou_hadoop

xst  -k yarn-unmerged.keytab  yarn/cdh1@lashou_hadoop
xst  -k yarn-unmerged.keytab  yarn/cdh1@lashou_hadoop
xst  -k yarn-unmerged.keytab  yarn/cdh1@lashou_hadoop

xst  -k mapred-unmerged.keytab  mapred/cdh1@lashou_hadoop
xst  -k mapred-unmerged.keytab  mapred/cdh1@lashou_hadoop
xst  -k mapred-unmerged.keytab  mapred/cdh1@lashou_hadoop
```

上面是将 yarn 用户和 mapred 用户规则的都添加到 yarn-unmerged.keytab 中了。

然后，使用 `ktutil` 合并前面创建的 keytab ：

```bash
$ cd /etc/hadoop/conf

$ ktutil
ktutil: rkt yarn-unmerged.keytab
ktutil: rkt HTTP.keytab
ktutil: wkt yarn.keytab

ktutil: clear
ktutil: rkt mapred-unmerged.keytab
ktutil: rkt HTTP.keytab
ktutil: wkt mapred.keytab
```

这样会在 `/etc/hadoop/conf` 目录下生成 yarn.keytab 和 mapred.keytab。

拷贝 yarn.keytab 和 mapred.keytab 文件到其他节点的 /etc/hadoop/conf 目录

```bash
$ scp yarn.keytab cdh2:/etc/hadoop/conf
$ scp yarn.keytab cdh3:/etc/hadoop/conf

$ scp mapred.keytab cdh2:/etc/hadoop/conf
$ scp mapred.keytab cdh3:/etc/hadoop/conf
```

并设置权限，分别在 cdh1、cdh2、cdh3 上执行：

```bash
$ chown yarn:hadoop /etc/hadoop/conf/yarn.keytab
$ chmod 400 /etc/hadoop/conf/yarn.keytab

$ chown mapred:hadoop /etc/hadoop/conf/mapred.keytab
$ chmod 400 /etc/hadoop/conf/mapred.keytab
```

由于 keytab 相当于有了永久凭证，不需要提供密码(如果修改 kdc 中的 principal 的密码，则该 keytab 就会失效)，所以其他用户如果对该文件有读权限，就可以冒充 keytab 中指定的用户身份访问 hadoop，所以 keytab 文件需要确保只对 owner 有读权限(`0400`)

# 2. 修改 YARN 配置文件

修改 yarn-site.xml，添加下面配置：

```xml
<property>
  <name>yarn.resourcemanager.keytab</name>
  <value>/etc/hadoop/conf/yarn.keytab</value>
</property>
<property>
  <name>yarn.resourcemanager.principal</name> 
  <value>yarn/_HOST@lashou_hadoop</value>
</property>

<property>
  <name>yarn.nodemanager.keytab</name>
  <value>/etc/hadoop/conf/yarn.keytab</value>
</property>
<property>
  <name>yarn.nodemanager.principal</name> 
  <value>yarn/_HOST@lashou_hadoop</value>
</property> 
<property>
  <name>yarn.nodemanager.container-executor.class</name>  
  <value>org.apache.hadoop.yarn.server.nodemanager.LinuxContainerExecutor</value>
</property> 
<property>
  <name>yarn.nodemanager.linux-container-executor.group</name>
  <value>yarn</value>
</property>
```

如果想要 YARN 开启 SSL，则添加：

```xml
<property>
  <name>yarn.http.policy</name>
  <value>HTTPS_ONLY</value>
</property>
```

修改 mapred-site.xml，添加如下配置：

```xml
<property>
  <name>mapreduce.jobhistory.keytab</name>
  <value>/etc/hadoop/conf/mapred.keytab</value>
</property> 
<property>
  <name>mapreduce.jobhistory.principal</name> 
  <value>mapred/_HOST@lashou_hadoop</value>
</property>
```

如果想要 mapreduce jobhistory 开启 SSL，则添加：

```xml
<property>
  <name>mapreduce.jobhistory.http.policy</name>
  <value>HTTPS_ONLY</value>
</property>
```

在 `/etc/hadoop/conf` 目录下创建 container-executor.cfg 文件，内容如下：

```properties
#configured value of yarn.nodemanager.linux-container-executor.group
yarn.nodemanager.linux-container-executor.group=yarn
#comma separated list of users who can not run applications
banned.users=
#Prevent other super-users
min.user.id=0
#comma separated list of system users who CAN run applications
allowed.system.users=hdfs,yarn,mapred,hive,impala
```

确保 `yarn.nodemanager.local-dirs` 和 `yarn.nodemanager.log-dirs` 对应的目录权限为 `755` 。

设置 /usr/lib/hadoop-yarn/bin/container-executor 读写权限为 `6050` 如下：

```bash
$ chown root:yarn /usr/lib/hadoop-yarn/bin/container-executor
$ chmod 6050 /usr/lib/hadoop-yarn/bin/container-executor

$ ll /usr/lib/hadoop-yarn/bin/container-executor
---Sr-s--- 1 root yarn 333 11-04 19:11 container-executor
```

测试是否配置正确：

```bash
/usr/lib/hadoop-yarn/bin/container-executor --checksetup
```

记住将修改的上面文件同步到其他节点：cdh2、cdh3，并再次一一检查权限是否正确。

# 3. 启动服务

## 启动 ResourceManager

在 cdh1 上先获取 ticket 再启动服务：

```bash
$ kinit -k -t /etc/hadoop/conf/yarn.keytab yarn/cdh1@lashou_hadoop
$ service hadoop-yarn-resourcemanager start
```

然后查看日志，确认是否启动成功。

## 启动 NodeManager

在 cdh2 和 cdh3 上先获取 ticket 再启动服务：

```bash
$ kinit -k -t /etc/hadoop/conf/yarn.keytab yarn/cdh2@lashou_hadoop
$ service hadoop-yarn-nodemanager start
```

## 启动 MapReduce Job History Server

在 cdh1 上运行：

```bash
$ kinit -k -t /etc/hadoop/conf/mapred.keytab mapred/cdh1@lashou_hadoop
$ service hadoop-mapreduce-historyserver start
```

# 4. 测试

检查 web 页面是否可以访问：http://cdh1:8088/cluster

```bash
hadoop jar /usr/lib/hadoop-mapreduce/hadoop-mapreduce-examples.jar pi 10 10000
```
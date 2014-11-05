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

在 cdh1节点的 `/etc/hadoop/conf` 目录，即 KDC server 节点上运行 kadmin.local ，然后执行下面命令：

```
addprinc -randkey yarn/cdh1@JAVACHEN.COM
addprinc -randkey yarn/cdh2@JAVACHEN.COM
addprinc -randkey yarn/cdh3@JAVACHEN.COM

addprinc -randkey mapred/cdh1@JAVACHEN.COM
addprinc -randkey mapred/cdh2@JAVACHEN.COM
addprinc -randkey mapred/cdh3@JAVACHEN.COM

xst  -k yarn-unmerged.keytab  yarn/cdh1@JAVACHEN.COM
xst  -k yarn-unmerged.keytab  yarn/cdh1@JAVACHEN.COM
xst  -k yarn-unmerged.keytab  yarn/cdh1@JAVACHEN.COM

xst  -k mapred-unmerged.keytab  mapred/cdh1@JAVACHEN.COM
xst  -k mapred-unmerged.keytab  mapred/cdh1@JAVACHEN.COM
xst  -k mapred-unmerged.keytab  mapred/cdh1@JAVACHEN.COM
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

拷贝 yarn.keytab 和 mapred.keytab 文件到其他节点的 `/etc/hadoop/conf` 目录

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
  <value>yarn/_HOST@JAVACHEN.COM</value>
</property>

<property>
  <name>yarn.nodemanager.keytab</name>
  <value>/etc/hadoop/conf/yarn.keytab</value>
</property>
<property>
  <name>yarn.nodemanager.principal</name> 
  <value>yarn/_HOST@JAVACHEN.COM</value>
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
  <value>mapred/_HOST@JAVACHEN.COM</value>
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
banned.users=hfds,yarn,mapred,hive,impala
#Prevent other super-users
min.user.id=0
#comma separated list of system users who CAN run applications
allowed.system.users=root
```

设置该文件权限：

```bash
$ chown root:yarn container-executor.cfg
$ chmod 400 container-executor.cfg

$ ll container-executor.cfg
-r-------- 1 root yarn 354 11-05 14:14 container-executor.cfg
```

**注意：**

- `container-executor.cfg` 文件读写权限需设置为 `400`，所有者为 `root:yarn`。
- `yarn.nodemanager.linux-container-executor.group` 要同时配置在 yarn-site.xml 和 container-executor.cfg，且其值需要为运行 NodeManager 的用户所在的组，这里为 yarn。
- `banned.users` 不能为空，默认值为 `hfds,yarn,mapred,bin`
- `min.user.id` 默认值为 1000，在有些 centos 系统中，用户最小 id 为500，则需要修改该值
- 确保 `yarn.nodemanager.local-dirs` 和 `yarn.nodemanager.log-dirs` 对应的目录权限为 `755` 。

设置 /usr/lib/hadoop-yarn/bin/container-executor 读写权限为 `6050` 如下：

```bash
$ chown root:yarn /usr/lib/hadoop-yarn/bin/container-executor
$ chmod 6050 /usr/lib/hadoop-yarn/bin/container-executor

$ ll /usr/lib/hadoop-yarn/bin/container-executor
---Sr-s--- 1 root yarn 333 11-04 19:11 container-executor
```

测试是否配置正确：

```bash
$ /usr/lib/hadoop-yarn/bin/container-executor --checksetup
```

如果提示错误，则查看 NodeManger 的日志，然后对照 [YARN ONLY: Container-executor Error Codes](http://www.cloudera.com/content/cloudera/en/documentation/core/latest/topics/cdh_sg_other_hadoop_security.html?scroll=topic_18_unique_2) 查看错误对应的问题说明。

关于 LinuxContainerExecutor 的详细说明，可以参考 <http://hadoop.apache.org/docs/r2.5.0/hadoop-project-dist/hadoop-common/SecureMode.html#LinuxContainerExecutor>。

记住将修改的上面文件同步到其他节点：cdh2、cdh3，并再次一一检查权限是否正确。

# 3. 启动服务

## 启动 ResourceManager

resourcemanager 是通过 yarn 用户启动的，故在 cdh1 上先获取 yarn 用户的 ticket 再启动服务：

```bash
$ kinit -k -t /etc/hadoop/conf/yarn.keytab yarn/cdh1@JAVACHEN.COM
$ service hadoop-yarn-resourcemanager start
```

然后查看日志，确认是否启动成功。

## 启动 NodeManager

resourcemanager 是通过 yarn 用户启动的，故在 cdh2 和 cdh3 上先获取 yarn 用户的 ticket 再启动服务：

```bash
$ kinit -k -t /etc/hadoop/conf/yarn.keytab yarn/cdh2@JAVACHEN.COM
$ service hadoop-yarn-nodemanager start
```

## 启动 MapReduce Job History Server

resourcemanager 是通过 mapred 用户启动的，故在 cdh1 上先获取 mapred 用户的 ticket 再启动服务：

```bash
$ kinit -k -t /etc/hadoop/conf/mapred.keytab mapred/cdh1@JAVACHEN.COM
$ service hadoop-mapreduce-historyserver start
```

另外，为了方便管理集群，在 cdh1 上创建一个 shell 脚本用于批量管理集群，脚本如下（保存为 `manager_cluster.sh`）：

```bash
#!/bin/bash

role=$1
command=$2

for node in 56.121 56.122 56.123 ;do
  echo "========192.168.$node========"
  ssh 192.168.$node '
    host=`hostname -f`
    path="'$role'/$host"
    #echo $path
    principal=`klist -k /etc/hadoop/conf/'$role'.keytab | grep $path | head -n1 | cut -d " " -f5`
    #echo $principal
    if [ X"$principal" == X ]; then
          echo "Failed to get hdfs Kerberos principal"
          exit 1
      fi
      kinit -kt /etc/hadoop/conf/'$role'.keytab $principal
      if [ $? -ne 0 ]; then
          echo "Failed to login as hdfs by kinit command"
          exit 1
      fi
    for src in `ls /etc/init.d|grep '$role'`;do service $src '$command'; done
  '
done
```

使用方法为：

```bash
$ sh manager_cluster.sh hdfs start #启动 hdfs 用户管理的服务
$ sh manager_cluster.sh yarn start #启动 yarn 用户管理的服务 
$ sh manager_cluster.sh mapred start #启动 mapred 用户管理的服务

$ sh manager_cluster.sh hdfs status #查看 hdfs 用户管理的服务的运行状态
```

# 4. 测试

检查 web 页面是否可以访问：http://cdh1:8088/cluster

运行一个 mapreduce 的例子：

```bash
$ hadoop jar /usr/lib/hadoop-mapreduce/hadoop-mapreduce-examples.jar pi 10 10000
```

如果没有报错，则说明配置成功。最后运行的结果为：

```
Job Finished in 54.56 seconds
Estimated value of Pi is 3.14120000000000000000
```


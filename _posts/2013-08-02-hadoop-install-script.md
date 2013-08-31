---
layout: post
title:  hadoop自动化安装shell脚本
category: hadoop
tags: [hadoop, hive, hbase, mapreduce]
keywords: hadoop, hive, remote debug, mapreduce
description: 自动化安装hadoop的shell脚本
---

之前写过一些如何安装Cloudera Hadoop的文章，安装hadoop过程中，最开始是手动安装apache版本的hadoop，其次是使用Intel的IDH管理界面安装IDH的hadoop，再然后分别手动和通过cloudera manager安装hadoop，也使用bigtop-util yum方式安装过apache的hadoop。

安装过程中参考了很多网上的文章，解压缩过cloudera的`cloudera-manager-installer.bin`，发现并修复了IDH shell脚本中关于puppt的自认为是bug的一个bug，最后整理出了一个自动安装hadoop的shell脚本，脚本托管在github上面: [hadoop-install](https://github.com/javachen/hadoop-install)。

<!-- more -->

## hadoop安装文章
博客中所有关于安装hadoop的文章列出如下：

1. [【笔记】Hadoop安装部署](http://blog.javachen.com/hadoop/2013/03/08/note-about-installing-hadoop-cluster/)

2. [手动安装Cloudera Hive CDH](http://blog.javachen.com/hadoop/2013/03/24/manual-install-Cloudera-hive-CDH/)

3. [手动安装Cloudera HBase CDH](http://blog.javachen.com/hadoop/2013/03/24/manual-install-Cloudera-hbase-CDH/)

4. [手动安装Cloudera Hadoop CDH](http://blog.javachen.com/hadoop/2013/03/24/manual-install-Cloudera-Hadoop-CDH/)

5. [安装impala过程](http://blog.javachen.com/hadoop/2013/03/29/install-impala/)

6. [从yum安装Cloudera CDH集群](http://blog.javachen.com/hadoop/2013/04/06/install-cloudera-cdh-by-yum/)

7. [通过Cloudera Manager安装CDH](http://blog.javachen.com/hadoop/2013/06/24/install-cdh-by-cloudera-manager/)


## hadoop-install
[hadoop-install](https://github.com/javachen/hadoop-install)上脚本，all-in-one-install.sh是在一个节点上安装hdfs、hive、yarn、zookeeper和hbase，编写该脚本是为了在本机（fedora19系统）上调试mapreduce、hive和hbase；cluster-install.sh是在多个节点上安装hadoop集群，同样目前完成了hdfs、hive、yarn、zookeeper和hbase的自动安装。


## 脚本片段
IDH安装脚本中有一些写的比较好的shell代码片段，摘出如下，供大家学习。

### 检测操作系统版本

    ( grep -i "CentOS" /etc/issue > /dev/null ) && OS_DISTRIBUTOR=centos
    ( grep -i "Red[[:blank:]]*Hat[[:blank:]]*Enterprise[[:blank:]]*Linux" /etc/issue > /dev/null ) && OS_DISTRIBUTOR=rhel
    ( grep -i "Oracle[[:blank:]]*Linux" /etc/issue > /dev/null ) && OS_DISTRIBUTOR=oel
    ( grep -i "Asianux[[:blank:]]*Server" /etc/issue > /dev/null ) && OS_DISTRIBUTOR=an
    ( grep -i "SUSE[[:blank:]]*Linux[[:blank:]]*Enterprise[[:blank:]]*Server" /etc/issue > /dev/null ) && OS_DISTRIBUTOR=sles
    ( grep -i "Fedora" /etc/issue > /dev/null ) && OS_DISTRIBUTOR=fedora

    major_revision=`grep -oP '\d+' /etc/issue | sed -n "1,1p"`
    minor_revision=`grep -oP '\d+' /etc/issue | sed -n "2,2p"`
    OS_RELEASE="$major_revision.$minor_revision"

### 生成ssh公要

	yes|ssh-keygen -t rsa -f /root/.ssh/id_rsa -N ""
	[ ! -d /root/.ssh ] && ( mkdir /root/.ssh ) && ( chmod 700 /root/.ssh )

### ssh设置无密码登陆

	set timeout 20

	set host [lindex $argv 0]
	set password [lindex $argv 1]
	set pubkey [exec cat /root/.ssh/id_rsa.pub]
	set localsh [exec cat ./config_ssh_local.sh]

	#spawn ssh-copy-id -i /root/.ssh/id_rsa.pub root@$host
	spawn ssh root@$host "
	umask 022
	mkdir -p  /root/.ssh
	echo \'$pubkey\' > /root/.ssh/authorized_keys
	echo \'$localsh\' >  /root/.ssh/config_ssh_local.sh
	cd /root/.ssh/; sh config_ssh_local.sh
	"
	expect {
		timeout exit
		yes/no  {send "yes\r";exp_continue}
		assword {send "$password\r"}
	}
	expect eof
	#interact

### 配置JAVA_HOME

	# set JAVA_HOME and PATH
	if [ -f /root/.bashrc ] ; then
	    sed -i '/^export[[:space:]]\{1,\}JAVA_HOME[[:space:]]\{0,\}=/d' /root/.bashrc
	    sed -i '/^export[[:space:]]\{1,\}CLASSPATH[[:space:]]\{0,\}=/d' /root/.bashrc
	    sed -i '/^export[[:space:]]\{1,\}PATH[[:space:]]\{0,\}=/d' /root/.bashrc
	fi
	echo "" >>/root/.bashrc
	echo "export JAVA_HOME=/usr/java/latest" >>/root/.bashrc
	echo "export CLASSPATH=.:\$JAVA_HOME/lib/tools.jar:\$JAVA_HOME/lib/dt.jar">>/root/.bashrc
	echo "export PATH=\$JAVA_HOME/bin:\$PATH" >> /root/.bashrc
	source /root/.bashrc

### 格式化集群

	su -s /bin/bash hdfs -c 'yes Y | hadoop namenode -format >> /tmp/format.log 2>&1'

### 创建hadoop目录

	su -s /bin/bash hdfs -c "hadoop fs -chmod a+rw /"
	while read dir user group perm
	do
	     su -s /bin/bash hdfs -c "hadoop fs -mkdir -R $dir && hadoop fs -chmod -R $perm $dir && hadoop fs -chown -R $user:$group $dir"
	     echo "."
	done << EOF
	/tmp hdfs hadoop 1777 
	/tmp/hadoop-yarn mapred mapred 777
	/var hdfs hadoop 755 
	/var/log yarn mapred 1775 
	/var/log/hadoop-yarn/apps yarn mapred 1777
	/hbase hbase hadoop 755
	/user hdfs hadoop 777
	/user/history mapred hadoop 1777
	/user/root root hadoop 777
	/user/hive hive hadoop 777
	EOF

### hive中安装并初始化postgresql

	yum install postgresql-server postgresql-jdbc -y >/dev/null
	chkconfig postgresql on
	rm -rf /var/lib/pgsql/data
	rm -rf /var/run/postgresql/.s.PGSQL.5432
	service postgresql initdb

	sed -i '/listen/s/#//;/listen/s/localhost/*/' /var/lib/pgsql/data/postgresql.conf
	sed -i "s|#standard_coffforming_strings = on|standard_conforming_strings = off|g" /var/lib/pgsql/data/postgresql.conf
	echo "local    all             all             		               trust" > /var/lib/pgsql/data/pg_hba.conf
	echo "host     all             all             0.0.0.0/0	       trust" >> /var/lib/pgsql/data/pg_hba.conf

	sudo cat /var/lib/pgsql/data/postgresql.conf | grep -e listen -e standard_conforming_strings

	rm -rf /usr/lib/hive/lib/postgresql-jdbc.jar
	ln -s /usr/share/java/postgresql-jdbc.jar /usr/lib/hive/lib/postgresql-jdbc.jar

	su -c "cd ; /usr/bin/pg_ctl start -w -m fast -D /var/lib/pgsql/data" postgres
	su -c "cd ; /usr/bin/psql --command \"create user hiveuser with password 'redhat'; \" " postgres
	su -c "cd ; /usr/bin/psql --command \"CREATE DATABASE metastore owner=hiveuser;\" " postgres
	su -c "cd ; /usr/bin/psql --command \"GRANT ALL privileges ON DATABASE metastore TO hiveuser;\" " postgres
	su -c "cd ; /usr/bin/psql -U hiveuser -d metastore -f /usr/lib/hive/scripts/metastore/upgrade/postgres/hive-schema-0.10.0.postgres.sql" postgres
	su -c "cd ; /usr/bin/pg_ctl restart -w -m fast -D /var/lib/pgsql/data" postgres

## 总结

更多脚本，请关注github：[hadoop-install](https://github.com/javachen/hadoop-install)，你可以下载、使用并修改其中代码！





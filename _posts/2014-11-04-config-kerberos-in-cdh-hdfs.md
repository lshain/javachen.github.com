---
layout: post

title: HDFS配置Kerberos认证

category: hadoop

tags: [hadoop,kerberos,cdh]

description: 记录 CDH Hadoop 集群上配置 HDFS 集成 Kerberos 的过程，包括 Kerberos 的安装和 Hadoop 相关配置修改说明。

---

本文主要记录 CDH Hadoop 集群上配置 HDFS 集成 Kerberos 的过程，包括 Kerberos 的安装和 Hadoop 相关配置修改说明。

> 注意：
>
> 下面第一、二部分内容，摘抄自《[Hadoop的kerberos的实践部署](https://github.com/zouhc/MyHadoop/blob/master/doc/Hadoop%E7%9A%84kerberos%E7%9A%84%E5%AE%9E%E8%B7%B5%E9%83%A8%E7%BD%B2.md)》，主要是为了对 Hadoop 的认证机制和 Kerberos 认证协议做个简单介绍。在此，对原作者表示感谢。

# 1. Hadoop 的认证机制

简单来说，没有做 kerberos 认证的 Hadoop，只要有 client 端就能够连接上。而且，通过一个有 root 的权限的内网机器，通过创建对应的 linux 用户，就能够得到 Hadoop 集群上对应的权限。

而实行 Kerberos 后，任意机器的任意用户都必须现在 Kerberos 的 KDC 中有记录，才允许和集群中其它的模块进行通信。

详细介绍请参考 [Hadoop安全机制研究](http://dongxicheng.org/mapreduce/hadoop-security/)

# 2. Kerberos 认证协议

Kerberos 是一种网络认证协议，其设计目标是通过密钥系统为客户机/服务器应用程序提供强大的认证服务。

使用 Kerberos 时，一个客户端需要经过三个步骤来获取服务:

- **认证**：客户端向认证服务器发送一条报文，并获取一个含时间戳的 Ticket-Granting Ticket（TGT）。
- **授权**：客户端使用 TGT 向 Ticket-Granting Server（TGS）请求一个服务 Ticket。
- **服务请求**：客户端向服务器出示服务 Ticket ，以证实自己的合法性。

为此，Kerberos 需要 The Key Distribution Centers（KDC）来进行认证。KDC 只有一个 Master，可以带多个 slaves 机器。slaves 机器仅进行普通验证。Mater 上做的修改需要自动同步到 slaves。

另外，KDC 需要一个 admin，来进行日常的管理操作。这个 admin 可以通过远程或者本地方式登录。

# 3. 搭建 Kerberos

## 3.1 环境

我们在三个节点的服务器上安装 Kerberos，这三个节点上安装了 hadoop 集群，安装 hadoop 过程见：[使用yum安装CDH Hadoop集群](/2013/04/06/install-cloudera-cdh-by-yum/)。这三个节点机器分布为：cdh1、cdh2、cdh3。

- **操作系统**：CentOs 5.10
- **运行用户**：root

## 3.2 安装过程

### 3.2.1 准备工作

确认添加主机名解析到 `/etc/hosts` 文件中。

```bash
$ cat /etc/hosts
127.0.0.1       localhost

192.168.56.121 cdh1
192.168.56.122 cdh2
192.168.56.123 cdh3
```

### 3.2.2 安装 kdc server

在 cdh1 机器上安装 krb5-libs、krb5-server 和 krb5-workstation：

```bash
$ yum install yum install krb5-server krb5-libs krb5-auth-dialog krb5-workstation  -y
```

在其他节点（cdh2、cdh3）安装 krb5-devel、krb5-workstation ：

```bash
$ yum install krb5-devel krb5-workstation -y
```

### 3.2.3 修改配置文件

kdc 服务器（这里是安装在 cdh1 上的）涉及到三个配置文件：

```
/etc/krb5.conf
/var/kerberos/krb5kdc/kdc.conf
/var/kerberos/krb5kdc/kadm5.acl
```

hadoop 集群中其他服务器涉及到的 kerberos 配置文件：`/etc/krb5.conf`。

修改 `/etc/krb5.conf`，该文件包括KDC的配置信息。默认放在 `/usr/local/var/krb5kdc`。

```
$ cat /etc/krb5.conf 
  [logging]
   default = FILE:/var/log/krb5libs.log
   kdc = FILE:/var/log/krb5kdc.log
   admin_server = FILE:/var/log/kadmind.log

  [libdefaults]
   default_realm = JAVACHEN.COM
   dns_lookup_realm = false
   dns_lookup_kdc = false
   ticket_lifetime = 24h
   renew_lifetime = 7d
   forwardable = true
   renewable = true
   udp_preference_limit = 1
   default_tgs_enctypes = arcfour-hmac
   default_tkt_enctypes = arcfour-hmac 

  [realms]
   JAVACHEN.COM = {
    kdc = cdh1:88
    admin_server = cdh1:749
   }

  [domain_realm]
    .javachen.com = JAVACHEN.COM
    javachen.com = JAVACHEN.COM

  [kdc]
  profile=/var/kerberos/krb5kdc/kdc.conf
```

### 说明：

- `[logging]`：表示 server 端的日志的打印位置
- `[libdefaults]`：每种连接的默认配置，需要注意以下几个关键的小配置
   - `default_realm = JAVACHEN.COM`：默认的 realm，必须跟要配置的 realm 的名称一致。
   - `udp_preference_limit= 1`：禁止使用 udp 可以防止一个Hadoop中的错误
- `[realms]`：列举使用的 realm。
   - `kdc`：代表要 kdc 的位置。格式是 `机器:端口`
   - `admin_server`：代表 admin 的位置。格式是 `机器:端口`
   - `default_domain`：代表默认的域名
- `[appdefaults]`：可以设定一些针对特定应用的配置，覆盖默认配置。

修改 `/var/kerberos/krb5kdc/kdc.conf` ，该文件包含 Kerberos 的配置信息。例如，KDC 的位置，Kerbero 的 admin 的realms 等。需要所有使用的 Kerberos 的机器上的配置文件都同步。这里仅列举需要的基本配置。详细介绍参考：[krb5conf](http://web.mit.edu/~kerberos/krb5-devel/doc/admin/conf_files/krb5_conf.html)

```bash
$ cat /var/kerberos/krb5kdc/kdc.conf
[kdcdefaults]
 v4_mode = nopreauth
 kdc_ports = 88
 kdc_tcp_ports = 88

[realms]
 JAVACHEN.COM = {
  #master_key_type = aes256-cts
  acl_file = /var/kerberos/krb5kdc/kadm5.acl
  dict_file = /usr/share/dict/words
  admin_keytab = /var/kerberos/krb5kdc/kadm5.keytab
  supported_enctypes =  des3-hmac-sha1:normal arcfour-hmac:normal des-hmac-sha1:normal des-cbc-md5:normal des-cbc-crc:normal des-cbc-crc:v4 des-cbc-crc:afs3
  max_life = 24h
  max_renewable_life = 10d
  default_principal_flags = +renewable, +forwardable
 }
 ```

### 说明：

- `JAVACHEN.COM`： 是设定的 realms。名字随意。Kerberos 可以支持多个 realms，会增加复杂度。大小写敏感，一般为了识别使用全部大写。这个 realms 跟机器的 host 没有大关系。
- `master_key_type`：和 `supported_enctypes` 默认使用 `aes256-cts`。由于，JAVA 使用 `aes256-cts` 验证方式需要安装额外的 jar 包（后面再做说明）。推荐不使用，并且删除 aes256-cts。
- `acl_file`：标注了 admin 的用户权限，需要用户自己创建。文件格式是：`Kerberos_principal permissions [target_principal]  [restrictions]`
- `supported_enctypes`：支持的校验方式。
- `admin_keytab`：KDC 进行校验的 keytab。

> **关于AES-256加密**：
> 
> 对于使用centos5.6及以上的系统，默认使用AES-256来加密的。这就需要集群中的所有节点上安装 [Java Cryptography Extension (JCE) Unlimited Strength Jurisdiction Policy File](http://www.oracle.com/technetwork/java/javase/downloads/jce-6-download-429243.html)。
>
> 下载的文件是一个zip包，解开后，将里面的两个文件放到下面的目录中：`$JAVA_HOME/jre/lib/security`

修改 `/var/kerberos/krb5kdc/kadm5.acl` 如下：

```bash
$ cat /var/kerberos/krb5kdc/kadm5.acl 
  */admin@JAVACHEN.COM *
```

### 3.2.4 同步配置文件

将 kdc 中的 `/etc/krb5.conf` 拷贝到集群中其他服务器即可。

```bash
$ scp /etc/krb5.conf cdh2:/etc/krb5.conf
$ scp /etc/krb5.conf cdh3:/etc/krb5.conf
```

集群如果开启 selinux 了，拷贝后可能需要执行:

```bash
$ restorecon -R -v /etc/krb5.conf
```

### 3.2.5 创建数据库

在 cdh1 上运行初始化数据库命令。其中 `-r` 指定对应 realm。

```bash
$ kdb5_util create -r JAVACHEN.COM -s
```

该命令会在 `/var/kerberos/krb5kdc/` 目录下创建 principal 数据库。

如果遇到数据库已经存在的提示，可以把 `/var/kerberos/krb5kdc/` 目录下的 principal 的相关文件都删除掉。默认的数据库名字都是 principal。可以使用 `-d` 指定数据库名字。

### 3.2.6 启动服务

```bash
$ hkconfig --level 35 krb5kdc on
$ chkconfig --level 35 kadmin on
$ service krb5kdc start
$ service kadmin start
```

### 3.2.7 测试kerberos

关于 kerberos 的管理，可以使用 `kadmin.local` 或 `kadmin`，至于使用哪个，取决于账户和访问权限：

- 如果有访问 kdc 服务器的 root 权限，但是没有 kerberos admin 账户，使用 `kadmin.local`
- 如果没有访问 kdc 服务器的 root 权限，但是用 kerberos admin 账户，使用 `kadmin`

创建远程管理的管理员：

```bash
$ kadmin.local -q "addprinc root/admin"
    Authenticating as principal root/admin@JAVACHEN.COM with password.
    WARNING: no policy specified for root/admin@GJAVACHEN.COM; defaulting to no policy
    Enter password for principal "root/admin@JAVACHEN.COM": 
    Re-enter password for principal "root/admin@JAVACHEN.COM": 
    Principal "root/admin@JAVACHEN.COM" created.
```

密码不能为空，且需妥善保存。

在 cdh2 或者 cdh3 节点上测试创建的账户：

```bash
# log in with the root/admin principal -- works
$ kinit root/admin
    Authenticating as principal root/admin with password.
    Password for root/admin@JAVACHEN.COM:
    kadmin:
    kadmin: exit

# log in with kadmin.local as root -- works
[root]$ kadmin.local
    Authenticating as principal root/admin@JAVACHEN.COM with password.
    kadmin.local: 
    kadmin.local: exit
```

输入管理员密码后，没有报错即可。

然后，查看当前的认证用户：

```bash
$ kadmin -p root/admin
    Authenticating as principal root/admin with password.
    Password for root/admin@JAVACHEN.COM:

    # 查看principals
    kadmin: list_principals

    # 添加一个新的 principal
    kadmin:  addprinc user1
      WARNING: no policy specified for user1@JAVACHEN.COM; defaulting to no policy
      Enter password for principal "user1@JAVACHEN.COM":
      Re-enter password for principal "user1@JAVACHEN.COM":
      Principal "user1@JAVACHEN.COM" created.

    # 删除 principal
    kadmin:  delprinc user1
      Are you sure you want to delete the principal "user1@JAVACHEN.COM"? (yes/no): yes
      Principal "user1@JAVACHEN.COM" deleted.
      Make sure that you have removed this principal from all ACLs before reusing.

    kadmin: exit
```

也可以直接通过下面的命令来执行：

```bash
# 提示需要输入密码
$ kadmin -p root/admin -q "list_principals"
$ kadmin -p root/admin -q "addprinc user2"
$ kadmin -p root/admin -q "delprinc user2"

# 不用输入密码
$ kadmin.local -q "list_principals"
$ kadmin.local -q "addprinc user2"
$ kadmin.local -q "delprinc user2"
```

获取 test 用户的 ticket：

```bash
# 通过用户名和密码进行登录
$ kinit test
Password for test@JAVACHEN.COM:

$ klist  -e
Ticket cache: FILE:/tmp/krb5cc_0
Default principal: test@JAVACHEN.COM

Valid starting     Expires            Service principal
11/07/14 15:29:02  11/08/14 15:29:02  krbtgt/JAVACHEN.COM@JAVACHEN.COM
  renew until 11/17/14 15:29:02, Etype (skey, tkt): AES-128 CTS mode with 96-bit SHA-1 HMAC, AES-128 CTS mode with 96-bit SHA-1 HMAC


Kerberos 4 ticket cache: /tmp/tkt0
klist: You have no tickets cached
```

销毁该 ticket：

```bash
$ kdestroy

$ klist
klist: No credentials cache found (ticket cache FILE:/tmp/krb5cc_0)


Kerberos 4 ticket cache: /tmp/tkt0
klist: You have no tickets cached
```

更新 ticket：

```bash
$ kinit root/admin
  Password for root/admin@JAVACHEN.COM:

$  klist
  Ticket cache: FILE:/tmp/krb5cc_0
  Default principal: root/admin@JAVACHEN.COM

  Valid starting     Expires            Service principal
  11/07/14 15:33:57  11/08/14 15:33:57  krbtgt/JAVACHEN.COM@JAVACHEN.COM
    renew until 11/17/14 15:33:57


  Kerberos 4 ticket cache: /tmp/tkt0
  klist: You have no tickets cached

$ kinit -R

$ klist
  Ticket cache: FILE:/tmp/krb5cc_0
  Default principal: root/admin@JAVACHEN.COM

  Valid starting     Expires            Service principal
  11/07/14 15:34:05  11/08/14 15:34:05  krbtgt/JAVACHEN.COM@JAVACHEN.COM
    renew until 11/17/14 15:33:57


  Kerberos 4 ticket cache: /tmp/tkt0
  klist: You have no tickets cached
```

# 4. hdfs 上配置 kerberos

## 4.1 创建认证规则

Kerberos principal 用于在 kerberos 加密系统中标记一个唯一的身份。kerberos 为 kerberos principal 分配 tickets 使其可以访问由 kerberos 加密的 hadoop 服务。

对于 hadoop，principals 的格式为 `username/fully.qualified.domain.name@YOUR-REALM.COM`。

通过 yum 源安装的 cdh 集群中，NameNode 和 DataNode 是通过 hdfs 启动的，故为集群中每个服务器节点添加两个principals：hdfs、HTTP。

在 KCD server 上（这里是 cdh1）创建 hdfs principal：

```bash
addprinc -randkey hdfs/cdh1@JAVACHEN.COM
addprinc -randkey hdfs/cdh2@JAVACHEN.COM
addprinc -randkey hdfs/cdh3@JAVACHEN.COM
```

创建 HTTP principal：

```bash
addprinc -randkey HTTP/cdh1@JAVACHEN.COM
addprinc -randkey HTTP/cdh2@JAVACHEN.COM
addprinc -randkey HTTP/cdh3@JAVACHEN.COM
```

创建完成后，查看：

```bash
listprincs
```

## 4.2 创建keytab文件

keytab 是包含 principals 和加密 principal key 的文件。

keytab 文件对于每个 host 是唯一的，因为 key 中包含 hostname。keytab 文件用于不需要人工交互和保存纯文本密码，实现到 kerberos 上验证一个主机上的 principal。

因为服务器上可以访问 keytab 文件即可以以 principal 的身份通过 kerberos 的认证，所以，keytab 文件应该被妥善保存，应该只有少数的用户可以访问


创建包含 hdfs principal 和 host principal 的 hdfs keytab：

```bash
xst -norandkey -k hdfs.keytab hdfs/fully.qualified.domain.name host/fully.qualified.domain.name
```

创建包含 mapred principal 和 host principal 的 mapred keytab：

```bash
xst -norandkey -k mapred.keytab mapred/fully.qualified.domain.name host/fully.qualified.domain.name
```

> **注意**：
> 上面的方法使用了xst的norandkey参数，有些kerberos不支持该参数。
> 当不支持该参数时有这样的提示：`Principal -norandkey does not exist.`，需要使用下面的方法来生成keytab文件。

先在 KCD server 上（这里是 cdh1）生成独立key：

```bash
$ cd /etc/hadoop/conf

$ kadmin.local
kadmin: xst  -k hdfs-unmerged.keytab  hdfs/cdh1@JAVACHEN.COM
kadmin: xst  -k hdfs-unmerged.keytab  hdfs/cdh2@JAVACHEN.COM
kadmin: xst  -k hdfs-unmerged.keytab  hdfs/cdh3@JAVACHEN.COM

kadmin: xst  -k HTTP.keytab  hdfs/cdh1@JAVACHEN.COM
kadmin: xst  -k HTTP.keytab  hdfs/cdh2@JAVACHEN.COM
kadmin: xst  -k HTTP.keytab  hdfs/cdh3@JAVACHEN.COM
```

这样，就会在 `/etc/hadoop/conf` 目录下生成 `hdfs-unmerged.keytab` 和 `HTTP.keytab` 两个文件，接下来合并者两个文件为 `hdfs.keytab`。

使用 `ktutil` 合并前面创建的 keytab ：

```bash
$ cd /etc/hadoop/conf

$ ktutil
ktutil: rkt hdfs-unmerged.keytab
ktutil: rkt HTTP.keytab
ktutil: wkt hdfs.keytab
```
同样，会在 /etc/hadoop/conf 目录下生成 hdfs.keytab。

使用 klist 显示 hdfs.keytab 文件列表：

```bash
$ klist -ket  hdfs.keytab
Keytab name: FILE:hdfs.keytab
KVNO Timestamp         Principal
---- ----------------- --------------------------------------------------------
   3 11/04/14 16:40:57 hdfs/cdh1@JAVACHEN.COM (AES-128 CTS mode with 96-bit SHA-1 HMAC)
   3 11/04/14 16:40:57 hdfs/cdh1@JAVACHEN.COM (Triple DES cbc mode with HMAC/sha1)
   3 11/04/14 16:40:57 hdfs/cdh1@JAVACHEN.COM (ArcFour with HMAC/md5)
   3 11/04/14 16:40:57 hdfs/cdh1@JAVACHEN.COM (DES with HMAC/sha1)
   3 11/04/14 16:40:57 hdfs/cdh1@JAVACHEN.COM (DES cbc mode with RSA-MD5)
   3 11/04/14 16:40:57 HTTP/cdh1@JAVACHEN.COM (AES-128 CTS mode with 96-bit SHA-1 HMAC)
   3 11/04/14 16:40:57 HTTP/cdh1@JAVACHEN.COM (Triple DES cbc mode with HMAC/sha1)
   3 11/04/14 16:40:57 HTTP/cdh1@JAVACHEN.COM (ArcFour with HMAC/md5)
   3 11/04/14 16:40:57 HTTP/cdh1@JAVACHEN.COM (DES with HMAC/sha1)
   3 11/04/14 16:40:57 HTTP/cdh1@JAVACHEN.COM (DES cbc mode with RSA-MD5)
   3 11/04/14 16:40:57 hdfs/cdh2@JAVACHEN.COM (AES-128 CTS mode with 96-bit SHA-1 HMAC)
   3 11/04/14 16:40:57 hdfs/cdh2@JAVACHEN.COM (Triple DES cbc mode with HMAC/sha1)
   3 11/04/14 16:40:57 hdfs/cdh2@JAVACHEN.COM (ArcFour with HMAC/md5)
   3 11/04/14 16:40:57 hdfs/cdh2@JAVACHEN.COM (DES with HMAC/sha1)
   3 11/04/14 16:40:57 hdfs/cdh2@JAVACHEN.COM (DES cbc mode with RSA-MD5)
   3 11/04/14 16:40:57 HTTP/cdh2@JAVACHEN.COM (AES-128 CTS mode with 96-bit SHA-1 HMAC)
   3 11/04/14 16:40:57 HTTP/cdh2@JAVACHEN.COM (Triple DES cbc mode with HMAC/sha1)
   3 11/04/14 16:40:57 HTTP/cdh2@JAVACHEN.COM (ArcFour with HMAC/md5)
   3 11/04/14 16:40:57 HTTP/cdh2@JAVACHEN.COM (DES with HMAC/sha1)
   3 11/04/14 16:40:57 HTTP/cdh2@JAVACHEN.COM (DES cbc mode with RSA-MD5)
   3 11/04/14 16:40:57 hdfs/cdh3@JAVACHEN.COM (AES-128 CTS mode with 96-bit SHA-1 HMAC)
   3 11/04/14 16:40:57 hdfs/cdh3@JAVACHEN.COM (Triple DES cbc mode with HMAC/sha1)
   3 11/04/14 16:40:57 hdfs/cdh3@JAVACHEN.COM (ArcFour with HMAC/md5)
   3 11/04/14 16:40:57 hdfs/cdh3@JAVACHEN.COM (DES with HMAC/sha1)
   3 11/04/14 16:40:57 hdfs/cdh3@JAVACHEN.COM (DES cbc mode with RSA-MD5)
   3 11/04/14 16:40:57 HTTP/cdh3@JAVACHEN.COM (AES-128 CTS mode with 96-bit SHA-1 HMAC)
   3 11/04/14 16:40:57 HTTP/cdh3@JAVACHEN.COM (Triple DES cbc mode with HMAC/sha1)
   3 11/04/14 16:40:57 HTTP/cdh3@JAVACHEN.COM (ArcFour with HMAC/md5)
   3 11/04/14 16:40:57 HTTP/cdh3@JAVACHEN.COM (DES with HMAC/sha1)
   3 11/04/14 16:40:57 HTTP/cdh3@JAVACHEN.COM (DES cbc mode with RSA-MD5)
```

验证是否正确合并了key，使用合并后的keytab，分别使用hdfs和host principals来获取证书。

```bash
$ kinit -k -t /etc/hadoop/conf/hdfs.keytab hdfs/cdh3@JAVACHEN.COM
$ kinit -k -t /etc/hadoop/conf/hdfs.keytab HTTP/cdh3@JAVACHEN.COM
```

如果出现错误：`kinit: Key table entry not found while getting initial credentials`，
则上面的合并有问题，重新执行前面的操作。

## 4.3 部署kerberos keytab文件

拷贝 hdfs.keytab 文件到其他节点的 /etc/hadoop/conf 目录

```bash
$ scp hdfs.keytab cdh2:/etc/hadoop/conf
$ scp hdfs.keytab cdh3:/etc/hadoop/conf
```

并设置权限，分别在 cdh1、cdh2、cdh3 上执行：

```bash
$ chown hdfs:hadoop /etc/hadoop/conf/hdfs.keytab
$ chmod 400 /etc/hadoop/conf/hdfs.keytab
```

由于 keytab 相当于有了永久凭证，不需要提供密码(如果修改kdc中的principal的密码，则该keytab就会失效)，所以其他用户如果对该文件有读权限，就可以冒充 keytab 中指定的用户身份访问 hadoop，所以 keytab 文件需要确保只对 owner 有读权限(0400)

## 4.4 修改 hdfs 配置文件

先停止集群：

```bash
for x in `cd /etc/init.d ; ls hadoop-*` ; do sudo service $x stop ; done
```

在集群中所有节点的 core-site.xml 文件中添加下面的配置:

```xml
<property>
  <name>hadoop.security.authentication</name>
  <value>kerberos</value>
</property>
 
<property>
  <name>hadoop.security.authorization</name>
  <value>true</value>
</property>
```

`hadoop.security.authentication` 默认是 `simple` 方式，也就是基于 linux 操作系统的验证方式，用户端调用 whoami 命令，然后 RPC call 给服务端，恶意用户很容易在其他 host 伪造一个相同的用户。这里我们改为 `kerberos`。

在集群中所有节点的 hdfs-site.xml 文件中添加下面的配置：

```xml
<property>
  <name>dfs.block.access.token.enable</name>
  <value>true</value>
</property>
<property>  
  <name>dfs.datanode.data.dir.perm</name>  
  <value>700</value>  
</property>
<property>
  <name>dfs.namenode.keytab.file</name>
  <value>/etc/hadoop/conf/hdfs.keytab</value>
</property>
<property>
  <name>dfs.namenode.kerberos.principal</name>
  <value>hdfs/_HOST@JAVACHEN.COM</value>
</property>
<property>
  <name>dfs.namenode.kerberos.https.principal</name>
  <value>HTTP/_HOST@JAVACHEN.COM</value>
</property>
<property>
  <name>dfs.secondary.namenode.keytab.file</name>
  <value>/etc/hadoop/conf/hdfs.keytab</value>
</property>
<property>
  <name>dfs.secondary.namenode.kerberos.principal</name>
  <value>hdfs/_HOST@JAVACHEN.COM</value>
</property>
<property>
  <name>dfs.secondary.namenode.kerberos.https.principal</name>
  <value>HTTP/_HOST@JAVACHEN.COM</value>
</property>
<property>
  <name>dfs.datanode.address</name>
  <value>0.0.0.0:1004</value>
</property>
<property>
  <name>dfs.datanode.http.address</name>
  <value>0.0.0.0:1006</value>
</property>
<property>
  <name>dfs.datanode.keytab.file</name>
  <value>/etc/hadoop/conf/hdfs.keytab</value>
</property>
<property>
  <name>dfs.datanode.kerberos.principal</name>
  <value>hdfs/_HOST@JAVACHEN.COM</value>
</property>
<property>
  <name>dfs.datanode.kerberos.https.principal</name>
  <value>HTTP/_HOST@JAVACHEN.COM</value>
</property>
```

配置中有几点要注意的：

- 1. `dfs.datanode.address`表示 data transceiver RPC server 所绑定的 hostname 或 IP 地址，如果开启 security，端口号必须小于 `1024`(privileged port)，否则的话启动 datanode 时候会报 `Cannot start secure cluster without privileged resources` 错误
- 2. principal 中的 instance 部分可以使用 `_HOST` 标记，系统会自动替换它为全称域名
- 3. 如果开启了 security, hadoop 会对 hdfs block data(由 `dfs.data.dir` 指定)做 permission check，方式用户的代码不是调用hdfs api而是直接本地读block data，这样就绕过了kerberos和文件权限验证，管理员可以通过设置 `dfs.datanode.data.dir.perm` 来修改 datanode 文件权限，这里我们设置为700

如果你像开启 SSL，请添加：

```xml
<property>
  <name>dfs.http.policy</name>
  <value>HTTPS_ONLY</value>
</property>
```

如果 HDFS 配置了 QJM HA，则添加：

```xml
<property>
  <name>dfs.journalnode.keytab.file</name>
  <value>/etc/hadoop/conf/hdfs.keytab</value>
</property>
<property>
  <name>dfs.journalnode.kerberos.principal</name>
  <value>hdfs/_HOST@JAVACHEN.COM</value>
</property>
<property>
  <name>dfs.journalnode.kerberos.https.principal</name>
  <value>HTTP/_HOST@JAVACHEN.COM</value>
</property>
```

如果想配置 WebHDFS 启用授权验证，则添加：

```xml
<property>
  <name>dfs.webhdfs.enabled</name>
  <value>true</value>
</property>

<property>
  <name>dfs.web.authentication.kerberos.principal</name>
  <value>HTTP/_HOST@JAVACHEN.COM</value>
</property>

<property>
  <name>dfs.web.authentication.kerberos.keytab</name>
  <value>/etc/hadoop/conf/hdfs.keytab</value>
</property>
```

## 4.5 检查集群上的 HDFS 和本地文件的权限

请参考 [Verify User Accounts and Groups in CDH 5 Due to Security](http://www.cloudera.com/content/cloudera/en/documentation/core/latest/topics/cdh_sg_users_groups_verify.html) 或者 [Hadoop in Secure Mode](http://hadoop.apache.org/docs/r2.5.0/hadoop-project-dist/hadoop-common/SecureMode.html)。

## 4.6 启动 NameNode

启动之前，请确认 JCE jar 已经替换，请参考前面的说明。

在 cdh1（安装了 NameNode 的节点）上先使用 `kinit` 的方式登陆，如果可以登陆，检查是否使用了正确的 JCE jar 包，然后就是检查 keytab 的路径及权限。

```bash
$ echo root|kinit root/admin
```

这里 root 为之前创建的 root/admin 的密码。

获取 cdh1的 ticket：

```bash
$ kinit -k -t /etc/hadoop/conf/hdfs.keytab hdfs/cdh1@JAVACHEN.COM
```

然后启动服务，观察日志：

```bash
$ /etc/init.d/hadoop-hdfs-namenode start
```

验证 NameNode 是否启动，一是打开 web 界面查看启动状态，一是运行下面命令查看 hdfs：

```bash
$ hadoop fs -ls /
Found 4 items
drwxrwxrwx   - yarn hadoop          0 2014-06-26 15:24 /logroot
drwxrwxrwt   - hdfs hadoop          0 2014-11-04 10:44 /tmp
drwxr-xr-x   - hdfs hadoop          0 2014-08-10 10:53 /user
drwxr-xr-x   - hdfs hadoop          0 2013-05-20 22:52 /var
```

如果在你的凭据缓存中没有有效的kerberos ticket，执行上面命令将会失败，可以使用klist来查看是否有有有效的ticket。

需要通过 kinit 来获取ticket。如果没有有效的ticket，将会出现下面的错误：

```
14/11/04 12:08:12 WARN ipc.Client: Exception encountered while connecting to the server : javax.security.sasl.SaslException:
GSS initiate failed [Caused by GS***ception: No valid credentials provided (Mechanism level: Failed to find any Kerberos tgt)]
Bad connection to FS. command aborted. exception: Call to cdh1/192.168.56.121:8020 failed on local exception: java.io.IOException:
javax.security.sasl.SaslException: GSS initiate failed [Caused by GS***ception: No valid credentials provided (Mechanism level: Failed to find any Kerberos tgt)]
```

## 4.6 启动DataNode

DataNode 需要通过 JSVC 启动。首先检查是否安装了 JSVC 命令，然后配置环境变量。

查看是否安装了 JSVC：

```bash
$ ls /usr/lib/bigtop-utils/
bigtop-detect-classpath  bigtop-detect-javahome  bigtop-detect-javalibs  jsvc
```

然后编辑 `/etc/default/hadoop-hdfs-datanode`，取消注释并设置 `JSVC_HOME`，修改如下：

```bash
export HADOOP_PID_DIR=/var/run/hadoop-hdfs
export HADOOP_LOG_DIR=/var/log/hadoop-hdfs
export HADOOP_NAMENODE_USER=hdfs
export HADOOP_SECONDARYNAMENODE_USER=hdfs
export HADOOP_DATANODE_USER=hdfs
export HADOOP_IDENT_STRING=hdfs

export HADOOP_SECURE_DN_USER=hdfs
export HADOOP_SECURE_DN_PID_DIR=/var/run/hadoop-hdfs
export HADOOP_SECURE_DN_LOG_DIR=/var/log/hadoop-hdfs
export JSVC_HOME=/usr/lib/bigtop-utils
```

分别在 cdh2、cdh3 获取 ticket 然后启动服务：

```bash
$ echo root|kinit root/admin  #root 为 root/admin 的密码

$ kinit -k -t /etc/hadoop/conf/hdfs.keytab hdfs/cdh1@JAVACHEN.COM

$ service hadoop-hdfs-datanode start
```

观看 cdh1 上 NameNode 日志，出现下面日志表示启动成功：

```
14/11/04 17:21:41 INFO security.UserGroupInformation: 
Login successful for user hdfs/cdh2@JAVACHEN.COM using keytab file /etc/hadoop/conf/hdfs.keytab
```

# 5. 总结

本文介绍了 CDH Hadoop 集成 kerberos 认证的过程，其中主要需要注意以下几点：

- 1. 配置 hosts
- 2. 确保 kerberos 客户端和服务端连通
- 3. 替换 JRE 自带的 JCE jar 包
- 4. 为 DataNode 设置运行用户并配置 `JSVC_HOME`
- 5. 启动服务前，先获取 ticket 再运行相关命令

接下来就是配置 Hadoop 集群中其他服务以集成 kerberos 认证，由于篇幅原因，后面再做说明。

# 6. 参考文章

- [Hadoop的kerberos的实践部署](https://github.com/zouhc/MyHadoop/blob/master/doc/Hadoop%E7%9A%84kerberos%E7%9A%84%E5%AE%9E%E8%B7%B5%E9%83%A8%E7%BD%B2.md)
- [hadoop 添加kerberos认证](http://blog.chinaunix.net/uid-1838361-id-3243243.html)
- [YARN & HDFS2 安装和配置Kerberos](http://blog.csdn.net/lalaguozhe/article/details/11570009)
- [Kerberos basics and installing a KDC](http://blog.godatadriven.com/kerberos_kdc_install.html)
- [Hadoop, Hbase, Zookeeper安全实践](http://www.wuzesheng.com/?p=2345)
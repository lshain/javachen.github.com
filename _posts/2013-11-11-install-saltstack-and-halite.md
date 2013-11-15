---
layout: post
title: 安装saltstack和halite
category: saltstack
tags: [saltstack,halite]
description: 安装saltstack和halite
keywords: saltstack,halite
---
{% include JB/setup %}

本文记录安装saltstack和halite过程。

首先准备两台rhel或者centos虚拟机sk1和sk2，sk1用于安装master，sk2安装minion。

# 下载yum源

```ruby
rpm -ivh http://mirrors.sohu.com/fedora-epel/6/x86_64/epel-release-6-8.noarch.rpm
```

# 安装依赖

```bash
yum install python-jinja2 -y
```

# 安装saltstack

在sk1上安装master：

```
yum install salt-master
```

在sk1上安装minion：

```
yum install salt-minion
```
<!-- more -->

# 关闭防火墙

```
iptables -F
setenforce 0
```

# 修改配置文件

```
/etc/salt/master
interface: 0.0.0.0
auto_accept: True
```

```
/etc/salt/minion
master: sk1
id: sk2
```

# 启动

分别在sk1和sk2上配置开机启动：

```
chkconfig salt-master on
chkconfig salt-minion on
```

分别在sk1和sk2上以service方式启动：

```
/etc/init.d/salt-master start
/etc/init.d/salt-minion start
```

你可以在sk2上以后台运行salt-minion

```
salt-minion -d
```

或者在sk2上debug方式运行：

```
salt-minion -l debug
```

# 排错

如果启动提示如下错误：

```
[root@sk1 vagrant]# /etc/init.d/salt-master start
Starting salt-master daemon: Traceback (most recent call last):
 File "/usr/bin/salt-master", line 10, in <module>
   salt_master()
 File "/usr/lib/python2.6/site-packages/salt/scripts.py", line 20, in salt_master
   master.start()
 File "/usr/lib/python2.6/site-packages/salt/__init__.py", line 114, in start
   if check_user(self.config['user']):
 File "/usr/lib/python2.6/site-packages/salt/utils/verify.py", line 296, in check_user
   if user in e.gr_mem] + [pwuser.gid])
AttributeError: 'pwd.struct_passwd' object has no attribute 'gid'
```

请下载saltstack源码重新编译：

```
wget https://github.com/saltstack/salt/archive/develop.zip
unzip develop
cd salt-develop/
python2.6 setup.py install
```

# salt minion和master的认证过程

- minion在第一次启动时，会在/etc/salt/pki/minion/下自动生成minion.pem(private key), minion.pub(public key)，然后将minion.pub发送给master
- master在接收到minion的public key后，通过salt-key命令accept minion public key，这样在master的/etc/salt/pki/master/minions下的将会存放以minion id命名的public key, 然后master就能对minion发送指令了

master上执行：

```
[root@sk1 pillar]# salt-key -L
Accepted Keys:
Unaccepted Keys:
Rejected Keys:
```

接受所有的认证请求：

```
[root@sk1 pillar]# salt-key -A
```

再次查看：

```
[root@sk1 pillar]# salt-key -L
Accepted Keys:
sk2
Unaccepted Keys:
Rejected Keys:
```


`salt-key`更多说明：[http://docs.saltstack.com/ref/cli/salt-key.html](http://docs.saltstack.com/ref/cli/salt-key.html)

# 测试运行

在master上运行ping：

```
[root@sk1 pillar]# salt '*' test.ping
sk2:salt '*' test.ping
    True
```


True表明测试成功。


# 安装halite

## 下载代码

```
git clone https://github.com/saltstack/halite
```

## 生成index.html

```
cd halite/halite
./genindex.py -C
```

## 安装salt-api

```
yum install salt-api
```

## 配置salt master文件

配置salt的master文件，添加：

```python
rest_cherrypy:
 host: 0.0.0.0
 port: 8080
 debug: true
 static: /root/halite/halite
 app: /root/halite/halite/index.html
external_auth:
   pam:
     admin:
	 - .*
	 - '@runner'
	 - '@wheel'
```

重启master;

```
/etc/init.d/salt-master restart
```

## 添加登陆用户

```
useradd admin
echo admin|passwd –stdin admin
```

## 启动 salt-api

```
cd halite/halite
python2.6 server_bottle.py -d -C -l debug -s cherrypy
```

然后打开`http://ip:8080/app`，通过admin/admin登陆即可。


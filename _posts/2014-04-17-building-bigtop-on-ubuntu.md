---
layout: post
title: Ubuntu系统编译Bigtop
description: Bigtop是去年apache基金会推出的一个对Hadoop及其周边生态进行打包，分发和测试的工具。本篇文章尝试在linux-mint系统上编译bigtop源代码并生成deb包。
category: hadoop
tags: 
 - bigtop
published: true
---

# 1. 安装系统依赖

## 系统更新并安装新的包

```bash
sudo apt-get update

sudo apt-get install -y cmake git-core git-svn subversion checkinstall build-essential dh-make debhelper ant ant-optional autoconf automake liblzo2-dev libzip-dev sharutils libfuse-dev reprepro libtool libssl-dev asciidoc xmlto ssh curl

sudo apt-get install -y devscripts

sudo apt-get build-dep pkg-config
```

## 安装Sun JDK 6或OpenJDK 7

Sun JDK 6:

先下载jdk-6u31-linux-x64.bin,然后执行以下脚本：

```bash
chmod a+x jdk-6u31-linux-x64.bin
./jdk-6u31-linux-x64.bin # will prompt to confirm the license agreement
sudo mv jdk1.6.0_31 /usr/lib/jvm
sudo update-alternatives --install "/usr/bin/java" "java" "/usr/lib/jvm/jdk1.6.0_31/bin/java" 2
sudo update-alternatives --install "/usr/bin/javac" "javac" "/usr/lib/jvm/jdk1.6.0_31/bin/javac" 2
sudo update-alternatives --config java # will prompt, and choose the highest possible number
```

OpenJDK 7:

> OpenJDK 6 fails to build Hadoop because of issue MAPREDUCE-4115 Need to use [OpenJDK 7](http://www.shinephp.com/install-jdk-7-on-ubuntu/)

```bash
sudo apt-get install openjdk-7-jdk
sudo update-alternatives --install "/usr/bin/java" "java" "/usr/lib/jvm/java-7-openjdk-amd64/bin/java" 2
sudo update-alternatives --install "/usr/bin/javac" "javac" "/usr/lib/jvm/java-7-openjdk-amd64/bin/javac" 2
sudo update-alternatives --config java # will prompt, and choose the highest possible number
cd /usr/lib/jvm
sudo rm default-java
sudo ln -s java-7-openjdk-amd64 default-java
```

## 安装Maven 3

```bash
wget http://apache.petsads.us/maven/maven-3/3.0.5/binaries/apache-maven-3.0.5-bin.tar.gz
tar -xzvf apache-maven-3.0.5-bin.tar.gz

sudo mkdir /usr/local/maven-3
sudo mv apache-maven-3.0.5 /usr/local/maven-3/
```

## 安装Apache Forrest

```bash
cd $HOME
wget http://archive.apache.org/dist/forrest/0.9/apache-forrest-0.9.tar.gz
tar -xzvf /home/ubuntu/Downloads/apache-forrest-0.9.tar.gz
# modify certain lines in the forrest-validate xml, otherwise build fails. either sed or nano are fine.
sed -i 's/property name="forrest.validate.sitemap" value="${forrest.validate}"/property name="forrest.validate.sitemap" value="false"/g' apache-forrest-0.9/main/targets/validate.xml
sed -i 's/property name="forrest.validate.stylesheets" value="${forrest.validate}"/property name="forrest.validate.stylesheets" value="false"/g' apache-forrest-0.9/main/targets/validate.xml
sed -i 's/property name="forrest.validate.stylesheets.failonerror" value="${forrest.validate.failonerror}"/property name="forrest.validate.stylesheets.failonerror" value="false"/g' apache-forrest-0.9/main/targets/validate.xml
sed -i 's/property name="forrest.validate.skins.stylesheets" value="${forrest.validate.skins}"/property name="forrest.validate.skins.stylesheets" value="false"/g' apache-forrest-0.9/main/targets/validate.xml
```

## 安装protobuf

protobuf版本至少需要2.4.0,具体版本视hadoop版本而定，例如`hadoop-2.4.0`即需要依赖`protobuf-2.5.0`

到 Protocol Buffers 的官网[https://code.google.com/p/protobuf/](https://code.google.com/p/protobuf/)下载2.5.0的安装源文件进行安装：

```bash
tar -zxf protobuf-2.5.0.tar.gz
cd protobuf-2.5.0
./configure --prefix=/usr/local/protobuf
make check
make install
```

安装完成后，执行 protoc –vresion 验证是否安装成功。

# 2. 设置环境变量

创建/etc/profile.d/bigtop.sh并添加如下内容：

```bash
export JAVA_HOME="/usr/lib/jvm/default-java"
export JAVA5_HOME="/usr/lib/jvm/default-java"
export JVM_ARGS="-Xmx1024m -XX:MaxPermSize=512m"
export MAVEN_HOME="/usr/local/maven-3/apache-maven-3.0.5"
export MAVEN_OPTS="-Xmx1024m -XX:MaxPermSize=512m"
PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:$MAVEN_HOME/bin"
```

将`FORREST_HOME`添加到`~/.bashrc`:

```bash
export FORREST_HOME="$HOME/apache-forrest-0.9"
```

# 3. 下载并编译源代码

```bash
git clone git://git.apache.org/bigtop.git # put files under bigtop directory
cd bigtop
# you can also use a different branch, e.g. git checkout branch-0.7
```

编译源代码：

```bash
./check-env.sh # make sure all the required environment variables are set
make realclean
make bigtop-utils-deb # build this project first
make hadoop-deb # to build just for hadoop first
make deb # build all the rest
```

# 4. 排错

1) bigtop-0.7依赖的是`protobuf-2.4.0`而不是`protobuf-2.5.0`	

2) 运行`make bigtop-utils-deb`时出现`more change data or trailer`的异常，请将操作系统的LANG修改为`en_US`

# 5. 参考文章

- [1] [Building Bigtop on Ubuntu](https://cwiki.apache.org/confluence/display/BIGTOP/Building+Bigtop+on+Ubuntu)



---
layout: post
title: Centos上安装 OpenNebula Management Console
categories:
- CloudComputing
tags:
- OpenNebula

---
<p>我们可以通过onehost/onevm/onevnet等等 这些命令行工具来管理 OpenNebula 云计算平台，也可以通过OpenNebula项目组开发的web控制台来访问OpenNebula。OpenNebula项目组提供了两个web程序来管理OpenNebula，一个即本文提到的<a href="http://dev.opennebula.org/projects/management-console" target="_blank">OpenNebula Management Console</a>，一个是<a href="http://opennebula.org/documentation:rel2.2:sunstone" target="_blank">The Cloud Operations Center</a>，前者需要额外<a href="http://dev.opennebula.org/attachments/download/128/onemc-1.0.0.tar.gz" target="_blank">下载</a>，后者内嵌与OpenNebula安装包内。</p>

<p>OpenNebula 2.2提供的文档相对较少并且零散，在网上可以找到一篇关于OpenNebula Management Console安装的文章：<br />
《<a href="http://www.vpsee.com/2011/03/install-opennebula-management-console-on-centos/" target="_blank">安装 OpenNebula 基于 Web 的管理控制台》</a>，我的这篇文章参考了这篇文章并加以完善，这篇文章对我完成OpenNebula Management Console的安装起到很大帮助，感谢原文作者。</p>

<p>我的安装环境：centos5.6 ，OpenNebula2.2，在安装OpenNebula2.2之前，我执行了yum update，即更新系统的软件。</p>

<p><span style="color: #ff0000;"><!--more-->以下来自<a href="http://dev.opennebula.org/projects/management-console/wiki">官方文档</a>：</span>
<h3><span style="color: #0000ff;">要求:</span></h3>
<ul>
	<li>Apache or whatever webserver.</li>
	<li>php5 (May work with php4 but not tested)</li>
	<li>php-adodb<br />
And you need a db driver for adodb: php-mysql or php-pgsql.</li>
	<li>Mysql or postgresql database</li>
	<li>php-curl</li>
	<li>php-xmlrpc</li>
	<li>php-pear: pecl install uploadprogress (Only if you want a nice upload progress bar)</li>
</ul>
如果你想查看更多资料，您可以去官网：<a href="http://dev.opennebula.org/projects/management-console/wiki">OpenNebula Management Console Wiki</a>；如果你想在ubutun上安装OpenNebula Management Console，参照这篇文章：<a href="http://dev.opennebula.org/projects/management-console/wiki/onemc_install_ubuntu">Install onemc on ubuntu</a></p>

<p><span style="color: #ff0000;">以下为安装过程：</span>
<h3><span style="color: #0000ff;">必要软件</span></h3>
<pre escaped="true" lang="shell"># yum -y install php mysql-server httpd mysql-connector-odbc mysql-devel libdbi-dbd-mysql</pre>
<h3><span style="color: #ff0000; font-size: 15px;">安装php-adodb</span></h3>
从<a href="http://sourceforge.net/projects/adodb/files/adodb-php5-only">http://sourceforge.net/projects/adodb/files/adodb-php5-only</a>下载
<strong><span style="color: #ff0000;">注意：</span></strong>将adobd包解压拷贝到/var/www/html/onemc/include/，将文件名改为adobd
<h3><span style="color: #0000ff;">安装php的扩展</span></h3>
<pre escaped="true" lang="shell"># yum -y install php-gd php-xml php-mbstring php-ldap php-pear php-xmlrpc php-curl php-mysql</pre>
<h3><span style="color: #0000ff; font-size: 15px;">安装apache扩展</span></h3>
<pre escaped="true" lang="shell"># yum -y install httpd-manual mod_ssl mod_perl mod_auth_mysql</pre>
<h3><span style="color: #ff0000;">修改配置文件权限</span></h3>
<pre escaped="true" lang="shell"># chmod 644 /var/www/html/onemc/include/config.php</pre>
我下载的是OpenNebula 2.2其中/config.php的权限很特别，如果你从浏览器访问onemc时候页面都是空白的，你可以看看日志（我使用的是httpd，日志在httpd.log），可以看到日志中提示没有权限访问/var/www/html/onemc/include/config.php
<h3><span style="color: #0000ff;">下载 onemc</span></h3>
下载和解压 onemc-1.0.0.tar.gz 后直接放在 apache 的默认目录里：
<pre escaped="true" lang="shell"># cd /var/www/html
# wget http://dev.opennebula.org/attachments/download/128/onemc-1.0.0.tar.gz
# tar zxvf onemc-1.0.0.tar.gz
# cd onemc</pre>
<h3><span style="color: #0000ff; font-size: 15px;">配置数据库</span></h3>
<pre escaped="true" lang="shell"># mysql -uroot -p
Enter password:
mysql&gt; create database onemc;
mysql&gt; create user 'oneadmin'@'localhost' identified by 'oneadmin';
mysql&gt; grant all privileges on onemc.* to 'oneadmin'@'localhost';
mysql&gt; \q</pre>
<h3><span style="color: #0000ff; font-size: 15px;">初始化数据库</span></h3>
<pre escaped="true" lang="shell"># mysql -u oneadmin -p onemc &lt; /var/www/html/onemc/include/mysql.sql</pre>
<h3><span style="color: #0000ff;">配置 onemc</span></h3>
<pre escaped="true" lang="shell"># vi /var/www/html/onemc/include/config.php
...
// vmm: kvm or xen
$vmm = "xen";
...
// ADODB settings
$adodb_type = "mysql";
$adodb_server = "localhost";
$adodb_user = "oneadmin";
$adodb_pass = "oneadmin";
$adodb_name = "onemc";</pre>
<h3><span style="color: #0000ff; font-size: 15px;">登录</span></h3>
如果系统设置了 http_proxy 环境变量的话一定要先关闭，然后重启 one 和 httpd：
<pre escaped="true" lang="shell"># unset http_proxy
# one stop; one start
# /etc/init.d/httpd restar</pre>
访问地址为http://localhost/onemc/index.php，用户名和密码在one_auth 中。
<h3><span style="font-size: 15px;"><span style="color: #ff0000;">总结</span></span></h3>
以上步骤最重要的是配置好centos的yum源，一次将php和mysql及相关组件安装成功，然后需要注意的是上面红色部分标出的部分。其实，除了红色那部分之外，其余和开头提到的那篇文章内容没什么差别。
<h3><span style="color: #0000ff;">参考文章</span></h3>
<a href="http://www.javachen.com/?page_id=2073#date=2011-06-29 12:00:00,mode=month" target="_blank">Centos上安装 OpenNebula Management Console</a>
<a href="http://dev.opennebula.org/projects/management-console/wiki">OpenNebula Management Console Wiki</a>
<a href="http://dev.opennebula.org/projects/management-console/wiki/onemc_install_ubuntu">Install onemc on ubuntu</a></p>

---
layout: post
title: Getting Started Using the Cassandra CLI
categories:
- Cassandra
tags:
- cassandra
---

<p>这仅仅是一个Cassandra CLI使用方法的清单。<br />
Cassandra CLI 客户端用于处理集群中基本的数据定义（DDL）和数据维护（DML）。其处于<code>/usr/bin/cassandra-cli</code>，如果是试用包安装，或者是<code>$CASSANDRA_HOME/bin/cassandra-cli</code>，如果使用二进制文件安装。</p>

<p><h1>Starting the CLI</h1>
使用<code>cassandra-cli</code> <code>-host</code> <code>-port</code> 命令启动 Cassandra CLI，他将会连接<code>cassandra.yaml</code>文件中定义的集群名称，默认为“<em>Test Cluster</em>”。<br />
如果你有一个但节点的集群，则使用以下命令：
<pre> 
$ cassandra-cli -host localhost -port 9160
</pre>
如果想连接多节点集群中的一个节点，可以使用以下命令:
<pre>
$ cassandra-cli -host 110.123.4.5 -port 9160
</pre>
或者，可以直接执行以下命令：
<pre>
$ cassandra-cli
</pre>
登录成功之后，可以看到：
<pre>
Welcome to cassandra CLI.
Type 'help;' or '?' for help. Type 'quit;' or 'exit;' to quit.
</pre>
你必须指定连接一个节点：
<pre>
[default@unknown]connect localhost/9160;
</pre>
<!--more-->
<h1>Creating a Keyspace</h1>
<pre>
[default@unknown] CREATE KEYSPACE demo;
</pre>
下面的一个例子，创建一个叫demo的Keyspace,并且复制因子为1，使用<code>SimpleStrategy</code>复制替换策略。
<pre>
[default@unknown] CREATE KEYSPACE demo with 
        placement_strategy ='org.apache.cassandra.locator.SimpleStrategy' 
        and strategy_options = [{replication_factor:1}];
</pre>
你可以使用<code>SHOW KEYSPACES</code>来查看所有系统的和你创建的Keyspace</p>

<p><h1>Use a keyspace</h1>
<pre>
[default@unknown] USE demo;
</pre></p>

<p><h1>Creating a Column Family</h1>
<pre>
[default@demo] CREATE COLUMN FAMILY users
WITH comparator = UTF8Type
AND key_validation_class=UTF8Type
AND column_metadata = [
{column_name: full_name, validation_class: UTF8Type}
{column_name: email, validation_class: UTF8Type}
{column_name: state, validation_class: UTF8Type}
{column_name: gender, validation_class: UTF8Type}
{column_name: birth_year, validation_class: LongType}
];
</pre>
我们使用demo keyspace创建了一个column family，其名称为users，并包括5个静态列：full_name，email,state,gender,birth_year.comparator, key_validation_class和validation_class，用于设置；列名称，行key的值，列值的编码。comparator还定义了列名称的排序方式。<br />
下面命令创建一个名称为 blog_entry的动态column family，我们不需要定义列，而由应用程序稍后定义。
<pre>
[default@demo] CREATE COLUMN FAMILY blog_entry WITH comparator = TimeUUIDType AND key_validation_class=UTF8Type AND default_validation_class = UTF8Type;
</pre></p>

<p><h1>Creating a Counter Column Family</h1>
<pre>
[default@demo] CREATE COLUMN FAMILY page_view_counts WITH 
          default_validation_class=CounterColumnType 
          AND key_validation_class=UTF8Type AND comparator=UTF8Type;
</pre>
插入一行和计数列：
<pre>
[default@demo] INCR page_view_counts['www.datastax.com'][home] BY 0;
</pre>
增加计数：
<pre>
[default@demo] INCR page_view_counts['www.datastax.com'][home] BY 1;
</pre></p>

<p><h1>Inserting Rows and Columns</h1>
以下命令以一个特点的行key值插入列到users中
<pre>
[default@demo] SET users['bobbyjo']['full_name']='Robert Jones';
[default@demo] SET users['bobbyjo']['email']='bobjones@gmail.com';
[default@demo] SET users['bobbyjo']['state']='TX';
[default@demo] SET users['bobbyjo']['gender']='M';
[default@demo] SET users['bobbyjo']['birth_year']='1975';
</pre>
更新数据： set users['bobbyjo']['full_name'] = 'Jack';<br />
获取数据： get users['bobbyjo'];<br />
get命令用法参考：<a href="http://wiki.apache.org/cassandra/API#get_slice" target="_blank">API#get_slice</a>
查询数据： get users where gender= 'M';<br />
下面命令在 blog_entry中创建了一行，其行key为“yomama”，并指定了一列：timeuuid()的值为 'I love my new shoes!'
<pre>
[default@demo] SET blog_entry['yomama'][timeuuid()] = 'I love my new shoes!';
</pre></p>

<p><h1>Reading Rows and Columns</h1>
使用List命令查询记录，默认查询100条记录
<pre>
[default@demo] LIST users;
</pre>
Cassandra 默认以16进制数组的格式存储数据 为了返回可读的数据格式，可以指定编码：
<li>ascii</li>
<li>bytes</li>
<li>integer (a generic variable-length integer type)</li>
<li>lexicalUUID</li>
<li>long</li>
<li>utf8</li>
例如：
<pre>
[default@demo] GET users[utf8('bobby')][utf8('full_name')];
</pre>
你也可以使用<code>ASSUME</code>命令指定编码，例如，指定行key，行名称，行值显示ascii码格式：
<pre>
[default@demo] ASSUME users KEYS AS ascii;
[default@demo] ASSUME users COMPARATOR AS ascii;
[default@demo] ASSUME users VALIDATOR AS ascii;
</pre></p>

<p><h1>Setting an Expiring Column</h1>
例如，假设我们正在跟踪我们的用户，到期后10天的优惠券代码。我们可以定义coupon_code的列和设置该列的过期日期。例如：
<pre>
[default@demo] SET users['bobbyjo'] [utf8('coupon_code')] = utf8('SAVE20') WITH ttl=864000;
</pre>
自该列被设置值之后，经过10天或864,000秒后，其值将被标记为删除，不再由读操作返回。然而，请注意，直到Cassandra的处理过程完成，该值才会从硬盘中删除。</p>

<p><h1>Indexing a Column</h1>
给birth_year添加一个二级索引：
<pre>
[default@demo] UPDATE COLUMN FAMILY users 
            WITH comparator = UTF8Type AND column_metadata = 
            [{column_name: birth_year, validation_class: LongType, index_type: KEYS}];
</pre>
由于该列被索引了，所以可以直接通过该列查询：
<pre>
[default@demo] GET users WHERE birth_date = 1969;
</pre></p>

<p><h1>Deleting Rows and Columns</h1>
删除yomama索引的coupon_code列：
<pre>
[default@demo] DEL users ['yomama']['coupon_code'];
[default@demo] GET users ['yomama'];
</pre>
或者删除整行：
<pre>
[default@demo] DEL users ['yomama'];
</pre></p>

<p><h1>Dropping Column Families and Keyspaces</h1>
<pre>
[default@demo] DROP COLUMN FAMILY users;
[default@demo] DROP KEYSPACE demo;
</pre></p>

<p><h1>For help</h1>
<pre>
[default@unknown]help;
</pre>
查看某一个命令的详细说明：
<pre>
[default@unknown] help SET;
</pre></p>

<p><h1>To Quit</h1>
<pre>
[default@unknown]quit;
</pre></p>

<p><h1>To Execute Script</h1>
<pre>
bin/cassandra-cli -host localhost -port 9160 -f script.txt
</pre></p>

<h1>参考文章</h1>

- <a href="http://www.datastax.com/docs/0.8/dml/using_cli" target="_blank">Getting Started Using the Cassandra CLI</a>
- <a href="http://wiki.apache.org/cassandra/CassandraCli" target="_blank">CassandraCli</a></p>

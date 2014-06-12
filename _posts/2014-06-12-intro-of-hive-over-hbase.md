---
layout: post

title: Hive Over HBase的介绍

description: Hive over hbase是基于hive支持对hbase表提供直接查询功能，并不是使用hbase外部表通过mapreduce来查询，而是使用HQL语句来直接查询存储在HBase上的数据。

keywords: Hive over hbase是基于hive支持对hbase表提供直接查询功能

category: hadoop

tags: [hbase,hive]

published: true

---

Hive over hbase是基于hive支持对hbase表提供直接查询功能，并不是使用hbase外部表通过mapreduce来查询，而是使用HQL语句来直接查询存储在HBase上的数据。

# 特性

支持的字段类型：

 boolean, tinyint, smallint, int, bigint, float, double, string, struct
(当hbase中的rowkey字段为struct类型，请将子字段定义为string类型，同时指定表的collection items terminated分隔字符以及各字段的长度参数:hbase.rowkey.column.length)

支持的sql语法：

- where子句
- group by，having子句
- 聚合函数: count, max, min, sum, avg
- order by with limit(top N)
- limit 子句
- explain

支持的运算

- 关系操作：>, >=, <=, <, =
- 算术操作：+, - , * , / , %
- 逻辑操作：and, or, not
- 字符串操作函数: substring, concat
- Distinct : 支持`select distinct <col-list> from <tab> where <expr>, select aggr-fun(distinct <col_list>) from <tab> where <expr>`
- Like: 通配符’_’, ’%’
- Case when子句

不支持:

- Sub-query
- Join
- Union

# 原理

扩展HBase客户端代码，实现[简单聚合计算](/2014/06/12/hbase-aggregate-client/)，基于协作器实现分组计算的功能，并且修改hive的查询引擎，将HQL语句转换成HBase的Task，然后调用HBase中的api实现对HQL语句的解析。

# 源码

暂时不公开。
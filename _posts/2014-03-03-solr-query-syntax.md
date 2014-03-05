---
layout: post
title: Apache Solr查询语法
description: Apache Solr查询语法
category: solr
tags: [solr, lucene]
---

# 查询参数

常用：

- q - 查询字符串，必须的。
- fl - 指定返回那些字段内容，用逗号或空格分隔多个。
- start - 返回第一条记录在完整找到结果中的偏移位置，0开始，一般分页用。
- rows - 指定返回结果最多有多少条记录，配合start来实现分页。
- sort - 排序，格式：`sort=<field name>+<desc|asc>[,<field name>+<desc|asc>]`。示例：（inStock desc, price asc）表示先 "inStock" 降序, 再 "price" 升序，默认是相关性降序。
- wt - (writer type)指定输出格式，可以有 xml, json, php, phps。
- fq - （filter query）过虑查询，作用：在q查询符合结果中同时是fq查询符合的，例如：`q=mm&fq=date_time:[20081001 TO 20091031]`，找关键字mm，并且date_time是20081001到20091031之间的

不常用：

- defType：
- q.op - 覆盖schema.xml的defaultOperator（有空格时用"AND"还是用"OR"操作逻辑），一般默认指定
- df - 默认的查询字段，一般默认指定
- qt - （query type）指定那个类型来处理查询请求，一般不用指定，默认是standard。

其它：

- indent - 返回的结果是否缩进，默认关闭，用 indent=true|on 开启，一般调试json,php,phps,ruby输出才有必要用这个参数。
- version - 查询语法的版本，建议不使用它，由服务器指定默认值。

# 检索运算符

- ":" 指定字段查指定值，如返回所有值*:*
- "?" 表示单个任意字符的通配
- "*" 表示多个任意字符的通配（不能在检索的项开始使用*或者?符号）
- "~" 表示模糊检索，如检索拼写类似于"roam"的项这样写：roam~将找到形如foam和roams的单词；roam~0.8，检索返回相似度在0.8以上的记录。
	邻近检索，如检索相隔10个单词的"apache"和"jakarta"，"jakarta apache"~10
- "^" 控制相关度检索，如检索jakarta apache，同时希望去让"jakarta"的相关度更加好，那么在其后加上"^"符号和增量值，即jakarta^4 apache
- 布尔操作符AND、||
- 布尔操作符OR、&&
- 布尔操作符NOT、!、-（排除操作符不能单独与项使用构成查询）
- "+" 存在操作符，要求符号"+"后的项必须在文档相应的域中存在
- () 用于构成子查询
- [] 包含范围检索，如检索某时间段记录，包含头尾，date:[200707 TO 200710]
- {}不包含范围检索，如检索某时间段记录，不包含头尾，date:{200707 TO 200710}
- " 转义操作符，特殊字符包括+ - && || ! ( ) { } [ ] ^ " ~ * ? : "


# 示例

- 1. 查询所有

```
http://localhost:8080/solr/primary/select?q=*:*
```

- 2. 限定返回字段

```
http://localhost:8080/solr/primary/select?q=*:*&fl=productId
```

表示：查询所有记录，只返回productId字段

- 3. 分页

```
http://localhost:8080/solr/primary/select?q=*:*&fl=productId&rows=6&start=0
```

表示：查询前六条记录，只返回productId字段

- 4. 增加限定条件

```
http://localhost:8080/solr/primary/select?q=*:*&fl=productId&rows=6&start=0&fq=category:2002&fq=namespace:d&fl=productId+category&fq=en_US_city_i:1101
```

表示：查询category=2002、`en_US_city_i=110`以及namespace=d的前六条记录，只返回productId和category字段

- 5. 添加排序

```
http://localhost:8080/solr/primary/select?q=*:*&fl=productId&rows=6&start=0&fq=category:2002&fq=namespace:d&sort=category_2002_sort_i+asc
```

表示：查询category=2002以及namespace=d并按`category_2002_sort_i`升序排序的前六条记录，只返回productId字段

- 6. facet查询

现实分组统计结果

```
http://localhost:8080/solr/primary/select?q=*:*&fl=productId&fq=category:2002&facet=true&facet.field=en_US_county_i&facet.field=en_US_hotelType_s&facet.field=price_p&facet.field=heatRange_i

http://localhost:8080/solr/primary/select?q=*:*&fl=productId&fq=category:2002&facet=true&facet.field=en_US_county_i&facet.field=en_US_hotelType_s&facet.field=price_p&facet.field=heatRange_i&facet.query=price_p:[300.00000+TO+*]
```



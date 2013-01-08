---
layout: post
title: kettle中定义错误处理
categories:
- Kettle
tags:
- Kettle
- Pentaho
published: true
comments: true
---
<p>在kettle执行的过程中，如果遇到错误，kettle会停止运行。在某些时候，并不希望kettle停止运行，这时候可以使用错误处理（Step Error Handling）。错误处理允许你配置一个步骤来取代出现错误时停止运行一个转换，出现错误的记录行将会传递给另一个步骤。在Step error handling settings对话框里，需要设置启用错误处理。</p>

<p>下面例子中读取postgres数据库中的a0表数据，然后输出到a1表：
<div class="pic">
<img alt="" src="http://ww2.sinaimg.cn/mw600/48e24b4cjw1dq56wck3m7j.jpg" class="alignnone" width="600" height="172" />
</div></p>

<p>a1表结构如下：
<pre lang="sql">
CREATE TABLE a1
(
  a double precision,
  id integer NOT NULL,
  CONSTRAINT id_pk PRIMARY KEY (id ),
  CONSTRAINT id_unin UNIQUE (id )
)
</pre></p>

<p>从表结构可以看出，a1表中id为主键、唯一。
<!--more--></p>

<p>a0表数据预览：
<div class="pic">
<img alt="" src="http://ww4.sinaimg.cn/mw600/48e24b4cjw1dq56wcr6c2j.jpg" class="alignnone" width="553" height="403" />
</div></p>

<p>现在a1表数据为空，执行上面的转换，执行成功之后，a1表数据和a0表数据一致。<br />
再次执行，上面的转换会报错，程序停止运行，会报主键重复的异常。</p>

<p>现在，我想报错之后，程序继续往下执行，并记录错误的记录的相关信息，这时候可以使用“定义错误处理”的功能。<br />
在“表输出”的步骤上右键选择“定义错误处理”，弹出如下对话框。
<div class="pic">
<img src="http://ww3.sinaimg.cn/mw600/48e24b4cjw1dq56wd5ckwj.jpg" alt="" />
</div></p>

<p><strong>相关字段说明：</strong>
目标步骤：指定处理错误的步骤<br />
启用错误处理？：设置是否启用错误处理<br />
错误数列名：出错的记录个数<br />
错误描述列名：描述错误信息的列名称<br />
错误列的列名：出错列的名称<br />
错误编码列名：描述错误的代码的列名<br />
允许的最大错误数：允许的最大错误数，超过此数，不在处理错误<br />
允许的最大错误百分比：<br />
在计算百分百前最少要读入的行数：</p>

<p>添加错误处理后的转换如下：
<div class="pic">
<img src="http://ww4.sinaimg.cn/mw600/48e24b4cjw1dq56wdntipj.jpg" alt="" />
</div></p>

<p>记录错误信息的字段列表如下，可以看出，errorNum、errorDesc、errorName、errorCode都是在定义错误处理时候填入的列名称，a、id来自于输入的记录的列。
<div class="pic">
<img src="http://ww2.sinaimg.cn/mw600/48e24b4cjw1dq56wdvk6uj.jpg" alt="" />
</div></p>

<p>记录的错误信息如下：
<div class="pic">
<img src="http://ww4.sinaimg.cn/mw600/48e24b4cjw1dq56we2sn2j.jpg" alt="" />
</div></p>

<p><strong>分析</strong>
可以看到,错误日志里只是记录了出错的行里面的信息，并没有记录当前行所在的表名称以及执行时间等等，如果能够对此进行扩展，则该错误日志表才能更有实际意义。</p>

<p><strong>说明</strong>
1.错误日志的错误码含义（如：TOP001）含义见参考文章2.</p>

<p><strong>参考文章</strong>
1.<a href="http://wiki.pentaho.com/display/EAI/.09+Transformation+Steps#.09TransformationSteps-StepErrorHandling" target="_blank">Step Error Handling</a>
2.<a href="http://wiki.pentaho.com/display/COM/Step+error+handling+codes" target="_blank">Step error handling codes</a></p>

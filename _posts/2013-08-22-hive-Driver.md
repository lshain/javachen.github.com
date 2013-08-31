---
layout: post
title:  hive Driver类运行过程
category: hive
tags: [hadoop, hive]
keywords: hadoop, hive
description: 分析hive Driver类运行过程
---

## 概括

从《[hive cli的入口类](hive/2013/08/21/hive-CliDriver/)》中可以知道hive中处理hive命令的处理器一共有以下几种：

	（1）set       SetProcessor，设置修改参数,设置到SessionState的HiveConf里。 
	（2）dfs       DfsProcessor，使用hadoop的FsShell运行hadoop的命令。 
	（3）add       AddResourceProcessor，添加到SessionState的resource_map里，运行提交job的时候会写入Hadoop的Distributed Cache。 
	（4）delete    DeleteResourceProcessor，从SessionState的resource_map里删除。 
	（5）其他       Driver 

Driver类的主要作用是用来编译并执行hive命令，然后返回执行结果。这里主要分析Driver类的运行逻辑。

<!-- more -->

## 分析

Driver类入口如下：

	Driver.run(String command) // 处理一条命令 
	{ 
	    int ret = compile(command);  // 分析命令，生成Task。 
	    ret = execute();  // 运行Task。 
	} 

运行命令之前，先编译命令，然后在运行任务。

### compile方法过程

1、创建Context上下文

	command = new VariableSubstitution().substitute(conf,command);
	ctx = new Context(conf);
	ctx.setTryCount(getTryCount());
	ctx.setCmd(command);
	ctx.setHDFSCleanup(true);

2、创建ParseDriver对象，然后解析命令、生成AST树。语法和词法分析内容，不是本文重点故不做介绍。

	ParseDriver pd = new ParseDriver();
	ASTNode tree = pd.parse(command, ctx);
	tree = ParseUtils.findRootNonNullToken(tree);

简单归纳来说，解析程包括如下：

- 词法分析，生成AST树，ParseDriver完成。 
- 分析AST树，AST拆分成查询子块，信息记录在QB，这个QB在下面几个阶段都需要用到，SemanticAnalyzer.doPhase1完成。 
- 从metastore中获取表的信息，SemanticAnalyzer.getMetaData完成。 
- 生成逻辑执行计划，SemanticAnalyzer.genPlan完成。 
- 优化逻辑执行计划，Optimizer完成，ParseContext作为上下文信息进行传递。 
- 生成物理执行计划，SemanticAnalyzer.genMapRedTasks完成。 
- 物理计划优化，PhysicalOptimizer完成，PhysicalContext作为上下文信息进行传递。

3、读取环境变量，如果配置了语法分析的hook，参数为：`hive.semantic.analyzer.hook`，则:先用反射得到`AbstractSemanticAnalyzerHook`的集合，调用`hook.preAnalyze(hookCtx, tree)`方法,然后再调用`sem.analyze(tree, ctx)`方法，该方法才是用来作语法分析的,最后再调用`hook.postAnalyze(hookCtx, tree)`方法执行一些用户定义的后置操作；

否则，直接调用`sem.analyze(tree, ctx)`进行语法分析。

4、校验执行计划：`sem.validate()`

5、创建查询计划QueryPlan。

6、初始化FetchTask。

	if (plan.getFetchTask() != null) {
	   plan.getFetchTask().initialize(conf, plan, null);
	}

7、授权校验工作。

### run方法过程

1、运行HiveDriverRunHook的前置方法preDriverRun

2、运行`compile(command)`方法，并根据返回值判断是否该释放Hive锁。hive中可以配置`hive.support.concurrency`值为true并设置zookeeper的服务器地址和端口，基于zookeeper实现分布式锁以支持hive的多并发访问。这部分内容不是本文重点故不做介绍。

3、调用execute()方法执行任务。

- 先运行ExecuteWithHookContext的前置hook方法，ExecuteWithHookContext类型有三种：前置、运行失败、后置。
- 然后创建DriverContext用于维护正在运行的task任务，正在运行的task任务会添加到队列runnable中去。
- 其次，在while循环中遍历队列中的任务，然后启动任务让其执行。

```
	while (runnable.peek() != null && running.size() < maxthreads) {
	  Task<? extends Serializable> tsk = runnable.remove();
	  launchTask(tsk, queryId, noName, running, jobname, jobs, driverCxt);
	}
```

- 在launchTask方法中，先判断是否支持并发执行，如果支持则调用线程的start()方法，否则调用`tskRun.runSequential()`方法顺序执行，只有当是MapReduce任务时，才执行并发执行：

```
	if (HiveConf.getBoolVar(conf, HiveConf.ConfVars.EXECPARALLEL) && tsk.isMapRedTask()) {
	      // Launch it in the parallel mode, as a separate thread only for MR tasks
	      tskRun.start();
	} else {
	      tskRun.runSequential();
	}
```

- 最后任务的运行，交给具体的Task去执行了。
- 如果任务运行失败，则会创建一个备份任务，重新加入队列，然后再次运行；如果备份任务运行完成，则运行ExecuteWithHookContext的hook方法，这时候的hook为失败类型的hook。

4、运行HiveDriverRunHook的后置方法postDriverRun

### hive中支持的hook

上面分析中，提到了hive的hook机制，hive中一共存在以下几种hook。

	hive.semantic.analyzer.hook
	hive.exec.filter.hook
	hive.exec.driver.run.hooks
	hive.server2.session.hook
	hive.exec.pre.hooks
	hive.exec.post.hooks
	hive.exec.failure.hooks
	hive.client.stats.publishers
	hive.metastore.ds.connection.url.hook
	hive.metastore.init.hooks

通过hook机制，可以在运行前后做一些用户想做的事情。如：你可以在语法分析的hook中对hive的操作做一些超级管理员级别的权限判断；你可以对hive-server2做一些session级别的控制。

cloudera的github仓库[access](https://github.com/cloudera/access)中关于hive的访问控制就是使用了hive的hook机制。

twitter的mapreduce可视化项目监控项目[ambrose](https://github.com/twitter/ambrose)也利用了hive的hook机制，有兴趣的话，你可以去看看其是如何使用hive的hook并且你也可以扩增hook做些自己想做的事情。

## 总结

本文主要介绍了hive运行过程，其中简单提到了hive语法词法解析以及hook机制，没有详细分析。

hive Driver类的执行过程如下：

![hive-driver](/files/2013/hive-driver.jpg)


## 参考文章

1. [hive 初始化运行流程](http://www.cnblogs.com/end/archive/2012/12/19/2825320.html)
2. [Cloudera access](https://github.com/cloudera/access)
3. [twitter ambrose](https://github.com/twitter/ambrose)


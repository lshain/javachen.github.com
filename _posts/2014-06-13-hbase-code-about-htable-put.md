---
layout: post

title: HBase源码分析：HTable put过程

description: 在 HBase中，大部分的操作都是在RegionServer完成的，Client端想要插入、删除、查询数据都需要先找到相应的 RegionServer。什么叫相应的RegionServer？就是管理你要操作的那个Region的RegionServer。Client本身并 不知道哪个RegionServer管理哪个Region，那么它是如何找到相应的RegionServer的？本文就是在研究源码的基础上了解这个过程。

keywords: HBase0.94.15源码：HTable put过程

category: hadoop

tags: [hbase,hive]

published: true

---

HBase版本：0.94.15-cdh4.7.0

在 HBase中，大部分的操作都是在RegionServer完成的，Client端想要插入、删除、查询数据都需要先找到相应的 RegionServer。什么叫相应的RegionServer？就是管理你要操作的那个Region的RegionServer。Client本身并 不知道哪个RegionServer管理哪个Region，那么它是如何找到相应的RegionServer的？本文就是在研究源码的基础上了解这个过程。

# 客户端代码

1、put方法

HBase的put有两个方法：

```java
public void put(final Put put) throws IOException {
	doPut(put);
	if (autoFlush) {
	  flushCommits();
	}
}

public void put(final List<Put> puts) throws IOException {
	for (Put put : puts) {
	  doPut(put);
	}
	if (autoFlush) {
	  flushCommits();
	}
}
```

从上面代码可以看出：你既可以一次put一行记录也可以一次put多行记录，两个方法内部都会调用doPut方法，最后再来根据autoFlush（默认为true）判断是否需要flushCommits，在autoFlush为false的时候，如果当前容量超过了缓冲区大小（默认值为：2097152=2M），也会调用flushCommits方法。也就是说，在自动提交情况下，你可以手动控制通过一次put多条记录（这时候缓冲区不会满），然后将这些记录flush，以提高写操作tps。

doPut代码如下：

```java
private void doPut(Put put) throws IOException{
	validatePut(put); //验证Put有效，主要是判断kv的长度
	writeBuffer.add(put); //写入缓存
	currentWriteBufferSize += put.heapSize(); //计算缓存容量 
	if (currentWriteBufferSize > writeBufferSize) {
	  flushCommits();  //如果超过缓存容量，则调用flushCommits()
	}
}
```

2、flushCommits方法如下：

```java
public void flushCommits() throws IOException {
    try {
      Object[] results = new Object[writeBuffer.size()];
      try {
        //调用HConnection来提交Put
        this.connection.processBatch(writeBuffer, tableName, pool, results);
      } catch (InterruptedException e) {
        throw new IOException(e);
      } finally {
        // mutate list so that it is empty for complete success, or contains
        // only failed records results are returned in the same order as the
        // requests in list walk the list backwards, so we can remove from list
        // without impacting the indexes of earlier members
        for (int i = results.length - 1; i>=0; i--) {
          if (results[i] instanceof Result) {
            // successful Puts are removed from the list here.
            writeBuffer.remove(i);
          }
        }
      }
    } finally {
      if (clearBufferOnFail) {
        writeBuffer.clear();
        currentWriteBufferSize = 0;
      } else {
        // the write buffer was adjusted by processBatchOfPuts
        currentWriteBufferSize = 0;
        //currentWriteBufferSize又重新计算了一遍，看来一批提交不一定会全部提交完 
        for (Put aPut : writeBuffer) {
          currentWriteBufferSize += aPut.heapSize();
        }
      }
    }
  }
```

其核心是调用this.connection的processBatch方法，其参数有：writeBuffer、tableName、pool、results

 - writeBuffer，缓冲区，带提交的数据
 - tableName，表名
 - pool，ExecutorService类，可以通过HTable构造方法传入一个参数来初始化（例如：HConnectionManager的`getTable(byte[] tableName, ExecutorService pool)`方法），也可以内部初始化。内部初始化时，其最大线程数由`hbase.htable.threads.max`设置，keepAliveTime由`hbase.htable.threads.keepalivetime`设置，默认为60秒
 - results，保存运行结果

 在默认情况下，connection由如下方式初始化：

```
 this.connection = HConnectionManager.getConnection(conf); //HConnection的实现类为HConnectionImplementation
```

3、ConnectionImplementation的processBatch方法

```java
   public void processBatch(List<? extends Row> list,
        final byte[] tableName,
        ExecutorService pool,
        Object[] results) throws IOException, InterruptedException {
      // This belongs in HTable!!! Not in here.  St.Ack

      // results must be the same size as list
      if (results.length != list.size()) {
        throw new IllegalArgumentException("argument results must be the same size as argument list");
      }

      processBatchCallback(list, tableName, pool, results, null);
    }
```

最后是调用的processBatchCallback方法，第五个参数为空，即没有回调方法。

processBatchCallback方法内部可以失败后进行重试，重试次数为`hbase.client.retries.number`控制，默认为10，每一次重试直接都会休眠一下，每次休眠时间为:

```java
pause * HConstants.RETRY_BACKOFF[ntries]+(long)(normalPause * RANDOM.nextFloat() * 0.01f);
//RETRY_BACKOFF[] = { 1, 1, 1, 2, 2, 4, 4, 8, 16, 32, 64 }
```

pause通过`hbase.client.pause`设置，默认值为1000，即1秒；ntries为当前重复次数

接下来，第一步，遍历List<? extends Row>，获取每一个行对应HRegion所在位置，并且按regionName对这些待put的行进行分组。

第二步，发送异步请求到服务端。

第三步，接收异步请求的结果，收集成功的和失败的，做好重试准备

第四步，对于失败的，进行重试。

达到重试次数之后，对运行结果判断是否有异常，如果有则抛出RetriesExhaustedWithDetailsException异常。

由以上四步可以看出，重点在于第一、二步。

第一步查找HRegion所在位置过程关键在`private HRegionLocation locateRegion(final byte [] tableName,final byte [] row, boolean useCache)`方法中，并且为递归方法，过程如下：

- 调用locateRegionInMeta方法到.META.表中查找tableName的row所对应的HRegion所在位置，先从本地缓存查找，如果没有，则进行下一步；
- 调用locateRegionInMeta方法到-ROOT-表中查找.META.所对应的HRegion所在位置，先从本地缓存查找，如果没有，则进行下一步
- 通过rootRegionTracker（即从zk上）获取RootRegionServer地址，即找到-ROOT-表所在的RegionServer地址，然后获取到.META.所在位置，最后在获取.META.表上所有HRegion，并将其加入到本地缓存。

通过示例描述如下：

```
获取 Table2，RowKey为RK10000的RegionServer

=> 获取.META.，RowKey为Table2,RK10000, 99999999999999 的RegionServer
   
=> 获取-ROOT-，RowKey为.META.,Table2,RK10000,99999999999999,99999999999999的RegionServer
   
=> 获取-ROOT-的RegionServer
   
=> 从ZooKeeper得到-ROOT-的RegionServer
   
=> 从-ROOT-表中查到RowKey最接近（小于） .META.,Table2,RK10000,99999999999999,99999999999999 的一条Row，并得到.META.的RegionServer  

=> 从.META.表中查到RowKey最接近（小于）Table2,RK10000,99999999999999 的一条Row，并得到Table2的K10000的Row对应的HRegionLocation
```

**说明：**

- 当我们创建一个表时，不管是否预建分区，该表创建之后，在.META.上会有一条记录的。
- 在客户端第一次连接服务端时，会两次查询缓存并没有查到结果，最后在通过`-ROOT-`-->`.META.`-->HRegion找到对应的HRegion所在位置。

第二步中，先是创建到RegionServer的连接，后是调用RegionServer上的multi方法，显然这是远程调用的过程。第二步中提交的任务通过下面代码创建：

```java
private <R> Callable<MultiResponse> createCallable(final HRegionLocation loc,
        final MultiAction<R> multi, final byte [] tableName) {
  // TODO: This does not belong in here!!! St.Ack  HConnections should
  // not be dealing in Callables; Callables have HConnections, not other
  // way around.
  final HConnection connection = this;
  return new Callable<MultiResponse>() {
   public MultiResponse call() throws IOException {
     ServerCallable<MultiResponse> callable =
       new ServerCallable<MultiResponse>(connection, tableName, null) {
         public MultiResponse call() throws IOException {
           return server.multi(multi);
         }
         @Override
         public void connect(boolean reload) throws IOException {
           server = connection.getHRegionConnection(loc.getHostname(), loc.getPort());
         }
       };
     return callable.withoutRetries();
   }
 };
}
```

从上面代码可以看到，通过`connection.getHRegionConnection(loc.getHostname(), loc.getPort())`创建一个HRegionInterface的实现类即HRegionServer，方法内使用了代理的方式创建对象。

```java
server = HBaseRPC.waitForProxy(this.rpcEngine,
  serverInterfaceClass, HRegionInterface.VERSION,
  address, this.conf,
  this.maxRPCAttempts, this.rpcTimeout, this.rpcTimeout);
```

# 服务端

上面客户端调用过程分析完毕，继续跟RegionServer服务端的处理，入口方法就是HRegionServer.multi方法。

该方法主要就是遍历multi并对actionsForRegion按rowid进行排序，然后分类别对action进行处理，put和delete操作放到一起进行处理。这里面包括一些上锁、结果收集等操作，然后调用下面代码批量提交：

```java
OperationStatus[] codes =
              region.batchMutate(mutationsWithLocks.toArray(new Pair[]{}));
```

因为传递到RegionServer都是按regionName分组的，故最后的操作实际上都是调用的HRegion对象的方法。

HRegion的put方法内部会调用internalPut方法，该方法运行过程如下（不考虑读写锁）：

- 调用协作器的prePut方法
- 检查列族、时间戳
- 更新每个KeyValue的时间戳
- 如果开启WAL，则往log里追加
- 把put放到memstore里 
- 判断是否需要flush memstore
- 调用协作器的postPut方法
- 如果需要flush，则调用requestFlush方法
	- 实际是调用MemStoreFlusher的requestFlush方法
	- flush之前，先要判断是否在拆分和压缩合并

# 总结

最后总结一下，HRegionServer作用如下：

- 使得被它管理的一系列HRegion能够被客户端来使用，每个HRegion对应了Table中的一个Region，HRegion中由多个HStore组成。
- 主要负责响应用户I/O请求，向HDFS文件系统中读写数据。

![](http://images.cnblogs.com/cnblogs_com/chenli0513/image0030.jpg)

HRegion定位过程：

```
client -> zookeeper -> -ROOT- -> .META -> HRegion地址 -> HRegionServer-> HRegion
```

在这个过程中客户端先通过zk找到Root表所在的RegionServer（通过zk上的/hbase/root-region-server节点获取），然后找到Meta表对应的HRegion地址，最后在Meta表里找到目标表所在的HRegion地址，这个过程客户端并没有和HMaster进行交互。

Client端并不会每次数据操作都做这整个路由过程，因为HRegion的相关信息会缓存到本地，当有变化时，通过zk监听器能够及时感知。

数据写入过程：

- client先根据rowkey找到对应的region和regionserver
- client想regionserver提交写请求
- region找到目标region
- region检查数据是否与scheam一致
- 如果客户端没有指定版本，则获取当前系统时间作为数据版本
- 将更新写入wal log
- 将更新写入memstore
- 判断memstore是否需要flush为store文件


---
layout: post

title: Java笔记：多线程

description: 

keywords: java,thread

category: java

tags: [java,thread]

published: false

---

线程：进程中并发的一个顺序执行流程。

并发原理：CPU分配时间片，多线程交替运行。宏观并行，微观串行。

多线程间堆空间共享，栈空间独立。堆存的是地址，栈存的是变量（如：局部变量）。

创建线程两种方式：继承Thread类或实现Runnable接口。

Thread对象代表一个线程。

多线程共同访问的同一个对象（临界资源），如果破坏了不可分割的操作（原子操作），就会造成数据不一致的情况。


在java中，任何对象都有一个锁池，用来存放等待该对象锁标记的线程，线程阻塞在对象锁池中时，不会释放其所拥有的其它对象的锁标记。

在java中，任何对象都有一个等待队列，用来存放线程，线程t1对（让）o调用wait方法,必须放在对o加锁的同步代码块中! 
	
	1.t1会释放其所拥有的所有锁标记;
	2.t1会进入o的等待队列
    
 t2对（让）o调用notify/notifyAll方法,也必须放在对o加锁的同步代码块中! 会从o的等待队列中释放一个/全部线程，对t2毫无影响，t2继续执行。

# 线程状态图

 ![](/assets/images/2014/thread-state.jpg)

 说明：
线程共包括以下5种状态。

- 1. 新建状态(New)： 线程对象被创建后，就进入了新建状态。例如，Thread thread = new Thread()。
- 2. 就绪状态(Runnable)： 也被称为“可执行状态”。线程对象被创建后，其它线程调用了该对象的start()方法，从而来启动该线程。例如，thread.start()。处于就绪状态的线程，随时可能被CPU调度执行。
- 3. 运行状态(Running)： 线程获取CPU权限进行执行。需要注意的是，线程只能从就绪状态进入到运行状态。
- 4. 阻塞状态(Blocked)： 阻塞状态是线程因为某种原因放弃CPU使用权，暂时停止运行。直到线程进入就绪状态，才有机会转到运行状态。阻塞的情况分三种：
  - (01) 等待阻塞 -- 通过调用线程的wait()方法，让线程等待某工作的完成。
  - (02) 同步阻塞 -- 线程在获取synchronized同步锁失败(因为锁被其它线程所占用)，它会进入同步阻塞状态。
  - (03) 其他阻塞 -- 通过调用线程的sleep()或join()或发出了I/O请求时，线程会进入到阻塞状态。当sleep()状态超时、join()等待线程终止或者超时、或者I/O处理完毕时，线程重新转入就绪状态。
- 5. 死亡状态(Dead)：线程执行完了或者因异常退出了run()方法，该线程结束生命周期。

# Thread和Runnable

Runnable 是一个接口，该接口中只包含了一个run()方法。它的定义如下：

```java
public interface Runnable {
    public abstract void run();
}
```

我们可以定义一个类A实现Runnable接口；然后，通过new Thread(new A())等方式新建线程。

Thread 是一个类。Thread本身就实现了Runnable接口。它的声明如下：

```java
public class Thread implements Runnable {
	public Thread() {}
	public Thread(Runnable target) {}
	public Thread(ThreadGroup group, Runnable target){}
	public Thread(String name){}
	public Thread(ThreadGroup group, String name){}
	public Thread(Runnable target, String name){}
	public Thread(ThreadGroup group, Runnable target, String name){}
	public Thread(ThreadGroup group, Runnable target, String name,long stackSize){}
}
```

**相同点**：

都是“多线程的实现方式”。

**不同点**：

Thread 是类，而Runnable是接口；Thread本身是实现了Runnable接口的类。我们知道“一个类只能有一个父类，但是却能实现多个接口”，因此Runnable具有更好的扩展性。

此外，Runnable还可以用于“资源的共享”。即，多个线程都是基于某一个Runnable对象建立的，它们会共享Runnable对象上的资源。
通常，建议通过“Runnable”实现多线程！

# start() 和 run()

start()：它的作用是启动一个新线程，新线程会执行相应的run()方法。start()不能被重复调用。

run()：和普通的成员方法一样，可以被重复调用。单独调用run()的话，会在当前线程中执行run()，而并不会启动新线程！

# synchronized

在java中，任何对象都有一个互斥锁标记，用来分配给线程。

```
synchronized(o){

}
```

对o（o是临界资源）加锁的同步代码块，只有拿到o的锁标记的线程，才能进入对o加锁的同步代码块，退出同步代码块时，会自动释放o的锁标记。

synchronized的同步方法，如：

```
public synchronized void fn(){
	
} 
```

当我们调用某对象的synchronized方法时，就获取了该对象的同步锁。例如，synchronized(obj)就获取了“obj这个对象”的同步锁。

不同线程对同步锁的访问是互斥的。也就是说，某时间点，对象的同步锁只能被一个线程获取到！通过同步锁，我们就能在多线程中，实现对“对象/方法”的互斥访问。

例如，现在有两个线程A和线程B，它们都会访问“对象obj的同步锁”。假设，在某一时刻，线程A获取到“obj的同步锁”并在执行一些操作；而此时，线程B也企图获取“obj的同步锁” —— 线程B会获取失败，它必须等待，直到线程A释放了“该对象的同步锁”之后线程B才能获取到“obj的同步锁”从而才可以运行。

对访问该方法的当前对象（this）加锁；哪个线程能拿到该对象（临界资源）的锁，哪个线程就能调用该对象（临界资源）的同步方法。
		
一个线程，可以同时拥有多个对象的锁标记。
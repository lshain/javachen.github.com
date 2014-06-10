---
layout: post

title: Java笔记：多线程

description:  多线程间堆空间共享，栈空间独立。堆存的是地址，栈存的是变量（如：局部变量）。多线程共同访问的同一个对象（临界资源），如果破坏了不可分割的操作（原子操作），就会造成数据不一致的情况。

keywords: java,thread

category: java

tags: [java,thread]

published: true

---

线程：进程中并发的一个顺序执行流程。

并发原理：CPU分配时间片，多线程交替运行。宏观并行，微观串行。

多线程间堆空间共享，栈空间独立。堆存的是地址，栈存的是变量（如：局部变量）。

创建线程两种方式：继承Thread类或实现Runnable接口。

Thread对象代表一个线程。

多线程共同访问的同一个对象（临界资源），如果破坏了不可分割的操作（原子操作），就会造成数据不一致的情况。


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

此外，Runnable还可以用于“资源的共享”。即，**多个线程都是基于某一个Runnable对象建立的**，它们会共享这个Runnable对象上的资源。


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

**对访问该方法的当前对象（this）加锁；哪个线程能拿到该对象（临界资源）的锁，哪个线程就能调用该对象（临界资源）的同步方法。**
		
一个线程，可以同时拥有多个对象的锁标记。

# wait(), notify(), notifyAll()

在Object.java中，定义了wait(), notify()和notifyAll()等接口。wait()的作用是让**当前线程**进入等待状态，同时，wait()也会让当前线程释放它所持有的锁。而notify()和notifyAll()的作用，则是唤醒当前对象上的等待线程；notify()是唤醒单个线程，而notifyAll()是唤醒所有的线程。

notify(), wait()依赖于“同步锁”，而“同步锁”是对象锁持有，并且每个对象有且仅有一个！

在java中，任何对象都有一个锁池，用来存放等待该对象锁标记的线程，线程阻塞在对象锁池中时，不会释放其所拥有的其它对象的锁标记。

在java中，任何对象都有一个等待队列，用来存放线程，线程t1对（让）o调用wait方法,必须放在对o加锁的同步代码块中! 
	
- 1.t1会释放其所拥有的所有锁标记;
- 2.t1会进入o的等待队列
    
 t2对（让）o调用notify/notifyAll方法,也必须放在对o加锁的同步代码块中! 会从o的等待队列中释放一个/全部线程，对t2毫无影响，t2继续执行。

# yield()

yield()的作用是让步。它能让当前线程由“运行状态”进入到“就绪状态”，从而让其它具有相同优先级的等待线程获取执行权；但是，并不能保证在当前线程调用yield()之后，其它具有相同优先级的线程就一定能获得执行权；也有可能是当前线程又进入到“运行状态”继续运行！

**wait()是会线程释放它所持有对象的同步锁，而yield()方法不会释放锁。**

# sleep()

sleep() 定义在Thread.java中。

sleep() 的作用是让当前线程休眠，即当前线程会从“运行状态”进入到“休眠(阻塞)状态”。sleep()会指定休眠时间，线程休眠的时间会大于/等于该休眠时间；在线程重新被唤醒时，它会由“阻塞状态”变成“就绪状态”，从而等待cpu的调度执行。

**wait()会释放对象的同步锁，而sleep()则不会释放锁。**

# join()

join() 定义在Thread.java中。

join() 的作用：让“主线程”等待“子线程”结束之后才能继续运行。

#  interrupt()


interrupt()的作用是中断本线程。

本线程中断自己是被允许的；其它线程调用本线程的interrupt()方法时，会通过checkAccess()检查权限。这有可能抛出SecurityException异常。

如果本线程是处于阻塞状态：调用线程的wait(), wait(long)或wait(long, int)会让它进入等待(阻塞)状态，或者调用线程的join(), join(long), join(long, int), sleep(long), sleep(long, int)也会让它进入阻塞状态。若线程在阻塞状态时，调用了它的interrupt()方法，那么它的“中断状态”会被清除并且会收到一个InterruptedException异常。例如，线程通过wait()进入阻塞状态，此时通过interrupt()中断该线程；调用interrupt()会立即将线程的中断标记设为“true”，但是由于线程处于阻塞状态，所以该“中断标记”会立即被清除为“false”，同时，会产生一个InterruptedException的异常。

如果线程被阻塞在一个Selector选择器中，那么通过interrupt()中断它时；线程的中断标记会被设置为true，并且它会立即从选择操作中返回。

如果不属于前面所说的情况，那么通过interrupt()中断线程时，它的中断标记会被设置为“true”。中断一个“已终止的线程”不会产生任何操作。

**interrupt()常常被用来终止“阻塞状态”线程。**

interrupted() 和 isInterrupted()都能够用于检测对象的“中断标记”。

区别是，interrupted()除了返回中断标记之外，它还会清除中断标记(即将中断标记设为false)；而isInterrupted()仅仅返回中断标记。

# 线程优先级

java 中的线程优先级的范围是1～10，默认的优先级是5。“高优先级线程”会优先于“低优先级线程”执行。

java 中有两种线程：用户线程和守护线程。可以通过isDaemon()

方法来区别它们：如果返回false，则说明该线程是“用户线程”；否则就是“守护线程”。

用户线程一般用户执行用户级任务，而守护线程也就是“后台线程”，一般用来执行后台任务。需要注意的是：Java虚拟机在“用户线程”都结束后会后退出。
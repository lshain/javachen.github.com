---
layout: post
title: Seam的启动过程
categories:
- Seam
tags:
- Jboss
- Seam
---

<p>了解seam2的人知道，seam是通过在web.xml中配置监听器启动的。注意，本文中的seam是指的seam2，不是seam3.
<pre lang="xml">
< listener>
	< listener-class>org.jboss.seam.servlet.SeamListener< /listener-class>
< /listener>
</pre></p>

<p>该监听器会做哪些事情呢？看看Gavin King对SeamListener类的描述。
<blockquote>Drives certain Seam functionality such as initialization and cleanup of application and session contexts from the web application lifecycle.</blockquote></p>

<p>从描述中可以知道<br />
SeamListener主要完成应用以及web应用生命周期中的session上下文的初始化和清理工作。</p>

<p>该类实现了ServletContextListener接口，在contextInitialized(ServletContextEvent event)方法内主要初始化生命周期并完成应用的初始化，在contextDestroyed(ServletContextEvent event)方法内结束应用的生命周期。<br />
该类实现了HttpSessionListener接口，主要是用于在生命周期中开始和结束session。
<!--more-->
<strong>第一步</strong>，构造方法里从ServletContext获取一些路径信息：warRoot、warClassesDirectory、warLibDirectory、hotDeployDirectory。</p>

<p><strong>第二步</strong>，扫描配置文件完成seam组件的初始化（Initialization的create方法）。<br />
其中包括：添加命名空间、初始化组件、初始化Properties、初始化jndi信息。这一步，其实主要是读取一些配置文件,加载seam组件。<br />
1.添加命名空间<br />
2.从“/WEB-INF/components.xml”加载组件<br />
3.从“/WEB-INF/events.xml”加载组件<br />
4.从“META-INF/components.xml”加载组件<br />
5.从ServletContext初始化Properties<br />
6.从“/seam.properties”初始化Properties<br />
7.初始化jndi Properties<br />
8.从system加载Properties</p>

<p><strong>第三步</strong>，seam初始化过程（Initialization的init方法）。<br />
1.ServletLifecycle开始初始化<br />
2.设置Application上下文<br />
3.添加Init组件<br />
4.通过standardDeploymentStrategy的注解和xml组件扫描组件<br />
5.判断jbpm是否安装<br />
6.检查默认拦截器<br />
7.添加特别组件<br />
8.添加war root部署、热部署<br />
9.安装组件<br />
10.导入命名空间<br />
11.ServletLifecycle结束初始化。启动生命周期为APPLICATION的组件。</p>

<p>如果组件标注为startup，则会构造其实例进行初始化。例如seam于Hibernate的集成，就可以通过此方法初始化Hibernate，对应的组件类为org.jboss.seam.persistence.HibernateSessionFactory。
</p>

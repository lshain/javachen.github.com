---
layout: post

title: 使用Spring Boot和Gradle创建项目

category: java

tags: [ spring,java,gradle ]

description: 本文主要是记录使用 Spring Boot 和 Gradle 创建项目的过程，其中会包括 Spring Boot 的安装及使用方法，希望通过这篇文章能够快速搭建一个项目。

published: true

---

[Spring Boot](http://projects.spring.io/spring-boot) 是由 Pivotal 团队提供的全新框架，其设计目的是用来简化新 Spring 应用的初始搭建以及开发过程。该框架使用了特定的方式来进行配置，从而使开发人员不再需要定义样板化的配置。

本文主要是记录使用 Spring Boot 和 Gradle 创建项目的过程，其中会包括 Spring Boot 的安装及使用方法，希望通过这篇文章能够快速搭建一个项目。

### 开发环境

- 操作系统: mac
- JDK：1.7.0_60
- Gradle：2.2.1

### 创建项目

你可以通过 [Spring Initializr](http://start.spring.io/) 来创建一个空的项目，也可以手动创建，这里我使用的是手动创建 gradle 项目。

参考 [使用Gradle构建项目](/2014/09/15/build-project-with-gradle/) 创建一个 spring-boot-examples 项目，执行的命令如下：

```bash
$ mkdir spring-boot-examples && cd spring-boot-examples
$ gradle init
```

spring-boot-examples 目录结构如下：

```
➜  spring-boot-examples  tree
.
├── build.gradle
├── gradle
│   └── wrapper
│       ├── gradle-wrapper.jar
│       └── gradle-wrapper.properties
├── gradlew
├── gradlew.bat
└── settings.gradle

2 directories, 6 files
```

然后修改 build.gradle 文件：

```groovy
//spring-boot-gradle-plugin插件构建脚本
buildscript {
    repositories {
        maven { url "https://repo.spring.io/libs-release" }
        mavenLocal()
        mavenCentral()
    }
    dependencies {
        classpath("org.springframework.boot:spring-boot-gradle-plugin:1.2.2.BUILD-SNAPSHOT")
    }
}

apply plugin: 'java'
apply plugin: 'eclipse'
apply plugin: 'idea'

//spring-boot-gradle-plugin插件
apply plugin: 'spring-boot'

jar {
    baseName = 'spring-boot-examples'
    version =  '0.1.0'
}

repositories {
    mavenLocal()
    mavenCentral()
    maven { url "https://repo.spring.io/libs-release" }
}

dependencies {
    compile("org.springframework.boot:spring-boot-starter-web")
    testCompile("junit:junit")
}

task wrapper(type: Wrapper) {
    gradleVersion = '2.2.1'
}
```

使用 spring-boot-gradle-plugin 插件可以提供一些创建可执行 jar 和从源码运行项目的任务，它还提供了 `ResolutionStrategy` 以方便依赖中不用写版本号。

### 创建一个实体类

新建一个符合Maven规范的目录结构， src/main/java/com/javachen/examples/springboot：

```bash
$ mkdir -p src/main/java/com/javachen/examples/springboot
```

创建一个实体类 src/main/java/com/javachen/examples/springboot/domain/Greeting.java：

```java
package com.javachen.examples.springboot.domain;

public class Greeting {

    private final long id;
    private final String content;

    public Greeting(long id, String content) {
        this.id = id;
        this.content = content;
    }

    public long getId() {
        return id;
    }

    public String getContent() {
        return content;
    }
}
```

### 创建控制类

创建一个标准的控制类 src/main/java/com/javachen/examples/springboot/web/GreetingController.java：

```java
package com.javachen.examples.springboot.web;

import java.util.concurrent.atomic.AtomicLong;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

@Controller
public class GreetingController {

    private static final String template = "Hello, %s!";
    private final AtomicLong counter = new AtomicLong();

    @RequestMapping("/index")
    public @ResponseBody String index() {
        return "Greetings from Spring Boot!";
    }

    @RequestMapping("/greeting")
    public @ResponseBody Greeting greeting(
            @RequestParam(value="name", required=false, defaultValue="World") String name) {
        System.out.println("==== in greeting ====");
        return new Greeting(counter.incrementAndGet(),
                            String.format(template, name));
    }
}
```

Greeting 对象会被转换成 JSON 字符串，这得益于 Spring 的 HTTP 消息转换支持，你不必人工处理。由于 Jackson2 在 classpath 里，Spring的 `MappingJackson2HttpMessageConverter` 会自动完成这一工作。

上面的代码还可以这样写：

```java
package com.javachen.examples.springboot.web;

import com.javachen.examples.springboot.domain.Greeting;

import java.util.concurrent.atomic.AtomicLong;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class GreetingController {

    private static final String template = "Hello, %s!";
    private final AtomicLong counter = new AtomicLong();

    @RequestMapping("/index")
    public String index() {
        return "Greetings from Spring Boot!";
    }

    @RequestMapping("/greeting")
    public Greeting greeting(@RequestParam(value="name", required=false, defaultValue="World") String name) {
        return new Greeting(counter.incrementAndGet(),
                            String.format(template, name));
    }
}
```

这段代码使用 Spring4 新的注解：`@RestController`，表明该类的每个方法返回对象而不是视图。它实际就是 `@Controller` 和 `@ResponseBody` 混合使用的简写方法。

### 创建一个可执行的类

尽管你可以将这个服务打包成传统的 WAR 文件部署到应用服务器，但下面将会创建一个独立的应用，使用 main 方法可以将所有东西打包到一个可执行的jar文件。并且，你将使用 Sping 对内嵌 Tomcat servlet 容器的支持，作为 HTPP 运行时环境，没必要部署成一个 tomcat 外部实例。

创建一个包含 main 方法的类 src/main/java/com/javachen/examples/springboot/Application.java：

```java
package com.javachen.examples.springboot;

import java.util.Arrays;

import com.javachen.examples.springboot.domain.Greeting;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableAutoConfiguration
@ComponentScan
public class Application {

    public static void main(String[] args) {
        ApplicationContext ctx = SpringApplication.run(Application.class, args);

        System.out.println("Let's inspect the beans provided by Spring Boot:");

        String[] beanNames = ctx.getBeanDefinitionNames();
        Arrays.sort(beanNames);
        for (String beanName : beanNames) {
            System.out.println(beanName);
        }
    }

}
```

main 方法使用了 SpringApplication 工具类。这将告诉Spring去读取 Application 的元信息，并在Spring的应用上下文作为一个组件被管理。

`@Configuration` 注解告诉 spring 该类定义了 application context 的 bean 的一些配置。

`@ComponentScan` 注解告诉 Spring 遍历带有 `@Component` 注解的类。这将保证 Spring 能找到并注册 GreetingController，因为它被 `@RestController` 标记，这也是 `@Component` 的一种。

`@EnableAutoConfiguration` 注解会基于你的类加载路径的内容切换合理的默认行为。比如，因为应用要依赖内嵌版本的 tomcat，所以一个tomcat服务器会被启动并代替你进行合理的配置。再比如，因为应用要依赖 Spring 的 MVC 框架,一个 Spring MVC 的 DispatcherServlet 将被配置并注册，并且不再需要 web.xml 文件。

上面三个注解还可以用 @SpringBootApplication 代替：

```java
package com.javachen.examples.springboot;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication // same as @Configuration @EnableAutoConfiguration @ComponentScan
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
```

另外，你还可以添加 `@EnableWebMvc` 注解配置 Spring Mvc。

### 运行项目

可以在项目根路径直接运行下面命令：

```bash
$ export JAVA_OPTS=-Xmx1024m -XX:MaxPermSize=128M -Djava.security.egd=file:/dev/./urandom

$ gradlew bootRun
```

也可以先 build 生成一个 jar 文件，然后执行该 jar 文件：

```bash
$ gradlew build && java -jar build/libs/spring-boot-examples-0.1.0.jar
```

启动过程中你会看到如下内容：

```
Let's inspect the beans provided by Spring Boot:
application
beanNameHandlerMapping
defaultServletHandlerMapping
dispatcherServlet
embeddedServletContainerCustomizerBeanPostProcessor
handlerExceptionResolver
helloController
httpRequestHandlerAdapter
messageSource
mvcContentNegotiationManager
mvcConversionService
mvcValidator
org.springframework.boot.autoconfigure.MessageSourceAutoConfiguration
org.springframework.boot.autoconfigure.PropertyPlaceholderAutoConfiguration
org.springframework.boot.autoconfigure.web.EmbeddedServletContainerAutoConfiguration
org.springframework.boot.autoconfigure.web.EmbeddedServletContainerAutoConfiguration$DispatcherServletConfiguration
org.springframework.boot.autoconfigure.web.EmbeddedServletContainerAutoConfiguration$EmbeddedTomcat
org.springframework.boot.autoconfigure.web.ServerPropertiesAutoConfiguration
org.springframework.boot.context.embedded.properties.ServerProperties
org.springframework.context.annotation.ConfigurationClassPostProcessor.enhancedConfigurationProcessor
org.springframework.context.annotation.ConfigurationClassPostProcessor.importAwareProcessor
org.springframework.context.annotation.internalAutowiredAnnotationProcessor
org.springframework.context.annotation.internalCommonAnnotationProcessor
org.springframework.context.annotation.internalConfigurationAnnotationProcessor
org.springframework.context.annotation.internalRequiredAnnotationProcessor
org.springframework.web.servlet.config.annotation.DelegatingWebMvcConfiguration
propertySourcesBinder
propertySourcesPlaceholderConfigurer
requestMappingHandlerAdapter
requestMappingHandlerMapping
resourceHandlerMapping
simpleControllerHandlerAdapter
tomcatEmbeddedServletContainerFactory
viewControllerHandlerMapping
```

你也可以启动远程调试：

```bash
$ gradlew build 

$ java -Xdebug -Xrunjdwp:server=y,transport=dt_socket,address=8000,suspend=n \
       -jar build/libs/spring-boot-examples-0.1.0.jar
```

### 创建单元测试

在 build.gradle 中添加依赖：

```groovy
dependencies {
    compile("org.springframework.boot:spring-boot-starter-web")
    compile("org.springframework.boot:spring-boot-starter-actuator")
    testCompile("org.springframework.boot:spring-boot-starter-test")
}
```

创建 maven 的 test source 目录 src/test/java/com/javachen/examples/springboot：

```
mkdir -p src/test/java/com/javachen/examples/springboot
```

创建测试类 src/test/java/com/javachen/examples/springboot/web/GreetingControllerTest：

```java
package com.javachen.examples.springboot.web;

import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.springframework.boot.test.SpringApplicationConfiguration;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockServletContext;
import org.springframework.test.context.junit4.SpringJUnit4ClassRunner;
import org.springframework.test.context.web.WebAppConfiguration;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.javachen.examples.springboot.web.GreetingController;

@RunWith(SpringJUnit4ClassRunner.class)
@SpringApplicationConfiguration(classes = MockServletContext.class)
@WebAppConfiguration
public class GreetingControllerTest {

    private MockMvc mvc;

    @Before
    public void setUp() throws Exception {
        mvc = MockMvcBuilders.standaloneSetup(new GreetingController()).build();
    }

    @Test
    public void getHello() throws Exception {
        mvc.perform(MockMvcRequestBuilders.get("/index").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().string(is("Greetings from Spring Boot!")));
    }
```

运行该测试用例：

```bash
$ gradle test
```

并且你也可以通过下面命令检查服务运行状态：

```bash
$ curl localhost:8080/health
ok
```

### 通过浏览器测试

打开浏览器访问 <http://localhost:8080/greeting>，可以看到页面输出下面内容：

```json
{"id":1,"content":"Hello, World!"}
```

添加一个参数，访问 <http://localhost:8080/greeting?name=User>，这时候页面输出下面内容：

```json
{"id":2,"content":"Hello, User!"}
```

### 创建静态页面

创建 public/hello.js：

```javascript
$(document).ready(function() {
    $.ajax({
        url: "http://localhost:8080/greeting"
    }).then(function(data, status, jqxhr) {
       $('.greeting-id').append(data.id);
       $('.greeting-content').append(data.content);
       console.log(jqxhr);
    });
});
```

创建一个页面 public/index.html：

``` html
<!DOCTYPE html>
<html>
    <head>
        <title>Hello World</title>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/1.11.2/jquery.min.js"></script>
        <script src="hello.js"></script>
    </head>

    <body>
        <div>
            <p class="greeting-id">The ID is </p>
            <p class="greeting-content">The content is </p>
        </div>
        <h4>Response headers:</h4>
        <div class="response-headers">
        </div>
    </body>
</html>
```

现在可以使用 Spring Boot CLI 启动一个嵌入式的 tomcat 服务来访问静态页面，你需要创建 app.groovy 告诉 Spring Boot 你需要运行 tomcat：

```groovy
@Controller class JsApp { }
```

Spring Boot CLI  在 mac 系统上通过 brew 安装的方法如下：

``` bash
brew tap pivotal/tap
brew install springboot
```

接下来可以指定端口运行一个 tomcat：

```bash
spring run app.groovy -- --server.port=9000
```

### 总结

本文主要参考 Sping 官方例子来了解和熟悉使用 Gradle 创建 Spring Boot 项目的过程，希望能对你有所帮助。

文中相关的源码在 [spring-boot-examples](https://github.com/javachen/spring-boot-examples)。

### 参考文章
- [Building a RESTful Web Service](http://spring.io/guides/gs/rest-service/)
- [Enabling Cross Origin Requests for a RESTful Web Service](http://spring.io/guides/gs/rest-service-cors)
- [Building an Application with Spring Boot](http://spring.io/guides/gs/spring-boot/)






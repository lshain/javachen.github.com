---
title: About
layout: page
tagline:
group: navigation
comment: true
---

#### Who I am

{{ site.description }}

#### Employment

当前正在从事 hadoop 相关的工作，所以，你懂的！

#### Social Participation

Email：{{ site.author.email }}

{% if site.author.weibo %}
Weibo：<http://weibo.com/{{ site.author.weibo }}>
{% endif %}

{% if site.author.github %}
Github：<https://github.com/{{ site.author.github }}>
{% endif %}


{% include comments.html %}

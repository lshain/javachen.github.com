---
title: About
layout: page
tagline:
group: navigation
comment: true
---

#### Who I am

{{ site.description }}

#### Contact me

Email：{{ site.author.email }}

{% if site.author.weibo %}
Weibo：<http://weibo.com/{{ site.author.weibo }}>
{% endif %}

{% if site.author.github %}
Github：<https://github.com/{{ site.author.github }}>
{% endif %}

RSS：[{{ site.url }}{{ '/rss.xml' }}](/rss.xml)

QQ交流群：142824963

{% include support.html %}

{% include comments.html %}

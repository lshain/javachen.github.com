---
layout: index 
title: Home - JavaChen...
---

{% for post in site.posts %}
- ### [{{ post.title }}]({{ post.url }}) <time>{{ post.date | date: '%Y-%m-%d'}}</time>

  {{post.summary}}

  [Read More &raquo;]({{ post.url }})
{% endfor %}


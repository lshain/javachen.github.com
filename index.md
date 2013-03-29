---
layout: index 
title: Home - JavaChen...
---

{% for post in site.posts %}
<li>{{ post.date | date: '%Y-%m-%d'}} » [{{ post.title }}]({{ post.url }}) </li>
{% endfor %}

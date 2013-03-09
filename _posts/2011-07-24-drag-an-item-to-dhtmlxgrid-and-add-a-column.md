---
layout: post
title: Drag an item to dhtmlxGrid and add a column
categories:
- JavaScript
tags:
- DhtmlxGrid
- DhtmlxTree
published: true
comments: true
---
<p>dhtmlxGrid支持tree和grid、grid之间、grid内部进行拖拽，如在grid内部进行拖拽，可以增加一行；在grid之间拖拽，第一个grid的记录删除，第二个grid增加一行记录。如果我想在拖拽之后不是添加一行而是一列，该怎么做呢？<br />
现在有个需求，就是左边有个tree，右边有个grid，将左边tree的一个节点拖到右边grid的表头并动态增加一列。这个怎么做呢？<br />
如果你想快点看到最后的实现方法，你可以直接跳到本文的最后参看源码。<br />
首先看看dhtmlxTree 关于<a href="http://www.dhtmlx.com/docs/products/dhtmlxGrid/samples/05_drag_n_drop/">Drag-n-Drop</a>的例子，其中有这样一个例子<a href="http://www.dhtmlx.com/docs/products/dhtmlxTree/samples/05_drag_n_drop/08_pro_drag_out.html">Custom Drag Out</a>。
<div class="pic">
<a href="http://blog.javachen.com/files/2011/07/QQ截图20110724205806.png"><img class="aligncenter size-medium wp-image-2237" title="QQ截图20110724205806" src="http://blog.javachen.com/files/2011/07/QQ截图20110724205806-300x148.png" alt="" width="300" height="148" /></a>
</div>
<!--more-->
上面的例子，右边定义了一个输入框，其id为“sInput”，代码如下：
<pre escaped="true" lang="javascript" line="1">function maf() {
    return false;
}
tree = new dhtmlXTreeObject("treeboxbox_tree", "100%", "100%", 0);</pre></p>

<p>tree.setSkin('dhx_skyblue');<br />
tree.setImagePath("../../codebase/imgs/csh_yellowbooks/");<br />
tree.enableDragAndDrop(true);<br />
tree.setDragHandler(maf);<br />
tree.enableSmartXMLParsing(true);<br />
tree.loadXML("../common/tree_05_drag_n_drop.xml");</p>

<p>function s_control() {<br />
    this._drag = function(sourceHtmlObject, dhtmlObject, targetHtmlObject) {<br />
        targetHtmlObject.style.backgroundColor = "";<br />
        targetHtmlObject.value = sourceHtmlObject.parentObject.label;<br />
    }<br />
    this._dragIn = function(htmlObject, shtmlObject) {<br />
        htmlObject.style.backgroundColor = "#fffacd";<br />
        return htmlObject;<br />
    }<br />
    this._dragOut = function(htmlObject) {<br />
        htmlObject.style.backgroundColor = "";<br />
        return this;<br />
    }<br />
}
var sinput = document.getElementById('sInput');<br />
tree.dragger.addDragLanding(sinput, new s_control);
为了使tree支持拖拽功能，必须添加以下代码：
<pre escaped="true" lang="javascript" line="1">tree.enableDragAndDrop(true);</pre>
为了实现自定义拖拽的输出，添加了以下代码：
<pre escaped="true" lang="javascript" line="1">tree.dragger.addDragLanding(sinput, new s_control);</pre>
从上面的字母意思可以看出，是在tree的拖拽对象dragger对象上添加一个拖拽着地对象，第一个常数是指拖拽到哪一个区域，第二个常数定义拖拽的三个方法：
<pre escaped="true" lang="javascript" line="1">    this._drag = function(sourceHtmlObject, dhtmlObject, targetHtmlObject) {
        targetHtmlObject.style.backgroundColor = "";
        targetHtmlObject.value = sourceHtmlObject.parentObject.label;
    }
    this._dragIn = function(htmlObject, shtmlObject) {
        htmlObject.style.backgroundColor = "#fffacd";
        return htmlObject;
    }
    this._dragOut = function(htmlObject) {
        htmlObject.style.backgroundColor = "";
        return this;
    }</pre>
参照上面的思路，我们可以在grid的表头上面定义一个id，然后通过该id获得表头的dom对象，更好的一个方法是通过mygrid.hdr（看看源码就知道列）能过获得grid的表头对象，然后调用下面的方法，定义tree拖拽到grid的表头：
<pre escaped="true" lang="javascript" line="1">tree.dragger.addDragLanding(mygrid.hdr, new s_control);</pre>
但是这个时候，你将tree的一个节点拖到grid的表头，grid不会有任何反应，故需要改写s_control对象的方法，这里主要是改写一个方法：
<pre escaped="true" lang="javascript" line="1">var insertId;
this._drag = function(sourceHtmlObject, dhtmlObject,
		targetHtmlObject, e) {
	var zel = e;
	while (zel.tagName != "TABLE")
		zel = zel.parentNode;
	var grid = zel.grid;
	if (!grid)
		return;
	grid.setActive();
	if (!grid._mCol || e.button == 2)
		return;
	e = grid.getFirstParentOfType(e, "TD")</pre></p>

<p>	if ((grid) &amp;&amp; (!grid._colInMove)) {<br />
		grid.resized = null;<br />
		if ((!grid._mCols) || (grid._mCols[e._cellIndex] == "true"))<br />
			insertId = e._cellIndex + 1;<br />
	}</p>

<p>	mygrid.insertColumn(insertId, "12", "ed", 80);<br />
}
该方法主要做的事情是计算拖拽落脚时候鼠标焦点所在的列，然后在其右边添加一新的列。
<div class="pic">
<a href="http://blog.javachen.com/files/2011/07/QQ截图20110724211631.png"><img class="aligncenter size-medium wp-image-2238" title="QQ截图20110724211631" src="http://blog.javachen.com/files/2011/07/QQ截图20110724211631-300x91.png" alt="" width="300" height="91" /></a>
</div></p>

<p>本例最后的代码：
<pre escaped="true" lang="javascript" line="1">
<script>
	var mygrid;<br>
	function maf() {<br>
		return false;<br>
	}</p>

<p>	tree = new dhtmlXTreeObject("treeboxbox_tree", "100%", "100%", 0);<br>
	tree.setSkin('dhx_skyblue');<br>
	tree.setImagePath("../../dhtmlxTree/codebase/imgs/csh_yellowbooks/");<br>
	tree.enableDragAndDrop(true);<br>
	//tree.setDragHandler(maf);<br>
	tree.enableSmartXMLParsing(true);<br>
	tree.loadXML("../../dhtmlxTree/samples/common/tree_05_drag_n_drop.xml")<br>
	tree.openAllItems(0);</p>

<p>	function s_control() {<br>
		var insertId;<br>
		this._drag = function(sourceHtmlObject, dhtmlObject,<br>
				targetHtmlObject, e) {<br>
			var zel = e;<br>
			while (zel.tagName != "TABLE")<br>
				zel = zel.parentNode;<br>
			var grid = zel.grid;<br>
			if (!grid)<br>
				return;<br>
			grid.setActive();<br>
			if (!grid._mCol || e.button == 2)<br>
				return;<br>
			e = grid.getFirstParentOfType(e, "TD")</p>

<p>			if ((grid) && (!grid._colInMove)) {<br>
				grid.resized = null;<br>
				if ((!grid._mCols) || (grid._mCols[e._cellIndex] == "true"))<br>
					insertId = e._cellIndex + 1;<br>
			}</p>

<p>			mygrid.insertColumn(insertId, "12", "ed", 80);<br>
		}<br>
	}<br>
	mygrid = new dhtmlXGridObject('gridbox');<br>
	mygrid.setImagePath("../codebase/imgs/");<br>
	mygrid.setHeader("Sales,Book Title,Author,Price,In Store,Shipping,Bestseller,<br>
              Date of Publication");<br>
	mygrid.setInitWidths("50,150,100,80,80,80,80,200");<br>
	mygrid.setColAlign("right,left,left,right,center,left,center,center");<br>
	mygrid.setColTypes("dyn,edtxt,ed,price,ch,co,ra,ro");<br>
	mygrid.enableDragAndDrop("temporary_disabled", true);<br>
	mygrid.init();<br>
	mygrid.setSkin("dhx_skyblue");<br>
	mygrid.enableHeaderMenu();<br>
	mygrid.enableColumnMove(true);<br>
	mygrid.setColumnHidden(2, true);<br>
	mygrid.attachEvent("onHeaderClick", function(ind, obj) {<br>
	});<br>
	mygrid.loadXML("../common/grid_ml_16_rows_columns_manipulations.xml");<br>
	tree.dragger.addDragLanding(mygrid.hdr, new s_control);
</script>
</pre>
本文实现的是将tree拖拽到grid，其实其他的一些支持拖拽的组件也可以做，并不局限于tree组件，甚至还见过有人实现jquery的dtree拖拽到dhtmlxGrid增加一行记录。</p>

<div class="info">
<h2>参考文章</h2>
<li>
Custom Drag Out：<a href="http://www.dhtmlx.com/docs/products/dhtmlxTree/samples/05_drag_n_drop/08_pro_drag_out.html" target="_blank">http://www.dhtmlx.com/docs/products/dhtmlxTree/samples/05_drag_n_drop/08_pro_drag_out.html</a>
</li>
<li>dhtmlxGrid doc：<a href="http://docs.dhtmlx.com/doku.php?id=dhtmlxgrid:toc" target="_blank">http://docs.dhtmlx.com/doku.php?id=dhtmlxgrid:toc</a>
</li>
<li>dhtmlxTree doc：<a href="http://docs.dhtmlx.com/doku.php?id=dhtmlxtree:toc" target="_blank">http://docs.dhtmlx.com/doku.php?id=dhtmlxtree:toc</a>
</li>

---
layout: post
title: Export DhtmlxGrid to PDF in Java
categories:
- JavaScript
tags:
- DhtmlxGrid
published: true
comments: true
---
<p>将DhtmlxGrid数据导出到pdf这是很常见的需求，dhtmlx官网提供了php和java版本的例子，你可以去官网查看这篇文章《<a href="http://www.dhtmlx.com/blog/?p=855">Grid-to-Excel, Grid-to-PDF Available for Java</a>》，你可以从以下地址下载导出程序源码：
<a href="http://www.dhtmlx.com/x/download/regular/export/XML2Excel.war">Export to Excel</a>
<a href="http://www.dhtmlx.com/x/download/regular/export/XML2PDF.war">Export to PDF</a>
当然，还有一个示例工程：<a href="http://www.dhtmlx.com/x/download/regular/export/javaexport_sample.zip"> .zip archive with an example</a></p>

<p>XML2PDF和XML2Excel工程内代码很相似，XML2PDF内部使用了PDFjet.jar导出PDF，而XML2Excel使用JXL导出Excel。<br />
需要说明的是，还需要引入dhtmlxgrid_export.js文件，该文件是导出grid的js源码，主要用于将表格数据，包括表头、样式等，序列化为xml字符串，然后模拟一个Form表单提交数据。</p>

<p>将上面三个工程导入到一个工程然后打开sample.html页面，效果如下：
<div class="pic">
<a href="http://blog.javachen.com/files/2011/08/export-dhtmlxgrid-to-pdf.png"><img src="http://blog.javachen.com/files/2011/08/export-dhtmlxgrid-to-pdf-300x166.png" alt="" title="export dhtmlxgrid to pdf" width="300" height="166" class="aligncenter size-medium wp-image-2385" /></a>
</div>
点击Get as PDF按钮，你会发现会打开一个新的窗口，然后页面什么都没有，而eclipse控制台报空指针异常。异常的主要原因在于下段代码：。
<pre lang="java">
DocumentBuilderFactory dbf = DocumentBuilderFactory.newInstance ();
DocumentBuilder db = dbf.newDocumentBuilder();
Document dom = null;
try {
     dom = db.parse(new InputSource(new StringReader(xml)));
}catch(SAXException se) {
     se.printStackTrace();
}catch(IOException ioe) { 
     ioe.printStackTrace();
}
root = dom.getDocumentElement();</pre></p>

<p>上面的代码，DocumentBuilder解析xml字符串后dom对象内并没有数据。<br />
为了能够看到DhtmlxGrid导出pdf的效果，决定将上面的代码用dom4j改写，于是有了下面的代码：
<pre lang="java">
public class PDFXMLParser {
	Element root;
	PDFColumn[][] columns;
	PDFRow[] rows;
	double[] widths;
	private Boolean header = false;
	private Boolean footer = false;
	private String profile = "gray";
	private double[] orientation = null;</pre></p>

<p>	public void setXML(String xml) {<br />
		SAXReader saxReader = new SAXReader();</p>

<p>		Document document = null;<br />
		try {<br />
			document = saxReader.read(new ByteArrayInputStream(xml.getBytes()));<br />
		} catch (DocumentException e) {<br />
			e.printStackTrace();<br />
		}<br />
		root = document.getRootElement();</p>

<p>		if ((root.attributeValue("header") != null)<br />
				&amp;&amp; (root.attributeValue("header").equalsIgnoreCase("true") == true)) {<br />
			header = true;<br />
		}<br />
		String footer_string = root.attributeValue("footer");<br />
		if ((footer_string != null)<br />
				&amp;&amp; (footer_string.equalsIgnoreCase("true") == true)) {<br />
			footer = true;<br />
		}<br />
		String profile_string = root.attributeValue("profile");<br />
		if (profile_string != null) {<br />
			profile = profile_string;<br />
		}</p>

<p>		String orientation_string = root.attributeValue("orientation");<br />
		if (orientation_string != null) {<br />
			if (orientation_string.equalsIgnoreCase("landscape")) {<br />
				orientation = A4.LANDSCAPE;<br />
			} else {<br />
				orientation = A4.PORTRAIT;<br />
			}<br />
		} else {<br />
			orientation = Letter.PORTRAIT;<br />
		}<br />
	}</p>

<p>	public PDFColumn[][] getColumnsInfo() {<br />
		PDFColumn[] colLine = null;<br />
		List n1 = root.element("head").elements("columns");<br />
		if ((n1 != null) &amp;&amp; (n1.size() &gt; 0)) {<br />
			columns = new PDFColumn[n1.size()][];<br />
			for (int i = 0; i &lt; n1.size(); i++) {<br />
				Element cols = (Element) n1.get(i);<br />
				List n2 = cols.elements("column");<br />
				if ((n2 != null) &amp;&amp; (n2.size() &gt; 0)) {<br />
					colLine = new PDFColumn[n2.size()];<br />
					for (int j = 0; j &lt; n2.size(); j++) {<br />
						Element col_xml = (Element) n2.get(j);<br />
						PDFColumn col = new PDFColumn();<br />
						col.parse(col_xml);<br />
						colLine[j] = col;<br />
					}<br />
				}<br />
				columns[i] = colLine;<br />
			}<br />
		}<br />
		createWidthsArray();<br />
		optimizeColumns();<br />
		return columns;<br />
	}<br />
        public PDFRow[] getGridContent() {<br />
		List nodes = root.elements("row");<br />
		if ((nodes != null) &amp;&amp; (nodes.size() &gt; 0)) {<br />
			rows = new PDFRow[nodes.size()];<br />
			for (int i = 0; i &lt; nodes.size(); i++) {<br />
				rows[i] = new PDFRow();<br />
				rows[i].parse((Element) nodes.get(i));<br />
			}<br />
		}<br />
		return rows;</p>

<p>	}</p>

<p>       *****<br />
}</p>

<p>还需要修改PDFRow类的parse方法和PDFColumn的parse方法。</p>
<pre lang="java">
public class PDFRow {

<p>	private String[] cells;</p>

<p>	public void parse(Element parent) {<br />
		List nodes = ((Element) parent).elements("cell");<br />
		if ((nodes != null) &amp;&amp; (nodes.size() &gt; 0)) {<br />
			cells = new String[nodes.size()];<br />
			for (int i = 0; i &lt; nodes.size(); i++) {<br />
				cells[i] = ((Element) nodes.get(i)).getTextTrim();<br />
			}<br />
		}<br />
	}</p>

<p>	public String[] getCells() {<br />
		return cells;<br />
	}<br />
}</p>

<p>public class PDFColumn {</p>

	public void parse(Element parent) {<br />
		colName = parent.getText();<br />
		String width_string = parent.attributeValue("width");<br />
		if (width_string!=null&&width_string.length() > 0) {<br />
			width = Integer.parseInt(width_string);<br />
		}<br />
		type = parent.attributeValue("type");<br />
		align = parent.attributeValue("align");<br />
		String colspan_string = parent.attributeValue("colspan");<br />
		if (colspan_string!=null&&colspan_string.length() > 0) {<br />
			colspan = Integer.parseInt(colspan_string);<br />
		}<br />
		String rowspan_string = parent.attributeValue("rowspan");<br />
		if (rowspan_string!=null&&rowspan_string.length() > 0) {<br />
			rowspan= Integer.parseInt(rowspan_string);<br />
		}<br />
	}<br />
}
</pre>

<p>这样xml字符串就能正常解析了，然后使用pdfjet.jar包就可以导出pdf了，最后的效果如下：
<div class="pic">
<a href="http://blog.javachen.com/files/2011/08/export-dhtmlx-to-pdf-pdf.png"><img src="http://blog.javachen.com/files/2011/08/export-dhtmlx-to-pdf-pdf-300x134.png" alt="" title="export dhtmlx to pdf -pdf" width="300" height="134" class="aligncenter size-medium wp-image-2386" /></a>
</div></p>

<p><h2>结论：</h2>
<div class="note">
1.导出pdf和导出Excel代码差不多，这里不做说明。<br />
2.使用上面的工具，可以将dhtmlxgrid的数据导出到pdf，并且导出的pdf还保持了grid表格的样式（包括颜色、多表头、表头合并、复选框等等），这点很不错。<br />
3.导出的pdf为多页显示，每页有表头<br />
4.导出后的pdf页面可以直接打印，当然如果在代码上做点处理，可以直接将pdf保存为一个文件，让用户下载。
</div></p>

<p></p>

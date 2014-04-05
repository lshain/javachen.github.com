jQuery.noConflict(),
jQuery(document).ready(function() {
    jQuery("#toTop").hide(),
    jQuery("#toTop a:first").click(function() {
        jQuery("html,body").animate({
            scrollTop: 0
        },
        200)
    });
    var a = parseInt(jQuery("body").css("height"));
    jQuery("#toTop a:last").click(function() {
        jQuery("html,body").animate({
            scrollTop: a
        },
        200)
    }),
    jQuery(window).scroll(function() {
        jQuery(this).scrollTop() > 200 ? jQuery("#toTop").fadeIn() : jQuery("#toTop").fadeOut()
    }),
    jQuery("div.entry-content img").each(function() {
        var a = "<a id='fancyBox' href='" + this.src + "'></a>";
        jQuery(this).wrapAll(a)
    }),
    jQuery("#fancyBox").fancybox({
        openEffect: "elastic",
        closeEffect: "elastic"
    })
	checkUrl();
});

function checkUrl(){
	var patt = new RegExp("/[a-z]+[-]?[a-z]+/[0-9]+/[0-9]+/[0-9]+/[a-z]+");
	if(patt.test(location.pathname)){
		window.location.href = "/"+location.pathname.split("/").slice(2).join("/");
	}
}

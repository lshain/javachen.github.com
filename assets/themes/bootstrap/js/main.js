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
    jQuery("div.content img").each(function() {
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
	if(location.pathname.substring(0,3)=="/20"){
		return;
	}
	if(new RegExp("/[a-z]+[-]?[a-z]+/[0-9]+/[0-9]+/[0-9]+/[a-z]+").test(location.pathname)){
		window.location.href = "/"+location.pathname.split("/").slice(2).join("/");
	}
}

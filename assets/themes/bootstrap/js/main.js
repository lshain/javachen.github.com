function checkUrl() {
    if (!new RegExp("^/20").test(location.pathname)) {
        location.href = "/" + location.pathname.split("/").slice(2).join("/");
    }
}
jQuery.noConflict(), jQuery(document).ready(function() {
   jQuery("#toTop").hide(), jQuery("#toTop a:first").click(function() {
        jQuery("html,body").animate({
            scrollTop:0
        }, 200);
    });
    var a = parseInt(jQuery("body").css("height"));
    jQuery("#toTop a:last").click(function() {
        jQuery("html,body").animate({
            scrollTop:a
        }, 200);
    }), jQuery(window).scroll(function() {
        jQuery(this).scrollTop() > 200 ? jQuery("#toTop").fadeIn() :jQuery("#toTop").fadeOut();
    });
});

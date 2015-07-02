$(document).ready(function() {

  vis.createBreadcrumbs($(".container.full").first());
  
});

// namespace
var vis = {};

/**
 * Adds a breadcrumb as first child to the specified container.
 * 
 * @author felixhayashi
 */
vis.createBreadcrumbs = function(container) {
    
  // use the url to infer the path
  var crumbs = location.pathname.split('/');
  
  // number of ancestor directories
  var stepbackIndex = crumbs.length-1;
  var breadcrumbs = $.map(crumbs, function(crumb, i) {
    
    // first and last element of the split
    if(!crumb) return;
    
    stepbackIndex--;
    
    if(/\.html$/.test(crumb)) {
      
      // strip the .html to make it look prettier
      return "<span>" + crumb.replace(/\.html$/, "") + "</span>";
      
    } else {
            
      // calculate the relative url
      for(var ref=crumb+"/", j=0; j<stepbackIndex; j++, ref="../"+ref);
      
      return "<a href='" + ref + "'>" + crumb + "</a>";
    }
  }).join("") || "Home";

  // insert into the container at the beginning.
  $(container).prepend("<div id=\"breadcrumbs\">" + breadcrumbs + "</div>");
  
};
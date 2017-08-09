/**
 * Wait until the test condition is true or a timeout occurs. Useful for waiting
 * on a server response or for a ui change (fadeIn, etc.) to occur.
 *
 * @param testFx javascript condition that evaluates to a boolean,
 * it can be passed in as a string (e.g.: "1 == 1" or "$('#bar').is(':visible')" or
 * as a callback function.
 * @param onReady what to do when testFx condition is fulfilled,
 * it can be passed in as a string (e.g.: "1 == 1" or "$('#bar').is(':visible')" or
 * as a callback function.
 * @param timeOutMillis the max amount of time to wait. If not specified, 3 sec is used.
 */

"use strict";
function waitFor(testFx, onReady, timeOutMillis) {
    var maxtimeOutMillis = timeOutMillis ? timeOutMillis : 30000, //< Default Max Timout is 3s
        start = new Date().getTime(),
        condition = false,
        interval = setInterval(function() {
            if ( (new Date().getTime() - start < maxtimeOutMillis) && !condition ) {
                // If not time-out yet and condition not yet fulfilled
                condition = (typeof(testFx) === "string" ? eval(testFx) : testFx()); //< defensive code
            } else {
                if(!condition) {
                    // If condition still not fulfilled (timeout but condition is 'false')
                    console.log("Timeout!");
                    phantom.exit(1);
                } else {
                    // Condition fulfilled (timeout and/or condition is 'true')
                    console.log("Finished in " + (new Date().getTime() - start) + "ms.");
                    typeof(onReady) === "string" ? eval(onReady) : onReady(); //< Do what it's supposed to do once the condition is fulfilled
                    clearInterval(interval); //< Stop this interval
                }
            }
        }, 250); //< repeat check every 20ms
}

var examplePaths = ["examples/graph2d/01_basic.html",
					"examples/graph2d/02_bars.html",
					"examples/graph2d/03_groups.html",
					"examples/graph2d/04_rightAxis.html"];
var tasks = examplePaths.length*2;

function renderLivePage(example, index) {
	var input = "http://visjs.org/" + example;
	var output = example.replace(".html", "-live.png");
	renderPageToPNG(input, output);
}

function renderLocalPage(example, index) {
	var branch = "gh-pages";  // TODO: Get from Env: TRAVIS_BRANCH
	var repoSlug = "almende/vis";  // TODO: Get from Env: TRAVIS_REPO_SLUG
	var input = "https://htmlpreview.github.io/?https://github.com/" + repoSlug + "/blob/" + branch + "/" + example;
	var output = example.replace(".html", "-local.png");
	renderPageToPNG(input, output);
}

function renderPageToPNG(input, output) {
	var page = require('webpage').create();
	// Open Twitter on 'sencha' profile and, onPageLoad, do...
	page.open(input, function (status) {
	    // Check for page load success
	    if (status !== "success") {
	        console.log("Unable to access network");
	    } else {
	        // Wait for 'signin-dropdown' to be visible
	        waitFor(function() {
	            // Check in the page if a specific element is now visible
	            return page.evaluate(function() {
	                return document.getElementsByClassName("vis-graph-group0").length > 0;
	            });
	        }, function() {
	           page.render(output);
	           tasks--;
	           if (tasks == 0) {
	           	 phantom.exit();
	           }
	        });
	    }
	});
}

examplePaths.forEach(renderLivePage);
examplePaths.forEach(renderLocalPage);

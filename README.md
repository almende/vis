vis.js
==================

Vis.js is a dynamic, browser based visualization library.
The library is designed to be easy to use, handle large amounts
of dynamic data, and enable manipulation of the data.
The library consists of the following components:

- DataSet and DataView. A flexible key/value based data set. Add, update, and 
  remove items. Subscribe on changes in the data set. A DataSet can filter and 
  order items, and convert fields of items.
- DataView. A filtered and/or formatted view on a DataSet.
- Graph2d. Plot data on a timeline with lines or barcharts.
- Graph3d. Display data in a three dimensional graph.
- Network. Display a network (force directed graph) with nodes and edges.
- Timeline. Display different types of data on a timeline.

The vis.js library is developed by [Almende B.V](http://almende.com).


## Install

Install via npm:

    npm install vis

Install via bower:

    bower install vis

Link via cdnjs:

    http://cdnjs.com

Or download the library from the github project:
[https://github.com/almende/vis.git](https://github.com/almende/vis.git).


## Load


To use a component, include the javascript and css files of vis in your web page:

```html
<!DOCTYPE HTML>
<html>
<head>
  <script src="components/vis/dist/vis.js"></script>
  <link href="components/vis/dist/vis.css" rel="stylesheet" type="text/css" />
</head>
<body>
  <script type="text/javascript">
    // ... load a visualization
  </script>
</body>
</html>
```

or load vis.js using require.js. Note that vis.css must be loaded too.

```js
require.config({
  paths: {
    vis: 'path/to/vis/dist',
  }
});
require(['vis'], function (math) {
  // ... load a visualization
});
```


A timeline can be instantiated as:

```js
var timeline = new vis.Timeline(container, data, options);
```

Where `container` is an HTML element, `data` is an Array with data or a DataSet,
and `options` is an optional object with configuration options for the
component.


## Example

A basic example on loading a Timeline is shown below. More examples can be
found in the [examples directory](https://github.com/almende/vis/tree/master/examples)
of the project.

```html
<!DOCTYPE HTML>
<html>
<head>
  <title>Timeline basic demo</title>
  <script src="vis/dist/vis.js"></script>
  <link href="vis/dist/vis.css" rel="stylesheet" type="text/css" />

  <style type="text/css">
    body, html {
      font-family: sans-serif;
    }
  </style>
</head>
<body>
<div id="visualization"></div>

<script type="text/javascript">
  var container = document.getElementById('visualization');
  var data = [
    {id: 1, content: 'item 1', start: '2013-04-20'},
    {id: 2, content: 'item 2', start: '2013-04-14'},
    {id: 3, content: 'item 3', start: '2013-04-18'},
    {id: 4, content: 'item 4', start: '2013-04-16', end: '2013-04-19'},
    {id: 5, content: 'item 5', start: '2013-04-25'},
    {id: 6, content: 'item 6', start: '2013-04-27'}
  ];
  var options = {};
  var timeline = new vis.Timeline(container, data, options);
</script>
</body>
</html>
```


## Build

To build the library from source, clone the project from github

    git clone git://github.com/almende/vis.git

The source code uses the module style of node (require and module.exports) to
organize dependencies. To install all dependencies and build the library, 
run `npm install` in the root of the project.

    cd vis
    npm install

Then, the project can be build running:

    npm run build

To automatically rebuild on changes in the source files, once can use

    npm run watch

This will both build and minify the library on changes. Minifying is relatively
slow, so when only the non-minified library is needed, one can use the 
`watch-dev` script instead:

    npm run watch-dev


## Custom builds

The folder `dist` contains bundled versions of vis.js for direct use in the browser. These bundles contain the all visualizations and includes external dependencies such as hammer.js and moment.js.

The source code of vis.js consists of commonjs modules, which makes it possible to create custom bundles using tools like [Browserify](http://browserify.org/) or [Webpack](http://webpack.github.io/). This can be bundling just one visualization like the Timeline, or bundling vis.js as part of your own browserified web application. 

*Note that hammer.js version 2 is required as of v4.*


#### Prerequisites

Before you can do a build:

- Install node.js, npm, browserify, and uglify-js on your system.
- Download or clone the vis.js project.
- Install the dependencies of vis.js by running `npm install` in the root of the project.


#### Example 1: Bundle a single visualization

For example, to create a bundle with just the Timeline and DataSet, create an index file named **custom.js** in the root of the project, containing: 

```js
exports.DataSet = require('./lib/DataSet');
exports.Timeline = require('./lib/timeline/Timeline');
```

Install browserify globally via `[sudo] npm install -g browserify`, then create a custom bundle like:

    browserify custom.js -t babelify -o vis-custom.js -s vis

This will generate a custom bundle *vis-custom.js*, which exposes the namespace `vis` containing only `DataSet` and `Timeline`. The generated bundle can be minified with uglifyjs (installed globally with `[sudo] npm install -g uglify-js`):

    uglifyjs vis-custom.js -o vis-custom.min.js

The custom bundle can now be loaded like:

```html
<!DOCTYPE HTML>
<html>
<head>
  <script src="vis-custom.min.js"></script>
  <link href="dist/vis.min.css" rel="stylesheet" type="text/css" />
</head>
<body>
  ...
</body>
</html>
```

#### Example 2: Exclude external libraries

The default bundle `vis.js` is standalone and includes external dependencies such as hammer.js and moment.js. When these libraries are already loaded by the application, vis.js does not need to include these dependencies itself too. To build a custom bundle of vis.js excluding moment.js and hammer.js, run browserify in the root of the project:

    browserify index.js -t babelify -o vis-custom.js -s vis -x moment -x hammerjs
    
This will generate a custom bundle *vis-custom.js*, which exposes the namespace `vis`, and has moment and hammerjs excluded. The generated bundle can be minified with uglifyjs:

    uglifyjs vis-custom.js -o vis-custom.min.js

The custom bundle can now be loaded as:

```html
<!DOCTYPE HTML>
<html>
<head>
  <!-- load external dependencies -->
  <script src="http://cdnjs.cloudflare.com/ajax/libs/moment.js/2.7.0/moment.min.js"></script>
  <script src="http://cdnjs.cloudflare.com/ajax/libs/hammer.js/1.1.3/hammer.min.js"></script>

  <!-- load vis.js -->
  <script src="vis-custom.min.js"></script>
  <link href="dist/vis.min.css" rel="stylesheet" type="text/css" />
</head>
<body>
  ...
</body>
</html>
```

#### Example 3: Bundle vis.js as part of your (commonjs) application

When writing a web application with commonjs modules, vis.js can be packaged automatically into the application. Create a file **app.js** containing:

```js
var moment = require('moment');
var DataSet = require('vis/lib/DataSet');
var Timeline = require('vis/lib/timeline/Timeline');

var container = document.getElementById('visualization');
var data = new DataSet([
  {id: 1, content: 'item 1', start: moment('2013-04-20')},
  {id: 2, content: 'item 2', start: moment('2013-04-14')},
  {id: 3, content: 'item 3', start: moment('2013-04-18')},
  {id: 4, content: 'item 4', start: moment('2013-04-16'), end: moment('2013-04-19')},
  {id: 5, content: 'item 5', start: moment('2013-04-25')},
  {id: 6, content: 'item 6', start: moment('2013-04-27')}
]);
var options = {};
var timeline = new Timeline(container, data, options);
```

Install the application dependencies via npm:

    npm install vis moment

The application can be bundled and minified:

    browserify app.js -o app-bundle.js -t babelify 
    uglifyjs app-bundle.js -o app-bundle.min.js

And loaded into a webpage:

```html
<!DOCTYPE HTML>
<html>
<head>
  <link href="node_modules/vis/dist/vis.min.css" rel="stylesheet" type="text/css" />
</head>
<body>
  <div id="visualization"></div>
  
  <script src="app-bundle.min.js"></script>
</body>
</html>
```


## Test

To test the library, install the project dependencies once:

    npm install

Then run the tests:

    npm test


## License

Copyright (C) 2010-2015 Almende B.V.

Vis.js is dual licensed under both

  * The Apache 2.0 License
    http://www.apache.org/licenses/LICENSE-2.0

and

  * The MIT License
    http://opensource.org/licenses/MIT

Vis.js may be distributed under either license.

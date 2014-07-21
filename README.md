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
    vis: 'path/to/vis',
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

### Bundles

The folder `dist` contains bundled versions of vis.js for direct use in the browser. In general, to use vis, load the files `vis.js` and `vis.css`.

vis.js offers various bundled files: default or light version, and minified or non-minified. The source code of vis.js consists of commonjs modules, which makes it possible to create custom bundles using tools like [Browserify](http://browserify.org/) or [Webpack](http://webpack.github.io/). This can be bundling just one visualization like the Timeline, or bundling vis.js as part of your own browserified web application. Note that hammer.js v1.0.6 or newer is required.

Bundle | Files | Description
------ | ----- | -----------
default           | vis.js, vis.css         | The default bundle, fully standalone. Code is not minified, use this version for development.
default minified  | vis.min.js, vis.min.css | The default bundle, fully standalone. Code is minified, use this version for production.
light             | vis-light.js, vis.css   | The light bundle. External libraries [moment.js](http://momentjs.com/) and [hammer.js](http://hammerjs.github.io/) are excluded and need to be loaded before loading vis. Code is not minified, use this version for development.
light minified  | vis-light.min.js, vis.min.css | The light bundle. External libraries [moment.js](http://momentjs.com/) and [hammer.js](http://hammerjs.github.io/) are excluded and need to be loaded before loading vis. Codee is minified, use this version for production.





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


## Test

To test the library, install the project dependencies once:

    npm install

Then run the tests:

    npm test


## License

Copyright (C) 2010-2014 Almende B.V.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

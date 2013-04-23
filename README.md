vis.js
==================

Vis.js is a dynamic, browser based visualization library.
The library is designed to be easy to use, to handle large amounts
of dynamic data, and to enable manipulation of the data.
The library consists of Timeline, LineChart, LineChart3d, Graph, and Treegrid.

Vis.js Library is part of [CHAP](http://chap.almende.com),
the Common Hybrid Agent Platform, developed by [Almende B.V](http://almende.com).


## Install

Install via bower:

    bower install vis

Or download the library from the github project:
[https://github.com/almende/vis.git](https://github.com/almende/vis.git).


## Load


To use a component, include the javascript file of vis in your webpage:

```html
<!DOCTYPE HTML>
<html>
<head>
    <script src="components/vis/vis.js"></script>
</head>
<body>
    <script type="text/javascript">
        // ... load a visualization
    </script>
</body>
</html>
```

or load vis.js using require.js:

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
var timeline = new Timeline(container, data, options);
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
    <script src="components/vis/vis.js"></script>

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
    var timeline = new Timeline(container, data, options);
</script>
</body>
</html>
```


## Build

To build the library from source, clone the project from github

    git clone git://github.com/almende/vis.git

The project uses [jake](https://github.com/mde/jake) as build tool.
To be able to run jake from the command line, jake must be installed globally:

    sudo npm install -g jake

Then, the project can be build by executing jake in the root of the project:

    cd vis
    jake

This will build the library for each of the components. The built libraries can
be found in the directory `bin`, and includes examples.


## License

Copyright (C) 2010-2013 Almende B.V.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

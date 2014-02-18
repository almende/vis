vis.js history
http://visjs.org


## not yet released, version 0.5.0

### Timeline

- Items can be dragged, added, and removed.
- Implemented options `selectable`, `editable`.
- Added events when dragging the custom time bar.
- Multiple items can be selected using ctrl+click or shift+click.
- Implemented functions `setWindow(start, end)` and `getWindow()`.

### DataSet

- Renamed functions `subscribe` and `unsubscribe` to `on` and `off` respectively.


## 2014-01-31, version 0.4.0

### Timeline

- Implemented functions `on` and `off` to create event listeners for events
  `rangechange`, `rangechanged`, and `select`.
- Implemented function `select` to get and set the selected items.
- Items can be selected by clicking them, muti-select by holding them.
- Fixed non working `start` and `end` options.

### Graph

- Fixed longstanding bug in the force calculation, increasing simulation
  stability and fluidity.
- Reworked the calculation of the Graph, increasing performance for larger
  datasets (up to 10x!).
- Support for automatic clustering in Graph to handle large (>50000) datasets
  without losing performance.
- Added automatic initial zooming to Graph, to more easily view large amounts
  of data.
- Added local declustering to Graph, freezing the simulation of nodes outside
  of the cluster.
- Added support for key-bindings by including mouseTrap in Graph.
- Added navigation controls.
- Added keyboard navigation.
- Implemented functions `on` and `off` to create event listeners for event
  `select`.


## 2014-01-14, version 0.3.0

- Moved the generated library to folder `./dist`
- Css stylesheet must be loaded explicitly now.
- Implemented options `showCurrentTime` and `showCustomTime`. Thanks fi0dor.
- Implemented touch support for Timeline.
- Fixed broken Timeline options `min` and `max`.
- Fixed not being able to load vis.js in node.js.


## 2013-09-20, version 0.2.0

- Implemented full touch support for Graph.
- Fixed initial empty range in the Timeline in case of a single item.
- Fixed field `className` not working for items.


## 2013-06-20, version 0.1.0

- Added support for DataSet to Graph. Graph now uses an id based set of nodes
  and edges instead of a row based array internally. Methods getSelection and
  setSelection of Graph now accept a list with ids instead of rows.
- Graph is now robust against edges pointing to non-existing nodes, which
  can occur easily while dynamically adding/removing nodes and edges.
- Implemented basic support for groups in the Timeline.
- Added documentation on DataSet and DataView.
- Fixed selection of nodes in a Graph when the containing web page is scrolled.
- Improved date conversion.
- Renamed DataSet option `fieldTypes` to `convert`.
- Renamed function `vis.util.cast` to `vis.util.convert`.


## 2013-06-07, version 0.0.9

- First working version of the Graph imported from the old library.
- Documentation added for both Timeline and Graph.


## 2013-05-03, version 0.0.8

- Performance improvements: only visible items are rendered.
- Minor bug fixes and improvements.


## 2013-04-25, version 0.0.7

- Sanitized the published packages on npm and bower.


## 2013-04-25, version 0.0.6

- Css is now packaged in the javascript file, and automatically loaded.
- The library uses node style dependency management for modules now, used
  with Browserify.


## 2013-04-16, version 0.0.5

- First working version of the Timeline.
- Website created.

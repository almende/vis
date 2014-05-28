# vis.js history
http://visjs.org


## 2014-05-28, version 1.0.2

### Timeline

- Implemented option `minHeight`, similar to option `maxHeight`.
- Implemented a method `clear([what])`, to clear items, groups, and configuration
  of a Timeline instance.
- Added function `repaint()` to force a repaint of the Timeline.
- Some tweaks in snapping dragged items to nice dates.
- Made the instance of moment.js packaged with vis.js accessibly via `vis.moment`.
- A newly created item is initialized with `end` property when option `type`
  is `"range"` or `"rangeoverflow"`.
- Fixed a bug in replacing the DataSet of groups via `Timeline.setGroups(groups)`.
- Fixed a bug when rendering the Timeline inside a hidden container. 
- Fixed axis scale being determined wrongly for a second Timeline in a single page.

### Graph

- Added zoomable and moveable options.
- Changes setOptions to avoid resetting view.
- Interchanged canvasToDOM and DOMtoCanvas to correspond with the docs.


## 2014-05-09, version 1.0.1

### Timeline

- Fixed width of items with type `rangeoverflow`.
- Fixed a bug wrongly rendering invisible items after updating them.

### Graph

- Added coordinate conversion from DOM to Canvas.
- Fixed bug where the graph stopped animation after settling in playing with physics.
- Fixed bug where hierarchical physics properties were not handled.
- Added events for change of view and zooming.


## 2014-05-02, version 1.0.0

### Timeline

- Large refactoring of the Timeline, simplifying the code.
- Great performance improvements.
- Improved layout of box-items inside groups.
- Items can now be dragged from one group to another.
- Implemented option `stack` to enable/disable stacking of items.
- Implemented function `fit`, which sets the Timeline window such that it fits
  all items.
- Option `editable` can now be used to enable/disable individual manipulation
  actions (`add`, `updateTime`, `updateGroup`, `remove`).
- Function `setWindow` now accepts an object with properties `start` and `end`.
- Fixed option `autoResize` forcing a repaint of the Timeline with every check
  rather than when the Timeline is actually resized.
- Fixed `select` event fired repeatedly when clicking an empty place on the
  Timeline, deselecting selected items).
- Fixed initial visible window in case items exceed `zoomMax`. Thanks @Remper.
- Fixed an offset in newly created items when using groups.
- Fixed height of a group not reckoning with the height of the group label.
- Option `order` is now deprecated. This was needed for performance improvements.
- More examples added.
- Minor bug fixes.

### Graph

- Added recalculate hierarchical layout to update node event.
- Added arrowScaleFactor to scale the arrows on the edges.

### DataSet

- A DataSet can now be constructed with initial data, like
  `new DataSet(data, options)`.


## 2014-04-18, version 0.7.4

### Graph

- Fixed IE9 bug.
- Style fixes.
- Minor bug fixes.


## 2014-04-16, version 0.7.3

### Graph

- Fixed color bug.
- Added pull requests from kannonboy and vierja: tooltip styling, label fill 
  color.


## 2014-04-09, version 0.7.2

### Graph

- Fixed edge select bug.
- Fixed zoom bug on empty initialization.


## 2014-03-27, version 0.7.1

### Graph

- Fixed edge color bug.
- Fixed select event bug.
- Clarified docs, stressing importance of css inclusion for correct display of 
  navigation an manipulation icons.
- Improved and expanded playing with physics (configurePhysics option).
- Added highlights to navigation icons if the corresponding key is pressed.
- Added freezeForStabilization option to improve stabilization with cached 
  positions.


## 2014-03-07, version 0.7.0

### Graph

- Changed navigation CSS. Icons are now always correctly positioned.
- Added stabilizationIterations option to graph.
- Added storePosition() method to save the XY positions of nodes in the DataSet.
- Separated allowedToMove into allowedToMoveX and allowedToMoveY. This is 
  required for initializing nodes from hierarchical layouts after 
  storePosition().
- Added color options for the edges.


## 2014-03-06, version 0.6.1

### Graph

- Bugfix graphviz examples.
- Bugfix labels position for smooth curves.
- Tweaked graphviz example physics.
- Updated physics documentation to stress importance of configurePhysics.

### Timeline

- Fixed a bug with options `margin.axis` and `margin.item` being ignored when 
  setting them to zero.
- Some clarifications in the documentation.


## 2014-03-05, version 0.6.0

### Graph

- Added Physics Configuration option. This makes tweaking the physics system to 
  suit your needs easier.
- Click and doubleClick events.
- Initial zoom bugfix.
- Directions for Hierarchical layout.
- Refactoring and bugfixes.


## 2014-02-20, version 0.5.1

- Fixed broken bower module.


## 2014-02-20, version 0.5.0

### Timeline

- Editable Items: drag items, add new items, update items, and remove items.
- Implemented options `selectable`, `editable`.
- Added events `timechange` and `timechanged` when dragging the custom time bar.
- Multiple items can be selected using ctrl+click or shift+click.
- Implemented functions `setWindow(start, end)` and `getWindow()`.
- Fixed scroll to zoom not working on IE in standards mode.

### Graph

- Editable nodes and edges: create, update, and remove them.
- Support for smooth, curved edges (on by default).
- Performance improvements.
- Fixed scroll to zoom not working on IE in standards mode.
- Added hierarchical layout option.
- Overhauled physics system, now using Barnes-Hut simulation by default. Great 
  performance gains.
- Modified clustering system to give better results.
- Adaptive performance system to increase visual performance (60fps target).

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
- Implemented options `showCurrentTime` and `showCustomTime`. Thanks @fi0dor.
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

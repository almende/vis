# vis.js history
http://visjs.org


## 2016-02-04, version 4.14.0

### Timeline

- Fixed a regression: Timeline/Graph2d constructor throwing an exception when
  no options are provided via the constructor.

### Graph2d

- Fixed a regression: Timeline/Graph2d constructor throwing an exception when
  no options are provided via the constructor.

### Graph3d

- Fixed #1615: implemented new option `dotSizeRatio`.


## 2016-02-01, version 4.13.0

### Network

- Added options to customize the hierarchical layout without the use of physics.
- Altered edges for arrows and added the arrowStrikethrough option.
- Improved the hierarchical layout algorithm by adding a condensing method to remove whitespace.
- Fixed #1556: Network throwing an error when clicking the "Edit" button
  on the manipulation toolbar.
- Fixed #1334 (again): Network now ignores scroll when interaction:zoomView is false.
- Fixed #1588: destroy now unsubscribed from the dataset.
- Fixed #1584: Navigation buttons broken.
- Fixed #1596: correct clean up of manipulation dom elements.
- Fixed #1594: bug in hierarchical layout.
- Fixed #1597: Allow zero borders and addressed scaling artifacts.
- Fixed #1608: Fixed wrong variable reference

### Timeline

- Moved initial autoscale/fit method to an handler of the "changed" event.
- Fixed #1580: Invisible timeline/graph should not be drawn, as most inputs are invalid
- Fixed #1521: Prevent items from staying stuck to the left side of the viewport.
- Fixed #1592: Emit a "changed" event after each redraw.
- Fixed #1541: Timeline and Graph2d did not load synchronously anymore.

### Graph2d

- Major redesign of data axis/scales, with large focus on creating a sane slave axis setup
- Cleanup of linegraph's event handling.
- Fixed #1585: Allow bar groups to exclude from stacking
- Fixed #1580: Invisible timeline/graph should not be drawn, as most inputs are invalid
- Fixed #1177: Fix custom range of slaved right axis.
- Fixed #1592: Emit a "changed" event after each redraw.
- Fixed #1017: Fixed minWidth behavior for bars.
- Fixes #1557: Fix default axis formatting function.
- Fixed #1541: Timeline and Graph2d did not load synchronously anymore.
- Fixed a performance regression


## 2016-01-08, version 4.12.0

### Timeline

- Fixed #1527: error when creating/updating a Timeline without data.
- Fixed #1127: `doubleClick` event not being fired.
- Fixed #1554: wrong cursor on readonly range items.

### Network

- Fixed #1531, #1335:  border distances for arrow positioning
- Fixed findNode method. It now does not return internal objects anymore.
- Fixed #1529, clustering and declustering now respects the original settings of the edges for physics and hidden.
- Fixed #1406, control nodes are now drawn immediately without a second redraw.
- Fixed #1404, made the array returned by findNode match the docs.
- Added #1138, enable the user to define the color of the shadows for nodes and edges.
- Fixed #1528, #1278, avoided ID's being cast to string for methods that return ID's as well as storePositions casting to string.
- Fixed upscaling when the window size increases.
- Accepted pull request #1544, thanks @felixhayashi!
- Fixed documented bug in #1544.


## 2015-12-18, version 4.11.0

### Network

- Expose `setSelection` method. Thanks @zefrog.

### Timeline

- Fixed #1441: Height of subgroups not immediately updated after updating
  data in a DataSet or DataView.
- Fixed #1491: Problem using ctrl+drag in combination with using a `DataView`,
  and an issue with ctrl+drag when using `snap: null`.
- Fixed #1486: Item range sometimes wrongly calculated on IE in case of old dates.
- Fixed #1523: end of data range wrongly determined.

### Graph2d

- Large refactoring of Graph2d code base:
  - Implemented a new option for `shaded.orientation` to always shade towards zero.
  - Implemented a new option for `shaded.orientation` to follow another group (fill in between)
  - Implemented line-graph stacking
  - Fixed support for using a `DataView` in Graph2d.
  - Implemented a new zindex option for controlling svg rendering order.
  - Performance updates and fixes

### DataSet
- Fixed #1487: DataSet cannot remove an item with id `0` correctly.

### DataView
- Added the map() function from DataSet.


## 2015-11-27, version 4.10.0

### General

- Fixed #1353: Custom bundling with browserify requiring manual installation
  of `babelify`.  

### Network

- Implemented new method `setSelection({nodes:[...], edges: [...]})`.
  Thanks @zefrog.
- Fixed #1343: Connected edges are now deselected too when deselecting a node.
- Fixed #1398: Support nodes start with the correct positions.
- Fixed #1324: Labels now scale again.
- Fixed #1362: Layout of hierarchicaly systems no longer overlaps NODES.
- Fixed #1414: Fixed color references for nodes and edges.
- Fixed #1408: Unclustering without release function respects fixed positions now.
- Fixed #1358: Fixed example for clustering on zoom.
- Fixed #1416: Fixed error in improvedLayout.
- Improvements on hierarchical layout.

### Timeline

- Implemented option `itemsAlwaysDraggable`, See #1395. Thanks @liuqingc.
- Implemented option `multiselectPerGroup`. Thanks @hansmaulwurf23.
- Implemented property `oldData` on change events of the DataSet, and
  deprecated the `data` property which wrongly contained new data instead of
  old data. Thanks @hansmaulwurf23.
- Implemented option `maxMinorChars` to customize the width of the grid.
- Expose `vis.timeline.Core` for customization purposes.
- Fixed #1449, #1393: text of minor grids sometimes not being drawn.

### Graph2d

- Fixed #1385: Draw lines on top of bars.
- Fixed #1461 and #1345: Reset order of SVG elements in legend icons.

### DataSet/DataView

- Performance improvements (see #1381). Thanks @phimimms.


## 2015-10-01, version 4.9.0

### Network

- Fixed bug where an edge that was not connected would crash the layout algorithms.
- Fixed bug where a box shape could not be drawn outside of the viewable area.
- Fixed bug where dragging a node that is not a control node during edit edge mode would throw an error.
- Made auto scaling on container size change pick the lowest between delta height and delta width.
- Added images with borders option (useBorderWithImage)
- Updated the manipulation css to fix offset if there is no separator.

### Timeline

- Fixed #1326: wrongly positioned dot of PointItems.
- Fixed #1249: option `hiddenDates` not accepting a single hidden date.
- Fixed a bug when pinching and using hidden dates. Thanks @lauzierj.


## 2015-09-14, version 4.8.2

### Network

- Fixed Phantom Edges during clustering.
- Fixed scaling not doing anything to edges.
- Fixed setting font to null so the network won't crash anymore.
- Fixed stabilized event not firing if layout algorithm does very well.
- Fixed arrows with some shapes when they are selected. #1292
- Fixed deletion of options by settings them to null.


## 2015-09-07, version 4.8.1

### Network

- Added German (de) locale. Thanks @Tooa.
- Fixed critical camera zoom bug #1273.
- Fixed unselectAll method. #1256
- Fixed bug that broke the network if drawn in a hidden div #1254

### Timeline

- Fixed #1215: inconsistent types of properties `start` and `end` in callback
  functions `onMove`, `onMoving`, `onAdd`.


## 2015-08-28, version 4.8.0

### Timeline

- Implemented reordering groups by dragging them vertically. Thanks @hansmaulwurf23.

### Network

- Added Spanish (es) locale. Thanks @gomezgoiri.
- Added support for labels in edges and titles for both nodes and edges during gephi import.
- Added KamadaKawai layout engine for improved initial layout.
- Added Adaptive timestep to the physics solvers for increased performance during stabilization.
- Added improvedLayout as experimental option for greatly improved stabilization times.
- Added adaptiveTimestep as experimental option for greatly improved stabilization times.
- Added support for Gephi directed edges, edge labels and titles.
- Improved the positioning and CSS of the configurator and the color picker.
- Greatly improved performance in clustering.
- Made the network keep its 'view' during a change of the size of the container.
- Fixed #1152, updating images now works.
- Fixed cleaning up of nodes.
- Fixed dynamic updating of label properties.
- Fixed bugs in clustering algorithm.
- Fixed find node return types.
- Fixed bug where stabilization iterations were counted double. If it looks like the stabilization is slower, its because it is doing twice the amount of steps it did before.
- Fixed getPositions return values.

## Graph2d

- Implemented configuration option `excludeFromLegend`. Thanks @Bernd0.


## 2015-07-27, version 4.7.0

### Timeline

- Fixed #192: Items keep their group offset while dragging items located in 
  multiple groups. Thanks @Fice.
- Fixed #1118: since v4.6.0, grid of time axis was wrongly positioned on some 
  scales.

### Network

- Added moveNode method.
- Added cubic Bezier curves.


## 2015-07-22, version 4.6.0

### Timeline

- Implemented #24: support for custom timezones, see configuration option `moment`.

### Graph2d

- Implemented #24: support for custom timezones, see configuration option `moment`.

### Network

- Fixed #1111, check if edges exist was not correct on update.
- Fixed #1112, network now works in firefox on unix again.
- Added #931, borderRadius in shapeProperties for the box shape.
- Added #936, useImageSize for images and circularImages

## 2015-07-20, version 4.5.1

### Network

- Fixed another clustering bug, phantom edges should be gone now.
- Fixed disabling hierarchical layout.
- Fixed delete button when using multiple selected items in manipulation system.


## 2015-07-17, version 4.5.0

### General

- Docs have been greatly improved thanks to @felixhayashi! Thanks a lot!

### Network

- Added shapeProperties, thanks @zukomgwili!
- Added configChange event.
- Properly fixed the _lockedRedraw method.
- Fixed node resizing on dragging.
- Fixed missing edges during clustering.
- Fixed missing refresh of node data when changing hierarchical layout on the fly.
- Fixed hover and blur events for edges.

### Graph3d

- Fixed not changing `backgroundColor` when not provided in options. Thanks @ozydingo.

### Timeline

- Implemented support for group templates (#996). Thanks @hansmaulwurf23.
- Implemented option `zoomKey` for both Timeline and Graph2d (see #1082). 
  Thanks @hansmaulwurf23.
- Fixed #1076: Fixed possible overlap of minor labels text on the TimeAxis. 
- Fixed #1001: First element of group style being cut.
- Fixed #1071: HTML contents of a group not cleared when the contents is updated.
- Fixed #1033: Moved item data not updated in DataSet when using an asynchronous
  `onMove` handler.
- Fixed #239: Do not zoom/move the window when the mouse is on the left panel
  with group labels.   


## 2015-07-03, version 4.4.0

### General

- Documentation now has breadcrums. Thanks @felixhayashi!

### Graph3d

- Fixed #970: Implemented options `dataColor`, `axisColor`, and `gridColor`.

### Network 

- Fixed Hammerjs direction issue.
- Fixed recursion error when node is fixed but has no position.
- Fixed accidental redrawing during stabilization.
- Fixed delete callbacks with null argument not showing toolbar afterwards.
- Added zoom events from keyboard and navigation buttons.
- No longer start stabilization with an empty node set.
- Fixed #974 connecting static smooth and straight edges.
- Improved handling of empty image field.
- Fixed #987 proper cleaning of support nodes.
- Fixed static smooth edges not fully working from every angle.
- Fixed updating bounding box of nodes without drawing.
- Fixed #1036, bug in lockedRedraw. Thanks @vges!
- Added getDataset to all manipulation functions. Thanks @ericvandever!
- Fixed #1039, icon now returns correct distance to border
- Added blurEdge and hoverEdge events.
- Added labelHighlightBold option to edges and nodes.
- Added getOptionsFromConfigurator method.
- Fixed extra edges in clustering.
- Fixed cleaning up of clustering edges on declustering.
- Made fit() method only look at visible nodes to get the range.

### Graph2d

- Made graph2d more robust against string values in the y position.
- Fixed bug where 0 axis was always in the automatically fitted range.
- Added drawPoints.onRender. Thanks @mschallar!

### Timeline

- Fixed cleaning up of items in subgroups, thanks @ChenMachluf!
- Improved error notification with groups, thanks @skinkie!


## 2015-06-16, version 4.3.0

### General

- Fixed #950: option `locales` broken in `Timeline`, `Graph2d`, and `Network`.
- Fixed #964: `Timeline`, `Graph2d`, and `Network` not working on IE9.

### Graph2d

- Fixed #942, #966: bug when data is empty.

### Timeline

- Implemented `editable` option for individual items. Thanks @danbertolini.

### Network

- Fixed dragStart event to give the correct node information.

## 2015-06-05, version 4.2.0

### General

- Fixed #893, #911: the `clickToUse` option of Network, Graph2d, and Network 
  was blocking click events in the web page.

### Timeline

- Added axis orientation option `'none'`.
- Added a property `event` to the properties emitted with the `select` event (see #923).
- Improved function `fit()` to take into account the actual width of items.
- Fixed #897: Timeline option `{snap: null}` did give a validation error.
- Fixed #925: Event `timechanged` did not fire when mouse has been moved outside
  the timeline.

### Graph2D

- Fixed #892, addressed any case in validator.
- Fixed #898, lines are not taken into account for stacking.

### Network

- Improved robustness against people molesting the Function.prototype.bind()
- Fixed few functions including storePositions().
- Added beginnings of unit testing for network.
- Fixed #904, correctly parsing global font options now.
- Fixed dataView support for storePositions.
- Second click on node is no longer unselect.
- Added releaseFunction to openCluster.
- Fixed bug where the network could flicker when the pixelRatio is not integer.
- Added enabled property to physics.
- Fixed #927, dragStart event didn't contain node that was being dragged

## 2015-05-28, version 4.1.0

### Network

- Fixed #866, manipulation can now be set to false without crashing.
- Fixed #860, edit node mode now works as it should.
- Fixed #859, images now resize again when they are loaded.
- Fixed dynamic edges not correctly handling non-existent nodes.
- Accepted pull from @killerDJO for fixing selected and hover colors for edges.
- Fixed bug with right mouse button, scroll center and popup positions using the wrong coordinates.
- Fixed click to use.
- Fixed getConnectedEdges method.
- Fixed clustering bug.
- Added getNodesInCluster method.
- Renamed editNodeMode to editNode, editNodeMode now give a deprecation log message.
- Added multiselect to the docs.
- Removed deprecated dynamic entree, allow any smooth curve style for hierarchical layout.
- Fixed bug with the moveTo and getViewPosition methods.
- Fixed #861, brokenImage only working for one node if nodes have the same image.
- Fixed hoverNode and blurNode events and added them to the docs.
- Fixed #884, selectNode event.
- Fixed dynamic setting hidden and physics.
- Fixed edit node mode's fallback.

### Graph2d & Timeline

- Fixed #858, #872, fixed usage of deprecated `unsubscribe` from DataSet.
- Fixed #869: Add className with id to custom time bars
- Fixed #877: Added support for metaKey to select multiple items.


## 2015-05-22, version 4.0.0

### General

- Changed the build scripts to include a transpilation of ES6 to ES5
  (using http://babel.org), so we can use ES6 features in the vis.js code.
  When creating a custom bundle using browserify, one now needs to add a
  transform step using `babelify`, this is described in README.md.

### Timeline

- Integrated an option configurator and validator.
- Implemented option `multiselect`, which is false by default.
- Added method `setData({groups: groups, items: items})`.
- Fixed range items not being displayed smaller than 10 pixels (twice the
  padding). In order to have overflowing text, one should now apply css style
  `.vis.timeline .item.range { overflow: visible; }` instead of
  `.vis.timeline .item.range .content { overflow: visible; }`.
  See example 18_range_overflow.html.
- Fixed invalid css names for time axis grid, renamed hours class names from
  `4-8h` to `h4-h8`.
- Deprecated option `showCustomTime`. Use method `addCustomTime()` instead.
- Deprecated event `finishedRedraw` as it's redundant.
- Renamed option `animate` to `animation`, and changed it to be either a boolean
  or an object `{duration: number, easingFunction: string}`.
- Fixed #831: items losing selection when their type changed.

### Graph2d

- New option structure.
- Cleaned up docs.
- Fixed #628: stacking order.
- Fixed #624: sorting order.
- Fixed #616: stacking with negative bars.
- Fixed #728: alignment issues.
- Fixed #716: Height of graph `2px` too large when configuring a fixed height.

### Network

The network has been completely rewritten. The new modular setup using ES6 classes makes
it future proof for maintainability, extendability and clarity. A summary of new features:
- New examples, categorized by topic.
- New docs.
- New option structure, adhering to the modular setup on the backend.
- New events for user interaction.
- New render events for drawing custom elements on the canvas.
- New physics events for making a loading bar during stabilization.
- A lot of new methods that make extending easier.
- Manipulation system now works without the UI neccesarily.
- Nodes and edges can cast shadows.
- Configurator system to dynamically change almost all options.
- Validator has been created for the network's options, warning you about typo's and suggesting alternatives.
- Diamond shape for nodes.
- Unified the label code so edges and nodes have the same label settings.
- InheritColors for edges can be set to both, making a gradient fade between two node colors.
- Redesigned the clustering system giving full control over it.
- Random seed can be saved so the network will be the same every time you start it.
- New physics solver based on ForceAtlas2 as implemented in gephi.]
- New avoidOverlap option for physics.
- Many, many bugfixes.


### DataSet

- Dropped support for Google visualization DataTable.
- Dropped support for appending data returned by `DataSet.get()` to an existing
  Array or DataTable.


## 2015-04-07, version 3.12.0

### Network

- Fixed support for DataSet with custom id fields (option `fieldId`).

### Timeline

- Orientation can now be configured separately for axis and items.
- The event handlers `onMove` and `onMoving` are now invoked with all item
  properties as argument, and can be used to update all properties (like
  content, className, etc) and add new properties as well.
- Fixed #654: removed unnecessary minimum height for groups, takes the
  height of the group label as minimum height now.
- Fixed #708: detecting wrong group when page is scrolled.
- Fixed #733: background items being selected on shift+click.


## 2015-03-05, version 3.11.0

### Network

- (added gradient coloring for lines, but set for release in 4.0 due to required refactoring of options)
- Fixed bug where a network that has frozen physics would resume redrawing after setData, setOptions etc.
- Added option to bypass default groups. If more groups are specified in the nodes than there are in the groups, loop over supplied groups instead of default.
- Added two new static smooth curves modes: curveCW and curve CCW.
- Added request redraw for certain internal processes to reduce number of draw calls (performance improvements!).
- Added pull request for usage of Icons. Thanks @Dude9177!
- Allow hierarchical view to be set in setOptions.
- Fixed manipulation bar for mobile.
- Fixed #670: Bug when updating data in a DataSet, when Network is connected to the DataSet via a DataView.
- Fixed #688: Added a css class to be able to distinguish buttons "Edit node"
  and "Edit edge".

### Timeline

- Implemented orientation option `'both'`, displaying a time axis both on top
  and bottom (#665).
- Implemented creating new range items by dragging in an empty space with the
  ctrl key down.
- Implemented configuration option `order: function` to define a custom ordering
  for the items (see #538, #234).
- Implemented events `click`, `doubleClick`, and `contextMenu`.
- Implemented method `getEventProperties(event)`.
- Fixed not property initializing with a DataView for groups.
- Merged add custom timebar functionality, thanks @aytech!
- Fixed #664: end of item not restored when canceling a move event.
- Fixed #609: reduce the left/right dragarea when an item range is very small,
  so you can still move it as a whole.
- Fixed #676: misalignment of background items when using subgroups and the
  group label's height is larger than the contents.

### Graph2d

- Implemented events `click`, `doubleClick`, and `contextMenu`.
- Implemented method `getEventProperties(event)`.

### DataSet/DataView

- Implemented support for mapping field names. Thanks @spatialillusions.
- Fixed #670: DataView not passing a data property on update events (see #670)



## 2015-02-11, version 3.10.0

### Network

- Added option bindToWindow (default true) to choose whether the keyboard binds are global or to the network div.
- Improved images handling so broken images are shown on all references of images that are broken.
- Added getConnectedNodes method.
- Added fontSizeMin, fontSizeMax, fontSizeMaxVisible, scaleFontWithValue, fontDrawThreshold to Nodes.
- Added fade in of labels (on nodes) near the fontDrawThreshold.
- Added nodes option to zoomExtent to zoom in on specific set of nodes.
- Added stabilizationIterationsDone event which fires at the end of the internal stabilization run. Does not imply that the network is stabilized.
- Added freezeSimulation method.
- Added clusterByZoom option.
- Added class name 'network-tooltip' to the tooltip, allowing custom styling.
- Fixed bug when redrawing was not right on zoomed-out browsers.
- Added opacity option to edges. Opacity is only used for the unselected state.
- Fixed bug where selections from removed data elements persisted.

### Timeline

- `Timeline.redraw()` now also recalculates the size of items.
- Implemented option `snap: function` to customize snapping to nice dates
  when dragging items.
- Implemented option `timeAxis: {scale: string, step: number}` to set a
  fixed scale.
- Fixed width of range items not always being maintained when moving due to
  snapping to nice dates.
- Fixed not being able to drag items to an other group on mobile devices.
- Fixed `setWindow` not working when applying an interval larger than the
  configured `zoomMax`.

### DataSet/DataView

- Added property `length` holding the total number of items to the `DataSet`
  and `DataView`.
- Added a method `refresh()` to the `DataView`, to update filter results.
- Fixed a bug in the `DataSet` returning an empty object instead of `null` when
  no item was found when using both a filter and specifying fields.


## 2015-01-16, version 3.9.1

### General

- Fixed wrong distribution file deployed on the website and the downloadable
  zip file.

### Network

- Fixed bug where opening a cluster with smoothCurves off caused one child to go crazy.
- Fixed bug where zoomExtent does not work as expected.
- Fixed nodes color data being overridden when having a group and a dataset update query.
- Decoupled animation from physics simulation.
- Fixed scroll being blocked if zoomable is false.


## 2015-01-16, version 3.9.0

### Network

- Reverted change in image class, fixed bug #552
- Improved (not neccesarily fixed) the fontFill offset between different browsers. #365
- Fixed dashed lines on firefox on Unix systems
- Altered the Manipulation Mixin to be succesfully destroyed from memory when calling destroy();
- Improved drawing of arrowheads on smooth curves. #349
- Caught case where click originated on external DOM element and drag progressed to vis.
- Added label stroke support to Nodes, Edges & Groups as per-object or global settings. Thank you @klmdb!
- Reverted patch that made nodes return to 'default' setting if no group was assigned to fix issue #561. The correct way to 'remove' a group from a node is to assign it a different one.
- Made the node/edge selected by the popup system the same as selected by the click-to-select system. Thank you @pavlos256!
- Improved edit edge control nodes positions, altered style a little.
- Fixed issue #564 by resetting state to initial when no callback is performed in the return function.
- Added condition to Repulsion similar to BarnesHut to ensure nodes do not overlap.
- Added labelAlignment option to edges. Thanks @T-rav!
- Close active sessions in dataManipulation when calling setData().
- Fixed alignment issue with edgelabels

### Timeline

- Added byUser flag to options of the rangechange and rangechanged event.


## 2015-01-09, version 3.8.0

### General

- Updated to moment.js v2.9.0

### Network

- Fixed flipping of hierarchical network on update when using RL and DU.
- Added zoomExtentOnStabilize option to network.
- Improved destroy function, added them to the examples.
- Nodes now have bounding boxes that are used for zoomExtent.
- Made physics more stable (albeit a little slower).
- Added a check so only one 'activator' overlay is created on clickToUse.
- Made global color options for edges overrule the inheritColors.
- Improved cleaning up of the physics configuration on destroy and in options.
- Made nodes who lost their group revert back to default color.
- Changed group behaviour, groups now extend the options, not replace. This allows partial defines of color.
- Fixed bug where box shaped nodes did not use hover color.
- Fixed Locales docs.
- When hovering over a node that does not have a title, the title of one of the connected edges that HAS a title is no longer shown.
- Fixed error in repulsion physics model.
- Improved physics handling for smoother network simulation.
- Fixed infinite loop when an image can not be found and no brokenImage is provided.
- Added getBoundingBox method.
- Community fix for SVG images in IE11, thanks @dponch!
- Fixed repeating stabilized event when the network is already stabilized.
- Added circularImages, thanks for the contribution @brendon1982!
- Stopped infinite loop when brokenImage is also not available.
- Changed util color functions so they don't need eval. Thanks @naskooskov!

### Graph2d

- Fixed round-off errors of zero on the y-axis.
- added show major/minor lines options to dataAxis.
- Fixed adapting to width and height changes.
- Added a check so only one 'activator' overlay is created on clickToUse.
- DataAxis width option now draws correctly.

### Timeline

- Implemented support for styling of the vertical grid.
- Support for custom date formatting of the labels on the time axis.
- added show major/minor lines options to timeline.
- Added a check so only one 'activator' overlay is created on clickToUse.

### Graph3d

- Fixed mouse coordinates for tooltips.


## 2014-12-09, version 3.7.2

### Timeline

- Fixed zooming issue on mobile devices.

### Graph2D

- Fixed infinite loop when clearing DataSet

### Network

- Sidestepped double touch event from hammer (ugly.. but functional) causing
  strange behaviour in manipulation mode
- Better cleanup after reconnecting edges in manipulation mode
- Fixed recursion error with smooth edges that are connected to non-existent nodes
- Added destroy method. 

## 2014-11-28, version 3.7.1

### Timeline

- Implemented selection of a range of items using Shift+Click.
- Fixed content in range items may overflow range after zoom.
- Fixed onAdd/onUpdate callbacks when using a DataView (thanks @motzel).
- Fixed configuring either `start` or `end`.
- Fixed Timeline and Graph2d getting stuck in an infinite loop in some
  circumstances.
- Fixed background items being selectable and editable when a height is set.

### Graph2D

- Added `alignZeros` option to dataAxis with default value true.
- Fixed bug with points drawn on bargraphs
- Fixed docs
- Fixed height increase on scrolling if only `graphHeight` is defined.

### Network

- dragEnd event now does not give the selected nodes if only the viewport has been dragged #453
- merged high DPI fix by @crubier, thanks!


## 2014-11-14, version 3.7.0

### Graph2D

- Added points style for scatterplots and pointclouds.
- Modularized the Graph2D draw styles.
- Added a finishedRedraw event.

### Network

- Added pointer properties to the click and the doubleClick events containing the XY coordinates in DOM and canvas space.
- Removed IDs from navigation so multiple networks can be shown on the same page. (#438)


### Timeline

- Added a finishedRedraw event.
- Fixed the disappearing item bug.
- Fixed keycharm issue.

## 2014-11-07, version 3.6.4

### General

- Removed mousetrap due to Apache license, created keycharm and implemented it with vis.

### Timeline

- Fixed height of background items when having a fixed or max height defined.
- Fixed only one item being dragged when multiple items are selected.
- Optimised a serious slowdown on performance since hidden dates.

### Network

- Fixed onRelease with navigation option.
- Fixed arrow heads not being colored.

### Graph2D

- Fixed cleaning up of groups.
- Throw error message when items are added before groups.
- Made graphHeight automatic if height is defined AND if graphHeight is smaller than the center panel when height is defined as well.
- Added new verticalDrag event for internal use, allowing the vertical scrolling of the grid lines on drag.
- Fixed moving legend when postioned on the bottom and vertical dragging.
- Optimised a serious slowdown on performance since hidden dates.

- Accepted a large pull request from @cdjackson adding the following features (thank you!): 
- Titles on the DataAxis to explain what units you are using.
- A style field for groups and datapoints so you can dynamically change styles.
- A precision option to manually set the amount of decimals.
- Two new examples showing the new features.


## 2014-10-28, version 3.6.3

### Timeline

- Fixed background items not always be cleared when removing them.
- Fixed visible items not always be displayed.
- Performance improvements when doing a lot of changes at once in a DataSet.

### Network

- Fixed dashed and arrow lines not using inheritColor.

### DataSet

- Support for queueing of changes, and flushing them at once.
- Implemented `DataSet.setOptions`. Only applicable for the `queue` options.


## 2014-10-24, version 3.6.2

- Vis.js is now dual licensed under both Apache 2.0 and MIT.


## 2014-10-22, version 3.6.1

### Timeline

- Fixed uneven stepsized with hidden dates.
- Fixed multiple bugs with regards to hidden dates.
- Fixed subgroups and added subgroup sorting. Subgroup labels will be in future releases.


## 2014-10-21, version 3.6.0

### Network

- Title of nodes and edges can now be an HTML element too.
- Renamed storePosition to storePositions. Added deprication message and old name still works.
- Worked around hammer.js bug with multiple release listeners.
- Improved cleaning up after manipulation toolbar.
- Added getPositions() method to get the position of all nodes or some of them if specific Ids are supplied.
- Added getCenterCoordinates() method to get the x and y position in canvas space of the center of the view.
- Fixed node label becoming undefined.
- Fixed cluster fontsize scaling.
- Fixed cluster sector scaling.
- Added oldHeight and oldWidth to resize event.

### Timeline

- Implemented field `style` for both items and groups, to set a custom style for
  individual items.
- Fixed height of BackgroundItems not being 100% when timeline has a fixed height.
- Fixed width of BackgroundItems not being reduced to 0 when zooming out.
- Fixed onclick events in items not working.
- Added hiddenDates to hide specific times and/or days in the timeline.

### DataSet

- Event listeners of `update` now receive an extra property `data`, 
  containing the changed fields of the changed items.

### Graph2d

- Fixed height of legend when there are many items showing.

### Graph3d

- Implemented options `xValueLabel`, `yValueLabel` and `zValueLabel` for custom labels along
  the x, y, z axis. Thanks @fabriziofortino.


## 2014-09-16, version 3.5.0

### Network

- Fixed nodes not always being unfixed when using allowedToMove.
- Added dragStart and dragEnd events.
- Added edge selection on edge labels.

### Graph2d

- Fixed dataAxis not showing large numbers correctly.


## 2014-09-12, version 3.4.2

### Network

- Changed timings for zoomExtent animation.
- Fixed possible cause of freezing graph when animating.
- Added locked to focusOnNode and releaseNode().
- Fixed minor bug in positioning of fontFill of nodes with certain shapes.
- Added startStabilization event.


## 2014-09-11, version 3.4.1

### Network

- Fix for introduced bug on zoomExtent navigation button.
- Added animation to zoomExtent navigation button.
- Improved cleaning of Hammer.js bindings.

### Timeline

- Fixed a bug in IE freezing when margin.item and margin.axis where both 0.


## 2014-09-10, version 3.4.0

### Graph2d

- Fixed moment.js url in localization example.

### Network

- Fixed some positioning issues with the close button of the manipulation menu.
- Added fontFill to Nodes as it is in Edges.
- Implemented support for broken image fallback. Thanks @sfairgrieve.
- Added multiline labels to edges as they are implemented in nodes. Updated 
  multiline example to show this.
- Added animation and camera controls by the method .moveTo()
- Added new event that fires when the animation is finished.
- Added new example showing the new features of animation.
- Added getScale() method.

### Timeline

- Implemented support for templates.
- Implemented a new item type: `'background'`. This can be used to mark periods
  with a background color and label.
- Implemented support for attaching HTML attributes to items. Thanks @dturkenk.
- Fixed moment.js url in localization example.
- Fixed `className` of groups not being updated when changed.
- Fixed the `id` field of a new item not correctly generated.
- Fixed newly added item ignored when returning an other object instance.
- Fixed option `autoResize` not working on IE in case of changing visibility
  of the Timeline container element.
- Fixed an overflow issue with the dots of BoxItems when using groups.
- Fixed a horizontal 1-pixel offset in the items (border width wasn't taken into 
  account).
- Renamed internal items from `ItemBox`, `ItemRange`, and `ItemPoint` to
  respectively `BoxItem`, `RangeItem`, and `PointItem`.
- Fixed an error thrown when calling `destroy()`.


## 2014-08-29, version 3.3.0

### Timeline

- Added localization support.
- Implemented option `clickToUse`.
- Implemented function `focus(id)` to center a specific item (or multiple items)
  on screen.
- Implemented an option `focus` for `setSelection(ids, options)`, to immediately
  focus selected nodes.
- Implemented function `moveTo(time, options)`.
- Implemented animated range change for functions `fit`, `focus`, `setSelection`,
  and `setWindow`.
- Implemented functions `setCurrentTime(date)` and `getCurrentTime()`.
- Implemented a new callback function `onMoving(item, callback)`.
- Implemented support for option `align` for range items.
- Fixed the `change` event sometimes being fired twice on IE10.
- Fixed canceling moving an item to another group did not move the item
  back to the original group.
- Fixed the `change` event sometimes being fired twice on IE10.
- Fixed canceling moving an item to another group did not move the item
  back to the original group.

### Network

- A fix in reading group properties for a node.
- Fixed physics solving stopping when a support node was not moving.
- Implemented localization support.
- Implemented option `clickToUse`.
- Improved the `stabilized` event, it's now firing after every stabilization
  with iteration count as parameter.
- Fixed page scroll event not being blocked when moving around in Network
  using arrow keys.
- Fixed an initial rendering before the graph has been stabilized.
- Fixed bug where loading hierarchical data after initialization crashed network.
- Added different layout method to the hierarchical system based on the direction of the edges.

### Graph2d

- Implemented option `handleOverlap` to support overlap, sideBySide and stack.
- Implemented two examples showing the `handleOverlap` functionality.
- Implemented `customRange` for the Y axis and an example showing how it works.
- Implemented localization support.
- Implemented option `clickToUse`.
- Implemented functions `setCurrentTime(date)` and `getCurrentTime()`.
- Implemented function `moveTo(time, options)`.
- Fixed bugs.
- Added groups.visibility functionality and an example showing how it works.


## 2014-08-14, version 3.2.0

### General

- Refactored Timeline and Graph2d to use the same core.

### Graph2d

- Added `visible` property to the groups.
- Added `getLegend()` method.
- Added `isGroupVisible()` method.
- Fixed empty group bug.
- Added `fit()` and `getItemRange()` methods.

### Timeline

- Fixed items in groups sometimes being displayed but not positioned correctly.
- Fixed a group "null" being displayed in IE when not using groups.

### Network

- Fixed mass = 0 for nodes.
- Revamped the options system. You can globally set options (network.setOptions) to update settings of nodes and edges that have not been specifically defined by the individual nodes and edges.
- Disabled inheritColor when color information is set on an edge.
- Tweaked examples.
- Removed the global length property for edges. The edgelength is part of the physics system. Therefore, you have to change the springLength of the physics system to change the edge length. Individual edge lengths can still be defined.
- Removed global edge length definition form examples.
- Removed onclick and onrelease for navigation and switched to Hammer.js (fixing touchscreen interaction with navigation).
- Fixed error on adding an edge without having created the nodes it should be connected to (in the case of dynamic smooth curves).


## 2014-07-22, version 3.1.0

### General

- Refactored the code to commonjs modules, which are browserifyable. This allows
  to create custom builds.

### Timeline

- Implemented function `getVisibleItems()`, which returns the items visible
  in the current window.
- Added options `margin.item.horizontal` and  `margin.item.vertical`, which
  allows to specify different margins horizontally/vertically.
- Removed check for number of arguments in callbacks `onAdd`, `onUpdate`, 
  `onRemove`, and `onMove`.
- Fixed items in groups sometimes being displayed but not positioned correctly.
- Fixed range where the `end` of the first is equal to the `start` of the second 
  sometimes being stacked instead of put besides each other when `item.margin=0`
  due to round-off errors.

### Network (formerly named Graph)

- Expanded smoothCurves options for improved support for large clusters.
- Added multiple types of smoothCurve drawing for greatly improved performance.
- Option for inherited edge colors from connected nodes.
- Option to disable the drawing of nodes or edges on drag.
- Fixed support nodes not being cleaned up if edges are removed.
- Improved edge selection detection for long smooth curves.
- Fixed dot radius bug.
- Updated max velocity of nodes to three times it's original value.
- Made "stabilized" event fire every time the network stabilizes.
- Fixed drift in dragging nodes while zooming.
- Fixed recursively constructing of hierarchical layouts.
- Added borderWidth option for nodes.
- Implemented new Hierarchical view solver.
- Fixed an issue with selecting nodes when the web page is scrolled down.
- Added Gephi JSON parser
- Added Neighbour Highlight example
- Added Import From Gephi example
- Enabled color parsing for nodes when supplied with rgb(xxx,xxx,xxx) value.

### DataSet

- Added .get() returnType option to return as JSON object, Array or Google 
  DataTable.



## 2014-07-07, version 3.0.0

### Timeline

- Implemented support for displaying a `title` for both items and groups.
- Fixed auto detected item type being preferred over the global item `type`.
- Throws an error when constructing without new keyword.
- Removed the 'rangeoverflow' item type. Instead, one can use a regular range
  and change css styling of the item contents to:

        .vis.timeline .item.range .content {
          overflow: visible;
        }
- Fixed the height of background and foreground panels of groups.
- Fixed ranges in the Timeline sometimes overlapping when dragging the Timeline.
- Fixed `DataView` not working in Timeline.

### Network (formerly named Graph)

- Renamed `Graph` to `Network` to prevent confusion with the visualizations 
  `Graph2d` and `Graph3d`.
  - Renamed option `dragGraph` to `dragNetwork`.
- Now throws an error when constructing without new keyword.
- Added pull request from Vukk, user can now define the edge width multiplier 
  when selected.
- Fixed `graph.storePositions()`.
- Extended Selection API with `selectNodes` and `selectEdges`, deprecating 
  `setSelection`.
- Fixed multiline labels.
- Changed hierarchical physics solver and updated docs.

### Graph2d

- Added first iteration of the Graph2d.

### Graph3d

- Now throws an error when constructing without new keyword.


## 2014-06-19, version 2.0.0

### Timeline

- Implemented function `destroy` to neatly cleanup a Timeline.
- Implemented support for dragging the timeline contents vertically.
- Implemented options `zoomable` and `moveable`.
- Changed default value of option `showCurrentTime` to true.
- Internal refactoring and simplification of the code.
- Fixed property `className` of groups not being applied to related contents and 
  background elements, and not being updated once applied.

### Graph

- Reduced the timestep a little for smoother animations.
- Fixed dataManipulation.initiallyVisible functionality (thanks theGrue).
- Forced typecast of fontSize to Number.
- Added editing of edges using the data manipulation toolkit.

### DataSet

- Renamed option `convert` to `type`.


## 2014-06-06, version 1.1.0

### Timeline

- Select event now triggers repeatedly when selecting an already selected item.
- Renamed `Timeline.repaint()` to `Timeline.redraw()` to be consistent with
  the other visualisations of vis.js.
- Fixed `Timeline.clear()` not resetting a configured `options.start` and 
  `options.end`.

### Graph

- Fixed error with zero nodes with hierarchical layout.
- Added focusOnNode function.
- Added hover option.
- Added dragNodes option. Renamed movebale to dragGraph option.
- Added hover events (hoverNode, blurNode).

### Graph3D

- Ported Graph3D from Chap Links Library.


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

# vis.js history
http://visjs.org


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

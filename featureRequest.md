### All
- (#308) Add a click-to-scroll option similar to click-to-use but it should allow dragging all the time, only block the scrolling without activating it.
- (#207) If possible, add Nuget Package support without ruining the current build tools.

### Network
- (#530, #475, #300) Improve option structure for the behaviour of the network. This will solve multiple issues if done correctly.
- (#426) Label stroke ref: http://www.html5canvastutorials.com/tutorials/html5-canvas-text-stroke/
- (#247) Allow the font-size of a label to depend on the value (thereby the node-size).
- (#247) Set thresholds for displaying of labels based on the value. As you zoom out, only the most noteworthy labels will be shown.
- (#246)  Add a fontAlignment option. This option should control where the label is drawn with respect to the node (ie. above, midde, under, left, right etc).
- (#211) Create styling groups for edges, as they already exist for nodes.
- (#203) Improve the click/doubleClick event with options how these should be fired.
- (#430) Add fix/unfix functions for nodes. This can be done with allowToMoveX and Y but native options would be better ('node.disableMove' and 'node.disableDrag').
- (#351) Improve the options for arrows, backarrows and linetypes. Possibly receiving a function as input for custom nodes & edges.
- (#335) Set smooth curves per edge.
- (#323) GIF support.

### Timeline

- (#529) Similar how templating works for the items, allow templating of groups by a groupTemplate option.
- (#398) Implement recurring events (similarly to the way the hidden dates are implemented?)
- (#338) HTML tooltips. Could be combined with the onHover event.
- (#297) Center column labels in the timeline.
- (#283) Adapt zoom functionality to horizontal/vertical pinch on touchscreens.
- (#363, #275) Support for making individual items editable or readonly.
- (#273) Show vertical scrollbar when contents do not fit vertically. This could be a custom, stylable scrollbar.
- (#504, #427, #261, #151) Set time/date format. Could support AM/PM, Quarters, weekdays, military etc.
- (#257) Toggle the visiblity of groups and subgroups (could be a predecessor for clustering).
- (#240) Introduce a new event that fires when an item is being moved.
- (#239) Create a new option to disable timeline zoom/drag with mouse in the group column.
- (#226) Add a 'onHover' event to the timeline, similar to the network.
- (#192) While dragging multiple items across groups, keep the group-offset.
- (#112) A horizontalOrientation options to support a right-to-left timeline.
- (#21) CSS highlighting of certain days/weekends etc. CSS class tags will have to be added to the vertical grid lines.
- (#506) Implement an inertia while dragging and releasing (like default touchscreen behaviour) which should be enabled by an option.
- (#497) Introduce a new item that has two start and two end times. Picture shown in git issue.
- (#436) Make background items and subgroups editable.
- (#435) Implement the dragging of groups (up/down) to change the order.
- (#428) Implement an option to make the timeline vertically oriented.
- (#518, #242) Clustering of items.

### Timeline & Graph2d

- (#455, #92) Numeric range for the x-axis.
- (#384) Fast horizontal scrolling.

### Graph2d

- (#516) Stacking of line graphs similar to how the bar charts can be stacked.
- (#388, #311, #282) ToolTips: this should give a stylable tooltip with the value at the position of the cursor. Options should include: **snap-to-datapoint** (only show tooltips on datapoints, if off, show interpolated value at position), **alwaysOn** (always show tooltips on datapoints, perhaps with an optional tag that you can specify here?)
- (#354) Add uncertainty plot styles (box, candle, shaded area, etc.)
- (#314) Logarithmic scale (y-axis initially, if numeric range for x-axis is implemented, could be ported over to x-axis as well).

### Graph3d

- (#442) Implement touch gestures for camera controls using hammer.js.


### DataSet & DataView

- (#339) Dynamically update the filter of a DataView.
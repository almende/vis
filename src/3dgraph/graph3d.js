/**
 * @file graph3d.js
 *
 * @brief
 * Graph3d is an interactive google visualization chart to draw data in a
 * three dimensional graph. You can freely move and zoom in the graph by
 * dragging and scrolling in the window. Graph3d also supports animation.
 *
 * Graph3d is part of the CHAP Links library.
 *
 * Graph3d is tested on Firefox 3.6, Safari 5.0, Chrome 6.0, Opera 10.6, and
 * Internet Explorer 9+.
 *
 * @license
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy
 * of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 *
 * Copyright (C) 2010-2014 Almende B.V.
 *
 * @author  Jos de Jong, jos@almende.org
 * @date    2014-05-27
 * @version 1.4
 */

/*
 TODO
 - add options to add text besides the circles/dots

 - add methods getAnimationIndex, getAnimationCount, setAnimationIndex, setAnimationNext, setAnimationPrev, ...
 - add extra examples to the playground
 - make default dot color customizable, and also the size, min size and max size of the dots
 - calculating size of a dot with style dot-size is not created well.
 - problem when animating and there is only one group
 - enable gray bottom side of the graph
 - add options to customize the color and with of the lines (when style:"line")
 - add an option to draw multiple lines in 3d
 - add options to draw dots in 3d, with a value represented by a radius or color
 - create a function to export as png
 window.open(graph.frame.canvas.toDataURL("image/png"));
 http://www.nihilogic.dk/labs/canvas2image/
 - option to show network: dots connected by a line. The width or color of a line
 can represent a value

 BUGS
 - when playing, and you change the data, something goes wrong and the animation starts playing 2x, and cannot be stopped
 - opera: right aligning the text on the axis does not work

 DOCUMENTATION
 http://en.wikipedia.org/wiki/3D_projection

 */


/**
 * Declare a unique namespace for CHAP's Common Hybrid Visualisation Library,
 * "links"
 */
if (typeof links === 'undefined') {
    links = {};
    // important: do not use var, as "var links = {};" will overwrite
    //            the existing links variable value with undefined in IE8, IE7.
}

/**
 * @constructor links.Graph3d
 * The Graph is a visualization Graphs on a time line
 *
 * Graph is developed in javascript as a Google Visualization Chart.
 *
 * @param {Element} container   The DOM element in which the Graph will
 *                                  be created. Normally a div element.
 */
links.Graph3d = function (container) {
    // create variables and set default values
    this.containerElement = container;
    this.width = "400px";
    this.height = "400px";
    this.margin = 10; // px
    this.defaultXCenter = "55%";
    this.defaultYCenter = "50%";

    this.style = links.Graph3d.STYLE.DOT;
    this.showPerspective = true;
    this.showGrid = true;
    this.keepAspectRatio = true;
    this.showShadow = false;
    this.showGrayBottom = false; // TODO: this does not work correctly
    this.showTooltip = false;
    this.verticalRatio = 0.5; // 0.1 to 1.0, where 1.0 results in a "cube"

    this.animationInterval = 1000; // milliseconds
    this.animationPreload = false;

    this.camera = new links.Graph3d.Camera();
    this.eye = new links.Point3d(0, 0, -1);  // TODO: set eye.z about 3/4 of the width of the window?

    this.dataTable = null;  // The original data table
    this.dataPoints = null; // The table with point objects

    // the column indexes
    this.colX = undefined;
    this.colY = undefined;
    this.colZ = undefined;
    this.colValue = undefined;
    this.colFilter = undefined;

    this.xMin = 0;
    this.xStep = undefined; // auto by default
    this.xMax = 1;
    this.yMin = 0;
    this.yStep = undefined; // auto by default
    this.yMax = 1;
    this.zMin = 0;
    this.zStep = undefined; // auto by default
    this.zMax = 1;
    this.valueMin = 0;
    this.valueMax = 1;
    this.xBarWidth = 1;
    this.yBarWidth = 1;
    // TODO: customize axis range

    // constants
    this.colorAxis = "#4D4D4D";
    this.colorGrid = "#D3D3D3";
    this.colorDot = "#7DC1FF";
    this.colorDotBorder = "#3267D2";

    // create a frame and canvas
    this.create();
};

/**
 * @class Camera
 * The camera is mounted on a (virtual) camera arm. The camera arm can rotate
 * The camera is always looking in the direction of the origin of the arm.
 * This way, the camera always rotates around one fixed point, the location
 * of the camera arm.
 *
 * Documentation:
 *   http://en.wikipedia.org/wiki/3D_projection
 */
links.Graph3d.Camera = function () {
    this.armLocation = new links.Point3d();
    this.armRotation = {};
    this.armRotation.horizontal = 0;
    this.armRotation.vertical = 0;
    this.armLength = 1.7;

    this.cameraLocation = new links.Point3d();
    this.cameraRotation =  new links.Point3d(0.5*Math.PI, 0, 0);

    this.calculateCameraOrientation();
};

/**
 * Set the location (origin) of the arm
 * @param {number} x    Normalized value of x
 * @param {number} y    Normalized value of y
 * @param {number} z    Normalized value of z
 */
links.Graph3d.Camera.prototype.setArmLocation = function(x, y, z) {
    this.armLocation.x = x;
    this.armLocation.y = y;
    this.armLocation.z = z;

    this.calculateCameraOrientation();
};

/**
 * Set the rotation of the camera arm
 * @param {number} horizontal   The horizontal rotation, between 0 and 2*PI.
 *                              Optional, can be left undefined.
 * @param {number} vertical     The vertical rotation, between 0 and 0.5*PI
 *                              if vertical=0.5*PI, the graph is shown from the
 *                              top. Optional, can be left undefined.
 */
links.Graph3d.Camera.prototype.setArmRotation = function(horizontal, vertical) {
    if (horizontal !== undefined) {
        this.armRotation.horizontal = horizontal;
    }

    if (vertical !== undefined) {
        this.armRotation.vertical = vertical;
        if (this.armRotation.vertical < 0) this.armRotation.vertical = 0;
        if (this.armRotation.vertical > 0.5*Math.PI) this.armRotation.vertical = 0.5*Math.PI;
    }

    if (horizontal !== undefined || vertical !== undefined) {
        this.calculateCameraOrientation();
    }
};

/**
 * Retrieve the current arm rotation
 * @return {object}   An object with parameters horizontal and vertical
 */
links.Graph3d.Camera.prototype.getArmRotation = function() {
    var rot = {};
    rot.horizontal = this.armRotation.horizontal;
    rot.vertical = this.armRotation.vertical;

    return rot;
};

/**
 * Set the (normalized) length of the camera arm.
 * @param {number} length A length between 0.71 and 5.0
 */
links.Graph3d.Camera.prototype.setArmLength = function(length) {
    if (length === undefined)
        return;

    this.armLength = length;

    // Radius must be larger than the corner of the graph,
    // which has a distance of sqrt(0.5^2+0.5^2) = 0.71 from the center of the
    // graph
    if (this.armLength < 0.71) this.armLength = 0.71;
    if (this.armLength > 5.0) this.armLength = 5.0;

    this.calculateCameraOrientation();
};

/**
 * Retrieve the arm length
 * @return {number} length
 */
links.Graph3d.Camera.prototype.getArmLength = function() {
    return this.armLength;
};

/**
 * Retrieve the camera location
 * @return {links.Point3d} cameraLocation
 */
links.Graph3d.Camera.prototype.getCameraLocation = function() {
    return this.cameraLocation;
};

/**
 * Retrieve the camera rotation
 * @return {links.Point3d} cameraRotation
 */
links.Graph3d.Camera.prototype.getCameraRotation = function() {
    return this.cameraRotation;
};

/**
 * Calculate the location and rotation of the camera based on the
 * position and orientation of the camera arm
 */
links.Graph3d.Camera.prototype.calculateCameraOrientation = function() {
    // calculate location of the camera
    this.cameraLocation.x = this.armLocation.x - this.armLength * Math.sin(this.armRotation.horizontal) * Math.cos(this.armRotation.vertical);
    this.cameraLocation.y = this.armLocation.y - this.armLength * Math.cos(this.armRotation.horizontal) * Math.cos(this.armRotation.vertical);
    this.cameraLocation.z = this.armLocation.z + this.armLength * Math.sin(this.armRotation.vertical);

    // calculate rotation of the camera
    this.cameraRotation.x = Math.PI/2 - this.armRotation.vertical;
    this.cameraRotation.y = 0;
    this.cameraRotation.z = -this.armRotation.horizontal;
};

/**
 * Calculate the scaling values, dependent on the range in x, y, and z direction
 */
links.Graph3d.prototype._setScale = function() {
    this.scale = new links.Point3d(1 / (this.xMax - this.xMin),
        1 / (this.yMax - this.yMin),
        1 / (this.zMax - this.zMin));

    // keep aspect ration between x and y scale if desired
    if (this.keepAspectRatio) {
        if (this.scale.x < this.scale.y) {
            //noinspection JSSuspiciousNameCombination
            this.scale.y = this.scale.x;
        }
        else {
            //noinspection JSSuspiciousNameCombination
            this.scale.x = this.scale.y;
        }
    }

    // scale the vertical axis
    this.scale.z *= this.verticalRatio;
    // TODO: can this be automated? verticalRatio?

    // determine scale for (optional) value
    this.scale.value = 1 / (this.valueMax - this.valueMin);

    // position the camera arm
    var xCenter = (this.xMax + this.xMin) / 2 * this.scale.x;
    var yCenter = (this.yMax + this.yMin) / 2 * this.scale.y;
    var zCenter = (this.zMax + this.zMin) / 2 * this.scale.z;
    this.camera.setArmLocation(xCenter, yCenter, zCenter);
};


/**
 * Convert a 3D location to a 2D location on screen
 * http://en.wikipedia.org/wiki/3D_projection
 * @param {links.Point3d} point3d   A 3D point with parameters x, y, z
 * @return {links.Point2d} point2d  A 2D point with parameters x, y
 */
links.Graph3d.prototype._convert3Dto2D = function(point3d) {
    var translation = this._convertPointToTranslation(point3d);
    return this._convertTranslationToScreen(translation);
};

/**
 * Convert a 3D location its translation seen from the camera
 * http://en.wikipedia.org/wiki/3D_projection
 * @param {links.Point3d} point3d      A 3D point with parameters x, y, z
 * @return {links.Point3d} translation A 3D point with parameters x, y, z This is
 *                                     the translation of the point, seen from the
 *                                     camera
 */
links.Graph3d.prototype._convertPointToTranslation = function(point3d) {
    var ax = point3d.x * this.scale.x,
        ay = point3d.y * this.scale.y,
        az = point3d.z * this.scale.z,

        cx = this.camera.getCameraLocation().x,
        cy = this.camera.getCameraLocation().y,
        cz = this.camera.getCameraLocation().z,

    // calculate angles
        sinTx = Math.sin(this.camera.getCameraRotation().x),
        cosTx = Math.cos(this.camera.getCameraRotation().x),
        sinTy = Math.sin(this.camera.getCameraRotation().y),
        cosTy = Math.cos(this.camera.getCameraRotation().y),
        sinTz = Math.sin(this.camera.getCameraRotation().z),
        cosTz = Math.cos(this.camera.getCameraRotation().z),

    // calculate translation
        dx = cosTy * (sinTz * (ay - cy) + cosTz * (ax - cx)) - sinTy * (az - cz),
        dy = sinTx * (cosTy * (az - cz) + sinTy * (sinTz * (ay - cy) + cosTz * (ax - cx))) + cosTx * (cosTz * (ay - cy) - sinTz * (ax-cx)),
        dz = cosTx * (cosTy * (az - cz) + sinTy * (sinTz * (ay - cy) + cosTz * (ax - cx))) - sinTx * (cosTz * (ay - cy) - sinTz * (ax-cx));

    return new links.Point3d(dx, dy, dz);
};

/**
 * Convert a translation point to a point on the screen
 * @param {links.Point3d} translation   A 3D point with parameters x, y, z This is
 *                                      the translation of the point, seen from the
 *                                      camera
 * @return {links.Point2d} point2d      A 2D point with parameters x, y
 */
links.Graph3d.prototype._convertTranslationToScreen = function(translation) {
    var ex = this.eye.x,
        ey = this.eye.y,
        ez = this.eye.z,
        dx = translation.x,
        dy = translation.y,
        dz = translation.z;

    // calculate position on screen from translation
    var bx;
    var by;
    if (this.showPerspective) {
        bx = (dx - ex) * (ez / dz);
        by = (dy - ey) * (ez / dz);
    }
    else {
        bx = dx * -(ez / this.camera.getArmLength());
        by = dy * -(ez / this.camera.getArmLength());
    }

    // shift and scale the point to the center of the screen
    // use the width of the graph to scale both horizontally and vertically.
    return new links.Point2d(
        this.xcenter + bx * this.frame.canvas.clientWidth,
        this.ycenter - by * this.frame.canvas.clientWidth);
};

/**
 * Main drawing logic. This is the function that needs to be called
 * in the html page, to draw the Graph.
 *
 * A data table with the events must be provided, and an options table.
 * @param {google.visualization.DataTable} data The data containing the events
 *                                              for the Graph.
 * @param {Object} options A name/value map containing settings for the Graph.
 */
links.Graph3d.prototype.draw = function(data, options) {
    var cameraPosition = undefined;

    if (options !== undefined) {
        // retrieve parameter values
        if (options.width !== undefined)           this.width = options.width;
        if (options.height !== undefined)          this.height = options.height;

        if (options.xCenter !== undefined)         this.defaultXCenter = options.xCenter;
        if (options.yCenter !== undefined)         this.defaultYCenter = options.yCenter;

        if (options.style !== undefined) {
            var styleNumber = this._getStyleNumber(options.style);
            if (styleNumber !== -1) {
                this.style = styleNumber;
            }
        }
        if (options.showGrid !== undefined)          this.showGrid = options.showGrid;
        if (options.showPerspective !== undefined)   this.showPerspective = options.showPerspective;
        if (options.showShadow !== undefined)        this.showShadow = options.showShadow;
        if (options.tooltip !== undefined)           this.showTooltip = options.tooltip;
        if (options.showAnimationControls !== undefined) this.showAnimationControls = options.showAnimationControls;
        if (options.keepAspectRatio !== undefined)   this.keepAspectRatio = options.keepAspectRatio;
        if (options.verticalRatio !== undefined)     this.verticalRatio = options.verticalRatio;

        if (options.animationInterval !== undefined) this.animationInterval = options.animationInterval;
        if (options.animationPreload !== undefined)  this.animationPreload = options.animationPreload;
        if (options.animationAutoStart !== undefined)this.animationAutoStart = options.animationAutoStart;

        if (options.xBarWidth !== undefined) this.defaultXBarWidth = options.xBarWidth;
        if (options.yBarWidth !== undefined) this.defaultYBarWidth = options.yBarWidth;

        if (options.xMin !== undefined) this.defaultXMin = options.xMin;
        if (options.xStep !== undefined) this.defaultXStep = options.xStep;
        if (options.xMax !== undefined) this.defaultXMax = options.xMax;
        if (options.yMin !== undefined) this.defaultYMin = options.yMin;
        if (options.yStep !== undefined) this.defaultYStep = options.yStep;
        if (options.yMax !== undefined) this.defaultYMax = options.yMax;
        if (options.zMin !== undefined) this.defaultZMin = options.zMin;
        if (options.zStep !== undefined) this.defaultZStep = options.zStep;
        if (options.zMax !== undefined) this.defaultZMax = options.zMax;
        if (options.valueMin !== undefined) this.defaultValueMin = options.valueMin;
        if (options.valueMax !== undefined) this.defaultValueMax = options.valueMax;

        if (options.cameraPosition !== undefined) cameraPosition = options.cameraPosition;
    }

    this._setBackgroundColor(options.backgroundColor);

    this.setSize(this.width, this.height);

    if (cameraPosition !== undefined) {
        this.camera.setArmRotation(cameraPosition.horizontal, cameraPosition.vertical);
        this.camera.setArmLength(cameraPosition.distance);
    }
    else {
        this.camera.setArmRotation(1.0, 0.5);
        this.camera.setArmLength(1.7);
    }

    // draw the Graph
    this.redraw(data);

    // start animation when option is true
    if (this.animationAutoStart && this.dataFilter) {
        this.animationStart();
    }

    // fire the ready event
    google.visualization.events.trigger(this, 'ready', null);
};


/**
 * Set the background styling for the graph
 * @param {string | {fill: string, stroke: string, strokeWidth: string}} backgroundColor
 */
links.Graph3d.prototype._setBackgroundColor = function(backgroundColor) {
    var fill = "white";
    var stroke = "gray";
    var strokeWidth = 1;

    if (typeof(backgroundColor) === "string") {
        fill = backgroundColor;
        stroke = "none";
        strokeWidth = 0;
    }
    else if (typeof(backgroundColor) === "object") {
        if (backgroundColor.fill !== undefined)        fill = backgroundColor.fill;
        if (backgroundColor.stroke !== undefined)      stroke = backgroundColor.stroke;
        if (backgroundColor.strokeWidth !== undefined) strokeWidth = backgroundColor.strokeWidth;
    }
    else if  (backgroundColor === undefined) {
        // use use defaults
    }
    else {
        throw "Unsupported type of backgroundColor";
    }

    this.frame.style.backgroundColor = fill;
    this.frame.style.borderColor = stroke;
    this.frame.style.borderWidth = strokeWidth + "px";
    this.frame.style.borderStyle = "solid";
};


/// enumerate the available styles
links.Graph3d.STYLE = {
    BAR: 0,
    BARCOLOR: 1,
    BARSIZE: 2,
    DOT : 3,
    DOTLINE : 4,
    DOTCOLOR: 5,
    DOTSIZE: 6,
    GRID : 7,
    LINE: 8,
    SURFACE : 9
};

/**
 * Retrieve the style index from given styleName
 * @param {string} styleName    Style name such as "dot", "grid", "dot-line"
 * @return {number} styleNumber Enumeration value representing the style, or -1
 *                              when not found
 */
links.Graph3d.prototype._getStyleNumber = function(styleName) {
    switch (styleName) {
        case "dot":         return links.Graph3d.STYLE.DOT;
        case "dot-line":    return links.Graph3d.STYLE.DOTLINE;
        case "dot-color":   return links.Graph3d.STYLE.DOTCOLOR;
        case "dot-size":    return links.Graph3d.STYLE.DOTSIZE;
        case "line":        return links.Graph3d.STYLE.LINE;
        case "grid":        return links.Graph3d.STYLE.GRID;
        case "surface":     return links.Graph3d.STYLE.SURFACE;
        case "bar":         return links.Graph3d.STYLE.BAR;
        case "bar-color":   return links.Graph3d.STYLE.BARCOLOR;
        case "bar-size":    return links.Graph3d.STYLE.BARSIZE;
    }

    return -1;
};

/**
 * Determine the indexes of the data columns, based on the given style and data
 * @param {google.visualization.DataTable} data
 * @param {number}  style
 */
links.Graph3d.prototype._determineColumnIndexes = function(data, style) {
    if (this.style === links.Graph3d.STYLE.DOT ||
        this.style === links.Graph3d.STYLE.DOTLINE ||
        this.style === links.Graph3d.STYLE.LINE ||
        this.style === links.Graph3d.STYLE.GRID ||
        this.style === links.Graph3d.STYLE.SURFACE ||
        this.style === links.Graph3d.STYLE.BAR) {
        // 3 columns expected, and optionally a 4th with filter values
        this.colX = 0;
        this.colY = 1;
        this.colZ = 2;
        this.colValue = undefined;

        if (data.getNumberOfColumns() > 3) {
            this.colFilter = 3;
        }
    }
    else if (this.style === links.Graph3d.STYLE.DOTCOLOR ||
        this.style === links.Graph3d.STYLE.DOTSIZE ||
        this.style === links.Graph3d.STYLE.BARCOLOR ||
        this.style === links.Graph3d.STYLE.BARSIZE) {
        // 4 columns expected, and optionally a 5th with filter values
        this.colX = 0;
        this.colY = 1;
        this.colZ = 2;
        this.colValue = 3;

        if (data.getNumberOfColumns() > 4) {
            this.colFilter = 4;
        }
    }
    else {
        throw "Unknown style '" + this.style + "'";
    }
};

/**
 * Initialize the data from the data table. Calculate minimum and maximum values
 * and column index values
 * @param {google.visualization.DataTable} data   The data containing the events
 *                                                for the Graph.
 * @param {number}         style   Style number
 */
links.Graph3d.prototype._dataInitialize = function (data, style) {
    if (data === undefined || data.getNumberOfRows === undefined)
        return;

    // determine the location of x,y,z,value,filter columns
    this._determineColumnIndexes(data, style);

    this.dataTable = data;
    this.dataFilter = undefined;

    // check if a filter column is provided
    if (this.colFilter && data.getNumberOfColumns() >= this.colFilter) {
        if (this.dataFilter === undefined) {
            this.dataFilter = new links.Filter(data, this.colFilter, this);

            var me = this;
            this.dataFilter.setOnLoadCallback(function() {me.redraw();});
        }
    }

    var withBars = this.style == links.Graph3d.STYLE.BAR ||
        this.style == links.Graph3d.STYLE.BARCOLOR ||
        this.style == links.Graph3d.STYLE.BARSIZE;

    // determine barWidth from data
    if (withBars) {
        if (this.defaultXBarWidth !== undefined) {
            this.xBarWidth = this.defaultXBarWidth;
        }
        else {
            var dataX = data.getDistinctValues(this.colX);
            this.xBarWidth = (dataX[1] - dataX[0]) || 1;
        }

        if (this.defaultYBarWidth !== undefined) {
            this.yBarWidth = this.defaultYBarWidth;
        }
        else {
            var dataY = data.getDistinctValues(this.colY);
            this.yBarWidth = (dataY[1] - dataY[0]) || 1;
        }
    }

    // calculate minimums and maximums
    var xRange = data.getColumnRange(this.colX);
    if (withBars) {
        xRange.min -= this.xBarWidth / 2;
        xRange.max += this.xBarWidth / 2;
    }
    this.xMin = (this.defaultXMin !== undefined) ? this.defaultXMin : xRange.min;
    this.xMax = (this.defaultXMax !== undefined) ? this.defaultXMax : xRange.max;
    if (this.xMax <= this.xMin) this.xMax = this.xMin + 1;
    this.xStep = (this.defaultXStep !== undefined) ? this.defaultXStep : (this.xMax-this.xMin)/5;

    var yRange = data.getColumnRange(this.colY);
    if (withBars) {
        yRange.min -= this.yBarWidth / 2;
        yRange.max += this.yBarWidth / 2;
    }
    this.yMin = (this.defaultYMin !== undefined) ? this.defaultYMin : yRange.min;
    this.yMax = (this.defaultYMax !== undefined) ? this.defaultYMax : yRange.max;
    if (this.yMax <= this.yMin) this.yMax = this.yMin + 1;
    this.yStep = (this.defaultYStep !== undefined) ? this.defaultYStep : (this.yMax-this.yMin)/5;

    var zRange = data.getColumnRange(this.colZ);
    this.zMin = (this.defaultZMin !== undefined) ? this.defaultZMin : zRange.min;
    this.zMax = (this.defaultZMax !== undefined) ? this.defaultZMax : zRange.max;
    if (this.zMax <= this.zMin) this.zMax = this.zMin + 1;
    this.zStep = (this.defaultZStep !== undefined) ? this.defaultZStep : (this.zMax-this.zMin)/5;

    if (this.colValue !== undefined) {
        var valueRange = data.getColumnRange(this.colValue);
        this.valueMin = (this.defaultValueMin !== undefined) ? this.defaultValueMin : valueRange.min;
        this.valueMax = (this.defaultValueMax !== undefined) ? this.defaultValueMax : valueRange.max;
        if (this.valueMax <= this.valueMin) this.valueMax = this.valueMin + 1;
    }

    // set the scale dependent on the ranges.
    this._setScale();
};



/**
 * Filter the data based on the current filter
 * @param {google.visualization.DataTable} data
 * @return {Array} dataPoints   Array with point objects which can be drawn on screen
 */
links.Graph3d.prototype._getDataPoints = function (data) {
    // TODO: store the created matrix dataPoints in the filters instead of reloading each time
    var x, y, i, z, obj, point;

    var dataPoints = [];

    if (this.style === links.Graph3d.STYLE.GRID ||
        this.style === links.Graph3d.STYLE.SURFACE) {
        // copy all values from the google data table to a matrix
        // the provided values are supposed to form a grid of (x,y) positions

        // create two lists with all present x and y values
        var dataX = [];
        var dataY = [];
        for (i = 0; i < data.getNumberOfRows(); i++) {
            x = data.getValue(i, this.colX) || 0;
            y = data.getValue(i, this.colY) || 0;

            if (dataX.indexOf(x) === -1) {
                dataX.push(x);
            }
            if (dataY.indexOf(y) === -1) {
                dataY.push(y);
            }
        }

        function sortNumber(a, b) {
            return a - b;
        }
        dataX.sort(sortNumber);
        dataY.sort(sortNumber);

        // create a grid, a 2d matrix, with all values.
        var dataMatrix = [];     // temporary data matrix
        for (i = 0; i < data.getNumberOfRows(); i++) {
            x = data.getValue(i, this.colX) || 0;
            y = data.getValue(i, this.colY) || 0;
            z = data.getValue(i, this.colZ) || 0;

            var xIndex = dataX.indexOf(x);  // TODO: implement Array().indexOf() for Internet Explorer
            var yIndex = dataY.indexOf(y);

            if (dataMatrix[xIndex] === undefined) {
                dataMatrix[xIndex] = [];
            }

            var point3d = new links.Point3d();
            point3d.x = x;
            point3d.y = y;
            point3d.z = z;

            obj = {};
            obj.point = point3d;
            obj.trans = undefined;
            obj.screen = undefined;
            obj.bottom = new links.Point3d(x, y, this.zMin);

            dataMatrix[xIndex][yIndex] = obj;

            dataPoints.push(obj);
        }

        // fill in the pointers to the neighbors.
        for (x = 0; x < dataMatrix.length; x++) {
            for (y = 0; y < dataMatrix[x].length; y++) {
                if (dataMatrix[x][y]) {
                    dataMatrix[x][y].pointRight = (x < dataMatrix.length-1) ? dataMatrix[x+1][y] : undefined;
                    dataMatrix[x][y].pointTop   = (y < dataMatrix[x].length-1) ? dataMatrix[x][y+1] : undefined;
                    dataMatrix[x][y].pointCross =
                        (x < dataMatrix.length-1 && y < dataMatrix[x].length-1) ?
                            dataMatrix[x+1][y+1] :
                            undefined;
                }
            }
        }
    }
    else {  // "dot", "dot-line", etc.
        // copy all values from the google data table to a list with Point3d objects
        for (i = 0; i < data.getNumberOfRows(); i++) {
            point = new links.Point3d();
            point.x = data.getValue(i, this.colX) || 0;
            point.y = data.getValue(i, this.colY) || 0;
            point.z = data.getValue(i, this.colZ) || 0;

            if (this.colValue !== undefined) {
                point.value = data.getValue(i, this.colValue) || 0;
            }

            obj = {};
            obj.point = point;
            obj.bottom = new links.Point3d(point.x, point.y, this.zMin);
            obj.trans = undefined;
            obj.screen = undefined;

            dataPoints.push(obj);
        }
    }

    return dataPoints;
};




/**
 * Append suffix "px" to provided value x
 * @param {int}     x  An integer value
 * @return {string} the string value of x, followed by the suffix "px"
 */
links.Graph3d.px = function(x) {
    return x + "px";
};


/**
 * Create the main frame for the Graph3d.
 * This function is executed once when a Graph3d object is created. The frame
 * contains a canvas, and this canvas contains all objects like the axis and
 * nodes.
 */
links.Graph3d.prototype.create = function () {
    // remove all elements from the container element.
    while (this.containerElement.hasChildNodes()) {
        this.containerElement.removeChild(this.containerElement.firstChild);
    }

    this.frame = document.createElement("div");
    this.frame.style.position = "relative";
    this.frame.style.overflow = "hidden";

    // create the graph canvas (HTML canvas element)
    this.frame.canvas = document.createElement( "canvas" );
    this.frame.canvas.style.position = "relative";
    this.frame.appendChild(this.frame.canvas);
    //if (!this.frame.canvas.getContext) {
    {
        var noCanvas = document.createElement( "DIV" );
        noCanvas.style.color = "red";
        noCanvas.style.fontWeight =  "bold" ;
        noCanvas.style.padding =  "10px";
        noCanvas.innerHTML =  "Error: your browser does not support HTML canvas";
        this.frame.canvas.appendChild(noCanvas);
    }

    this.frame.filter = document.createElement( "div" );
    this.frame.filter.style.position = "absolute";
    this.frame.filter.style.bottom = "0px";
    this.frame.filter.style.left = "0px";
    this.frame.filter.style.width = "100%";
    this.frame.appendChild(this.frame.filter);

    // add event listeners to handle moving and zooming the contents
    var me = this;
    var onmousedown = function (event) {me._onMouseDown(event);};
    var ontouchstart = function (event) {me._onTouchStart(event);};
    var onmousewheel = function (event) {me._onWheel(event);};
    var ontooltip = function (event) {me._onTooltip(event);};
    // TODO: these events are never cleaned up... can give a "memory leakage"

    links.addEventListener(this.frame.canvas, "keydown", onkeydown);
    links.addEventListener(this.frame.canvas, "mousedown", onmousedown);
    links.addEventListener(this.frame.canvas, "touchstart", ontouchstart);
    links.addEventListener(this.frame.canvas, "mousewheel", onmousewheel);
    links.addEventListener(this.frame.canvas, "mousemove", ontooltip);

    // add the new graph to the container element
    this.containerElement.appendChild(this.frame);
};


/**
 * Set a new size for the graph
 * @param {string} width   Width in pixels or percentage (for example "800px"
 *                         or "50%")
 * @param {string} height  Height in pixels or percentage  (for example "400px"
 *                         or "30%")
 */
links.Graph3d.prototype.setSize = function(width, height) {
    this.frame.style.width = width;
    this.frame.style.height = height;

    this._resizeCanvas();
};

/**
 * Resize the canvas to the current size of the frame
 */
links.Graph3d.prototype._resizeCanvas = function() {
    this.frame.canvas.style.width = "100%";
    this.frame.canvas.style.height = "100%";

    this.frame.canvas.width = this.frame.canvas.clientWidth;
    this.frame.canvas.height = this.frame.canvas.clientHeight;

    // adjust with for margin
    this.frame.filter.style.width = (this.frame.canvas.clientWidth - 2 * 10) + "px";
};

/**
 * Start animation
 */
links.Graph3d.prototype.animationStart = function() {
    if (!this.frame.filter || !this.frame.filter.slider)
        throw "No animation available";

    this.frame.filter.slider.play();
};


/**
 * Stop animation
 */
links.Graph3d.prototype.animationStop = function() {
    if (!this.frame.filter || !this.frame.filter.slider)
        throw "No animation available";

    this.frame.filter.slider.stop();
};


/**
 * Resize the center position based on the current values in this.defaultXCenter
 * and this.defaultYCenter (which are strings with a percentage or a value
 * in pixels). The center positions are the variables this.xCenter
 * and this.yCenter
 */
links.Graph3d.prototype._resizeCenter = function() {
    // calculate the horizontal center position
    if (this.defaultXCenter.charAt(this.defaultXCenter.length-1) === "%") {
        this.xcenter =
            parseFloat(this.defaultXCenter) / 100 *
                this.frame.canvas.clientWidth;
    }
    else {
        this.xcenter = parseFloat(this.defaultXCenter); // supposed to be in px
    }

    // calculate the vertical center position
    if (this.defaultYCenter.charAt(this.defaultYCenter.length-1) === "%") {
        this.ycenter =
            parseFloat(this.defaultYCenter) / 100 *
                (this.frame.canvas.clientHeight - this.frame.filter.clientHeight);
    }
    else {
        this.ycenter = parseFloat(this.defaultYCenter); // supposed to be in px
    }
};

/**
 * Set the rotation and distance of the camera
 * @param {Object} pos   An object with the camera position. The object
 *                       contains three parameters:
 *                       - horizontal {number}
 *                         The horizontal rotation, between 0 and 2*PI.
 *                         Optional, can be left undefined.
 *                       - vertical {number}
 *                         The vertical rotation, between 0 and 0.5*PI
 *                         if vertical=0.5*PI, the graph is shown from the
 *                         top. Optional, can be left undefined.
 *                       - distance {number}
 *                         The (normalized) distance of the camera to the
 *                         center of the graph, a value between 0.71 and 5.0.
 *                         Optional, can be left undefined.
 */
links.Graph3d.prototype.setCameraPosition = function(pos) {
    if (pos === undefined) {
        return;
    }

    if (pos.horizontal !== undefined && pos.vertical !== undefined) {
        this.camera.setArmRotation(pos.horizontal, pos.vertical);
    }

    if (pos.distance !== undefined) {
        this.camera.setArmLength(pos.distance);
    }

    this.redraw();
};


/**
 * Retrieve the current camera rotation
 * @return {object}   An object with parameters horizontal, vertical, and
 *                    distance
 */
links.Graph3d.prototype.getCameraPosition = function() {
    var pos = this.camera.getArmRotation();
    pos.distance = this.camera.getArmLength();
    return pos;
};

/**
 * Load data into the 3D Graph
 */
links.Graph3d.prototype._readData = function(data) {
    // read the data
    this._dataInitialize(data, this.style);

    if (this.dataFilter) {
        // apply filtering
        this.dataPoints = this.dataFilter._getDataPoints();
    }
    else {
        // no filtering. load all data
        this.dataPoints = this._getDataPoints(this.dataTable);
    }

    // draw the filter
    this._redrawFilter();
};


/**
 * Redraw the Graph. This needs to be executed after the start and/or
 * end time are changed, or when data is added or removed dynamically.
 * @param {google.visualization.DataTable} data    Optional, new data table
 */
links.Graph3d.prototype.redraw = function(data) {
    // load the data if needed
    if (data !== undefined) {
        this._readData(data);
    }

    if (this.dataPoints === undefined) {
        throw "Error: graph data not initialized";
    }

    this._resizeCanvas();
    this._resizeCenter();
    this._redrawSlider();
    this._redrawClear();
    this._redrawAxis();

    if (this.style === links.Graph3d.STYLE.GRID ||
        this.style === links.Graph3d.STYLE.SURFACE) {
        this._redrawDataGrid();
    }
    else if (this.style === links.Graph3d.STYLE.LINE) {
        this._redrawDataLine();
    }
    else if (this.style === links.Graph3d.STYLE.BAR ||
        this.style === links.Graph3d.STYLE.BARCOLOR ||
        this.style === links.Graph3d.STYLE.BARSIZE) {
        this._redrawDataBar();
    }
    else {
        // style is DOT, DOTLINE, DOTCOLOR, DOTSIZE
        this._redrawDataDot();
    }

    this._redrawInfo();
    this._redrawLegend();
};

/**
 * Clear the canvas before redrawing
 */
links.Graph3d.prototype._redrawClear = function() {
    var canvas = this.frame.canvas;
    var ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);
};


/**
 * Redraw the legend showing the colors
 */
links.Graph3d.prototype._redrawLegend = function() {
    var y;

    if (this.style === links.Graph3d.STYLE.DOTCOLOR ||
        this.style === links.Graph3d.STYLE.DOTSIZE) {

        var dotSize = this.frame.clientWidth * 0.02;

        var widthMin, widthMax;
        if (this.style === links.Graph3d.STYLE.DOTSIZE) {
            widthMin = dotSize / 2; // px
            widthMax = dotSize / 2 + dotSize * 2; // Todo: put this in one function
        }
        else {
            widthMin = 20; // px
            widthMax = 20; // px
        }

        var height = Math.max(this.frame.clientHeight * 0.25, 100);
        var top = this.margin;
        var right = this.frame.clientWidth - this.margin;
        var left = right - widthMax;
        var bottom = top + height;
    }

    var canvas = this.frame.canvas;
    var ctx = canvas.getContext("2d");
    ctx.lineWidth = 1;
    ctx.font = "14px arial"; // TODO: put in options

    if (this.style === links.Graph3d.STYLE.DOTCOLOR) {
        // draw the color bar
        var ymin = 0;
        var ymax = height; // Todo: make height customizable
        for (y = ymin; y < ymax; y++) {
            var f = (y - ymin) / (ymax - ymin);

            //var width = (dotSize / 2 + (1-f) * dotSize * 2); // Todo: put this in one function
            var hue = f * 240;
            var color = this._hsv2rgb(hue, 1, 1);

            ctx.strokeStyle = color;
            ctx.beginPath();
            ctx.moveTo(left, top + y);
            ctx.lineTo(right, top + y);
            ctx.stroke();
        }

        ctx.strokeStyle =  this.colorAxis;
        ctx.strokeRect(left, top, widthMax, height);
    }

    if (this.style === links.Graph3d.STYLE.DOTSIZE) {
        // draw border around color bar
        ctx.strokeStyle =  this.colorAxis;
        ctx.fillStyle =  this.colorDot;
        ctx.beginPath();
        ctx.moveTo(left, top);
        ctx.lineTo(right, top);
        ctx.lineTo(right - widthMax + widthMin, bottom);
        ctx.lineTo(left, bottom);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    if (this.style === links.Graph3d.STYLE.DOTCOLOR ||
        this.style === links.Graph3d.STYLE.DOTSIZE) {
        // print values along the color bar
        var gridLineLen = 5; // px
        var step = new links.StepNumber(this.valueMin, this.valueMax, (this.valueMax-this.valueMin)/5, true);
        step.start();
        if (step.getCurrent() < this.valueMin) {
            step.next();
        }
        while (!step.end()) {
            y = bottom - (step.getCurrent() - this.valueMin) / (this.valueMax - this.valueMin) * height;

            ctx.beginPath();
            ctx.moveTo(left - gridLineLen, y);
            ctx.lineTo(left, y);
            ctx.stroke();

            ctx.textAlign = "right";
            ctx.textBaseline = "middle";
            ctx.fillStyle = this.colorAxis;
            ctx.fillText(step.getCurrent(), left - 2 * gridLineLen, y);

            step.next();
        }

        ctx.textAlign = "right";
        ctx.textBaseline = "top";
        var label = this.dataTable.getColumnLabel(this.colValue);
        ctx.fillText(label, right, bottom + this.margin);
    }
};

/**
 * Redraw the filter
 */
links.Graph3d.prototype._redrawFilter = function() {
    this.frame.filter.innerHTML = "";

    if (this.dataFilter) {
        var options = {
            'visible': this.showAnimationControls
        };
        var slider = new links.Slider(this.frame.filter, options);
        this.frame.filter.slider = slider;

        // TODO: css here is not nice here...
        this.frame.filter.style.padding = "10px";
        //this.frame.filter.style.backgroundColor = "#EFEFEF";

        slider.setValues(this.dataFilter.values);
        slider.setPlayInterval(this.animationInterval);

        // create an event handler
        var me = this;
        var onchange = function () {
            var index = slider.getIndex();

            me.dataFilter.selectValue(index);
            me.dataPoints = me.dataFilter._getDataPoints();

            me.redraw();
        };
        slider.setOnChangeCallback(onchange);
    }
    else {
        this.frame.filter.slider = undefined;
    }
};

/**
 * Redraw the slider
 */
links.Graph3d.prototype._redrawSlider = function() {
    if ( this.frame.filter.slider !== undefined) {
        this.frame.filter.slider.redraw();
    }
};


/**
 * Redraw common information
 */
links.Graph3d.prototype._redrawInfo = function() {
    if (this.dataFilter) {
        var canvas = this.frame.canvas;
        var ctx = canvas.getContext("2d");

        ctx.font = "14px arial"; // TODO: put in options
        ctx.lineStyle = "gray";
        ctx.fillStyle = "gray";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";

        var x = this.margin;
        var y = this.margin;
        ctx.fillText(this.dataFilter.getLabel() + ": " + this.dataFilter.getSelectedValue(), x, y);
    }
};


/**
 * Redraw the axis
 */
links.Graph3d.prototype._redrawAxis = function() {
    var canvas = this.frame.canvas,
        ctx = canvas.getContext("2d"),
        from, to, step, prettyStep,
        text, xText, yText, zText,
        offset, xOffset, yOffset,
        xMin2d, xMax2d;

    // TODO: get the actual rendered style of the containerElement
    //ctx.font = this.containerElement.style.font;
    ctx.font = 24 / this.camera.getArmLength() + "px arial";

    // calculate the length for the short grid lines
    var gridLenX = 0.025 / this.scale.x;
    var gridLenY = 0.025 / this.scale.y;
    var textMargin = 5 / this.camera.getArmLength(); // px
    var armAngle = this.camera.getArmRotation().horizontal;

    // draw x-grid lines
    ctx.lineWidth = 1;
    prettyStep = (this.defaultXStep === undefined);
    step = new links.StepNumber(this.xMin, this.xMax, this.xStep, prettyStep);
    step.start();
    if (step.getCurrent() < this.xMin) {
        step.next();
    }
    while (!step.end()) {
        var x = step.getCurrent();

        if (this.showGrid) {
            from = this._convert3Dto2D(new links.Point3d(x, this.yMin, this.zMin));
            to = this._convert3Dto2D(new links.Point3d(x, this.yMax, this.zMin));
            ctx.strokeStyle = this.colorGrid;
            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(to.x, to.y);
            ctx.stroke();
        }
        else {
            from = this._convert3Dto2D(new links.Point3d(x, this.yMin, this.zMin));
            to = this._convert3Dto2D(new links.Point3d(x, this.yMin+gridLenX, this.zMin));
            ctx.strokeStyle = this.colorAxis;
            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(to.x, to.y);
            ctx.stroke();

            from = this._convert3Dto2D(new links.Point3d(x, this.yMax, this.zMin));
            to = this._convert3Dto2D(new links.Point3d(x, this.yMax-gridLenX, this.zMin));
            ctx.strokeStyle = this.colorAxis;
            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(to.x, to.y);
            ctx.stroke();
        }

        yText = (Math.cos(armAngle) > 0) ? this.yMin : this.yMax;
        text = this._convert3Dto2D(new links.Point3d(x, yText, this.zMin));
        if (Math.cos(armAngle * 2) > 0) {
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            text.y += textMargin;
        }
        else if (Math.sin(armAngle * 2) < 0){
            ctx.textAlign = "right";
            ctx.textBaseline = "middle";
        }
        else {
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
        }
        ctx.fillStyle = this.colorAxis;
        ctx.fillText("  " + step.getCurrent() + "  ", text.x, text.y);

        step.next();
    }

    // draw y-grid lines
    ctx.lineWidth = 1;
    prettyStep = (this.defaultYStep === undefined);
    step = new links.StepNumber(this.yMin, this.yMax, this.yStep, prettyStep);
    step.start();
    if (step.getCurrent() < this.yMin) {
        step.next();
    }
    while (!step.end()) {
        if (this.showGrid) {
            from = this._convert3Dto2D(new links.Point3d(this.xMin, step.getCurrent(), this.zMin));
            to = this._convert3Dto2D(new links.Point3d(this.xMax, step.getCurrent(), this.zMin));
            ctx.strokeStyle = this.colorGrid;
            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(to.x, to.y);
            ctx.stroke();
        }
        else {
            from = this._convert3Dto2D(new links.Point3d(this.xMin, step.getCurrent(), this.zMin));
            to = this._convert3Dto2D(new links.Point3d(this.xMin+gridLenY, step.getCurrent(), this.zMin));
            ctx.strokeStyle = this.colorAxis;
            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(to.x, to.y);
            ctx.stroke();

            from = this._convert3Dto2D(new links.Point3d(this.xMax, step.getCurrent(), this.zMin));
            to = this._convert3Dto2D(new links.Point3d(this.xMax-gridLenY, step.getCurrent(), this.zMin));
            ctx.strokeStyle = this.colorAxis;
            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(to.x, to.y);
            ctx.stroke();
        }

        xText = (Math.sin(armAngle ) > 0) ? this.xMin : this.xMax;
        text = this._convert3Dto2D(new links.Point3d(xText, step.getCurrent(), this.zMin));
        if (Math.cos(armAngle * 2) < 0) {
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            text.y += textMargin;
        }
        else if (Math.sin(armAngle * 2) > 0){
            ctx.textAlign = "right";
            ctx.textBaseline = "middle";
        }
        else {
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
        }
        ctx.fillStyle = this.colorAxis;
        ctx.fillText("  " + step.getCurrent() + "  ", text.x, text.y);

        step.next();
    }

    // draw z-grid lines and axis
    ctx.lineWidth = 1;
    prettyStep = (this.defaultZStep === undefined);
    step = new links.StepNumber(this.zMin, this.zMax, this.zStep, prettyStep);
    step.start();
    if (step.getCurrent() < this.zMin) {
        step.next();
    }
    xText = (Math.cos(armAngle ) > 0) ? this.xMin : this.xMax;
    yText = (Math.sin(armAngle ) < 0) ? this.yMin : this.yMax;
    while (!step.end()) {
        // TODO: make z-grid lines really 3d?
        from = this._convert3Dto2D(new links.Point3d(xText, yText, step.getCurrent()));
        ctx.strokeStyle = this.colorAxis;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(from.x - textMargin, from.y);
        ctx.stroke();

        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillStyle = this.colorAxis;
        ctx.fillText(step.getCurrent() + " ", from.x - 5, from.y);

        step.next();
    }
    ctx.lineWidth = 1;
    from = this._convert3Dto2D(new links.Point3d(xText, yText, this.zMin));
    to = this._convert3Dto2D(new links.Point3d(xText, yText, this.zMax));
    ctx.strokeStyle = this.colorAxis;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    // draw x-axis
    ctx.lineWidth = 1;
    // line at yMin
    xMin2d = this._convert3Dto2D(new links.Point3d(this.xMin, this.yMin, this.zMin));
    xMax2d = this._convert3Dto2D(new links.Point3d(this.xMax, this.yMin, this.zMin));
    ctx.strokeStyle = this.colorAxis;
    ctx.beginPath();
    ctx.moveTo(xMin2d.x, xMin2d.y);
    ctx.lineTo(xMax2d.x, xMax2d.y);
    ctx.stroke();
    // line at ymax
    xMin2d = this._convert3Dto2D(new links.Point3d(this.xMin, this.yMax, this.zMin));
    xMax2d = this._convert3Dto2D(new links.Point3d(this.xMax, this.yMax, this.zMin));
    ctx.strokeStyle = this.colorAxis;
    ctx.beginPath();
    ctx.moveTo(xMin2d.x, xMin2d.y);
    ctx.lineTo(xMax2d.x, xMax2d.y);
    ctx.stroke();

    // draw y-axis
    ctx.lineWidth = 1;
    // line at xMin
    from = this._convert3Dto2D(new links.Point3d(this.xMin, this.yMin, this.zMin));
    to = this._convert3Dto2D(new links.Point3d(this.xMin, this.yMax, this.zMin));
    ctx.strokeStyle = this.colorAxis;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    // line at xMax
    from = this._convert3Dto2D(new links.Point3d(this.xMax, this.yMin, this.zMin));
    to = this._convert3Dto2D(new links.Point3d(this.xMax, this.yMax, this.zMin));
    ctx.strokeStyle = this.colorAxis;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    // draw x-label
    var xLabel = this.dataTable.getColumnLabel(this.colX);
    if (xLabel.length > 0) {
        yOffset = 0.1 / this.scale.y;
        xText = (this.xMin + this.xMax) / 2;
        yText = (Math.cos(armAngle) > 0) ? this.yMin - yOffset: this.yMax + yOffset;
        text = this._convert3Dto2D(new links.Point3d(xText, yText, this.zMin));
        if (Math.cos(armAngle * 2) > 0) {
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
        }
        else if (Math.sin(armAngle * 2) < 0){
            ctx.textAlign = "right";
            ctx.textBaseline = "middle";
        }
        else {
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
        }
        ctx.fillStyle = this.colorAxis;
        ctx.fillText(xLabel, text.x, text.y);
    }

    // draw y-label
    var yLabel = this.dataTable.getColumnLabel(this.colY);
    if (yLabel.length > 0) {
        xOffset = 0.1 / this.scale.x;
        xText = (Math.sin(armAngle ) > 0) ? this.xMin - xOffset : this.xMax + xOffset;
        yText = (this.yMin + this.yMax) / 2;
        text = this._convert3Dto2D(new links.Point3d(xText, yText, this.zMin));
        if (Math.cos(armAngle * 2) < 0) {
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
        }
        else if (Math.sin(armAngle * 2) > 0){
            ctx.textAlign = "right";
            ctx.textBaseline = "middle";
        }
        else {
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
        }
        ctx.fillStyle = this.colorAxis;
        ctx.fillText(yLabel, text.x, text.y);
    }

    // draw z-label
    var zLabel = this.dataTable.getColumnLabel(this.colZ);
    if (zLabel.length > 0) {
        offset = 30;  // pixels.  // TODO: relate to the max width of the values on the z axis?
        xText = (Math.cos(armAngle ) > 0) ? this.xMin : this.xMax;
        yText = (Math.sin(armAngle ) < 0) ? this.yMin : this.yMax;
        zText = (this.zMin + this.zMax) / 2;
        text = this._convert3Dto2D(new links.Point3d(xText, yText, zText));
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillStyle = this.colorAxis;
        ctx.fillText(zLabel, text.x - offset, text.y);
    }
};

/**
 * Calculate the color based on the given value.
 * @param {number} H   Hue, a value be between 0 and 360
 * @param {number} S   Saturation, a value between 0 and 1
 * @param {number} V   Value, a value between 0 and 1
 */
links.Graph3d.prototype._hsv2rgb = function(H, S, V) {
    var R, G, B, C, Hi, X;

    C = V * S;
    Hi = Math.floor(H/60);  // hi = 0,1,2,3,4,5
    X = C * (1 - Math.abs(((H/60) % 2) - 1));

    switch (Hi) {
        case 0: R = C; G = X; B = 0; break;
        case 1: R = X; G = C; B = 0; break;
        case 2: R = 0; G = C; B = X; break;
        case 3: R = 0; G = X; B = C; break;
        case 4: R = X; G = 0; B = C; break;
        case 5: R = C; G = 0; B = X; break;

        default: R = 0; G = 0; B = 0; break;
    }

    return "RGB(" + parseInt(R*255) + "," + parseInt(G*255) + "," + parseInt(B*255) + ")";
};


/**
 * Draw all datapoints as a grid
 * This function can be used when the style is "grid"
 */
links.Graph3d.prototype._redrawDataGrid = function() {
    var canvas = this.frame.canvas,
        ctx = canvas.getContext("2d"),
        point, right, top, cross,
        i,
        topSideVisible, fillStyle, strokeStyle, lineWidth,
        h, s, v, zAvg;


    if (this.dataPoints === undefined || this.dataPoints.length <= 0)
        return; // TODO: throw exception?

    // calculate the translations and screen position of all points
    for (i = 0; i < this.dataPoints.length; i++) {
        var trans = this._convertPointToTranslation(this.dataPoints[i].point);
        var screen = this._convertTranslationToScreen(trans);

        this.dataPoints[i].trans = trans;
        this.dataPoints[i].screen = screen;

        // calculate the translation of the point at the bottom (needed for sorting)
        var transBottom = this._convertPointToTranslation(this.dataPoints[i].bottom);
        this.dataPoints[i].dist = this.showPerspective ? transBottom.length() : -transBottom.z;
    }

    // sort the points on depth of their (x,y) position (not on z)
    var sortDepth = function (a, b) {
        return b.dist - a.dist;
    };
    this.dataPoints.sort(sortDepth);

    if (this.style === links.Graph3d.STYLE.SURFACE) {
        for (i = 0; i < this.dataPoints.length; i++) {
            point = this.dataPoints[i];
            right = this.dataPoints[i].pointRight;
            top   = this.dataPoints[i].pointTop;
            cross = this.dataPoints[i].pointCross;

            if (point !== undefined && right !== undefined && top !== undefined && cross !== undefined) {

                if (this.showGrayBottom || this.showShadow) {
                    // calculate the cross product of the two vectors from center
                    // to left and right, in order to know whether we are looking at the
                    // bottom or at the top side. We can also use the cross product
                    // for calculating light intensity
                    var aDiff = links.Point3d.subtract(cross.trans, point.trans);
                    var bDiff = links.Point3d.subtract(top.trans, right.trans);
                    var crossproduct = links.Point3d.crossProduct(aDiff, bDiff);
                    var len = crossproduct.length();
                    // FIXME: there is a bug with determining the surface side (shadow or colored)

                    topSideVisible = (crossproduct.z > 0);
                }
                else {
                    topSideVisible = true;
                }

                if (topSideVisible) {
                    // calculate Hue from the current value. At zMin the hue is 240, at zMax the hue is 0
                    zAvg = (point.point.z + right.point.z + top.point.z + cross.point.z) / 4;
                    h = (1 - (zAvg - this.zMin) * this.scale.z  / this.verticalRatio) * 240;
                    s = 1; // saturation

                    if (this.showShadow) {
                        v = Math.min(1 + (crossproduct.x / len) / 2, 1);  // value. TODO: scale
                        fillStyle = this._hsv2rgb(h, s, v);
                        strokeStyle = fillStyle;
                    }
                    else  {
                        v = 1;
                        fillStyle = this._hsv2rgb(h, s, v);
                        strokeStyle = this.colorAxis;
                    }
                }
                else {
                    fillStyle = "gray";
                    strokeStyle = this.colorAxis;
                }
                lineWidth = 0.5;

                ctx.lineWidth = lineWidth;
                ctx.fillStyle = fillStyle;
                ctx.strokeStyle = strokeStyle;
                ctx.beginPath();
                ctx.moveTo(point.screen.x, point.screen.y);
                ctx.lineTo(right.screen.x, right.screen.y);
                ctx.lineTo(cross.screen.x, cross.screen.y);
                ctx.lineTo(top.screen.x, top.screen.y);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            }
        }
    }
    else { // grid style
        for (i = 0; i < this.dataPoints.length; i++) {
            point = this.dataPoints[i];
            right = this.dataPoints[i].pointRight;
            top   = this.dataPoints[i].pointTop;

            if (point !== undefined) {
                if (this.showPerspective) {
                    lineWidth = 2 / -point.trans.z;
                }
                else {
                    lineWidth = 2 * -(this.eye.z / this.camera.getArmLength());
                }
            }

            if (point !== undefined && right !== undefined) {
                // calculate Hue from the current value. At zMin the hue is 240, at zMax the hue is 0
                zAvg = (point.point.z + right.point.z) / 2;
                h = (1 - (zAvg - this.zMin) * this.scale.z  / this.verticalRatio) * 240;

                ctx.lineWidth = lineWidth;
                ctx.strokeStyle = this._hsv2rgb(h, 1, 1);
                ctx.beginPath();
                ctx.moveTo(point.screen.x, point.screen.y);
                ctx.lineTo(right.screen.x, right.screen.y);
                ctx.stroke();
            }

            if (point !== undefined && top !== undefined) {
                // calculate Hue from the current value. At zMin the hue is 240, at zMax the hue is 0
                zAvg = (point.point.z + top.point.z) / 2;
                h = (1 - (zAvg - this.zMin) * this.scale.z  / this.verticalRatio) * 240;

                ctx.lineWidth = lineWidth;
                ctx.strokeStyle = this._hsv2rgb(h, 1, 1);
                ctx.beginPath();
                ctx.moveTo(point.screen.x, point.screen.y);
                ctx.lineTo(top.screen.x, top.screen.y);
                ctx.stroke();
            }
        }
    }
};


/**
 * Draw all datapoints as dots.
 * This function can be used when the style is "dot" or "dot-line"
 */
links.Graph3d.prototype._redrawDataDot = function() {
    var canvas = this.frame.canvas;
    var ctx = canvas.getContext("2d");
    var i;

    if (this.dataPoints === undefined || this.dataPoints.length <= 0)
        return;  // TODO: throw exception?

    // calculate the translations of all points
    for (i = 0; i < this.dataPoints.length; i++) {
        var trans = this._convertPointToTranslation(this.dataPoints[i].point);
        var screen = this._convertTranslationToScreen(trans);
        this.dataPoints[i].trans = trans;
        this.dataPoints[i].screen = screen;

        // calculate the distance from the point at the bottom to the camera
        var transBottom = this._convertPointToTranslation(this.dataPoints[i].bottom);
        this.dataPoints[i].dist = this.showPerspective ? transBottom.length() : -transBottom.z;
    }

    // order the translated points by depth
    var sortDepth = function (a, b) {
        return b.dist - a.dist;
    };
    this.dataPoints.sort(sortDepth);

    // draw the datapoints as colored circles
    var dotSize = this.frame.clientWidth * 0.02;  // px
    for (i = 0; i < this.dataPoints.length; i++) {
        var point = this.dataPoints[i];

        if (this.style === links.Graph3d.STYLE.DOTLINE) {
            // draw a vertical line from the bottom to the graph value
            //var from = this._convert3Dto2D(new links.Point3d(point.point.x, point.point.y, this.zMin));
            var from = this._convert3Dto2D(point.bottom);
            ctx.lineWidth = 1;
            ctx.strokeStyle = this.colorGrid;
            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(point.screen.x, point.screen.y);
            ctx.stroke();
        }

        // calculate radius for the circle
        var size;
        if (this.style === links.Graph3d.STYLE.DOTSIZE) {
            size = dotSize/2 + 2*dotSize * (point.point.value - this.valueMin) / (this.valueMax - this.valueMin);
        }
        else {
            size = dotSize;
        }

        var radius;
        if (this.showPerspective) {
            radius = size / -point.trans.z;
        }
        else {
            radius = size * -(this.eye.z / this.camera.getArmLength());
        }
        if (radius < 0) {
            radius = 0;
        }

        var hue, color, borderColor;
        if (this.style === links.Graph3d.STYLE.DOTCOLOR ) {
            // calculate the color based on the value
            hue = (1 - (point.point.value - this.valueMin) * this.scale.value) * 240;
            color = this._hsv2rgb(hue, 1, 1);
            borderColor = this._hsv2rgb(hue, 1, 0.8);
        }
        else if (this.style === links.Graph3d.STYLE.DOTSIZE) {
            color = this.colorDot;
            borderColor = this.colorDotBorder;
        }
        else {
            // calculate Hue from the current value. At zMin the hue is 240, at zMax the hue is 0
            hue = (1 - (point.point.z - this.zMin) * this.scale.z  / this.verticalRatio) * 240;
            color = this._hsv2rgb(hue, 1, 1);
            borderColor = this._hsv2rgb(hue, 1, 0.8);
        }

        // draw the circle
        ctx.lineWidth = 1.0;
        ctx.strokeStyle = borderColor;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(point.screen.x, point.screen.y, radius, 0, Math.PI*2, true);
        ctx.fill();
        ctx.stroke();
    }
};

/**
 * Draw all datapoints as bars.
 * This function can be used when the style is "bar", "bar-color", or "bar-size"
 */
links.Graph3d.prototype._redrawDataBar = function() {
    var canvas = this.frame.canvas;
    var ctx = canvas.getContext("2d");
    var i, j, surface, corners;

    if (this.dataPoints === undefined || this.dataPoints.length <= 0)
        return;  // TODO: throw exception?

    // calculate the translations of all points
    for (i = 0; i < this.dataPoints.length; i++) {
        var trans = this._convertPointToTranslation(this.dataPoints[i].point);
        var screen = this._convertTranslationToScreen(trans);
        this.dataPoints[i].trans = trans;
        this.dataPoints[i].screen = screen;

        // calculate the distance from the point at the bottom to the camera
        var transBottom = this._convertPointToTranslation(this.dataPoints[i].bottom);
        this.dataPoints[i].dist = this.showPerspective ? transBottom.length() : -transBottom.z;
    }

    // order the translated points by depth
    var sortDepth = function (a, b) {
        return b.dist - a.dist;
    };
    this.dataPoints.sort(sortDepth);

    // draw the datapoints as bars
    var xWidth = this.xBarWidth / 2;
    var yWidth = this.yBarWidth / 2;
    var dotSize = this.frame.clientWidth * 0.02;  // px
    for (i = 0; i < this.dataPoints.length; i++) {
        var point = this.dataPoints[i];

        // determine color
        var hue, color, borderColor;
        if (this.style === links.Graph3d.STYLE.BARCOLOR ) {
            // calculate the color based on the value
            hue = (1 - (point.point.value - this.valueMin) * this.scale.value) * 240;
            color = this._hsv2rgb(hue, 1, 1);
            borderColor = this._hsv2rgb(hue, 1, 0.8);
        }
        else if (this.style === links.Graph3d.STYLE.BARSIZE) {
            color = this.colorDot;
            borderColor = this.colorDotBorder;
        }
        else {
            // calculate Hue from the current value. At zMin the hue is 240, at zMax the hue is 0
            hue = (1 - (point.point.z - this.zMin) * this.scale.z  / this.verticalRatio) * 240;
            color = this._hsv2rgb(hue, 1, 1);
            borderColor = this._hsv2rgb(hue, 1, 0.8);
        }

        // calculate size for the bar
        if (this.style === links.Graph3d.STYLE.BARSIZE) {
            xWidth = (this.xBarWidth / 2) * ((point.point.value - this.valueMin) / (this.valueMax - this.valueMin) * 0.8 + 0.2);
            yWidth = (this.yBarWidth / 2) * ((point.point.value - this.valueMin) / (this.valueMax - this.valueMin) * 0.8 + 0.2);
        }

        // calculate all corner points
        var me = this;
        var point3d = point.point;
        var top = [
            {point: new links.Point3d(point3d.x - xWidth, point3d.y - yWidth, point3d.z)},
            {point: new links.Point3d(point3d.x + xWidth, point3d.y - yWidth, point3d.z)},
            {point: new links.Point3d(point3d.x + xWidth, point3d.y + yWidth, point3d.z)},
            {point: new links.Point3d(point3d.x - xWidth, point3d.y + yWidth, point3d.z)}
        ];
        var bottom = [
            {point: new links.Point3d(point3d.x - xWidth, point3d.y - yWidth, this.zMin)},
            {point: new links.Point3d(point3d.x + xWidth, point3d.y - yWidth, this.zMin)},
            {point: new links.Point3d(point3d.x + xWidth, point3d.y + yWidth, this.zMin)},
            {point: new links.Point3d(point3d.x - xWidth, point3d.y + yWidth, this.zMin)}
        ];

        // calculate screen location of the points
        top.forEach(function (obj) {
            obj.screen = me._convert3Dto2D(obj.point);
        });
        bottom.forEach(function (obj) {
            obj.screen = me._convert3Dto2D(obj.point);
        });

        // create five sides, calculate both corner points and center points
        var surfaces = [
            {corners: top, center: links.Point3d.avg(bottom[0].point, bottom[2].point)},
            {corners: [top[0], top[1], bottom[1], bottom[0]], center: links.Point3d.avg(bottom[1].point, bottom[0].point)},
            {corners: [top[1], top[2], bottom[2], bottom[1]], center: links.Point3d.avg(bottom[2].point, bottom[1].point)},
            {corners: [top[2], top[3], bottom[3], bottom[2]], center: links.Point3d.avg(bottom[3].point, bottom[2].point)},
            {corners: [top[3], top[0], bottom[0], bottom[3]], center: links.Point3d.avg(bottom[0].point, bottom[3].point)}
        ];
        point.surfaces = surfaces;

        // calculate the distance of each of the surface centers to the camera
        for (j = 0; j < surfaces.length; j++) {
            surface = surfaces[j];
            var transCenter = this._convertPointToTranslation(surface.center);
            surface.dist = this.showPerspective ? transCenter.length() : -transCenter.z;
            // TODO: this dept calculation doesn't work 100% of the cases due to perspective,
            //       but the current solution is fast/simple and works in 99.9% of all cases
            //       the issue is visible in example 14, with graph.setCameraPosition({horizontal: 2.97, vertical: 0.5, distance: 0.9})
        }

        // order the surfaces by their (translated) depth
        surfaces.sort(function (a, b) {
            var diff = b.dist - a.dist;
            if (diff) return diff;

            // if equal depth, sort the top surface last
            if (a.corners === top) return 1;
            if (b.corners === top) return -1;

            // both are equal
            return 0;
        });

        // draw the ordered surfaces
        ctx.lineWidth = 1;
        ctx.strokeStyle = borderColor;
        ctx.fillStyle = color;
        // NOTE: we start at j=2 instead of j=0 as we don't need to draw the two surfaces at the backside
        for (j = 2; j < surfaces.length; j++) {
            surface = surfaces[j];
            corners = surface.corners;
            ctx.beginPath();
            ctx.moveTo(corners[3].screen.x, corners[3].screen.y);
            ctx.lineTo(corners[0].screen.x, corners[0].screen.y);
            ctx.lineTo(corners[1].screen.x, corners[1].screen.y);
            ctx.lineTo(corners[2].screen.x, corners[2].screen.y);
            ctx.lineTo(corners[3].screen.x, corners[3].screen.y);
            ctx.fill();
            ctx.stroke();
        }
    }
};


/**
 * Draw a line through all datapoints.
 * This function can be used when the style is "line"
 */
links.Graph3d.prototype._redrawDataLine = function() {
    var canvas = this.frame.canvas,
        ctx = canvas.getContext("2d"),
        point, i;

    if (this.dataPoints === undefined || this.dataPoints.length <= 0)
        return;  // TODO: throw exception?

    // calculate the translations of all points
    for (i = 0; i < this.dataPoints.length; i++) {
        var trans = this._convertPointToTranslation(this.dataPoints[i].point);
        var screen = this._convertTranslationToScreen(trans);

        this.dataPoints[i].trans = trans;
        this.dataPoints[i].screen = screen;
    }

    // start the line
    if (this.dataPoints.length > 0) {
        point = this.dataPoints[0];

        ctx.lineWidth = 1;        // TODO: make customizable
        ctx.strokeStyle = "blue"; // TODO: make customizable
        ctx.beginPath();
        ctx.moveTo(point.screen.x, point.screen.y);
    }

    // draw the datapoints as colored circles
    for (i = 1; i < this.dataPoints.length; i++) {
        point = this.dataPoints[i];
        ctx.lineTo(point.screen.x, point.screen.y);
    }

    // finish the line
    if (this.dataPoints.length > 0) {
        ctx.stroke();
    }
};

/**
 * Start a moving operation inside the provided parent element
 * @param {Event}       event         The event that occurred (required for
 *                                    retrieving the  mouse position)
 */
links.Graph3d.prototype._onMouseDown = function(event) {
    event = event || window.event;

    // check if mouse is still down (may be up when focus is lost for example
    // in an iframe)
    if (this.leftButtonDown) {
        this._onMouseUp(event);
    }

    // only react on left mouse button down
    this.leftButtonDown = event.which ? (event.which === 1) : (event.button === 1);
    if (!this.leftButtonDown && !this.touchDown) return;

    // get mouse position (different code for IE and all other browsers)
    this.startMouseX = links.getMouseX(event);
    this.startMouseY = links.getMouseY(event);

    this.startStart = new Date(this.start);
    this.startEnd = new Date(this.end);
    this.startArmRotation = this.camera.getArmRotation();

    this.frame.style.cursor = 'move';

    // add event listeners to handle moving the contents
    // we store the function onmousemove and onmouseup in the graph, so we can
    // remove the eventlisteners lateron in the function mouseUp()
    var me = this;
    this.onmousemove = function (event) {me._onMouseMove(event);};
    this.onmouseup   = function (event) {me._onMouseUp(event);};
    links.addEventListener(document, "mousemove", me.onmousemove);
    links.addEventListener(document, "mouseup", me.onmouseup);
    links.preventDefault(event);
};


/**
 * Perform moving operating.
 * This function activated from within the funcion links.Graph.mouseDown().
 * @param {Event}   event  Well, eehh, the event
 */
links.Graph3d.prototype._onMouseMove = function (event) {
    event = event || window.event;

    // calculate change in mouse position
    var diffX = parseFloat(links.getMouseX(event)) - this.startMouseX;
    var diffY = parseFloat(links.getMouseY(event)) - this.startMouseY;

    var horizontalNew = this.startArmRotation.horizontal + diffX / 200;
    var verticalNew = this.startArmRotation.vertical + diffY / 200;

    var snapAngle = 4; // degrees
    var snapValue = Math.sin(snapAngle / 360 * 2 * Math.PI);

    // snap horizontally to nice angles at 0pi, 0.5pi, 1pi, 1.5pi, etc...
    // the -0.001 is to take care that the vertical axis is always drawn at the left front corner
    if (Math.abs(Math.sin(horizontalNew)) < snapValue) {
        horizontalNew = Math.round((horizontalNew / Math.PI)) * Math.PI - 0.001;
    }
    if (Math.abs(Math.cos(horizontalNew)) < snapValue) {
        horizontalNew = (Math.round((horizontalNew/ Math.PI - 0.5)) + 0.5) * Math.PI - 0.001;
    }

    // snap vertically to nice angles
    if (Math.abs(Math.sin(verticalNew)) < snapValue) {
        verticalNew = Math.round((verticalNew / Math.PI)) * Math.PI;
    }
    if (Math.abs(Math.cos(verticalNew)) < snapValue) {
        verticalNew = (Math.round((verticalNew/ Math.PI - 0.5)) + 0.5) * Math.PI;
    }

    this.camera.setArmRotation(horizontalNew, verticalNew);
    this.redraw();

    // fire an oncamerapositionchange event
    var parameters = this.getCameraPosition();
    google.visualization.events.trigger(this, 'camerapositionchange', parameters);

    links.preventDefault(event);
};


/**
 * Stop moving operating.
 * This function activated from within the funcion links.Graph.mouseDown().
 * @param {event}  event   The event
 */
links.Graph3d.prototype._onMouseUp = function (event) {
    this.frame.style.cursor = 'auto';
    this.leftButtonDown = false;

    // remove event listeners here
    links.removeEventListener(document, "mousemove", this.onmousemove);
    links.removeEventListener(document, "mouseup",   this.onmouseup);
    links.preventDefault(event);
};

/**
 * After having moved the mouse, a tooltip should pop up when the mouse is resting on a data point
 * @param {Event}  event   A mouse move event
 */
links.Graph3d.prototype._onTooltip = function (event) {
    var delay = 300; // ms
    var mouseX = links.getMouseX(event) - links.getAbsoluteLeft(this.frame);
    var mouseY = links.getMouseY(event) - links.getAbsoluteTop(this.frame);

    if (!this.showTooltip) {
        return;
    }

    if (this.tooltipTimeout) {
        clearTimeout(this.tooltipTimeout);
    }

    // (delayed) display of a tooltip only if no mouse button is down
    if (this.leftButtonDown) {
        this._hideTooltip();
        return;
    }

    if (this.tooltip && this.tooltip.dataPoint) {
        // tooltip is currently visible
        var dataPoint = this._dataPointFromXY(mouseX, mouseY);
        if (dataPoint !== this.tooltip.dataPoint) {
            // datapoint changed
            if (dataPoint) {
                this._showTooltip(dataPoint);
            }
            else {
                this._hideTooltip();
            }
        }
    }
    else {
        // tooltip is currently not visible
        var me = this;
        this.tooltipTimeout = setTimeout(function () {
            me.tooltipTimeout = null;

            // show a tooltip if we have a data point
            var dataPoint = me._dataPointFromXY(mouseX, mouseY);
            if (dataPoint) {
                me._showTooltip(dataPoint);
            }
        }, delay);
    }
};

/**
 * Event handler for touchstart event on mobile devices
 */
links.Graph3d.prototype._onTouchStart = function(event) {
    this.touchDown = true;

    var me = this;
    this.ontouchmove = function (event) {me._onTouchMove(event);};
    this.ontouchend  = function (event) {me._onTouchEnd(event);};
    links.addEventListener(document, "touchmove", me.ontouchmove);
    links.addEventListener(document, "touchend", me.ontouchend);

    this._onMouseDown(event);
};

/**
 * Event handler for touchmove event on mobile devices
 */
links.Graph3d.prototype._onTouchMove = function(event) {
    this._onMouseMove(event);
};

/**
 * Event handler for touchend event on mobile devices
 */
links.Graph3d.prototype._onTouchEnd = function(event) {
    this.touchDown = false;

    links.removeEventListener(document, "touchmove", this.ontouchmove);
    links.removeEventListener(document, "touchend",   this.ontouchend);

    this._onMouseUp(event);
};


/**
 * Event handler for mouse wheel event, used to zoom the graph
 * Code from http://adomas.org/javascript-mouse-wheel/
 * @param {event}  event   The event
 */
links.Graph3d.prototype._onWheel = function(event) {
    if (!event) /* For IE. */
        event = window.event;

    // retrieve delta
    var delta = 0;
    if (event.wheelDelta) { /* IE/Opera. */
        delta = event.wheelDelta/120;
    } else if (event.detail) { /* Mozilla case. */
        // In Mozilla, sign of delta is different than in IE.
        // Also, delta is multiple of 3.
        delta = -event.detail/3;
    }

    // If delta is nonzero, handle it.
    // Basically, delta is now positive if wheel was scrolled up,
    // and negative, if wheel was scrolled down.
    if (delta) {
        var oldLength = this.camera.getArmLength();
        var newLength = oldLength * (1 - delta / 10);

        this.camera.setArmLength(newLength);
        this.redraw();

        this._hideTooltip();
    }

    // fire an oncamerapositionchange event
    var parameters = this.getCameraPosition();
    google.visualization.events.trigger(this, 'camerapositionchange', parameters);

    // Prevent default actions caused by mouse wheel.
    // That might be ugly, but we handle scrolls somehow
    // anyway, so don't bother here..
    links.preventDefault(event);
};

/**
 * Test whether a point lies inside given 2D triangle
 * @param {links.Point2d} point
 * @param {links.Point2d[]} triangle
 * @return {boolean} Returns true if given point lies inside or on the edge of the triangle
 * @private
 */
links.Graph3d.prototype._insideTriangle = function (point, triangle) {
    var a = triangle[0],
        b = triangle[1],
        c = triangle[2];

    function sign (x) {
        return x > 0 ? 1 : x < 0 ? -1 : 0;
    }

    var as = sign((b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x));
    var bs = sign((c.x - b.x) * (point.y - b.y) - (c.y - b.y) * (point.x - b.x));
    var cs = sign((a.x - c.x) * (point.y - c.y) - (a.y - c.y) * (point.x - c.x));

    // each of the three signs must be either equal to each other or zero
    return (as == 0 || bs == 0 || as == bs) &&
        (bs == 0 || cs == 0 || bs == cs) &&
        (as == 0 || cs == 0 || as == cs);
};

/**
 * Find a data point close to given screen position (x, y)
 * @param {number} x
 * @param {number} y
 * @return {Object | null} The closest data point or null if not close to any data point
 * @private
 */
links.Graph3d.prototype._dataPointFromXY = function (x, y) {
    var i,
        distMax = 100, // px
        dataPoint = null,
        closestDataPoint = null,
        closestDist = null,
        center = new links.Point2d(x, y);

    if (this.style === links.Graph3d.STYLE.BAR ||
        this.style === links.Graph3d.STYLE.BARCOLOR ||
        this.style === links.Graph3d.STYLE.BARSIZE) {
        // the data points are ordered from far away to closest
        for (i = this.dataPoints.length - 1; i >= 0; i--) {
            dataPoint = this.dataPoints[i];
            var surfaces  = dataPoint.surfaces;
            if (surfaces) {
                for (var s = surfaces.length - 1; s >= 0; s--) {
                    // split each surface in two triangles, and see if the center point is inside one of these
                    var surface = surfaces[s];
                    var corners = surface.corners;
                    var triangle1 = [corners[0].screen, corners[1].screen, corners[2].screen];
                    var triangle2 = [corners[2].screen, corners[3].screen, corners[0].screen];
                    if (this._insideTriangle(center, triangle1) ||
                        this._insideTriangle(center, triangle2)) {
                        // return immediately at the first hit
                        return dataPoint;
                    }
                }
            }
        }
    }
    else {
        // find the closest data point, using distance to the center of the point on 2d screen
        for (i = 0; i < this.dataPoints.length; i++) {
            dataPoint = this.dataPoints[i];
            var point = dataPoint.screen;
            if (point) {
                var distX = Math.abs(x - point.x);
                var distY = Math.abs(y - point.y);
                var dist  = Math.sqrt(distX * distX + distY * distY);

                if ((closestDist === null || dist < closestDist) && dist < distMax) {
                    closestDist = dist;
                    closestDataPoint = dataPoint;
                }
            }
        }
    }


    return closestDataPoint;
};

/**
 * Display a tooltip for given data point
 * @param {Object} dataPoint
 * @private
 */
links.Graph3d.prototype._showTooltip = function (dataPoint) {
    var content, line, dot;

    if (!this.tooltip) {
        content = document.createElement('div');
        content.style.position = 'absolute';
        content.style.padding = '10px';
        content.style.border = '1px solid #4d4d4d';
        content.style.color = '#1a1a1a';
        content.style.background = 'rgba(255,255,255,0.7)';
        content.style.borderRadius = '2px';
        content.style.boxShadow = '5px 5px 10px rgba(128,128,128,0.5)';

        line = document.createElement('div');
        line.style.position = 'absolute';
        line.style.height = '40px';
        line.style.width = '0';
        line.style.borderLeft = '1px solid #4d4d4d';

        dot = document.createElement('div');
        dot.style.position = 'absolute';
        dot.style.height = '0';
        dot.style.width = '0';
        dot.style.border = '5px solid #4d4d4d';
        dot.style.borderRadius = '5px';

        this.tooltip = {
            dataPoint: null,
            dom: {
                content: content,
                line: line,
                dot: dot
            }
        };
    }
    else {
        content = this.tooltip.dom.content;
        line    = this.tooltip.dom.line;
        dot     = this.tooltip.dom.dot;
    }

    this._hideTooltip();

    this.tooltip.dataPoint = dataPoint;
    if (typeof this.showTooltip === 'function') {
        content.innerHTML = this.showTooltip(dataPoint.point);
    }
    else {
        content.innerHTML = '<table>' +
            '<tr><td>x:</td><td>' + dataPoint.point.x + '</td></tr>' +
            '<tr><td>y:</td><td>' + dataPoint.point.y + '</td></tr>' +
            '<tr><td>z:</td><td>' + dataPoint.point.z + '</td></tr>' +
            '</table>';
    }

    content.style.left  = '0';
    content.style.top   = '0';
    this.frame.appendChild(content);
    this.frame.appendChild(line);
    this.frame.appendChild(dot);

    // calculate sizes
    var contentWidth    = content.offsetWidth;
    var contentHeight   = content.offsetHeight;
    var lineHeight      = line.offsetHeight;
    var dotWidth        = dot.offsetWidth;
    var dotHeight       = dot.offsetHeight;

    var left = dataPoint.screen.x - contentWidth / 2;
    left = Math.min(Math.max(left, 10), this.frame.clientWidth - 10 - contentWidth);

    line.style.left     = dataPoint.screen.x + 'px';
    line.style.top      = (dataPoint.screen.y - lineHeight) + 'px';
    content.style.left  = left + 'px';
    content.style.top   = (dataPoint.screen.y - lineHeight - contentHeight) + 'px';
    dot.style.left      = (dataPoint.screen.x - dotWidth / 2) + 'px';
    dot.style.top       = (dataPoint.screen.y - dotHeight / 2) + 'px';
};

/**
 * Hide the tooltip when displayed
 * @private
 */
links.Graph3d.prototype._hideTooltip = function () {
    if (this.tooltip) {
        this.tooltip.dataPoint = null;

        for (var prop in this.tooltip.dom) {
            if (this.tooltip.dom.hasOwnProperty(prop)) {
                var elem = this.tooltip.dom[prop];
                if (elem && elem.parentNode) {
                    elem.parentNode.removeChild(elem);
                }
            }
        }
    }
};

/**
 * @prototype Point3d
 * @param {Number} x
 * @param {Number} y
 * @param {Number} z
 */
links.Point3d = function (x, y, z) {
    this.x = x !== undefined ? x : 0;
    this.y = y !== undefined ? y : 0;
    this.z = z !== undefined ? z : 0;
};

/**
 * Subtract the two provided points, returns a-b
 * @param {links.Point3d} a
 * @param {links.Point3d} b
 * @return {links.Point3d} a-b
 */
links.Point3d.subtract = function(a, b) {
    var sub = new links.Point3d();
    sub.x = a.x - b.x;
    sub.y = a.y - b.y;
    sub.z = a.z - b.z;
    return sub;
};

/**
 * Add the two provided points, returns a+b
 * @param {links.Point3d} a
 * @param {links.Point3d} b
 * @return {links.Point3d} a+b
 */
links.Point3d.add = function(a, b) {
    var sum = new links.Point3d();
    sum.x = a.x + b.x;
    sum.y = a.y + b.y;
    sum.z = a.z + b.z;
    return sum;
};

/**
 * Calculate the average of two 3d points
 * @param {links.Point3d} a
 * @param {links.Point3d} b
 * @return {links.Point3d} The average, (a+b)/2
 */
links.Point3d.avg = function(a, b) {
    return new links.Point3d(
            (a.x + b.x) / 2,
            (a.y + b.y) / 2,
            (a.z + b.z) / 2
    );
};

/**
 * Calculate the cross product of the two provided points, returns axb
 * Documentation: http://en.wikipedia.org/wiki/Cross_product
 * @param {links.Point3d} a
 * @param {links.Point3d} b
 * @return {links.Point3d} cross product axb
 */
links.Point3d.crossProduct = function(a, b) {
    var crossproduct = new links.Point3d();

    crossproduct.x = a.y * b.z - a.z * b.y;
    crossproduct.y = a.z * b.x - a.x * b.z;
    crossproduct.z = a.x * b.y - a.y * b.x;

    return crossproduct;
};


/**
 * Rtrieve the length of the vector (or the distance from this point to the origin
 * @return {Number}  length
 */
links.Point3d.prototype.length = function() {
    return Math.sqrt(
            this.x * this.x +
            this.y * this.y +
            this.z * this.z
    );
};

/**
 * @prototype links.Point2d
 */
links.Point2d = function (x, y) {
    this.x = x !== undefined ? x : 0;
    this.y = y !== undefined ? y : 0;
};


/**
 * @class Filter
 *
 * @param {google.visualization.DataTable} data The google data table
 * @param {number} column                       The index of the column to be filtered
 * @param {links.Graph} graph                   The graph
 */
links.Filter = function (data, column, graph) {
    this.data = data;
    this.column = column;
    this.graph = graph; // the parent graph

    this.index = undefined;
    this.value = undefined;

    // read all distinct values and select the first one
    this.values = data.getDistinctValues(this.column);
    if (this.values.length) {
        this.selectValue(0);
    }

    // create an array with the filtered datapoints. this will be loaded afterwards
    this.dataPoints = [];

    this.loaded = false;
    this.onLoadCallback = undefined;

    if (graph.animationPreload) {
        this.loaded = false;
        this.loadInBackground();
    }
    else {
        this.loaded = true;
    }
};


/**
 * Return the label
 * @return {string} label
 */
links.Filter.prototype.isLoaded = function() {
    return this.loaded;
};


/**
 * Return the loaded progress
 * @return {number} percentage between 0 and 100
 */
links.Filter.prototype.getLoadedProgress = function() {
    var len = this.values.length;

    var i = 0;
    while (this.dataPoints[i]) {
        i++;
    }

    return Math.round(i / len * 100);
};


/**
 * Return the label
 * @return {string} label
 */
links.Filter.prototype.getLabel = function() {
    return this.data.getColumnLabel(this.column);
};


/**
 * Return the columnIndex of the filter
 * @return {number} columnIndex
 */
links.Filter.prototype.getColumn = function() {
    return this.column;
};

/**
 * Return the currently selected value. Returns undefined if there is no selection
 * @return {*} value
 */
links.Filter.prototype.getSelectedValue = function() {
    if (this.index === undefined)
        return undefined;

    return this.values[this.index];
};

/**
 * Retrieve all values of the filter
 * @return {Array} values
 */
links.Filter.prototype.getValues = function() {
    return this.values;
};

/**
 * Retrieve one value of the filter
 * @param {number}    index
 * @return {*} value
 */
links.Filter.prototype.getValue = function(index) {
    if (index >= this.values.length)
        throw "Error: index out of range";

    return this.values[index];
};


/**
 * Retrieve the (filtered) dataPoints for the currently selected filter index
 * @param {number} index (optional)
 * @return {Array} dataPoints
 */
links.Filter.prototype._getDataPoints = function(index) {
    if (index === undefined)
        index = this.index;

    if (index === undefined)
        return [];

    var dataPoints;
    if (this.dataPoints[index]) {
        dataPoints = this.dataPoints[index];
    }
    else {
        var dataView = new google.visualization.DataView(this.data);

        var f = {};
        f.column = this.column;
        f.value = this.values[index];
        var filteredRows = this.data.getFilteredRows([f]);
        dataView.setRows(filteredRows);

        dataPoints = this.graph._getDataPoints(dataView);

        this.dataPoints[index] = dataPoints;
    }

    return dataPoints;
};



/**
 * Set a callback function when the filter is fully loaded.
 */
links.Filter.prototype.setOnLoadCallback = function(callback) {
    this.onLoadCallback = callback;
};


/**
 * Add a value to the list with available values for this filter
 * No double entries will be created.
 * @param {number} index
 */
links.Filter.prototype.selectValue = function(index) {
    if (index >= this.values.length)
        throw "Error: index out of range";

    this.index = index;
    this.value = this.values[index];
};

/**
 * Load all filtered rows in the background one by one
 * Start this method without providing an index!
 */
links.Filter.prototype.loadInBackground = function(index) {
    if (index === undefined)
        index = 0;

    var frame = this.graph.frame;

    if (index < this.values.length) {
        var dataPointsTemp = this._getDataPoints(index);
        //this.graph.redrawInfo(); // TODO: not neat

        // create a progress box
        if (frame.progress === undefined) {
            frame.progress = document.createElement("DIV");
            frame.progress.style.position = "absolute";
            frame.progress.style.color = "gray";
            frame.appendChild(frame.progress);
        }
        var progress = this.getLoadedProgress();
        frame.progress.innerHTML = "Loading animation... " + progress + "%";
        // TODO: this is no nice solution...
        frame.progress.style.bottom = links.Graph3d.px(60); // TODO: use height of slider
        frame.progress.style.left = links.Graph3d.px(10);

        var me = this;
        setTimeout(function() {me.loadInBackground(index+1);}, 10);
        this.loaded = false;
    }
    else {
        this.loaded = true;

        // remove the progress box
        if (frame.progress !== undefined) {
            frame.removeChild(frame.progress);
            frame.progress = undefined;
        }

        if (this.onLoadCallback)
            this.onLoadCallback();
    }
};



/**
 * @prototype links.StepNumber
 * The class StepNumber is an iterator for numbers. You provide a start and end
 * value, and a best step size. StepNumber itself rounds to fixed values and
 * a finds the step that best fits the provided step.
 *
 * If prettyStep is true, the step size is chosen as close as possible to the
 * provided step, but being a round value like 1, 2, 5, 10, 20, 50, ....
 *
 * Example usage:
 *   var step = new links.StepNumber(0, 10, 2.5, true);
 *   step.start();
 *   while (!step.end()) {
 *     alert(step.getCurrent());
 *     step.next();
 *   }
 *
 * Version: 1.0
 *
 * @param {number} start       The start value
 * @param {number} end         The end value
 * @param {number} step        Optional. Step size. Must be a positive value.
 * @param {boolean} prettyStep Optional. If true, the step size is rounded
 *                             To a pretty step size (like 1, 2, 5, 10, 20, 50, ...)
 */
links.StepNumber = function (start, end, step, prettyStep) {
    // set default values
    this._start = 0;
    this._end = 0;
    this._step = 1;
    this.prettyStep = true;
    this.precision = 5;

    this._current = 0;
    this.setRange(start, end, step, prettyStep);
};

/**
 * Set a new range: start, end and step.
 *
 * @param {number} start       The start value
 * @param {number} end         The end value
 * @param {number} step        Optional. Step size. Must be a positive value.
 * @param {boolean} prettyStep Optional. If true, the step size is rounded
 *                             To a pretty step size (like 1, 2, 5, 10, 20, 50, ...)
 */
links.StepNumber.prototype.setRange = function(start, end, step, prettyStep) {
    this._start = start ? start : 0;
    this._end = end ? end : 0;

    this.setStep(step, prettyStep);
};

/**
 * Set a new step size
 * @param {number} step        New step size. Must be a positive value
 * @param {boolean} prettyStep Optional. If true, the provided step is rounded
 *                             to a pretty step size (like 1, 2, 5, 10, 20, 50, ...)
 */
links.StepNumber.prototype.setStep = function(step, prettyStep) {
    if (step === undefined || step <= 0)
        return;

    if (prettyStep !== undefined)
        this.prettyStep = prettyStep;

    if (this.prettyStep === true)
        this._step = links.StepNumber.calculatePrettyStep(step);
    else
        this._step = step;
};

/**
 * Calculate a nice step size, closest to the desired step size.
 * Returns a value in one of the ranges 1*10^n, 2*10^n, or 5*10^n, where n is an
 * integer number. For example 1, 2, 5, 10, 20, 50, etc...
 * @param {number}  step  Desired step size
 * @return {number}       Nice step size
 */
links.StepNumber.calculatePrettyStep = function (step) {
    var log10 = function (x) {return Math.log(x) / Math.LN10;};

    // try three steps (multiple of 1, 2, or 5
    var step1 = Math.pow(10, Math.round(log10(step))),
        step2 = 2 * Math.pow(10, Math.round(log10(step / 2))),
        step5 = 5 * Math.pow(10, Math.round(log10(step / 5)));

    // choose the best step (closest to minimum step)
    var prettyStep = step1;
    if (Math.abs(step2 - step) <= Math.abs(prettyStep - step)) prettyStep = step2;
    if (Math.abs(step5 - step) <= Math.abs(prettyStep - step)) prettyStep = step5;

    // for safety
    if (prettyStep <= 0) {
        prettyStep = 1;
    }

    return prettyStep;
};

/**
 * returns the current value of the step
 * @return {number} current value
 */
links.StepNumber.prototype.getCurrent = function () {
    return parseFloat(this._current.toPrecision(this.precision));
};

/**
 * returns the current step size
 * @return {number} current step size
 */
links.StepNumber.prototype.getStep = function () {
    return this._step;
};

/**
 * Set the current value to the largest value smaller than start, which
 * is a multiple of the step size
 */
links.StepNumber.prototype.start = function() {
    this._current = this._start - this._start % this._step;
};

/**
 * Do a step, add the step size to the current value
 */
links.StepNumber.prototype.next = function () {
    this._current += this._step;
};

/**
 * Returns true whether the end is reached
 * @return {boolean}  True if the current value has passed the end value.
 */
links.StepNumber.prototype.end = function () {
    return (this._current > this._end);
};


/**
 * @constructor links.Slider
 *
 * An html slider control with start/stop/prev/next buttons
 * @param {Element} container  The element where the slider will be created
 * @param {Object} options     Available options:
 *                                 {boolean} visible   If true (default) the
 *                                                     slider is visible.
 */
links.Slider = function(container, options) {
    if (container === undefined) {
        throw "Error: No container element defined";
    }
    this.container = container;
    this.visible = (options && options.visible != undefined) ? options.visible : true;

    if (this.visible) {
        this.frame = document.createElement("DIV");
        //this.frame.style.backgroundColor = "#E5E5E5";
        this.frame.style.width = "100%";
        this.frame.style.position = "relative";
        this.container.appendChild(this.frame);

        this.frame.prev = document.createElement("INPUT");
        this.frame.prev.type = "BUTTON";
        this.frame.prev.value = "Prev";
        this.frame.appendChild(this.frame.prev);

        this.frame.play = document.createElement("INPUT");
        this.frame.play.type = "BUTTON";
        this.frame.play.value = "Play";
        this.frame.appendChild(this.frame.play);

        this.frame.next = document.createElement("INPUT");
        this.frame.next.type = "BUTTON";
        this.frame.next.value = "Next";
        this.frame.appendChild(this.frame.next);

        this.frame.bar = document.createElement("INPUT");
        this.frame.bar.type = "BUTTON";
        this.frame.bar.style.position = "absolute";
        this.frame.bar.style.border = "1px solid red";
        this.frame.bar.style.width = "100px";
        this.frame.bar.style.height = "6px";
        this.frame.bar.style.borderRadius = "2px";
        this.frame.bar.style.MozBorderRadius = "2px";
        this.frame.bar.style.border = "1px solid #7F7F7F";
        this.frame.bar.style.backgroundColor = "#E5E5E5";
        this.frame.appendChild(this.frame.bar);

        this.frame.slide = document.createElement("INPUT");
        this.frame.slide.type = "BUTTON";
        this.frame.slide.style.margin = "0px";
        this.frame.slide.value = " ";
        this.frame.slide.style.position = "relative";
        this.frame.slide.style.left = "-100px";
        this.frame.appendChild(this.frame.slide);

        // create events
        var me = this;
        this.frame.slide.onmousedown = function (event) {me._onMouseDown(event);};
        this.frame.prev.onclick = function (event) {me.prev(event);};
        this.frame.play.onclick = function (event) {me.togglePlay(event);};
        this.frame.next.onclick = function (event) {me.next(event);};
    }

    this.onChangeCallback = undefined;

    this.values = [];
    this.index = undefined;

    this.playTimeout = undefined;
    this.playInterval = 1000; // milliseconds
    this.playLoop = true;
};

/**
 * Select the previous index
 */
links.Slider.prototype.prev = function() {
    var index = this.getIndex();
    if (index > 0) {
        index--;
        this.setIndex(index);
    }
};

/**
 * Select the next index
 */
links.Slider.prototype.next = function() {
    var index = this.getIndex();
    if (index < this.values.length - 1) {
        index++;
        this.setIndex(index);
    }
};

/**
 * Select the next index
 */
links.Slider.prototype.playNext = function() {
    var start = new Date();

    var index = this.getIndex();
    if (index < this.values.length - 1) {
        index++;
        this.setIndex(index);
    }
    else if (this.playLoop) {
        // jump to the start
        index = 0;
        this.setIndex(index);
    }

    var end = new Date();
    var diff = (end - start);

    // calculate how much time it to to set the index and to execute the callback
    // function.
    var interval = Math.max(this.playInterval - diff, 0);
    // document.title = diff // TODO: cleanup

    var me = this;
    this.playTimeout = setTimeout(function() {me.playNext();}, interval);
};

/**
 * Toggle start or stop playing
 */
links.Slider.prototype.togglePlay = function() {
    if (this.playTimeout === undefined) {
        this.play();
    } else {
        this.stop();
    }
};

/**
 * Start playing
 */
links.Slider.prototype.play = function() {
    this.playNext();

    if (this.frame) {
        this.frame.play.value = "Stop";
    }
};

/**
 * Stop playing
 */
links.Slider.prototype.stop = function() {
    clearInterval(this.playTimeout);
    this.playTimeout = undefined;

    if (this.frame) {
        this.frame.play.value = "Play";
    }
};

/**
 * Set a callback function which will be triggered when the value of the
 * slider bar has changed.
 */
links.Slider.prototype.setOnChangeCallback = function(callback) {
    this.onChangeCallback = callback;
};

/**
 * Set the interval for playing the list
 * @param {number} interval   The interval in milliseconds
 */
links.Slider.prototype.setPlayInterval = function(interval) {
    this.playInterval = interval;
};

/**
 * Retrieve the current play interval
 * @return {number} interval   The interval in milliseconds
 */
links.Slider.prototype.getPlayInterval = function(interval) {
    return this.playInterval;
};

/**
 * Set looping on or off
 * @pararm {boolean} doLoop    If true, the slider will jump to the start when
 *                             the end is passed, and will jump to the end
 *                             when the start is passed.
 */
links.Slider.prototype.setPlayLoop = function(doLoop) {
    this.playLoop = doLoop;
};


/**
 * Execute the onchange callback function
 */
links.Slider.prototype.onChange = function() {
    if (this.onChangeCallback !== undefined) {
        this.onChangeCallback();
    }
};

/**
 * redraw the slider on the correct place
 */
links.Slider.prototype.redraw = function() {
    if (this.frame) {
        // resize the bar
        this.frame.bar.style.top = (this.frame.clientHeight/2 -
            this.frame.bar.offsetHeight/2) + "px";
        this.frame.bar.style.width = (this.frame.clientWidth -
            this.frame.prev.clientWidth -
            this.frame.play.clientWidth -
            this.frame.next.clientWidth - 30)  + "px";

        // position the slider button
        var left = this.indexToLeft(this.index);
        this.frame.slide.style.left = (left) + "px";
    }
};


/**
 * Set the list with values for the slider
 * @param {Array} values   A javascript array with values (any type)
 */
links.Slider.prototype.setValues = function(values) {
    this.values = values;

    if (this.values.length > 0)
        this.setIndex(0);
    else
        this.index = undefined;
};

/**
 * Select a value by its index
 * @param {number} index
 */
links.Slider.prototype.setIndex = function(index) {
    if (index < this.values.length) {
        this.index = index;

        this.redraw();
        this.onChange();
    }
    else {
        throw "Error: index out of range";
    }
};

/**
 * retrieve the index of the currently selected vaue
 * @return {number} index
 */
links.Slider.prototype.getIndex = function() {
    return this.index;
};


/**
 * retrieve the currently selected value
 * @return {*} value
 */
links.Slider.prototype.get = function() {
    return this.values[this.index];
};


links.Slider.prototype._onMouseDown = function(event) {
    // only react on left mouse button down
    var leftButtonDown = event.which ? (event.which === 1) : (event.button === 1);
    if (!leftButtonDown) return;

    this.startClientX = event.clientX;
    this.startSlideX = parseFloat(this.frame.slide.style.left);

    this.frame.style.cursor = 'move';

    // add event listeners to handle moving the contents
    // we store the function onmousemove and onmouseup in the graph, so we can
    // remove the eventlisteners lateron in the function mouseUp()
    var me = this;
    this.onmousemove = function (event) {me._onMouseMove(event);};
    this.onmouseup   = function (event) {me._onMouseUp(event);};
    links.addEventListener(document, "mousemove", this.onmousemove);
    links.addEventListener(document, "mouseup",   this.onmouseup);
    links.preventDefault(event);
};


links.Slider.prototype.leftToIndex = function (left) {
    var width = parseFloat(this.frame.bar.style.width) -
        this.frame.slide.clientWidth - 10;
    var x = left - 3;

    var index = Math.round(x / width * (this.values.length-1));
    if (index < 0) index = 0;
    if (index > this.values.length-1) index = this.values.length-1;

    return index;
};

links.Slider.prototype.indexToLeft = function (index) {
    var width = parseFloat(this.frame.bar.style.width) -
        this.frame.slide.clientWidth - 10;

    var x = index / (this.values.length-1) * width;
    var left = x + 3;

    return left;
};



links.Slider.prototype._onMouseMove = function (event) {
    var diff = event.clientX - this.startClientX;
    var x = this.startSlideX + diff;

    var index = this.leftToIndex(x);

    this.setIndex(index);

    links.preventDefault();
};


links.Slider.prototype._onMouseUp = function (event) {
    this.frame.style.cursor = 'auto';

    // remove event listeners
    links.removeEventListener(document, "mousemove", this.onmousemove);
    links.removeEventListener(document, "mouseup", this.onmouseup);

    links.preventDefault();
};



/**--------------------------------------------------------------------------**/



/**
 * Add and event listener. Works for all browsers
 * @param {Element}     element    An html element
 * @param {string}      action     The action, for example "click",
 *                                 without the prefix "on"
 * @param {function}    listener   The callback function to be executed
 * @param {boolean}     useCapture
 */
links.addEventListener = function (element, action, listener, useCapture) {
    if (element.addEventListener) {
        if (useCapture === undefined)
            useCapture = false;

        if (action === "mousewheel" && navigator.userAgent.indexOf("Firefox") >= 0) {
            action = "DOMMouseScroll";  // For Firefox
        }

        element.addEventListener(action, listener, useCapture);
    } else {
        element.attachEvent("on" + action, listener);  // IE browsers
    }
};

/**
 * Remove an event listener from an element
 * @param {Element}      element   An html dom element
 * @param {string}       action    The name of the event, for example "mousedown"
 * @param {function}     listener  The listener function
 * @param {boolean}      useCapture
 */
links.removeEventListener = function(element, action, listener, useCapture) {
    if (element.removeEventListener) {
        // non-IE browsers
        if (useCapture === undefined)
            useCapture = false;

        if (action === "mousewheel" && navigator.userAgent.indexOf("Firefox") >= 0) {
            action = "DOMMouseScroll";  // For Firefox
        }

        element.removeEventListener(action, listener, useCapture);
    } else {
        // IE browsers
        element.detachEvent("on" + action, listener);
    }
};

/**
 * Stop event propagation
 */
links.stopPropagation = function (event) {
    if (!event)
        event = window.event;

    if (event.stopPropagation) {
        event.stopPropagation();  // non-IE browsers
    }
    else {
        event.cancelBubble = true;  // IE browsers
    }
};


/**
 * Cancels the event if it is cancelable, without stopping further propagation of the event.
 */
links.preventDefault = function (event) {
    if (!event)
        event = window.event;

    if (event.preventDefault) {
        event.preventDefault();  // non-IE browsers
    }
    else {
        event.returnValue = false;  // IE browsers
    }
};

/**
 * Retrieve the absolute left value of a DOM element
 * @param {Element} elem    A dom element, for example a div
 * @return {number} left        The absolute left position of this element
 *                              in the browser page.
 */
links.getAbsoluteLeft = function(elem) {
    var left = 0;
    while( elem !== null ) {
        left += elem.offsetLeft;
        left -= elem.scrollLeft;
        elem = elem.offsetParent;
    }
    return left;
};

/**
 * Retrieve the absolute top value of a DOM element
 * @param {Element} elem    A dom element, for example a div
 * @return {number} top         The absolute top position of this element
 *                              in the browser page.
 */
links.getAbsoluteTop = function(elem) {
    var top = 0;
    while( elem !== null ) {
        top += elem.offsetTop;
        top -= elem.scrollTop;
        elem = elem.offsetParent;
    }
    return top;
};

/**
 * Get the horizontal mouse position from a mouse event
 * @param {Event} event
 * @return {number} mouse x
 */
links.getMouseX = function(event) {
    if ('clientX' in event) return event.clientX;
    return event.targetTouches[0] && event.targetTouches[0].clientX || 0;
};

/**
 * Get the vertical mouse position from a mouse event
 * @param {Event} event
 * @return {number} mouse y
 */
links.getMouseY = function(event) {
    if ('clientY' in event) return event.clientY;
    return event.targetTouches[0] && event.targetTouches[0].clientY || 0;
};


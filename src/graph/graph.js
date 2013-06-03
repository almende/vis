/**
 * @constructor Graph
 * Create a graph visualization connecting nodes via edges.
 * @param {Element} container   The DOM element in which the Graph will
 *                                  be created. Normally a div element.
 * @param {Object} data         An object containing parameters
 *                              {Array} nodes
 *                              {Array} edges
 * @param {Object} options      Options
 */
function Graph (container, data, options) {
    // create variables and set default values
    this.containerElement = container;
    this.width = "100%";
    this.height = "100%";
    this.refreshRate = 50; // milliseconds
    this.stabilize = true; // stabilize before displaying the network
    this.selectable = true;

    // set constant values
    this.constants = {
        "nodes": {
            "radiusMin": 5,
            "radiusMax": 20,
            "radius": 5,
            "distance": 100, // px
            "style": "rect",
            "image": undefined,
            "widthMin": 16, // px
            "widthMax": 64, // px
            "fontColor": "black",
            "fontSize": 14, // px
            //"fontFace": "verdana",
            "fontFace": "arial",
            "borderColor": "#2B7CE9",
            "backgroundColor": "#97C2FC",
            "highlightColor": "#D2E5FF",
            "group": undefined
        },
        "edges": {
            "widthMin": 1,
            "widthMax": 15,
            "width": 1,
            "style": "line",
            "color": "#343434",
            "fontColor": "#343434",
            "fontSize": 14, // px
            "fontFace": "arial",
            //"distance": 100, //px
            "length": 100,   // px
            "dashlength": 10,
            "dashgap": 5
        },
        "packages": {
            "radius": 5,
            "radiusMin": 5,
            "radiusMax": 10,
            "style": "dot",
            "color": "#2B7CE9",
            "image": undefined,
            "widthMin": 16, // px
            "widthMax": 64, // px
            "duration": 1.0   // seconds
        },
        "minForce": 0.05,
        "minVelocity": 0.02,   // px/s
        "maxIterations": 1000  // maximum number of iteration to stabilize
    };

    this.nodes = [];     // array with Node objects
    this.edges = [];     // array with Edge objects
    this.packages = [];  // array with all Package packages
    this.images = new Graph.Images();     // object with images
    this.groups = new Graph.Groups();     // object with groups

    // properties of the data
    this.hasMovingEdges = false;    // True if one or more of the edges or nodes have an animation
    this.hasMovingNodes = false;    // True if any of the nodes have an undefined position
    this.hasMovingPackages = false; // True if there are one or more packages

    this.selection = [];
    this.timer = undefined;

    // create a frame and canvas
    this._create();

    // apply options
    this.setOptions(options);

    // draw data
    this.setData(data);
}

/**
 * Main drawing logic. This is the function that needs to be called
 * in the html page, to draw the Network.
 *
 * A data table with the events must be provided, and an options table.
 * @param {Object} data    Object containing parameters:
 *                         {Array} nodes     Array with nodes
 *                         {Array} edges     Array with edges
 *                         {Options} [options] Object with options
 */
Graph.prototype.setData = function(data) {
    if (data.options) {
        this.setOptions(data.options);
    }

    // set all data
    this.hasTimestamps = false;
    this.setNodes(data.nodes);
    this.setEdges(data.edges);
    this.setPackages(data.packages);

    this._reposition(); // TODO: bad solution
    if (this.stabilize) {
        this._doStabilize();
    }
    this.start();

    // create an onload callback method for the images
    var network = this;
    var callback = function () {
        network._redraw();
    };
    this.images.setOnloadCallback(callback);

    // fire the ready event
    this.trigger('ready');
};

/**
 * Set options
 * @param {Object} options
 */
Graph.prototype.setOptions = function (options) {
    if (options) {
        // retrieve parameter values
        if (options.width != undefined)           {this.width = options.width;}
        if (options.height != undefined)          {this.height = options.height;}
        if (options.stabilize != undefined)       {this.stabilize = options.stabilize;}
        if (options.selectable != undefined)      {this.selectable = options.selectable;}

        // TODO: work out these options and document them
        if (options.edges) {
            for (var prop in options.edges) {
                if (options.edges.hasOwnProperty(prop)) {
                    this.constants.edges[prop] = options.edges[prop];
                }
            }

            if (options.edges.length != undefined &&
                options.nodes && options.nodes.distance == undefined) {
                this.constants.edges.length   = options.edges.length;
                this.constants.nodes.distance = options.edges.length * 1.25;
            }

            if (!options.edges.fontColor) {
                this.constants.edges.fontColor = options.edges.color;
            }

            // Added to support dashed lines
            // David Jordan
            // 2012-08-08
            if (options.edges.dashlength != undefined) {
                this.constants.edges.dashlength   = options.edges.dashlength;
            }
            if (options.edges.dashgap != undefined) {
                this.constants.edges.dashgap   = options.edges.dashgap;
            }
            if (options.edges.altdashlength != undefined) {
                this.constants.edges.altdashlength   = options.edges.altdashlength;
            }
        }
        if (options.nodes) {
            for (prop in options.nodes) {
                if (options.nodes.hasOwnProperty(prop)) {
                    this.constants.nodes[prop] = options.nodes[prop];
                }
            }

            /*
             if (options.nodes.widthMin) this.constants.nodes.radiusMin = options.nodes.widthMin;
             if (options.nodes.widthMax) this.constants.nodes.radiusMax = options.nodes.widthMax;
             */
        }
        if (options.packages) {
            for (prop in options.packages) {
                if (options.packages.hasOwnProperty(prop)) {
                    this.constants.packages[prop] = options.packages[prop];
                }
            }

            /*
             if (options.packages.widthMin) this.constants.packages.radiusMin = options.packages.widthMin;
             if (options.packages.widthMax) this.constants.packages.radiusMax = options.packages.widthMax;
             */
        }

        if (options.groups) {
            for (var groupname in options.groups) {
                if (options.groups.hasOwnProperty(groupname)) {
                    var group = options.groups[groupname];
                    this.groups.add(groupname, group);
                }
            }
        }

        this._setBackgroundColor(options.backgroundColor);
    }

    this._setSize(this.width, this.height);
    this._setTranslation(0, 0);
    this._setScale(1.0);
};

/**
 * fire an event
 * @param {String} event   The name of an event, for example "select" or "ready"
 * @param {Object} params  Optional object with event parameters
 */
Graph.prototype.trigger = function (event, params) {
    // trigger the edges event bus
    events.trigger(this, event, params);

    // trigger the google event bus
    if (typeof google !== 'undefined' && google.visualization && google.visualization.events) {
        google.visualization.events.trigger(this, event, params);
    }
};


/**
 * Create the main frame for the Network.
 * This function is executed once when a Network object is created. The frame
 * contains a canvas, and this canvas contains all objects like the axis and
 * nodes.
 */
Graph.prototype._create = function () {
    // remove all elements from the container element.
    while (this.containerElement.hasChildNodes()) {
        this.containerElement.removeChild(this.containerElement.firstChild);
    }

    this.frame = document.createElement("div");
    this.frame.className = "network-frame";
    this.frame.style.position = "relative";
    this.frame.style.overflow = "hidden";

    // create the graph canvas (HTML canvas element)
    this.frame.canvas = document.createElement( "canvas" );
    this.frame.canvas.style.position = "relative";
    this.frame.appendChild(this.frame.canvas);
    if (!this.frame.canvas.getContext) {
        var noCanvas = document.createElement( "DIV" );
        noCanvas.style.color = "red";
        noCanvas.style.fontWeight =  "bold" ;
        noCanvas.style.padding =  "10px";
        noCanvas.innerHTML =  "Error: your browser does not support HTML canvas";
        this.frame.canvas.appendChild(noCanvas);
    }

    // create event listeners
    var me = this;
    var onmousedown = function (event) {me._onMouseDown(event);};
    var onmousemove = function (event) {me._onMouseMoveTitle(event);};
    var onmousewheel = function (event) {me._onMouseWheel(event);};
    var ontouchstart = function (event) {me._onTouchStart(event);};
    Graph.addEventListener(this.frame.canvas, "mousedown", onmousedown);
    Graph.addEventListener(this.frame.canvas, "mousemove", onmousemove);
    Graph.addEventListener(this.frame.canvas, "mousewheel", onmousewheel);
    Graph.addEventListener(this.frame.canvas, "touchstart", ontouchstart);

    // add the frame to the container element
    this.containerElement.appendChild(this.frame);
};

/**
 * Set the background  and border styling for the graph
 * @param {String | Object} backgroundColor
 */
Graph.prototype._setBackgroundColor = function(backgroundColor) {
    var fill = "white";
    var stroke = "lightgray";
    var strokeWidth = 1;

    if (typeof(backgroundColor) == "string") {
        fill = backgroundColor;
        stroke = "none";
        strokeWidth = 0;
    }
    else if (typeof(backgroundColor) == "object") {
        if (backgroundColor.fill != undefined)        fill = backgroundColor.fill;
        if (backgroundColor.stroke != undefined)      stroke = backgroundColor.stroke;
        if (backgroundColor.strokeWidth != undefined) strokeWidth = backgroundColor.strokeWidth;
    }
    else if  (backgroundColor == undefined) {
        // use use defaults
    }
    else {
        throw "Unsupported type of backgroundColor";
    }

    this.frame.style.boxSizing = 'border-box';
    this.frame.style.backgroundColor = fill;
    this.frame.style.borderColor = stroke;
    this.frame.style.borderWidth = strokeWidth + "px";
    this.frame.style.borderStyle = "solid";
};


/**
 * handle on mouse down event
 */
Graph.prototype._onMouseDown = function (event) {
    event = event || window.event;

    if (!this.selectable) {
        return;
    }

    // check if mouse is still down (may be up when focus is lost for example
    // in an iframe)
    if (this.leftButtonDown) {
        this._onMouseUp(event);
    }

    // only react on left mouse button down
    this.leftButtonDown = event.which ? (event.which == 1) : (event.button == 1);
    if (!this.leftButtonDown && !this.touchDown) {
        return;
    }

    // add event listeners to handle moving the contents
    // we store the function onmousemove and onmouseup in the timeline, so we can
    // remove the eventlisteners lateron in the function mouseUp()
    var me = this;
    if (!this.onmousemove) {
        this.onmousemove = function (event) {me._onMouseMove(event);};
        Graph.addEventListener(document, "mousemove", me.onmousemove);
    }
    if (!this.onmouseup) {
        this.onmouseup = function (event) {me._onMouseUp(event);};
        Graph.addEventListener(document, "mouseup", me.onmouseup);
    }
    Graph.preventDefault(event);

    // store the start x and y position of the mouse
    this.startMouseX = event.clientX || event.targetTouches[0].clientX;
    this.startMouseY = event.clientY || event.targetTouches[0].clientY;
    this.startFrameLeft = Graph._getAbsoluteLeft(this.frame.canvas);
    this.startFrameTop = Graph._getAbsoluteTop(this.frame.canvas);
    this.startTranslation = this._getTranslation();

    this.ctrlKeyDown = event.ctrlKey;
    this.shiftKeyDown = event.shiftKey;

    var obj = {
        "left" :   this._xToCanvas(this.startMouseX - this.startFrameLeft),
        "top" :    this._yToCanvas(this.startMouseY - this.startFrameTop),
        "right" :  this._xToCanvas(this.startMouseX - this.startFrameLeft),
        "bottom" : this._yToCanvas(this.startMouseY - this.startFrameTop)
    };
    var overlappingNodes = this._getNodesOverlappingWith(obj);
    // if there are overlapping nodes, select the last one, this is the
    // one which is drawn on top of the others
    this.startClickedObj = (overlappingNodes.length > 0) ?
        overlappingNodes[overlappingNodes.length - 1] : undefined;

    if (this.startClickedObj) {
        // move clicked node with the mouse

        // make the clicked node temporarily fixed, and store their original state
        var node = this.nodes[this.startClickedObj.row];
        this.startClickedObj.xFixed = node.xFixed;
        this.startClickedObj.yFixed = node.yFixed;
        node.xFixed = true;
        node.yFixed = true;

        if (!this.ctrlKeyDown || !node.isSelected()) {
            // select this node
            this._selectNodes([this.startClickedObj], this.ctrlKeyDown);
        }
        else {
            // unselect this node
            this._unselectNodes([this.startClickedObj]);
        }

        if (!this.hasMovingNodes) {
            this._redraw();
        }
    }
    else if (this.shiftKeyDown) {
        // start selection of multiple nodes
    }
    else {
        // start moving the graph
        this.moved = false;
    }
};

/**
 * handle on mouse move event
 */
Graph.prototype._onMouseMove = function (event) {
    event = event || window.event;

    if (!this.selectable) {
        return;
    }

    var mouseX = event.clientX || (event.targetTouches && event.targetTouches[0].clientX) || 0;
    var mouseY = event.clientY || (event.targetTouches && event.targetTouches[0].clientY) || 0;
    this.mouseX = mouseX;
    this.mouseY = mouseY;

    if (this.startClickedObj) {
        var node = this.nodes[this.startClickedObj.row];

        if (!this.startClickedObj.xFixed)
            node.x = this._xToCanvas(mouseX - this.startFrameLeft);

        if (!this.startClickedObj.yFixed)
            node.y = this._yToCanvas(mouseY - this.startFrameTop);

        // start animation if not yet running
        if (!this.hasMovingNodes) {
            this.hasMovingNodes = true;
            this.start();
        }
    }
    else if (this.shiftKeyDown) {
        // draw a rect from start mouse location to current mouse location
        if (this.frame.selRect == undefined) {
            this.frame.selRect = document.createElement("DIV");
            this.frame.appendChild(this.frame.selRect);

            this.frame.selRect.style.position = "absolute";
            this.frame.selRect.style.border = "1px dashed red";
        }

        var left =   Math.min(this.startMouseX, mouseX) - this.startFrameLeft;
        var top =    Math.min(this.startMouseY, mouseY) - this.startFrameTop;
        var right =  Math.max(this.startMouseX, mouseX) - this.startFrameLeft;
        var bottom = Math.max(this.startMouseY, mouseY) - this.startFrameTop;

        this.frame.selRect.style.left = left + "px";
        this.frame.selRect.style.top = top + "px";
        this.frame.selRect.style.width = (right - left) + "px";
        this.frame.selRect.style.height = (bottom - top) + "px";
    }
    else {
        // move the network
        var diffX = mouseX - this.startMouseX;
        var diffY = mouseY - this.startMouseY;

        this._setTranslation(
            this.startTranslation.x + diffX,
            this.startTranslation.y + diffY);
        this._redraw();

        this.moved = true;
    }

    Graph.preventDefault(event);
};

/**
 * handle on mouse up event
 */
Graph.prototype._onMouseUp = function (event) {
    event = event || window.event;

    if (!this.selectable) {
        return;
    }

    // remove event listeners here, important for Safari
    if (this.onmousemove) {
        Graph.removeEventListener(document, "mousemove", this.onmousemove);
        this.onmousemove = undefined;
    }
    if (this.onmouseup) {
        Graph.removeEventListener(document, "mouseup",   this.onmouseup);
        this.onmouseup = undefined;
    }
    Graph.preventDefault(event);

    // check selected nodes
    var endMouseX = event.clientX || this.mouseX || 0;
    var endMouseY = event.clientY || this.mouseY || 0;

    var ctrlKey = event ? event.ctrlKey : window.event.ctrlKey;

    if (this.startClickedObj) {
        // restore the original fixed state
        var node = this.nodes[this.startClickedObj.row];
        node.xFixed = this.startClickedObj.xFixed;
        node.yFixed = this.startClickedObj.yFixed;
    }
    else if (this.shiftKeyDown) {
        // select nodes inside selection area
        var obj = {
            "left":   this._xToCanvas(Math.min(this.startMouseX, endMouseX) - this.startFrameLeft),
            "top":    this._yToCanvas(Math.min(this.startMouseY, endMouseY) - this.startFrameTop),
            "right":  this._xToCanvas(Math.max(this.startMouseX, endMouseX) - this.startFrameLeft),
            "bottom": this._yToCanvas(Math.max(this.startMouseY, endMouseY) - this.startFrameTop)
        };
        var overlappingNodes = this._getNodesOverlappingWith(obj);
        this._selectNodes(overlappingNodes, ctrlKey);
        this.redraw();

        // remove the selection rectangle
        if (this.frame.selRect) {
            this.frame.removeChild(this.frame.selRect);
            this.frame.selRect = undefined;
        }
    }
    else {
        if (!this.ctrlKeyDown && !this.moved) {
            // remove selection
            this._unselectNodes();
            this._redraw();
        }
    }

    this.leftButtonDown = false;
    this.ctrlKeyDown = false;
};


/**
 * Event handler for mouse wheel event, used to zoom the timeline
 * Code from http://adomas.org/javascript-mouse-wheel/
 * @param {event}  event   The event
 */
Graph.prototype._onMouseWheel = function(event) {
    event = event || window.event;
    var mouseX = event.clientX;
    var mouseY = event.clientY;

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
        // determine zoom factor, and adjust the zoom factor such that zooming in
        // and zooming out correspond wich each other
        var zoom = delta / 10;
        if (delta < 0) {
            zoom = zoom / (1 - zoom);
        }

        var scaleOld = this._getScale();
        var scaleNew = scaleOld * (1 + zoom);
        if (scaleNew < 0.01) {
            scaleNew = 0.01;
        }
        if (scaleNew > 10) {
            scaleNew = 10;
        }

        var frameLeft = Graph._getAbsoluteLeft(this.frame.canvas);
        var frameTop = Graph._getAbsoluteTop(this.frame.canvas);
        var x = mouseX - frameLeft;
        var y = mouseY - frameTop;

        var translation = this._getTranslation();
        var scaleFrac = scaleNew / scaleOld;
        var tx = (1 - scaleFrac) * x + translation.x * scaleFrac;
        var ty = (1 - scaleFrac) * y + translation.y * scaleFrac;

        this._setScale(scaleNew);
        this._setTranslation(tx, ty);
        this._redraw();
    }

    // Prevent default actions caused by mouse wheel.
    // That might be ugly, but we handle scrolls somehow
    // anyway, so don't bother here...
    Graph.preventDefault(event);
};


/**
 * Mouse move handler for checking whether the title moves over a node or
 * package with a title.
 */
Graph.prototype._onMouseMoveTitle = function (event) {
    event = event || window.event;

    var startMouseX = event.clientX;
    var startMouseY = event.clientY;
    this.startFrameLeft = this.startFrameLeft || Graph._getAbsoluteLeft(this.frame.canvas);
    this.startFrameTop = this.startFrameTop || Graph._getAbsoluteTop(this.frame.canvas);

    var x = startMouseX - this.startFrameLeft;
    var y = startMouseY - this.startFrameTop;

    // check if the previously selected node is still selected
    if (this.popupNode) {
        this._checkHidePopup(x, y);
    }

    // start a timeout that will check if the mouse is positioned above
    // an element
    var me = this;
    var checkShow = function() {
        me._checkShowPopup(x, y);
    };
    if (this.popupTimer) {
        clearInterval(this.popupTimer); // stop any running timer
    }
    if (!this.leftButtonDown) {
        this.popupTimer = setTimeout(checkShow, 300);
    }
};

/**
 * Check if there is an element on the given position in the network (
 * (a node, package, or edge). If so, and if this element has a title,
 * show a popup window with its title.
 *
 * @param {number} x
 * @param {number} y
 */
Graph.prototype._checkShowPopup = function (x, y) {
    var obj = {
        "left" : this._xToCanvas(x),
        "top" : this._yToCanvas(y),
        "right" : this._xToCanvas(x),
        "bottom" : this._yToCanvas(y)
    };

    var i, len;
    var lastPopupNode = this.popupNode;

    if (this.popupNode == undefined) {
        // search the packages for overlap

        for (i = 0, len = this.packages.length; i < len; i++) {
            var p = this.packages[i];
            if (p.getTitle() != undefined && p.isOverlappingWith(obj)) {
                this.popupNode = p;
                break;
            }
        }
    }

    if (this.popupNode == undefined) {
        // search the nodes for overlap, select the top one in case of multiple nodes
        var nodes = this.nodes;
        for (i = nodes.length - 1; i >= 0; i--) {
            var node = nodes[i];
            if (node.getTitle() != undefined && node.isOverlappingWith(obj)) {
                this.popupNode = node;
                break;
            }
        }
    }

    if (this.popupNode == undefined) {
        // search the edges for overlap
        var allEdges = this.edges;
        for (i = 0, len = allEdges.length; i < len; i++) {
            var edge = allEdges[i];
            if (edge.getTitle() != undefined && edge.isOverlappingWith(obj)) {
                this.popupNode = edge;
                break;
            }
        }
    }

    if (this.popupNode) {
        // show popup message window
        if (this.popupNode != lastPopupNode) {
            var me = this;
            if (!me.popup) {
                me.popup = new Graph.Popup(me.frame);
            }

            // adjust a small offset such that the mouse cursor is located in the
            // bottom left location of the popup, and you can easily move over the
            // popup area
            me.popup.setPosition(x - 3, y - 3);
            me.popup.setText(me.popupNode.getTitle());
            me.popup.show();
        }
    }
    else {
        if (this.popup) {
            this.popup.hide();
        }
    }
};

/**
 * Check if the popup must be hided, which is the case when the mouse is no
 * longer hovering on the object
 * @param {number} x
 * @param {number} y
 */
Graph.prototype._checkHidePopup = function (x, y) {
    var obj = {
        "left" : x,
        "top" : y,
        "right" : x,
        "bottom" : y
    };

    if (!this.popupNode || !this.popupNode.isOverlappingWith(obj) ) {
        this.popupNode = undefined;
        if (this.popup) {
            this.popup.hide();
        }
    }
};

/**
 * Event handler for touchstart event on mobile devices
 */
Graph.prototype._onTouchStart = function(event) {
    Graph.preventDefault(event);

    if (this.touchDown) {
        // if already moving, return
        return;
    }
    this.touchDown = true;

    var me = this;
    if (!this.ontouchmove) {
        this.ontouchmove = function (event) {me._onTouchMove(event);};
        Graph.addEventListener(document, "touchmove", this.ontouchmove);
    }
    if (!this.ontouchend) {
        this.ontouchend   = function (event) {me._onTouchEnd(event);};
        Graph.addEventListener(document, "touchend", this.ontouchend);
    }

    this._onMouseDown(event);
};

/**
 * Event handler for touchmove event on mobile devices
 */
Graph.prototype._onTouchMove = function(event) {
    Graph.preventDefault(event);
    this._onMouseMove(event);
};

/**
 * Event handler for touchend event on mobile devices
 */
Graph.prototype._onTouchEnd = function(event) {
    Graph.preventDefault(event);

    this.touchDown = false;

    if (this.ontouchmove) {
        Graph.removeEventListener(document, "touchmove", this.ontouchmove);
        this.ontouchmove = undefined;
    }
    if (this.ontouchend) {
        Graph.removeEventListener(document, "touchend", this.ontouchend);
        this.ontouchend = undefined;
    }

    this._onMouseUp(event);
};


/**
 * Unselect selected nodes. If no selection array is provided, all nodes
 * are unselected
 * @param {Object[]} selection     Array with selection objects, each selection
 *                                 object has a parameter row. Optional
 * @param {Boolean} triggerSelect  If true (default), the select event
 *                                 is triggered when nodes are unselected
 * @return {Boolean} changed       True if the selection is changed
 */
Graph.prototype._unselectNodes = function(selection, triggerSelect) {
    var changed = false;
    var i, iMax, row;

    if (selection) {
        // remove provided selections
        for (i = 0, iMax = selection.length; i < iMax; i++) {
            row = selection[i].row;
            this.nodes[row].unselect();

            var j = 0;
            while (j < this.selection.length) {
                if (this.selection[j].row == row) {
                    this.selection.splice(j, 1);
                    changed = true;
                }
                else {
                    j++;
                }
            }
        }
    }
    else if (this.selection && this.selection.length) {
        // remove all selections
        for (i = 0, iMax = this.selection.length; i < iMax; i++) {
            row = this.selection[i].row;
            this.nodes[row].unselect();
            changed = true;
        }
        this.selection = [];
    }

    if (changed && (triggerSelect == true || triggerSelect == undefined)) {
        // fire the select event
        this.trigger('select');
    }

    return changed;
};

/**
 * select all nodes on given location x, y
 * @param {Array} selection   an array with selection objects. Each selection
 *                            object has a parameter row
 * @param {boolean} append    If true, the new selection will be appended to the
 *                            current selection (except for duplicate entries)
 * @return {Boolean} changed  True if the selection is changed
 */
Graph.prototype._selectNodes = function(selection, append) {
    var changed = false;
    var i, iMax;

    // TODO: the selectNodes method is a little messy, rework this

    // check if the current selection equals the desired selection
    var selectionAlreadyDone = true;
    if (selection.length != this.selection.length) {
        selectionAlreadyDone = false;
    }
    else {
        for (i = 0, iMax = Math.min(selection.length, this.selection.length); i < iMax; i++) {
            if (selection[i].row != this.selection[i].row) {
                selectionAlreadyDone = false;
                break;
            }
        }
    }
    if (selectionAlreadyDone) {
        return changed;
    }

    if (append == undefined || append == false) {
        // first deselect any selected node
        var triggerSelect = false;
        changed = this._unselectNodes(undefined, triggerSelect);
    }

    for (i = 0, iMax = selection.length; i < iMax; i++) {
        // add each of the new selections, but only when they are not duplicate
        var row = selection[i].row;
        var isDuplicate = false;
        for (var j = 0, jMax = this.selection.length; j < jMax; j++) {
            if (this.selection[j].row == row) {
                isDuplicate = true;
                break;
            }
        }

        if (!isDuplicate) {
            this.nodes[row].select();
            this.selection.push(selection[i]);
            changed = true;
        }
    }

    if (changed) {
        // fire the select event
        this.trigger('select');
    }

    return changed;
};

/**
 * retrieve all nodes overlapping with given object
 * @param {Object} obj  An object with parameters left, top, right, bottom
 * @return {Object[]}   An array with selection objects containing
 *                      the parameter row.
 */
Graph.prototype._getNodesOverlappingWith = function (obj) {
    var overlappingNodes = [];

    for (var i = 0; i < this.nodes.length; i++) {
        if (this.nodes[i].isOverlappingWith(obj)) {
            var sel = {"row": i};
            overlappingNodes.push(sel);
        }
    }

    return overlappingNodes;
};

/**
 * retrieve the currently selected nodes
 * @return {Object[]} an array with zero or more objects. Each object
 *                              contains the parameter row
 */
Graph.prototype.getSelection = function() {
    var selection = [];

    for (var i = 0; i < this.selection.length; i++) {
        var row = this.selection[i].row;
        selection.push({"row": row});
    }

    return selection;
};

/**
 * select zero or more nodes
 * @param {object[]} selection  an array with zero or more objects. Each object
 *                              contains the parameter row
 */
Graph.prototype.setSelection = function(selection) {
    var i, iMax, row;

    if (selection.length == undefined)
        throw "Selection must be an array with objects";

    // first unselect any selected node
    for (i = 0, iMax = this.selection.length; i < iMax; i++) {
        row = this.selection[i].row;
        this.nodes[row].unselect();
    }

    this.selection = [];

    for (i = 0, iMax = selection.length; i < iMax; i++) {
        row = selection[i].row;

        if (row == undefined)
            throw "Parameter row missing in selection object";
        if (row > this.nodes.length-1)
            throw "Parameter row out of range";

        var sel = {"row": row};
        this.selection.push(sel);
        this.nodes[row].select();
    }

    this.redraw();
};


/**
 * Temporary method to test calculating a hub value for the nodes
 * @param {number} level        Maximum number edges between two nodes in order
 *                              to call them connected. Optional, 1 by default
 * @return {Number[]} connectioncount array with the connection count
 *                                    for each node
 */
Graph.prototype._getConnectionCount = function(level) {
    var conn = this.edges;
    if (level == undefined) {
        level = 1;
    }

    // get the nodes connected to given nodes
    function getConnectedNodes(nodes) {
        var connectedNodes = [];

        for (var j = 0, jMax = nodes.length; j < jMax; j++) {
            var node = nodes[j];

            // find all nodes connected to this node
            for (var i = 0, iMax = conn.length; i < iMax; i++) {
                var other = null;

                // check if connected
                if (conn[i].from == node)
                    other = conn[i].to;
                else if (conn[i].to == node)
                    other = conn[i].from;

                // check if the other node is not already in the list with nodes
                var k, kMax;
                if (other) {
                    for (k = 0, kMax = nodes.length; k < kMax; k++) {
                        if (nodes[k] == other) {
                            other = null;
                            break;
                        }
                    }
                }
                if (other) {
                    for (k = 0, kMax = connectedNodes.length; k < kMax; k++) {
                        if (connectedNodes[k] == other) {
                            other = null;
                            break;
                        }
                    }
                }

                if (other)
                    connectedNodes.push(other);
            }
        }

        return connectedNodes;
    }

    var connections = [];
    var level0 = [];
    var nodes = this.nodes;
    var i, iMax;
    for (i = 0, iMax = nodes.length; i < iMax; i++) {
        var c = [nodes[i]];
        for (var l = 0; l < level; l++) {
            c = c.concat(getConnectedNodes(c));
        }
        connections.push(c);
    }

    var hubs = [];
    for (i = 0, len = connections.length; i < len; i++) {
        hubs.push(connections[i].length);
    }

    return hubs;
};


/**
 * Set a new size for the network
 * @param {string} width   Width in pixels or percentage (for example "800px"
 *                         or "50%")
 * @param {string} height  Height in pixels or percentage  (for example "400px"
 *                         or "30%")
 */
Graph.prototype._setSize = function(width, height) {
    this.frame.style.width = width;
    this.frame.style.height = height;

    this.frame.canvas.style.width = "100%";
    this.frame.canvas.style.height = "100%";

    this.frame.canvas.width = this.frame.canvas.clientWidth;
    this.frame.canvas.height = this.frame.canvas.clientHeight;

    if (this.slider) {
        this.slider.redraw();
    }
};

/**
 * Load all nodes by reading the data table nodesTable
 * @param {Array} nodes    The data containing the nodes.
 */
Graph.prototype.setNodes = function(nodes) {
    this.selection = [];
    this.nodes = [];
    this.hasMovingNodes = false;
    if (!nodes) {
        return;
    }
    this.nodesTable = nodes;

    var hasValues = false;
    var rowCount = nodes.length;
    for (var i = 0; i < rowCount; i++) {
        var properties = nodes[i];

        if (properties.value != undefined) {
            hasValues = true;
        }
        if (properties.timestamp) {
            this.hasTimestamps = this.hasTimestamps || properties.timestamp;
        }
        if (properties.id == undefined) {
            throw "Column 'id' missing in table with nodes (row " + i + ")";
        }
        this._createNode(properties);
    }

    // calculate scaling function when value is provided
    if (hasValues) {
        this._updateValueRange(this.nodes);
    }
};

/**
 * Filter the current nodes table for nodes with a timestamp older than given
 * timestamp.
 * @param {*} [timestamp]    If timestamp is undefined, all nodes are shown
 */
Graph.prototype._filterNodes = function(timestamp) {
    if (this.nodesTable == undefined) {
        return;
    }

    // remove existing nodes with a too new timestamp
    if (timestamp !== undefined) {
        var ns = this.nodes;
        var n = 0;
        while (n < ns.length) {
            var t = ns[n].timestamp;
            if (t !== undefined && t > timestamp) {
                // remove this node
                ns.splice(n, 1);
            }
            else {
                n++;
            }
        }
    }

    // add all nodes with an old enough timestamp
    var table = this.nodesTable;
    var rowCount = table.length;
    for (var i = 0; i < rowCount; i++) {
        // copy all properties
        var properties = table[i];

        if (properties.id === undefined) {
            throw "Column 'id' missing in table with nodes (row " + i + ")";
        }

        // check what the timestamp is
        var ts = properties.timestamp ? properties.timestamp : undefined;

        var visible = true;
        if (ts !== undefined && timestamp !== undefined && ts > timestamp) {
            visible = false;
        }

        if (visible) {
            // create or update the node
            this._createNode(properties);
        }
    }

    this.start();
};

/**
 * Create a node with the given properties
 * If the new node has an id identical to an existing package, the existing
 * node will be overwritten.
 * The properties can contain a property "action", which can have values
 * "create", "update", or "delete"
 * @param {Object} properties  An object with properties
 */
Graph.prototype._createNode = function(properties) {
    var action = properties.action ? properties.action : "update";
    var id, index, newNode, oldNode;

    if (action === "create") {
        // create the node
        newNode = new Graph.Node(properties, this.images, this.groups, this.constants);
        id = properties.id;
        index = (id !== undefined) ? this._findNode(id) : undefined;

        if (index !== undefined) {
            // replace node
            oldNode = this.nodes[index];
            this.nodes[index] = newNode;

            // remove selection of old node
            if (oldNode.selected) {
                this._unselectNodes([{'row': index}], false);
            }

            /* TODO: implement this? -> will give performance issues, searching all edges and node...
             // update edges linking to this node
             var edgesTable = this.edges;
             for (var i = 0, iMax = edgesTable.length; i < iMax; i++) {
             var edge = edgesTable[i];
             if (edge.from == oldNode) {
             edge.from = newNode;
             }
             if (edge.to == oldNode) {
             edge.to = newNode;
             }
             }

             // update packages linking to this node
             var packagesTable = this.packages;
             for (var i = 0, iMax = packagesTable.length; i < iMax; i++) {
             var package = packagesTable[i];
             if (package.from == oldNode) {
             package.from = newNode;
             }
             if (package.to == oldNode) {
             package.to = newNode;
             }
             }
             */
        }
        else {
            // add new node
            this.nodes.push(newNode);
        }

        if (!newNode.isFixed()) {
            // note: no not use node.isMoving() here, as that gives the current
            // velocity of the node, which is zero after creation of the node.
            this.hasMovingNodes = true;
        }
    }
    else if (action === "update") {
        // update existing node, or create it when not yet existing
        id = properties.id;
        if (id === undefined) {
            throw "Cannot update a node without id";
        }

        index = this._findNode(id);
        if (index !== undefined) {
            // update node
            this.nodes[index].setProperties(properties, this.constants);
        }
        else {
            // create node
            newNode = new Graph.Node(properties, this.images, this.groups, this.constants);
            this.nodes.push(newNode);

            if (!newNode.isFixed()) {
                // note: no not use node.isMoving() here, as that gives the current
                // velocity of the node, which is zero after creation of the node.
                this.hasMovingNodes = true;
            }
        }
    }
    else if (action === "delete") {
        // delete existing node
        id = properties.id;
        if (id === undefined) {
            throw "Cannot delete node without its id";
        }

        index = this._findNode(id);
        if (index !== undefined) {
            oldNode = this.nodes[index];
            // remove selection of old node
            if (oldNode.selected) {
                this._unselectNodes([{'row': index}], false);
            }
            this.nodes.splice(index, 1);
        }
        else {
            throw "Node with id " + id + " not found";
        }
    }
    else {
        throw "Unknown action " + action + ". Choose 'create', 'update', or 'delete'.";
    }
};

/**
 * Find a node by its id
 * @param {Number} id       Id of the node
 * @return {Number} index   Index of the node in the array this.nodes, or
 *                          undefined when not found. *
 */
Graph.prototype._findNode = function (id) {
    var nodes = this.nodes;
    for (var n = 0, len = nodes.length; n < len; n++) {
        if (nodes[n].id === id) {
            return n;
        }
    }

    return undefined;
};

/**
 * Find a node by its rowNumber
 * @param {Number} row                   Row number of the node
 * @return {Graph.Node} node     The node with the given row number, or
 *                                       undefined when not found.
 */
Graph.prototype._findNodeByRow = function (row) {
    return this.nodes[row];
};

/**
 * Load edges by reading the data table
 * @param {Array}      edges    The data containing the edges.
 */
Graph.prototype.setEdges = function(edges) {
    this.edges = [];
    this.hasMovingEdges = false;
    if (!edges) {
        return;
    }
    this.edgesTable = edges;

    var hasValues = false;
    var rowCount = edges.length;
    for (var i = 0; i < rowCount; i++) {
        var properties = edges[i];

        if (properties.from === undefined) {
            throw "Column 'from' missing in table with edges (row " + i + ")";
        }
        if (properties.to === undefined) {
            throw "Column 'to' missing in table with edges (row " + i + ")";
        }
        if (properties.timestamp != undefined) {
            this.hasTimestamps = this.hasTimestamps || properties.timestamp;
        }
        if (properties.value != undefined) {
            hasValues = true;
        }

        this._createEdge(properties);
    }

    // calculate scaling function when value is provided
    if (hasValues) {
        this._updateValueRange(this.edges);
    }
};

/**
 * Filter the current edges table for edges with a timestamp below given
 * timestamp.
 * @param {*} [timestamp]  If timestamp is undefined, all edges are shown
 */
Graph.prototype._filterEdges = function(timestamp) {
    if (this.edgesTable == undefined) {
        return;
    }

    // remove existing packages with a too new timestamp
    if (timestamp !== undefined) {
        var ls = this.edges;
        var l = 0;
        while (l < ls.length) {
            var t = ls[l].timestamp;
            if (t !== undefined && t > timestamp) {
                // remove this edge
                ls.splice(l, 1);
            }
            else {
                l++;
            }
        }
    }

    // add all edges with an old enough timestamp
    var table = this.edgesTable;
    var rowCount = table.length;
    for (var i = 0; i < rowCount; i++) {
        var properties = table[i];

        if (properties.from === undefined) {
            throw "Column 'from' missing in table with edges (row " + i + ")";
        }
        if (properties.to === undefined) {
            throw "Column 'to' missing in table with edges (row " + i + ")";
        }

        // check what the timestamp is
        var ts = properties.timestamp ? properties.timestamp : undefined;

        var visible = true;
        if (ts !== undefined && timestamp !== undefined && ts > timestamp) {
            visible = false;
        }

        if (visible) {
            // create or update the edge
            this._createEdge(properties);
        }
    }

    this.start();
};

/**
 * Create a edge with the given properties
 * If the new edge has an id identical to an existing edge, the existing
 * edge will be overwritten or updated.
 * The properties can contain a property "action", which can have values
 * "create", "update", or "delete"
 * @param {Object} properties   An object with properties
 */
Graph.prototype._createEdge = function(properties) {
    var action = properties.action ? properties.action : "create";
    var id, index, edge, oldEdge, newEdge;

    if (action === "create") {
        // create the edge, or replace it if already existing
        id = properties.id;
        index = (id !== undefined) ? this._findEdge(id) : undefined;
        edge = new Graph.Edge(properties, this, this.constants);

        if (index !== undefined) {
            // replace existing edge
            oldEdge = this.edges[index];
            oldEdge.from.detachEdge(oldEdge);
            oldEdge.to.detachEdge(oldEdge);
            this.edges[index] = edge;
        }
        else {
            // add new edge
            this.edges.push(edge);
        }
        edge.from.attachEdge(edge);
        edge.to.attachEdge(edge);

        if (edge.isMoving()) {
            this.hasMovingEdges = true;
        }
    }
    else if (action === "update") {
        // update existing edge, or create the edge if not existing
        id = properties.id;
        if (id === undefined) {
            throw "Cannot update a edge without id";
        }

        index = this._findEdge(id);
        if (index !== undefined) {
            // update edge
            edge = this.edges[index];
            edge.from.detachEdge(edge);
            edge.to.detachEdge(edge);

            edge.setProperties(properties, this.constants);
            edge.from.attachEdge(edge);
            edge.to.attachEdge(edge);
        }
        else {
            // add new edge
            edge = new Graph.Edge(properties, this, this.constants);
            edge.from.attachEdge(edge);
            edge.to.attachEdge(edge);
            this.edges.push(edge);
            if (edge.isMoving()) {
                this.hasMovingEdges = true;
            }
        }
    }
    else if (action === "delete") {
        // delete existing edge
        id = properties.id;
        if (id === undefined) {
            throw "Cannot delete edge without its id";
        }

        index = this._findEdge(id);
        if (index !== undefined) {
            oldEdge = this.edges[id];
            edge.from.detachEdge(oldEdge);
            edge.to.detachEdge(oldEdge);
            this.edges.splice(index, 1);
        }
        else {
            throw "Edge with id " + id + " not found";
        }
    }
    else {
        throw "Unknown action " + action + ". Choose 'create', 'update', or 'delete'.";
    }
};

/**
 * Update the edge to oldNode in all edges and packages.
 * @param {Node} oldNode
 * @param {Node} newNode
 */
// TODO: start utilizing this method _updateNodeReferences
Graph.prototype._updateNodeReferences = function(oldNode, newNode) {
    var arrays = [this.edges, this.packages];
    for (var a = 0, aMax = arrays.length; a < aMax; a++) {
        var array = arrays[a];
        for (var i = 0, iMax = array.length; i < iMax; i++) {
            if (array.from === oldNode) {
                array.from = newNode;
            }
            if (array.to === oldNode) {
                array.to = newNode;
            }
        }
    }
};

/**
 * Find a edge by its id
 * @param {Number} id       Id of the edge
 * @return {Number} index   Index of the edge in the array this.edges, or
 *                          undefined when not found. *
 */
Graph.prototype._findEdge = function (id) {
    var edges = this.edges;
    for (var n = 0, len = edges.length; n < len; n++) {
        if (edges[n].id === id) {
            return n;
        }
    }

    return undefined;
};

/**
 * Find a edge by its row
 * @param {Number} row          Row of the edge
 * @return {Graph.Edge} the found edge, or undefined when not found
 */
Graph.prototype._findEdgeByRow = function (row) {
    return this.edges[row];
};

/**
 * Set a new packages table
 * Packages with a duplicate id will be replaced
 * @param {Array}   packages    The data containing the packages.
 */
Graph.prototype.setPackages = function(packages) {
    this.packages = [];
    if (!packages) {
        return;
    }
    this.packagesTable = packages;

    var rowCount = packages.length;
    for (var i = 0; i < rowCount; i++) {
        var properties = packages[i];

        if (properties.from === undefined) {
            throw "Column 'from' missing in table with packages (row " + i + ")";
        }
        if (properties.to === undefined) {
            throw "Column 'to' missing in table with packages (row " + i + ")";
        }
        if (properties.timestamp) {
            this.hasTimestamps = this.hasTimestamps || properties.timestamp;
        }

        this._createPackage(properties);
    }

    // calculate scaling function when value is provided
    this._updateValueRange(this.packages);

    /* TODO: adjust examples and documentation for this?
     this.start();
     */
};

/**
 * Filter the current package table for packages with a timestamp below given
 * timestamp.
 * @param {*} [timestamp] If timestamp is undefined, all packages are shown
 */
Graph.prototype._filterPackages = function(timestamp) {
    if (this.packagesTable == undefined) {
        return;
    }

    // remove all current packages
    this.packages = [];

    /* TODO: cleanup
     // remove existing packages with a too new timestamp
     if (timestamp !== undefined) {
     var packages = this.packages;
     var p = 0;
     while (p < packages.length) {
     var package = packages[p];
     var t = package.timestamp;

     if (t !== undefined &&  t > timestamp ) {
     // remove this package
     packages.splice(p, 1);
     }
     else {
     p++;
     }
     }
     }
     */

    // add all packages with an old enough timestamp
    var table = this.packagesTable;
    var rowCount = table.length;
    for (var i = 0; i < rowCount; i++) {
        var properties = table[i];

        if (properties.from === undefined) {
            throw "Column 'from' missing in table with packages (row " + i + ")";
        }
        if (properties.to === undefined) {
            throw "Column 'to' missing in table with packages (row " + i + ")";
        }
        // check what the timestamp is
        var pTimestamp = properties.timestamp ? properties.timestamp : undefined;

        var visible = true;
        if (pTimestamp !== undefined && timestamp !== undefined && pTimestamp > timestamp) {
            visible = false;
        }

        if (visible === true) {
            if (properties.progress == undefined) {
                // when no progress is provided, we need to add our own progress
                var duration = properties.duration || this.constants.packages.duration; // seconds

                var diff = (timestamp.getTime() - pTimestamp.getTime()) / 1000; // seconds
                if (diff < duration) {
                    // copy the properties, and fill in the current progress based on the
                    // timestamp and the duration
                    var original = properties;
                    properties = {};
                    for (var j in original) {
                        if (original.hasOwnProperty(j)) {
                            properties[j] = original[j];
                        }
                    }

                    properties.progress = diff / duration;  // scale 0-1
                }
                else {
                    visible = false;
                }
            }
        }

        if (visible === true) {
            // create or update the package
            this._createPackage(properties);
        }
    }

    this.start();
};

/**
 * Create a package with the given properties
 * If the new package has an id identical to an existing package, the existing
 * package will be overwritten.
 * The properties can contain a property "action", which can have values
 * "create", "update", or "delete"
 * @param {Object} properties   An object with properties
 */
Graph.prototype._createPackage = function(properties) {
    var action = properties.action ? properties.action : "create";
    var id, index, newPackage;

    if (action === "create") {
        // create the package
        id = properties.id;
        index = (id !== undefined) ? this._findPackage(id) : undefined;
        newPackage = new Graph.Package(properties, this, this.images, this.constants);

        if (index !== undefined) {
            // replace existing package
            this.packages[index] = newPackage;
        }
        else {
            // add new package
            this.packages.push(newPackage);
        }

        if (newPackage.isMoving()) {
            this.hasMovingPackages = true;
        }
    }
    else if (action === "update") {
        // update a package, or create it when not existing
        id = properties.id;
        if (id === undefined) {
            throw "Cannot update a edge without id";
        }

        index = this._findPackage(id);
        if (index !== undefined) {
            // update existing package
            this.packages[index].setProperties(properties, this.constants);
        }
        else {
            // add new package
            newPackage = new Graph.Package(properties, this, this.images, this.constants);
            this.packages.push(newPackage);
            if (newPackage.isMoving()) {
                this.hasMovingPackages = true;
            }
        }
    }
    else if (action === "delete") {
        // delete existing package
        id = properties.id;
        if (id === undefined) {
            throw "Cannot delete package without its id";
        }

        index = this._findPackage(id);
        if (index !== undefined) {
            this.packages.splice(index, 1);
        }
        else {
            throw "Package with id " + id + " not found";
        }
    }
    else {
        throw "Unknown action " + action + ". Choose 'create', 'update', or 'delete'.";
    }
};

/**
 * Find a package by its id.
 * @param {Number} id
 * @return {Number} index    Index of the package in the array this.packages,
 *                           or undefined when not found
 */
Graph.prototype._findPackage = function (id) {
    var packages = this.packages;
    for (var n = 0, len = packages.length; n < len; n++) {
        if (packages[n].id === id) {
            return n;
        }
    }

    return undefined;
};

/**
 * Find a package by its row
 * @param {Number} row          Row of the package
 * @return {Graph.Package} the found package, or undefined when not found
 */
Graph.prototype._findPackageByRow = function (row) {
    return this.packages[row];
};

/**
 * Update the values of all object in the given array according to the current
 * value range of the objects in the array.
 * @param {Array} array.  An array with objects like Edges, Nodes, or Packages
 *                        The objects must have a method getValue() and
 *                        setValueRange(min, max).
 */
Graph.prototype._updateValueRange = function(array) {
    var count = array.length;
    var i;

    // determine the range of the node values
    var valueMin = undefined;
    var valueMax = undefined;
    for (i = 0; i < count; i++) {
        var value = array[i].getValue();
        if (value !== undefined) {
            valueMin = (valueMin === undefined) ? value : Math.min(value, valueMin);
            valueMax = (valueMax === undefined) ? value : Math.max(value, valueMax);
        }
    }

    // adjust the range of all nodes
    if (valueMin !== undefined && valueMax !== undefined) {
        for (i = 0; i < count; i++) {
            array[i].setValueRange(valueMin, valueMax);
        }
    }
};


/**
 * Set the current timestamp. All packages with a timestamp smaller or equal
 * than the given timestamp will be drawn.
 * @param {Date | Number} timestamp
 */
Graph.prototype.setTimestamp = function(timestamp) {
    this._filterNodes(timestamp);
    this._filterEdges(timestamp);
    this._filterPackages(timestamp);
};


/**
 * Get the range of all timestamps defined in the nodes, edges and packages
 * @return {Object}   A range object, containing parameters start and end.
 */
Graph.prototype._getRange = function() {
    // range is stored as number. at the end of the method, it is converted to
    // Date when needed.
    var range = {
        "start": undefined,
        "end": undefined
    };

    var tables = [this.nodesTable, this.edgesTable];
    for (var t = 0, tMax = tables.length; t < tMax; t++) {
        var table = tables[t];

        if (table !== undefined) {
            for (var i = 0, iMax = table.length; i < iMax; i++) {
                var timestamp = table[i].timestamp;
                if (timestamp) {
                    // to long
                    if (timestamp instanceof Date) {
                        timestamp = timestamp.getTime();
                    }

                    // calculate new range
                    range.start = range.start ? Math.min(timestamp, range.start) : timestamp;
                    range.end = range.end ? Math.max(timestamp, range.end) : timestamp;
                }
            }
        }
    }

    // calculate the range for the packagesTable by hand. In case of packages
    // without a progress provided, we need to calculate the end time by hand.
    if (this.packagesTable) {
        var packagesTable = this.packagesTable;
        for (var row = 0, len = packagesTable.length; row < len; row ++) {
            var pkg = packagesTable[row],
                timestamp = pkg.timestamp,
                progress = pkg.progress,
                duration = pkg.duration || this.constants.packages.duration;

            // convert to number
            if (timestamp instanceof Date) {
                timestamp = timestamp.getTime();
            }

            if (timestamp != undefined) {
                var start = timestamp,
                    end = progress ? timestamp : (timestamp + duration * 1000);

                range.start = range.start ? Math.min(start, range.start) : start;
                range.end = range.end ? Math.max(end, range.end) : end;
            }
        }
    }

    // convert to the right type: number or date
    var rangeFormat = {
        "start": new Date(range.start),
        "end": new Date(range.end)
    };

    return rangeFormat;
};

/**
 * Start animation.
 * Only applicable when packages with a timestamp are available
 */
Graph.prototype.animationStart = function() {
    if (this.slider) {
        this.slider.play();
    }
};

/**
 * Start animation.
 * Only applicable when packages with a timestamp are available
 */
Graph.prototype.animationStop = function() {
    if (this.slider) {
        this.slider.stop();
    }
};

/**
 * Set framerate for the animation.
 * Only applicable when packages with a timestamp are available
 * @param {number} framerate    The framerate in frames per second
 */
Graph.prototype.setAnimationFramerate = function(framerate) {
    if (this.slider) {
        this.slider.setFramerate(framerate);
    }
}

/**
 * Set the duration of playing the whole package history
 * Only applicable when packages with a timestamp are available
 * @param {number} duration    The duration in seconds
 */
Graph.prototype.setAnimationDuration = function(duration) {
    if (this.slider) {
        this.slider.setDuration(duration);
    }
};

/**
 * Set the time acceleration for playing the history.
 * Only applicable when packages with a timestamp are available
 * @param {number} acceleration    Acceleration, for example 10 means play
 *                                 ten times as fast as real time. A value
 *                                 of 1 will play the history in real time.
 */
Graph.prototype.setAnimationAcceleration = function(acceleration) {
    if (this.slider) {
        this.slider.setAcceleration(acceleration);
    }
};

/**
 * Redraw the graph with the current data
 * chart will be resized too.
 */
Graph.prototype.redraw = function() {
    this._setSize(this.width, this.height);

    this._redraw();
};

/**
 * Redraw the graph with the current data
 */
Graph.prototype._redraw = function() {
    var ctx = this.frame.canvas.getContext("2d");

    // clear the canvas
    var w = this.frame.canvas.width;
    var h = this.frame.canvas.height;
    ctx.clearRect(0, 0, w, h);

    // set scaling and translation
    ctx.save();
    ctx.translate(this.translation.x, this.translation.y);
    ctx.scale(this.scale, this.scale);

    this._drawEdges(ctx);
    this._drawNodes(ctx);
    this._drawPackages(ctx);
    this._drawSlider();

    // restore original scaling and translation
    ctx.restore();
};

/**
 * Set the translation of the graph
 * @param {Number} offsetX    Horizontal offset
 * @param {Number} offsetY    Vertical offset
 */
Graph.prototype._setTranslation = function(offsetX, offsetY) {
    if (this.translation === undefined) {
        this.translation = {
            "x": 0,
            "y": 0
        };
    }

    if (offsetX !== undefined) {
        this.translation.x = offsetX;
    }
    if (offsetY !== undefined) {
        this.translation.y = offsetY;
    }
};

/**
 * Get the translation of the graph
 * @return {Object} translation    An object with parameters x and y, both a number
 */
Graph.prototype._getTranslation = function() {
    return {
        "x": this.translation.x,
        "y": this.translation.y
    };
};

/**
 * Scale the graph
 * @param {Number} scale   Scaling factor 1.0 is unscaled
 */
Graph.prototype._setScale = function(scale) {
    this.scale = scale;
};
/**
 * Get the current scale of  the graph
 * @return {Number} scale   Scaling factor 1.0 is unscaled
 */
Graph.prototype._getScale = function() {
    return this.scale;
};

Graph.prototype._xToCanvas = function(x) {
    return (x - this.translation.x) / this.scale;
};

Graph.prototype._canvasToX = function(x) {
    return x * this.scale + this.translation.x;
};

Graph.prototype._yToCanvas = function(y) {
    return (y - this.translation.y) / this.scale;
};

Graph.prototype._canvasToY = function(y) {
    return y * this.scale + this.translation.y ;
};



/**
 * Get a node by its id
 * @param {number} id
 * @return {Node}  node, or null if not found
 */
Graph.prototype._getNode = function(id) {
    for (var i = 0; i < this.nodes.length; i++) {
        if (this.nodes[i].id == id)
            return this.nodes[i];
    }

    return null;
};

/**
 * Redraw all nodes
 * The 2d context of a HTML canvas can be retrieved by canvas.getContext("2d");
 * @param {CanvasRenderingContext2D}   ctx
 */
Graph.prototype._drawNodes = function(ctx) {
    // first draw the unselected nodes
    var nodes = this.nodes;
    var selected = [];
    for (var i = 0, iMax = nodes.length; i < iMax; i++) {
        if (nodes[i].isSelected()) {
            selected.push(i);
        }
        else {
            nodes[i].draw(ctx);
        }
    }

    // draw the selected nodes on top
    for (var s = 0, sMax = selected.length; s < sMax; s++) {
        nodes[selected[s]].draw(ctx);
    }
};

/**
 * Redraw all edges
 * The 2d context of a HTML canvas can be retrieved by canvas.getContext("2d");
 * @param {CanvasRenderingContext2D}   ctx
 */
Graph.prototype._drawEdges = function(ctx) {
    var edges = this.edges;
    for (var i = 0, iMax = edges.length; i < iMax; i++) {
        edges[i].draw(ctx);
    }
};

/**
 * Redraw all packages
 * The 2d context of a HTML canvas can be retrieved by canvas.getContext("2d");
 * @param {CanvasRenderingContext2D}   ctx
 */
Graph.prototype._drawPackages = function(ctx) {
    var packages = this.packages;
    for (var i = 0, iMax = packages.length; i < iMax; i++) {
        packages[i].draw(ctx);
    }
};


/**
 * Redraw the filter
 */
Graph.prototype._drawSlider = function() {
    var sliderNode;
    if (this.hasTimestamps) {
        sliderNode = this.frame.slider;
        if (sliderNode === undefined) {
            sliderNode = document.createElement( "div" );
            sliderNode.style.position = "absolute";
            sliderNode.style.bottom = "0px";
            sliderNode.style.left = "0px";
            sliderNode.style.right = "0px";
            sliderNode.style.backgroundColor = "rgba(255, 255, 255, 0.7)";

            this.frame.slider = sliderNode;
            this.frame.slider.style.padding = "10px";
            //this.frame.filter.style.backgroundColor = "#EFEFEF";
            this.frame.appendChild(sliderNode);


            var range = this._getRange();
            this.slider = new Graph.Slider(sliderNode);
            this.slider.setLoop(false);
            this.slider.setRange(range.start, range.end);

            // create an event handler
            var me = this;
            var onchange = function () {
                var timestamp = me.slider.getValue();
                me.setTimestamp(timestamp);
                // TODO: do only a redraw when the graph is not still moving
                me.redraw();
            };
            this.slider.setOnChangeCallback(onchange);
            onchange(); // perform the first update by hand.
        }
    }
    else {
        sliderNode = this.frame.slider;
        if (sliderNode !== undefined) {
            this.frame.removeChild(sliderNode);
            this.frame.slider = undefined;
            this.slider = undefined;
        }
    }
};

/**
 * Recalculate the best positions for all nodes
 */
Graph.prototype._reposition = function() {
    // TODO: implement function reposition


    /*
     var w = this.frame.canvas.clientWidth;
     var h = this.frame.canvas.clientHeight;
     for (var i = 0; i < this.nodes.length; i++) {
     if (!this.nodes[i].xFixed) this.nodes[i].x = w * Math.random();
     if (!this.nodes[i].yFixed) this.nodes[i].y = h * Math.random();
     }
     //*/

    //*
    // TODO
    var radius = this.constants.edges.length * 2;
    var cx =  this.frame.canvas.clientWidth / 2;
    var cy =  this.frame.canvas.clientHeight / 2;
    for (var i = 0; i < this.nodes.length; i++) {
        var angle = 2*Math.PI * (i / this.nodes.length);

        if (!this.nodes[i].xFixed) this.nodes[i].x = cx + radius * Math.cos(angle);
        if (!this.nodes[i].yFixed) this.nodes[i].y = cy + radius * Math.sin(angle);

    }
    //*/

    /*
     // TODO
     var radius = this.constants.edges.length * 2;
     var w = this.frame.canvas.clientWidth,
     h = this.frame.canvas.clientHeight;
     var cx =  this.frame.canvas.clientWidth / 2;
     var cy =  this.frame.canvas.clientHeight / 2;
     var s = Math.sqrt(this.nodes.length);
     for (var i = 0; i < this.nodes.length; i++) {
     //var angle = 2*Math.PI * (i / this.nodes.length);

     if (!this.nodes[i].xFixed) this.nodes[i].x = w/s * (i % s);
     if (!this.nodes[i].yFixed) this.nodes[i].y = h/s * (i / s);
     }
     //*/


    /*
     var cx =  this.frame.canvas.clientWidth / 2;
     var cy =  this.frame.canvas.clientHeight / 2;
     for (var i = 0; i < this.nodes.length; i++) {
     this.nodes[i].x = cx;
     this.nodes[i].y = cy;
     }

     //*/

};


/**
 * Find a stable position for all nodes
 */
Graph.prototype._doStabilize = function() {
    var start = new Date();

    // find stable position
    var count = 0;
    var vmin = this.constants.minVelocity;
    var stable = false;
    while (!stable && count < this.constants.maxIterations) {
        this._calculateForces();
        this._discreteStepNodes();
        stable = !this.isMoving(vmin);
        count++;
    }

    var end = new Date();

    //console.log("Stabilized in " + (end-start) + " ms, " + count + " iterations" ); // TODO: cleanup
};

/**
 * Calculate the external forces acting on the nodes
 * Forces are caused by: edges, repulsing forces between nodes, gravity
 */
Graph.prototype._calculateForces = function(nodeId) {
    // create a local edge to the nodes and edges, that is faster
    var nodes = this.nodes,
        edges = this.edges;

    // gravity, add a small constant force to pull the nodes towards the center of
    // the graph
    // Also, the forces are reset to zero in this loop by using _setForce instead
    // of _addForce
    var gravity = 0.01,
        gx = this.frame.canvas.clientWidth / 2,
        gy = this.frame.canvas.clientHeight / 2;
    for (var n = 0; n < nodes.length; n++) {
        var dx = gx - nodes[n].x,
            dy = gy - nodes[n].y,
            angle = Math.atan2(dy, dx),
            fx = Math.cos(angle) * gravity,
            fy = Math.sin(angle) * gravity;

        this.nodes[n]._setForce(fx, fy);
    }

    // repulsing forces between nodes
    var minimumDistance = this.constants.nodes.distance,
        steepness = 10; // higher value gives steeper slope of the force around the given minimumDistance
    for (var n = 0; n < nodes.length; n++) {
        for (var n2 = n + 1; n2 < this.nodes.length; n2++) {
            //var dmin = (nodes[n].width + nodes[n].height + nodes[n2].width + nodes[n2].height) / 1 || minimumDistance, // TODO: dmin
            //var dmin = (nodes[n].width + nodes[n2].width)/2  || minimumDistance, // TODO: dmin
            //dmin = 40 + ((nodes[n].width/2 + nodes[n2].width/2) || 0),

            // calculate normally distributed force
            var dx = nodes[n2].x - nodes[n].x,
                dy = nodes[n2].y - nodes[n].y,
                distance = Math.sqrt(dx * dx + dy * dy),
                angle = Math.atan2(dy, dx),

            // TODO: correct factor for repulsing force
            //var repulsingforce = 2 * Math.exp(-5 * (distance * distance) / (dmin * dmin) ); // TODO: customize the repulsing force
            //repulsingforce = Math.exp(-1 * (distance * distance) / (dmin * dmin) ), // TODO: customize the repulsing force
                repulsingforce = 1 / (1 + Math.exp((distance / minimumDistance - 1) * steepness)), // TODO: customize the repulsing force
                fx = Math.cos(angle) * repulsingforce,
                fy = Math.sin(angle) * repulsingforce;

            this.nodes[n]._addForce(-fx, -fy);
            this.nodes[n2]._addForce(fx, fy);
        }
        /* TODO: re-implement repulsion of edges
         for (var l = 0; l < edges.length; l++) {
         var lx = edges[l].from.x+(edges[l].to.x - edges[l].from.x)/2,
         ly = edges[l].from.y+(edges[l].to.y - edges[l].from.y)/2,

         // calculate normally distributed force
         dx = nodes[n].x - lx,
         dy = nodes[n].y - ly,
         distance = Math.sqrt(dx * dx + dy * dy),
         angle = Math.atan2(dy, dx),


         // TODO: correct factor for repulsing force
         //var repulsingforce = 2 * Math.exp(-5 * (distance * distance) / (dmin * dmin) ); // TODO: customize the repulsing force
         //repulsingforce = Math.exp(-1 * (distance * distance) / (dmin * dmin) ), // TODO: customize the repulsing force
         repulsingforce = 1 / (1 + Math.exp((distance / (minimumDistance / 2) - 1) * steepness)), // TODO: customize the repulsing force
         fx = Math.cos(angle) * repulsingforce,
         fy = Math.sin(angle) * repulsingforce;
         nodes[n]._addForce(fx, fy);
         edges[l].from._addForce(-fx/2,-fy/2);
         edges[l].to._addForce(-fx/2,-fy/2);
         }
         */
    }

    // forces caused by the edges, modelled as springs
    for (var l = 0, lMax = edges.length; l < lMax; l++) {
        var edge = edges[l],

            dx = (edge.to.x - edge.from.x),
            dy = (edge.to.y - edge.from.y),
        //edgeLength = (edge.from.width + edge.from.height + edge.to.width + edge.to.height)/2 || edge.length, // TODO: dmin
        //edgeLength = (edge.from.width + edge.to.width)/2 || edge.length, // TODO: dmin
        //edgeLength = 20 + ((edge.from.width + edge.to.width) || 0) / 2,
            edgeLength = edge.length,
            length =  Math.sqrt(dx * dx + dy * dy),
            angle = Math.atan2(dy, dx),

            springforce = edge.stiffness * (edgeLength - length),

            fx = Math.cos(angle) * springforce,
            fy = Math.sin(angle) * springforce;

        edge.from._addForce(-fx, -fy);
        edge.to._addForce(fx, fy);
    }

    /* TODO: re-implement repulsion of edges
     // repulsing forces between edges
     var minimumDistance = this.constants.edges.distance,
     steepness = 10; // higher value gives steeper slope of the force around the given minimumDistance
     for (var l = 0; l < edges.length; l++) {
     //Keep distance from other edge centers
     for (var l2 = l + 1; l2 < this.edges.length; l2++) {
     //var dmin = (nodes[n].width + nodes[n].height + nodes[n2].width + nodes[n2].height) / 1 || minimumDistance, // TODO: dmin
     //var dmin = (nodes[n].width + nodes[n2].width)/2  || minimumDistance, // TODO: dmin
     //dmin = 40 + ((nodes[n].width/2 + nodes[n2].width/2) || 0),
     var lx = edges[l].from.x+(edges[l].to.x - edges[l].from.x)/2,
     ly = edges[l].from.y+(edges[l].to.y - edges[l].from.y)/2,
     l2x = edges[l2].from.x+(edges[l2].to.x - edges[l2].from.x)/2,
     l2y = edges[l2].from.y+(edges[l2].to.y - edges[l2].from.y)/2,

     // calculate normally distributed force
     dx = l2x - lx,
     dy = l2y - ly,
     distance = Math.sqrt(dx * dx + dy * dy),
     angle = Math.atan2(dy, dx),


     // TODO: correct factor for repulsing force
     //var repulsingforce = 2 * Math.exp(-5 * (distance * distance) / (dmin * dmin) ); // TODO: customize the repulsing force
     //repulsingforce = Math.exp(-1 * (distance * distance) / (dmin * dmin) ), // TODO: customize the repulsing force
     repulsingforce = 1 / (1 + Math.exp((distance / minimumDistance - 1) * steepness)), // TODO: customize the repulsing force
     fx = Math.cos(angle) * repulsingforce,
     fy = Math.sin(angle) * repulsingforce;

     edges[l].from._addForce(-fx, -fy);
     edges[l].to._addForce(-fx, -fy);
     edges[l2].from._addForce(fx, fy);
     edges[l2].to._addForce(fx, fy);
     }
     }
     */
};


/**
 * Check if any of the nodes is still moving
 * @param {number} vmin   the minimum velocity considered as "moving"
 * @return {boolean}      true if moving, false if non of the nodes is moving
 */
Graph.prototype.isMoving = function(vmin) {
    // TODO: ismoving does not work well: should check the kinetic energy, not its velocity
    var nodes = this.nodes;
    for (var n = 0, nMax = nodes.length; n < nMax; n++) {
        if (nodes[n].isMoving(vmin)) {
            return true;
        }
    }
    return false;
};


/**
 * Perform one discrete step for all nodes
 */
Graph.prototype._discreteStepNodes = function() {
    var interval = this.refreshRate / 1000.0; // in seconds
    var nodes = this.nodes;
    for (var n = 0, nMax = nodes.length; n < nMax; n++) {
        nodes[n].discreteStep(interval);
    }
};


/**
 * Perform one discrete step for all packages
 */
Graph.prototype._discreteStepPackages = function() {
    var interval = this.refreshRate / 1000.0; // in seconds
    var packages = this.packages;
    for (var n = 0, nMax = packages.length; n < nMax; n++) {
        packages[n].discreteStep(interval);
    }
};


/**
 * Cleanup finished packages.
 * also checks if there are moving packages
 */
Graph.prototype._deleteFinishedPackages = function() {
    var n = 0;
    var hasMovingPackages = false;
    while (n < this.packages.length) {
        if (this.packages[n].isFinished()) {
            this.packages.splice(n, 1);
            n--;
        }
        else if (this.packages[n].isMoving()) {
            hasMovingPackages = true;
        }
        n++;
    }

    this.hasMovingPackages = hasMovingPackages;
};

/**
 * Start animating nodes, edges, and packages.
 */
Graph.prototype.start = function() {
    if (this.hasMovingNodes) {
        this._calculateForces();
        this._discreteStepNodes();

        var vmin = this.constants.minVelocity;
        this.hasMovingNodes = this.isMoving(vmin);
    }

    if (this.hasMovingPackages) {
        this._discreteStepPackages();
        this._deleteFinishedPackages();
    }

    if (this.hasMovingNodes || this.hasMovingEdges || this.hasMovingPackages) {
        // start animation. only start timer if it is not already running
        if (!this.timer) {
            var graph = this;
            this.timer = window.setTimeout(function () {
                graph.timer = undefined;
                graph.start();
                graph._redraw();
            }, this.refreshRate);
        }
    }
    else {
        this._redraw();
    }
};

/**
 * Stop animating nodes, edges, and packages.
 */
Graph.prototype.stop = function () {
    if (this.timer) {
        window.clearInterval(this.timer);
        this.timer = undefined;
    }
};



/**--------------------------------------------------------------------------**/


/**
 * Add and event listener. Works for all browsers
 * @param {Element}     element    An html element
 * @param {String}      action     The action, for example "click",
 *                                 without the prefix "on"
 * @param {function}    listener   The callback function to be executed
 * @param {boolean}     useCapture
 */
Graph.addEventListener = function (element, action, listener, useCapture) {
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
 * @param {Element}  element   An html dom element
 * @param {string}       action    The name of the event, for example "mousedown"
 * @param {function}     listener  The listener function
 * @param {boolean}      useCapture
 */
Graph.removeEventListener = function(element, action, listener, useCapture) {
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
Graph.stopPropagation = function (event) {
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
Graph.preventDefault = function (event) {
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
Graph._getAbsoluteLeft = function(elem) {
    var left = 0;
    while( elem != null ) {
        left += elem.offsetLeft;
        left -= elem.scrollLeft;
        elem = elem.offsetParent;
    }
    if (!document.body.scrollLeft && window.pageXOffset) {
        // FF
        left -= window.pageXOffset;
    }
    return left;
};

/**
 * Retrieve the absolute top value of a DOM element
 * @param {Element} elem    A dom element, for example a div
 * @return {number} top         The absolute top position of this element
 *                              in the browser page.
 */
Graph._getAbsoluteTop = function(elem) {
    var top = 0;
    while( elem != null ) {
        top += elem.offsetTop;
        top -= elem.scrollTop;
        elem = elem.offsetParent;
    }
    if (!document.body.scrollTop && window.pageYOffset) {
        // FF
        top -= window.pageYOffset;
    }
    return top;
};



/**--------------------------------------------------------------------------**/


/**
 * @class Node
 * A node. A node can be connected to other nodes via one or multiple edges.
 * @param {object} properties An object containing properties for the node. All
 *                            properties are optional, except for the id.
 *                              {number} id     Id of the node. Required
 *                              {string} text   Title for the node
 *                              {number} x      Horizontal position of the node
 *                              {number} y      Vertical position of the node
 *                              {string} style  Drawing style, available:
 *                                              "database", "circle", "rect",
 *                                              "image", "text", "dot", "star",
 *                                              "triangle", "triangleDown",
 *                                              "square"
 *                              {string} image  An image url
 *                              {string} title  An title text, can be HTML
 *                              {anytype} group A group name or number
 * @param {Graph.Images} imagelist    A list with images. Only needed
 *                                            when the node has an image
 * @param {Graph.Groups} grouplist    A list with groups. Needed for
 *                                            retrieving group properties
 * @param {Object}               constants    An object with default values for
 *                                            example for the color
 */
Graph.Node = function (properties, imagelist, grouplist, constants) {
    this.selected = false;

    this.edges = []; // all edges connected to this node
    this.group = constants.nodes.group;

    this.fontSize = constants.nodes.fontSize;
    this.fontFace = constants.nodes.fontFace;
    this.fontColor = constants.nodes.fontColor;

    this.borderColor = constants.nodes.borderColor;
    this.backgroundColor = constants.nodes.backgroundColor;
    this.highlightColor = constants.nodes.highlightColor;

    // set defaults for the properties
    this.id = undefined;
    this.style = constants.nodes.style;
    this.image = constants.nodes.image;
    this.x = 0;
    this.y = 0;
    this.xFixed = false;
    this.yFixed = false;
    this.radius = constants.nodes.radius;
    this.radiusFixed = false;
    this.radiusMin = constants.nodes.radiusMin;
    this.radiusMax = constants.nodes.radiusMax;

    this.imagelist = imagelist;
    this.grouplist = grouplist;

    this.setProperties(properties, constants);

    // mass, force, velocity
    this.mass = 50;  // kg (mass is adjusted for the number of connected edges)
    this.fx = 0.0;  // external force x
    this.fy = 0.0;  // external force y
    this.vx = 0.0;  // velocity x
    this.vy = 0.0;  // velocity y
    this.minForce = constants.minForce;
    this.damping = 0.9; // damping factor
};

/**
 * Attach a edge to the node
 * @param {Graph.Edge} edge
 */
Graph.Node.prototype.attachEdge = function(edge) {
    this.edges.push(edge);
    this._updateMass();
};

/**
 * Detach a edge from the node
 * @param {Graph.Edge} edge
 */
Graph.Node.prototype.detachEdge = function(edge) {
    var index = this.edges.indexOf(edge);
    if (index != -1) {
        this.edges.splice(index, 1);
    }
    this._updateMass();
};

/**
 * Update the nodes mass, which is determined by the number of edges connecting
 * to it (more edges -> heavier node).
 * @private
 */
Graph.Node.prototype._updateMass = function() {
    this.mass = 50 + 20 * this.edges.length; // kg
};

/**
 * Set or overwrite properties for the node
 * @param {Object} properties an object with properties
 * @param {Object} constants  and object with default, global properties
 */
Graph.Node.prototype.setProperties = function(properties, constants) {
    if (!properties) {
        return;
    }

    // basic properties
    if (properties.id != undefined)        {this.id = properties.id;}
    if (properties.text != undefined)      {this.text = properties.text;}
    if (properties.title != undefined)     {this.title = properties.title;}
    if (properties.group != undefined)     {this.group = properties.group;}
    if (properties.x != undefined)         {this.x = properties.x;}
    if (properties.y != undefined)         {this.y = properties.y;}
    if (properties.value != undefined)     {this.value = properties.value;}
    if (properties.timestamp != undefined) {this.timestamp = properties.timestamp;}

    if (this.id === undefined) {
        throw "Node must have an id";
    }

    // copy group properties
    if (this.group) {
        var groupObj = this.grouplist.get(this.group);
        for (var prop in groupObj) {
            if (groupObj.hasOwnProperty(prop)) {
                this[prop] = groupObj[prop];
            }
        }
    }

    // individual style properties
    if (properties.style != undefined)          {this.style = properties.style;}
    if (properties.image != undefined)          {this.image = properties.image;}
    if (properties.radius != undefined)         {this.radius = properties.radius;}
    if (properties.borderColor != undefined)    {this.borderColor = properties.borderColor;}
    if (properties.backgroundColor != undefined){this.backgroundColor = properties.backgroundColor;}
    if (properties.highlightColor != undefined) {this.highlightColor = properties.highlightColor;}
    if (properties.fontColor != undefined)      {this.fontColor = properties.fontColor;}
    if (properties.fontSize != undefined)       {this.fontSize = properties.fontSize;}
    if (properties.fontFace != undefined)       {this.fontFace = properties.fontFace;}


    if (this.image != undefined) {
        if (this.imagelist) {
            this.imageObj = this.imagelist.load(this.image);
        }
        else {
            throw "No imagelist provided";
        }
    }

    this.xFixed = this.xFixed || (properties.x != undefined);
    this.yFixed = this.yFixed || (properties.y != undefined);
    this.radiusFixed = this.radiusFixed || (properties.radius != undefined);

    if (this.style == 'image') {
        this.radiusMin = constants.nodes.widthMin;
        this.radiusMax = constants.nodes.widthMax;
    }

    // choose draw method depending on the style
    var style = this.style;
    switch (style) {
        case 'database':      this.draw = this._drawDatabase; this.resize = this._resizeDatabase; break;
        case 'rect':          this.draw = this._drawRect; this.resize = this._resizeRect; break;
        case 'circle':        this.draw = this._drawCircle; this.resize = this._resizeCircle; break;
        // TODO: add ellipse shape
        // TODO: add diamond shape
        case 'image':         this.draw = this._drawImage; this.resize = this._resizeImage; break;
        case 'text':          this.draw = this._drawText; this.resize = this._resizeText; break;
        case 'dot':           this.draw = this._drawDot; this.resize = this._resizeShape; break;
        case 'square':        this.draw = this._drawSquare; this.resize = this._resizeShape; break;
        case 'triangle':      this.draw = this._drawTriangle; this.resize = this._resizeShape; break;
        case 'triangleDown':  this.draw = this._drawTriangleDown; this.resize = this._resizeShape; break;
        case 'star':          this.draw = this._drawStar; this.resize = this._resizeShape; break;
        default:              this.draw = this._drawRect; this.resize = this._resizeRect; break;
    }

    // reset the size of the node, this can be changed
    this._reset();
};

/**
 * select this node
 */
Graph.Node.prototype.select = function() {
    this.selected = true;
    this._reset();
};

/**
 * unselect this node
 */
Graph.Node.prototype.unselect = function() {
    this.selected = false;
    this._reset();
};

/**
 * Reset the calculated size of the node, forces it to recalculate its size
 */
Graph.Node.prototype._reset = function() {
    this.width = undefined;
    this.height = undefined;
};

/**
 * get the title of this node.
 * @return {string} title    The title of the node, or undefined when no title
 *                           has been set.
 */
Graph.Node.prototype.getTitle = function() {
    return this.title;
};

/**
 * Calculate the distance to the border of the Node
 * @param {CanvasRenderingContext2D}   ctx
 * @param {Number} angle        Angle in radians
 * @returns {number} distance   Distance to the border in pixels
 */
Graph.Node.prototype.distanceToBorder = function (ctx, angle) {
    var borderWidth = 1;

    if (!this.width) {
        this.resize(ctx);
    }

    //noinspection FallthroughInSwitchStatementJS
    switch (this.style) {
        case 'circle':
        case 'dot':
            return this.radius + borderWidth;

        // TODO: implement distanceToBorder for database
        // TODO: implement distanceToBorder for triangle
        // TODO: implement distanceToBorder for triangleDown

        case 'rect':
        case 'image':
        case 'text':
        default:
            if (this.width) {
                return Math.min(
                    Math.abs(this.width / 2 / Math.cos(angle)),
                    Math.abs(this.height / 2 / Math.sin(angle))) + borderWidth;
                // TODO: reckon with border radius too in case of rect
            }
            else {
                return 0;
            }

    }

    // TODO: implement calculation of distance to border for all shapes
};

/**
 * Set forces acting on the node
 * @param {number} fx   Force in horizontal direction
 * @param {number} fy   Force in vertical direction
 */
Graph.Node.prototype._setForce = function(fx, fy) {
    this.fx = fx;
    this.fy = fy;
};

/**
 * Add forces acting on the node
 * @param {number} fx   Force in horizontal direction
 * @param {number} fy   Force in vertical direction
 */
Graph.Node.prototype._addForce = function(fx, fy) {
    this.fx += fx;
    this.fy += fy;
};

/**
 * Perform one discrete step for the node
 * @param {number} interval    Time interval in seconds
 */
Graph.Node.prototype.discreteStep = function(interval) {
    if (!this.xFixed) {
        var dx   = -this.damping * this.vx;     // damping force
        var ax   = (this.fx + dx) / this.mass;  // acceleration
        this.vx += ax / interval;               // velocity
        this.x  += this.vx / interval;          // position
    }

    if (!this.yFixed) {
        var dy   = -this.damping * this.vy;     // damping force
        var ay   = (this.fy + dy) / this.mass;  // acceleration
        this.vy += ay / interval;               // velocity
        this.y  += this.vy / interval;          // position
    }
};


/**
 * Check if this node has a fixed x and y position
 * @return {boolean}      true if fixed, false if not
 */
Graph.Node.prototype.isFixed = function() {
    return (this.xFixed && this.yFixed);
};

/**
 * Check if this node is moving
 * @param {number} vmin   the minimum velocity considered as "moving"
 * @return {boolean}      true if moving, false if it has no velocity
 */
// TODO: replace this method with calculating the kinetic energy
Graph.Node.prototype.isMoving = function(vmin) {
    return (Math.abs(this.vx) > vmin || Math.abs(this.vy) > vmin ||
        (!this.xFixed && Math.abs(this.fx) > this.minForce) ||
        (!this.yFixed && Math.abs(this.fy) > this.minForce));
};

/**
 * check if this node is selecte
 * @return {boolean} selected   True if node is selected, else false
 */
Graph.Node.prototype.isSelected = function() {
    return this.selected;
};

/**
 * Retrieve the value of the node. Can be undefined
 * @return {Number} value
 */
Graph.Node.prototype.getValue = function() {
    return this.value;
};

/**
 * Calculate the distance from the nodes location to the given location (x,y)
 * @param {Number} x
 * @param {Number} y
 * @return {Number} value
 */
Graph.Node.prototype.getDistance = function(x, y) {
    var dx = this.x - x,
        dy = this.y - y;
    return Math.sqrt(dx * dx + dy * dy);
};


/**
 * Adjust the value range of the node. The node will adjust it's radius
 * based on its value.
 * @param {Number} min
 * @param {Number} max
 */
Graph.Node.prototype.setValueRange = function(min, max) {
    if (!this.radiusFixed && this.value !== undefined) {
        var scale = (this.radiusMax - this.radiusMin) / (max - min);
        this.radius = (this.value - min) * scale + this.radiusMin;
    }
};

/**
 * Draw this node in the given canvas
 * The 2d context of a HTML canvas can be retrieved by canvas.getContext("2d");
 * @param {CanvasRenderingContext2D}   ctx
 */
Graph.Node.prototype.draw = function(ctx) {
    throw "Draw method not initialized for node";
};

/**
 * Recalculate the size of this node in the given canvas
 * The 2d context of a HTML canvas can be retrieved by canvas.getContext("2d");
 * @param {CanvasRenderingContext2D}   ctx
 */
Graph.Node.prototype.resize = function(ctx) {
    throw "Resize method not initialized for node";
};

/**
 * Check if this object is overlapping with the provided object
 * @param {Object} obj   an object with parameters left, top, right, bottom
 * @return {boolean}     True if location is located on node
 */
Graph.Node.prototype.isOverlappingWith = function(obj) {
    return (this.left          < obj.right &&
        this.left + this.width > obj.left &&
        this.top               < obj.bottom &&
        this.top + this.height > obj.top);
};

Graph.Node.prototype._resizeImage = function (ctx) {
    // TODO: pre calculate the image size
    if (!this.width) {  // undefined or 0
        var width, height;
        if (this.value) {
            var scale = this.imageObj.height / this.imageObj.width;
            width = this.radius || this.imageObj.width;
            height = this.radius * scale || this.imageObj.height;
        }
        else {
            width = this.imageObj.width;
            height = this.imageObj.height;
        }
        this.width  = width;
        this.height = height;
    }
};

Graph.Node.prototype._drawImage = function (ctx) {
    this._resizeImage(ctx);

    this.left   = this.x - this.width / 2;
    this.top    = this.y - this.height / 2;

    var yText;
    if (this.imageObj) {
        ctx.drawImage(this.imageObj, this.left, this.top, this.width, this.height);
        yText = this.y + this.height / 2;
    }
    else {
        // image still loading... just draw the text for now
        yText = this.y;
    }

    this._text(ctx, this.text, this.x, yText, undefined, "top");
};


Graph.Node.prototype._resizeRect = function (ctx) {
    if (!this.width) {
        var margin = 5;
        var textSize = this.getTextSize(ctx);
        this.width = textSize.width + 2 * margin;
        this.height = textSize.height + 2 * margin;
    }
};

Graph.Node.prototype._drawRect = function (ctx) {
    this._resizeRect(ctx);

    this.left = this.x - this.width / 2;
    this.top = this.y - this.height / 2;

    ctx.strokeStyle = this.borderColor;
    ctx.fillStyle = this.selected ? this.highlightColor : this.backgroundColor;
    ctx.lineWidth = this.selected ? 2.0 : 1.0;
    ctx.roundRect(this.left, this.top, this.width, this.height, this.radius);
    ctx.fill();
    ctx.stroke();

    this._text(ctx, this.text, this.x, this.y);
};


Graph.Node.prototype._resizeDatabase = function (ctx) {
    if (!this.width) {
        var margin = 5;
        var textSize = this.getTextSize(ctx);
        var size = textSize.width + 2 * margin;
        this.width = size;
        this.height = size;
    }
};

Graph.Node.prototype._drawDatabase = function (ctx) {
    this._resizeDatabase(ctx);
    this.left = this.x - this.width / 2;
    this.top = this.y - this.height / 2;

    ctx.strokeStyle = this.borderColor;
    ctx.fillStyle = this.selected ? this.highlightColor : this.backgroundColor;
    ctx.lineWidth = this.selected ? 2.0 : 1.0;
    ctx.database(this.x - this.width/2, this.y - this.height*0.5, this.width, this.height);
    ctx.fill();
    ctx.stroke();

    this._text(ctx, this.text, this.x, this.y);
};


Graph.Node.prototype._resizeCircle = function (ctx) {
    if (!this.width) {
        var margin = 5;
        var textSize = this.getTextSize(ctx);
        var diameter = Math.max(textSize.width, textSize.height) + 2 * margin;
        this.radius = diameter / 2;

        this.width = diameter;
        this.height = diameter;
    }
};

Graph.Node.prototype._drawCircle = function (ctx) {
    this._resizeCircle(ctx);
    this.left = this.x - this.width / 2;
    this.top = this.y - this.height / 2;

    ctx.strokeStyle = this.borderColor;
    ctx.fillStyle = this.selected ? this.highlightColor : this.backgroundColor;
    ctx.lineWidth = this.selected ? 2.0 : 1.0;
    ctx.circle(this.x, this.y, this.radius);
    ctx.fill();
    ctx.stroke();

    this._text(ctx, this.text, this.x, this.y);
};

Graph.Node.prototype._drawDot = function (ctx) {
    this._drawShape(ctx, 'circle');
};

Graph.Node.prototype._drawTriangle = function (ctx) {
    this._drawShape(ctx, 'triangle');
};

Graph.Node.prototype._drawTriangleDown = function (ctx) {
    this._drawShape(ctx, 'triangleDown');
};

Graph.Node.prototype._drawSquare = function (ctx) {
    this._drawShape(ctx, 'square');
};

Graph.Node.prototype._drawStar = function (ctx) {
    this._drawShape(ctx, 'star');
};

Graph.Node.prototype._resizeShape = function (ctx) {
    if (!this.width) {
        var size = 2 * this.radius;
        this.width = size;
        this.height = size;
    }
};

Graph.Node.prototype._drawShape = function (ctx, shape) {
    this._resizeShape(ctx);

    this.left = this.x - this.width / 2;
    this.top = this.y - this.height / 2;

    ctx.strokeStyle = this.borderColor;
    ctx.fillStyle = this.selected ? this.highlightColor : this.backgroundColor;
    ctx.lineWidth = this.selected ? 2.0 : 1.0;

    ctx[shape](this.x, this.y, this.radius);
    ctx.fill();
    ctx.stroke();

    if (this.text) {
        this._text(ctx, this.text, this.x, this.y + this.height / 2, undefined, 'top');
    }
};

Graph.Node.prototype._resizeText = function (ctx) {
    if (!this.width) {
        var margin = 5;
        var textSize = this.getTextSize(ctx);
        this.width = textSize.width + 2 * margin;
        this.height = textSize.height + 2 * margin;
    }
};

Graph.Node.prototype._drawText = function (ctx) {
    this._resizeText(ctx);
    this.left = this.x - this.width / 2;
    this.top = this.y - this.height / 2;

    this._text(ctx, this.text, this.x, this.y);
};


Graph.Node.prototype._text = function (ctx, text, x, y, align, baseline) {
    if (text) {
        ctx.font = (this.selected ? "bold " : "") + this.fontSize + "px " + this.fontFace;
        ctx.fillStyle = this.fontColor || "black";
        ctx.textAlign = align || "center";
        ctx.textBaseline = baseline || "middle";

        var lines = text.split('\n'),
            lineCount = lines.length,
            fontSize = (this.fontSize + 4),
            yLine = y + (1 - lineCount) / 2 * fontSize;

        for (var i = 0; i < lineCount; i++) {
            ctx.fillText(lines[i], x, yLine);
            yLine += fontSize;
        }
    }
};


Graph.Node.prototype.getTextSize = function(ctx) {
    if (this.text != undefined) {
        ctx.font = (this.selected ? "bold " : "") + this.fontSize + "px " + this.fontFace;

        var lines = this.text.split('\n'),
            height = (this.fontSize + 4) * lines.length,
            width = 0;

        for (var i = 0, iMax = lines.length; i < iMax; i++) {
            width = Math.max(width, ctx.measureText(lines[i]).width);
        }

        return {"width": width, "height": height};
    }
    else {
        return {"width": 0, "height": 0};
    }
};



/**--------------------------------------------------------------------------**/


/**
 * @class Edge
 *
 * A edge connects two nodes
 * @param {Object} properties     Object with properties. Must contain
 *                                At least properties from and to.
 *                                Available properties: from (number),
 *                                to (number), color (string),
 *                                width (number), style (string),
 *                                length (number), title (string)
 * @param {Graph} graph A graph object, used to find and edge to
 *                                nodes.
 * @param {Object} constants      An object with default values for
 *                                example for the color
 */
Graph.Edge = function (properties, graph, constants) {
    if (!graph) {
        throw "No graph provided";
    }
    this.graph = graph;

    // initialize constants
    this.widthMin = constants.edges.widthMin;
    this.widthMax = constants.edges.widthMax;

    // initialize variables
    this.id     = undefined;
    this.style  = constants.edges.style;
    this.title  = undefined;
    this.width  = constants.edges.width;
    this.value  = undefined;
    this.length = constants.edges.length;

    // Added to support dashed lines
    // David Jordan
    // 2012-08-08
    this.dashlength = constants.edges.dashlength;
    this.dashgap = constants.edges.dashgap;
    this.altdashlength  = constants.edges.altdashlength;

    this.stiffness = undefined; // depends on the length of the edge
    this.color  = constants.edges.color;
    this.timestamp  = undefined;
    this.widthFixed = false;
    this.lengthFixed = false;

    this.setProperties(properties, constants);
};

/**
 * Set or overwrite properties for the edge
 * @param {Object} properties  an object with properties
 * @param {Object} constants   and object with default, global properties
 */
Graph.Edge.prototype.setProperties = function(properties, constants) {
    if (!properties) {
        return;
    }

    if (properties.from != undefined) {this.from = this.graph._getNode(properties.from);}
    if (properties.to != undefined) {this.to = this.graph._getNode(properties.to);}

    if (properties.id != undefined)         {this.id = properties.id;}
    if (properties.style != undefined)      {this.style = properties.style;}
    if (properties.text != undefined)       {this.text = properties.text;}
    if (this.text) {
        this.fontSize = constants.edges.fontSize;
        this.fontFace = constants.edges.fontFace;
        this.fontColor = constants.edges.fontColor;
        if (properties.fontColor != undefined)  {this.fontColor = properties.fontColor;}
        if (properties.fontSize != undefined)   {this.fontSize = properties.fontSize;}
        if (properties.fontFace != undefined)   {this.fontFace = properties.fontFace;}
    }
    if (properties.title != undefined)      {this.title = properties.title;}
    if (properties.width != undefined)      {this.width = properties.width;}
    if (properties.value != undefined)      {this.value = properties.value;}
    if (properties.length != undefined)     {this.length = properties.length;}

    // Added to support dashed lines
    // David Jordan
    // 2012-08-08
    if (properties.dashlength != undefined) {this.dashlength = properties.dashlength;}
    if (properties.dashgap != undefined) {this.dashgap = properties.dashgap;}
    if (properties.altdashlength != undefined) {this.altdashlength = properties.altdashlength;}

    if (properties.color != undefined) {this.color = properties.color;}
    if (properties.timestamp != undefined) {this.timestamp = properties.timestamp;}

    if (!this.from) {
        throw "Node with id " + properties.from + " not found";
    }
    if (!this.to) {
        throw "Node with id " + properties.to + " not found";
    }

    this.widthFixed = this.widthFixed || (properties.width != undefined);
    this.lengthFixed = this.lengthFixed || (properties.length != undefined);

    this.stiffness = 1 / this.length;

    // initialize animation
    if (this.style === 'arrow') {
        this.arrows = [0.5];
        this.animation = false;
    }
    else if (this.style === 'arrow-end') {
        this.animation = false;
    }
    else if (this.style === 'moving-arrows') {
        this.arrows = [];
        var arrowCount = 3; // TODO: make customizable
        for (var a = 0; a < arrowCount; a++) {
            this.arrows.push(a / arrowCount);
        }
        this.animation = true;
    }
    else if (this.style === 'moving-dot') {
        this.dot = 0.0;
        this.animation = true;
    }
    else {
        this.animation = false;
    }

    // set draw method based on style
    switch (this.style) {
        case 'line':          this.draw = this._drawLine; break;
        case 'arrow':         this.draw = this._drawArrow; break;
        case 'arrow-end':     this.draw = this._drawArrowEnd; break;
        case 'moving-arrows': this.draw = this._drawMovingArrows; break;
        case 'moving-dot':    this.draw = this._drawMovingDot; break;
        case 'dash-line':     this.draw = this._drawDashLine; break;
        default:              this.draw = this._drawLine; break;
    }
};



/**
 * Check if a node has an animating contents. If so, the graph needs to be
 * redrawn regularly
 * @return {boolean}  true if this edge needs animation, else false
 */
Graph.Edge.prototype.isMoving = function() {
    // TODO: be able to set the interval somehow

    return this.animation;
};

/**
 * get the title of this edge.
 * @return {string} title    The title of the edge, or undefined when no title
 *                           has been set.
 */
Graph.Edge.prototype.getTitle = function() {
    return this.title;
};


/**
 * Retrieve the value of the edge. Can be undefined
 * @return {Number} value
 */
Graph.Edge.prototype.getValue = function() {
    return this.value;
}

/**
 * Adjust the value range of the edge. The edge will adjust it's width
 * based on its value.
 * @param {Number} min
 * @param {Number} max
 */
Graph.Edge.prototype.setValueRange = function(min, max) {
    if (!this.widthFixed && this.value !== undefined) {
        var factor = (this.widthMax - this.widthMin) / (max - min);
        this.width = (this.value - min) * factor + this.widthMin;
    }
};


/**
 * Check if the length is fixed.
 * @return {boolean} lengthFixed   True if the length is fixed, else false
 */
Graph.Edge.prototype.isLengthFixed = function() {
    return this.lengthFixed;
};

/**
 * Retrieve the length of the edge. Can be undefined
 * @return {Number} length
 */
Graph.Edge.prototype.getLength = function() {
    return this.length;
};

/**
 * Adjust the length of the edge. This can only be done when the length
 * is not fixed (which is the case when the edge is created with a length property)
 * @param {Number} length
 */
Graph.Edge.prototype.setLength = function(length) {
    if (!this.lengthFixed) {
        this.length = length;
    }
};

/**
 * Retrieve the length of the edges dashes. Can be undefined
 * @author David Jordan
 * @date 2012-08-08
 * @return {Number} dashlength
 */
Graph.Edge.prototype.getDashLength = function() {
    return this.dashlength;
};

/**
 * Adjust the length of the edges dashes.
 * @author David Jordan
 * @date 2012-08-08
 * @param {Number} dashlength
 */
Graph.Edge.prototype.setDashLength = function(dashlength) {
    this.dashlength = dashlength;
};

/**
 * Retrieve the length of the edges dashes gaps. Can be undefined
 * @author David Jordan
 * @date 2012-08-08
 * @return {Number} dashgap
 */
Graph.Edge.prototype.getDashGap = function() {
    return this.dashgap;
};

/**
 * Adjust the length of the edges dashes gaps.
 * @author David Jordan
 * @date 2012-08-08
 * @param {Number} dashgap
 */
Graph.Edge.prototype.setDashGap = function(dashgap) {
    this.dashgap = dashgap;
};

/**
 * Retrieve the length of the edges alternate dashes. Can be undefined
 * @author David Jordan
 * @date 2012-08-08
 * @return {Number} altdashlength
 */
Graph.Edge.prototype.getAltDashLength = function() {
    return this.altdashlength;
};

/**
 * Adjust the length of the edges alternate dashes.
 * @author David Jordan
 * @date 2012-08-08
 * @param {Number} altdashlength
 */
Graph.Edge.prototype.setAltDashLength = function(altdashlength) {
    this.altdashlength = altdashlength;
};



/**
 * Redraw a edge
 * Draw this edge in the given canvas
 * The 2d context of a HTML canvas can be retrieved by canvas.getContext("2d");
 * @param {CanvasRenderingContext2D}   ctx
 */
Graph.Edge.prototype.draw = function(ctx) {
    throw "Method draw not initialized in edge";
};


/**
 * Check if this object is overlapping with the provided object
 * @param {Object} obj   an object with parameters left, top
 * @return {boolean}     True if location is located on the edge
 */
Graph.Edge.prototype.isOverlappingWith = function(obj) {
    var distMax = 10;

    var xFrom = this.from.x;
    var yFrom = this.from.y;
    var xTo = this.to.x;
    var yTo = this.to.y;
    var xObj = obj.left;
    var yObj = obj.top;


    var dist = Graph._dist(xFrom, yFrom, xTo, yTo, xObj, yObj);

    return (dist < distMax);
};

/**
 * Calculate the distance between a point (x3,y3) and a line segment from
 * (x1,y1) to (x2,y2).
 * http://stackoverflow.com/questions/849211/shortest-distancae-between-a-point-and-a-line-segment
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @param {number} x3
 * @param {number} y3
 */
Graph._dist = function (x1,y1, x2,y2, x3,y3) { // x3,y3 is the point
    var px = x2-x1,
        py = y2-y1,
        something = px*px + py*py,
        u =  ((x3 - x1) * px + (y3 - y1) * py) / something;

    if (u > 1) {
        u = 1;
    }
    else if (u < 0) {
        u = 0;
    }

    var x = x1 + u * px,
        y = y1 + u * py,
        dx = x - x3,
        dy = y - y3;

    //# Note: If the actual distance does not matter,
    //# if you only want to compare what this function
    //# returns to other results of this function, you
    //# can just return the squared distance instead
    //# (i.e. remove the sqrt) to gain a little performance

    return Math.sqrt(dx*dx + dy*dy);
};

/**
 * Redraw a edge as a line
 * Draw this edge in the given canvas
 * The 2d context of a HTML canvas can be retrieved by canvas.getContext("2d");
 * @param {CanvasRenderingContext2D}   ctx
 */
Graph.Edge.prototype._drawLine = function(ctx) {
    // set style
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this._getLineWidth();

    var point;
    if (this.from != this.to) {
        // draw line
        this._line(ctx);

        // draw text
        if (this.text) {
            point = this._pointOnLine(0.5);
            this._text(ctx, this.text, point.x, point.y);
        }
    }
    else {
        var radius = this.length / 2 / Math.PI;
        var x, y;
        var node = this.from;
        if (!node.width) {
            node.resize(ctx);
        }
        if (node.width > node.height) {
            x = node.x + node.width / 2;
            y = node.y - radius;
        }
        else {
            x = node.x + radius;
            y = node.y - node.height / 2;
        }
        this._circle(ctx, x, y, radius);
        point = this._pointOnCircle(x, y, radius, 0.5);
        this._text(ctx, this.text, point.x, point.y);
    }
};

/**
 * Get the line width of the edge. Depends on width and whether one of the
 * connected nodes is selected.
 * @return {Number} width
 * @private
 */
Graph.Edge.prototype._getLineWidth = function() {
    if (this.from.selected || this.to.selected) {
        return Math.min(this.width * 2, this.widthMax);
    }
    else {
        return this.width;
    }
};

/**
 * Draw a line between two nodes
 * @param {CanvasRenderingContext2D} ctx
 * @private
 */
Graph.Edge.prototype._line = function (ctx) {
    // draw a straight line
    ctx.beginPath();
    ctx.moveTo(this.from.x, this.from.y);
    ctx.lineTo(this.to.x, this.to.y);
    ctx.stroke();
};

/**
 * Draw a line from a node to itself, a circle
 * @param {CanvasRenderingContext2D} ctx
 * @param {Number} x
 * @param {Number} y
 * @param {Number} radius
 * @private
 */
Graph.Edge.prototype._circle = function (ctx, x, y, radius) {
    // draw a circle
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
    ctx.stroke();
};

/**
 * Draw text with white background and with the middle at (x, y)
 * @param {CanvasRenderingContext2D} ctx
 * @param {String} text
 * @param {Number} x
 * @param {Number} y
 */
Graph.Edge.prototype._text = function (ctx, text, x, y) {
    if (text) {
        // TODO: cache the calculated size
        ctx.font = ((this.from.selected || this.to.selected) ? "bold " : "") +
            this.fontSize + "px " + this.fontFace;
        ctx.fillStyle = 'white';
        var width = ctx.measureText(this.text).width;
        var height = this.fontSize;
        var left = x - width / 2;
        var top = y - height / 2;

        ctx.fillRect(left, top, width, height);

        // draw text
        ctx.fillStyle = this.fontColor || "black";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(this.text, left, top);
    }
};

/**
 * Sets up the dashedLine functionality for drawing
 * Original code came from http://stackoverflow.com/questions/4576724/dotted-stroke-in-canvas
 * @author David Jordan
 * @date 2012-08-08
 */
var CP = (typeof window !== 'undefined') &&
    window.CanvasRenderingContext2D &&
    CanvasRenderingContext2D.prototype;
if (CP && CP.lineTo){
    CP.dashedLine = function(x,y,x2,y2,dashArray){
        if (!dashArray) dashArray=[10,5];
        if (dashLength==0) dashLength = 0.001; // Hack for Safari
        var dashCount = dashArray.length;
        this.moveTo(x, y);
        var dx = (x2-x), dy = (y2-y);
        var slope = dy/dx;
        var distRemaining = Math.sqrt( dx*dx + dy*dy );
        var dashIndex=0, draw=true;
        while (distRemaining>=0.1){
            var dashLength = dashArray[dashIndex++%dashCount];
            if (dashLength > distRemaining) dashLength = distRemaining;
            var xStep = Math.sqrt( dashLength*dashLength / (1 + slope*slope) );
            if (dx<0) xStep = -xStep;
            x += xStep
            y += slope*xStep;
            this[draw ? 'lineTo' : 'moveTo'](x,y);
            distRemaining -= dashLength;
            draw = !draw;
        }
    }
}

/**
 * Redraw a edge as a dashed line
 * Draw this edge in the given canvas
 * @author David Jordan
 * @date 2012-08-08
 * The 2d context of a HTML canvas can be retrieved by canvas.getContext("2d");
 * @param {CanvasRenderingContext2D}   ctx
 */
Graph.Edge.prototype._drawDashLine = function(ctx) {
    // set style
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this._getLineWidth();

    // draw dashed line
    ctx.beginPath();
    ctx.lineCap = 'round';
    if (this.altdashlength != undefined) //If an alt dash value has been set add to the array this value
    {
        ctx.dashedLine(this.from.x,this.from.y,this.to.x,this.to.y,[this.dashlength,this.dashgap,this.altdashlength,this.dashgap]);
    }
    else if (this.dashlength != undefined && this.dashgap != undefined) //If a dash and gap value has been set add to the array this value
    {
        ctx.dashedLine(this.from.x,this.from.y,this.to.x,this.to.y,[this.dashlength,this.dashgap]);
    }
    else //If all else fails draw a line
    {
        ctx.moveTo(this.from.x, this.from.y);
        ctx.lineTo(this.to.x, this.to.y);
    }
    ctx.stroke();

    // draw text
    if (this.text) {
        var point = this._pointOnLine(0.5);
        this._text(ctx, this.text, point.x, point.y);
    }
};

/**
 * Get a point on a line
 * @param {Number} percentage. Value between 0 (line start) and 1 (line end)
 * @return {Object} point
 * @private
 */
Graph.Edge.prototype._pointOnLine = function (percentage) {
    return {
        x: (1 - percentage) * this.from.x + percentage * this.to.x,
        y: (1 - percentage) * this.from.y + percentage * this.to.y
    }
};

/**
 * Get a point on a circle
 * @param {Number} x
 * @param {Number} y
 * @param {Number} radius
 * @param {Number} percentage. Value between 0 (line start) and 1 (line end)
 * @return {Object} point
 * @private
 */
Graph.Edge.prototype._pointOnCircle = function (x, y, radius, percentage) {
    var angle = (percentage - 3/8) * 2 * Math.PI;
    return {
        x: x + radius * Math.cos(angle),
        y: y - radius * Math.sin(angle)
    }
};

/**
 * Redraw a edge as a line with a moving arrow
 * Draw this edge in the given canvas
 * The 2d context of a HTML canvas can be retrieved by canvas.getContext("2d");
 * @param {CanvasRenderingContext2D}   ctx
 */
Graph.Edge.prototype._drawMovingArrows = function(ctx) {
    this._drawArrow(ctx);

    for (var a in this.arrows) {
        if (this.arrows.hasOwnProperty(a)) {
            this.arrows[a] += 0.02;  // TODO determine speed from interval
            if (this.arrows[a] > 1.0) this.arrows[a] = 0.0;
        }
    }
};

/**
 * Redraw a edge as a line with a moving dot
 * Draw this edge in the given canvas
 * The 2d context of a HTML canvas can be retrieved by canvas.getContext("2d");
 * @param {CanvasRenderingContext2D}   ctx
 */
Graph.Edge.prototype._drawMovingDot = function(ctx) {
    // set style
    ctx.strokeStyle = this.color;
    ctx.fillStyle = this.color;
    ctx.lineWidth = this._getLineWidth();

    // draw line
    var point;
    if (this.from != this.to) {
        this._line(ctx);

        // draw dot
        var radius = 4 + this.width * 2;
        point = this._pointOnLine(this.dot);
        ctx.circle(point.x, point.y, radius);
        ctx.fill();

        // move the dot to the next position
        this.dot += 0.05;  // TODO determine speed from interval
        if (this.dot > 1.0) this.dot = 0.0;

        // draw text
        if (this.text) {
            point = this._pointOnLine(0.5);
            this._text(ctx, this.text, point.x, point.y);
        }
    }
    else {
        // TODO: moving dot for a circular edge
    }
};


/**
 * Redraw a edge as a line with an arrow
 * Draw this edge in the given canvas
 * The 2d context of a HTML canvas can be retrieved by canvas.getContext("2d");
 * @param {CanvasRenderingContext2D}   ctx
 */
Graph.Edge.prototype._drawArrow = function(ctx) {
    var point;
    // set style
    ctx.strokeStyle = this.color;
    ctx.fillStyle = this.color;
    ctx.lineWidth = this._getLineWidth();

    if (this.from != this.to) {
        // draw line
        this._line(ctx);

        // draw all arrows
        var angle = Math.atan2((this.to.y - this.from.y), (this.to.x - this.from.x));
        var length = 10 + 5 * this.width; // TODO: make customizable?
        for (var a in this.arrows) {
            if (this.arrows.hasOwnProperty(a)) {
                point = this._pointOnLine(this.arrows[a]);
                ctx.arrow(point.x, point.y, angle, length);
                ctx.fill();
                ctx.stroke();
            }
        }

        // draw text
        if (this.text) {
            point = this._pointOnLine(0.5);
            this._text(ctx, this.text, point.x, point.y);
        }
    }
    else {
        // draw circle
        var radius = this.length / 2 / Math.PI;
        var x, y;
        var node = this.from;
        if (!node.width) {
            node.resize(ctx);
        }
        if (node.width > node.height) {
            x = node.x + node.width / 2;
            y = node.y - radius;
        }
        else {
            x = node.x + radius;
            y = node.y - node.height / 2;
        }
        this._circle(ctx, x, y, radius);

        // draw all arrows
        var angle = 0.2 * Math.PI;
        var length = 10 + 5 * this.width; // TODO: make customizable?
        for (var a in this.arrows) {
            if (this.arrows.hasOwnProperty(a)) {
                point = this._pointOnCircle(x, y, radius, this.arrows[a]);
                ctx.arrow(point.x, point.y, angle, length);
                ctx.fill();
                ctx.stroke();
            }
        }

        // draw text
        if (this.text) {
            point = this._pointOnCircle(x, y, radius, 0.5);
            this._text(ctx, this.text, point.x, point.y);
        }
    }
};



/**
 * Redraw a edge as a line with an arrow
 * Draw this edge in the given canvas
 * The 2d context of a HTML canvas can be retrieved by canvas.getContext("2d");
 * @param {CanvasRenderingContext2D}   ctx
 */
Graph.Edge.prototype._drawArrowEnd = function(ctx) {
    // set style
    ctx.strokeStyle = this.color;
    ctx.fillStyle = this.color;
    ctx.lineWidth = this._getLineWidth();

    // draw line
    var angle, length;
    if (this.from != this.to) {
        // calculate length and angle of the line
        angle = Math.atan2((this.to.y - this.from.y), (this.to.x - this.from.x));
        var dx = (this.to.x - this.from.x);
        var dy = (this.to.y - this.from.y);
        var lEdge = Math.sqrt(dx * dx + dy * dy);

        var lFrom = this.to.distanceToBorder(ctx, angle + Math.PI);
        var pFrom = (lEdge - lFrom) / lEdge;
        var xFrom = (pFrom) * this.from.x + (1 - pFrom) * this.to.x;
        var yFrom = (pFrom) * this.from.y + (1 - pFrom) * this.to.y;

        var lTo = this.to.distanceToBorder(ctx, angle);
        var pTo = (lEdge - lTo) / lEdge;
        var xTo = (1 - pTo) * this.from.x + pTo * this.to.x;
        var yTo = (1 - pTo) * this.from.y + pTo * this.to.y;

        ctx.beginPath();
        ctx.moveTo(xFrom, yFrom);
        ctx.lineTo(xTo, yTo);
        ctx.stroke();

        // draw arrow at the end of the line
        length = 10 + 5 * this.width; // TODO: make customizable?
        ctx.arrow(xTo, yTo, angle, length);
        ctx.fill();
        ctx.stroke();

        // draw text
        if (this.text) {
            var point = this._pointOnLine(0.5);
            this._text(ctx, this.text, point.x, point.y);
        }
    }
    else {
        // draw circle
        var radius = this.length / 2 / Math.PI;
        var x, y, arrow;
        var node = this.from;
        if (!node.width) {
            node.resize(ctx);
        }
        if (node.width > node.height) {
            x = node.x + node.width / 2;
            y = node.y - radius;
            arrow = {
                x: x,
                y: node.y,
                angle: 0.9 * Math.PI
            };
        }
        else {
            x = node.x + radius;
            y = node.y - node.height / 2;
            arrow = {
                x: node.x,
                y: y,
                angle: 0.6 * Math.PI
            };
        }
        ctx.beginPath();
        // TODO: do not draw a circle, but an arc
        // TODO: similarly, for a line without arrows, draw to the border of the nodes instead of the center
        ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
        ctx.stroke();

        // draw all arrows
        length = 10 + 5 * this.width; // TODO: make customizable?
        ctx.arrow(arrow.x, arrow.y, arrow.angle, length);
        ctx.fill();
        ctx.stroke();

        // draw text
        if (this.text) {
            point = this._pointOnCircle(x, y, radius, 0.5);
            this._text(ctx, this.text, point.x, point.y);
        }
    }

};

/**--------------------------------------------------------------------------**/


/**
 * @class Images
 * This class loades images and keeps them stored.
 */
Graph.Images = function () {
    this.images = {};

    this.callback = undefined;
};

/**
 * Set an onload callback function. This will be called each time an image
 * is loaded
 * @param {function} callback
 */
Graph.Images.prototype.setOnloadCallback = function(callback) {
    this.callback = callback;
};


/**
 *
 * @param {string} url          Url of the image
 * @return {Image} img          The image object
 */
Graph.Images.prototype.load = function(url) {
    var img = this.images[url];
    if (img == undefined) {
        // create the image
        var images = this;
        img = new Image();
        this.images[url] = img;
        img.onload = function() {
            if (images.callback) {
                images.callback(this);
            }
        };
        img.src = url;
    }

    return img;
};


/**--------------------------------------------------------------------------**/


/**
 * @class Package
 * This class contains one package
 *
 * @param {number} properties  Properties for the package. Optional. Available
 *                             properties are: id {number}, title {string},
 *                             style {string} with available values "dot" and
 *                             "image", radius {number}, image {string},
 *                             color {string}, progress {number} with a value
 *                             between 0-1, duration {number}, timestamp {number
 *                             or Date}.
 * @param {Graph}      graph        The graph object, used to find
 *                                            and edge to nodes.
 * @param {Graph.Images} imagelist    An Images object. Only needed
 *                                            when the package has style 'image'
 * @param {Object}               constants    An object with default values for
 *                                            example for the color
 */
Graph.Package = function (properties, graph, imagelist, constants) {
    if (graph == undefined) {
        throw "No graph provided";
    }

    // constants
    this.radiusMin = constants.packages.radiusMin;
    this.radiusMax = constants.packages.radiusMax;
    this.imagelist = imagelist;
    this.graph = graph;

    // initialize variables
    this.id =        undefined;
    this.from =      undefined;
    this.to =        undefined;
    this.title =     undefined;
    this.style =     constants.packages.style;
    this.radius =    constants.packages.radius;
    this.color =     constants.packages.color;
    this.image =     constants.packages.image;
    this.value =     undefined;
    this.progress =  0.0;
    this.timestamp = undefined;
    this.duration = constants.packages.duration;
    this.autoProgress = true;
    this.radiusFixed = false;

    // set properties
    this.setProperties(properties, constants);
};

Graph.Package.DEFAULT_DURATION = 1.0; // seconds

/**
 * Set or overwrite properties for the package
 * @param {Object} properties an object with properties
 * @param {Object} constants  and object with default, global properties
 */
Graph.Package.prototype.setProperties = function(properties, constants) {
    if (!properties) {
        return;
    }

    // note that the provided properties can also be null
    if (properties.from != undefined) {this.from = this.graph._getNode(properties.from);}
    if (properties.to != undefined) {this.to = this.graph._getNode(properties.to);}

    if (!this.from) {
        throw "Node with id " + properties.from + " not found";
    }
    if (!this.to) {
        throw "Node with id " + properties.to + " not found";
    }

    if (properties.id != undefined) {this.id = properties.id;}
    if (properties.title != undefined) {this.title = properties.title;}
    if (properties.style != undefined) {this.style = properties.style;}
    if (properties.radius != undefined) {this.radius = properties.radius;}
    if (properties.value != undefined) {this.value = properties.value;}
    if (properties.image != undefined) {this.image = properties.image;}
    if (properties.color != undefined) {this.color = properties.color;}
    if (properties.dashlength != undefined) {this.dashlength = properties.dashlength;}
    if (properties.dashgap != undefined) {this.dashgap = properties.dashgap;}
    if (properties.altdashlength != undefined) {this.altdashlength = properties.altdashlength;}
    if (properties.progress != undefined) {this.progress = properties.progress;}
    if (properties.timestamp != undefined) {this.timestamp = properties.timestamp;}
    if (properties.duration != undefined) {this.duration = properties.duration;}

    this.radiusFixed = this.radiusFixed || (properties.radius != undefined);
    this.autoProgress = (this.autoProgress == true) ? (properties.progress == undefined) : false;

    if (this.style == 'image') {
        this.radiusMin = constants.packages.widthMin;
        this.radiusMax = constants.packages.widthMax;
    }

    // handle progress
    if (this.progress < 0.0) {this.progress = 0.0;}
    if (this.progress > 1.0) {this.progress = 1.0;}

    // handle image
    if (this.image != undefined) {
        if (this.imagelist) {
            this.imageObj = this.imagelist.load(this.image);
        }
        else {
            throw "No imagelist provided";
        }
    }

    // choose draw method depending on the style
    switch (this.style) {
        // TODO: add more styles
        case 'dot':         this.draw = this._drawDot; break;
        case 'square':      this.draw = this._drawSquare; break;
        case 'triangle':    this.draw = this._drawTriangle; break;
        case 'triangleDown':this.draw = this._drawTriangleDown; break;
        case 'star':        this.draw = this._drawStar; break;
        case 'image':       this.draw = this._drawImage; break;
        default:            this.draw = this._drawDot; break;
    }
};

/**
 * Set a new value for the progress of the package
 * @param {number} progress    A value between 0 and 1
 */
Graph.Package.prototype.setProgress = function (progress) {
    this.progress = progress;
    this.autoProgress = false;
};

/**
 * Check if a package is finished, if it has reached its destination.
 * If so, the package can be removed.
 * Only packages with automatically animated progress can be finished
 * @return {boolean}    true if finished, else false.
 */
Graph.Package.prototype.isFinished = function () {
    return (this.autoProgress == true && this.progress >= 1.0);
};

/**
 * Check if this package is moving.
 * A packages moves when it has automatic progress and not yet reached its
 * destination.
 * @return {boolean}    true if moving, else false.
 */
Graph.Package.prototype.isMoving = function () {
    return (this.autoProgress || this.isFinished());
};


/**
 * Perform one discrete step for the package. Only applicable when the
 * package has no manually set, fixed progress.
 * @param {number} interval    Time interval in seconds
 */
Graph.Package.prototype.discreteStep = function(interval) {
    if (this.autoProgress == true) {
        this.progress += (parseFloat(interval) / this.duration);

        if (this.progress > 1.0)
            this.progress = 1.0;
    }
};


/**
 * Draw this package in the given canvas
 * The 2d context of a HTML canvas can be retrieved by canvas.getContext("2d");
 * @param {CanvasRenderingContext2D}   ctx
 */
Graph.Package.prototype.draw = function(ctx) {
    throw "Draw method not initialized for package";
};


/**
 * Check if this object is overlapping with the provided object
 * @param {Object} obj   an object with parameters left, top, right, bottom
 * @return {boolean}     True if location is located on node
 */
Graph.Package.prototype.isOverlappingWith = function(obj) {
    // radius minimum 10px else it is too hard to get your mouse at the exact right position
    var radius = Math.max(this.radius, 10);
    var pos = this._getPosition();

    return (pos.x - radius < obj.right &&
        pos.x + radius > obj.left &&
        pos.y - radius < obj.bottom &&
        pos.y + radius > obj.top);
};

/**
 * Calculate the current position of the package
 * @return {Object} position    The object has parameters x and y.
 */
Graph.Package.prototype._getPosition = function() {
    return {
        "x" : (1 - this.progress) * this.from.x + this.progress * this.to.x,
        "y" : (1 - this.progress) * this.from.y + this.progress * this.to.y
    };
};


/**
 * get the title of this package.
 * @return {string} title    The title of the package, or undefined when no
 *                           title has been set.
 */
Graph.Package.prototype.getTitle = function() {
    return this.title;
};

/**
 * Retrieve the value of the package. Can be undefined
 * @return {Number} value
 */
Graph.Package.prototype.getValue = function() {
    return this.value;
};

/**
 * Calculate the distance from the packages location to the given location (x,y)
 * @param {Number} x
 * @param {Number} y
 * @return {Number} value
 */
Graph.Package.prototype.getDistance = function(x, y) {
    var pos = this._getPosition(),
        dx = pos.x - x,
        dy = pos.y - y;
    return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Adjust the value range of the package. The package will adjust it's radius
 * based on its value.
 * @param {Number} min
 * @param {Number} max
 */
Graph.Package.prototype.setValueRange = function(min, max) {
    if (!this.radiusFixed && this.value !== undefined) {
        var factor = (this.radiusMax - this.radiusMin) / (max - min);
        this.radius = (this.value - min) * factor + this.radiusMin;
    }
};



/**
 * Redraw a package as a dot
 * Draw this edge in the given canvas
 * The 2d context of a HTML canvas can be retrieved by canvas.getContext("2d");
 * @param {CanvasRenderingContext2D}   ctx
 */
/* TODO: cleanup
 Graph.Package.prototype._drawDot = function(ctx) {
 // set style
 ctx.fillStyle = this.color;
 // draw dot
 var pos = this._getPosition();
 ctx.circle(pos.x, pos.y, this.radius);
 ctx.fill();
 }
 */

Graph.Package.prototype._drawDot = function (ctx) {
    this._drawShape(ctx, 'circle');
};

Graph.Package.prototype._drawTriangle = function (ctx) {
    this._drawShape(ctx, 'triangle');
};

Graph.Package.prototype._drawTriangleDown = function (ctx) {
    this._drawShape(ctx, 'triangleDown');
};

Graph.Package.prototype._drawSquare = function (ctx) {
    this._drawShape(ctx, 'square');
};

Graph.Package.prototype._drawStar = function (ctx) {
    this._drawShape(ctx, 'star');
};

Graph.Package.prototype._drawShape = function (ctx, shape) {
    // set style
    ctx.fillStyle = this.color;

    // draw shape
    var pos = this._getPosition();
    ctx[shape](pos.x, pos.y, this.radius);
    ctx.fill();
};

/**
 * Redraw a package as an image
 * Draw this edge in the given canvas
 * The 2d context of a HTML canvas can be retrieved by canvas.getContext("2d");
 * @param {CanvasRenderingContext2D}   ctx
 */
Graph.Package.prototype._drawImage = function (ctx) {
    if (this.imageObj) {
        var width, height;
        if (this.value) {
            var scale = this.imageObj.height / this.imageObj.width;
            width = this.radius || this.imageObj.width;
            height = this.radius * scale || this.imageObj.height;
        }
        else {
            width = this.imageObj.width;
            height = this.imageObj.height;
        }
        var pos = this._getPosition();

        ctx.drawImage(this.imageObj, pos.x - width / 2, pos.y - height / 2, width, height);
    }
    else {
        console.log("image still loading...");
    }
};



/**--------------------------------------------------------------------------**/


/**
 * @class Groups
 * This class can store groups and properties specific for groups.
 */
Graph.Groups = function () {
    this.clear();
    this.defaultIndex = 0;
};


/**
 * default constants for group colors
 */
Graph.Groups.DEFAULT = [
    {"borderColor": "#2B7CE9", "backgroundColor": "#97C2FC", "highlightColor": "#D2E5FF"}, // blue
    {"borderColor": "#FFA500", "backgroundColor": "#FFFF00", "highlightColor": "#FFFFA3"}, // yellow
    {"borderColor": "#FA0A10", "backgroundColor": "#FB7E81", "highlightColor": "#FFAFB1"}, // red
    {"borderColor": "#41A906", "backgroundColor": "#7BE141", "highlightColor": "#A1EC76"}, // green
    {"borderColor": "#E129F0", "backgroundColor": "#EB7DF4", "highlightColor": "#F0B3F5"}, // magenta
    {"borderColor": "#7C29F0", "backgroundColor": "#AD85E4", "highlightColor": "#D3BDF0"}, // purple
    {"borderColor": "#C37F00", "backgroundColor": "#FFA807", "highlightColor": "#FFCA66"}, // orange
    {"borderColor": "#4220FB", "backgroundColor": "#6E6EFD", "highlightColor": "#9B9BFD"}, // darkblue
    {"borderColor": "#FD5A77", "backgroundColor": "#FFC0CB", "highlightColor": "#FFD1D9"}, // pink
    {"borderColor": "#4AD63A", "backgroundColor": "#C2FABC", "highlightColor": "#E6FFE3"}  // mint
];


/**
 * Clear all groups
 */
Graph.Groups.prototype.clear = function () {
    this.groups = {};
    this.groups.length = function()
    {
        var i = 0;
        for ( var p in this ) {
            if (this.hasOwnProperty(p)) {
                i++;
            }
        }
        return i;
    }
};


/**
 * get group properties of a groupname. If groupname is not found, a new group
 * is added.
 * @param {*} groupname        Can be a number, string, Date, etc.
 * @return {Object} group      The created group, containing all group properties
 */
Graph.Groups.prototype.get = function (groupname) {
    var group = this.groups[groupname];

    if (group == undefined) {
        // create new group
        var index = this.defaultIndex % Graph.Groups.DEFAULT.length;
        this.defaultIndex++;
        group = {};
        group.borderColor     = Graph.Groups.DEFAULT[index].borderColor;
        group.backgroundColor = Graph.Groups.DEFAULT[index].backgroundColor;
        group.highlightColor  = Graph.Groups.DEFAULT[index].highlightColor;
        this.groups[groupname] = group;
    }

    return group;
};

/**
 * Add a custom group style
 * @param {String} groupname
 * @param {Object} style       An object containing borderColor,
 *                             backgroundColor, etc.
 * @return {Object} group      The created group object
 */
Graph.Groups.prototype.add = function (groupname, style) {
    this.groups[groupname] = style;
    return style;
};

/**
 * Check if given object is a Javascript Array
 * @param {*} obj
 * @return {Boolean} isArray    true if the given object is an array
 */
// See http://stackoverflow.com/questions/2943805/javascript-instanceof-typeof-in-gwt-jsni
Graph.isArray = function (obj) {
    if (obj instanceof Array) {
        return true;
    }
    return (Object.prototype.toString.call(obj) === '[object Array]');
};



/**--------------------------------------------------------------------------**/


/**
 * @class Slider
 *
 * An html slider control with start/stop/prev/next buttons
 * @param {Element} container  The element where the slider will be created
 */
Graph.Slider = function(container) {
    if (container === undefined) throw "Error: No container element defined";

    this.container = container;

    this.frame = document.createElement("DIV");
    //this.frame.style.backgroundColor = "#E5E5E5";
    this.frame.style.width = "100%";
    this.frame.style.position = "relative";

    this.title = document.createElement("DIV");
    this.title.style.margin = "2px";
    this.title.style.marginBottom = "5px";
    this.title.innerHTML = "";
    this.container.appendChild(this.title);

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

    this.container.appendChild(this.frame);

    this.onChangeCallback = undefined;

    this.playTimeout = undefined;
    this.framerate = 20; // frames per second
    this.duration = 10; // seconds
    this.doLoop = true;

    this.start = 0;
    this.end = 0;
    this.value = 0;
    this.step = 0;
    this.rangeIsDate = false;

    this.redraw();
};

/**
 * Retrieve the step size, depending on the range, framerate, and duration
 */
Graph.Slider.prototype._updateStep = function() {
    var range = (this.end - this.start);
    var frameCount = this.duration * this.framerate;

    this.step = range / frameCount;
};

/**
 * Select the previous index
 */
Graph.Slider.prototype.prev = function() {
    this._setValue(this.value - this.step);
};

/**
 * Select the next index
 */
Graph.Slider.prototype.next = function() {
    this._setValue(this.value + this.step);
};

/**
 * Select the next index
 */
Graph.Slider.prototype.playNext = function() {
    var start = new Date();

    if (!this.leftButtonDown) {
        if (this.value + this.step < this.end) {
            this._setValue(this.value + this.step);
        }
        else {
            if (this.doLoop) {
                this._setValue(this.start);
            }
            else {
                this._setValue(this.end);
                this.stop();
                return;
            }
        }
    }

    var end = new Date();
    var diff = (end - start);

    // calculate how much time it to to set the index and to execute the callback
    // function.
    var interval = Math.max(1000 / this.framerate - diff, 0);

    var me = this;
    this.playTimeout = setTimeout(function() {me.playNext();}, interval);
};

/**
 * Toggle start or stop playing
 */
Graph.Slider.prototype.togglePlay = function() {
    if (this.playTimeout === undefined) {
        this.play();
    } else {
        this.stop();
    }
};

/**
 * Start playing
 */
Graph.Slider.prototype.play = function() {
    this.frame.play.value = "Stop";

    this.playNext();
};

/**
 * Stop playing
 */
Graph.Slider.prototype.stop = function() {
    this.frame.play.value = "Play";

    clearInterval(this.playTimeout);
    this.playTimeout = undefined;
};

/**
 * Set a callback function which will be triggered when the value of the
 * slider bar has changed.
 */
Graph.Slider.prototype.setOnChangeCallback = function(callback) {
    this.onChangeCallback = callback;
};

/**
 * Set the interval for playing the list
 * @param {number} framerate    Framerate in frames per second
 */
Graph.Slider.prototype.setFramerate = function(framerate) {
    this.framerate = framerate;
    this._updateStep();
};

/**
 * Retrieve the current framerate
 * @return {number} framerate in frames per second
 */
Graph.Slider.prototype.getFramerate = function() {
    return this.framerate;
};

/**
 * Set the duration for playing
 * @param {number} duration    Duration in seconds
 */
Graph.Slider.prototype.setDuration = function(duration) {
    this.duration = duration;
    this._updateStep();
};

/**
 * Set the time acceleration for playing the history. Only applicable when
 * the values are of type Date.
 * @param {number} acceleration    Acceleration, for example 10 means play
 *                                 ten times as fast as real time. A value
 *                                 of 1 will play the history in real time.
 */
Graph.Slider.prototype.setAcceleration = function(acceleration) {
    var durationRealtime = (this.end - this.start) / 1000; // in seconds

    this.duration = durationRealtime / acceleration;
    this._updateStep();
};


/**
 * Set looping on or off
 * @param {boolean} doLoop    If true, the slider will jump to the start when
 *                            the end is passed, and will jump to the end
 *                            when the start is passed.
 */
Graph.Slider.prototype.setLoop = function(doLoop) {
    this.doLoop = doLoop;
};

/**
 * Retrieve the current value of loop
 * @return {boolean} doLoop    If true, the slider will jump to the start when
 *                             the end is passed, and will jump to the end
 *                             when the start is passed.
 */
Graph.Slider.prototype.getLoop = function() {
    return this.doLoop;
};


/**
 * Execute the onchange callback function
 */
Graph.Slider.prototype.onChange = function() {
    if (this.onChangeCallback !== undefined) {
        this.onChangeCallback();
    }
};

/**
 * redraw the slider on the correct place
 */
Graph.Slider.prototype.redraw = function() {
    // resize the bar
    var barTop = (this.frame.clientHeight/2 -
        this.frame.bar.offsetHeight/2);
    var barWidth = (this.frame.clientWidth -
        this.frame.prev.clientWidth -
        this.frame.play.clientWidth -
        this.frame.next.clientWidth - 30);
    this.frame.bar.style.top = barTop + "px";
    this.frame.bar.style.width = barWidth + "px";

    // position the slider button
    this.frame.slide.title = this.getValue();
    this.frame.slide.style.left = this._valueToLeft(this.value) + "px";

    // set the title
    this.title.innerHTML = this.getValue();
};


/**
 * Set the range for the slider
 * @param {Date | Number} start  Start of the range
 * @param {Date | Number} end    End of the range
 */
Graph.Slider.prototype.setRange = function(start, end) {
    if (start === undefined || start === null || start === NaN) {
        this.start = 0;
        this.rangeIsDate = false;
    }
    else if (start instanceof Date) {
        this.start = start.getTime();
        this.rangeIsDate = true;
    }
    else {
        this.start = start;
        this.rangeIsDate = false;
    }

    if (end === undefined || end === null || end === NaN) {
        if (this.start instanceof Date) {
            this.end = new Date(this.start);
        }
        else {
            this.end = this.start;
        }
    }
    else if (end instanceof Date) {
        this.end = end.getTime();
    }
    else {
        this.end = end;
    }

    this.value = this.start;

    this._updateStep();
    this.redraw();
};



/**
 * Set a value for the slider. The value must be between start and end
 * When the range are Dates, the value will be translated to a date
 * @param {Number} value
 */
Graph.Slider.prototype._setValue = function(value) {
    this.value = this._limitValue(value);
    this.redraw();

    this.onChange();
};

/**
 * retrieve the current value in the correct type, Number or Date
 * @return {Date | Number} value
 */
Graph.Slider.prototype.getValue = function() {
    if (this.rangeIsDate) {
        return new Date(this.value);
    }
    else {
        return this.value;
    }
};


Graph.Slider.prototype.offset = 3;

Graph.Slider.prototype._leftToValue = function (left) {
    var width = parseFloat(this.frame.bar.style.width) -
        this.frame.slide.clientWidth - 10;
    var x = left - this.offset;

    var range = this.end - this.start;
    var value = this._limitValue(x / width * range + this.start);

    return value;
};

Graph.Slider.prototype._valueToLeft = function (value) {
    var width = parseFloat(this.frame.bar.style.width) -
        this.frame.slide.clientWidth - 10;

    var x;
    if (this.end > this.start) {
        x = (value - this.start) / (this.end - this.start) * width;
    }
    else {
        x = 0;
    }
    var left = x + this.offset;

    return left;
};

Graph.Slider.prototype._limitValue = function(value) {
    if (value < this.start) {
        value = this.start
    }
    if (value > this.end) {
        value = this.end;
    }

    return value;
};

Graph.Slider.prototype._onMouseDown = function(event) {
    // only react on left mouse button down
    this.leftButtonDown = event.which ? (event.which === 1) : (event.button === 1);
    if (!this.leftButtonDown) return;

    this.startClientX = event.clientX;
    this.startSlideX = parseFloat(this.frame.slide.style.left);

    this.frame.style.cursor = 'move';

    // add event listeners to handle moving the contents
    // we store the function onmousemove and onmouseup in the graph, so we can
    // remove the eventlisteners lateron in the function mouseUp()
    var me = this;
    this.onmousemove = function (event) {me._onMouseMove(event);};
    this.onmouseup   = function (event) {me._onMouseUp(event);};
    Graph.addEventListener(document, "mousemove", this.onmousemove);
    Graph.addEventListener(document, "mouseup",   this.onmouseup);
    Graph.preventDefault(event);
};


Graph.Slider.prototype._onMouseMove = function (event) {
    var diff = event.clientX - this.startClientX;
    var x = this.startSlideX + diff;

    var value = this._leftToValue(x);
    this._setValue(value);

    Graph.preventDefault(event);
};


Graph.Slider.prototype._onMouseUp = function (event) {
    this.frame.style.cursor = 'auto';

    this.leftButtonDown = false;

    // remove event listeners
    Graph.removeEventListener(document, "mousemove", this.onmousemove);
    Graph.removeEventListener(document, "mouseup", this.onmouseup);

    Graph.preventDefault(event);
};



/**--------------------------------------------------------------------------**/


/**
 * Popup is a class to create a popup window with some text
 * @param {Element}  container     The container object.
 * @param {Number} x
 * @param {Number} y
 * @param {String} text
 */
Graph.Popup = function (container, x, y, text) {
    if (container) {
        this.container = container;
    }
    else {
        this.container = document.body;
    }
    this.x = 0;
    this.y = 0;
    this.padding = 5;

    if (x !== undefined && y !== undefined ) {
        this.setPosition(x, y);
    }
    if (text !== undefined) {
        this.setText(text);
    }

    // create the frame
    this.frame = document.createElement("div");
    var style = this.frame.style;
    style.position = "absolute";
    style.visibility = "hidden";
    style.border = "1px solid #666";
    style.color = "black";
    style.padding = this.padding + "px";
    style.backgroundColor = "#FFFFC6";
    style.borderRadius = "3px";
    style.MozBorderRadius = "3px";
    style.WebkitBorderRadius = "3px";
    style.boxShadow = "3px 3px 10px rgba(128, 128, 128, 0.5)";
    style.whiteSpace = "nowrap";
    this.container.appendChild(this.frame);
};

/**
 * @param {number} x   Horizontal position of the popup window
 * @param {number} y   Vertical position of the popup window
 */
Graph.Popup.prototype.setPosition = function(x, y) {
    this.x = parseInt(x);
    this.y = parseInt(y);
};

/**
 * Set the text for the popup window. This can be HTML code
 * @param {string} text
 */
Graph.Popup.prototype.setText = function(text) {
    this.frame.innerHTML = text;
};

/**
 * Show the popup window
 * @param {boolean} show    Optional. Show or hide the window
 */
Graph.Popup.prototype.show = function (show) {
    if (show === undefined) {
        show = true;
    }

    if (show) {
        var height = this.frame.clientHeight;
        var width =  this.frame.clientWidth;
        var maxHeight = this.frame.parentNode.clientHeight;
        var maxWidth = this.frame.parentNode.clientWidth;

        var top = (this.y - height);
        if (top + height + this.padding > maxHeight) {
            top = maxHeight - height - this.padding;
        }
        if (top < this.padding) {
            top = this.padding;
        }

        var left = this.x;
        if (left + width + this.padding > maxWidth) {
            left = maxWidth - width - this.padding;
        }
        if (left < this.padding) {
            left = this.padding;
        }

        this.frame.style.left = left + "px";
        this.frame.style.top = top + "px";
        this.frame.style.visibility = "visible";
    }
    else {
        this.hide();
    }
};

/**
 * Hide the popup window
 */
Graph.Popup.prototype.hide = function () {
    this.frame.style.visibility = "hidden";
};


/**--------------------------------------------------------------------------**/

if (typeof CanvasRenderingContext2D !== 'undefined') {
    /**
     * Draw a circle shape
     */
    CanvasRenderingContext2D.prototype.circle = function(x, y, r) {
        this.beginPath();
        this.arc(x, y, r, 0, 2*Math.PI, false);
    };

    /**
     * Draw a square shape
     * @param {Number} x horizontal center
     * @param {Number} y vertical center
     * @param {Number} r   size, width and height of the square
     */
    CanvasRenderingContext2D.prototype.square = function(x, y, r) {
        this.beginPath();
        this.rect(x - r, y - r, r * 2, r * 2);
    };

    /**
     * Draw a triangle shape
     * @param {Number} x horizontal center
     * @param {Number} y vertical center
     * @param {Number} r   radius, half the length of the sides of the triangle
     */
    CanvasRenderingContext2D.prototype.triangle = function(x, y, r) {
        // http://en.wikipedia.org/wiki/Equilateral_triangle
        this.beginPath();

        var s = r * 2;
        var s2 = s / 2;
        var ir = Math.sqrt(3) / 6 * s;      // radius of inner circle
        var h = Math.sqrt(s * s - s2 * s2); // height

        this.moveTo(x, y - (h - ir));
        this.lineTo(x + s2, y + ir);
        this.lineTo(x - s2, y + ir);
        this.lineTo(x, y - (h - ir));
        this.closePath();
    };

    /**
     * Draw a triangle shape in downward orientation
     * @param {Number} x horizontal center
     * @param {Number} y vertical center
     * @param {Number} r radius
     */
    CanvasRenderingContext2D.prototype.triangleDown = function(x, y, r) {
        // http://en.wikipedia.org/wiki/Equilateral_triangle
        this.beginPath();

        var s = r * 2;
        var s2 = s / 2;
        var ir = Math.sqrt(3) / 6 * s;      // radius of inner circle
        var h = Math.sqrt(s * s - s2 * s2); // height

        this.moveTo(x, y + (h - ir));
        this.lineTo(x + s2, y - ir);
        this.lineTo(x - s2, y - ir);
        this.lineTo(x, y + (h - ir));
        this.closePath();
    };

    /**
     * Draw a star shape, a star with 5 points
     * @param {Number} x horizontal center
     * @param {Number} y vertical center
     * @param {Number} r   radius, half the length of the sides of the triangle
     */
    CanvasRenderingContext2D.prototype.star = function(x, y, r) {
        // http://www.html5canvastutorials.com/labs/html5-canvas-star-spinner/
        this.beginPath();

        for (var n = 0; n < 10; n++) {
            var radius = (n % 2 === 0) ? r * 1.3 : r * 0.5;
            this.lineTo(
                x + radius * Math.sin(n * 2 * Math.PI / 10),
                y - radius * Math.cos(n * 2 * Math.PI / 10)
            );
        }

        this.closePath();
    };

    /**
     * http://stackoverflow.com/questions/1255512/how-to-draw-a-rounded-rectangle-on-html-canvas
     */
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
        var r2d = Math.PI/180;
        if( w - ( 2 * r ) < 0 ) { r = ( w / 2 ); } //ensure that the radius isn't too large for x
        if( h - ( 2 * r ) < 0 ) { r = ( h / 2 ); } //ensure that the radius isn't too large for y
        this.beginPath();
        this.moveTo(x+r,y);
        this.lineTo(x+w-r,y);
        this.arc(x+w-r,y+r,r,r2d*270,r2d*360,false);
        this.lineTo(x+w,y+h-r);
        this.arc(x+w-r,y+h-r,r,0,r2d*90,false);
        this.lineTo(x+r,y+h);
        this.arc(x+r,y+h-r,r,r2d*90,r2d*180,false);
        this.lineTo(x,y+r);
        this.arc(x+r,y+r,r,r2d*180,r2d*270,false);
    };

    /**
     * http://stackoverflow.com/questions/2172798/how-to-draw-an-oval-in-html5-canvas
     */
    CanvasRenderingContext2D.prototype.ellipse = function(x, y, w, h) {
        var kappa = .5522848,
            ox = (w / 2) * kappa, // control point offset horizontal
            oy = (h / 2) * kappa, // control point offset vertical
            xe = x + w,           // x-end
            ye = y + h,           // y-end
            xm = x + w / 2,       // x-middle
            ym = y + h / 2;       // y-middle

        this.beginPath();
        this.moveTo(x, ym);
        this.bezierCurveTo(x, ym - oy, xm - ox, y, xm, y);
        this.bezierCurveTo(xm + ox, y, xe, ym - oy, xe, ym);
        this.bezierCurveTo(xe, ym + oy, xm + ox, ye, xm, ye);
        this.bezierCurveTo(xm - ox, ye, x, ym + oy, x, ym);
    };



    /**
     * http://stackoverflow.com/questions/2172798/how-to-draw-an-oval-in-html5-canvas
     */
    CanvasRenderingContext2D.prototype.database = function(x, y, w, h) {
        var f = 1/3;
        var wEllipse = w;
        var hEllipse = h * f;

        var kappa = .5522848,
            ox = (wEllipse / 2) * kappa, // control point offset horizontal
            oy = (hEllipse / 2) * kappa, // control point offset vertical
            xe = x + wEllipse,           // x-end
            ye = y + hEllipse,           // y-end
            xm = x + wEllipse / 2,       // x-middle
            ym = y + hEllipse / 2,       // y-middle
            ymb = y + (h - hEllipse/2),  // y-midlle, bottom ellipse
            yeb = y + h;                 // y-end, bottom ellipse

        this.beginPath();
        this.moveTo(xe, ym);

        this.bezierCurveTo(xe, ym + oy, xm + ox, ye, xm, ye);
        this.bezierCurveTo(xm - ox, ye, x, ym + oy, x, ym);

        this.bezierCurveTo(x, ym - oy, xm - ox, y, xm, y);
        this.bezierCurveTo(xm + ox, y, xe, ym - oy, xe, ym);

        this.lineTo(xe, ymb);

        this.bezierCurveTo(xe, ymb + oy, xm + ox, yeb, xm, yeb);
        this.bezierCurveTo(xm - ox, yeb, x, ymb + oy, x, ymb);

        this.lineTo(x, ym);
    };


    /**
     * Draw an arrow point (no line)
     */
    CanvasRenderingContext2D.prototype.arrow = function(x, y, angle, length) {
        // tail
        var xt = x - length * Math.cos(angle);
        var yt = y - length * Math.sin(angle);

        // inner tail
        // TODO: allow to customize different shapes
        var xi = x - length * 0.9 * Math.cos(angle);
        var yi = y - length * 0.9 * Math.sin(angle);

        // left
        var xl = xt + length / 3 * Math.cos(angle + 0.5 * Math.PI);
        var yl = yt + length / 3 * Math.sin(angle + 0.5 * Math.PI);

        // right
        var xr = xt + length / 3 * Math.cos(angle - 0.5 * Math.PI);
        var yr = yt + length / 3 * Math.sin(angle - 0.5 * Math.PI);

        this.beginPath();
        this.moveTo(x, y);
        this.lineTo(xl, yl);
        this.lineTo(xi, yi);
        this.lineTo(xr, yr);
        this.closePath();
    };


    // TODO: add diamond shape
}


/*----------------------------------------------------------------------------*/

// utility methods
Graph.util = {};

/**
 * Parse a text source containing data in DOT language into a JSON object.
 * The object contains two lists: one with nodes and one with edges.
 * @param {String} data     Text containing a graph in DOT-notation
 * @return {Object} json    An object containing two parameters:
 *                          {Object[]} nodes
 *                          {Object[]} edges
 */
Graph.util.parseDOT = function (data) {
    /**
     * Test whether given character is a whitespace character
     * @param {String} c
     * @return {Boolean} isWhitespace
     */
    function isWhitespace(c) {
        return c == ' ' || c == '\t' || c == '\n' || c == '\r';
    }

    /**
     * Test whether given character is a delimeter
     * @param {String} c
     * @return {Boolean} isDelimeter
     */
    function isDelimeter(c) {
        return '[]{}();,=->'.indexOf(c) != -1;
    }

    var i = -1;  // current index in the data
    var c = '';  // current character in the data

    /**
     * Read the next character from the data
     */
    function next() {
        i++;
        c = data[i];
    }

    /**
     * Preview the next character in the data
     * @returns {String} nextChar
     */
    function previewNext () {
        return data[i + 1];
    }

    /**
     * Preview the next character in the data
     * @returns {String} nextChar
     */
    function previewPrevious () {
        return data[i + 1];
    }

    /**
     * Get a text description of the the current index in the data
     * @return {String} desc
     */
    function pos() {
        return '(char ' + i + ')';
    }

    /**
     * Skip whitespace and comments
     */
    function parseWhitespace() {
        // skip whitespace
        while (c && isWhitespace(c)) {
            next();
        }

        // test for comment
        var cNext = data[i + 1];
        var cPrev = data[i - 1];
        var c2 = c + cNext;
        if (c2 == '/*') {
            // block comment. skip until the block is closed
            while (c && !(c == '*' && data[i + 1] == '/')) {
                next();
            }
            next();
            next();

            parseWhitespace();
        }
        else if (c2 == '//' || (c == '#' && cPrev == '\n')) {
            // line comment. skip until the next return
            while (c && c != '\n') {
                next();
            }
            next();
            parseWhitespace();
        }
    }

    /**
     * Parse a string
     * The string may be enclosed by double quotes
     * @return {String | undefined} value
     */
    function parseString() {
        parseWhitespace();

        var name = '';
        if (c == '"') {
            next();
            while (c && c != '"') {
                name += c;
                next();
            }
            next(); // skip the closing quote
        }
        else {
            while (c && !isWhitespace(c) && !isDelimeter(c)) {
                name += c;
                next();
            }

            // cast string to number or boolean
            var number = Number(name);
            if (!isNaN(number)) {
                name = number;
            }
            else if (name == 'true') {
                name = true;
            }
            else if (name == 'false') {
                name = false;
            }
            else if (name == 'null') {
                name = null;
            }
        }

        return name;
    }

    /**
     * Parse a value, can be a string, number, or boolean.
     * The value may be enclosed by double quotes
     * @return {String | Number | Boolean | undefined} value
     */
    function parseValue() {
        parseWhitespace();

        if (c == '"') {
            return parseString();
        }
        else {
            var value = parseString();
            if (value != undefined) {
                // cast string to number or boolean
                var number = Number(value);
                if (!isNaN(number)) {
                    value = number;
                }
                else if (value == 'true') {
                    value = true;
                }
                else if (value == 'false') {
                    value = false;
                }
                else if (value == 'null') {
                    value = null;
                }
            }
            return value;
        }
    }

    /**
     * Parse a set with attributes,
     * for example [label="1.000", style=solid]
     * @return {Object | undefined} attr
     */
    function parseAttributes() {
        parseWhitespace();

        if (c == '[') {
            next();
            var attr = {};
            while (c && c != ']') {
                parseWhitespace();

                var name = parseString();
                if (!name) {
                    throw new SyntaxError('Attribute name expected ' + pos());
                }

                parseWhitespace();
                if (c != '=') {
                    throw new SyntaxError('Equal sign = expected ' + pos());
                }
                next();

                var value = parseValue();
                if (!value) {
                    throw new SyntaxError('Attribute value expected ' + pos());
                }
                attr[name] = value;

                parseWhitespace();

                if (c ==',') {
                    next();
                }
            }
            next();

            return attr;
        }
        else {
            return undefined;
        }
    }

    /**
     * Parse a directed or undirected arrow '->' or '--'
     * @return {String | undefined} arrow
     */
    function parseArrow() {
        parseWhitespace();

        if (c == '-') {
            next();
            if (c == '>' || c == '-') {
                var arrow = '-' + c;
                next();
                return arrow;
            }
            else {
                throw new SyntaxError('Arrow "->" or "--" expected ' + pos());
            }
        }

        return undefined;
    }

    /**
     * Parse a line separator ';'
     * @return {String | undefined} separator
     */
    function parseSeparator() {
        parseWhitespace();

        if (c == ';') {
            next();
            return ';';
        }

        return undefined;
    }

    /**
     * Merge all properties of object b into object b
     * @param {Object} a
     * @param {Object} b
     */
    function merge (a, b) {
        if (a && b) {
            for (var name in b) {
                if (b.hasOwnProperty(name)) {
                    a[name] = b[name];
                }
            }
        }
    }

    var nodeMap = {};
    var edgeList = [];

    /**
     * Register a node with attributes
     * @param {String} id
     * @param {Object} [attr]
     */
    function addNode(id, attr) {
        var node = {
            id: String(id),
            attr: attr || {}
        };
        if (!nodeMap[id]) {
            nodeMap[id] = node;
        }
        else {
            merge(nodeMap[id].attr, node.attr);
        }
    }

    /**
     * Register an edge
     * @param {String} from
     * @param {String} to
     * @param {String} type    A string "->" or "--"
     * @param {Object} [attr]
     */
    function addEdge(from, to, type, attr) {
        edgeList.push({
            from: String(from),
            to: String(to),
            type: type,
            attr: attr || {}
        });
    }

    // find the opening curly bracket
    next();
    while (c && c != '{') {
        next();
    }
    if (c != '{') {
        throw new SyntaxError('Invalid data. Curly bracket { expected ' + pos())
    }
    next();

    // parse all data until a closing curly bracket is encountered
    while (c && c != '}') {
        // parse node id and optional node attributes
        var id = parseString();
        if (id == undefined) {
            throw new SyntaxError('String with id expected ' + pos());
        }
        var attr = parseAttributes();
        addNode(id, attr);

        // TODO: parse global attributes "graph", "node", "edge"

        // parse arrow
        var type = parseArrow();
        while (type) {
            // parse node id
            var prevId = id;
            id = parseString();
            if (id == undefined) {
                throw new SyntaxError('String with id expected ' + pos());
            }
            addNode(id);

            // parse edge attributes and register edge
            attr = parseAttributes();
            addEdge(prevId, id, type, attr);

            // parse next arrow (optional)
            type = parseArrow();
        }

        // parse separator (optional)
        parseSeparator();

        parseWhitespace();
    }
    if (c != '}') {
        throw new SyntaxError('Invalid data. Curly bracket } expected');
    }

    // crop data between the curly brackets
    var start = data.indexOf('{');
    var end = data.indexOf('}', start);
    var text = (start != -1 && end != -1) ? data.substring(start + 1, end) : undefined;

    if (!text) {
        throw new Error('Invalid data. no curly brackets containing data found');
    }

    // return the results
    var nodeList = [];
    for (id in nodeMap) {
        if (nodeMap.hasOwnProperty(id)) {
            nodeList.push(nodeMap[id]);
        }
    }
    return {
        nodes: nodeList,
        edges: edgeList
    }
};

/**
 * Convert a string containing a graph in DOT language into a map containing
 * with nodes and edges in the format of graph.
 * @param {String} data         Text containing a graph in DOT-notation
 * @return {Object} graphData
 */
Graph.util.DOTToGraph = function (data) {
    // parse the DOT file
    var dotData = Graph.util.parseDOT(data);
    var graphData = {
        nodes: [],
        edges: [],
        options: {
            nodes: {},
            edges: {}
        }
    };

    /**
     * Merge the properties of object b into object a, and adjust properties
     * not supported by Graph (for example replace "shape" with "style"
     * @param {Object} a
     * @param {Object} b
     * @param {Array} [ignore]   Optional array with property names to be ignored
     */
    function merge (a, b, ignore) {
        for (var prop in b) {
            if (b.hasOwnProperty(prop) && (!ignore || ignore.indexOf(prop) == -1)) {
                a[prop] = b[prop];
            }
        }

        // Convert aliases to configuration settings supported by Graph
        if (a.label) {
            a.text = a.label;
            delete a.label;
        }
        if (a.shape) {
            a.style = a.shape;
            delete a.shape;
        }
    }

    dotData.nodes.forEach(function (node) {
        if (node.id.toLowerCase() == 'graph') {
            merge(graphData.options, node.attr);
        }
        else if (node.id.toLowerCase() == 'node') {
            merge(graphData.options.nodes, node.attr);
        }
        else if (node.id.toLowerCase() == 'edge') {
            merge(graphData.options.edges, node.attr);
        }
        else {
            var graphNode = {};
            graphNode.id = node.id;
            graphNode.text = node.id;
            merge(graphNode, node.attr);
            graphData.nodes.push(graphNode);
        }
    });

    dotData.edges.forEach(function (edge) {
        var graphEdge = {};
        graphEdge.from = edge.from;
        graphEdge.to = edge.to;
        graphEdge.text = edge.id;
        graphEdge.style = (edge.type == '->') ? 'arrow-end' : 'line';
        merge(graphEdge, edge.attr);
        graphData.edges.push(graphEdge);
    });

    return graphData;
};

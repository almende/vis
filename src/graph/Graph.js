/**
 * @constructor Graph
 * Create a graph visualization, displaying nodes and edges.
 * 
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
    this.width = '100%';
    this.height = '100%';
    this.refreshRate = 50; // milliseconds
    this.stabilize = true; // stabilize before displaying the graph
    this.selectable = true;

    // set constant values
    this.constants = {
        nodes: {
            radiusMin: 5,
            radiusMax: 20,
            radius: 5,
            distance: 100, // px
            shape: 'ellipse',
            image: undefined,
            widthMin: 16, // px
            widthMax: 64, // px
            fontColor: 'black',
            fontSize: 14, // px
            //fontFace: verdana,
            fontFace: 'arial',
            color: {
                border: '#2B7CE9',
                background: '#97C2FC',
                highlight: {
                    border: '#2B7CE9',
                    background: '#D2E5FF'
                }
            },
            borderColor: '#2B7CE9',
            backgroundColor: '#97C2FC',
            highlightColor: '#D2E5FF',
            group: undefined
        },
        edges: {
            widthMin: 1,
            widthMax: 15,
            width: 1,
            style: 'line',
            color: '#343434',
            fontColor: '#343434',
            fontSize: 14, // px
            fontFace: 'arial',
            //distance: 100, //px
            length: 100,   // px
            dash: {
                length: 10,
                gap: 5,
                altLength: undefined
            }
        },
        minForce: 0.05,
        minVelocity: 0.02,   // px/s
        maxIterations: 1000  // maximum number of iteration to stabilize
    };

    var graph = this;
    this.nodes = {};            // object with Node objects
    this.edges = {};            // object with Edge objects
    // TODO: create a counter to keep track on the number of nodes having values
    // TODO: create a counter to keep track on the number of nodes currently moving
    // TODO: create a counter to keep track on the number of edges having values

    this.nodesData = null;      // A DataSet or DataView
    this.edgesData = null;      // A DataSet or DataView

    // create event listeners used to subscribe on the DataSets of the nodes and edges
    var me = this;
    this.nodesListeners = {
        'add': function (event, params) {
            me._addNodes(params.items);
            me.start();
        },
        'update': function (event, params) {
            me._updateNodes(params.items);
            me.start();
        },
        'remove': function (event, params) {
            me._removeNodes(params.items);
            me.start();
        }
    };
    this.edgesListeners = {
        'add': function (event, params) {
            me._addEdges(params.items);
            me.start();
        },
        'update': function (event, params) {
            me._updateEdges(params.items);
            me.start();
        },
        'remove': function (event, params) {
            me._removeEdges(params.items);
            me.start();
        }
    };

    this.groups = new Groups(); // object with groups
    this.images = new Images(); // object with images
    this.images.setOnloadCallback(function () {
        graph._redraw();
    });

    // properties of the data
    this.moving = false;    // True if any of the nodes have an undefined position

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
 * Set nodes and edges, and optionally options as well.
 *
 * @param {Object} data    Object containing parameters:
 *                         {Array | DataSet | DataView} [nodes] Array with nodes
 *                         {Array | DataSet | DataView} [edges] Array with edges
 *                         {String} [dot] String containing data in DOT format
 *                         {Options} [options] Object with options
 */
Graph.prototype.setData = function(data) {
    if (data && data.dot && (data.nodes || data.edges)) {
        throw new SyntaxError('Data must contain either parameter "dot" or ' +
            ' parameter pair "nodes" and "edges", but not both.');
    }

    // set options
    this.setOptions(data && data.options);

    // set all data
    if (data && data.dot) {
        // parse DOT file
        if(data && data.dot) {
            var dotData = vis.util.DOTToGraph(data.dot);
            this.setData(dotData);
            return;
        }
    }
    else {
        this._setNodes(data && data.nodes);
        this._setEdges(data && data.edges);
    }


    // find a stable position or start animating to a stable position
    if (this.stabilize) {
        this._doStabilize();
    }
    this.start();
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
            if (options.edges.dash) {
                if (options.edges.dash.length != undefined) {
                    this.constants.edges.dash.length = options.edges.dash.length;
                }
                if (options.edges.dash.gap != undefined) {
                    this.constants.edges.dash.gap = options.edges.dash.gap;
                }
                if (options.edges.dash.altLength != undefined) {
                    this.constants.edges.dash.altLength = options.edges.dash.altLength;
                }
            }
        }

        if (options.nodes) {
            for (prop in options.nodes) {
                if (options.nodes.hasOwnProperty(prop)) {
                    this.constants.nodes[prop] = options.nodes[prop];
                }
            }

            if (options.nodes.color) {
                this.constants.nodes.color = Node.parseColor(options.nodes.color);
            }

            /*
             if (options.nodes.widthMin) this.constants.nodes.radiusMin = options.nodes.widthMin;
             if (options.nodes.widthMax) this.constants.nodes.radiusMax = options.nodes.widthMax;
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
    }

    this.setSize(this.width, this.height);
    this._setTranslation(this.frame.clientWidth / 2, this.frame.clientHeight / 2);
    this._setScale(1);
};

/**
 * fire an event
 * @param {String} event   The name of an event, for example "select"
 * @param {Object} params  Optional object with event parameters
 * @private
 */
Graph.prototype._trigger = function (event, params) {
    events.trigger(this, event, params);
};


/**
 * Create the main frame for the Graph.
 * This function is executed once when a Graph object is created. The frame
 * contains a canvas, and this canvas contains all objects like the axis and
 * nodes.
 * @private
 */
Graph.prototype._create = function () {
    // remove all elements from the container element.
    while (this.containerElement.hasChildNodes()) {
        this.containerElement.removeChild(this.containerElement.firstChild);
    }

    this.frame = document.createElement("div");
    this.frame.className = "graph-frame";
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
    vis.util.addEventListener(this.frame.canvas, "mousedown", onmousedown);
    vis.util.addEventListener(this.frame.canvas, "mousemove", onmousemove);
    vis.util.addEventListener(this.frame.canvas, "mousewheel", onmousewheel);
    vis.util.addEventListener(this.frame.canvas, "touchstart", ontouchstart);

    // add the frame to the container element
    this.containerElement.appendChild(this.frame);
};

/**
 * handle on mouse down event
 * @private
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
        vis.util.addEventListener(document, "mousemove", me.onmousemove);
    }
    if (!this.onmouseup) {
        this.onmouseup = function (event) {me._onMouseUp(event);};
        vis.util.addEventListener(document, "mouseup", me.onmouseup);
    }
    vis.util.preventDefault(event);

    // store the start x and y position of the mouse
    this.startMouseX = event.clientX || event.targetTouches[0].clientX;
    this.startMouseY = event.clientY || event.targetTouches[0].clientY;
    this.startFrameLeft = vis.util.getAbsoluteLeft(this.frame.canvas);
    this.startFrameTop = vis.util.getAbsoluteTop(this.frame.canvas);
    this.startTranslation = this._getTranslation();

    this.ctrlKeyDown = event.ctrlKey;
    this.shiftKeyDown = event.shiftKey;

    var obj = {
        left:   this._xToCanvas(this.startMouseX - this.startFrameLeft),
        top:    this._yToCanvas(this.startMouseY - this.startFrameTop),
        right:  this._xToCanvas(this.startMouseX - this.startFrameLeft),
        bottom: this._yToCanvas(this.startMouseY - this.startFrameTop)
    };
    var overlappingNodes = this._getNodesOverlappingWith(obj);
    // if there are overlapping nodes, select the last one, this is the
    // one which is drawn on top of the others
    this.startClickedObj = (overlappingNodes.length > 0) ?
        overlappingNodes[overlappingNodes.length - 1] : undefined;

    if (this.startClickedObj) {
        // move clicked node with the mouse

        // make the clicked node temporarily fixed, and store their original state
        var node = this.nodes[this.startClickedObj];
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

        if (!this.moving) {
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
 * @param {Event}  event
 * @private
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
        var node = this.nodes[this.startClickedObj];

        if (!this.startClickedObj.xFixed)
            node.x = this._xToCanvas(mouseX - this.startFrameLeft);

        if (!this.startClickedObj.yFixed)
            node.y = this._yToCanvas(mouseY - this.startFrameTop);

        // start animation if not yet running
        if (!this.moving) {
            this.moving = true;
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
        // move the graph
        var diffX = mouseX - this.startMouseX;
        var diffY = mouseY - this.startMouseY;

        this._setTranslation(
            this.startTranslation.x + diffX,
            this.startTranslation.y + diffY);
        this._redraw();

        this.moved = true;
    }

    vis.util.preventDefault(event);
};

/**
 * handle on mouse up event
 * @param {Event}  event
 * @private
 */
Graph.prototype._onMouseUp = function (event) {
    event = event || window.event;

    if (!this.selectable) {
        return;
    }

    // remove event listeners here, important for Safari
    if (this.onmousemove) {
        vis.util.removeEventListener(document, "mousemove", this.onmousemove);
        this.onmousemove = undefined;
    }
    if (this.onmouseup) {
        vis.util.removeEventListener(document, "mouseup",   this.onmouseup);
        this.onmouseup = undefined;
    }
    vis.util.preventDefault(event);

    // check selected nodes
    var endMouseX = event.clientX || this.mouseX || 0;
    var endMouseY = event.clientY || this.mouseY || 0;

    var ctrlKey = event ? event.ctrlKey : window.event.ctrlKey;

    if (this.startClickedObj) {
        // restore the original fixed state
        var node = this.nodes[this.startClickedObj];
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
 * @param {Event}  event
 * @private
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

        var frameLeft = vis.util.getAbsoluteLeft(this.frame.canvas);
        var frameTop = vis.util.getAbsoluteTop(this.frame.canvas);
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
    vis.util.preventDefault(event);
};


/**
 * Mouse move handler for checking whether the title moves over a node with a title.
 * @param  {Event} event
 * @private
 */
Graph.prototype._onMouseMoveTitle = function (event) {
    event = event || window.event;

    var startMouseX = event.clientX;
    var startMouseY = event.clientY;
    this.startFrameLeft = this.startFrameLeft || vis.util.getAbsoluteLeft(this.frame.canvas);
    this.startFrameTop = this.startFrameTop || vis.util.getAbsoluteTop(this.frame.canvas);

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
 * Check if there is an element on the given position in the graph
 * (a node or edge). If so, and if this element has a title,
 * show a popup window with its title.
 *
 * @param {number} x
 * @param {number} y
 * @private
 */
Graph.prototype._checkShowPopup = function (x, y) {
    var obj = {
        "left" : this._xToCanvas(x),
        "top" : this._yToCanvas(y),
        "right" : this._xToCanvas(x),
        "bottom" : this._yToCanvas(y)
    };

    var id;
    var lastPopupNode = this.popupNode;

    if (this.popupNode == undefined) {
        // search the nodes for overlap, select the top one in case of multiple nodes
        var nodes = this.nodes;
        for (id in nodes) {
            if (nodes.hasOwnProperty(id)) {
                var node = nodes[id];
                if (node.getTitle() != undefined && node.isOverlappingWith(obj)) {
                    this.popupNode = node;
                    break;
                }
            }
        }
    }

    if (this.popupNode == undefined) {
        // search the edges for overlap
        var edges = this.edges;
        for (id in edges) {
            if (edges.hasOwnProperty(id)) {
                var edge = edges[id];
                if (edge.connected && (edge.getTitle() != undefined) &&
                        edge.isOverlappingWith(obj)) {
                    this.popupNode = edge;
                    break;
                }
            }
        }
    }

    if (this.popupNode) {
        // show popup message window
        if (this.popupNode != lastPopupNode) {
            var me = this;
            if (!me.popup) {
                me.popup = new Popup(me.frame);
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
 * @private
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
 * @param {Event} event
 * @private
 */
Graph.prototype._onTouchStart = function(event) {
    vis.util.preventDefault(event);

    if (this.touchDown) {
        // if already moving, return
        return;
    }
    this.touchDown = true;

    var me = this;
    if (!this.ontouchmove) {
        this.ontouchmove = function (event) {me._onTouchMove(event);};
        vis.util.addEventListener(document, "touchmove", this.ontouchmove);
    }
    if (!this.ontouchend) {
        this.ontouchend   = function (event) {me._onTouchEnd(event);};
        vis.util.addEventListener(document, "touchend", this.ontouchend);
    }

    this._onMouseDown(event);
};

/**
 * Event handler for touchmove event on mobile devices
 * @param {Event} event
 * @private
 */
Graph.prototype._onTouchMove = function(event) {
    vis.util.preventDefault(event);
    this._onMouseMove(event);
};

/**
 * Event handler for touchend event on mobile devices
 * @param {Event} event
 * @private
 */
Graph.prototype._onTouchEnd = function(event) {
    vis.util.preventDefault(event);

    this.touchDown = false;

    if (this.ontouchmove) {
        vis.util.removeEventListener(document, "touchmove", this.ontouchmove);
        this.ontouchmove = undefined;
    }
    if (this.ontouchend) {
        vis.util.removeEventListener(document, "touchend", this.ontouchend);
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
 * @private
 */
Graph.prototype._unselectNodes = function(selection, triggerSelect) {
    var changed = false;
    var i, iMax, id;

    if (selection) {
        // remove provided selections
        for (i = 0, iMax = selection.length; i < iMax; i++) {
            id = selection[i];
            this.nodes[id].unselect();

            var j = 0;
            while (j < this.selection.length) {
                if (this.selection[j] == id) {
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
            id = this.selection[i];
            this.nodes[id].unselect();
            changed = true;
        }
        this.selection = [];
    }

    if (changed && (triggerSelect == true || triggerSelect == undefined)) {
        // fire the select event
        this._trigger('select');
    }

    return changed;
};

/**
 * select all nodes on given location x, y
 * @param {Array} selection   an array with node ids
 * @param {boolean} append    If true, the new selection will be appended to the
 *                            current selection (except for duplicate entries)
 * @return {Boolean} changed  True if the selection is changed
 * @private
 */
Graph.prototype._selectNodes = function(selection, append) {
    var changed = false;
    var i, iMax;

    // TODO: the selectNodes method is a little messy, rework this

    // check if the current selection equals the desired selection
    var selectionAlreadyThere = true;
    if (selection.length != this.selection.length) {
        selectionAlreadyThere = false;
    }
    else {
        for (i = 0, iMax = Math.min(selection.length, this.selection.length); i < iMax; i++) {
            if (selection[i] != this.selection[i]) {
                selectionAlreadyThere = false;
                break;
            }
        }
    }
    if (selectionAlreadyThere) {
        return changed;
    }

    if (append == undefined || append == false) {
        // first deselect any selected node
        var triggerSelect = false;
        changed = this._unselectNodes(undefined, triggerSelect);
    }

    for (i = 0, iMax = selection.length; i < iMax; i++) {
        // add each of the new selections, but only when they are not duplicate
        var id = selection[i];
        var isDuplicate = (this.selection.indexOf(id) != -1);
        if (!isDuplicate) {
            this.nodes[id].select();
            this.selection.push(id);
            changed = true;
        }
    }

    if (changed) {
        // fire the select event
        this._trigger('select');
    }

    return changed;
};

/**
 * retrieve all nodes overlapping with given object
 * @param {Object} obj  An object with parameters left, top, right, bottom
 * @return {Object[]}   An array with selection objects containing
 *                      the parameter row.
 * @private
 */
Graph.prototype._getNodesOverlappingWith = function (obj) {
    var nodes = this.nodes,
        overlappingNodes = [];

    for (var id in nodes) {
        if (nodes.hasOwnProperty(id)) {
            if (nodes[id].isOverlappingWith(obj)) {
                overlappingNodes.push(id);
            }
        }
    }

    return overlappingNodes;
};

/**
 * retrieve the currently selected nodes
 * @return {Number[] | String[]} selection    An array with the ids of the
 *                                            selected nodes.
 */
Graph.prototype.getSelection = function() {
    return this.selection.concat([]);
};

/**
 * select zero or more nodes
 * @param {Number[] | String[]} selection     An array with the ids of the
 *                                            selected nodes.
 */
Graph.prototype.setSelection = function(selection) {
    var i, iMax, id;

    if (selection.length == undefined)
        throw "Selection must be an array with ids";

    // first unselect any selected node
    for (i = 0, iMax = this.selection.length; i < iMax; i++) {
        id = this.selection[i];
        this.nodes[id].unselect();
    }

    this.selection = [];

    for (i = 0, iMax = selection.length; i < iMax; i++) {
        id = selection[i];

        var node = this.nodes[id];
        if (!node) {
            throw new RangeError('Node with id "' + id + '" not found');
        }
        node.select();
        this.selection.push(id);
    }

    this.redraw();
};

/**
 * Validate the selection: remove ids of nodes which no longer exist
 * @private
 */
Graph.prototype._updateSelection = function () {
    var i = 0;
    while (i < this.selection.length) {
        var id = this.selection[i];
        if (!this.nodes[id]) {
            this.selection.splice(i, 1);
        }
        else {
            i++;
        }
    }
};

/**
 * Temporary method to test calculating a hub value for the nodes
 * @param {number} level        Maximum number edges between two nodes in order
 *                              to call them connected. Optional, 1 by default
 * @return {Number[]} connectioncount array with the connection count
 *                                    for each node
 * @private
 */
Graph.prototype._getConnectionCount = function(level) {
    if (level == undefined) {
        level = 1;
    }

    // get the nodes connected to given nodes
    function getConnectedNodes(nodes) {
        var connectedNodes = [];

        for (var j = 0, jMax = nodes.length; j < jMax; j++) {
            var node = nodes[j];

            // find all nodes connected to this node
            var edges = node.edges;
            for (var i = 0, iMax = edges.length; i < iMax; i++) {
                var edge = edges[i];
                var other = null;

                // check if connected
                if (edge.from == node)
                    other = edge.to;
                else if (edge.to == node)
                    other = edge.from;

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
    var nodes = this.nodes;
    for (var id in nodes) {
        if (nodes.hasOwnProperty(id)) {
            var c = [nodes[id]];
            for (var l = 0; l < level; l++) {
                c = c.concat(getConnectedNodes(c));
            }
            connections.push(c);
        }
    }

    var hubs = [];
    for (var i = 0, len = connections.length; i < len; i++) {
        hubs.push(connections[i].length);
    }

    return hubs;
};


/**
 * Set a new size for the graph
 * @param {string} width   Width in pixels or percentage (for example "800px"
 *                         or "50%")
 * @param {string} height  Height in pixels or percentage  (for example "400px"
 *                         or "30%")
 */
Graph.prototype.setSize = function(width, height) {
    this.frame.style.width = width;
    this.frame.style.height = height;

    this.frame.canvas.style.width = "100%";
    this.frame.canvas.style.height = "100%";

    this.frame.canvas.width = this.frame.canvas.clientWidth;
    this.frame.canvas.height = this.frame.canvas.clientHeight;
};

/**
 * Set a data set with nodes for the graph
 * @param {Array | DataSet | DataView} nodes         The data containing the nodes.
 * @private
 */
Graph.prototype._setNodes = function(nodes) {
    var oldNodesData = this.nodesData;

    if (nodes instanceof DataSet || nodes instanceof DataView) {
        this.nodesData = nodes;
    }
    else if (nodes instanceof Array) {
        this.nodesData = new DataSet();
        this.nodesData.add(nodes);
    }
    else if (!nodes) {
        this.nodesData = new DataSet();
    }
    else {
        throw new TypeError('Array or DataSet expected');
    }

    if (oldNodesData) {
        // unsubscribe from old dataset
        util.forEach(this.nodesListeners, function (callback, event) {
            oldNodesData.unsubscribe(event, callback);
        });
    }

    // remove drawn nodes
    this.nodes = {};

    if (this.nodesData) {
        // subscribe to new dataset
        var me = this;
        util.forEach(this.nodesListeners, function (callback, event) {
            me.nodesData.subscribe(event, callback);
        });

        // draw all new nodes
        var ids = this.nodesData.getIds();
        this._addNodes(ids);
    }

    this._updateSelection();
};

/**
 * Add nodes
 * @param {Number[] | String[]} ids
 * @private
 */
Graph.prototype._addNodes = function(ids) {
    var id;
    for (var i = 0, len = ids.length; i < len; i++) {
        id = ids[i];
        var data = this.nodesData.get(id);
        var node = new Node(data, this.images, this.groups, this.constants);
        this.nodes[id] = node; // note: this may replace an existing node

        if (!node.isFixed()) {
            // TODO: position new nodes in a smarter way!
            var radius = this.constants.edges.length * 2;
            var count = ids.length;
            var angle = 2 * Math.PI * (i / count);
            node.x = radius * Math.cos(angle);
            node.y = radius * Math.sin(angle);

            // note: no not use node.isMoving() here, as that gives the current
            // velocity of the node, which is zero after creation of the node.
            this.moving = true;
        }
    }

    this._reconnectEdges();
    this._updateValueRange(this.nodes);
};

/**
 * Update existing nodes, or create them when not yet existing
 * @param {Number[] | String[]} ids
 * @private
 */
Graph.prototype._updateNodes = function(ids) {
    var nodes = this.nodes,
        nodesData = this.nodesData;
    for (var i = 0, len = ids.length; i < len; i++) {
        var id = ids[i];
        var node = nodes[id];
        var data = nodesData.get(id);
        if (node) {
            // update node
            node.setProperties(data, this.constants);
        }
        else {
            // create node
            node = new Node(properties, this.images, this.groups, this.constants);
            nodes[id] = node;

            if (!node.isFixed()) {
                this.moving = true;
            }
        }
    }

    this._reconnectEdges();
    this._updateValueRange(nodes);
};

/**
 * Remove existing nodes. If nodes do not exist, the method will just ignore it.
 * @param {Number[] | String[]} ids
 * @private
 */
Graph.prototype._removeNodes = function(ids) {
    var nodes = this.nodes;
    for (var i = 0, len = ids.length; i < len; i++) {
        var id = ids[i];
        delete nodes[id];
    }

    this._reconnectEdges();
    this._updateSelection();
    this._updateValueRange(nodes);
};

/**
 * Load edges by reading the data table
 * @param {Array | DataSet | DataView} edges    The data containing the edges.
 * @private
 * @private
 */
Graph.prototype._setEdges = function(edges) {
    var oldEdgesData = this.edgesData;

    if (edges instanceof DataSet || edges instanceof DataView) {
        this.edgesData = edges;
    }
    else if (edges instanceof Array) {
        this.edgesData = new DataSet();
        this.edgesData.add(edges);
    }
    else if (!edges) {
        this.edgesData = new DataSet();
    }
    else {
        throw new TypeError('Array or DataSet expected');
    }

    if (oldEdgesData) {
        // unsubscribe from old dataset
        util.forEach(this.edgesListeners, function (callback, event) {
            oldEdgesData.unsubscribe(event, callback);
        });
    }

    // remove drawn edges
    this.edges = {};

    if (this.edgesData) {
        // subscribe to new dataset
        var me = this;
        util.forEach(this.edgesListeners, function (callback, event) {
            me.edgesData.subscribe(event, callback);
        });

        // draw all new nodes
        var ids = this.edgesData.getIds();
        this._addEdges(ids);
    }

    this._reconnectEdges();
};

/**
 * Add edges
 * @param {Number[] | String[]} ids
 * @private
 */
Graph.prototype._addEdges = function (ids) {
    var edges = this.edges,
        edgesData = this.edgesData;
    for (var i = 0, len = ids.length; i < len; i++) {
        var id = ids[i];

        var oldEdge = edges[id];
        if (oldEdge) {
            oldEdge.disconnect();
        }

        var data = edgesData.get(id);
        edges[id] = new Edge(data, this, this.constants);
    }

    this.moving = true;
    this._updateValueRange(edges);
};

/**
 * Update existing edges, or create them when not yet existing
 * @param {Number[] | String[]} ids
 * @private
 */
Graph.prototype._updateEdges = function (ids) {
    var edges = this.edges,
        edgesData = this.edgesData;
    for (var i = 0, len = ids.length; i < len; i++) {
        var id = ids[i];

        var data = edgesData.get(id);
        var edge = edges[id];
        if (edge) {
            // update edge
            edge.disconnect();
            edge.setProperties(data, this.constants);
            edge.connect();
        }
        else {
            // create edge
            edge = new Edge(data, this, this.constants);
            this.edges[id] = edge;
        }
    }

    this.moving = true;
    this._updateValueRange(edges);
};

/**
 * Remove existing edges. Non existing ids will be ignored
 * @param {Number[] | String[]} ids
 * @private
 */
Graph.prototype._removeEdges = function (ids) {
    var edges = this.edges;
    for (var i = 0, len = ids.length; i < len; i++) {
        var id = ids[i];
        var edge = edges[id];
        if (edge) {
            edge.disconnect();
            delete edges[id];
        }
    }

    this.moving = true;
    this._updateValueRange(edges);
};

/**
 * Reconnect all edges
 * @private
 */
Graph.prototype._reconnectEdges = function() {
    var id,
        nodes = this.nodes,
        edges = this.edges;
    for (id in nodes) {
        if (nodes.hasOwnProperty(id)) {
            nodes[id].edges = [];
        }
    }

    for (id in edges) {
        if (edges.hasOwnProperty(id)) {
            var edge = edges[id];
            edge.from = null;
            edge.to = null;
            edge.connect();
        }
    }
};

/**
 * Update the values of all object in the given array according to the current
 * value range of the objects in the array.
 * @param {Object} obj    An object containing a set of Edges or Nodes
 *                        The objects must have a method getValue() and
 *                        setValueRange(min, max).
 * @private
 */
Graph.prototype._updateValueRange = function(obj) {
    var id;

    // determine the range of the objects
    var valueMin = undefined;
    var valueMax = undefined;
    for (id in obj) {
        if (obj.hasOwnProperty(id)) {
            var value = obj[id].getValue();
            if (value !== undefined) {
                valueMin = (valueMin === undefined) ? value : Math.min(value, valueMin);
                valueMax = (valueMax === undefined) ? value : Math.max(value, valueMax);
            }
        }
    }

    // adjust the range of all objects
    if (valueMin !== undefined && valueMax !== undefined) {
        for (id in obj) {
            if (obj.hasOwnProperty(id)) {
                obj[id].setValueRange(valueMin, valueMax);
            }
        }
    }
};

/**
 * Redraw the graph with the current data
 * chart will be resized too.
 */
Graph.prototype.redraw = function() {
    this.setSize(this.width, this.height);

    this._redraw();
};

/**
 * Redraw the graph with the current data
 * @private
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

    // restore original scaling and translation
    ctx.restore();
};

/**
 * Set the translation of the graph
 * @param {Number} offsetX    Horizontal offset
 * @param {Number} offsetY    Vertical offset
 * @private
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
 * @private
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
 * @private
 */
Graph.prototype._setScale = function(scale) {
    this.scale = scale;
};
/**
 * Get the current scale of  the graph
 * @return {Number} scale   Scaling factor 1.0 is unscaled
 * @private
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
 * Redraw all nodes
 * The 2d context of a HTML canvas can be retrieved by canvas.getContext("2d");
 * @param {CanvasRenderingContext2D}   ctx
 * @private
 */
Graph.prototype._drawNodes = function(ctx) {
    // first draw the unselected nodes
    var nodes = this.nodes;
    var selected = [];
    for (var id in nodes) {
        if (nodes.hasOwnProperty(id)) {
            if (nodes[id].isSelected()) {
                selected.push(id);
            }
            else {
                nodes[id].draw(ctx);
            }
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
 * @private
 */
Graph.prototype._drawEdges = function(ctx) {
    var edges = this.edges;
    for (var id in edges) {
        if (edges.hasOwnProperty(id)) {
            var edge = edges[id];
            if (edge.connected) {
                edges[id].draw(ctx);
            }
        }
    }
};

/**
 * Find a stable position for all nodes
 * @private
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
        stable = !this._isMoving(vmin);
        count++;
    }

    var end = new Date();

    // console.log("Stabilized in " + (end-start) + " ms, " + count + " iterations" ); // TODO: cleanup
};

/**
 * Calculate the external forces acting on the nodes
 * Forces are caused by: edges, repulsing forces between nodes, gravity
 * @private
 */
Graph.prototype._calculateForces = function() {
    // create a local edge to the nodes and edges, that is faster
    var id, dx, dy, angle, distance, fx, fy,
        repulsingForce, springForce, length, edgeLength,
        nodes = this.nodes,
        edges = this.edges;

    // gravity, add a small constant force to pull the nodes towards the center of
    // the graph
    // Also, the forces are reset to zero in this loop by using _setForce instead
    // of _addForce
    var gravity = 0.01,
        gx = this.frame.canvas.clientWidth / 2,
        gy = this.frame.canvas.clientHeight / 2;
    for (id in nodes) {
        if (nodes.hasOwnProperty(id)) {
            var node = nodes[id];
            dx = gx - node.x;
            dy = gy - node.y;
            angle = Math.atan2(dy, dx);
            fx = Math.cos(angle) * gravity;
            fy = Math.sin(angle) * gravity;

            node._setForce(fx, fy);
        }
    }

    // repulsing forces between nodes
    var minimumDistance = this.constants.nodes.distance,
        steepness = 10; // higher value gives steeper slope of the force around the given minimumDistance

    for (var id1 in nodes) {
        if (nodes.hasOwnProperty(id1)) {
            var node1 = nodes[id1];
            for (var id2 in nodes) {
                if (nodes.hasOwnProperty(id2)) {
                    var node2 = nodes[id2];
                    // calculate normally distributed force
                    dx = node2.x - node1.x;
                    dy = node2.y - node1.y;
                    distance = Math.sqrt(dx * dx + dy * dy);
                    angle = Math.atan2(dy, dx);

                    // TODO: correct factor for repulsing force
                    //repulsingForce = 2 * Math.exp(-5 * (distance * distance) / (dmin * dmin) ); // TODO: customize the repulsing force
                    //repulsingForce = Math.exp(-1 * (distance * distance) / (dmin * dmin) ); // TODO: customize the repulsing force
                    repulsingForce = 1 / (1 + Math.exp((distance / minimumDistance - 1) * steepness)); // TODO: customize the repulsing force
                    fx = Math.cos(angle) * repulsingForce;
                    fy = Math.sin(angle) * repulsingForce;

                    node1._addForce(-fx, -fy);
                    node2._addForce(fx, fy);
                }
            }
        }
    }

    /* TODO: re-implement repulsion of edges
    for (var n = 0; n < nodes.length; n++) {
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
    }
     */

    // forces caused by the edges, modelled as springs
    for (id in edges) {
        if (edges.hasOwnProperty(id)) {
            var edge = edges[id];
            if (edge.connected) {
                dx = (edge.to.x - edge.from.x);
                dy = (edge.to.y - edge.from.y);
                //edgeLength = (edge.from.width + edge.from.height + edge.to.width + edge.to.height)/2 || edge.length; // TODO: dmin
                //edgeLength = (edge.from.width + edge.to.width)/2 || edge.length; // TODO: dmin
                //edgeLength = 20 + ((edge.from.width + edge.to.width) || 0) / 2;
                edgeLength = edge.length;
                length =  Math.sqrt(dx * dx + dy * dy);
                angle = Math.atan2(dy, dx);

                springForce = edge.stiffness * (edgeLength - length);

                fx = Math.cos(angle) * springForce;
                fy = Math.sin(angle) * springForce;

                edge.from._addForce(-fx, -fy);
                edge.to._addForce(fx, fy);
            }
        }
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
 * @private
 */
Graph.prototype._isMoving = function(vmin) {
    // TODO: ismoving does not work well: should check the kinetic energy, not its velocity
    var nodes = this.nodes;
    for (var id in nodes) {
        if (nodes.hasOwnProperty(id) && nodes[id].isMoving(vmin)) {
            return true;
        }
    }
    return false;
};


/**
 * Perform one discrete step for all nodes
 * @private
 */
Graph.prototype._discreteStepNodes = function() {
    var interval = this.refreshRate / 1000.0; // in seconds
    var nodes = this.nodes;
    for (var id in nodes) {
        if (nodes.hasOwnProperty(id)) {
            nodes[id].discreteStep(interval);
        }
    }
};

/**
 * Start animating nodes and edges
 */
Graph.prototype.start = function() {
    if (this.moving) {
        this._calculateForces();
        this._discreteStepNodes();

        var vmin = this.constants.minVelocity;
        this.moving = this._isMoving(vmin);
    }

    if (this.moving) {
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
 * Stop animating nodes and edges.
 */
Graph.prototype.stop = function () {
    if (this.timer) {
        window.clearInterval(this.timer);
        this.timer = undefined;
    }
};

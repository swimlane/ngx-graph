var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
// rename transition due to conflict with d3 transition
import 'd3-transition';
import { animate, style, transition as ngTransition, trigger } from '@angular/animations';
import { ChangeDetectionStrategy, Component, ContentChild, ElementRef, EventEmitter, HostListener, Input, Output, QueryList, TemplateRef, ViewChild, ViewChildren, ViewEncapsulation } from '@angular/core';
import { BaseChartComponent, calculateViewDimensions, ChartComponent, ColorHelper } from '@swimlane/ngx-charts';
import { select } from 'd3-selection';
import * as shape from 'd3-shape';
import * as dagre from 'dagre';
import { Observable } from 'rxjs';
import { identity, scale, toSVG, transform, translate } from 'transformation-matrix';
import { id } from '../utils';
var defaultDagreLayout = {
    nodesep: 50,
    edgesep: 100,
    ranksep: 100,
    acyclicer: undefined,
    ranker: 'network-simplex',
    align: undefined
};
var GraphComponent = /** @class */ (function (_super) {
    __extends(GraphComponent, _super);
    function GraphComponent() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.nodes = [];
        _this.dataLinks = [];
        _this.links = [];
        _this.activeEntries = [];
        _this.orientation = 'LR';
        _this.draggingEnabled = true;
        _this.panningEnabled = true;
        _this.enableZoom = true;
        _this.zoomSpeed = 0.1;
        _this.minZoomLevel = 0.1;
        _this.maxZoomLevel = 4.0;
        _this.autoZoom = false;
        _this.panOnZoom = true;
        _this.autoCenter = false;
        _this.dagreLayout = defaultDagreLayout;
        _this.singleNodesPerLine = 1;
        _this.multigraph = false;
        _this.compound = false;
        _this.animate = true;
        _this.activate = new EventEmitter();
        _this.deactivate = new EventEmitter();
        _this.zoomChange = new EventEmitter();
        _this.subscriptions = [];
        _this.margin = [0, 0, 0, 0];
        _this.results = [];
        _this.isPanning = false;
        _this.isDragging = false;
        _this.isCustomNodeSize = false;
        _this.initialized = false;
        _this.graphDims = { width: 0, height: 0 };
        _this._oldLinks = [];
        _this.transformationMatrix = identity();
        _this._touchLastX = null;
        _this._touchLastY = null;
        _this.groupResultsBy = function (node) { return node.label; };
        return _this;
    }
    Object.defineProperty(GraphComponent.prototype, "zoomLevel", {
        /**
         * Get the current zoom level
         */
        get: function () {
            return this.transformationMatrix.a;
        },
        /**
         * Set the current zoom level
         */
        set: function (level) {
            this.zoomTo(Number(level));
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GraphComponent.prototype, "panOffsetX", {
        /**
         * Get the current `x` position of the graph
         */
        get: function () {
            return this.transformationMatrix.e;
        },
        /**
         * Set the current `x` position of the graph
         */
        set: function (x) {
            this.panTo(Number(x), null);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GraphComponent.prototype, "panOffsetY", {
        /**
         * Get the current `y` position of the graph
         */
        get: function () {
            return this.transformationMatrix.f;
        },
        /**
         * Set the current `y` position of the graph
         */
        set: function (y) {
            this.panTo(null, Number(y));
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Angular lifecycle event
     *
     *
     * @memberOf GraphComponent
     */
    GraphComponent.prototype.ngOnInit = function () {
        var _this = this;
        if (this.update$)
            this.subscriptions.push(this.update$.subscribe(function () {
                _this.update();
            }));
        if (this.center$)
            this.subscriptions.push(this.center$.subscribe(function () {
                _this.center();
            }));
        if (this.zoomToFit$)
            this.subscriptions.push(this.zoomToFit$.subscribe(function () {
                _this.zoomToFit();
            }));
        if (this.zoomToNode$)
            this.subscriptions.push(this.zoomToNode$.subscribe(function (nodeId) {
                _this.panToNodeId(nodeId);
            }));
    };
    /**
     * Angular lifecycle event
     *
     *
     * @memberOf GraphComponent
     */
    GraphComponent.prototype.ngOnDestroy = function () {
        _super.prototype.ngOnDestroy.call(this);
        for (var _i = 0, _a = this.subscriptions; _i < _a.length; _i++) {
            var sub = _a[_i];
            sub.unsubscribe();
        }
        this.subscriptions = null;
    };
    /**
     * Angular lifecycle event
     *
     *
     * @memberOf GraphComponent
     */
    GraphComponent.prototype.ngAfterViewInit = function () {
        var _this = this;
        _super.prototype.ngAfterViewInit.call(this);
        setTimeout(function () { return _this.update(); });
    };
    /**
     * Base class update implementation for the dag graph
     *
     *
     * @memberOf GraphComponent
     */
    GraphComponent.prototype.update = function () {
        var _this = this;
        _super.prototype.update.call(this);
        this.zone.run(function () {
            _this.dims = calculateViewDimensions({
                width: _this.width,
                height: _this.height,
                margins: _this.margin,
                showLegend: _this.legend
            });
            _this.seriesDomain = _this.getSeriesDomain();
            _this.setColors();
            _this.legendOptions = _this.getLegendOptions();
            _this.createGraph();
            _this.updateTransform();
            _this.initialized = true;
        });
    };
    /**
     * Draws the graph using dagre layouts
     *
     *
     * @memberOf GraphComponent
     */
    GraphComponent.prototype.draw = function () {
        var _this = this;
        // Calc view dims for the nodes
        if (this.nodeElements && this.nodeElements.length) {
            this.nodeElements.map(function (elem) {
                var nativeElement = elem.nativeElement;
                var node = _this._nodes.find(function (n) { return n.id === nativeElement.id; });
                // calculate the height
                var dims;
                try {
                    dims = nativeElement.getBBox();
                }
                catch (ex) {
                    // Skip drawing if element is not displayed - Firefox would throw an error here
                    return;
                }
                if (_this.nodeHeight) {
                    if (!_this.isCustomNodeSize) {
                        node.height = _this.nodeHeight;
                    }
                }
                else {
                    node.height = dims.height;
                }
                if (_this.nodeMaxHeight)
                    node.height = Math.max(node.height, _this.nodeMaxHeight);
                if (_this.nodeMinHeight)
                    node.height = Math.min(node.height, _this.nodeMinHeight);
                if (!_this.isCustomNodeSize) {
                    if (_this.nodeWidth) {
                        node.width = _this.nodeWidth;
                    }
                    else {
                        // calculate the width
                        if (nativeElement.getElementsByTagName('text').length) {
                            var maxTextDims = void 0;
                            try {
                                for (var _i = 0, _a = nativeElement.getElementsByTagName('text'); _i < _a.length; _i++) {
                                    var textElem = _a[_i];
                                    var currentBBox = textElem.getBBox();
                                    if (!maxTextDims) {
                                        maxTextDims = currentBBox;
                                    }
                                    else {
                                        if (currentBBox.width > maxTextDims.width) {
                                            maxTextDims.width = currentBBox.width;
                                        }
                                        if (currentBBox.height > maxTextDims.height) {
                                            maxTextDims.height = currentBBox.height;
                                        }
                                    }
                                }
                            }
                            catch (ex) {
                                // Skip drawing if element is not displayed - Firefox would throw an error here
                                return;
                            }
                            node.width = maxTextDims.width + 20;
                        }
                        else {
                            node.width = dims.width;
                        }
                    }
                }
                if (_this.nodeMaxWidth)
                    node.width = Math.max(node.width, _this.nodeMaxWidth);
                if (_this.nodeMinWidth)
                    node.width = Math.min(node.width, _this.nodeMinWidth);
            });
        }
        if (this.singleNodesPerLine > 1) {
            var singleNodesAmount = 0;
            var currentDestinationNode = void 0;
            var components = dagre.graphlib.alg.components(this.graph);
            var _loop_1 = function (i) {
                if (components[i].length > 1) {
                    return "continue";
                }
                singleNodesAmount++;
                singleNodesAmount = singleNodesAmount % this_1.singleNodesPerLine;
                // Starting a new nodes row by adding a new temp node
                if (singleNodesAmount === 1) {
                    currentDestinationNode = {
                        id: id(),
                        width: 20,
                        height: 30,
                    };
                    this_1.graph.setNode(currentDestinationNode.id, currentDestinationNode);
                }
                // Finding the single node element
                var removedNodeId = components[i][0];
                var currentSourceNode = this_1._nodes.find(function (n) { return n.id === removedNodeId; });
                // Connecting it to the last node in the row.
                this_1.graph.setEdge(currentSourceNode.id, currentDestinationNode.id);
                // Update last node in the row
                currentDestinationNode = currentSourceNode;
            };
            var this_1 = this;
            for (var i = 0; i < components.length; i++) {
                _loop_1(i);
            }
        }
        // Dagre to recalc the layout
        dagre.layout(this.graph);
        // Tranposes view options to the node
        var index = {};
        this._nodes.map(function (n) {
            index[n.id] = n;
            n.options = {
                color: _this.colors.getColor(_this.groupResultsBy(n)),
                transform: "translate(" + (n.x - n.width / 2 || 0) + ", " + (n.y - n.height / 2 || 0) + ")"
            };
        });
        // Update the labels to the new positions
        var newLinks = [];
        var _loop_2 = function (k) {
            var l = this_2.graph._edgeLabels[k];
            var normKey = k.replace(/[^\w-]*/g, '');
            var oldLink = this_2.multigraph ? this_2._oldLinks.find(function (ol) { return "" + ol.source + ol.target + ol.id === normKey; }) :
                this_2._oldLinks.find(function (ol) { return "" + ol.source + ol.target === normKey; });
            if (!oldLink) {
                oldLink = this_2.multigraph ? this_2._links.find(function (nl) { return "" + nl.source + nl.target + nl.id === normKey; }) :
                    this_2._links.find(function (nl) { return "" + nl.source + nl.target === normKey; });
            }
            // This is for supporting multiple single nodes in a row
            if (!oldLink) {
                return "continue";
            }
            oldLink.oldLine = oldLink.line;
            var points = l.points;
            var line = this_2.generateLine(points);
            var newLink = Object.assign({}, oldLink);
            newLink.line = line;
            newLink.points = points;
            var textPos = points[Math.floor(points.length / 2)];
            if (textPos) {
                newLink.textTransform = "translate(" + (textPos.x || 0) + "," + (textPos.y || 0) + ")";
            }
            newLink.textAngle = 0;
            if (!newLink.oldLine) {
                newLink.oldLine = newLink.line;
            }
            this_2.calcDominantBaseline(newLink);
            newLinks.push(newLink);
        };
        var this_2 = this;
        for (var k in this.graph._edgeLabels) {
            _loop_2(k);
        }
        this._links = newLinks;
        // Map the old links for animations
        if (this._links) {
            this._oldLinks = this._links.map(function (l) {
                var newL = Object.assign({}, l);
                newL.oldLine = l.line;
                return newL;
            });
        }
        // Calculate the height/width total
        this.graphDims.width = Math.max.apply(Math, this._nodes.map(function (n) { return n.x + n.width; }));
        this.graphDims.height = Math.max.apply(Math, this._nodes.map(function (n) { return n.y + n.height; }));
        if (this.autoZoom) {
            this.zoomToFit();
        }
        if (this.autoCenter) {
            // Auto-center when rendering
            this.center();
        }
        requestAnimationFrame(function () { return _this.redrawLines(_this.animate); });
        this.redrawDataLinks();
        this.cd.markForCheck();
    };
    /**
     * Redraws the lines when dragged or viewport updated
     *
     * @param {boolean} [animate=true]
     *
     * @memberOf GraphComponent
     */
    GraphComponent.prototype.redrawLines = function (_animate) {
        var _this = this;
        if (_animate === void 0) { _animate = true; }
        this.linkElements.map(function (linkEl) {
            var l = _this._links.find(function (lin) { return lin.id === linkEl.nativeElement.id; });
            if (!l)
                return;
            var linkSelection = select(linkEl.nativeElement).select('.line');
            linkSelection
                .attr('d', l.oldLine)
                .transition()
                .duration(_animate ? 500 : 0)
                .attr('d', l.line);
            var textPathSelection = select(_this.chartElement.nativeElement).select("#" + l.id);
            textPathSelection
                .attr('d', l.oldTextPath)
                .transition()
                .duration(_animate ? 500 : 0)
                .attr('d', l.textPath);
        });
    };
    GraphComponent.prototype.redrawDataLinks = function () {
        var _this = this;
        this.dataLinkElements.map(function (dataLinkEl) {
            // Finding the datalink element
            var datalink = _this._dataLinks.find(function (lin) { return lin.id === dataLinkEl.nativeElement.id; });
            if (!datalink)
                return;
            // Finding the line that we want to place it on.
            var line = _this._links.find(function (l) { return (l.source === datalink.source) && (l.target === datalink.target); });
            if (!line)
                return;
            var dataLinkUI = select(dataLinkEl.nativeElement).select('.linkDataUI');
            switch (line.points.length) {
                case 1:
                    break;
                case 2:
                    // Placing the link data template in the middle point between the start point and the end.
                    var middleX = (line.points[0].x + line.points[1].x) / 2;
                    var middleY = (line.points[0].y + line.points[1].y) / 2;
                    dataLinkUI.attr('transform', "translate(" + middleX + ", " + middleY + ")");
                    break;
                default:
                    // Placing the link data template in the middle point
                    var middlePointIndex = Math.floor(line.points.length / 2);
                    dataLinkUI.attr('transform', "translate(" + line.points[middlePointIndex].x + ", \n                                                  " + line.points[middlePointIndex].y + ")");
            }
        });
    };
    /**
     * Creates the dagre graph engine
     *
     *
     * @memberOf GraphComponent
     */
    GraphComponent.prototype.createGraph = function () {
        var _this = this;
        var graphParameters = {
            multigraph: this.multigraph,
            compound: this.compound
        };
        this.graph = new dagre.graphlib.Graph(graphParameters);
        this.graph.setGraph({
            rankdir: this.orientation,
            nodesep: this.dagreLayout.nodesep ? this.dagreLayout.nodesep : defaultDagreLayout.nodesep,
            edgesep: this.dagreLayout.edgesep ? this.dagreLayout.edgesep : defaultDagreLayout.edgesep,
            ranksep: this.dagreLayout.ranksep ? this.dagreLayout.ranksep : defaultDagreLayout.ranksep,
            acyclicer: this.dagreLayout.acyclicer ? this.dagreLayout.acyclicer : defaultDagreLayout.acyclicer,
            align: this.dagreLayout.align ? this.dagreLayout.align : defaultDagreLayout.align,
            ranker: this.dagreLayout.ranker ? this.dagreLayout.ranker : defaultDagreLayout.ranker,
            marginx: 20,
            marginy: 20,
        });
        // Default to assigning a new object as a label for each new edge.
        this.graph.setDefaultEdgeLabel(function () {
            return {};
        });
        this._nodes = this.nodes.map(function (n) {
            return Object.assign({}, n);
        });
        this._links = this.links.map(function (l) {
            var newLink = Object.assign({}, l);
            if (!newLink.id)
                newLink.id = id();
            return newLink;
        });
        this._dataLinks = this._links.map(function (l) {
            return Object.assign({}, l);
        });
        for (var _i = 0, _a = this._nodes; _i < _a.length; _i++) {
            var node = _a[_i];
            if (node.width && node.height) {
                this.isCustomNodeSize = true;
            }
            node.width = this.isCustomNodeSize ? node.width : 20;
            node.height = this.isCustomNodeSize ? node.height : 30;
            // update dagre
            this.graph.setNode(node.id, node);
            // set view options
            node.options = {
                color: this.colors.getColor(this.groupResultsBy(node)),
                transform: "translate( " + (node.x - node.width / 2 || 0) + ", " + (node.y - node.height / 2 || 0) + ")"
            };
        }
        // update dagre
        for (var _b = 0, _c = this._links; _b < _c.length; _b++) {
            var edge = _c[_b];
            this.multigraph ? this.graph.setEdge(edge.source, edge.target, edge, edge.id) :
                this.graph.setEdge(edge.source, edge.target);
        }
        requestAnimationFrame(function () { return _this.draw(); });
    };
    /**
     * Calculate the text directions / flipping
     *
     * @param {any} link
     *
     * @memberOf GraphComponent
     */
    GraphComponent.prototype.calcDominantBaseline = function (link) {
        var firstPoint = link.points[0];
        var lastPoint = link.points[link.points.length - 1];
        link.oldTextPath = link.textPath;
        if (lastPoint.x < firstPoint.x) {
            link.dominantBaseline = 'text-before-edge';
            // reverse text path for when its flipped upside down
            link.textPath = this.generateLine(link.points.slice().reverse());
        }
        else {
            link.dominantBaseline = 'text-after-edge';
            link.textPath = link.line;
        }
    };
    /**
     * Generate the new line path
     *
     * @param {any} points
     * @returns {*}
     *
     * @memberOf GraphComponent
     */
    GraphComponent.prototype.generateLine = function (points) {
        var lineFunction = shape
            .line()
            .x(function (d) { return d.x; })
            .y(function (d) { return d.y; })
            .curve(this.curve);
        return lineFunction(points);
    };
    /**
     * Zoom was invoked from event
     *
     * @param {MouseEvent} $event
     * @param {any} direction
     *
     * @memberOf GraphComponent
     */
    GraphComponent.prototype.onZoom = function ($event, direction) {
        var zoomFactor = 1 + (direction === 'in' ? this.zoomSpeed : -this.zoomSpeed);
        // Check that zooming wouldn't put us out of bounds
        var newZoomLevel = this.zoomLevel * zoomFactor;
        if (newZoomLevel <= this.minZoomLevel || newZoomLevel >= this.maxZoomLevel) {
            return;
        }
        // Check if zooming is enabled or not
        if (!this.enableZoom) {
            return;
        }
        if (this.panOnZoom === true && $event) {
            // Absolute mouse X/Y on the screen
            var mouseX = $event.clientX;
            var mouseY = $event.clientY;
            // Transform the mouse X/Y into a SVG X/Y
            var svg = this.chart.nativeElement.querySelector('svg');
            var svgGroup = svg.querySelector('g.chart');
            var point = svg.createSVGPoint();
            point.x = mouseX;
            point.y = mouseY;
            var svgPoint = point.matrixTransform(svgGroup.getScreenCTM().inverse());
            // Panzoom
            this.pan(svgPoint.x, svgPoint.y, true);
            this.zoom(zoomFactor);
            this.pan(-svgPoint.x, -svgPoint.y, true);
        }
        else {
            this.zoom(zoomFactor);
        }
    };
    /**
     * Pan by x/y
     *
     * @param x
     * @param y
     */
    GraphComponent.prototype.pan = function (x, y, ignoreZoomLevel) {
        if (ignoreZoomLevel === void 0) { ignoreZoomLevel = false; }
        var zoomLevel = ignoreZoomLevel ? 1 : this.zoomLevel;
        this.transformationMatrix = transform(this.transformationMatrix, translate(x / zoomLevel, y / zoomLevel));
        this.updateTransform();
    };
    /**
     * Pan to a fixed x/y
     *
     * @param x
     * @param y
     */
    GraphComponent.prototype.panTo = function (x, y) {
        if (x === null || x === undefined || isNaN(x) || y === null || y === undefined || isNaN(y)) {
            return;
        }
        var panX = -this.panOffsetX - x * this.zoomLevel + this.dims.width / 2;
        var panY = -this.panOffsetY - y * this.zoomLevel + this.dims.height / 2;
        this.transformationMatrix = transform(this.transformationMatrix, translate(panX / this.zoomLevel, panY / this.zoomLevel));
        this.updateTransform();
    };
    /**
     * Zoom by a factor
     *
     * @param factor Zoom multiplicative factor (1.1 for zooming in 10%, for instance)
     */
    GraphComponent.prototype.zoom = function (factor) {
        this.transformationMatrix = transform(this.transformationMatrix, scale(factor, factor));
        this.zoomChange.emit(this.zoomLevel);
        this.updateTransform();
    };
    /**
     * Zoom to a fixed level
     *
     * @param level
     */
    GraphComponent.prototype.zoomTo = function (level) {
        this.transformationMatrix.a = isNaN(level) ? this.transformationMatrix.a : Number(level);
        this.transformationMatrix.d = isNaN(level) ? this.transformationMatrix.d : Number(level);
        this.zoomChange.emit(this.zoomLevel);
        this.updateTransform();
    };
    /**
     * Pan was invoked from event
     *
     * @param {any} event
     *
     * @memberOf GraphComponent
     */
    GraphComponent.prototype.onPan = function (event) {
        this.pan(event.movementX, event.movementY);
    };
    /**
     * Drag was invoked from an event
     *
     * @param {any} event
     *
     * @memberOf GraphComponent
     */
    GraphComponent.prototype.onDrag = function (event) {
        var node = this.draggingNode;
        node.x += event.movementX / this.zoomLevel;
        node.y += event.movementY / this.zoomLevel;
        // move the node
        var x = node.x - node.width / 2;
        var y = node.y - node.height / 2;
        node.options.transform = "translate(" + x + ", " + y + ")";
        var _loop_3 = function (link) {
            if (link.target === node.id || link.source === node.id) {
                var sourceNode = this_3._nodes.find(function (n) { return n.id === link.source; });
                var targetNode = this_3._nodes.find(function (n) { return n.id === link.target; });
                // determine new arrow position
                var dir = sourceNode.y <= targetNode.y ? -1 : 1;
                var startingPoint = {
                    x: sourceNode.x,
                    y: sourceNode.y - dir * (sourceNode.height / 2)
                };
                var endingPoint = {
                    x: targetNode.x,
                    y: targetNode.y + dir * (targetNode.height / 2)
                };
                // generate new points
                link.points = [startingPoint, endingPoint];
                var line = this_3.generateLine(link.points);
                this_3.calcDominantBaseline(link);
                link.oldLine = link.line;
                link.line = line;
            }
        };
        var this_3 = this;
        for (var _i = 0, _a = this._links; _i < _a.length; _i++) {
            var link = _a[_i];
            _loop_3(link);
        }
        this.redrawLines(false);
        this.redrawDataLinks();
    };
    /**
     * Update the entire view for the new pan position
     *
     *
     * @memberOf GraphComponent
     */
    GraphComponent.prototype.updateTransform = function () {
        this.transform = toSVG(this.transformationMatrix);
    };
    /**
     * Node was clicked
     *
     * @param {any} event
     * @returns {void}
     *
     * @memberOf GraphComponent
     */
    GraphComponent.prototype.onClick = function (event) {
        this.select.emit(event);
    };
    /**
     * Node was focused
     *
     * @param {any} event
     * @returns {void}
     *
     * @memberOf GraphComponent
     */
    GraphComponent.prototype.onActivate = function (event) {
        if (this.activeEntries.indexOf(event) > -1)
            return;
        this.activeEntries = [event].concat(this.activeEntries);
        this.activate.emit({ value: event, entries: this.activeEntries });
    };
    /**
     * Node was defocused
     *
     * @param {any} event
     *
     * @memberOf GraphComponent
     */
    GraphComponent.prototype.onDeactivate = function (event) {
        var idx = this.activeEntries.indexOf(event);
        this.activeEntries.splice(idx, 1);
        this.activeEntries = this.activeEntries.slice();
        this.deactivate.emit({ value: event, entries: this.activeEntries });
    };
    /**
     * Get the domain series for the nodes
     *
     * @returns {any[]}
     *
     * @memberOf GraphComponent
     */
    GraphComponent.prototype.getSeriesDomain = function () {
        var _this = this;
        return this.nodes
            .map(function (d) { return _this.groupResultsBy(d); })
            .reduce(function (nodes, node) { return (nodes.includes(node) ? nodes : nodes.concat([node])); }, [])
            .sort();
    };
    /**
     * Tracking for the link
     *
     * @param {any} index
     * @param {any} link
     * @returns {*}
     *
     * @memberOf GraphComponent
     */
    GraphComponent.prototype.trackLinkBy = function (index, link) {
        return link.id;
    };
    /**
     * Tracking for the node
     *
     * @param {any} index
     * @param {any} node
     * @returns {*}
     *
     * @memberOf GraphComponent
     */
    GraphComponent.prototype.trackNodeBy = function (index, node) {
        return node.id;
    };
    /**
     * Sets the colors the nodes
     *
     *
     * @memberOf GraphComponent
     */
    GraphComponent.prototype.setColors = function () {
        this.colors = new ColorHelper(this.scheme, 'ordinal', this.seriesDomain, this.customColors);
    };
    /**
     * Gets the legend options
     *
     * @returns {*}
     *
     * @memberOf GraphComponent
     */
    GraphComponent.prototype.getLegendOptions = function () {
        return {
            scaleType: 'ordinal',
            domain: this.seriesDomain,
            colors: this.colors
        };
    };
    /**
     * On mouse move event, used for panning and dragging.
     *
     * @param {MouseEvent} $event
     *
     * @memberOf GraphComponent
     */
    GraphComponent.prototype.onMouseMove = function ($event) {
        if (this.isPanning && this.panningEnabled) {
            this.onPan($event);
        }
        else if (this.isDragging && this.draggingEnabled) {
            this.onDrag($event);
        }
    };
    /**
     * On touch start event to enable panning.
     *
     * @param {TouchEvent} $event
     *
     * @memberOf GraphComponent
     */
    GraphComponent.prototype.onTouchStart = function (event) {
        this._touchLastX = event.changedTouches[0].clientX;
        this._touchLastY = event.changedTouches[0].clientY;
        this.isPanning = true;
    };
    /**
     * On touch move event, used for panning.
     *
     * @param {TouchEvent} $event
     *
     * @memberOf GraphComponent
     */
    GraphComponent.prototype.onTouchMove = function (event) {
        var $event = event;
        if (this.isPanning && this.panningEnabled) {
            var clientX = $event.changedTouches[0].clientX;
            var clientY = $event.changedTouches[0].clientY;
            var movementX = clientX - this._touchLastX;
            var movementY = clientY - this._touchLastY;
            this._touchLastX = clientX;
            this._touchLastY = clientY;
            this.pan(movementX, movementY);
        }
    };
    /**
     * On touch end event to disable panning.
     *
     * @param {TouchEvent} $event
     *
     * @memberOf GraphComponent
     */
    GraphComponent.prototype.onTouchEnd = function (event) {
        this.isPanning = false;
    };
    /**
     * On mouse up event to disable panning/dragging.
     *
     * @param {MouseEvent} $event
     *
     * @memberOf GraphComponent
     */
    GraphComponent.prototype.onMouseUp = function ($event) {
        this.isDragging = false;
        this.isPanning = false;
    };
    /**
     * On node mouse down to kick off dragging
     *
     * @param {MouseEvent} event
     * @param {*} node
     *
     * @memberOf GraphComponent
     */
    GraphComponent.prototype.onNodeMouseDown = function (event, node) {
        this.isDragging = true;
        this.draggingNode = node;
    };
    /**
     * Center the graph in the viewport
     */
    GraphComponent.prototype.center = function () {
        this.panTo(this.graphDims.width / 2, this.graphDims.height / 2);
    };
    /**
     * Zooms to fit the entire graph
     */
    GraphComponent.prototype.zoomToFit = function () {
        var heightZoom = this.dims.height / this.graphDims.height;
        var widthZoom = this.dims.width / this.graphDims.width;
        var zoomLevel = Math.min(heightZoom, widthZoom, 1);
        if (zoomLevel <= this.minZoomLevel || zoomLevel >= this.maxZoomLevel) {
            return;
        }
        if (zoomLevel !== this.zoomLevel) {
            this.zoomLevel = zoomLevel;
            this.updateTransform();
            this.zoomChange.emit(this.zoomLevel);
        }
    };
    GraphComponent.prototype.panToNodeId = function (nodeId) {
        var node = this._nodes.find(function (n) { return n.id === nodeId; });
        if (!node) {
            return;
        }
        this.panTo(node.x, node.y);
    };
    GraphComponent.decorators = [
        { type: Component, args: [{
                    selector: 'ngx-graph',
                    styleUrls: ['./graph.component.css'],
                    encapsulation: ViewEncapsulation.None,
                    changeDetection: ChangeDetectionStrategy.OnPush,
                    animations: [trigger('link', [ngTransition('* => *', [animate(500, style({ transform: '*' }))])])],
                    template: "\n    <ngx-charts-chart\n      [view]=\"[width, height]\"\n      [showLegend]=\"legend\"\n      [legendOptions]=\"legendOptions\"\n      (legendLabelClick)=\"onClick($event)\"\n      (legendLabelActivate)=\"onActivate($event)\"\n      (legendLabelDeactivate)=\"onDeactivate($event)\"\n      mouseWheel\n      (mouseWheelUp)=\"onZoom($event, 'in')\"\n      (mouseWheelDown)=\"onZoom($event, 'out')\"\n    >\n      <svg:g\n        *ngIf=\"initialized\"\n        [attr.transform]=\"transform\"\n        (touchstart)=\"onTouchStart($event)\"\n        (touchend)=\"onTouchEnd($event)\"\n        class=\"graph chart\"\n      >\n        <defs>\n          <ng-template *ngIf=\"defsTemplate\" [ngTemplateOutlet]=\"defsTemplate\"></ng-template>\n          <svg:path\n            class=\"text-path\"\n            *ngFor=\"let link of _links\"\n            [attr.d]=\"link.textPath\"\n            [attr.id]=\"link.id\"\n          ></svg:path>\n        </defs>\n        <svg:rect\n          class=\"panning-rect\"\n          [attr.width]=\"dims.width * 100\"\n          [attr.height]=\"dims.height * 100\"\n          [attr.transform]=\"'translate(' + (-dims.width || 0) * 50 + ',' + (-dims.height || 0) * 50 + ')'\"\n          (mousedown)=\"isPanning = true\"\n        />\n        <svg:g class=\"links\">\n          <svg:g *ngFor=\"let link of _links; trackBy: trackLinkBy\" class=\"link-group\" #linkElement [id]=\"link.id\">\n            <ng-template\n              *ngIf=\"linkTemplate\"\n              [ngTemplateOutlet]=\"linkTemplate\"\n              [ngTemplateOutletContext]=\"{ $implicit: link }\"\n            ></ng-template>\n            <svg:path *ngIf=\"!linkTemplate\" class=\"edge\" [attr.d]=\"link.line\" />\n          </svg:g>\n        </svg:g>\n        <svg:g class=\"datalinks\" *ngIf=\"linkDataTemplate\">\n          <svg:g *ngFor=\"let datalink of _dataLinks; trackBy: trackNodeBy\" class=\"datalink-group\" \n                  #datalinkElement [id]=\"datalink.id\">\n            <ng-template\n              [ngTemplateOutlet]=\"linkDataTemplate\"\n              [ngTemplateOutletContext]=\"{ $implicit: datalink }\"\n            ></ng-template>\n          </svg:g>\n        </svg:g>\n        <svg:g class=\"nodes\">\n          <svg:g\n            *ngFor=\"let node of _nodes; trackBy: trackNodeBy\"\n            class=\"node-group\"\n            #nodeElement\n            [id]=\"node.id\"\n            [attr.transform]=\"node.options.transform\"\n            (click)=\"onClick(node)\"\n            (mousedown)=\"onNodeMouseDown($event, node)\"\n          >\n            <ng-template\n              *ngIf=\"nodeTemplate\"\n              [ngTemplateOutlet]=\"nodeTemplate\"\n              [ngTemplateOutletContext]=\"{ $implicit: node }\"\n            ></ng-template>\n            <svg:circle\n              *ngIf=\"!nodeTemplate\"\n              r=\"10\"\n              [attr.cx]=\"node.width / 2\"\n              [attr.cy]=\"node.height / 2\"\n              [attr.fill]=\"node.options.color\"\n            />\n          </svg:g>\n        </svg:g>\n      </svg:g>\n    </ngx-charts-chart>\n  "
                },] },
    ];
    GraphComponent.propDecorators = {
        legend: [{ type: Input }],
        nodes: [{ type: Input }],
        dataLinks: [{ type: Input }],
        links: [{ type: Input }],
        activeEntries: [{ type: Input }],
        orientation: [{ type: Input }],
        curve: [{ type: Input }],
        draggingEnabled: [{ type: Input }],
        nodeHeight: [{ type: Input }],
        nodeMaxHeight: [{ type: Input }],
        nodeMinHeight: [{ type: Input }],
        nodeWidth: [{ type: Input }],
        nodeMinWidth: [{ type: Input }],
        nodeMaxWidth: [{ type: Input }],
        panningEnabled: [{ type: Input }],
        enableZoom: [{ type: Input }],
        zoomSpeed: [{ type: Input }],
        minZoomLevel: [{ type: Input }],
        maxZoomLevel: [{ type: Input }],
        autoZoom: [{ type: Input }],
        panOnZoom: [{ type: Input }],
        autoCenter: [{ type: Input }],
        update$: [{ type: Input }],
        center$: [{ type: Input }],
        zoomToFit$: [{ type: Input }],
        zoomToNode$: [{ type: Input }],
        dagreLayout: [{ type: Input }],
        singleNodesPerLine: [{ type: Input }],
        multigraph: [{ type: Input }],
        compound: [{ type: Input }],
        animate: [{ type: Input }],
        activate: [{ type: Output }],
        deactivate: [{ type: Output }],
        zoomChange: [{ type: Output }],
        linkTemplate: [{ type: ContentChild, args: ['linkTemplate',] }],
        nodeTemplate: [{ type: ContentChild, args: ['nodeTemplate',] }],
        defsTemplate: [{ type: ContentChild, args: ['defsTemplate',] }],
        linkDataTemplate: [{ type: ContentChild, args: ['linkDataTemplate',] }],
        chart: [{ type: ViewChild, args: [ChartComponent, { read: ElementRef },] }],
        nodeElements: [{ type: ViewChildren, args: ['nodeElement',] }],
        linkElements: [{ type: ViewChildren, args: ['linkElement',] }],
        dataLinkElements: [{ type: ViewChildren, args: ['datalinkElement',] }],
        groupResultsBy: [{ type: Input }],
        zoomLevel: [{ type: Input, args: ['zoomLevel',] }],
        panOffsetX: [{ type: Input, args: ['panOffsetX',] }],
        panOffsetY: [{ type: Input, args: ['panOffsetY',] }],
        onMouseMove: [{ type: HostListener, args: ['document:mousemove', ['$event'],] }],
        onTouchMove: [{ type: HostListener, args: ['document:touchmove', ['$event'],] }],
        onMouseUp: [{ type: HostListener, args: ['document:mouseup',] }]
    };
    return GraphComponent;
}(BaseChartComponent));
export { GraphComponent };
//# sourceMappingURL=graph.component.js.map
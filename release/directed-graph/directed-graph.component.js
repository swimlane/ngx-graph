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
import { Component, ContentChild, ElementRef, HostListener, Input, ViewChild, ViewChildren, Output, ViewEncapsulation, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { animate, style, transition, trigger } from '@angular/animations';
import { BaseChartComponent, ChartComponent, calculateViewDimensions, ColorHelper } from '@swimlane/ngx-charts';
import { select } from 'd3-selection';
import * as shape from 'd3-shape';
import * as dagre from 'dagre';
import { id } from '../utils';
var DirectedGraphComponent = (function (_super) {
    __extends(DirectedGraphComponent, _super);
    function DirectedGraphComponent() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.nodes = [];
        _this.links = [];
        _this.activeEntries = [];
        _this.orientation = 'LR';
        _this.draggingEnabled = true;
        _this.panOffsetX = 0;
        _this.panOffsetY = 0;
        _this.panningEnabled = true;
        _this.zoomLevel = 1;
        _this.zoomSpeed = 0.1;
        _this.minZoomLevel = 0.1;
        _this.maxZoomLevel = 4.0;
        _this.activate = new EventEmitter();
        _this.deactivate = new EventEmitter();
        _this.margin = [0, 0, 0, 0];
        _this.results = [];
        _this.isPanning = false;
        _this.isDragging = false;
        _this.initialized = false;
        _this.graphDims = { width: 0, height: 0 };
        _this._oldLinks = [];
        _this.groupResultsBy = function (node) { return node.label; };
        return _this;
    }
    /**
     * Angular lifecycle event
     *
     *
     * @memberOf DirectedGraphComponent
     */
    DirectedGraphComponent.prototype.ngAfterViewInit = function () {
        var _this = this;
        _super.prototype.ngAfterViewInit.call(this);
        setTimeout(function () { return _this.update(); });
    };
    /**
     * Base class update implementation for the dag graph
     *
     *
     * @memberOf DirectedGraphComponent
     */
    DirectedGraphComponent.prototype.update = function () {
        var _this = this;
        _super.prototype.update.call(this);
        this.zone.run(function () {
            _this.dims = calculateViewDimensions({
                width: _this.width,
                height: _this.height,
                margins: _this.margin,
                showLegend: _this.legend,
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
     * @memberOf DirectedGraphComponent
     */
    DirectedGraphComponent.prototype.draw = function () {
        var _this = this;
        // Calc view dims for the nodes
        if (this.nodeElements && this.nodeElements.length) {
            this.nodeElements.map(function (elem) {
                var nativeElement = elem.nativeElement;
                var node = _this._nodes.find(function (n) { return n.id === nativeElement.id; });
                // calculate the height
                var dims = nativeElement.getBBox();
                if (_this.nodeHeight) {
                    node.height = _this.nodeHeight;
                }
                else {
                    node.height = dims.height;
                }
                if (_this.nodeMaxHeight)
                    node.height = Math.max(node.height, _this.nodeMaxHeight);
                if (_this.nodeMinHeight)
                    node.height = Math.min(node.height, _this.nodeMinHeight);
                if (_this.nodeWidth) {
                    node.width = _this.nodeWidth;
                }
                else {
                    // calculate the width
                    if (nativeElement.getElementsByTagName('text').length) {
                        var textDims = nativeElement.getElementsByTagName('text')[0].getBBox();
                        node.width = textDims.width + 20;
                    }
                    else {
                        node.width = dims.width;
                    }
                }
                if (_this.nodeMaxWidth)
                    node.width = Math.max(node.width, _this.nodeMaxWidth);
                if (_this.nodeMinWidth)
                    node.width = Math.min(node.width, _this.nodeMinWidth);
            });
        }
        // Dagre to recalc the layout
        dagre.layout(this.graph);
        // Tranposes view options to the node
        var index = {};
        this._nodes.map(function (n) {
            index[n.id] = n;
            n.options = {
                color: _this.colors.getColor(_this.groupResultsBy(n)),
                transform: "translate(" + (n.x - n.width / 2) + ", " + (n.y - n.height / 2) + ")"
            };
        });
        // Update the labels to the new positions
        var newLinks = [];
        var _loop_1 = function (k) {
            var l = this_1.graph._edgeLabels[k];
            var normKey = k.replace(/[^\w]*/g, '');
            var oldLink = this_1._oldLinks.find(function (ol) { return "" + ol.source + ol.target === normKey; });
            if (!oldLink) {
                oldLink = this_1._links.find(function (nl) { return "" + nl.source + nl.target === normKey; });
            }
            oldLink.oldLine = oldLink.line;
            var points = l.points;
            var line = this_1.generateLine(points);
            var newLink = Object.assign({}, oldLink);
            newLink.line = line;
            newLink.points = points;
            var textPos = points[Math.floor(points.length / 2)];
            if (textPos) {
                newLink.textTransform = "translate(" + textPos.x + "," + textPos.y + ")";
            }
            newLink.textAngle = 0;
            if (!newLink.oldLine) {
                newLink.oldLine = newLink.line;
            }
            this_1.calcDominantBaseline(newLink);
            newLinks.push(newLink);
        };
        var this_1 = this;
        for (var k in this.graph._edgeLabels) {
            _loop_1(k);
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
        this.graphDims.width = Math.max.apply(Math, this._nodes.map(function (n) { return n.x; }));
        this.graphDims.height = Math.max.apply(Math, this._nodes.map(function (n) { return n.y; }));
        requestAnimationFrame(function () { return _this.redrawLines(); });
        this.cd.markForCheck();
    };
    /**
     * Redraws the lines when dragged or viewport updated
     *
     * @param {boolean} [animate=true]
     *
     * @memberOf DirectedGraphComponent
     */
    DirectedGraphComponent.prototype.redrawLines = function (_animate) {
        var _this = this;
        if (_animate === void 0) { _animate = true; }
        this.linkElements.map(function (linkEl) {
            var l = _this._links.find(function (lin) { return lin.id === linkEl.nativeElement.id; });
            if (l) {
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
            }
        });
    };
    /**
     * Creates the dagre graph engine
     *
     *
     * @memberOf DirectedGraphComponent
     */
    DirectedGraphComponent.prototype.createGraph = function () {
        var _this = this;
        this.graph = new dagre.graphlib.Graph();
        this.graph.setGraph({
            rankdir: this.orientation,
            marginx: 20,
            marginy: 20,
            edgesep: 100,
            ranksep: 100
            // acyclicer: 'greedy',
            // ranker: 'longest-path'
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
        for (var _i = 0, _a = this._nodes; _i < _a.length; _i++) {
            var node = _a[_i];
            node.width = 20;
            node.height = 30;
            // update dagre
            this.graph.setNode(node.id, node);
            // set view options
            node.options = {
                color: this.colors.getColor(this.groupResultsBy(node)),
                transform: "translate( " + (node.x - node.width / 2) + ", " + (node.y - node.height / 2) + ")"
            };
        }
        // update dagre
        for (var _b = 0, _c = this._links; _b < _c.length; _b++) {
            var edge = _c[_b];
            this.graph.setEdge(edge.source, edge.target);
        }
        requestAnimationFrame(function () { return _this.draw(); });
    };
    /**
     * Calculate the text directions / flipping
     *
     * @param {any} link
     *
     * @memberOf DirectedGraphComponent
     */
    DirectedGraphComponent.prototype.calcDominantBaseline = function (link) {
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
     * @memberOf DirectedGraphComponent
     */
    DirectedGraphComponent.prototype.generateLine = function (points) {
        var lineFunction = shape.line().x(function (d) { return d.x; }).y(function (d) { return d.y; }).curve(this.curve);
        return lineFunction(points);
    };
    /**
     * Zoom was invoked from event
     *
     * @param {MouseEvent} $event
     * @param {any} direction
     *
     * @memberOf DirectedGraphComponent
     */
    DirectedGraphComponent.prototype.onZoom = function ($event, direction) {
        if (direction === 'in') {
            this.zoomLevel += this.zoomSpeed;
        }
        else {
            this.zoomLevel -= this.zoomSpeed;
        }
        this.zoomLevel = Math.max(this.zoomLevel, this.minZoomLevel);
        this.zoomLevel = Math.min(this.zoomLevel, this.maxZoomLevel);
        this.updateTransform();
    };
    /**
     * Pan was invoked from event
     *
     * @param {any} event
     *
     * @memberOf DirectedGraphComponent
     */
    DirectedGraphComponent.prototype.onPan = function (event) {
        this.panOffsetX += event.movementX;
        this.panOffsetY += event.movementY;
        this.updateTransform();
    };
    /**
     * Drag was invoked from an event
     *
     * @param {any} event
     *
     * @memberOf DirectedGraphComponent
     */
    DirectedGraphComponent.prototype.onDrag = function (event) {
        var node = this.draggingNode;
        node.x += event.movementX / this.zoomLevel;
        node.y += event.movementY / this.zoomLevel;
        // move the node
        var x = (node.x - (node.width / 2));
        var y = (node.y - (node.height / 2));
        node.options.transform = "translate(" + x + ", " + y + ")";
        var _loop_2 = function (link) {
            if (link.target === node.id || link.source === node.id) {
                var sourceNode = this_2._nodes.find(function (n) { return n.id === link.source; });
                var targetNode = this_2._nodes.find(function (n) { return n.id === link.target; });
                // determine new arrow position
                var dir = sourceNode.y <= targetNode.y ? -1 : 1;
                var startingPoint = { x: sourceNode.x, y: (sourceNode.y - dir * (sourceNode.height / 2)) };
                var endingPoint = { x: targetNode.x, y: (targetNode.y + dir * (targetNode.height / 2)) };
                // generate new points
                link.points = [startingPoint, endingPoint];
                var line = this_2.generateLine(link.points);
                this_2.calcDominantBaseline(link);
                link.oldLine = link.line;
                link.line = line;
            }
        };
        var this_2 = this;
        for (var _i = 0, _a = this._links; _i < _a.length; _i++) {
            var link = _a[_i];
            _loop_2(link);
        }
        this.redrawLines(false);
    };
    /**
     * Update the entire view for the new pan position
     *
     *
     * @memberOf DirectedGraphComponent
     */
    DirectedGraphComponent.prototype.updateTransform = function () {
        this.transform = "\n      translate(" + this.panOffsetX + ", " + this.panOffsetY + ") scale(" + this.zoomLevel + ")\n    ";
    };
    /**
     * Node was clicked
     *
     * @param {any} event
     * @returns {void}
     *
     * @memberOf DirectedGraphComponent
     */
    DirectedGraphComponent.prototype.onClick = function (event) {
        this.select.emit(event);
    };
    /**
     * Node was focused
     *
     * @param {any} event
     * @returns {void}
     *
     * @memberOf DirectedGraphComponent
     */
    DirectedGraphComponent.prototype.onActivate = function (event) {
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
     * @memberOf DirectedGraphComponent
     */
    DirectedGraphComponent.prototype.onDeactivate = function (event) {
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
     * @memberOf DirectedGraphComponent
     */
    DirectedGraphComponent.prototype.getSeriesDomain = function () {
        var _this = this;
        return this.nodes.map(function (d) { return _this.groupResultsBy(d); })
            .reduce(function (nodes, node) { return nodes.includes(node) ? nodes : nodes.concat([node]); }, [])
            .sort();
    };
    /**
     * Tracking for the link
     *
     * @param {any} index
     * @param {any} link
     * @returns {*}
     *
     * @memberOf DirectedGraphComponent
     */
    DirectedGraphComponent.prototype.trackLinkBy = function (index, link) {
        return link.id;
    };
    /**
     * Tracking for the node
     *
     * @param {any} index
     * @param {any} node
     * @returns {*}
     *
     * @memberOf DirectedGraphComponent
     */
    DirectedGraphComponent.prototype.trackNodeBy = function (index, node) {
        return node.id;
    };
    /**
     * Sets the colors the nodes
     *
     *
     * @memberOf DirectedGraphComponent
     */
    DirectedGraphComponent.prototype.setColors = function () {
        this.colors = new ColorHelper(this.scheme, 'ordinal', this.seriesDomain, this.customColors);
    };
    /**
     * Gets the legend options
     *
     * @returns {*}
     *
     * @memberOf DirectedGraphComponent
     */
    DirectedGraphComponent.prototype.getLegendOptions = function () {
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
     * @memberOf DirectedGraphComponent
     */
    DirectedGraphComponent.prototype.onMouseMove = function ($event) {
        if (this.isPanning && this.panningEnabled) {
            this.onPan($event);
        }
        else if (this.isDragging && this.draggingEnabled) {
            this.onDrag($event);
        }
    };
    /**
     * On mouse up event to disable panning/dragging.
     *
     * @param {MouseEvent} $event
     *
     * @memberOf DirectedGraphComponent
     */
    DirectedGraphComponent.prototype.onMouseUp = function ($event) {
        this.isDragging = false;
        this.isPanning = false;
    };
    /**
     * On node mouse down to kick off dragging
     *
     * @param {MouseEvent} event
     * @param {*} node
     *
     * @memberOf DirectedGraphComponent
     */
    DirectedGraphComponent.prototype.onNodeMouseDown = function (event, node) {
        this.isDragging = true;
        this.draggingNode = node;
    };
    DirectedGraphComponent.decorators = [
        { type: Component, args: [{
                    selector: 'ngx-charts-directed-graph',
                    styleUrls: ['./directed-graph.component.css'],
                    encapsulation: ViewEncapsulation.None,
                    changeDetection: ChangeDetectionStrategy.OnPush,
                    animations: [
                        trigger('link', [
                            transition('* => *', [
                                animate(500, style({ transform: '*' }))
                            ])
                        ])
                    ],
                    template: "\n    <ngx-charts-chart \n      [view]=\"[width, height]\" \n      [showLegend]=\"legend\" \n      [legendOptions]=\"legendOptions\" \n      (legendLabelClick)=\"onClick($event)\"\n      (legendLabelActivate)=\"onActivate($event)\" \n      (legendLabelDeactivate)=\"onDeactivate($event)\" \n      mouseWheel \n      (mouseWheelUp)=\"onZoom($event, 'in')\"\n      (mouseWheelDown)=\"onZoom($event, 'out')\">\n      <svg:g \n        *ngIf=\"initialized\" \n        [attr.transform]=\"transform\" \n        class=\"directed-graph chart\">\n          <defs>\n            <ng-template *ngIf=\"defsTemplate\" [ngTemplateOutlet]=\"defsTemplate\">\n            </ng-template>\n            <svg:path \n              class=\"text-path\" \n              *ngFor=\"let link of _links\" \n              [attr.d]=\"link.textPath\" \n              [attr.id]=\"link.id\">\n            </svg:path>\n          </defs>\n          <svg:rect \n            class=\"panning-rect\" \n            [attr.width]=\"dims.width * 100\" \n            [attr.height]=\"dims.height * 100\" \n            [attr.transform]=\"'translate(' + (-dims.width * 50) +',' + (-dims.height*50) + ')' \"\n            (mousedown)=\"isPanning = true\" />\n          <svg:g class=\"links\">\n            <svg:g \n              *ngFor=\"let link of _links; trackBy: trackLinkBy\" \n              class=\"link-group\" \n              #linkElement \n              [id]=\"link.id\">\n              <ng-template \n                *ngIf=\"linkTemplate\" \n                [ngTemplateOutlet]=\"linkTemplate\" \n                [ngOutletContext]=\"{ $implicit: link }\">\n              </ng-template>\n              <svg:path *ngIf=\"!linkTemplate\" class=\"edge\" [attr.d]=\"link.line\" />\n            </svg:g>\n          </svg:g>\n          <svg:g class=\"nodes\">\n            <svg:g \n              *ngFor=\"let node of _nodes; trackBy: trackNodeBy\" \n              class=\"node-group\" \n              #nodeElement \n              [id]=\"node.id\" \n              [attr.transform]=\"node.options.transform\"\n                (click)=\"onClick(node)\" (mousedown)=\"onNodeMouseDown($event, node)\">\n                <ng-template \n                  *ngIf=\"nodeTemplate\" \n                  [ngTemplateOutlet]=\"nodeTemplate\" \n                  [ngOutletContext]=\"{ $implicit: node }\">\n                </ng-template>\n                <svg:circle \n                  *ngIf=\"!nodeTemplate\" \n                  r=\"10\" \n                  [attr.cx]=\"node.width / 2\" [attr.cy]=\"node.height / 2\" \n                  [attr.fill]=\"node.options.color\"\n                />\n            </svg:g>\n          </svg:g>\n      </svg:g>\n  </ngx-charts-chart>\n  "
                },] },
    ];
    /** @nocollapse */
    DirectedGraphComponent.ctorParameters = function () { return []; };
    DirectedGraphComponent.propDecorators = {
        'legend': [{ type: Input },],
        'nodes': [{ type: Input },],
        'links': [{ type: Input },],
        'activeEntries': [{ type: Input },],
        'orientation': [{ type: Input },],
        'curve': [{ type: Input },],
        'draggingEnabled': [{ type: Input },],
        'nodeHeight': [{ type: Input },],
        'nodeMaxHeight': [{ type: Input },],
        'nodeMinHeight': [{ type: Input },],
        'nodeWidth': [{ type: Input },],
        'nodeMinWidth': [{ type: Input },],
        'nodeMaxWidth': [{ type: Input },],
        'panOffsetX': [{ type: Input },],
        'panOffsetY': [{ type: Input },],
        'panningEnabled': [{ type: Input },],
        'zoomLevel': [{ type: Input },],
        'zoomSpeed': [{ type: Input },],
        'minZoomLevel': [{ type: Input },],
        'maxZoomLevel': [{ type: Input },],
        'activate': [{ type: Output },],
        'deactivate': [{ type: Output },],
        'linkTemplate': [{ type: ContentChild, args: ['linkTemplate',] },],
        'nodeTemplate': [{ type: ContentChild, args: ['nodeTemplate',] },],
        'defsTemplate': [{ type: ContentChild, args: ['defsTemplate',] },],
        'chart': [{ type: ViewChild, args: [ChartComponent, { read: ElementRef },] },],
        'nodeElements': [{ type: ViewChildren, args: ['nodeElement',] },],
        'linkElements': [{ type: ViewChildren, args: ['linkElement',] },],
        'groupResultsBy': [{ type: Input },],
        'onMouseMove': [{ type: HostListener, args: ['document:mousemove', ['$event'],] },],
        'onMouseUp': [{ type: HostListener, args: ['document:mouseup',] },],
    };
    return DirectedGraphComponent;
}(BaseChartComponent));
export { DirectedGraphComponent };
//# sourceMappingURL=directed-graph.component.js.map
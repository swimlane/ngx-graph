"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var core_1 = require('@angular/core');
var ngx_charts_1 = require('@swimlane/ngx-charts');
var utils_1 = require('../utils');
var d3_1 = require('../d3');
var dagre = require('dagre');
var DirectedGraphComponent = (function (_super) {
    __extends(DirectedGraphComponent, _super);
    function DirectedGraphComponent() {
        _super.apply(this, arguments);
        this.nodes = [];
        this.links = [];
        this.activeEntries = [];
        this.zoomLevel = 1;
        this.panOffset = { x: 0, y: 0 };
        this.orientation = 'LR';
        this.activate = new core_1.EventEmitter();
        this.deactivate = new core_1.EventEmitter();
        this.margin = [0, 0, 0, 0];
        this.results = [];
        this.isPanning = false;
        this.initialized = false;
        this.graphDims = { width: 0, height: 0 };
        this._oldLinks = [];
        this.groupResultsBy = function (node) { return node.label; };
    }
    DirectedGraphComponent.prototype.update = function () {
        var _this = this;
        _super.prototype.update.call(this);
        this.zone.run(function () {
            _this.dims = ngx_charts_1.calculateViewDimensions({
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
    DirectedGraphComponent.prototype.ngAfterViewInit = function () {
        var _this = this;
        _super.prototype.ngAfterViewInit.call(this);
        setTimeout(function () {
            _this.update();
        });
    };
    DirectedGraphComponent.prototype.draw = function () {
        var _this = this;
        if (this.nodeElements && this.nodeElements.length) {
            this.nodeElements.map(function (elem) {
                var nativeElement = elem.nativeElement;
                var node = _this._nodes.find(function (n) { return n.id === nativeElement.id; });
                var dims = nativeElement.getBBox();
                node.height = dims.height;
                if (nativeElement.getElementsByTagName('text').length) {
                    var textDims = nativeElement.getElementsByTagName('text')[0].getBBox();
                    node.width = textDims.width + 20;
                }
                else {
                    node.width = dims.width;
                }
            });
        }
        dagre.layout(this.graph);
        var index = {};
        this._nodes.map(function (n) {
            index[n.id] = n;
            n.options = {
                color: _this.colors.getColor(_this.groupResultsBy(n)),
                transform: "translate( " + (n.x - n.width / 2) + "px, " + (n.y - n.height / 2) + "px)"
            };
        });
        var newLinks = [];
        var _loop_1 = function(k) {
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
            newLinks.push(newLink);
        };
        var this_1 = this;
        for (var k in this.graph._edgeLabels) {
            _loop_1(k);
        }
        this._links = newLinks;
        if (this._links) {
            this._oldLinks = this._links.map(function (l) {
                var newL = Object.assign({}, l);
                newL.oldLine = l.line;
                return newL;
            });
        }
        this.graphDims.width = Math.max.apply(Math, this._nodes.map(function (n) { return n.x; }));
        this.graphDims.height = Math.max.apply(Math, this._nodes.map(function (n) { return n.y; }));
        setTimeout(function () {
            _this.linkElements.map(function (linkEl) {
                var l = _this._links.find(function (lin) { return lin.id === linkEl.nativeElement.id; });
                if (l) {
                    var linkSelection = d3_1.default.select(linkEl.nativeElement).select('.line');
                    linkSelection
                        .attr('d', l.oldLine)
                        .transition()
                        .duration(500)
                        .attr('d', l.line);
                    var textPathSelection = d3_1.default.select(_this.chartElement.nativeElement).select("#" + l.id);
                    textPathSelection
                        .attr('d', l.oldLine)
                        .transition()
                        .duration(500)
                        .attr('d', l.line);
                }
            });
        });
        this.cd.markForCheck();
    };
    DirectedGraphComponent.prototype.createGraph = function () {
        var _this = this;
        this.graph = new dagre.graphlib.Graph();
        this.graph.setGraph({
            rankdir: this.orientation,
            marginx: 20,
            marginy: 20,
            // acyclicer: 'greedy',
            edgesep: 100,
            ranksep: 100,
        });
        // Default to assigning a new object as a label for each new edge.
        this.graph.setDefaultEdgeLabel(function () { return {}; });
        this._nodes = this.nodes.map(function (n) {
            return Object.assign({}, n);
        });
        this._links = this.links.map(function (l) {
            var newLink = Object.assign({}, l);
            if (!newLink.id) {
                newLink.id = utils_1.id();
            }
            return newLink;
        });
        for (var _i = 0, _a = this._nodes; _i < _a.length; _i++) {
            var node = _a[_i];
            node.width = 20;
            node.height = 30;
            this.graph.setNode(node.id, node);
            node.options = {
                color: this.colors.getColor(this.groupResultsBy(node)),
                transform: "translate( " + (node.x - node.width / 2) + ", " + (node.y - node.height / 2) + ")"
            };
        }
        for (var _b = 0, _c = this._links; _b < _c.length; _b++) {
            var edge = _c[_b];
            this.graph.setEdge(edge.source, edge.target);
        }
        setTimeout(function () { _this.draw(); }, 0);
    };
    DirectedGraphComponent.prototype.generateLine = function (points, interpolation) {
        if (interpolation === void 0) { interpolation = 'linear'; }
        var lineFunction = d3_1.default.line().x(function (d) { return d.x; }).y(function (d) { return d.y; }).curve(this.curve);
        return lineFunction(points);
    };
    DirectedGraphComponent.prototype.zoom = function ($event, direction) {
        if (direction === 'in') {
            this.zoomLevel += 0.1;
        }
        else {
            this.zoomLevel -= 0.1;
        }
        this.zoomLevel = Math.max(this.zoomLevel, 0.1);
        this.zoomLevel = Math.min(this.zoomLevel, 4.0);
        this.updateTransform();
    };
    DirectedGraphComponent.prototype.pan = function (event) {
        if (this.isPanning) {
            this.panOffset.x += event.movementX;
            this.panOffset.y += event.movementY;
            this.updateTransform();
        }
    };
    DirectedGraphComponent.prototype.updateTransform = function () {
        this.transform = "\n      translate(" + this.panOffset.x + ", " + this.panOffset.y + ") scale(" + this.zoomLevel + ")\n    ";
    };
    DirectedGraphComponent.prototype.onClick = function (data, node) {
        this.select.emit(data);
    };
    DirectedGraphComponent.prototype.onActivate = function (event) {
        if (this.activeEntries.indexOf(event) > -1)
            return;
        this.activeEntries = [event].concat(this.activeEntries);
        this.activate.emit({ value: event, entries: this.activeEntries });
    };
    DirectedGraphComponent.prototype.onDeactivate = function (event) {
        var idx = this.activeEntries.indexOf(event);
        this.activeEntries.splice(idx, 1);
        this.activeEntries = this.activeEntries.slice();
        this.deactivate.emit({ value: event, entries: this.activeEntries });
    };
    DirectedGraphComponent.prototype.getSeriesDomain = function () {
        var _this = this;
        return this.nodes.map(function (d) { return _this.groupResultsBy(d); })
            .reduce(function (nodes, node) { return nodes.includes(node) ? nodes : nodes.concat([node]); }, [])
            .sort();
    };
    DirectedGraphComponent.prototype.trackLinkBy = function (index, link) {
        return link.id;
    };
    DirectedGraphComponent.prototype.trackNodeBy = function (index, node) {
        return node.id;
    };
    DirectedGraphComponent.prototype.setColors = function () {
        this.colors = new ngx_charts_1.ColorHelper(this.scheme, 'ordinal', this.seriesDomain, this.customColors);
    };
    DirectedGraphComponent.prototype.getLegendOptions = function () {
        return {
            scaleType: 'ordinal',
            domain: this.seriesDomain,
            colors: this.colors
        };
    };
    DirectedGraphComponent.prototype.mousemove = function ($event) {
        this.pan($event);
    };
    DirectedGraphComponent.prototype.mouseup = function (node, $event) {
        this.isPanning = false;
    };
    DirectedGraphComponent.decorators = [
        { type: core_1.Component, args: [{
                    selector: 'ngx-charts-directed-graph',
                    template: "\n    <ngx-charts-chart\n      [view]=\"[width, height]\"\n      [showLegend]=\"legend\"\n      [legendOptions]=\"legendOptions\"\n      (legendLabelClick)=\"onClick($event)\"\n      (legendLabelActivate)=\"onActivate($event)\"\n      (legendLabelDeactivate)=\"onDeactivate($event)\"\n      mouse-wheel (mouseWheelUp)=\"zoom($event, 'in')\" (mouseWheelDown)=\"zoom($event, 'out')\">\n      <svg:g *ngIf=\"initialized\" [attr.transform]=\"transform\" class=\"directed-graph chart\">\n\n        <defs>\n          <template *ngIf=\"defsTemplate\"\n            [ngTemplateOutlet]=\"defsTemplate\">\n          </template>\n\n          <svg:path class=\"text-path\" *ngFor=\"let link of _links\" [attr.d]=\"link.line\" [attr.id]=\"link.id\"></svg:path>\n        </defs>\n\n        <svg:rect\n          class=\"panning-rect\"\n          [attr.width]=\"dims.width * 100\"\n          [attr.height]=\"dims.height * 100\"\n          [attr.transform]=\"'translate(' + (-dims.width * 50) +',' + (-dims.height*50) + ')' \"\n          (mousedown)=\"isPanning = true\"\n        />\n\n        <svg:g class=\"links\">\n          <svg:g *ngFor=\"let link of _links; trackBy:trackLinkBy\"\n            class=\"link-group\"\n            #linkElement\n            [id]=\"link.id\">\n            <template *ngIf=\"linkTemplate\"\n              [ngTemplateOutlet]=\"linkTemplate\"\n              [ngOutletContext]=\"{ $implicit: link }\">\n            </template>\n            <svg:path *ngIf=\"!linkTemplate\"\n              class=\"edge\"\n              [attr.d]=\"link.line\"\n            />\n          </svg:g>\n        </svg:g>\n\n        <svg:g class=\"nodes\">\n          <svg:g *ngFor=\"let node of _nodes; trackBy:trackNodeBy\"\n            class=\"node-group\"\n            #nodeElement\n            [id]=\"node.id\"\n            [style.transform]=\"node.options.transform\"\n            (click)=\"onClick(node)\">\n            <template *ngIf=\"nodeTemplate\"\n              [ngTemplateOutlet]=\"nodeTemplate\"\n              [ngOutletContext]=\"{ $implicit: node }\">\n            </template>\n            <svg:circle *ngIf=\"!nodeTemplate\"\n              r=\"10\"\n              [attr.cx]=\"node.width / 2\"\n              [attr.cy]=\"node.height / 2\"\n              [attr.fill]=\"node.options.color\" />\n          </svg:g>\n        </svg:g>\n      </svg:g>\n    </ngx-charts-chart>\n\n  ",
                    styleUrls: [
                        './directed-graph.component.css'
                    ],
                    encapsulation: core_1.ViewEncapsulation.None,
                    changeDetection: core_1.ChangeDetectionStrategy.OnPush,
                    animations: [
                        core_1.trigger('link', [
                            core_1.transition('* => *', [
                                core_1.animate(500, core_1.style({ transform: '*' }))
                            ])
                        ])
                    ]
                },] },
    ];
    /** @nocollapse */
    DirectedGraphComponent.ctorParameters = function () { return []; };
    DirectedGraphComponent.propDecorators = {
        'legend': [{ type: core_1.Input },],
        'nodes': [{ type: core_1.Input },],
        'links': [{ type: core_1.Input },],
        'activeEntries': [{ type: core_1.Input },],
        'zoomLevel': [{ type: core_1.Input },],
        'panOffset': [{ type: core_1.Input },],
        'orientation': [{ type: core_1.Input },],
        'curve': [{ type: core_1.Input },],
        'activate': [{ type: core_1.Output },],
        'deactivate': [{ type: core_1.Output },],
        'linkTemplate': [{ type: core_1.ContentChild, args: ['linkTemplate',] },],
        'nodeTemplate': [{ type: core_1.ContentChild, args: ['nodeTemplate',] },],
        'defsTemplate': [{ type: core_1.ContentChild, args: ['defsTemplate',] },],
        'chart': [{ type: core_1.ViewChild, args: [ngx_charts_1.ChartComponent, { read: core_1.ElementRef },] },],
        'nodeElements': [{ type: core_1.ViewChildren, args: ['nodeElement',] },],
        'linkElements': [{ type: core_1.ViewChildren, args: ['linkElement',] },],
        'groupResultsBy': [{ type: core_1.Input },],
        'mousemove': [{ type: core_1.HostListener, args: ['document:mousemove', ['$event'],] },],
        'mouseup': [{ type: core_1.HostListener, args: ['document:mouseup',] },],
    };
    return DirectedGraphComponent;
}(ngx_charts_1.BaseChartComponent));
exports.DirectedGraphComponent = DirectedGraphComponent;
//# sourceMappingURL=directed-graph.component.js.map
import { ElementRef, TemplateRef, EventEmitter, QueryList, AfterViewInit } from '@angular/core';
import { BaseChartComponent, ViewDimensions, ColorHelper } from '@swimlane/ngx-charts';
import 'd3-transition';
/**
 * Matrix
 */
export interface Matrix {
    a: number;
    b: number;
    c: number;
    d: number;
    e: number;
    f: number;
}
export declare class GraphComponent extends BaseChartComponent implements AfterViewInit {
    legend: boolean;
    nodes: any[];
    links: any[];
    activeEntries: any[];
    orientation: string;
    curve: any;
    draggingEnabled: boolean;
    nodeHeight: number;
    nodeMaxHeight: number;
    nodeMinHeight: number;
    nodeWidth: number;
    nodeMinWidth: number;
    nodeMaxWidth: number;
    panningEnabled: boolean;
    enableZoom: boolean;
    zoomSpeed: number;
    minZoomLevel: number;
    maxZoomLevel: number;
    autoZoom: boolean;
    panOnZoom: boolean;
    activate: EventEmitter<any>;
    deactivate: EventEmitter<any>;
    linkTemplate: TemplateRef<any>;
    nodeTemplate: TemplateRef<any>;
    defsTemplate: TemplateRef<any>;
    chart: ElementRef;
    nodeElements: QueryList<ElementRef>;
    linkElements: QueryList<ElementRef>;
    colors: ColorHelper;
    dims: ViewDimensions;
    margin: number[];
    results: any[];
    seriesDomain: any;
    transform: string;
    legendOptions: any;
    isPanning: boolean;
    isDragging: boolean;
    draggingNode: any;
    initialized: boolean;
    graph: any;
    graphDims: any;
    _nodes: any[];
    _links: any[];
    _oldLinks: any[];
    transformationMatrix: Matrix;
    groupResultsBy: (node: any) => string;
    /**
     * Get the current zoom level
     */
    /**
     * Set the current zoom level
     */
    zoomLevel: number;
    /**
     * Get the current `x` position of the graph
     */
    /**
     * Set the current `x` position of the graph
     */
    panOffsetX: number;
    /**
     * Get the current `y` position of the graph
     */
    /**
     * Set the current `y` position of the graph
     */
    panOffsetY: number;
    /**
     * Angular lifecycle event
     *
     *
     * @memberOf GraphComponent
     */
    ngAfterViewInit(): void;
    /**
     * Base class update implementation for the dag graph
     *
     *
     * @memberOf GraphComponent
     */
    update(): void;
    /**
     * Draws the graph using dagre layouts
     *
     *
     * @memberOf GraphComponent
     */
    draw(): void;
    /**
     * Redraws the lines when dragged or viewport updated
     *
     * @param {boolean} [animate=true]
     *
     * @memberOf GraphComponent
     */
    redrawLines(_animate?: boolean): void;
    /**
     * Creates the dagre graph engine
     *
     *
     * @memberOf GraphComponent
     */
    createGraph(): void;
    /**
     * Calculate the text directions / flipping
     *
     * @param {any} link
     *
     * @memberOf GraphComponent
     */
    calcDominantBaseline(link: any): void;
    /**
     * Generate the new line path
     *
     * @param {any} points
     * @returns {*}
     *
     * @memberOf GraphComponent
     */
    generateLine(points: any): any;
    /**
     * Zoom was invoked from event
     *
     * @param {MouseEvent} $event
     * @param {any} direction
     *
     * @memberOf GraphComponent
     */
    onZoom($event: MouseEvent, direction: any): void;
    /**
     * Pan by x/y
     *
     * @param x
     * @param y
     */
    pan(x: number, y: number): void;
    /**
     * Pan to a fixed x/y
     *
     * @param x
     * @param y
     */
    panTo(x: number, y: number): void;
    /**
     * Zoom by a factor
     *
     * @param factor Zoom multiplicative factor (1.1 for zooming in 10%, for instance)
     */
    zoom(factor: number): void;
    /**
     * Zoom to a fixed level
     *
     * @param level
     */
    zoomTo(level: number): void;
    /**
     * Pan was invoked from event
     *
     * @param {any} event
     *
     * @memberOf GraphComponent
     */
    onPan(event: any): void;
    /**
     * Drag was invoked from an event
     *
     * @param {any} event
     *
     * @memberOf GraphComponent
     */
    onDrag(event: any): void;
    /**
     * Update the entire view for the new pan position
     *
     *
     * @memberOf GraphComponent
     */
    updateTransform(): void;
    /**
     * Node was clicked
     *
     * @param {any} event
     * @returns {void}
     *
     * @memberOf GraphComponent
     */
    onClick(event: any): void;
    /**
     * Node was focused
     *
     * @param {any} event
     * @returns {void}
     *
     * @memberOf GraphComponent
     */
    onActivate(event: any): void;
    /**
     * Node was defocused
     *
     * @param {any} event
     *
     * @memberOf GraphComponent
     */
    onDeactivate(event: any): void;
    /**
     * Get the domain series for the nodes
     *
     * @returns {any[]}
     *
     * @memberOf GraphComponent
     */
    getSeriesDomain(): any[];
    /**
     * Tracking for the link
     *
     * @param {any} index
     * @param {any} link
     * @returns {*}
     *
     * @memberOf GraphComponent
     */
    trackLinkBy(index: any, link: any): any;
    /**
     * Tracking for the node
     *
     * @param {any} index
     * @param {any} node
     * @returns {*}
     *
     * @memberOf GraphComponent
     */
    trackNodeBy(index: any, node: any): any;
    /**
     * Sets the colors the nodes
     *
     *
     * @memberOf GraphComponent
     */
    setColors(): void;
    /**
     * Gets the legend options
     *
     * @returns {*}
     *
     * @memberOf GraphComponent
     */
    getLegendOptions(): any;
    /**
     * On mouse move event, used for panning and dragging.
     *
     * @param {MouseEvent} $event
     *
     * @memberOf GraphComponent
     */
    onMouseMove($event: MouseEvent): void;
    /**
     * On mouse up event to disable panning/dragging.
     *
     * @param {MouseEvent} $event
     *
     * @memberOf GraphComponent
     */
    onMouseUp($event: MouseEvent): void;
    /**
     * On node mouse down to kick off dragging
     *
     * @param {MouseEvent} event
     * @param {*} node
     *
     * @memberOf GraphComponent
     */
    onNodeMouseDown(event: MouseEvent, node: any): void;
}

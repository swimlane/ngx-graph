import 'd3-transition';
import { AfterViewInit, ElementRef, EventEmitter, OnDestroy, OnInit, QueryList, TemplateRef } from '@angular/core';
import { BaseChartComponent, ColorHelper, ViewDimensions } from '@swimlane/ngx-charts';
import { Observable, Subscription } from 'rxjs';
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
export interface DagreLayout {
    nodesep?: number;
    edgesep?: number;
    ranksep?: number;
    acyclicer?: string;
    ranker?: string;
    align?: string;
}
export declare class GraphComponent extends BaseChartComponent implements OnInit, OnDestroy, AfterViewInit {
    legend: boolean;
    nodes: any[];
    dataLinks: any[];
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
    autoCenter: boolean;
    update$: Observable<any>;
    center$: Observable<any>;
    zoomToFit$: Observable<any>;
    zoomToNode$: Observable<any>;
    dagreLayout: DagreLayout;
    singleNodesPerLine: number;
    multigraph: boolean;
    compound: boolean;
    activate: EventEmitter<any>;
    deactivate: EventEmitter<any>;
    zoomChange: EventEmitter<number>;
    linkTemplate: TemplateRef<any>;
    nodeTemplate: TemplateRef<any>;
    defsTemplate: TemplateRef<any>;
    linkDataTemplate: TemplateRef<any>;
    chart: ElementRef;
    nodeElements: QueryList<ElementRef>;
    linkElements: QueryList<ElementRef>;
    dataLinkElements: QueryList<ElementRef>;
    subscriptions: Subscription[];
    colors: ColorHelper;
    dims: ViewDimensions;
    margin: number[];
    results: any[];
    seriesDomain: any;
    transform: string;
    legendOptions: any;
    isPanning: boolean;
    isDragging: boolean;
    isCustomNodeSize: boolean;
    draggingNode: any;
    initialized: boolean;
    graph: any;
    graphDims: any;
    _nodes: any[];
    _dataLinks: any[];
    _links: any[];
    _oldLinks: any[];
    transformationMatrix: Matrix;
    _touchLastX: any;
    _touchLastY: any;
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
    ngOnInit(): void;
    /**
     * Angular lifecycle event
     *
     *
     * @memberOf GraphComponent
     */
    ngOnDestroy(): void;
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
    redrawDataLinks(): void;
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
    pan(x: number, y: number, ignoreZoomLevel?: boolean): void;
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
     * On touch start event to enable panning.
     *
     * @param {TouchEvent} $event
     *
     * @memberOf GraphComponent
     */
    onTouchStart(event: any): void;
    /**
     * On touch move event, used for panning.
     *
     * @param {TouchEvent} $event
     *
     * @memberOf GraphComponent
     */
    onTouchMove(event: any): void;
    /**
     * On touch end event to disable panning.
     *
     * @param {TouchEvent} $event
     *
     * @memberOf GraphComponent
     */
    onTouchEnd(event: any): void;
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
    /**
     * Center the graph in the viewport
     */
    center(): void;
    /**
     * Zooms to fit the entire graph
     */
    zoomToFit(): void;
    panToNodeId(nodeId: string): void;
}

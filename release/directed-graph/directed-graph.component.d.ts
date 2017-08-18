import { ElementRef, TemplateRef, EventEmitter, QueryList, AfterViewInit } from '@angular/core';
import { BaseChartComponent, ViewDimensions, ColorHelper } from '@swimlane/ngx-charts';
export declare class DirectedGraphComponent extends BaseChartComponent implements AfterViewInit {
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
    panOffsetX: number;
    panOffsetY: number;
    panningEnabled: boolean;
    zoomLevel: number;
    zoomSpeed: number;
    minZoomLevel: number;
    maxZoomLevel: number;
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
    groupResultsBy: (node: any) => string;
    /**
     * Angular lifecycle event
     *
     *
     * @memberOf DirectedGraphComponent
     */
    ngAfterViewInit(): void;
    /**
     * Base class update implementation for the dag graph
     *
     *
     * @memberOf DirectedGraphComponent
     */
    update(): void;
    /**
     * Draws the graph using dagre layouts
     *
     *
     * @memberOf DirectedGraphComponent
     */
    draw(): void;
    /**
     * Redraws the lines when dragged or viewport updated
     *
     * @param {boolean} [animate=true]
     *
     * @memberOf DirectedGraphComponent
     */
    redrawLines(_animate?: boolean): void;
    /**
     * Creates the dagre graph engine
     *
     *
     * @memberOf DirectedGraphComponent
     */
    createGraph(): void;
    /**
     * Calculate the text directions / flipping
     *
     * @param {any} link
     *
     * @memberOf DirectedGraphComponent
     */
    calcDominantBaseline(link: any): void;
    /**
     * Generate the new line path
     *
     * @param {any} points
     * @returns {*}
     *
     * @memberOf DirectedGraphComponent
     */
    generateLine(points: any): any;
    /**
     * Zoom was invoked from event
     *
     * @param {MouseEvent} $event
     * @param {any} direction
     *
     * @memberOf DirectedGraphComponent
     */
    onZoom($event: MouseEvent, direction: any): void;
    /**
     * Pan was invoked from event
     *
     * @param {any} event
     *
     * @memberOf DirectedGraphComponent
     */
    onPan(event: any): void;
    /**
     * Drag was invoked from an event
     *
     * @param {any} event
     *
     * @memberOf DirectedGraphComponent
     */
    onDrag(event: any): void;
    /**
     * Update the entire view for the new pan position
     *
     *
     * @memberOf DirectedGraphComponent
     */
    updateTransform(): void;
    /**
     * Node was clicked
     *
     * @param {any} event
     * @returns {void}
     *
     * @memberOf DirectedGraphComponent
     */
    onClick(event: any): void;
    /**
     * Node was focused
     *
     * @param {any} event
     * @returns {void}
     *
     * @memberOf DirectedGraphComponent
     */
    onActivate(event: any): void;
    /**
     * Node was defocused
     *
     * @param {any} event
     *
     * @memberOf DirectedGraphComponent
     */
    onDeactivate(event: any): void;
    /**
     * Get the domain series for the nodes
     *
     * @returns {any[]}
     *
     * @memberOf DirectedGraphComponent
     */
    getSeriesDomain(): any[];
    /**
     * Tracking for the link
     *
     * @param {any} index
     * @param {any} link
     * @returns {*}
     *
     * @memberOf DirectedGraphComponent
     */
    trackLinkBy(index: any, link: any): any;
    /**
     * Tracking for the node
     *
     * @param {any} index
     * @param {any} node
     * @returns {*}
     *
     * @memberOf DirectedGraphComponent
     */
    trackNodeBy(index: any, node: any): any;
    /**
     * Sets the colors the nodes
     *
     *
     * @memberOf DirectedGraphComponent
     */
    setColors(): void;
    /**
     * Gets the legend options
     *
     * @returns {*}
     *
     * @memberOf DirectedGraphComponent
     */
    getLegendOptions(): any;
    /**
     * On mouse move event, used for panning and dragging.
     *
     * @param {MouseEvent} $event
     *
     * @memberOf DirectedGraphComponent
     */
    onMouseMove($event: MouseEvent): void;
    /**
     * On mouse up event to disable panning/dragging.
     *
     * @param {MouseEvent} $event
     *
     * @memberOf DirectedGraphComponent
     */
    onMouseUp($event: MouseEvent): void;
    /**
     * On node mouse down to kick off dragging
     *
     * @param {MouseEvent} event
     * @param {*} node
     *
     * @memberOf DirectedGraphComponent
     */
    onNodeMouseDown(event: MouseEvent, node: any): void;
}

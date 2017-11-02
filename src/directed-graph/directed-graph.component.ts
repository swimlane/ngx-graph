import {
  Component, ContentChild, ContentChildren, ElementRef, HostListener, Input,
  TemplateRef, ViewChild, ViewChildren, Output, ViewEncapsulation, EventEmitter,
  ChangeDetectionStrategy, QueryList, AfterViewInit
} from '@angular/core';

import { animate, style, transition, trigger } from '@angular/animations';

import {
  BaseChartComponent, ChartComponent, calculateViewDimensions, ViewDimensions, ColorHelper
} from '@swimlane/ngx-charts';

import { select } from 'd3-selection';
import * as shape from 'd3-shape';
import * as dagre from 'dagre';
import { id } from '../utils';

@Component({
  selector: 'ngx-charts-directed-graph',
  styleUrls: ['./directed-graph.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('link', [
      transition('* => *', [
        animate(500, style({ transform: '*' }))
      ])
    ])
  ],
  template: `
    <ngx-charts-chart 
      [view]="[width, height]" 
      [showLegend]="legend" 
      [legendOptions]="legendOptions" 
      (legendLabelClick)="onClick($event)"
      (legendLabelActivate)="onActivate($event)" 
      (legendLabelDeactivate)="onDeactivate($event)" 
      mouseWheel 
      (mouseWheelUp)="onZoom($event, 'in')"
      (mouseWheelDown)="onZoom($event, 'out')">
      <svg:g 
        *ngIf="initialized" 
        [attr.transform]="transform" 
        class="directed-graph chart">
          <defs>
            <ng-template *ngIf="defsTemplate" [ngTemplateOutlet]="defsTemplate">
            </ng-template>
            <svg:path 
              class="text-path" 
              *ngFor="let link of _links" 
              [attr.d]="link.textPath" 
              [attr.id]="link.id">
            </svg:path>
          </defs>
          <svg:rect 
            class="panning-rect" 
            [attr.width]="dims.width * 100" 
            [attr.height]="dims.height * 100" 
            [attr.transform]="'translate(' + (-dims.width * 50) +',' + (-dims.height*50) + ')' "
            (mousedown)="isPanning = true" />
          <svg:g class="links">
            <svg:g 
              *ngFor="let link of _links; trackBy: trackLinkBy" 
              class="link-group" 
              #linkElement 
              [id]="link.id">
              <ng-template 
                *ngIf="linkTemplate" 
                [ngTemplateOutlet]="linkTemplate" 
                [ngTemplateOutletContext]="{ $implicit: link }">
              </ng-template>
              <svg:path *ngIf="!linkTemplate" class="edge" [attr.d]="link.line" />
            </svg:g>
          </svg:g>
          <svg:g class="nodes">
            <svg:g 
              *ngFor="let node of _nodes; trackBy: trackNodeBy" 
              class="node-group" 
              #nodeElement 
              [id]="node.id" 
              [attr.transform]="node.options.transform"
                (click)="onClick(node)" (mousedown)="onNodeMouseDown($event, node)">
                <ng-template 
                  *ngIf="nodeTemplate" 
                  [ngTemplateOutlet]="nodeTemplate" 
                  [ngTemplateOutletContext]="{ $implicit: node }">
                </ng-template>
                <svg:circle 
                  *ngIf="!nodeTemplate" 
                  r="10" 
                  [attr.cx]="node.width / 2" [attr.cy]="node.height / 2" 
                  [attr.fill]="node.options.color"
                />
            </svg:g>
          </svg:g>
      </svg:g>
  </ngx-charts-chart>
  `
})
export class DirectedGraphComponent extends BaseChartComponent implements AfterViewInit {

  @Input() legend: boolean;
  @Input() nodes: any[] = [];
  @Input() links: any[] = [];
  @Input() activeEntries: any[] = [];
  @Input() orientation: string = 'LR';
  @Input() curve: any;
  @Input() draggingEnabled: boolean = true;

  @Input() nodeHeight: number;
  @Input() nodeMaxHeight: number;
  @Input() nodeMinHeight: number;

  @Input() nodeWidth: number;
  @Input() nodeMinWidth: number;
  @Input() nodeMaxWidth: number;

  @Input() panOffsetX: number = 0;
  @Input() panOffsetY: number = 0;
  @Input() panningEnabled: boolean = true;

  @Input() zoomLevel: number = 1;
  @Input() zoomSpeed: number = 0.1;
  @Input() minZoomLevel: number = 0.1;
  @Input() maxZoomLevel: number = 4.0;
  @Input() autoZoom: boolean = false;

  @Output() activate: EventEmitter<any> = new EventEmitter();
  @Output() deactivate: EventEmitter<any> = new EventEmitter();

  @ContentChild('linkTemplate') linkTemplate: TemplateRef<any>;
  @ContentChild('nodeTemplate') nodeTemplate: TemplateRef<any>;
  @ContentChild('defsTemplate') defsTemplate: TemplateRef<any>;
  @ViewChild(ChartComponent, { read: ElementRef }) chart: ElementRef;

  @ViewChildren('nodeElement') nodeElements: QueryList<ElementRef>;
  @ViewChildren('linkElement') linkElements: QueryList<ElementRef>;

  colors: ColorHelper;
  dims: ViewDimensions;
  margin = [0, 0, 0, 0];
  results = [];
  seriesDomain: any;
  transform: string;
  legendOptions: any;
  isPanning: boolean = false;
  isDragging: boolean = false;
  draggingNode: any;
  initialized: boolean = false;
  graph: any;
  graphDims: any = { width: 0, height: 0 };
  _nodes: any[];
  _links: any[];
  _oldLinks: any[] = [];

  @Input() groupResultsBy: (node: any) => string = node => node.label;

  /**
   * Angular lifecycle event
   *
   *
   * @memberOf DirectedGraphComponent
   */
  ngAfterViewInit(): void {
    super.ngAfterViewInit();
    setTimeout(() => this.update());
  }

  /**
   * Base class update implementation for the dag graph
   *
   *
   * @memberOf DirectedGraphComponent
   */
  update(): void {
    super.update();

    this.zone.run(() => {
      this.dims = calculateViewDimensions({
        width: this.width,
        height: this.height,
        margins: this.margin,
        showLegend: this.legend,
      });

      this.seriesDomain = this.getSeriesDomain();
      this.setColors();
      this.legendOptions = this.getLegendOptions();

      this.createGraph();
      this.updateTransform();
      this.initialized = true;
    });
  }

  /**
   * Draws the graph using dagre layouts
   *
   *
   * @memberOf DirectedGraphComponent
   */
  draw(): void {
    // Calc view dims for the nodes
    if (this.nodeElements && this.nodeElements.length) {
      this.nodeElements.map(elem => {
        const nativeElement = elem.nativeElement;
        const node = this._nodes.find(n => n.id === nativeElement.id);

        // calculate the height
        const dims = nativeElement.getBBox();
        if (this.nodeHeight) {
          node.height = this.nodeHeight;
        } else {
          node.height = dims.height;
        }

        if (this.nodeMaxHeight) node.height = Math.max(node.height, this.nodeMaxHeight);
        if (this.nodeMinHeight) node.height = Math.min(node.height, this.nodeMinHeight);

        if (this.nodeWidth) {
          node.width = this.nodeWidth;
        } else {
          // calculate the width
          if (nativeElement.getElementsByTagName('text').length) {
            const textDims = nativeElement.getElementsByTagName('text')[0].getBBox();
            node.width = textDims.width + 20;
          } else {
            node.width = dims.width;
          }
        }

        if (this.nodeMaxWidth) node.width = Math.max(node.width, this.nodeMaxWidth);
        if (this.nodeMinWidth) node.width = Math.min(node.width, this.nodeMinWidth);
      });
    }

    // Dagre to recalc the layout
    dagre.layout(this.graph);

    // Tranposes view options to the node
    const index = {};
    this._nodes.map(n => {
      index[n.id] = n;
      n.options = {
        color: this.colors.getColor(this.groupResultsBy(n)),
        transform: `translate(${n.x - n.width / 2}, ${n.y - n.height / 2})`
      };
    });

    // Update the labels to the new positions
    const newLinks = [];
    for (const k in this.graph._edgeLabels) {
      const l = this.graph._edgeLabels[k];

      const normKey = k.replace(/[^\w]*/g, '');
      let oldLink = this._oldLinks.find(ol => `${ol.source}${ol.target}` === normKey);
      if (!oldLink) {
        oldLink = this._links.find(nl => `${nl.source}${nl.target}` === normKey);
      }

      oldLink.oldLine = oldLink.line;

      const points = l.points;
      const line = this.generateLine(points);

      const newLink = Object.assign({}, oldLink);
      newLink.line = line;
      newLink.points = points;

      const textPos = points[Math.floor(points.length / 2)];
      if (textPos) {
        newLink.textTransform = `translate(${textPos.x},${textPos.y})`;
      }

      newLink.textAngle = 0;
      if (!newLink.oldLine) {
        newLink.oldLine = newLink.line;
      }

      this.calcDominantBaseline(newLink);
      newLinks.push(newLink);
    }

    this._links = newLinks;

    // Map the old links for animations
    if (this._links) {
      this._oldLinks = this._links.map(l => {
        const newL = Object.assign({}, l);
        newL.oldLine = l.line;
        return newL;
      });
    }

    // Calculate the height/width total
    this.graphDims.width = Math.max(...this._nodes.map(n => n.x + n.width));
    this.graphDims.height = Math.max(...this._nodes.map(n => n.y + n.height));

    if (this.autoZoom) {
      const heightZoom = this.dims.height / this.graphDims.height;
      const widthZoom = this.dims.width / (this.graphDims.width);
      const zoomLevel = Math.min(heightZoom, widthZoom, 1);
      if (zoomLevel !== this.zoomLevel) {
        this.zoomLevel = zoomLevel;
        this.updateTransform();
      }
    }

    requestAnimationFrame(() => this.redrawLines());
    this.cd.markForCheck();
  }

  /**
   * Redraws the lines when dragged or viewport updated
   *
   * @param {boolean} [animate=true]
   *
   * @memberOf DirectedGraphComponent
   */
  redrawLines(_animate = true): void {
    this.linkElements.map(linkEl => {
      const l = this._links.find(lin => lin.id === linkEl.nativeElement.id);

      if (l) {
        const linkSelection = select(linkEl.nativeElement).select('.line');
        linkSelection
          .attr('d', l.oldLine)
          .transition()
          .duration(_animate ? 500 : 0)
          .attr('d', l.line);

        const textPathSelection = select(this.chartElement.nativeElement).select(`#${l.id}`);
        textPathSelection
          .attr('d', l.oldTextPath)
          .transition()
          .duration(_animate ? 500 : 0)
          .attr('d', l.textPath);
      }
    });
  }

  /**
   * Creates the dagre graph engine
   *
   *
   * @memberOf DirectedGraphComponent
   */
  createGraph(): void {
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
    this.graph.setDefaultEdgeLabel(() => {
      return { /* empty */ };
    });

    this._nodes = this.nodes.map(n => {
      return Object.assign({}, n);
    });

    this._links = this.links.map(l => {
      const newLink = Object.assign({}, l);
      if (!newLink.id) newLink.id = id();
      return newLink;
    });

    for (const node of this._nodes) {
      node.width = 20;
      node.height = 30;

      // update dagre
      this.graph.setNode(node.id, node);

      // set view options
      node.options = {
        color: this.colors.getColor(this.groupResultsBy(node)),
        transform: `translate( ${node.x - node.width / 2}, ${node.y - node.height / 2})`
      };
    }

    // update dagre
    for (const edge of this._links) {
      this.graph.setEdge(edge.source, edge.target);
    }

    requestAnimationFrame(() => this.draw());
  }

  /**
   * Calculate the text directions / flipping
   *
   * @param {any} link
   *
   * @memberOf DirectedGraphComponent
   */
  calcDominantBaseline(link): void {
    const firstPoint = link.points[0];
    const lastPoint = link.points[link.points.length - 1];
    link.oldTextPath = link.textPath;

    if (lastPoint.x < firstPoint.x) {
      link.dominantBaseline = 'text-before-edge';

      // reverse text path for when its flipped upside down
      link.textPath = this.generateLine([...link.points].reverse());
    } else {
      link.dominantBaseline = 'text-after-edge';
      link.textPath = link.line;
    }
  }

  /**
   * Generate the new line path
   *
   * @param {any} points
   * @returns {*}
   *
   * @memberOf DirectedGraphComponent
   */
  generateLine(points): any {
    const lineFunction = shape.line<any>().x(d => d.x).y(d => d.y).curve(this.curve);
    return lineFunction(points);
  }

  /**
   * Zoom was invoked from event
   *
   * @param {MouseEvent} $event
   * @param {any} direction
   *
   * @memberOf DirectedGraphComponent
   */
  onZoom($event: MouseEvent, direction): void {
    if (direction === 'in') {
      this.zoomLevel += this.zoomSpeed;
    } else {
      this.zoomLevel -= this.zoomSpeed;
    }

    this.zoomLevel = Math.max(this.zoomLevel, this.minZoomLevel);
    this.zoomLevel = Math.min(this.zoomLevel, this.maxZoomLevel);

    this.updateTransform();
  }

  /**
   * Pan was invoked from event
   *
   * @param {any} event
   *
   * @memberOf DirectedGraphComponent
   */
  onPan(event): void {
    this.panOffsetX += event.movementX;
    this.panOffsetY += event.movementY;
    this.updateTransform();
  }

  /**
   * Drag was invoked from an event
   *
   * @param {any} event
   *
   * @memberOf DirectedGraphComponent
   */
  onDrag(event): void {
    const node = this.draggingNode;
    node.x += event.movementX / this.zoomLevel;
    node.y += event.movementY / this.zoomLevel;

    // move the node
    const x = (node.x - (node.width / 2));
    const y = (node.y - (node.height / 2));
    node.options.transform = `translate(${x}, ${y})`;

    for (const link of this._links) {
      if (link.target === node.id || link.source === node.id) {
        const sourceNode = this._nodes.find(n => n.id === link.source);
        const targetNode = this._nodes.find(n => n.id === link.target);

        // determine new arrow position
        const dir = sourceNode.y <= targetNode.y ? -1 : 1;
        const startingPoint = { x: sourceNode.x, y: (sourceNode.y - dir * (sourceNode.height / 2)) };
        const endingPoint = { x: targetNode.x, y: (targetNode.y + dir * (targetNode.height / 2)) };

        // generate new points
        link.points = [startingPoint, endingPoint];
        const line = this.generateLine(link.points);
        this.calcDominantBaseline(link);
        link.oldLine = link.line;
        link.line = line;
      }
    }

    this.redrawLines(false);
  }

  /**
   * Update the entire view for the new pan position
   *
   *
   * @memberOf DirectedGraphComponent
   */
  updateTransform(): void {
    this.transform = `
      translate(${this.panOffsetX}, ${this.panOffsetY}) scale(${this.zoomLevel})
    `;
  }

  /**
   * Node was clicked
   *
   * @param {any} event
   * @returns {void}
   *
   * @memberOf DirectedGraphComponent
   */
  onClick(event): void {
    this.select.emit(event);
  }

  /**
   * Node was focused
   *
   * @param {any} event
   * @returns {void}
   *
   * @memberOf DirectedGraphComponent
   */
  onActivate(event): void {
    if (this.activeEntries.indexOf(event) > -1) return;
    this.activeEntries = [event, ...this.activeEntries];
    this.activate.emit({ value: event, entries: this.activeEntries });
  }

  /**
   * Node was defocused
   *
   * @param {any} event
   *
   * @memberOf DirectedGraphComponent
   */
  onDeactivate(event): void {
    const idx = this.activeEntries.indexOf(event);

    this.activeEntries.splice(idx, 1);
    this.activeEntries = [...this.activeEntries];

    this.deactivate.emit({ value: event, entries: this.activeEntries });
  }

  /**
   * Get the domain series for the nodes
   *
   * @returns {any[]}
   *
   * @memberOf DirectedGraphComponent
   */
  getSeriesDomain(): any[] {
    return this.nodes.map(d => this.groupResultsBy(d))
      .reduce((nodes: any[], node): any[] => nodes.includes(node) ? nodes : nodes.concat([node]), [])
      .sort();
  }

  /**
   * Tracking for the link
   *
   * @param {any} index
   * @param {any} link
   * @returns {*}
   *
   * @memberOf DirectedGraphComponent
   */
  trackLinkBy(index, link): any {
    return link.id;
  }

  /**
   * Tracking for the node
   *
   * @param {any} index
   * @param {any} node
   * @returns {*}
   *
   * @memberOf DirectedGraphComponent
   */
  trackNodeBy(index, node): any {
    return node.id;
  }

  /**
   * Sets the colors the nodes
   *
   *
   * @memberOf DirectedGraphComponent
   */
  setColors(): void {
    this.colors = new ColorHelper(this.scheme, 'ordinal', this.seriesDomain, this.customColors);
  }

  /**
   * Gets the legend options
   *
   * @returns {*}
   *
   * @memberOf DirectedGraphComponent
   */
  getLegendOptions(): any {
    return {
      scaleType: 'ordinal',
      domain: this.seriesDomain,
      colors: this.colors
    };
  }

  /**
   * On mouse move event, used for panning and dragging.
   *
   * @param {MouseEvent} $event
   *
   * @memberOf DirectedGraphComponent
   */
  @HostListener('document:mousemove', ['$event'])
  onMouseMove($event: MouseEvent): void {
    if (this.isPanning && this.panningEnabled) {
      this.onPan($event);
    } else if (this.isDragging && this.draggingEnabled) {
      this.onDrag($event);
    }
  }

  /**
   * On mouse up event to disable panning/dragging.
   *
   * @param {MouseEvent} $event
   *
   * @memberOf DirectedGraphComponent
   */
  @HostListener('document:mouseup')
  onMouseUp($event: MouseEvent): void {
    this.isDragging = false;
    this.isPanning = false;
  }

  /**
   * On node mouse down to kick off dragging
   *
   * @param {MouseEvent} event
   * @param {*} node
   *
   * @memberOf DirectedGraphComponent
   */
  onNodeMouseDown(event: MouseEvent, node: any): void {
    this.isDragging = true;
    this.draggingNode = node;
  }

}

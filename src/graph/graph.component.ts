// rename transition due to conflict with d3 transition
import { animate, style, transition as ngTransition, trigger } from '@angular/animations';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  Output,
  QueryList,
  TemplateRef,
  ViewChild,
  ViewChildren,
  ViewEncapsulation
} from '@angular/core';
import {
  BaseChartComponent,
  ChartComponent,
  ColorHelper,
  ViewDimensions,
  calculateViewDimensions
} from '@swimlane/ngx-charts';
import { select } from 'd3-selection';
import * as shape from 'd3-shape';
import 'd3-transition';
import * as dagre from 'dagre';
import { Observable } from 'rxjs/Observable';
import { Subscription } from 'rxjs/Subscription';
import { identity, scale, toSVG, transform, translate } from 'transformation-matrix';
import { id } from '../utils';

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

@Component({
  selector: 'ngx-graph',
  styleUrls: ['./graph.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [trigger('link', [ngTransition('* => *', [animate(500, style({ transform: '*' }))])])],
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
        (touchstart)="onTouchStart($event)"
        (touchend)="onTouchEnd($event)"
        class="graph chart">
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
            [attr.transform]="'translate(' + ((-dims.width || 0) * 50) +',' + ((-dims.height || 0) *50) + ')' "
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
export class GraphComponent extends BaseChartComponent implements OnInit, OnDestroy, AfterViewInit {
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

  @Input() panningEnabled: boolean = true;

  @Input() enableZoom: boolean = true;
  @Input() zoomSpeed: number = 0.1;
  @Input() minZoomLevel: number = 0.1;
  @Input() maxZoomLevel: number = 4.0;
  @Input() autoZoom: boolean = false;
  @Input() panOnZoom: boolean = true;
  @Input() autoCenter: boolean = false;

  @Input() update$: Observable<any>;
  @Input() center$: Observable<any>;
  @Input() zoomToFit$: Observable<any>;

  @Output() activate: EventEmitter<any> = new EventEmitter();
  @Output() deactivate: EventEmitter<any> = new EventEmitter();

  @ContentChild('linkTemplate') linkTemplate: TemplateRef<any>;
  @ContentChild('nodeTemplate') nodeTemplate: TemplateRef<any>;
  @ContentChild('defsTemplate') defsTemplate: TemplateRef<any>;
  @ViewChild(ChartComponent, { read: ElementRef })
  chart: ElementRef;

  @ViewChildren('nodeElement') nodeElements: QueryList<ElementRef>;
  @ViewChildren('linkElement') linkElements: QueryList<ElementRef>;

  subscriptions: Subscription[] = [];
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
  transformationMatrix: Matrix = identity();
  _touchLastX = null;
  _touchLastY = null;

  @Input() groupResultsBy: (node: any) => string = node => node.label;

  /**
   * Get the current zoom level
   */
  get zoomLevel() {
    return this.transformationMatrix.a;
  }

  /**
   * Set the current zoom level
   */
  @Input('zoomLevel')
  set zoomLevel(level) {
    this.zoomTo(Number(level));
  }

  /**
   * Get the current `x` position of the graph
   */
  get panOffsetX() {
    return this.transformationMatrix.e;
  }

  /**
   * Set the current `x` position of the graph
   */
  @Input('panOffsetX')
  set panOffsetX(x) {
    this.panTo(Number(x), null);
  }

  /**
   * Get the current `y` position of the graph
   */
  get panOffsetY() {
    return this.transformationMatrix.f;
  }

  /**
   * Set the current `y` position of the graph
   */
  @Input('panOffsetY')
  set panOffsetY(y) {
    this.panTo(null, Number(y));
  }

  /**
   * Angular lifecycle event
   *
   *
   * @memberOf GraphComponent
   */
  ngOnInit(): void {
    if (this.update$) {
      this.subscriptions.push(
        this.update$.subscribe(() => {
          this.update();
        })
      );
    }

    if (this.center$) {
      this.subscriptions.push(
        this.center$.subscribe(() => {
          this.center();
        })
      );
    }
    if (this.zoomToFit$) {
      this.subscriptions.push(
        this.zoomToFit$.subscribe(() => {
          this.zoomToFit();
        })
      );
    }
  }

  /**
   * Angular lifecycle event
   *
   *
   * @memberOf GraphComponent
   */
  ngOnDestroy(): void {
    super.ngOnDestroy();
    for (const sub of this.subscriptions) {
      sub.unsubscribe();
    }
    this.subscriptions = null;
  }

  /**
   * Angular lifecycle event
   *
   *
   * @memberOf GraphComponent
   */
  ngAfterViewInit(): void {
    super.ngAfterViewInit();
    setTimeout(() => this.update());
  }

  /**
   * Base class update implementation for the dag graph
   *
   *
   * @memberOf GraphComponent
   */
  update(): void {
    super.update();

    this.zone.run(() => {
      this.dims = calculateViewDimensions({
        width: this.width,
        height: this.height,
        margins: this.margin,
        showLegend: this.legend
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
   * @memberOf GraphComponent
   */
  draw(): void {
    // Calc view dims for the nodes
    if (this.nodeElements && this.nodeElements.length) {
      this.nodeElements.map(elem => {
        const nativeElement = elem.nativeElement;
        const node = this._nodes.find(n => n.id === nativeElement.id);

        // calculate the height
        let dims;
        try {
          dims = nativeElement.getBBox();
        } catch (ex) {
          // Skip drawing if element is not displayed - Firefox would throw an error here
          return;
        }
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
            let textDims;
            try {
              textDims = nativeElement.getElementsByTagName('text')[0].getBBox();
            } catch (ex) {
              // Skip drawing if element is not displayed - Firefox would throw an error here
              return;
            }
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
        transform: `translate(${n.x - n.width / 2 || 0}, ${n.y - n.height / 2 || 0})`
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
        newLink.textTransform = `translate(${textPos.x || 0},${textPos.y || 0})`;
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
      this.zoomToFit();
    }

    if (this.autoCenter) {
      // Auto-center when rendering
      this.center();
    }

    requestAnimationFrame(() => this.redrawLines());
    this.cd.markForCheck();
  }

  /**
   * Redraws the lines when dragged or viewport updated
   *
   * @param {boolean} [animate=true]
   *
   * @memberOf GraphComponent
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
   * @memberOf GraphComponent
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
      return {
        /* empty */
      };
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
        transform: `translate( ${node.x - node.width / 2 || 0}, ${node.y - node.height / 2 || 0})`
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
   * @memberOf GraphComponent
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
   * @memberOf GraphComponent
   */
  generateLine(points): any {
    const lineFunction = shape
      .line<any>()
      .x(d => d.x)
      .y(d => d.y)
      .curve(this.curve);
    return lineFunction(points);
  }

  /**
   * Zoom was invoked from event
   *
   * @param {MouseEvent} $event
   * @param {any} direction
   *
   * @memberOf GraphComponent
   */
  onZoom($event: MouseEvent, direction): void {
    const zoomFactor = 1 + (direction === 'in' ? this.zoomSpeed : -this.zoomSpeed);

    // Check that zooming wouldn't put us out of bounds
    const newZoomLevel = this.zoomLevel * zoomFactor;
    if (newZoomLevel <= this.minZoomLevel || newZoomLevel >= this.maxZoomLevel) {
      return;
    }

    // Check if zooming is enabled or not
    if (!this.enableZoom) {
      return;
    }

    if (this.panOnZoom === true && $event) {
      // Absolute mouse X/Y on the screen
      const mouseX = $event.clientX;
      const mouseY = $event.clientY;

      // Transform the mouse X/Y into a SVG X/Y
      const svg = this.chart.nativeElement.querySelector('svg');
      const svgGroup = svg.querySelector('g.chart');

      const point = svg.createSVGPoint();
      point.x = mouseX;
      point.y = mouseY;
      const svgPoint = point.matrixTransform(svgGroup.getScreenCTM().inverse());

      // Panzoom
      this.pan(svgPoint.x, svgPoint.y);
      this.zoom(zoomFactor);
      this.pan(-svgPoint.x, -svgPoint.y);
    } else {
      this.zoom(zoomFactor);
    }
  }

  /**
   * Pan by x/y
   *
   * @param x
   * @param y
   */
  pan(x: number, y: number): void {
    this.transformationMatrix = transform(this.transformationMatrix, translate(x, y));

    this.updateTransform();
  }

  /**
   * Pan to a fixed x/y
   *
   * @param x
   * @param y
   */
  panTo(x: number, y: number): void {
    this.transformationMatrix.e = x === null || x === undefined || isNaN(x) ? this.transformationMatrix.e : Number(x);
    this.transformationMatrix.f = y === null || y === undefined || isNaN(y) ? this.transformationMatrix.f : Number(y);

    this.updateTransform();
  }

  /**
   * Zoom by a factor
   *
   * @param factor Zoom multiplicative factor (1.1 for zooming in 10%, for instance)
   */
  zoom(factor: number): void {
    this.transformationMatrix = transform(this.transformationMatrix, scale(factor, factor));

    this.updateTransform();
  }

  /**
   * Zoom to a fixed level
   *
   * @param level
   */
  zoomTo(level: number): void {
    this.transformationMatrix.a = isNaN(level) ? this.transformationMatrix.a : Number(level);
    this.transformationMatrix.d = isNaN(level) ? this.transformationMatrix.d : Number(level);

    this.updateTransform();
  }

  /**
   * Pan was invoked from event
   *
   * @param {any} event
   *
   * @memberOf GraphComponent
   */
  onPan(event): void {
    this.pan(event.movementX, event.movementY);
  }

  /**
   * Drag was invoked from an event
   *
   * @param {any} event
   *
   * @memberOf GraphComponent
   */
  onDrag(event): void {
    const node = this.draggingNode;
    node.x += event.movementX / this.zoomLevel;
    node.y += event.movementY / this.zoomLevel;

    // move the node
    const x = node.x - node.width / 2;
    const y = node.y - node.height / 2;
    node.options.transform = `translate(${x}, ${y})`;

    for (const link of this._links) {
      if (link.target === node.id || link.source === node.id) {
        const sourceNode = this._nodes.find(n => n.id === link.source);
        const targetNode = this._nodes.find(n => n.id === link.target);

        // determine new arrow position
        const dir = sourceNode.y <= targetNode.y ? -1 : 1;
        const startingPoint = {
          x: sourceNode.x,
          y: sourceNode.y - dir * (sourceNode.height / 2)
        };
        const endingPoint = {
          x: targetNode.x,
          y: targetNode.y + dir * (targetNode.height / 2)
        };

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
   * @memberOf GraphComponent
   */
  updateTransform(): void {
    this.transform = toSVG(this.transformationMatrix);
  }

  /**
   * Node was clicked
   *
   * @param {any} event
   * @returns {void}
   *
   * @memberOf GraphComponent
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
   * @memberOf GraphComponent
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
   * @memberOf GraphComponent
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
   * @memberOf GraphComponent
   */
  getSeriesDomain(): any[] {
    return this.nodes
      .map(d => this.groupResultsBy(d))
      .reduce((nodes: any[], node): any[] => (nodes.includes(node) ? nodes : nodes.concat([node])), [])
      .sort();
  }

  /**
   * Tracking for the link
   *
   * @param {any} index
   * @param {any} link
   * @returns {*}
   *
   * @memberOf GraphComponent
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
   * @memberOf GraphComponent
   */
  trackNodeBy(index, node): any {
    return node.id;
  }

  /**
   * Sets the colors the nodes
   *
   *
   * @memberOf GraphComponent
   */
  setColors(): void {
    this.colors = new ColorHelper(this.scheme, 'ordinal', this.seriesDomain, this.customColors);
  }

  /**
   * Gets the legend options
   *
   * @returns {*}
   *
   * @memberOf GraphComponent
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
   * @memberOf GraphComponent
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
   * On touch start event to enable panning.
   *
   * @param {TouchEvent} $event
   *
   * @memberOf GraphComponent
   */
  onTouchStart(event) {
    this._touchLastX = event.changedTouches[0].clientX;
    this._touchLastY = event.changedTouches[0].clientY;

    this.isPanning = true;
  }

  /**
   * On touch move event, used for panning.
   *
   * @param {TouchEvent} $event
   *
   * @memberOf GraphComponent
   */
  @HostListener('document:touchmove', ['$event'])
  onTouchMove($event: TouchEvent): void {
    if (this.isPanning && this.panningEnabled) {
      const clientX = $event.changedTouches[0].clientX;
      const clientY = $event.changedTouches[0].clientY;
      const movementX = clientX - this._touchLastX;
      const movementY = clientY - this._touchLastY;
      this._touchLastX = clientX;
      this._touchLastY = clientY;

      this.pan(movementX, movementY);
    }
  }

  /**
   * On touch end event to disable panning.
   *
   * @param {TouchEvent} $event
   *
   * @memberOf GraphComponent
   */
  onTouchEnd(event) {
    this.isPanning = false;
  }

  /**
   * On mouse up event to disable panning/dragging.
   *
   * @param {MouseEvent} $event
   *
   * @memberOf GraphComponent
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
   * @memberOf GraphComponent
   */
  onNodeMouseDown(event: MouseEvent, node: any): void {
    this.isDragging = true;
    this.draggingNode = node;
  }

  /**
   * Center the graph in the viewport
   */
  center(): void {
    this.panTo(
      this.dims.width / 2 - this.graphDims.width * this.zoomLevel / 2,
      this.dims.height / 2 - this.graphDims.height * this.zoomLevel / 2
    );
  }

  /**
   * Zooms to fit the entier graph
   */
  zoomToFit(): void {
    const heightZoom = this.dims.height / this.graphDims.height;
    const widthZoom = this.dims.width / this.graphDims.width;
    const zoomLevel = Math.min(heightZoom, widthZoom, 1);
    if (zoomLevel !== this.zoomLevel) {
      this.zoomLevel = zoomLevel;
      this.updateTransform();
    }
  }
}

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
  ViewEncapsulation,
  NgZone,
  ChangeDetectorRef,
  OnChanges,
  SimpleChanges
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
import { Observable, Subscription, of } from 'rxjs';
import { first } from 'rxjs/operators';
import { identity, scale, toSVG, transform, translate } from 'transformation-matrix';
import { Layout } from '../models/layout.model';
import { LayoutService } from './layouts/layout.service';
import { Edge } from '../models/edge.model';
import { Node, ClusterNode } from '../models/node.model';
import { Graph } from '../models/graph.model';
import { id } from '../utils/id';

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
  templateUrl: 'graph.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [trigger('link', [ngTransition('* => *', [animate(500, style({ transform: '*' }))])])]
})
export class GraphComponent extends BaseChartComponent implements OnInit, OnChanges, OnDestroy, AfterViewInit {
  @Input() legend: boolean = false;
  @Input() nodes: Node[] = [];
  @Input() clusters: ClusterNode[] = [];
  @Input() links: Edge[] = [];
  @Input() activeEntries: any[] = [];
  @Input() curve: any;
  @Input() draggingEnabled = true;
  @Input() nodeHeight: number;
  @Input() nodeMaxHeight: number;
  @Input() nodeMinHeight: number;
  @Input() nodeWidth: number;
  @Input() nodeMinWidth: number;
  @Input() nodeMaxWidth: number;
  @Input() panningEnabled = true;
  @Input() enableZoom = true;
  @Input() zoomSpeed = 0.1;
  @Input() minZoomLevel = 0.1;
  @Input() maxZoomLevel = 4.0;
  @Input() autoZoom = false;
  @Input() panOnZoom = true;
  @Input() autoCenter = false;
  @Input() update$: Observable<any>;
  @Input() center$: Observable<any>;
  @Input() zoomToFit$: Observable<any>;
  @Input() panToNode$: Observable<any>;
  @Input() layout: string | Layout;
  @Input() layoutSettings: any;

  @Output() activate: EventEmitter<any> = new EventEmitter();
  @Output() deactivate: EventEmitter<any> = new EventEmitter();
  @Output() zoomChange: EventEmitter<number> = new EventEmitter();

  @ContentChild('linkTemplate') linkTemplate: TemplateRef<any>;
  @ContentChild('nodeTemplate') nodeTemplate: TemplateRef<any>;
  @ContentChild('clusterTemplate') clusterTemplate: TemplateRef<any>;
  @ContentChild('defsTemplate') defsTemplate: TemplateRef<any>;

  @ViewChild(ChartComponent, { read: ElementRef }) chart: ElementRef;
  @ViewChildren('nodeElement') nodeElements: QueryList<ElementRef>;
  @ViewChildren('linkElement') linkElements: QueryList<ElementRef>;

  graphSubscription: Subscription = new Subscription();
  subscriptions: Subscription[] = [];
  colors: ColorHelper;
  dims: ViewDimensions;
  margin = [0, 0, 0, 0];
  results = [];
  seriesDomain: any;
  transform: string;
  legendOptions: any;
  isPanning = false;
  isDragging = false;
  draggingNode: Node;
  initialized = false;
  graph: Graph;
  graphDims: any = { width: 0, height: 0 };
  _oldLinks: Edge[] = [];
  transformationMatrix: Matrix = identity();
  _touchLastX = null;
  _touchLastY = null;

  constructor(
    private el: ElementRef,
    public zone: NgZone,
    public cd: ChangeDetectorRef,
    private layoutService: LayoutService
  ) {
    super(el, zone, cd);
  }

  @Input()
  groupResultsBy: (node: any) => string = node => node.label;

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

    if (this.panToNode$) {
      this.subscriptions.push(
        this.panToNode$.subscribe((nodeId: string) => {
          this.panToNodeId(nodeId);
        })
      );
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    const { layout, layoutSettings, nodes, clusters, links } = changes;
    this.setLayout(this.layout);
    if (layoutSettings) {
      this.setLayoutSettings(this.layoutSettings);
    }
    this.update();
  }

  setLayout(layout: string | Layout): void {
    this.initialized = false;
    if (!layout) {
      layout = 'dagre';
    }
    if (typeof layout === 'string') {
      this.layout = this.layoutService.getLayout(layout);
      this.setLayoutSettings(this.layoutSettings);
    }
  }

  setLayoutSettings(settings: any): void {
    if (this.layout && typeof this.layout !== 'string') {
      this.layout.settings = settings;
      this.update();
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
   * @memberOf GraphComponent
   */
  update(): void {
    super.update();
    if (!this.curve) {
      this.curve = shape.curveBundle.beta(1);
    }

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
   * Creates the dagre graph engine
   *
   * @memberOf GraphComponent
   */
  createGraph(): void {
    this.graphSubscription.unsubscribe();
    this.graphSubscription = new Subscription();
    const initializeNode = n => {
      if (!n.meta) {
        n.meta = {};
      }
      if (!n.id) {
        n.id = id();
      }
      if (!n.dimension) {
        n.dimension = {
          width: this.nodeWidth ? this.nodeWidth : 30,
          height: this.nodeHeight ? this.nodeHeight : 30
        };

        n.meta.forceDimensions = false;
      } else {
        n.meta.forceDimensions = n.meta.forceDimensions === undefined ? true : n.meta.forceDimensions;
      }
      n.position = {
        x: 0,
        y: 0
      };
      n.data = n.data ? n.data : {};
      return n;
    };

    this.graph = {
      nodes: [...this.nodes].map(initializeNode),
      clusters: [...(this.clusters || [])].map(initializeNode),
      edges: [...this.links].map(e => {
        if (!e.id) {
          e.id = id();
        }
        return e;
      })
    };

    requestAnimationFrame(() => this.draw());
  }

  /**
   * Draws the graph using dagre layouts
   *
   *
   * @memberOf GraphComponent
   */
  draw(): void {
    if (!this.layout || typeof this.layout === 'string') {
      return;
    }
    // Calc view dims for the nodes
    this.applyNodeDimensions();

    // Recalc the layout
    const result = this.layout.run(this.graph);
    const result$ = result instanceof Observable ? result : of(result);
    this.graphSubscription.add(
      result$.subscribe(graph => {
        this.graph = graph;
        this.tick();
      })
    );
    result$.pipe(first(graph => graph.nodes.length > 0)).subscribe(() => this.applyNodeDimensions());
  }

  tick() {
    // Transposes view options to the node
    this.graph.nodes.map(n => {
      n.transform = `translate(${n.position.x - n.dimension.width / 2 || 0}, ${n.position.y - n.dimension.height / 2 ||
        0})`;
      if (!n.data) {
        n.data = {};
      }
      n.data.color = this.colors.getColor(this.groupResultsBy(n));
    });
    (this.graph.clusters || []).map(n => {
      n.transform = `translate(${n.position.x - n.dimension.width / 2 || 0}, ${n.position.y - n.dimension.height / 2 ||
        0})`;
      if (!n.data) {
        n.data = {};
      }
      n.data.color = this.colors.getColor(this.groupResultsBy(n));
    });

    // Update the labels to the new positions
    const newLinks = [];
    for (const edgeLabelId in this.graph.edgeLabels) {
      const edgeLabel = this.graph.edgeLabels[edgeLabelId];

      const normKey = edgeLabelId.replace(/[^\w-]*/g, '');
      let oldLink = this._oldLinks.find(ol => `${ol.source}${ol.target}` === normKey);
      if (!oldLink) {
        oldLink = this.graph.edges.find(nl => `${nl.source}${nl.target}` === normKey) || edgeLabel;
      }

      oldLink.oldLine = oldLink.line;

      const points = edgeLabel.points;
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

    this.graph.edges = newLinks;

    // Map the old links for animations
    if (this.graph.edges) {
      this._oldLinks = this.graph.edges.map(l => {
        const newL = Object.assign({}, l);
        newL.oldLine = l.line;
        return newL;
      });
    }

    // Calculate the height/width total
    this.graphDims.width = Math.max(...this.graph.nodes.map(n => n.position.x + n.dimension.width));
    this.graphDims.height = Math.max(...this.graph.nodes.map(n => n.position.y + n.dimension.height));

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
   * Measures the node element and applies the dimensions
   *
   * @memberOf GraphComponent
   */
  applyNodeDimensions(): void {
    if (this.nodeElements && this.nodeElements.length) {
      this.nodeElements.map(elem => {
        const nativeElement = elem.nativeElement;
        const node = this.graph.nodes.find(n => n.id === nativeElement.id);

        // calculate the height
        let dims;
        try {
          dims = nativeElement.getBBox();
        } catch (ex) {
          // Skip drawing if element is not displayed - Firefox would throw an error here
          return;
        }
        if (this.nodeHeight) {          
          node.dimension.height = node.dimension.height && node.meta.forceDimensions ? node.dimension.height : this.nodeHeight;
        } else {
          node.dimension.height = node.dimension.height && node.meta.forceDimensions ? node.dimension.height : dims.height;
        }

        if (this.nodeMaxHeight) {
          node.dimension.height = Math.max(node.dimension.height, this.nodeMaxHeight);
        }
        if (this.nodeMinHeight) {
          node.dimension.height = Math.min(node.dimension.height, this.nodeMinHeight);
        }

        if (this.nodeWidth) {
          node.dimension.width =  node.dimension.width && node.meta.forceDimensions ? node.dimension.width : this.nodeWidth;
        } else {
          // calculate the width
          if (nativeElement.getElementsByTagName('text').length) {
            let maxTextDims;
            try {
              for (const textElem of nativeElement.getElementsByTagName('text')) {
                const currentBBox = textElem.getBBox();
                if (!maxTextDims) {
                  maxTextDims = currentBBox;
                } else {
                  if (currentBBox.width > maxTextDims.width) {
                    maxTextDims.width = currentBBox.width;
                  }
                  if (currentBBox.height > maxTextDims.height) {
                    maxTextDims.height = currentBBox.height;
                  }
                }
              }
            } catch (ex) {
              // Skip drawing if element is not displayed - Firefox would throw an error here
              return;
            }
            node.dimension.width = node.dimension.width && node.meta.forceDimensions ? node.dimension.width : maxTextDims.width + 20;
          } else {
            node.dimension.width = node.dimension.width && node.meta.forceDimensions ? node.dimension.width : dims.width;
          }
        }

        if (this.nodeMaxWidth) {
          node.dimension.width = Math.max(node.dimension.width, this.nodeMaxWidth);
        }
        if (this.nodeMinWidth) {
          node.dimension.width = Math.min(node.dimension.width, this.nodeMinWidth);
        }
      });
    }
  }

  /**
   * Redraws the lines when dragged or viewport updated
   *
   * @memberOf GraphComponent
   */
  redrawLines(_animate = true): void {
    this.linkElements.map(linkEl => {
      const edge = this.graph.edges.find(lin => lin.id === linkEl.nativeElement.id);

      if (edge) {
        const linkSelection = select(linkEl.nativeElement).select('.line');
        linkSelection
          .attr('d', edge.oldLine)
          .transition()
          .duration(_animate ? 500 : 0)
          .attr('d', edge.line);

        const textPathSelection = select(this.chartElement.nativeElement).select(`#${edge.id}`);
        textPathSelection
          .attr('d', edge.oldTextPath)
          .transition()
          .duration(_animate ? 500 : 0)
          .attr('d', edge.textPath);
      }
    });
  }

  /**
   * Calculate the text directions / flipping
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
      this.pan(svgPoint.x, svgPoint.y, true);
      this.zoom(zoomFactor);
      this.pan(-svgPoint.x, -svgPoint.y, true);
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
  pan(x: number, y: number, ignoreZoomLevel: boolean = false): void {
    const zoomLevel = ignoreZoomLevel ? 1 : this.zoomLevel;
    this.transformationMatrix = transform(this.transformationMatrix, translate(x / zoomLevel, y / zoomLevel));

    this.updateTransform();
  }

  /**
   * Pan to a fixed x/y
   *
   */
  panTo(x: number, y: number): void {
    if (x === null || x === undefined || isNaN(x) || y === null || y === undefined || isNaN(y)) {
      return;
    }

    const panX = -this.panOffsetX - x * this.zoomLevel + this.dims.width / 2;
    const panY = -this.panOffsetY - y * this.zoomLevel + this.dims.height / 2;

    this.transformationMatrix = transform(
      this.transformationMatrix,
      translate(panX / this.zoomLevel, panY / this.zoomLevel)
    );

    this.updateTransform();
  }

  /**
   * Zoom by a factor
   *
   */
  zoom(factor: number): void {
    this.transformationMatrix = transform(this.transformationMatrix, scale(factor, factor));
    this.zoomChange.emit(this.zoomLevel);
    this.updateTransform();
  }

  /**
   * Zoom to a fixed level
   *
   */
  zoomTo(level: number): void {
    this.transformationMatrix.a = isNaN(level) ? this.transformationMatrix.a : Number(level);
    this.transformationMatrix.d = isNaN(level) ? this.transformationMatrix.d : Number(level);
    this.zoomChange.emit(this.zoomLevel);
    this.updateTransform();
    this.update();
  }

  /**
   * Pan was invoked from event
   *
   * @memberOf GraphComponent
   */
  onPan(event): void {
    this.pan(event.movementX, event.movementY);
  }

  /**
   * Drag was invoked from an event
   *
   * @memberOf GraphComponent
   */
  onDrag(event): void {
    if (!this.draggingEnabled) {
      return;
    }
    const node = this.draggingNode;
    if (this.layout && typeof this.layout !== 'string' && this.layout.onDrag) {
      this.layout.onDrag(node, event);
    }

    node.position.x += event.movementX / this.zoomLevel;
    node.position.y += event.movementY / this.zoomLevel;

    // move the node
    const x = node.position.x - node.dimension.width / 2;
    const y = node.position.y - node.dimension.height / 2;
    node.transform = `translate(${x}, ${y})`;

    for (const link of this.graph.edges) {
      if (
        link.target === node.id ||
        link.source === node.id ||
        (link.target as any).id === node.id ||
        (link.source as any).id === node.id
      ) {
        if (this.layout && typeof this.layout !== 'string') {
          const result = this.layout.updateEdge(this.graph, link);
          const result$ = result instanceof Observable ? result : of(result);
          this.graphSubscription.add(
            result$.subscribe(graph => {
              this.graph = graph;
              this.redrawEdge(link);
            })
          );
        }
      }
    }

    this.redrawLines(false);
  }

  redrawEdge(edge: Edge) {
    const line = this.generateLine(edge.points);
    this.calcDominantBaseline(edge);
    edge.oldLine = edge.line;
    edge.line = line;
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
   *
   * @memberOf GraphComponent
   */
  onClick(event): void {
    this.select.emit(event);
  }

  /**
   * Node was focused
   *
   *
   * @memberOf GraphComponent
   */
  onActivate(event): void {
    if (this.activeEntries.indexOf(event) > -1) {
      return;
    }
    this.activeEntries = [event, ...this.activeEntries];
    this.activate.emit({ value: event, entries: this.activeEntries });
  }

  /**
   * Node was defocused
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
   * @memberOf GraphComponent
   */
  getSeriesDomain(): any[] {
    return this.nodes
      .map(d => this.groupResultsBy(d))
      .reduce((nodes: string[], node): any[] => (nodes.indexOf(node) !== -1 ? nodes : nodes.concat([node])), [])
      .sort();
  }

  /**
   * Tracking for the link
   *
   *
   * @memberOf GraphComponent
   */
  trackLinkBy(index, link): any {
    return link.id;
  }

  /**
   * Tracking for the node
   *
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
   * @memberOf GraphComponent
   */
  onTouchEnd(event) {
    this.isPanning = false;
  }

  /**
   * On mouse up event to disable panning/dragging.
   *
   * @memberOf GraphComponent
   */
  @HostListener('document:mouseup')
  onMouseUp(event: MouseEvent): void {
    this.isDragging = false;
    this.isPanning = false;
    if (this.layout && typeof this.layout !== 'string' && this.layout.onDragEnd) {
      this.layout.onDragEnd(this.draggingNode, event);
    }
  }

  /**
   * On node mouse down to kick off dragging
   *
   * @memberOf GraphComponent
   */
  onNodeMouseDown(event: MouseEvent, node: any): void {
    if (!this.draggingEnabled) {
      return;
    }
    this.isDragging = true;
    this.draggingNode = node;

    if (this.layout && typeof this.layout !== 'string' && this.layout.onDragStart) {
      this.layout.onDragStart(node, event);
    }
  }

  /**
   * Center the graph in the viewport
   */
  center(): void {
    this.panTo(this.graphDims.width / 2, this.graphDims.height / 2);
  }

  /**
   * Zooms to fit the entier graph
   */
  zoomToFit(): void {
    const heightZoom = this.dims.height / this.graphDims.height;
    const widthZoom = this.dims.width / this.graphDims.width;
    const zoomLevel = Math.min(heightZoom, widthZoom, 1);

    if (zoomLevel <= this.minZoomLevel || zoomLevel >= this.maxZoomLevel) {
      return;
    }
    
    if (zoomLevel !== this.zoomLevel) {
      this.zoomLevel = zoomLevel;
      this.updateTransform();
      this.zoomChange.emit(this.zoomLevel);
    }
    this.update();
  }

  /**
   * Pans to the node
   * @param nodeId 
   */
  panToNodeId(nodeId: string): void {
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) {
      return;
    }

    this.panTo(node.position.x, node.position.y);
  }
}

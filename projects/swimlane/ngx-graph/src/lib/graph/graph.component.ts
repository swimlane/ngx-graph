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
  ViewChildren,
  ViewEncapsulation,
  NgZone,
  ChangeDetectorRef,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { select } from 'd3-selection';
import * as shape from 'd3-shape';
import * as ease from 'd3-ease';
import 'd3-transition';
import { Observable, Subscription, of, fromEvent as observableFromEvent, Subject } from 'rxjs';
import { first, debounceTime, takeUntil } from 'rxjs/operators';
import { identity, scale, smoothMatrix, toSVG, transform, translate } from 'transformation-matrix';
import { Layout } from '../models/layout.model';
import { LayoutService } from './layouts/layout.service';
import { Edge } from '../models/edge.model';
import { Node, ClusterNode, CompoundNode } from '../models/node.model';
import { Graph } from '../models/graph.model';
import { id } from '../utils/id';
import { PanningAxis } from '../enums/panning.enum';
import { MiniMapPosition } from '../enums/mini-map-position.enum';
import { throttleable } from '../utils/throttle';
import { ColorHelper } from '../utils/color.helper';
import { ViewDimensions, calculateViewDimensions } from '../utils/view-dimensions.helper';
import { VisibilityObserver } from '../utils/visibility-observer';

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

export interface NgxGraphZoomOptions {
  autoCenter?: boolean;
  force?: boolean;
}

export enum NgxGraphStates {
  Init = 'init',
  Subscribe = 'subscribe',
  Transform = 'transform',
  /* eslint-disable @typescript-eslint/no-shadow */
  Output = 'output'
}

export interface NgxGraphStateChangeEvent {
  state: NgxGraphStates;
}

@Component({
  selector: 'ngx-graph',
  styleUrls: ['./graph.component.scss'],
  templateUrl: 'graph.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('animationState', [
      ngTransition(':enter', [style({ opacity: 0 }), animate('500ms 100ms', style({ opacity: 1 }))])
    ])
  ],
  standalone: false
})
export class GraphComponent implements OnInit, OnChanges, OnDestroy, AfterViewInit {
  @Input() nodes: Node[] = [];
  @Input() clusters: ClusterNode[] = [];
  @Input() compoundNodes: CompoundNode[] = [];
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
  @Input() panningEnabled: boolean = true;
  @Input() panningAxis: PanningAxis = PanningAxis.Both;
  @Input() enableZoom = true;
  @Input() zoomSpeed = 0.1;
  @Input() minZoomLevel = 0.1;
  @Input() maxZoomLevel = 4.0;
  @Input() autoZoom = false;
  @Input() panOnZoom = true;
  @Input() animate? = false;
  @Input() autoCenter = false;
  @Input() update$: Observable<any>;
  @Input() center$: Observable<any>;
  @Input() zoomToFit$: Observable<NgxGraphZoomOptions>;
  @Input() panToNode$: Observable<any>;
  @Input() layout: string | Layout;
  @Input() layoutSettings: any;
  @Input() enableTrackpadSupport = false;
  @Input() showMiniMap: boolean = false;
  @Input() miniMapMaxWidth: number = 100;
  @Input() miniMapMaxHeight: number;
  @Input() miniMapPosition: MiniMapPosition = MiniMapPosition.UpperRight;
  @Input() view: [number, number];
  @Input() scheme: any = 'cool';
  @Input() customColors: any;
  @Input() deferDisplayUntilPosition: boolean = false;
  @Input() centerNodesOnPositionChange = true;
  @Input() enablePreUpdateTransform = true;

  @Output() select = new EventEmitter();
  @Output() activate: EventEmitter<any> = new EventEmitter();
  @Output() deactivate: EventEmitter<any> = new EventEmitter();
  @Output() zoomChange: EventEmitter<number> = new EventEmitter();
  @Output() clickHandler: EventEmitter<MouseEvent> = new EventEmitter();
  @Output() stateChange: EventEmitter<NgxGraphStateChangeEvent> = new EventEmitter();

  @ContentChild('linkTemplate') linkTemplate: TemplateRef<any>;
  @ContentChild('nodeTemplate') nodeTemplate: TemplateRef<any>;
  @ContentChild('clusterTemplate') clusterTemplate: TemplateRef<any>;
  @ContentChild('defsTemplate') defsTemplate: TemplateRef<any>;
  @ContentChild('miniMapNodeTemplate') miniMapNodeTemplate: TemplateRef<any>;

  @ViewChildren('nodeElement') nodeElements: QueryList<ElementRef>;
  @ViewChildren('linkElement') linkElements: QueryList<ElementRef>;

  public chartWidth: any;

  private isMouseMoveCalled: boolean = false;

  graphSubscription: Subscription = new Subscription();
  colors: ColorHelper;
  dims: ViewDimensions;
  seriesDomain: any;
  transform: string;
  isPanning = false;
  isDragging = false;
  draggingNode: Node;
  initialized = false;
  graph: Graph;
  graphDims: any = { width: 0, height: 0 };
  _oldLinks: Edge[] = [];
  oldNodes: Set<string> = new Set();
  oldClusters: Set<string> = new Set();
  oldCompoundNodes: Set<string> = new Set();
  transformationMatrix: Matrix = identity();
  _touchLastX = null;
  _touchLastY = null;
  minimapScaleCoefficient: number = 3;
  minimapTransform: string;
  minimapOffsetX: number = 0;
  minimapOffsetY: number = 0;
  isMinimapPanning = false;
  minimapClipPathId: string;
  width: number;
  height: number;
  resizeSubscription: any;
  visibilityObserver: VisibilityObserver;
  private destroy$ = new Subject<void>();

  constructor(
    private el: ElementRef,
    public zone: NgZone,
    public cd: ChangeDetectorRef,
    private layoutService: LayoutService
  ) {}

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
      this.update$.pipe(takeUntil(this.destroy$)).subscribe(() => {
        this.update();
      });
    }

    if (this.center$) {
      this.center$.pipe(takeUntil(this.destroy$)).subscribe(() => {
        this.center();
      });
    }

    if (this.zoomToFit$) {
      this.zoomToFit$.pipe(takeUntil(this.destroy$)).subscribe(options => {
        this.zoomToFit(options ? options : {});
      });
    }

    if (this.panToNode$) {
      this.panToNode$.pipe(takeUntil(this.destroy$)).subscribe((nodeId: string) => {
        this.panToNodeId(nodeId);
      });
    }

    this.minimapClipPathId = `minimapClip${id()}`;
    this.stateChange.emit({ state: NgxGraphStates.Subscribe });
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.basicUpdate();
    const { layoutSettings } = changes;
    this.setLayout(this.layout);
    if (layoutSettings) {
      this.setLayoutSettings(this.layoutSettings);
    }
    if (this.layout && this.nodes.length && this.links.length) {
      this.update();
    }
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
    }
  }

  /**
   * Angular lifecycle event
   *
   *
   * @memberOf GraphComponent
   */
  ngOnDestroy(): void {
    this.unbindEvents();
    if (this.visibilityObserver) {
      this.visibilityObserver.visible.unsubscribe();
      this.visibilityObserver.destroy();
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Angular lifecycle event
   *
   *
   * @memberOf GraphComponent
   */
  ngAfterViewInit(): void {
    this.bindWindowResizeEvent();

    // listen for visibility of the element for hidden by default scenario
    this.visibilityObserver = new VisibilityObserver(this.el, this.zone);
    this.visibilityObserver.visible.subscribe(this.update.bind(this));

    setTimeout(() => this.update());
  }

  /**
   * Base class update implementation for the dag graph
   *
   * @memberOf GraphComponent
   */
  update(): void {
    this.basicUpdate();
    if (!this.curve) {
      this.curve = shape.curveBundle.beta(1);
    }

    this.zone.run(() => {
      this.dims = calculateViewDimensions({
        width: this.width,
        height: this.height
      });

      this.seriesDomain = this.getSeriesDomain();
      this.setColors();

      this.createGraph();
      this.updateTransform();
      if (!this.initialized) {
        this.stateChange.emit({ state: NgxGraphStates.Init });
      }
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
    const initializeNode = (n: Node) => {
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
      if (!n.position) {
        n.position = {
          x: 0,
          y: 0
        };
        if (this.deferDisplayUntilPosition) {
          n.hidden = true;
        }
      }
      n.data = n.data ? n.data : {};
      return n;
    };

    const initializeEdge = (e: Edge) => {
      if (!e.id) {
        e.id = id();
      }
      return e;
    };

    this.graph = {
      nodes: this.nodes.map(n => initializeNode(n)),
      clusters: this.clusters.map(n => initializeNode(n)),
      compoundNodes: this.compoundNodes.map(n => initializeNode(n)),
      edges: this.links.map(e => initializeEdge(e))
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
    // Recalculate the layout
    const result = (this.layout as Layout).run(this.graph);
    const result$ = result instanceof Observable ? result : of(result);
    this.graphSubscription.add(
      result$.subscribe(graph => {
        this.graph = graph;
        this.tick();
      })
    );
  }

  tick() {
    // Transposes view options to the node
    const oldNodes: Set<string> = new Set();
    const oldClusters: Set<string> = new Set();
    const oldCompoundNodes: Set<string> = new Set();

    this.graph.nodes.forEach(n => {
      n.transform = `translate(${n.position.x - (this.centerNodesOnPositionChange ? n.dimension.width / 2 : 0) || 0}, ${
        n.position.y - (this.centerNodesOnPositionChange ? n.dimension.height / 2 : 0) || 0
      })`;
      if (!n.data) {
        n.data = {};
      }
      n.data.color = this.colors.getColor(this.groupResultsBy(n));
      if (this.deferDisplayUntilPosition) {
        n.hidden = false;
      }
      oldNodes.add(n.id);
    });

    (this.graph.clusters || []).forEach(n => {
      n.transform = `translate(${n.position.x - (this.centerNodesOnPositionChange ? n.dimension.width / 2 : 0) || 0}, ${
        n.position.y - (this.centerNodesOnPositionChange ? n.dimension.height / 2 : 0) || 0
      })`;
      if (!n.data) {
        n.data = {};
      }
      n.data.color = this.colors.getColor(this.groupResultsBy(n));
      if (this.deferDisplayUntilPosition) {
        n.hidden = false;
      }
      oldClusters.add(n.id);
    });

    (this.graph.compoundNodes || []).forEach(n => {
      n.transform = `translate(${n.position.x - (this.centerNodesOnPositionChange ? n.dimension.width / 2 : 0) || 0}, ${
        n.position.y - (this.centerNodesOnPositionChange ? n.dimension.height / 2 : 0) || 0
      })`;
      if (!n.data) {
        n.data = {};
      }
      n.data.color = this.colors.getColor(this.groupResultsBy(n));
      if (this.deferDisplayUntilPosition) {
        n.hidden = false;
      }
      oldCompoundNodes.add(n.id);
    });

    // Prevent animations on new nodes
    setTimeout(() => {
      this.oldNodes = oldNodes;
      this.oldClusters = oldClusters;
      this.oldCompoundNodes = oldCompoundNodes;
    }, 500);

    // Update the labels to the new positions
    const newLinks = [];
    for (const edgeLabelId in this.graph.edgeLabels) {
      const edgeLabel = this.graph.edgeLabels[edgeLabelId];

      const normKey = edgeLabelId.replace(/[^\w-]*/g, '');

      const isMultigraph =
        this.layout && typeof this.layout !== 'string' && this.layout.settings && this.layout.settings.multigraph;

      let oldLink = isMultigraph
        ? this._oldLinks.find(ol => `${ol.source}${ol.target}${ol.id}` === normKey)
        : this._oldLinks.find(ol => `${ol.source}${ol.target}` === normKey);

      const linkFromGraph = isMultigraph
        ? this.graph.edges.find(nl => `${nl.source}${nl.target}${nl.id}` === normKey)
        : this.graph.edges.find(nl => `${nl.source}${nl.target}` === normKey);

      if (!oldLink) {
        oldLink = linkFromGraph || edgeLabel;
      } else if (
        oldLink.data &&
        linkFromGraph &&
        linkFromGraph.data &&
        JSON.stringify(oldLink.data) !== JSON.stringify(linkFromGraph.data)
      ) {
        // Compare old link to new link and replace if not equal
        oldLink.data = linkFromGraph.data;
      }

      oldLink.oldLine = oldLink.line;

      const points = edgeLabel.points;
      const line = this.generateLine(points);

      const newLink = Object.assign({}, oldLink);
      newLink.line = line;
      newLink.points = points;

      this.updateMidpointOnEdge(newLink, points);

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

    this.applyNodeDimensions();
    this.redrawLines();
    this.updateMinimap();

    requestAnimationFrame(() => {
      this.applyNodeDimensions();
      this.redrawLines();
      this.updateMinimap();

      if (this.autoZoom) {
        this.zoomToFit({ autoCenter: this.autoCenter ? this.autoCenter : false });
      } else if (this.autoCenter) {
        // Auto-center when rendering
        this.center();
      }
      this.stateChange.emit({ state: NgxGraphStates.Output });
    });

    this.cd.markForCheck();
  }

  getMinimapTransform(): string {
    switch (this.miniMapPosition) {
      case MiniMapPosition.UpperLeft: {
        return '';
      }
      case MiniMapPosition.UpperRight: {
        return 'translate(' + (this.dims.width - this.graphDims.width / this.minimapScaleCoefficient) + ',' + 0 + ')';
      }
      default: {
        return '';
      }
    }
  }

  updateGraphDims() {
    let minX = +Infinity;
    let maxX = -Infinity;
    let minY = +Infinity;
    let maxY = -Infinity;

    for (let i = 0; i < this.graph.nodes.length; i++) {
      const node = this.graph.nodes[i];
      minX = node.position.x < minX ? node.position.x : minX;
      minY = node.position.y < minY ? node.position.y : minY;
      maxX = node.position.x + node.dimension.width > maxX ? node.position.x + node.dimension.width : maxX;
      maxY = node.position.y + node.dimension.height > maxY ? node.position.y + node.dimension.height : maxY;
    }
    minX -= 100;
    minY -= 100;
    maxX += 100;
    maxY += 100;
    this.graphDims.width = maxX - minX;
    this.graphDims.height = maxY - minY;
    this.minimapOffsetX = minX;
    this.minimapOffsetY = minY;
  }

  @throttleable(500)
  updateMinimap() {
    // Calculate the height/width total, but only if we have any nodes
    if (this.graph.nodes && this.graph.nodes.length) {
      this.updateGraphDims();

      if (this.miniMapMaxWidth) {
        this.minimapScaleCoefficient = this.graphDims.width / this.miniMapMaxWidth;
      }
      if (this.miniMapMaxHeight) {
        this.minimapScaleCoefficient = Math.max(
          this.minimapScaleCoefficient,
          this.graphDims.height / this.miniMapMaxHeight
        );
      }

      this.minimapTransform = this.getMinimapTransform();
    }
  }

  /**
   * Measures the node element and applies the dimensions
   *
   * @memberOf GraphComponent
   */
  applyNodeDimensions(): void {
    if (this.nodeElements && this.nodeElements.length) {
      this.nodeElements.forEach(elem => {
        const nativeElement = elem.nativeElement;
        const node = this.graph.nodes.find(n => n.id === nativeElement.id);
        if (!node) {
          return;
        }

        // calculate the height
        let dims;
        try {
          dims = nativeElement.getBBox();
          if (!dims.width || !dims.height) {
            return;
          }
        } catch (ex) {
          // Skip drawing if element is not displayed - Firefox would throw an error here
          return;
        }
        if (this.nodeHeight) {
          node.dimension.height =
            node.dimension.height && node.meta.forceDimensions ? node.dimension.height : this.nodeHeight;
        } else {
          node.dimension.height =
            node.dimension.height && node.meta.forceDimensions ? node.dimension.height : dims.height;
        }

        if (this.nodeMaxHeight) {
          node.dimension.height = Math.max(node.dimension.height, this.nodeMaxHeight);
        }
        if (this.nodeMinHeight) {
          node.dimension.height = Math.min(node.dimension.height, this.nodeMinHeight);
        }

        if (this.nodeWidth) {
          node.dimension.width =
            node.dimension.width && node.meta.forceDimensions ? node.dimension.width : this.nodeWidth;
        } else {
          // calculate the width
          if (nativeElement.getElementsByTagName('text').length) {
            let maxTextDims: { width: number; height: number };
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
            node.dimension.width =
              node.dimension.width && node.meta.forceDimensions ? node.dimension.width : maxTextDims.width + 20;
          } else {
            node.dimension.width =
              node.dimension.width && node.meta.forceDimensions ? node.dimension.width : dims.width;
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
  redrawLines(_animate = this.animate): void {
    this.linkElements.forEach(linkEl => {
      const edge = this.graph.edges.find(lin => lin.id === linkEl.nativeElement.id);

      if (edge) {
        const linkSelection: any = select(linkEl.nativeElement).select('.line');
        linkSelection
          .attr('d', edge.oldLine)
          .transition()
          .ease(ease.easeSinInOut)
          .duration(_animate ? 500 : 0)
          .attr('d', edge.line);

        const textPathSelection: any = select(this.el.nativeElement).select(`#${edge.id}`);
        textPathSelection
          .attr('d', edge.oldTextPath)
          .transition()
          .ease(ease.easeSinInOut)
          .duration(_animate ? 500 : 0)
          .attr('d', edge.textPath);

        this.updateMidpointOnEdge(edge, edge.points);
      }
    });
  }

  /**
   * Calculate the text directions / flipping
   *
   * @memberOf GraphComponent
   */
  calcDominantBaseline(link: any): void {
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
  generateLine(points: any): any {
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
  onZoom($event: WheelEvent, direction: string): void {
    if (this.enableTrackpadSupport && !$event.ctrlKey) {
      this.pan($event.deltaX * -1, $event.deltaY * -1);
      return;
    }

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
      const svg = this.el.nativeElement.querySelector('svg');
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
    if (this.enablePreUpdateTransform) {
      this.updateTransform();
    }
    this.update();
  }

  /**
   * Drag was invoked from an event
   *
   * @memberOf GraphComponent
   */
  onDrag(event: MouseEvent): void {
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
    const x = node.position.x - (this.centerNodesOnPositionChange ? node.dimension.width / 2 : 0);
    const y = node.position.y - (this.centerNodesOnPositionChange ? node.dimension.height / 2 : 0);
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
    this.updateMinimap();
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
    this.transform = toSVG(smoothMatrix(this.transformationMatrix, 100));
    this.stateChange.emit({ state: NgxGraphStates.Transform });
  }

  /**
   * Node was clicked
   *
   *
   * @memberOf GraphComponent
   */
  onClick(event: any): void {
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
  trackLinkBy(index: number, link: Edge): any {
    return link.id;
  }

  /**
   * Tracking for the node
   *
   *
   * @memberOf GraphComponent
   */
  trackNodeBy(index: number, node: Node): any {
    return node.id;
  }

  /**
   * Sets the colors the nodes
   *
   *
   * @memberOf GraphComponent
   */
  setColors(): void {
    this.colors = new ColorHelper(this.scheme, this.seriesDomain, this.customColors);
  }

  /**
   * On mouse move event, used for panning and dragging.
   *
   * @memberOf GraphComponent
   */
  @HostListener('document:mousemove', ['$event'])
  onMouseMove($event: MouseEvent): void {
    this.isMouseMoveCalled = true;
    if ((this.isPanning || this.isMinimapPanning) && this.panningEnabled) {
      this.panWithConstraints(this.panningAxis, $event);
    } else if (this.isDragging && this.draggingEnabled) {
      this.onDrag($event);
    }
  }

  @HostListener('document:mousedown', ['$event'])
  onMouseDown(event: MouseEvent): void {
    this.isMouseMoveCalled = false;
  }

  @HostListener('document:click', ['$event'])
  graphClick(event: MouseEvent): void {
    if (!this.isMouseMoveCalled) this.clickHandler.emit(event);
  }

  /**
   * On touch start event to enable panning.
   *
   * @memberOf GraphComponent
   */
  onTouchStart(event: any): void {
    this._touchLastX = event.changedTouches[0].clientX;
    this._touchLastY = event.changedTouches[0].clientY;

    this.isPanning = true;
  }

  /**
   * On touch move event, used for panning.
   *
   */
  @HostListener('document:touchmove', ['$event'])
  onTouchMove($event: any): void {
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
  onTouchEnd() {
    this.isPanning = false;
  }

  /**
   * On mouse up event to disable panning/dragging.
   *
   * @memberOf GraphComponent
   */
  @HostListener('document:mouseup', ['$event'])
  onMouseUp(event: MouseEvent): void {
    this.isDragging = false;
    this.isPanning = false;
    this.isMinimapPanning = false;
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
   * On minimap drag mouse down to kick off minimap panning
   *
   * @memberOf GraphComponent
   */
  onMinimapDragMouseDown(): void {
    this.isMinimapPanning = true;
  }

  /**
   * On minimap pan event. Pans the graph to the clicked position
   *
   * @memberOf GraphComponent
   */
  onMinimapPanTo(event: MouseEvent): void {
    const x =
      event.offsetX - (this.dims.width - (this.graphDims.width + this.minimapOffsetX) / this.minimapScaleCoefficient);
    const y = event.offsetY + this.minimapOffsetY / this.minimapScaleCoefficient;

    this.panTo(x * this.minimapScaleCoefficient, y * this.minimapScaleCoefficient);
    this.isMinimapPanning = true;
  }

  /**
   * Center the graph in the viewport
   */
  center(): void {
    this.panTo(this.graphDims.width / 2, this.graphDims.height / 2);
  }

  /**
   * Zooms to fit the entire graph
   */
  zoomToFit(zoomOptions?: NgxGraphZoomOptions): void {
    this.dims = calculateViewDimensions({
      width: this.width,
      height: this.height
    });
    this.updateGraphDims();
    const heightZoom = this.dims.height / this.graphDims.height;
    const widthZoom = this.dims.width / this.graphDims.width;
    let zoomLevel = Math.min(heightZoom, widthZoom, 1);

    if (zoomLevel < this.minZoomLevel) {
      zoomLevel = this.minZoomLevel;
    }

    if (zoomLevel > this.maxZoomLevel) {
      zoomLevel = this.maxZoomLevel;
    }

    if (zoomOptions?.force === true || zoomLevel !== this.zoomLevel) {
      this.zoomLevel = zoomLevel;

      if (zoomOptions?.autoCenter !== true) {
        this.updateTransform();
      }
      if (zoomOptions?.autoCenter === true) {
        this.center();
      }
      this.zoomChange.emit(this.zoomLevel);
    }
  }

  /**
   * Pans to the node
   * @param nodeId
   */
  panToNodeId(nodeId: string): void {
    const node = this.graph.nodes.find(n => n.id === nodeId);
    if (!node) {
      return;
    }

    this.panTo(node.position.x, node.position.y);
  }

  getCompoundNodeChildren(ids: Array<string>) {
    return this.nodes.filter(node => ids.includes(node.id));
  }

  private panWithConstraints(key: string, event: MouseEvent) {
    let x = event.movementX;
    let y = event.movementY;
    if (this.isMinimapPanning) {
      x = -this.minimapScaleCoefficient * x * this.zoomLevel;
      y = -this.minimapScaleCoefficient * y * this.zoomLevel;
    }

    switch (key) {
      case PanningAxis.Horizontal:
        this.pan(x, 0);
        break;
      case PanningAxis.Vertical:
        this.pan(0, y);
        break;
      default:
        this.pan(x, y);
        break;
    }
  }

  private updateMidpointOnEdge(edge: Edge, points: any): void {
    if (!edge || !points) {
      return;
    }

    if (points.length % 2 === 1) {
      edge.midPoint = points[Math.floor(points.length / 2)];
    } else {
      // Checking if the current layout is Elk
      if ((this.layout as Layout)?.settings?.properties?.['elk.direction']) {
        this._calcMidPointElk(edge, points);
      } else {
        const _first = points[points.length / 2];
        const _second = points[points.length / 2 - 1];
        edge.midPoint = {
          x: (_first.x + _second.x) / 2,
          y: (_first.y + _second.y) / 2
        };
      }
    }
  }

  private _calcMidPointElk(edge: Edge, points: any): void {
    let _firstX = null;
    let _secondX = null;
    let _firstY = null;
    let _secondY = null;
    const orientation = (this.layout as Layout).settings?.properties['elk.direction'];
    const hasBend =
      orientation === 'RIGHT' ? points.some(p => p.y !== points[0].y) : points.some(p => p.x !== points[0].x);

    if (hasBend) {
      // getting the last two points
      _firstX = points[points.length - 1];
      _secondX = points[points.length - 2];
      _firstY = points[points.length - 1];
      _secondY = points[points.length - 2];
    } else {
      if (orientation === 'RIGHT') {
        _firstX = points[0];
        _secondX = points[points.length - 1];
        _firstY = points[points.length / 2];
        _secondY = points[points.length / 2 - 1];
      } else {
        _firstX = points[points.length / 2];
        _secondX = points[points.length / 2 - 1];
        _firstY = points[0];
        _secondY = points[points.length - 1];
      }
    }

    edge.midPoint = {
      x: (_firstX.x + _secondX.x) / 2,
      y: (_firstY.y + _secondY.y) / 2
    };
  }

  public basicUpdate(): void {
    if (this.view) {
      this.width = this.view[0];
      this.height = this.view[1];
    } else {
      const dims = this.getContainerDims();
      if (dims) {
        this.width = dims.width;
        this.height = dims.height;
      }
    }

    // default values if width or height are 0 or undefined
    if (!this.width) {
      this.width = 600;
    }

    if (!this.height) {
      this.height = 400;
    }

    this.width = Math.floor(this.width);
    this.height = Math.floor(this.height);

    if (this.cd) {
      this.cd.markForCheck();
    }
  }

  public getContainerDims(): any {
    let width;
    let height;
    const hostElem = this.el.nativeElement;

    if (hostElem.parentNode !== null) {
      // Get the container dimensions
      const dims = hostElem.parentNode.getBoundingClientRect();
      width = dims.width;
      height = dims.height;
    }

    if (width && height) {
      return { width, height };
    }

    return null;
  }

  /**
   * Checks if the graph has dimensions
   */
  public hasGraphDims(): boolean {
    return this.graphDims.width > 0 && this.graphDims.height > 0;
  }

  /**
   * Checks if all nodes have dimension
   */
  public hasNodeDims(): boolean {
    return this.graph.nodes?.every(node => node.dimension.width > 0 && node.dimension.height > 0);
  }

  /**
   * Checks if all compound nodes have dimension
   */
  public hasCompoundNodeDims(): boolean {
    return this.graph.compoundNodes?.every(node => node.dimension.width > 0 && node.dimension.height > 0);
  }

  /**
   * Checks if all clusters have dimension
   */
  public hasClusterDims(): boolean {
    return this.graph.clusters?.every(node => node.dimension.width > 0 && node.dimension.height > 0);
  }

  /**
   * Checks if the graph and all nodes have dimension.
   */
  public hasDims(): boolean {
    return (
      this.hasGraphDims() &&
      this.hasNodeDims() &&
      ((this.compoundNodes?.length ? this.hasCompoundNodeDims() : true) ||
        (this.clusters?.length ? this.hasClusterDims() : true))
    );
  }

  protected unbindEvents(): void {
    if (this.resizeSubscription) {
      this.resizeSubscription.unsubscribe();
    }
  }

  private bindWindowResizeEvent(): void {
    const source = observableFromEvent(window, 'resize');
    const subscription = source.pipe(debounceTime(200)).subscribe(e => {
      this.update();
      if (this.cd) {
        this.cd.markForCheck();
      }
    });
    this.resizeSubscription = subscription;
  }
}

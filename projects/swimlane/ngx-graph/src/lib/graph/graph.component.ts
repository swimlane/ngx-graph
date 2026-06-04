// rename transition due to conflict with d3 transition
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
  Injector,
  OnDestroy,
  OnInit,
  TemplateRef,
  ViewEncapsulation,
  NgZone,
  ChangeDetectorRef,
  OnChanges,
  SimpleChanges,
  afterNextRender,
  isDevMode,
  effect,
  input,
  model,
  output,
  contentChild,
  viewChildren
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { select } from 'd3-selection';
import * as shape from 'd3-shape';
import { Observable, Subscription, of, fromEvent as observableFromEvent, Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { identity, scale, smoothMatrix, toSVG, transform, translate } from 'transformation-matrix';
import { Layout } from '../models/layout.model';
import { LayoutService } from './layouts/layout.service';
import { LAYERED_NODE_NODE_BETWEEN_LAYERS_PX } from './layouts/layout-layered-constants';
import { Edge } from '../models/edge.model';
import { Node, ClusterNode, CompoundNode } from '../models/node.model';
import { Graph } from '../models/graph.model';
import { id } from '../utils/id';
import { PanningAxis } from '../enums/panning.enum';
import { MiniMapPosition, DefaultMiniMapMargin, MiniMapMargin } from '../enums/mini-map-position.enum';
import { throttleable } from '../utils/throttle';
import { ColorHelper } from '../utils/color.helper';
import { ViewDimensions, calculateViewDimensions } from '../utils/view-dimensions.helper';
import { VisibilityObserver } from '../utils/visibility-observer';
import { MouseWheelDirective } from './mouse-wheel.directive';
import {
  mergeGraphLayoutTransition,
  mergeViewportTransition,
  mergeLayoutEffect,
  resolveGraphTransitionEasing,
  type GraphLayoutTransition,
  type LayoutMorphCapture,
  type ViewportTranslationTransition,
  type LayoutTransitionEffect
} from './transition.model';

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

/**
 * Root graph component (`ngx-graph`).
 *
 * **Layout transitions:** JS-driven morphing (`transitionAfterChanges` with `mode: 'tween'`) is **opt-in**; if the input is
 * omitted, merged defaults use `mode: 'instant'` (no rAF tween). The host may carry `layout-js-driven` (see
 * {@link useLayoutTransitions}): when present, styles set `transition: none` on `.node-group` so imperative
 * `transform` updates do not fight CSS. **`smooth-layout`** is set only while tweening is active.
 *
 * **Template outlets:** Context objects are stable per graph id (see `outletContextGraphNode` / `outletContextLink` / …): `transitionAfterChangesActive` and `$implicit` are updated in place so consumer templates are not recreated on viewport-only CD.
 */
@Component({
  selector: 'ngx-graph',
  styleUrls: ['./graph.component.scss'],
  templateUrl: 'graph.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, MouseWheelDirective]
})
export class GraphComponent implements OnInit, OnChanges, OnDestroy, AfterViewInit {
  private readonly injector = inject(Injector);
  readonly nodes = input<Node[]>([]);
  readonly clusters = input<ClusterNode[]>([]);
  readonly compoundNodes = input<CompoundNode[]>([]);
  readonly links = input<Edge[]>([]);
  readonly activeEntries = model<any[]>([]);
  readonly curve = model<any>(undefined);
  readonly enableDrag = model(true);
  readonly nodeHeight = input<number>(undefined);
  readonly nodeMaxHeight = input<number>(undefined);
  readonly nodeMinHeight = input<number>(undefined);
  readonly nodeWidth = input<number>(undefined);
  readonly nodeMinWidth = input<number>(undefined);
  readonly nodeMaxWidth = input<number>(undefined);
  readonly enablePan = model<boolean>(true);
  readonly panningAxis = input<PanningAxis>(PanningAxis.Both);
  readonly enableZoom = model(true);
  readonly zoomSpeed = input(0.1);
  readonly minZoomLevel = input(0.1);
  readonly maxZoomLevel = input(4.0);
  readonly autoZoom = input(false);
  readonly panOnZoom = input(true);
  readonly animate = input<boolean>(false);
  readonly autoCenter = input(false);
  readonly update$ = input<Observable<any>>(undefined);
  readonly center$ = input<Observable<any>>(undefined);
  readonly zoomToFit$ = input<Observable<NgxGraphZoomOptions>>(undefined);
  readonly panToNode$ = input<Observable<any>>(undefined);
  readonly layout = model<string | Layout>(undefined);
  readonly layoutSettings = input<any>(undefined);
  readonly enableTrackpadSupport = input(false);
  readonly showMiniMap = input<boolean>(false);
  readonly miniMapMaxWidth = input<number>(100);
  readonly miniMapMaxHeight = input<number>(undefined);
  readonly miniMapPosition = input<MiniMapPosition>(MiniMapPosition.UpperRight);
  readonly miniMapMargin = input<MiniMapMargin>(DefaultMiniMapMargin);
  readonly view = input<[number, number]>(undefined);
  readonly scheme = input<any>('cool');
  readonly customColors = input<any>(undefined);
  readonly deferDisplayUntilPosition = input<boolean>(false);
  readonly centerNodesOnPositionChange = input(true);
  readonly enablePreUpdateTransform = input(true);
  /**
   * Layout transition after nodes/links change. Merged with defaults via {@link mergeGraphLayoutTransition}; when omitted or
   * empty, defaults apply (`mode: 'instant'`). Use `{ mode: 'tween', scope: 'full' }` for full-graph interpolation, or
   * `{ mode: 'tween', scope: 'additive', durationMs: 0 }` for additive-only tweening.
   *
   * **`mode: 'tween'` is opt-in** (no tween unless you pass a partial that resolves to tween after merge).
   */
  readonly transitionAfterChanges = input<Partial<GraphLayoutTransition>>(undefined);
  /**
   * Number of samples along each edge polyline when building `line` / morph segments (layout tick, drag
   * {@link redrawEdge}, unified morph). Clamped to `[2, 512]`; default `48` when unset or non-finite.
   */
  readonly edgePathSampleCount = input<number>(undefined);
  /**
   * When `true` (default), the host always has the `layout-js-driven` class so CSS does not animate `.node-group`
   * `transform` (matches historical behavior). When `false`, `layout-js-driven` is applied only while JS layout morphing
   * is active ({@link layoutJsMorphEnabled}), allowing host CSS transitions on node groups when not using `mode: 'tween'`.
   */
  readonly useLayoutTransitions = input(true);
  /** Optional eased translation for programmatic pan only (`panTo`, `center`, minimap, `zoomToFit` autoCenter). Zoom scale is never animated. */
  readonly transitionDuringTransform = input<Partial<ViewportTranslationTransition>>(undefined);
  /** Optional perspective / rotate flair during layout morph only (`mode: 'tween'`). */
  readonly layoutTransitionEffect = input<Partial<LayoutTransitionEffect>>(undefined);

  /** Template alias `zoomLevel` — imperatively sets zoom; see {@link zoomTo}. */
  readonly zoomLevelInput = input<number | undefined>(undefined, { alias: 'zoomLevel' });
  /** Template alias `panOffsetX` — imperatively pans; see {@link panTo}. */
  readonly panOffsetXInput = input<number | undefined>(undefined, { alias: 'panOffsetX' });
  /** Template alias `panOffsetY` — imperatively pans; see {@link panTo}. */
  readonly panOffsetYInput = input<number | undefined>(undefined, { alias: 'panOffsetY' });

  readonly select = output();
  readonly activate = output<any>();
  readonly deactivate = output<any>();
  readonly zoomChange = output<number>();
  readonly clickHandler = output<MouseEvent>();
  readonly stateChange = output<NgxGraphStateChangeEvent>();
  readonly drawComplete = output<void>();

  readonly linkTemplate = contentChild<TemplateRef<any>>('linkTemplate');
  readonly nodeTemplate = contentChild<TemplateRef<any>>('nodeTemplate');
  readonly clusterTemplate = contentChild<TemplateRef<any>>('clusterTemplate');
  readonly defsTemplate = contentChild<TemplateRef<any>>('defsTemplate');
  readonly miniMapNodeTemplate = contentChild<TemplateRef<any>>('miniMapNodeTemplate');

  readonly nodeElements = viewChildren<ElementRef>('nodeElement');
  readonly clusterElements = viewChildren<ElementRef>('clusterElement');
  readonly linkElements = viewChildren<ElementRef>('linkElement');

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
  /** Incremented at the start of each {@link tick}; completion callbacks only emit when this matches. */
  private drawCompleteTickId = 0;
  private _graphDestroyed = false;
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
  private waitForGraphDims: ReturnType<typeof setInterval>;
  private destroy$ = new Subject<void>();

  /** Latest requestAnimationFrame id per edge for imperative path morphing (cancel on layout / drag). */
  private readonly edgePathRafIds = new Map<string, number>();

  /**
   * Stable {@link NgTemplateOutlet} context objects keyed by graph id so consumer templates (tooltips, nested
   * directives) are not destroyed/recreated every CD when only the viewport or `$implicit` reference changes.
   */
  private readonly graphMainNodeOutletCtx = new Map<
    string,
    { $implicit: Node; transitionAfterChangesActive: boolean }
  >();
  private readonly graphMinimapNodeOutletCtx = new Map<
    string,
    { $implicit: Node; transitionAfterChangesActive: boolean }
  >();
  private readonly graphClusterOutletCtx = new Map<
    string,
    { $implicit: Node; transitionAfterChangesActive: boolean }
  >();
  private readonly graphCompoundOutletCtx = new Map<
    string,
    { $implicit: Node; transitionAfterChangesActive: boolean }
  >();
  private readonly graphLinkOutletCtx = new Map<string, { $implicit: Edge; transitionAfterChangesActive: boolean }>();

  /** Single rAF when layout morph unifies node transforms + edge paths. */
  private layoutUnifiedRafId: number | null = null;

  /** rAF for programmatic viewport pan easing (translation only). */
  private viewportPanAnimRafId: number | null = null;

  /** CSS `transform` on `.ngx-graph-outer` during optional layout flair (perspective / rotate). */
  layoutOuterTransform: string | null = null;

  /** `transform-origin` for {@link layoutOuterTransform} when using rotate pivot modes. */
  layoutEffectTransformOrigin = '50% 50%';

  /** Parsed `translate(tx,ty)` from the graph before a new layout is applied. */
  private previousLayoutTransforms: Map<string, { tx: number; ty: number }> | null = null;

  /** Target `translate(tx,ty)` after tick applyTransforms (before reset to previous for animation). */
  private layoutAnimationTargets: Map<string, { tx: number; ty: number }> | null = null;

  /**
   * Prior layout `dimension` for cluster and compound ids (single map; compounds overwrite clusters on id clash).
   * Always taken from the **graph model** at {@link capturePreviousLayoutTransforms} time — not from the DOM, even
   * when {@link LayoutMorphCapture.previousSource} uses DOM for translates. Cleared with {@link previousLayoutTransforms}.
   */
  private previousLayoutClusterCompoundDimensions: Map<string, { width: number; height: number }> | null = null;

  /**
   * Target dimensions after `applyTransforms` for the current morph tick (clusters then compounds). Cleared with
   * {@link layoutAnimationTargets}. Only set for non-`additive` scope. During the tween, translate is lerped between
   * fixed endpoints while dimensions interpolate separately; with {@link centerNodesOnPositionChange} and large size
   * changes, the visual center can drift slightly mid-tween though start and end states match layout.
   */
  private layoutAnimationClusterCompoundDimensions: Map<string, { width: number; height: number }> | null = null;

  /** Node ids present after the previous completed `tick` (for additive smooth transitions). */
  private priorTickGraphNodeIds = new Set<string>();
  /**
   * Which graph collection owned each id after the previous `tick` (`nodes`, `clusters`, or `compoundNodes`).
   * Used with {@link priorTickGraphNodeIds} so layout morph does not treat an id as “stable” when it moved between
   * collections (e.g. same id reused for a node then a compound). Duplicate ids across lists are resolved like
   * {@link collectPreviousTranslatesFromModelTransforms}: later collections overwrite earlier ones.
   */
  private priorTickGraphKindById = new Map<string, 'node' | 'cluster' | 'compound'>();
  /** Edge keys present after the previous completed `tick` (aligned with {@link linkKeyForLookup}). */
  private priorTickEdgeKeys = new Set<string>();
  /** Snapshot of {@link priorTickEdgeKeys} at the start of the current `tick` (for classifying new edges). */
  private edgeKeysAtLayoutTickStart = new Set<string>();

  /** Skip layout morph on the next `tick()` when an update follows viewport-only zoom (unchanged host inputs). */
  private suppressLayoutMorphThisTick = false;
  /** True for the current {@link tick} when node/edge layout morph is suppressed (viewport-only zoom). */
  private morphSuppressedThisTick = false;
  /** Until this timestamp, `createGraph` may set {@link suppressLayoutMorphThisTick} when inputs are unchanged. */
  private viewportZoomMorphSuppressUntilMs = 0;
  private static readonly WHEEL_ZOOM_MORPH_SUPPRESS_MS = 700;
  /** Sorted host-input id/edge signature; used for viewport-only zoom morph suppress. */
  private lastInputTopologySignature = '';
  /** Container size from the last full `update()` (not viewport-only fast path). */
  private lastFullUpdateWidth = 0;
  private lastFullUpdateHeight = 0;

  constructor(
    private el: ElementRef,
    public zone: NgZone,
    public cd: ChangeDetectorRef,
    private layoutService: LayoutService
  ) {
    effect(() => {
      const level = this.zoomLevelInput();
      if (level == null || isNaN(Number(level))) {
        return;
      }
      const n = Number(level);
      if (Math.abs(n - this.zoomLevel) < 1e-6) {
        return;
      }
      this.zoomTo(n, { layout: false });
    });
    effect(() => {
      const x = this.panOffsetXInput();
      if (x == null || isNaN(Number(x))) {
        return;
      }
      this.panTo(Number(x), null);
    });
    effect(() => {
      const y = this.panOffsetYInput();
      if (y == null || isNaN(Number(y))) {
        return;
      }
      this.panTo(null, Number(y));
    });
    effect(() => {
      if (!this.enablePan()) {
        this.isPanning = false;
        this.isMinimapPanning = false;
      }
    });
    effect(() => {
      if (!this.enableDrag() && this.isDragging) {
        this.isDragging = false;
        const layout = this.layout();
        if (layout && typeof layout !== 'string' && layout.onDragEnd) {
          layout.onDragEnd(this.draggingNode, new MouseEvent('mouseup'));
        }
      }
    });
  }

  /**
   * Updates pan, zoom, and/or node-drag interaction flags in one call. Only keys present are applied.
   *
   * @example graph.setViewportInteractions({ pan: false, zoom: false, drag: false })
   */
  setViewportInteractions(options: { pan?: boolean; zoom?: boolean; drag?: boolean }): void {
    if (options.pan !== undefined) {
      this.enablePan.set(options.pan);
    }
    if (options.zoom !== undefined) {
      this.enableZoom.set(options.zoom);
    }
    if (options.drag !== undefined) {
      this.enableDrag.set(options.drag);
    }
  }

  /** Starts canvas pan on mouse down only when {@link enablePan} is true. */
  onPanningSurfaceMouseDown(): void {
    if (this.enablePan()) {
      this.isPanning = true;
    }
  }

  /** Coloring domain key; default coalesces `label`, then `id`, then `''` so {@link ColorHelper} never receives null/undefined. */
  readonly groupResultsBy = input<(node: any) => string>(node => node.label ?? node.id ?? '');

  /** Merged layout transition config from {@link transitionAfterChanges} and defaults. */
  get effectiveLayoutTransition(): GraphLayoutTransition {
    return mergeGraphLayoutTransition(this.transitionAfterChanges());
  }

  /** `true` when rAF morph should run after layout (`mode: 'tween'`). */
  get layoutMorphActive(): boolean {
    return this.effectiveLayoutTransition.mode === 'tween';
  }

  /** Whether layout morphing is active (`transitionAfterChanges` resolved to `mode: 'tween'`). Exposed on template outlets as `transitionAfterChangesActive`. */
  get layoutJsMorphEnabled(): boolean {
    return this.layoutMorphActive;
  }

  /** Host `layout-js-driven` class: always on when {@link useLayoutTransitions} is `true`; otherwise only when {@link layoutJsMorphEnabled}. */
  get layoutJsDrivenHostClass(): boolean {
    return this.useLayoutTransitions() ? true : this.layoutJsMorphEnabled;
  }

  get effectiveViewportTransition() {
    return mergeViewportTransition(this.transitionDuringTransform());
  }

  get effectiveLayoutEffect(): LayoutTransitionEffect {
    return mergeLayoutEffect(this.layoutTransitionEffect());
  }

  /**
   * Get the current zoom level
   */
  get zoomLevel() {
    return this.transformationMatrix.a;
  }

  /**
   * Get the current `x` position of the graph
   */
  get panOffsetX() {
    return this.transformationMatrix.e;
  }

  /**
   * Get the current `y` position of the graph
   */
  get panOffsetY() {
    return this.transformationMatrix.f;
  }

  /**
   * Angular lifecycle event
   *
   *
   * @memberOf GraphComponent
   */
  ngOnInit(): void {
    const update$ = this.update$();
    if (update$) {
      update$.pipe(takeUntil(this.destroy$)).subscribe(() => {
        this.update();
      });
    }

    const center$ = this.center$();
    if (center$) {
      center$.pipe(takeUntil(this.destroy$)).subscribe(() => {
        this.center();
      });
    }

    const zoomToFit$ = this.zoomToFit$();
    if (zoomToFit$) {
      zoomToFit$.pipe(takeUntil(this.destroy$)).subscribe(options => {
        this.zoomToFit(options ? options : {});
      });
    }

    const panToNode$ = this.panToNode$();
    if (panToNode$) {
      panToNode$.pipe(takeUntil(this.destroy$)).subscribe((nodeId: string) => {
        this.panToNodeId(nodeId);
      });
    }

    this.waitForGraphDims = setInterval(() => {
      if (this.hasDims()) {
        clearInterval(this.waitForGraphDims);
        this.drawComplete.emit();
      }
    }, 1000);

    this.minimapClipPathId = `minimapClip${id()}`;
    this.stateChange.emit({ state: NgxGraphStates.Subscribe });
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.basicUpdate();
    const { layoutSettings } = changes;
    const layout = this.layout();
    this.setLayout(layout, !!changes['layout']);
    if (layoutSettings) {
      this.setLayoutSettings(this.layoutSettings());
    }
    const nodes = this.nodes() ?? [];
    const links = this.links() ?? [];
    if (layout && nodes.length && links.length) {
      this.update();
    }
  }

  /**
   * @param layoutInputChanged - When true, clears `initialized` so `@if (initialized && graph)` does not
   * flash empty on unrelated input updates (nodes/links only). Only layout identity changes should reset.
   */
  setLayout(layout: string | Layout, layoutInputChanged = false): void {
    if (layoutInputChanged) {
      this.initialized = false;
    }
    if (!layout) {
      layout = 'dagre';
    }
    if (typeof layout === 'string') {
      this.layout.set(this.layoutService.getLayout(layout));
      this.setLayoutSettings(this.layoutSettings());
    }
  }

  setLayoutSettings(settings: any): void {
    const layout = this.layout();
    if (layout && typeof layout !== 'string') {
      layout.settings = settings;
    }
  }

  /**
   * Angular lifecycle event
   *
   *
   * @memberOf GraphComponent
   */
  ngOnDestroy(): void {
    this._graphDestroyed = true;
    this.cancelLayoutUnifiedAnimation();
    this.cancelAllEdgePathAnimations();
    this.cancelViewportPanAnimation();
    this.unbindEvents();
    if (this.visibilityObserver) {
      this.visibilityObserver.visible.unsubscribe();
      this.visibilityObserver.destroy();
    }
    if (this.waitForGraphDims) {
      clearInterval(this.waitForGraphDims);
    }
    this.destroy$.next();
    this.destroy$.complete();
    this.graphMainNodeOutletCtx.clear();
    this.graphMinimapNodeOutletCtx.clear();
    this.graphClusterOutletCtx.clear();
    this.graphCompoundOutletCtx.clear();
    this.graphLinkOutletCtx.clear();
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
   * @param options.forceRelayout When true, always run the full layout path (used by {@link zoomTo} with `layout: true`).
   * @memberOf GraphComponent
   */
  update(options?: { forceRelayout?: boolean }): void {
    this.basicUpdate();
    if (!this.curve()) {
      this.curve.set(shape.curveBundle.beta(1));
    }

    const inputSig = this.buildInputTopology();
    const inputTopologyUnchanged =
      this.lastInputTopologySignature !== '' && inputSig === this.lastInputTopologySignature;
    if (
      !options?.forceRelayout &&
      this.initialized &&
      inputTopologyUnchanged &&
      !this.hasContainerSizeChangedSinceLastFullUpdate() &&
      this.isViewportMorphSuppressActive()
    ) {
      this.zone.run(() => {
        this.updateTransform();
      });
      return;
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
      this.lastFullUpdateWidth = this.width;
      this.lastFullUpdateHeight = this.height;
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
    // Prior async layout's tick() may never run after unsubscribe; do not carry suppress forward.
    this.suppressLayoutMorphThisTick = false;
    const initializeNode = (n: Node) => {
      if (!n.meta) {
        n.meta = {};
      }
      if (!n.id) {
        n.id = id();
      }
      if (!n.dimension) {
        const nodeWidth = this.nodeWidth();
        const nodeHeight = this.nodeHeight();
        n.dimension = {
          width: nodeWidth ? nodeWidth : 30,
          height: nodeHeight ? nodeHeight : 30
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
        if (this.deferDisplayUntilPosition()) {
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

    const priorGraph = this.graph;

    const nextGraph: Graph = {
      nodes: (this.nodes() ?? []).map(n => initializeNode(n)),
      clusters: (this.clusters() ?? []).map(n => initializeNode(n)),
      compoundNodes: (this.compoundNodes() ?? []).map(n => initializeNode(n)),
      edges: (this.links() ?? []).map(e => initializeEdge(e))
    };

    const incomingInputSig = this.buildInputTopology();
    if (this.shouldSuppressLayoutMorphForViewport(incomingInputSig)) {
      this.suppressLayoutMorphThisTick = true;
    }

    this.applyVisualContinuityBeforeLayout(nextGraph, priorGraph);

    this.graph = nextGraph;
    this.draw();
  }

  /** Host-input topology (not post-layout internal graph shape). */
  private buildInputTopology(): string {
    const mg = this.isLayoutMultigraph();
    const nodeIds = [...(this.nodes() ?? []).map(n => n.id)].sort();
    const clusterIds = [...(this.clusters() ?? []).map(n => `c:${n.id}`)].sort();
    const compoundIds = [...(this.compoundNodes() ?? []).map(n => `p:${n.id}`)].sort();
    const edgeKeys = [...(this.links() ?? []).map(e => this.linkKeyForLookup(e, mg))].sort();
    return JSON.stringify({ nodeIds, clusterIds, compoundIds, edgeKeys });
  }

  private isViewportMorphSuppressActive(): boolean {
    return performance.now() < this.viewportZoomMorphSuppressUntilMs;
  }

  private hasContainerSizeChangedSinceLastFullUpdate(): boolean {
    return this.width !== this.lastFullUpdateWidth || this.height !== this.lastFullUpdateHeight;
  }

  /** Host-input topology unchanged while the post-zoom morph-suppress window is active. */
  private shouldSuppressLayoutMorphForViewport(inputSig?: string): boolean {
    const sig = inputSig ?? this.buildInputTopology();
    return (
      this.lastInputTopologySignature !== '' &&
      sig === this.lastInputTopologySignature &&
      this.isViewportMorphSuppressActive()
    );
  }

  private setViewportMorphSuppress(): void {
    this.viewportZoomMorphSuppressUntilMs = performance.now() + GraphComponent.WHEEL_ZOOM_MORPH_SUPPRESS_MS;
  }

  /**
   * While async layout (e.g. ELK) runs, keep showing the previous snapshot's positions and edge routes
   * so inputs without x/y do not flash to (0,0). Seeds `capturePreviousLayoutTransforms` with real geometry.
   */
  private applyVisualContinuityBeforeLayout(next: Graph, prior: Graph | undefined): void {
    if (!prior?.nodes?.length) {
      this.markDefaultOriginNodesHiddenUntilLayout(next.nodes);
      this.markDefaultOriginNodesHiddenUntilLayout(next.clusters as Node[] | undefined);
      this.markDefaultOriginNodesHiddenUntilLayout(next.compoundNodes as Node[] | undefined);
      this.setDisplayTransformsFromPositions(next.nodes, next.clusters ?? [], next.compoundNodes ?? []);
      return;
    }

    const incremental = this._oldLinks.length > 0;
    const prevNodeById = new Map(prior.nodes.map(n => [n.id, n]));
    const prevClusterById = new Map((prior.clusters ?? []).map(n => [n.id, n]));
    const prevCompoundById = new Map((prior.compoundNodes ?? []).map(n => [n.id, n]));
    const mergeNodes = (items: Node[] | undefined) => {
      if (!items) {
        return;
      }
      for (const n of items) {
        const p = prevNodeById.get(n.id);
        if (p?.position) {
          n.position = { ...p.position };
        }
        if (p?.dimension) {
          n.dimension = { ...p.dimension };
        }
        if (incremental && !prevNodeById.has(n.id)) {
          n.hidden = true;
        }
      }
    };
    mergeNodes(next.nodes);
    if (incremental) {
      for (const n of next.nodes ?? []) {
        if (!prevNodeById.has(n.id)) {
          this.seedProvisionalPositionFromParentEdge(n, next.edges, prevNodeById);
        }
      }
    }
    const nextNodeById = new Map(next.nodes.map(n => [n.id, n]));
    if (next.clusters?.length) {
      for (const n of next.clusters) {
        const p = prevClusterById.get(n.id);
        if (p?.position) {
          n.position = { ...p.position };
        }
        if (p?.dimension) {
          n.dimension = { ...p.dimension };
        }
        if (incremental && !prevClusterById.has(n.id)) {
          n.hidden = true;
          this.seedProvisionalGroupPositionFromChildren(n, nextNodeById);
        }
      }
    }
    if (next.compoundNodes?.length) {
      for (const n of next.compoundNodes) {
        const p = prevCompoundById.get(n.id);
        if (p?.position) {
          n.position = { ...p.position };
        }
        if (p?.dimension) {
          n.dimension = { ...p.dimension };
        }
        if (incremental && !prevCompoundById.has(n.id)) {
          n.hidden = true;
          this.seedProvisionalGroupPositionFromChildren(n, nextNodeById);
        }
      }
    }

    const mg = this.isLayoutMultigraph();
    if (this._oldLinks.length > 0 && next.edges?.length) {
      const prevEdgeByKey = new Map<string, Edge>();
      for (const e of this._oldLinks) {
        prevEdgeByKey.set(this.linkKeyForLookup(e, mg), e);
      }
      for (const e of next.edges) {
        const pe = prevEdgeByKey.get(this.linkKeyForLookup(e, mg));
        if (pe?.points && pe.points.length >= 2) {
          e.points = this.clonePoints(pe.points as Array<{ x: number; y: number }>);
          if (pe.line) {
            e.line = pe.line;
          }
          if (pe.oldLine) {
            e.oldLine = pe.oldLine;
          }
          if (pe.textPath) {
            e.textPath = pe.textPath;
          }
        }
      }
    }

    this.setDisplayTransformsFromPositions(next.nodes, next.clusters ?? [], next.compoundNodes ?? []);

    // Do not pass heuristic `position` into ELK (`...node` in elk createNodeTree). With semiInteractive layout, a wrong
    // hint skews the first solve; the next segment masks it. `hidden` + transform already set for pre-layout paint.
    if (incremental) {
      for (const n of next.nodes ?? []) {
        if (!prevNodeById.has(n.id)) {
          delete n.position;
        }
      }
      for (const n of next.clusters ?? []) {
        if (!prevClusterById.has(n.id)) {
          delete n.position;
        }
      }
      for (const n of next.compoundNodes ?? []) {
        if (!prevCompoundById.has(n.id)) {
          delete n.position;
        }
      }
    }
  }
  private setDisplayTransformsFromPositions(
    nodes: Node[],
    clusters: ClusterNode[] | undefined,
    compoundNodes: CompoundNode[] | undefined
  ): void {
    const apply = (items: Node[] | undefined) => {
      if (!items) {
        return;
      }
      for (const n of items) {
        if (!n.data) {
          n.data = {};
        }
        n.data.color = this.colors.getColor(this.groupResultsBy()(n));
        this.updateNodeGroupTransform(n);
      }
    };
    apply(nodes);
    apply(clusters);
    apply(compoundNodes);
  }

  private edgeEndpointNodeId(ref: Edge['source'] | Edge['target']): string {
    return typeof ref === 'string' ? ref : String((ref as { id?: string }).id ?? '');
  }

  /** Merged ELK `properties` from the active layout (defaults + instance settings). */
  private elkMergedProperties(): Record<string, string | undefined> {
    const L = this.layout() as {
      defaultSettings?: { properties?: Record<string, string> };
      settings?: { properties?: Record<string, string> };
    };
    return { ...L?.defaultSettings?.properties, ...L?.settings?.properties };
  }

  /**
   * Inter-layer gap for provisional seeding. Graph-level merged props often carry `20` from ElkLayout defaults while
   * `createNodeTree` applies {@link LAYERED_NODE_NODE_BETWEEN_LAYERS_PX} per-node — match the latter for seed math.
   */
  private getElkLayerSpacingGapPx(): number {
    const raw = this.elkMergedProperties()['elk.layered.spacing.nodeNodeBetweenLayers'];
    if (raw == null || raw === '') {
      return LAYERED_NODE_NODE_BETWEEN_LAYERS_PX;
    }
    const n = parseFloat(String(raw));
    if (!Number.isFinite(n)) {
      return LAYERED_NODE_NODE_BETWEEN_LAYERS_PX;
    }
    if (n === 20) {
      return LAYERED_NODE_NODE_BETWEEN_LAYERS_PX;
    }
    return n;
  }

  private elkDirectionOrDown(): string {
    const d = this.elkMergedProperties()['elk.direction'];
    return typeof d === 'string' && d.length ? d : 'DOWN';
  }

  /**
   * Place the new node center where layered ELK will approximately put it: half parent + inter-layer gap + half child,
   * along the layout axis. Aligns with `buildFallbackEdgePoints` (center-to-center) better than a flat pixel delta.
   */
  private seedProvisionalPositionFromParentEdge(
    n: Node,
    edges: Edge[] | undefined,
    prevNodeById: Map<string, Node>
  ): void {
    if (!edges?.length) {
      return;
    }
    const edge = edges.find(e => this.edgeEndpointNodeId(e.target) === n.id);
    if (!edge) {
      return;
    }
    const src = prevNodeById.get(this.edgeEndpointNodeId(edge.source));
    if (!src?.position) {
      return;
    }
    const gap = this.getElkLayerSpacingGapPx();
    const sw = src.dimension?.width ?? 30;
    const sh = src.dimension?.height ?? 30;
    const tw = n.dimension?.width ?? 30;
    const th = n.dimension?.height ?? 30;
    const sx = src.position.x;
    const sy = src.position.y;
    switch (this.elkDirectionOrDown()) {
      case 'RIGHT':
        n.position = { x: sx + sw / 2 + gap + tw / 2, y: sy };
        break;
      case 'LEFT':
        n.position = { x: sx - sw / 2 - gap - tw / 2, y: sy };
        break;
      case 'UP':
        n.position = { x: sx, y: sy - sh / 2 - gap - th / 2 };
        break;
      default:
        n.position = { x: sx, y: sy + sh / 2 + gap + th / 2 };
    }
  }

  /**
   * For a new cluster/compound before layout, approximate group center from child node positions already merged
   * onto `next.nodes` (avoids a (0,0) flash at the top-left).
   */
  private seedProvisionalGroupPositionFromChildren(
    n: Node & { childNodeIds?: string[] },
    nodeById: Map<string, Node>
  ): void {
    const ids = n.childNodeIds;
    if (!ids?.length) {
      return;
    }
    let sx = 0;
    let sy = 0;
    let count = 0;
    for (const cid of ids) {
      const ch = nodeById.get(cid);
      if (ch?.position) {
        sx += ch.position.x;
        sy += ch.position.y;
        count++;
      }
    }
    if (count > 0) {
      n.position = { x: sx / count, y: sy / count };
    }
  }

  /** Bootstrap: hide nodes still at default origin until first ELK `tick()` supplies real positions. */
  private markDefaultOriginNodesHiddenUntilLayout(items: Node[] | undefined): void {
    if (!items?.length) {
      return;
    }
    for (const n of items) {
      const x = n.position?.x ?? 0;
      const y = n.position?.y ?? 0;
      if (x === 0 && y === 0) {
        n.hidden = true;
      }
    }
  }

  /**
   * Draws the graph using dagre layouts
   *
   *
   * @memberOf GraphComponent
   */
  draw(): void {
    // Recalculate the layout
    const result = (this.layout() as Layout)?.run(this.graph);
    const result$ = result instanceof Observable ? result : of(result);
    this.graphSubscription.add(
      result$.subscribe(graph => {
        this.capturePreviousLayoutTransforms();
        this.graph = graph;
        this.tick();
      })
    );
  }

  /** Default: first `translate(a, b)` in the node-group transform string. */
  private parseTranslateDefault(transformStr: string | undefined): { tx: number; ty: number } {
    const m = /translate\(\s*([\d.-]+)\s*,\s*([\d.-]+)\s*\)/.exec(transformStr || '');
    if (m) {
      return { tx: +m[1], ty: +m[2] };
    }
    return { tx: 0, ty: 0 };
  }

  /** Prefers `Layout.parseTranslate` on the resolved layout object when present. */
  public resolveTranslateFromTransform(transformStr: string | undefined): { tx: number; ty: number } {
    const L = this.layout();
    if (L && typeof L !== 'string' && typeof (L as Layout).parseTranslate === 'function') {
      return (L as Layout).parseTranslate!(transformStr);
    }
    return this.parseTranslateDefault(transformStr);
  }

  /** Same key shape as dagre/graphlib `_edgeLabels` keys and as used in tick edge maps. */
  private linkKeyForLookup(edge: Pick<Edge, 'source' | 'target' | 'id'>, multigraph: boolean): string {
    const source = typeof edge.source === 'string' ? edge.source : String((edge.source as { id?: string }).id ?? '');
    const target = typeof edge.target === 'string' ? edge.target : String((edge.target as { id?: string }).id ?? '');
    return multigraph ? `${source}${target}${edge.id ?? ''}` : `${source}${target}`;
  }

  /** Matches layout engines that merge `defaultSettings` with `settings` (e.g. DagreNodesOnly multigraph). */
  private isLayoutMultigraph(): boolean {
    const layoutValue = this.layout();
    if (!layoutValue || typeof layoutValue === 'string') {
      return false;
    }
    const layout = layoutValue as { defaultSettings?: { multigraph?: boolean }; settings?: { multigraph?: boolean } };
    const merged = Object.assign({}, layout.defaultSettings ?? {}, layout.settings ?? {});
    return !!merged.multigraph;
  }

  /**
   * graphlib `edgeArgsToId`: v + \\x01 + w + \\x01 + name (name defaults to \\x00).
   * Aligns with {@link linkKeyForLookup}; falls back to legacy regex when the id is not graphlib-shaped.
   */
  private graphlibEdgeLabelIdToLookupKey(edgeLabelId: string, multigraph: boolean): string {
    const EDGE_KEY_DELIM = '\x01';
    const DEFAULT_EDGE_NAME = '\x00';
    const parts = edgeLabelId.split(EDGE_KEY_DELIM);
    if (parts.length >= 2) {
      const v = parts[0];
      const w = parts[1];
      if (!multigraph) {
        return `${v}${w}`;
      }
      const name = parts.length >= 3 ? parts[2] : DEFAULT_EDGE_NAME;
      if (name === DEFAULT_EDGE_NAME || name === '') {
        return `${v}${w}`;
      }
      return `${v}${w}${name}`;
    }
    return edgeLabelId.replace(/[^\w-]*/g, '');
  }

  /**
   * Snapshot current node-group translates (and cluster/compound dimensions) before replacing `graph` for layout morph.
   * {@link LayoutMorphCapture.previousSource} controls **translates only** (`previousLayoutTransforms`): DOM modes read
   * `g.node-group[id]` for nodes, clusters, and compounds. Prior cluster/compound size always use the model
   * (`previousLayoutClusterCompoundDimensions`). Requires `_oldLinks` so the first paint does not run an empty morph.
   */
  public capturePreviousLayoutTransforms(): void {
    if (!this.initialized || !this.graph) {
      this.previousLayoutTransforms = null;
      this.previousLayoutClusterCompoundDimensions = null;
      return;
    }
    // No prior tick edges: first paint should not run unified layout tween.
    if (!this._oldLinks.length) {
      this.previousLayoutTransforms = null;
      this.previousLayoutClusterCompoundDimensions = null;
      return;
    }
    const morph = this.effectiveLayoutTransition.morphCapture;
    const source = morph.previousSource ?? 'model-transform';
    if (source === 'model-transform') {
      this.previousLayoutTransforms = this.collectPreviousTranslatesFromModelTransforms();
      this.previousLayoutClusterCompoundDimensions = this.collectPreviousClusterCompoundDimensionsFromModel();
      return;
    }
    const chartG = this.getMainChartGroupElement();
    this.previousLayoutTransforms = chartG
      ? this.collectPreviousTranslatesFromDom(chartG, morph, source === 'dom-with-model-fallback')
      : this.collectPreviousTranslatesFromModelTransforms();
    this.previousLayoutClusterCompoundDimensions = this.collectPreviousClusterCompoundDimensionsFromModel();
  }

  /** Resample count for edge polylines (layout, morph, drag). */
  private effectiveEdgePathSampleCount(): number {
    const raw = this.edgePathSampleCount();
    const n = typeof raw === 'number' && Number.isFinite(raw) ? Math.floor(raw) : 48;
    return Math.min(512, Math.max(2, n));
  }

  private collectPreviousTranslatesFromModelTransforms(): Map<string, { tx: number; ty: number }> {
    const m = new Map<string, { tx: number; ty: number }>();
    const collect = (items: Node[] | undefined) => {
      items?.forEach(n => {
        if (n.transform) {
          m.set(n.id, this.resolveTranslateFromTransform(n.transform));
        }
      });
    };
    collect(this.graph.nodes);
    collect(this.graph.clusters);
    collect(this.graph.compoundNodes);
    return m;
  }

  /** Prior `dimension` for clusters then compounds (model graph; used with layout morph size tween). */
  private collectPreviousClusterCompoundDimensionsFromModel(): Map<string, { width: number; height: number }> {
    const m = new Map<string, { width: number; height: number }>();
    const collect = (items: Node[] | undefined) => {
      items?.forEach(n => {
        const w = n.dimension?.width;
        const h = n.dimension?.height;
        if (w != null && h != null && Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
          m.set(n.id, { width: w, height: h });
        }
      });
    };
    collect(this.graph.clusters);
    collect(this.graph.compoundNodes);
    return m;
  }

  private getMainChartGroupElement(): SVGGElement | null {
    const g = (this.el.nativeElement as HTMLElement).querySelector('g.graph.chart');
    return g instanceof SVGGElement ? g : null;
  }

  /** Main-chart `g.node-group` only (not minimap duplicates). */
  private findMainChartNodeGroup(chartG: SVGGElement, nodeId: string): SVGGElement | null {
    const el = chartG.querySelector(`g.node-group#${CSS.escape(nodeId)}`);
    if (!(el instanceof SVGGElement) || el.closest('.minimap')) {
      return null;
    }
    return el;
  }

  private translateFromLayoutPositionForNode(n: Node): { tx: number; ty: number } {
    const center = this.centerNodesOnPositionChange();
    const dx = center ? (n.dimension?.width ?? 0) / 2 : 0;
    const dy = center ? (n.dimension?.height ?? 0) / 2 : 0;
    const px = n.position?.x ?? 0;
    const py = n.position?.y ?? 0;
    return { tx: px - dx || 0, ty: py - dy || 0 };
  }

  private findMorphNodeById(
    nodeId: string,
    order: NonNullable<LayoutMorphCapture['modelResolutionOrder']>
  ): Node | undefined {
    for (const kind of order) {
      if (kind === 'compound') {
        const hit = this.graph.compoundNodes?.find(x => x.id === nodeId);
        if (hit) {
          return hit;
        }
      } else if (kind === 'cluster') {
        const hit = this.graph.clusters?.find(x => x.id === nodeId);
        if (hit) {
          return hit;
        }
      } else {
        const hit = this.graph.nodes.find(x => x.id === nodeId);
        if (hit) {
          return hit;
        }
      }
    }
    return undefined;
  }

  private modelTranslateForMorphFallback(nodeId: string, morph: LayoutMorphCapture): { tx: number; ty: number } {
    const order = morph.modelResolutionOrder ?? ['compound', 'cluster', 'node'];
    const n = this.findMorphNodeById(nodeId, order);
    if (!n) {
      return { tx: 0, ty: 0 };
    }
    if (n.transform) {
      return this.resolveTranslateFromTransform(n.transform);
    }
    return this.translateFromLayoutPositionForNode(n);
  }

  private isDegenerateTranslate(t: { tx: number; ty: number }, eps: number): boolean {
    return Math.hypot(t.tx, t.ty) <= eps;
  }

  /** `translate` of `nodeEl`'s origin in `chartG` user space (pan/zoom excluded from node-local chain). */
  private translateNodeGroupInChartUserSpace(
    nodeEl: SVGGElement,
    chartG: SVGGElement
  ): { tx: number; ty: number } | null {
    try {
      const nodeCtm = nodeEl.getCTM();
      const chartCtm = chartG.getCTM();
      if (!nodeCtm || !chartCtm) {
        return null;
      }
      const m = chartCtm.inverse().multiply(nodeCtm);
      return { tx: m.e, ty: m.f };
    } catch {
      return null;
    }
  }

  private collectPreviousTranslatesFromDom(
    chartG: SVGGElement,
    morph: LayoutMorphCapture,
    hybrid: boolean
  ): Map<string, { tx: number; ty: number }> {
    const eps = morph.degenerateEpsilon ?? 1e-3;
    const m = new Map<string, { tx: number; ty: number }>();
    const forNode = (n: Node) => {
      const nodeEl = this.findMainChartNodeGroup(chartG, n.id);
      const attr = nodeEl?.getAttribute('transform')?.trim() ?? '';
      let t: { tx: number; ty: number };

      if (nodeEl && attr.length > 0) {
        t = this.resolveTranslateFromTransform(attr);
        if (hybrid && this.isDegenerateTranslate(t, eps)) {
          t = this.modelTranslateForMorphFallback(n.id, morph);
        }
      } else if (nodeEl && attr.length === 0 && hybrid) {
        const ctmT = this.translateNodeGroupInChartUserSpace(nodeEl, chartG);
        t = ctmT && !this.isDegenerateTranslate(ctmT, eps) ? ctmT : this.modelTranslateForMorphFallback(n.id, morph);
      } else if (n.transform) {
        t = this.resolveTranslateFromTransform(n.transform);
      } else {
        t = this.translateFromLayoutPositionForNode(n);
      }
      m.set(n.id, t);
    };
    this.graph.nodes.forEach(forNode);
    this.graph.clusters?.forEach(forNode);
    this.graph.compoundNodes?.forEach(forNode);
    return m;
  }

  /** When {@link LayoutMorphCapture.syncTargetsFromPositionAfterTick} is on, recompute targets from `position`. */
  private syncLayoutAnimationTargetsFromPositions(): void {
    const targets = this.layoutAnimationTargets;
    if (!targets?.size) {
      return;
    }
    const sync = (items: Node[] | undefined) => {
      items?.forEach(n => {
        if (targets.has(n.id)) {
          targets.set(n.id, this.translateFromLayoutPositionForNode(n));
        }
      });
    };
    sync(this.graph.nodes);
    sync(this.graph.clusters);
    sync(this.graph.compoundNodes);
  }

  /**
   * Aligns `previousLayoutTransforms` with layout targets before `resetToPrevious` when:
   * - The same `id` moved between `nodes` / `clusters` / `compoundNodes` (always; does not require
   *   {@link LayoutMorphCapture.snapAddedNodeIds}),
   * - A cluster or compound id is new since the last tick (always, so new groups do not tween from a missing origin),
   * - With {@link LayoutMorphCapture.snapAddedNodeIds}: any new id (including plain nodes), plus degenerate-stable snap
   *   for clusters/compounds (see {@link isDegenerateTranslate} and `morphCapture.degenerateEpsilon`).
   */
  private snapMorphPreviousForAddedNodes(
    priorTickGraphIds: Set<string>,
    priorTickGraphKindById: Map<string, 'node' | 'cluster' | 'compound'>,
    snapAddedNodeIds: boolean
  ): void {
    const prevs = this.previousLayoutTransforms;
    const targets = this.layoutAnimationTargets;
    if (!prevs?.size || !targets?.size) {
      return;
    }
    const morph = this.effectiveLayoutTransition.morphCapture;
    const eps = morph.degenerateEpsilon ?? 1e-3;

    const snapOne = (n: Node, kind: 'node' | 'cluster' | 'compound', degenerateStableClusterOrCompound: boolean) => {
      const tgt = targets.get(n.id);
      if (!tgt) {
        return;
      }
      const priorKind = priorTickGraphKindById.get(n.id);
      const inPriorIds = priorTickGraphIds.has(n.id);
      const sameIdRoleChanged = inPriorIds && priorKind !== undefined && priorKind !== kind;
      const snapAsNewIdWithFlag = snapAddedNodeIds && !inPriorIds;
      const snapNewClusterOrCompoundWithoutFlag =
        !snapAddedNodeIds && !inPriorIds && (kind === 'cluster' || kind === 'compound');
      const prev = prevs.get(n.id);
      const snapDegenerateStableClusterOrCompound =
        snapAddedNodeIds &&
        degenerateStableClusterOrCompound &&
        inPriorIds &&
        priorKind === kind &&
        prev !== undefined &&
        this.isDegenerateTranslate(prev, eps);
      if (
        sameIdRoleChanged ||
        snapAsNewIdWithFlag ||
        snapNewClusterOrCompoundWithoutFlag ||
        snapDegenerateStableClusterOrCompound
      ) {
        prevs.set(n.id, { tx: tgt.tx, ty: tgt.ty });
      }
    };

    const snap = (
      items: Node[] | undefined,
      kind: 'node' | 'cluster' | 'compound',
      degenerateStableClusterOrCompound: boolean
    ) => {
      items?.forEach(n => snapOne(n, kind, degenerateStableClusterOrCompound));
    };
    snap(this.graph.nodes, 'node', false);
    snap(this.graph.clusters, 'cluster', true);
    snap(this.graph.compoundNodes, 'compound', true);
  }

  public applyAdditiveSmoothTransitionFilters(
    targets: Map<string, { tx: number; ty: number }>,
    priorTickGraphIds: Set<string>,
    priorTickGraphKindById: Map<string, 'node' | 'cluster' | 'compound'>
  ): void {
    if (
      this.effectiveLayoutTransition.scope !== 'additive' ||
      priorTickGraphIds.size === 0 ||
      !this.previousLayoutTransforms
    ) {
      return;
    }
    const prevs = this.previousLayoutTransforms;
    const currentKindById = new Map<string, 'node' | 'cluster' | 'compound'>();
    const register = (items: Node[] | undefined, kind: 'node' | 'cluster' | 'compound') => {
      items?.forEach(n => currentKindById.set(n.id, kind));
    };
    register(this.graph.nodes, 'node');
    register(this.graph.clusters, 'cluster');
    register(this.graph.compoundNodes, 'compound');

    const allIds = new Set<string>();
    for (const coll of [this.graph.nodes, this.graph.clusters, this.graph.compoundNodes]) {
      coll?.forEach(n => allIds.add(n.id));
    }
    for (const id of allIds) {
      const currentKind = currentKindById.get(id)!;
      const priorKind = priorTickGraphKindById.get(id);
      const stableSameRole = priorTickGraphIds.has(id) && priorKind === currentKind;
      if (stableSameRole) {
        targets.delete(id);
        prevs.delete(id);
      } else if (!prevs.has(id)) {
        const tgt = targets.get(id);
        if (tgt) {
          // New nodes: do not tween from parent anchor (or a bad 0,0) — appear at final layout coordinates. Edge routes
          // still morph via `runUnifiedLayoutAnimation` / `redrawLines` when maps stay populated.
          prevs.set(id, { tx: tgt.tx, ty: tgt.ty });
        }
      }
    }
  }

  private refreshPriorTickGraphIds(multigraph: boolean): void {
    const ids = new Set<string>();
    const kindById = new Map<string, 'node' | 'cluster' | 'compound'>();
    const collect = (items: Node[] | undefined, kind: 'node' | 'cluster' | 'compound') => {
      items?.forEach(n => {
        ids.add(n.id);
        kindById.set(n.id, kind);
      });
    };
    collect(this.graph.nodes, 'node');
    collect(this.graph.clusters, 'cluster');
    collect(this.graph.compoundNodes, 'compound');
    this.priorTickGraphNodeIds = ids;
    this.priorTickGraphKindById = kindById;

    const keys = new Set<string>();
    for (const e of this.graph.edges ?? []) {
      keys.add(this.linkKeyForLookup(e, multigraph));
    }
    this.priorTickEdgeKeys = keys;
  }

  /**
   * Builds one edge entry for {@link tick}. `lookupKey` / `legacyKey` must match {@link linkKeyForLookup} /
   * `_oldLinks` (graphlib uses string ids; ELK uses array `edgeLabels` and real keys from the edge).
   */
  private pushTickEdgeLink(
    newLinks: Edge[],
    edgeLabel: Edge,
    lookupKey: string,
    legacyKey: string,
    oldLinkMap: Map<string, Edge>,
    graphEdgeMap: Map<string, Edge>,
    mg: boolean
  ): void {
    let oldLink = oldLinkMap.get(lookupKey) ?? oldLinkMap.get(legacyKey);
    const linkFromGraph = graphEdgeMap.get(lookupKey) ?? graphEdgeMap.get(legacyKey);

    if (!oldLink) {
      // Prefer a prior tick edge (has route data) over the fresh graph stub, which often has no `points`.
      oldLink =
        this._oldLinks.find(ol => {
          const k = this.linkKeyForLookup(ol, mg);
          return k === lookupKey || k === legacyKey;
        }) ??
        linkFromGraph ??
        edgeLabel;
    } else if (
      oldLink.data &&
      linkFromGraph &&
      linkFromGraph.data &&
      JSON.stringify(oldLink.data) !== JSON.stringify(linkFromGraph.data)
    ) {
      oldLink.data = linkFromGraph.data;
    }

    oldLink.oldLine = oldLink.line;

    const baseEdge = (oldLink || linkFromGraph || edgeLabel) as Edge;
    let points = edgeLabel.points as Array<{ x: number; y: number }>;
    if (!points || points.length < 2) {
      const fb = this.buildFallbackEdgePoints(baseEdge);
      if (fb.length >= 2) {
        points = fb;
      }
    }
    if (!points || points.length < 2) {
      points = [
        { x: 0, y: 0 },
        { x: 0, y: 0 }
      ];
    }

    // Build `line` from resampled geometry so static paths match drag and morph (same curve + sample count).
    const { line, displayPoints } = this.lineAndDisplayFromRoutePoints(points);

    const newLink = Object.assign({}, oldLink);
    newLink.line = line;
    newLink.points = points;
    const hadPreviousRoute = oldLink?.points && Array.isArray(oldLink.points) && (oldLink.points as any[]).length >= 2;
    // Raw prior layout polyline; redrawLines resamples to N for morphing (single resampling site).
    let previousPoints: Array<{ x: number; y: number }> | undefined = hadPreviousRoute
      ? this.clonePoints(oldLink.points as Array<{ x: number; y: number }>)
      : undefined;
    if (
      this.effectiveLayoutTransition.scope === 'additive' &&
      this.layoutMorphActive &&
      !hadPreviousRoute &&
      points.length >= 2 &&
      this.edgeKeysAtLayoutTickStart.size > 0
    ) {
      const ek = this.linkKeyForLookup(baseEdge, mg);
      if (!this.edgeKeysAtLayoutTickStart.has(ek)) {
        const s = points[0];
        previousPoints = [
          { x: s.x, y: s.y },
          { x: s.x, y: s.y }
        ];
      }
    }
    if (
      this.effectiveLayoutTransition.scope === 'additive' &&
      this.layoutMorphActive &&
      this.edgeKeysAtLayoutTickStart.size > 0
    ) {
      const ekStable = this.linkKeyForLookup(baseEdge, mg);
      if (this.edgeKeysAtLayoutTickStart.has(ekStable)) {
        previousPoints = undefined;
      }
    }
    if (
      this.layoutMorphActive &&
      this.effectiveLayoutTransition.scope === 'full' &&
      this.previousLayoutTransforms?.size &&
      !this.edgeKeysAtLayoutTickStart.has(this.linkKeyForLookup(baseEdge, mg))
    ) {
      const syn = this.syntheticPreviousEdgePointsFromPriorTransforms(baseEdge);
      if (syn && syn.length >= 2) {
        previousPoints = this.clonePoints(syn);
      }
    }
    if (this.morphSuppressedThisTick) {
      previousPoints = undefined;
    }
    newLink.previousPoints = previousPoints;

    this.updateMidpointOnEdge(newLink, points);

    const textPos = points[Math.floor(points.length / 2)];
    if (textPos) {
      newLink.textTransform = `translate(${textPos.x || 0},${textPos.y || 0})`;
    }

    newLink.textAngle = 0;
    if (!newLink.oldLine) {
      newLink.oldLine = newLink.line;
    }

    this.calcDominantBaseline(newLink, displayPoints);
    newLinks.push(newLink);
  }

  /** Drop outlet contexts for ids no longer in the graph so templates do not retain stale references. */
  private pruneTemplateOutletContextCaches(): void {
    const g = this.graph;
    if (!g) {
      this.graphMainNodeOutletCtx.clear();
      this.graphMinimapNodeOutletCtx.clear();
      this.graphClusterOutletCtx.clear();
      this.graphCompoundOutletCtx.clear();
      this.graphLinkOutletCtx.clear();
      return;
    }
    const nodeIds = new Set(g.nodes?.map(n => n.id) ?? []);
    const clusterIds = new Set(g.clusters?.map(c => c.id) ?? []);
    const compoundIds = new Set(g.compoundNodes?.map(c => c.id) ?? []);
    const linkIds = new Set(g.edges?.map(e => e.id) ?? []);

    for (const id of [...this.graphMainNodeOutletCtx.keys()]) {
      if (!nodeIds.has(id)) {
        this.graphMainNodeOutletCtx.delete(id);
      }
    }
    for (const id of [...this.graphMinimapNodeOutletCtx.keys()]) {
      if (!nodeIds.has(id)) {
        this.graphMinimapNodeOutletCtx.delete(id);
      }
    }
    for (const id of [...this.graphClusterOutletCtx.keys()]) {
      if (!clusterIds.has(id)) {
        this.graphClusterOutletCtx.delete(id);
      }
    }
    for (const id of [...this.graphCompoundOutletCtx.keys()]) {
      if (!compoundIds.has(id)) {
        this.graphCompoundOutletCtx.delete(id);
      }
    }
    for (const id of [...this.graphLinkOutletCtx.keys()]) {
      if (!linkIds.has(id)) {
        this.graphLinkOutletCtx.delete(id);
      }
    }
  }

  /** Stable context for `#nodeTemplate` on the main chart (see {@link graphMainNodeOutletCtx}). */
  outletContextGraphNode(node: Node): { $implicit: Node; transitionAfterChangesActive: boolean } {
    const morph = this.layoutJsMorphEnabled;
    let o = this.graphMainNodeOutletCtx.get(node.id);
    if (!o) {
      o = { $implicit: node, transitionAfterChangesActive: morph };
      this.graphMainNodeOutletCtx.set(node.id, o);
    } else {
      o.$implicit = node;
      o.transitionAfterChangesActive = morph;
    }
    return o;
  }

  /** Stable context for `#nodeTemplate` / `#miniMapNodeTemplate` on the minimap. */
  outletContextMinimapNode(node: Node): { $implicit: Node; transitionAfterChangesActive: boolean } {
    const morph = this.layoutJsMorphEnabled;
    let o = this.graphMinimapNodeOutletCtx.get(node.id);
    if (!o) {
      o = { $implicit: node, transitionAfterChangesActive: morph };
      this.graphMinimapNodeOutletCtx.set(node.id, o);
    } else {
      o.$implicit = node;
      o.transitionAfterChangesActive = morph;
    }
    return o;
  }

  /** Stable context for `#clusterTemplate`. */
  outletContextCluster(node: Node): { $implicit: Node; transitionAfterChangesActive: boolean } {
    const morph = this.layoutJsMorphEnabled;
    let o = this.graphClusterOutletCtx.get(node.id);
    if (!o) {
      o = { $implicit: node, transitionAfterChangesActive: morph };
      this.graphClusterOutletCtx.set(node.id, o);
    } else {
      o.$implicit = node;
      o.transitionAfterChangesActive = morph;
    }
    return o;
  }

  /** Stable context for `#nodeTemplate` on compound nodes. */
  outletContextCompoundNode(node: Node): { $implicit: Node; transitionAfterChangesActive: boolean } {
    const morph = this.layoutJsMorphEnabled;
    let o = this.graphCompoundOutletCtx.get(node.id);
    if (!o) {
      o = { $implicit: node, transitionAfterChangesActive: morph };
      this.graphCompoundOutletCtx.set(node.id, o);
    } else {
      o.$implicit = node;
      o.transitionAfterChangesActive = morph;
    }
    return o;
  }

  /** Stable context for `#linkTemplate`. */
  outletContextLink(link: Edge): { $implicit: Edge; transitionAfterChangesActive: boolean } {
    const morph = this.layoutJsMorphEnabled;
    const id = link.id;
    let o = this.graphLinkOutletCtx.get(id);
    if (!o) {
      o = { $implicit: link, transitionAfterChangesActive: morph };
      this.graphLinkOutletCtx.set(id, o);
    } else {
      o.$implicit = link;
      o.transitionAfterChangesActive = morph;
    }
    return o;
  }

  tick() {
    this.pruneTemplateOutletContextCaches();
    const tickId = ++this.drawCompleteTickId;
    const suppressThisTick = this.suppressLayoutMorphThisTick || this.shouldSuppressLayoutMorphForViewport();
    this.morphSuppressedThisTick = suppressThisTick;
    this.edgeKeysAtLayoutTickStart = new Set(this.priorTickEdgeKeys);
    const priorTickGraphIds = new Set(this.priorTickGraphNodeIds);
    const priorTickGraphKinds = new Map(this.priorTickGraphKindById);
    const mg = this.isLayoutMultigraph();

    const newNodeIds: Set<string> = new Set();
    const newClusterIds: Set<string> = new Set();
    const newCompoundNodeIds: Set<string> = new Set();

    this.applyTransforms(this.graph.nodes, newNodeIds);
    this.applyTransforms(this.graph.clusters || [], newClusterIds);
    this.applyTransforms(this.graph.compoundNodes || [], newCompoundNodeIds);

    this.layoutAnimationTargets = null;
    this.layoutAnimationClusterCompoundDimensions = null;
    if (
      !suppressThisTick &&
      !this.isDragging &&
      this.layoutMorphActive &&
      this.previousLayoutTransforms?.size &&
      this._oldLinks.length
    ) {
      const targets = new Map<string, { tx: number; ty: number }>();
      const captureTargets = (items: Node[] | undefined) => {
        if (!items) {
          return;
        }
        for (const n of items) {
          targets.set(n.id, this.resolveTranslateFromTransform(n.transform));
        }
      };
      captureTargets(this.graph.nodes);
      captureTargets(this.graph.clusters);
      captureTargets(this.graph.compoundNodes);
      this.layoutAnimationTargets = targets;

      if (this.effectiveLayoutTransition.scope !== 'additive') {
        const dimTargets = new Map<string, { width: number; height: number }>();
        const captureDimTargets = (items: Node[] | undefined) => {
          if (!items) {
            return;
          }
          for (const n of items) {
            const w = n.dimension?.width;
            const h = n.dimension?.height;
            if (w != null && h != null && Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
              dimTargets.set(n.id, { width: w, height: h });
            }
          }
        };
        captureDimTargets(this.graph.clusters);
        captureDimTargets(this.graph.compoundNodes);
        this.layoutAnimationClusterCompoundDimensions = dimTargets;
      }

      this.applyAdditiveSmoothTransitionFilters(targets, priorTickGraphIds, priorTickGraphKinds);

      const morph = this.effectiveLayoutTransition.morphCapture;
      if (morph.syncTargetsFromPositionAfterTick && this.effectiveLayoutTransition.scope === 'full') {
        this.syncLayoutAnimationTargetsFromPositions();
      }
      if (this.previousLayoutTransforms) {
        this.snapMorphPreviousForAddedNodes(priorTickGraphIds, priorTickGraphKinds, !!morph.snapAddedNodeIds);
      }

      const resetToPrevious = (items: Node[] | undefined) => {
        if (!items) {
          return;
        }
        const prevs = this.previousLayoutTransforms!;
        for (const n of items) {
          if (prevs.has(n.id)) {
            const prev = prevs.get(n.id)!;
            n.transform = `translate(${prev.tx},${prev.ty})`;
          }
        }
      };
      resetToPrevious(this.graph.nodes);
      resetToPrevious(this.graph.clusters);
      resetToPrevious(this.graph.compoundNodes);

      if (this.effectiveLayoutTransition.scope !== 'additive' && this.previousLayoutClusterCompoundDimensions?.size) {
        const dimPrevs = this.previousLayoutClusterCompoundDimensions;
        const seedDims = (items: Node[] | undefined) => {
          items?.forEach(n => {
            const d = dimPrevs.get(n.id);
            if (d) {
              n.dimension = { width: d.width, height: d.height };
            }
          });
        };
        seedDims(this.graph.clusters);
        seedDims(this.graph.compoundNodes);
      }
    } else if (suppressThisTick) {
      this.suppressLayoutMorphThisTick = false;
      this.cancelLayoutUnifiedAnimation();
      this.cancelAllEdgePathAnimations();
      this.previousLayoutTransforms = null;
      this.layoutAnimationTargets = null;
      this.layoutAnimationClusterCompoundDimensions = null;
      this.previousLayoutClusterCompoundDimensions = null;
    }

    const oldLinkMap = new Map<string, Edge>();
    for (const ol of this._oldLinks) {
      const key = this.linkKeyForLookup(ol, mg);
      oldLinkMap.set(key, ol);
    }

    const graphEdgeMap = new Map<string, Edge>();
    for (const nl of this.graph.edges) {
      const key = this.linkKeyForLookup(nl, mg);
      graphEdgeMap.set(key, nl);
    }

    const newLinks: Edge[] = [];
    if (Array.isArray(this.graph.edgeLabels)) {
      for (const edgeLabel of this.graph.edgeLabels) {
        const lookupKey = this.linkKeyForLookup(edgeLabel, mg);
        const legacyKey = String(edgeLabel.id ?? '').replace(/[^\w-]*/g, '');
        this.pushTickEdgeLink(newLinks, edgeLabel, lookupKey, legacyKey, oldLinkMap, graphEdgeMap, mg);
      }
    } else if (this.graph.edgeLabels != null) {
      for (const edgeLabelId in this.graph.edgeLabels) {
        const edgeLabel = this.graph.edgeLabels[edgeLabelId];
        const lookupKey = this.graphlibEdgeLabelIdToLookupKey(edgeLabelId, mg);
        const legacyKey = edgeLabelId.replace(/[^\w-]*/g, '');
        this.pushTickEdgeLink(newLinks, edgeLabel, lookupKey, legacyKey, oldLinkMap, graphEdgeMap, mg);
      }
    } else {
      for (const edgeLabel of this.graph.edges ?? []) {
        const lookupKey = this.linkKeyForLookup(edgeLabel, mg);
        const legacyKey = String(edgeLabel.id ?? '').replace(/[^\w-]*/g, '');
        this.pushTickEdgeLink(newLinks, edgeLabel, lookupKey, legacyKey, oldLinkMap, graphEdgeMap, mg);
      }
    }

    this.graph.edges = newLinks;

    this.refreshPriorTickGraphIds(mg);

    if (this.graph.edges) {
      this._oldLinks = this.graph.edges.map(l => {
        const newL = Object.assign({}, l);
        newL.oldLine = l.line;
        return newL;
      });
    }

    // Before post-tick rAF so `[class.old-node]` matches every current id (avoids new-only flicker on zoom CD with tween).
    this.oldNodes = newNodeIds;
    this.oldClusters = newClusterIds;
    this.oldCompoundNodes = newCompoundNodeIds;

    requestAnimationFrame(() => {
      // Full-scope morph keeps `node.transform` at previous layout until unified rAF; do not sync from `position` or
      // refresh bounds/pan from the new layout here — that would wipe `resetToPrevious` and desync the viewport.
      const nodeTweenActive =
        !!this.layoutAnimationTargets && this.layoutMorphActive && this.effectiveLayoutTransition.scope !== 'additive';
      if (!nodeTweenActive) {
        this.applyNodeDimensions();
      }
      // `applyTransforms` used ELK dimensions; `applyNodeDimensions` may change width/height from the DOM.
      // Recompute `translate` so the layout center (`position`) stays fixed while the box grows — otherwise edges
      // (anchored to ELK geometry) stop meeting the node glyph.
      if (!nodeTweenActive) {
        this.syncNodeTransformsFromLayoutPositions();
      }
      const animateValue = this.animate();
      const layoutMorphAfterView = (animateValue || this.layoutJsMorphEnabled) && !suppressThisTick;
      if (animateValue || this.layoutJsMorphEnabled) {
        this.cd.detectChanges();
      }
      this.scheduleRedrawLinesAfterView(layoutMorphAfterView, tickId);
      if (this.hasGraphNodeLikeContent() && !nodeTweenActive) {
        this.updateGraphDims();
      }
      if (!nodeTweenActive) {
        this.updateMinimap();
      }

      if (!nodeTweenActive) {
        const autoZoom = this.autoZoom();
        if (autoZoom) {
          const autoCenter = this.autoCenter();
          this.zoomToFit({ autoCenter: autoCenter ? autoCenter : false });
        } else if (this.autoCenter() && !autoZoom) {
          this.center();
        }
      }
    });

    if (!suppressThisTick) {
      this.lastInputTopologySignature = this.buildInputTopology();
    }

    this.morphSuppressedThisTick = false;
    this.cd.markForCheck();
  }

  private applyTransforms(items: Node[], idCollector: Set<string>): void {
    for (const n of items) {
      this.updateNodeGroupTransform(n);
      if (!n.data) {
        n.data = {};
      }
      n.data.color = this.colors.getColor(this.groupResultsBy()(n));
      // Pre-layout hooks may set `hidden` (e.g. `applyVisualContinuityBeforeLayout` for incremental smooth transitions,
      // or `initializeNode` when `deferDisplayUntilPosition`). `tick` runs after layout positions exist — show nodes.
      n.hidden = false;
      idCollector.add(n.id);
    }
  }

  /** `translate` for `<g class="node-group">` from `position` (center when `centerNodesOnPositionChange`). */
  private updateNodeGroupTransform(n: Node): void {
    const center = this.centerNodesOnPositionChange();
    const dx = center ? (n.dimension?.width ?? 0) / 2 : 0;
    const dy = center ? (n.dimension?.height ?? 0) / 2 : 0;
    const px = n.position?.x ?? 0;
    const py = n.position?.y ?? 0;
    n.transform = `translate(${px - dx || 0}, ${py - dy || 0})`;
  }

  /** Call after `applyNodeDimensions` when node box size changes but `position` (center) must stay fixed. */
  private syncNodeTransformsFromLayoutPositions(): void {
    const sync = (items: Node[] | undefined) => {
      items?.forEach(n => this.updateNodeGroupTransform(n));
    };
    sync(this.graph.nodes);
    sync(this.graph.clusters);
    sync(this.graph.compoundNodes);
  }

  /** Optional CSS transform on the chart host during layout morph (`layoutTransitionEffect`). */
  private applyLayoutOuterEffect(tscalar: number): void {
    const eff = this.effectiveLayoutEffect;
    const lt = this.effectiveLayoutTransition;
    if (eff.kind === 'none' || lt.mode !== 'tween') {
      this.layoutOuterTransform = null;
      return;
    }
    const peak = eff.peakDegrees ?? 12;
    const w = Math.sin(Math.PI * tscalar) * peak;
    if (eff.kind === 'perspectiveFlip') {
      this.layoutOuterTransform = `perspective(900px) rotateX(${w}deg)`;
      return;
    }
    if (eff.kind === 'rotate') {
      const pivot = eff.rotatePivot;
      if (pivot === 'graphCenter' && this.graphDims?.width) {
        this.layoutEffectTransformOrigin = `${(this.graphDims.width / 2 / Math.max(this.width || 1, 1)) * 100}% ${(this.graphDims.height / 2 / Math.max(this.height || 1, 1)) * 100}%`;
      } else if (typeof pivot === 'object' && pivot?.nodeId) {
        const n = this.graph?.nodes?.find(nd => nd.id === pivot.nodeId);
        if (n?.position && this.width && this.height) {
          this.layoutEffectTransformOrigin = `${(n.position.x / this.width) * 100}% ${(n.position.y / this.height) * 100}%`;
        } else {
          this.layoutEffectTransformOrigin = '50% 50%';
        }
      } else {
        this.layoutEffectTransformOrigin = '50% 50%';
      }
      this.layoutOuterTransform = `rotate(${w}deg)`;
      return;
    }
    this.layoutOuterTransform = null;
  }

  private cancelViewportPanAnimation(): void {
    if (this.viewportPanAnimRafId != null) {
      cancelAnimationFrame(this.viewportPanAnimRafId);
      this.viewportPanAnimRafId = null;
    }
  }

  /** Applies one programmatic pan step with optional viewport easing (translation only). */
  private animateViewportPanDelta(dx: number, dy: number): void {
    const cfg = this.effectiveViewportTransition;
    if (!cfg.enabled || cfg.durationMs <= 0) {
      this.transformationMatrix = transform(this.transformationMatrix, translate(dx, dy));
      this.updateTransform();
      return;
    }
    this.cancelViewportPanAnimation();
    const easeFn = resolveGraphTransitionEasing(cfg.easing);
    const startE = this.transformationMatrix.e;
    const startF = this.transformationMatrix.f;
    const endE = startE + dx;
    const endF = startF + dy;
    const duration = cfg.durationMs;
    const startMs = performance.now();
    const step = () => {
      const u = Math.min(1, (performance.now() - startMs) / duration);
      const t = easeFn(u);
      this.transformationMatrix.e = startE + t * (endE - startE);
      this.transformationMatrix.f = startF + t * (endF - startF);
      this.updateTransform();
      if (u >= 1) {
        this.viewportPanAnimRafId = null;
        return;
      }
      this.viewportPanAnimRafId = requestAnimationFrame(step);
    };
    this.viewportPanAnimRafId = requestAnimationFrame(step);
  }

  /**
   * Default node template: circle inscribed in the layout box so ELK/Dagre edge ports (box edges) meet the glyph.
   */
  defaultNodeCircleRadius(node: Node): number {
    const w = node.dimension?.width ?? 0;
    const h = node.dimension?.height ?? 0;
    if (w > 0 && h > 0) {
      return Math.min(w, h) / 2;
    }
    return 10;
  }

  getMinimapTransform(): string {
    switch (this.miniMapPosition()) {
      case MiniMapPosition.UpperLeft: {
        return 'translate(' + this.miniMapMargin().left + ',' + this.miniMapMargin().top + ')';
      }
      case MiniMapPosition.UpperRight: {
        return (
          'translate(' +
          (this.dims.width - this.graphDims.width / this.minimapScaleCoefficient - this.miniMapMargin().right) +
          ',' +
          this.miniMapMargin().top +
          ')'
        );
      }
      case MiniMapPosition.LowerLeft: {
        return (
          'translate(' +
          this.miniMapMargin().left +
          ',' +
          (this.dims.height - this.graphDims.height / this.minimapScaleCoefficient - this.miniMapMargin().bottom) +
          ')'
        );
      }
      case MiniMapPosition.LowerRight: {
        return (
          'translate(' +
          (this.dims.width - this.graphDims.width / this.minimapScaleCoefficient - this.miniMapMargin().right) +
          ',' +
          (this.dims.height - this.graphDims.height / this.minimapScaleCoefficient - this.miniMapMargin().bottom) +
          ')'
        );
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

    const center = this.centerNodesOnPositionChange();
    const accumulate = (items: Node[] | undefined) => {
      if (!items?.length) {
        return;
      }
      for (let i = 0; i < items.length; i++) {
        const node = items[i];
        const w = node.dimension?.width ?? 0;
        const h = node.dimension?.height ?? 0;
        const px = node.position?.x ?? 0;
        const py = node.position?.y ?? 0;
        let left: number;
        let right: number;
        let top: number;
        let bottom: number;
        if (center) {
          left = px - w / 2;
          right = px + w / 2;
          top = py - h / 2;
          bottom = py + h / 2;
        } else {
          left = px;
          right = px + w;
          top = py;
          bottom = py + h;
        }
        minX = left < minX ? left : minX;
        maxX = right > maxX ? right : maxX;
        minY = top < minY ? top : minY;
        maxY = bottom > maxY ? bottom : maxY;
      }
    };
    accumulate(this.graph.nodes);
    accumulate(this.graph.compoundNodes);
    accumulate(this.graph.clusters);

    if (!isFinite(minX) || !isFinite(maxX) || !isFinite(minY) || !isFinite(maxY)) {
      this.graphDims.width = 0;
      this.graphDims.height = 0;
      this.minimapOffsetX = 0;
      this.minimapOffsetY = 0;
      return;
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

  /** True when the graph has at least one node, compound node, or cluster (for bounds / minimap). */
  private hasGraphNodeLikeContent(): boolean {
    return (
      (this.graph?.nodes?.length ?? 0) +
        (this.graph?.compoundNodes?.length ?? 0) +
        (this.graph?.clusters?.length ?? 0) >
      0
    );
  }

  @throttleable(500)
  updateMinimap() {
    // Calculate the height/width total when there is drawable graph content
    if (this.hasGraphNodeLikeContent()) {
      this.updateGraphDims();

      const miniMapMaxWidth = this.miniMapMaxWidth();
      if (miniMapMaxWidth) {
        this.minimapScaleCoefficient = this.graphDims.width / miniMapMaxWidth;
      }
      const miniMapMaxHeight = this.miniMapMaxHeight();
      if (miniMapMaxHeight) {
        this.minimapScaleCoefficient = Math.max(this.minimapScaleCoefficient, this.graphDims.height / miniMapMaxHeight);
      }

      this.minimapTransform = this.getMinimapTransform();
    }
  }

  /**
   * Resolves a layout node, compound node, or cluster by the `<g>` element `id`.
   */
  private findLayoutNodeByElementId(elementId: string): Node | undefined {
    return (
      this.graph.nodes.find(n => n.id === elementId) ??
      this.graph.compoundNodes?.find(n => n.id === elementId) ??
      this.graph.clusters?.find(c => c.id === elementId)
    );
  }

  /**
   * Measures one node-group SVG element and writes `dimension` on the model node.
   */
  private applyNodeDimensionFromSvgGroup(nativeElement: SVGGraphicsElement, node: Node): void {
    // calculate the height
    let dims: DOMRect;
    try {
      dims = nativeElement.getBBox();
      if (!dims.width || !dims.height) {
        return;
      }
    } catch {
      // Skip drawing if element is not displayed - Firefox would throw an error here
      return;
    }
    const nodeHeight = this.nodeHeight();
    if (nodeHeight) {
      node.dimension.height = node.dimension.height && node.meta.forceDimensions ? node.dimension.height : nodeHeight;
    } else {
      node.dimension.height = node.dimension.height && node.meta.forceDimensions ? node.dimension.height : dims.height;
    }

    const nodeMaxHeight = this.nodeMaxHeight();
    if (nodeMaxHeight) {
      node.dimension.height = Math.max(node.dimension.height, nodeMaxHeight);
    }
    const nodeMinHeight = this.nodeMinHeight();
    if (nodeMinHeight) {
      node.dimension.height = Math.min(node.dimension.height, nodeMinHeight);
    }

    const nodeWidth = this.nodeWidth();
    if (nodeWidth) {
      node.dimension.width = node.dimension.width && node.meta.forceDimensions ? node.dimension.width : nodeWidth;
    } else {
      // calculate the width
      if (nativeElement.getElementsByTagName('text').length) {
        let maxTextDims: { width: number; height: number } | undefined;
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
        } catch {
          // Skip drawing if element is not displayed - Firefox would throw an error here
          return;
        }
        if (!maxTextDims) {
          return;
        }
        node.dimension.width =
          node.dimension.width && node.meta.forceDimensions ? node.dimension.width : maxTextDims.width + 20;
      } else {
        node.dimension.width = node.dimension.width && node.meta.forceDimensions ? node.dimension.width : dims.width;
      }
    }

    const nodeMaxWidth = this.nodeMaxWidth();
    if (nodeMaxWidth) {
      node.dimension.width = Math.max(node.dimension.width, nodeMaxWidth);
    }
    const nodeMinWidth = this.nodeMinWidth();
    if (nodeMinWidth) {
      node.dimension.width = Math.min(node.dimension.width, nodeMinWidth);
    }
  }

  /**
   * Measures the node element and applies the dimensions
   *
   * @memberOf GraphComponent
   */
  applyNodeDimensions(): void {
    const measureRefs = (refs: readonly ElementRef[] | undefined) => {
      refs?.forEach(elem => {
        const nativeElement = elem.nativeElement as SVGGraphicsElement;
        const node = this.findLayoutNodeByElementId(nativeElement.id);
        if (!node) {
          return;
        }
        this.applyNodeDimensionFromSvgGroup(nativeElement, node);
      });
    };
    measureRefs(this.nodeElements());
    measureRefs(this.clusterElements());
  }

  /**
   * Runs after Angular commits the template so D3 binds to the live link `<path>` elements
   * (OnPush + rAF alone can run too early). Retries once after `requestAnimationFrame` if link
   * groups are not ready yet — avoids two immediate `afterNextRender` passes that cancel unified RAF.
   */
  private scheduleRedrawLinesAfterView(morph: boolean, tickId: number): void {
    afterNextRender(
      () => {
        this.tryRedrawLinesAfterView(morph, 0, tickId);
      },
      { injector: this.injector }
    );
  }

  /**
   * d3 `select('#…')` for a host subtree element by HTML `id`. Raw ids may contain `--`, leading digits, etc., which are
   * invalid in unescaped CSS id selectors.
   */
  private selectTextPathInHostById(id: string): any {
    return select(this.el.nativeElement).select(`#${CSS.escape(id)}`);
  }

  /**
   * Imperative paint from `edge.line` / `edge.textPath` only — does not cancel unified layout morph or per-edge rAF.
   */
  private repaintLinkPathsDomFromModel(): void {
    this.linkElements()?.forEach(linkEl => {
      const edge = this.graph.edges.find(lin => lin.id === linkEl.nativeElement.id);
      if (!edge) {
        return;
      }
      let pathSelection: any = select(linkEl.nativeElement).select('path.edge, path.line');
      if (pathSelection.empty()) {
        pathSelection = select(linkEl.nativeElement).select('path');
      }
      const textPathEl = edge.id ? this.selectTextPathInHostById(edge.id) : null;
      if (!pathSelection.empty()) {
        pathSelection.attr('d', edge.line);
      }
      if (textPathEl && !textPathEl.empty()) {
        textPathEl.attr('d', edge.textPath);
      }
      this.updateMidpointOnEdge(edge, edge.points);
    });
  }

  /**
   * Binds D3 to link `<path>` elements, then emits {@link stateChange} (Output) and {@link drawComplete}
   * when link groups match edge count (or after bounded retries).
   *
   * Observable layouts (Cola, D3 force) can emit faster than `afterNextRender`; callbacks may run with a
   * superseded `tickId`. Those passes must not call {@link redrawLines} with morph enabled — it would
   * {@link cancelLayoutUnifiedAnimation} and interrupt full-graph layout morphs. Instead, repaint paths
   * from the current model when no rAF tween owns the paths; the latest `tickId` still runs full {@link redrawLines}.
   * {@link finalizeTickOutput} alone enforces `drawCompleteTickId`.
   */
  private tryRedrawLinesAfterView(morph: boolean, retryDepth: number, tickId: number): void {
    if (this._graphDestroyed) {
      return;
    }
    const currentPass = tickId === this.drawCompleteTickId;
    if (currentPass) {
      this.redrawLines(morph);
    } else if (this.layoutUnifiedRafId == null && this.edgePathRafIds.size === 0) {
      this.repaintLinkPathsDomFromModel();
    }
    const expected = this.graph.edges?.length ?? 0;
    const got = this.linkElements()?.length ?? 0;
    const linksReady = expected === 0 || got === expected;
    if (linksReady) {
      this.finalizeTickOutput(tickId);
      return;
    }
    if (retryDepth < 2) {
      requestAnimationFrame(() => {
        afterNextRender(
          () => {
            this.tryRedrawLinesAfterView(morph, retryDepth + 1, tickId);
          },
          { injector: this.injector }
        );
      });
      return;
    }
    if (isDevMode()) {
      console.warn(
        '[ngx-graph] Link group count did not match edge count after retries; emitting drawComplete anyway.',
        { expected, got }
      );
    }
    this.finalizeTickOutput(tickId);
  }

  private finalizeTickOutput(tickId: number): void {
    if (this._graphDestroyed || tickId !== this.drawCompleteTickId) {
      return;
    }
    this.stateChange.emit({ state: NgxGraphStates.Output });
  }

  private cancelEdgePathAnimation(edgeId: string): void {
    const rafId = this.edgePathRafIds.get(edgeId);
    if (rafId != null) {
      cancelAnimationFrame(rafId);
      this.edgePathRafIds.delete(edgeId);
    }
  }

  private cancelAllEdgePathAnimations(): void {
    for (const rafId of this.edgePathRafIds.values()) {
      cancelAnimationFrame(rafId);
    }
    this.edgePathRafIds.clear();
  }

  private cancelLayoutUnifiedAnimation(): void {
    if (this.layoutUnifiedRafId != null) {
      cancelAnimationFrame(this.layoutUnifiedRafId);
      this.layoutUnifiedRafId = null;
    }
  }

  /**
   * One rAF driver: same eased t for node transforms (lerp) and edge path d (interpolatePinnedEdgeRoute).
   * In `additive` mode, only edges morph; node transforms stay at layout output from `tick()` (no positional tween).
   * Full scope lerps translates for nodes, clusters, and compounds; clusters/compounds also lerp `dimension` when both
   * prior and target dimension maps are populated (see {@link layoutAnimationClusterCompoundDimensions}).
   */
  private runUnifiedLayoutAnimation(
    edgeMorphs: Array<{
      pathSelection: any;
      textPathEl: any;
      prevRaw: Array<{ x: number; y: number }>;
      nextRaw: Array<{ x: number; y: number }>;
      resampledPrev: Array<{ x: number; y: number }>;
      resampledNext: Array<{ x: number; y: number }>;
    }>,
    durationMs: number
  ): void {
    const targets = this.layoutAnimationTargets!;
    const prevs = this.previousLayoutTransforms!;
    const dimPrevs = this.previousLayoutClusterCompoundDimensions;
    const dimTgts = this.layoutAnimationClusterCompoundDimensions;
    const easeFn = resolveGraphTransitionEasing(this.effectiveLayoutTransition.easing);
    const skipNodePositionTween = this.effectiveLayoutTransition.scope === 'additive';

    this.zone.runOutsideAngular(() => {
      for (const m of edgeMorphs) {
        const pts0 = this.interpolatePinnedEdgeRoute(m.prevRaw, m.nextRaw, m.resampledPrev, m.resampledNext, 0);
        m.pathSelection.attr('d', this.generateLine(pts0));
        if (m.textPathEl && !m.textPathEl.empty()) {
          const { textPath } = this.lineAndTextPathFromPoints(pts0);
          m.textPathEl.attr('d', textPath);
        }
      }
      this.applyLayoutOuterEffect(0);

      const startMs = performance.now();

      const applyNodeTransforms = (tscalar: number) => {
        if (skipNodePositionTween) {
          return;
        }
        const apply = (items: Node[] | undefined) => {
          if (!items) {
            return;
          }
          for (const n of items) {
            const tgt = targets.get(n.id);
            const prv = prevs.get(n.id);
            if (tgt && prv) {
              const tx = prv.tx + tscalar * (tgt.tx - prv.tx);
              const ty = prv.ty + tscalar * (tgt.ty - prv.ty);
              n.transform = `translate(${tx},${ty})`;
            }
          }
        };
        apply(this.graph.nodes);
        apply(this.graph.clusters);
        apply(this.graph.compoundNodes);

        if (dimPrevs?.size && dimTgts?.size) {
          const lerpDims = (items: Node[] | undefined) => {
            if (!items) {
              return;
            }
            for (const n of items) {
              const pv = dimPrevs.get(n.id);
              const tg = dimTgts.get(n.id);
              if (pv && tg) {
                n.dimension = {
                  width: pv.width + tscalar * (tg.width - pv.width),
                  height: pv.height + tscalar * (tg.height - pv.height)
                };
              }
            }
          };
          lerpDims(this.graph.clusters);
          lerpDims(this.graph.compoundNodes);
        }
      };

      const step = () => {
        const elapsed = performance.now() - startMs;
        const u = durationMs <= 0 ? 1 : Math.min(1, elapsed / durationMs);
        const tscalar = easeFn(u);

        for (const m of edgeMorphs) {
          const pts = this.interpolatePinnedEdgeRoute(m.prevRaw, m.nextRaw, m.resampledPrev, m.resampledNext, tscalar);
          m.pathSelection.attr('d', this.generateLine(pts));
          if (m.textPathEl && !m.textPathEl.empty()) {
            const { textPath } = this.lineAndTextPathFromPoints(pts);
            m.textPathEl.attr('d', textPath);
          }
        }

        // Apply node transforms in the same synchronous turn as D3 path updates so one paint
        // shows edges and nodes at the same eased t (avoids nodes leading or lagging edge splines).
        applyNodeTransforms(tscalar);
        this.applyLayoutOuterEffect(tscalar);
        this.zone.run(() => {
          this.cd.markForCheck();
        });

        if (u >= 1) {
          this.zone.run(() => {
            if (!skipNodePositionTween) {
              const finalize = (items: Node[] | undefined) => {
                if (!items) {
                  return;
                }
                for (const n of items) {
                  const tgt = targets.get(n.id);
                  if (tgt) {
                    n.transform = `translate(${tgt.tx},${tgt.ty})`;
                  }
                }
              };
              finalize(this.graph.nodes);
              finalize(this.graph.clusters);
              finalize(this.graph.compoundNodes);

              if (dimTgts?.size) {
                const finalizeDims = (items: Node[] | undefined) => {
                  if (!items) {
                    return;
                  }
                  for (const n of items) {
                    const d = dimTgts.get(n.id);
                    if (d) {
                      n.dimension = { width: d.width, height: d.height };
                    }
                  }
                };
                finalizeDims(this.graph.clusters);
                finalizeDims(this.graph.compoundNodes);
              }
            }
            for (const e of this.graph.edges) {
              e.previousPoints = undefined;
            }
            this.layoutAnimationTargets = null;
            this.previousLayoutTransforms = null;
            this.layoutAnimationClusterCompoundDimensions = null;
            this.previousLayoutClusterCompoundDimensions = null;
            this.layoutOuterTransform = null;
            this.repaintLinkPathsDomFromModel();
            this.cd.markForCheck();
            if (!skipNodePositionTween) {
              if (this.hasGraphNodeLikeContent()) {
                this.updateGraphDims();
              }
              this.updateMinimap();
              if (this.autoCenter() && !this.autoZoom()) {
                this.center();
              }
            }
          });
          this.layoutUnifiedRafId = null;
          return;
        }

        this.layoutUnifiedRafId = requestAnimationFrame(step);
      };

      this.layoutUnifiedRafId = requestAnimationFrame(step);
    });
  }

  /**
   * Imperative path morph: D3 transitions do not reliably repaint `d` under Zone; rAF does.
   */
  private runEdgePathMorphAnimation(
    edgeKey: string,
    pathSelection: any,
    textPathEl: any,
    edge: Edge,
    prevRaw: Array<{ x: number; y: number }>,
    nextRaw: Array<{ x: number; y: number }>,
    resampledPrev: Array<{ x: number; y: number }>,
    resampledNext: Array<{ x: number; y: number }>,
    durationMs: number,
    startLine: string,
    startText: string
  ): void {
    this.cancelEdgePathAnimation(edgeKey);

    const easeFn = resolveGraphTransitionEasing(this.effectiveLayoutTransition.easing);

    this.zone.runOutsideAngular(() => {
      pathSelection.attr('d', startLine);
      if (textPathEl && !textPathEl.empty()) {
        textPathEl.attr('d', startText);
      }

      const startMs = performance.now();

      const step = () => {
        const elapsed = performance.now() - startMs;
        const u = durationMs <= 0 ? 1 : Math.min(1, elapsed / durationMs);
        const t = easeFn(u);
        const pts = this.interpolatePinnedEdgeRoute(prevRaw, nextRaw, resampledPrev, resampledNext, t);
        pathSelection.attr('d', this.generateLine(pts));
        if (textPathEl && !textPathEl.empty()) {
          const { textPath } = this.lineAndTextPathFromPoints(pts);
          textPathEl.attr('d', textPath);
        }

        if (u >= 1) {
          this.edgePathRafIds.delete(edgeKey);
          this.zone.run(() => {
            edge.previousPoints = undefined;
          });
          return;
        }

        const rafId = requestAnimationFrame(step);
        this.edgePathRafIds.set(edgeKey, rafId);
      };

      const rafId = requestAnimationFrame(step);
      this.edgePathRafIds.set(edgeKey, rafId);
    });
  }

  /**
   * Redraws the lines when dragged or viewport updated
   *
   * @memberOf GraphComponent
   */
  redrawLines(_animate = this.animate()): void {
    const lt = this.effectiveLayoutTransition;
    const duration = !_animate || !this.layoutMorphActive ? 0 : Math.max(0, lt.durationMs);

    if (!_animate) {
      this.cancelLayoutUnifiedAnimation();
      this.cancelAllEdgePathAnimations();
      this.layoutAnimationTargets = null;
      this.previousLayoutTransforms = null;
      this.layoutAnimationClusterCompoundDimensions = null;
      this.previousLayoutClusterCompoundDimensions = null;
    }

    const unifiedLayout =
      _animate &&
      this.layoutMorphActive &&
      !!this.layoutAnimationTargets?.size &&
      !!this.previousLayoutTransforms?.size;

    if (unifiedLayout) {
      this.cancelLayoutUnifiedAnimation();
      this.cancelAllEdgePathAnimations();

      const mgUnified = this.isLayoutMultigraph();

      const edgeMorphs: Array<{
        pathSelection: any;
        textPathEl: any;
        prevRaw: Array<{ x: number; y: number }>;
        nextRaw: Array<{ x: number; y: number }>;
        resampledPrev: Array<{ x: number; y: number }>;
        resampledNext: Array<{ x: number; y: number }>;
      }> = [];

      this.linkElements()?.forEach(linkEl => {
        const edge = this.graph.edges.find(lin => lin.id === linkEl.nativeElement.id);

        if (!edge) {
          return;
        }

        let pathSelection: any = select(linkEl.nativeElement).select('path.edge, path.line');
        if (pathSelection.empty()) {
          pathSelection = select(linkEl.nativeElement).select('path');
        }

        const textPathEl = edge.id ? this.selectTextPathInHostById(edge.id) : null;

        const prevRaw = edge.previousPoints;
        const nextRaw = edge.points;
        const n = this.effectiveEdgePathSampleCount();
        const hasPrev = !!(prevRaw && prevRaw.length >= 2);
        const prevN = hasPrev ? this.resamplePolyline(prevRaw, n) : [];
        const nextN = nextRaw && nextRaw.length >= 2 ? this.resamplePolyline(nextRaw, n) : [];

        let skipStableEdgeMorph = false;
        if (
          this.effectiveLayoutTransition.scope === 'additive' &&
          this.edgeKeysAtLayoutTickStart.size > 0 &&
          _animate
        ) {
          const ek = this.linkKeyForLookup(edge, mgUnified);
          skipStableEdgeMorph = this.edgeKeysAtLayoutTickStart.has(ek);
        }

        const canMorph =
          !skipStableEdgeMorph &&
          hasPrev &&
          nextRaw &&
          nextRaw.length >= 2 &&
          prevN.length >= 2 &&
          nextN.length >= 2 &&
          prevN.length === nextN.length;

        if (!pathSelection.empty()) {
          if (canMorph) {
            edgeMorphs.push({
              pathSelection,
              textPathEl,
              prevRaw: this.clonePoints(prevRaw as Array<{ x: number; y: number }>),
              nextRaw,
              resampledPrev: prevN,
              resampledNext: nextN
            });
          } else {
            // Keep prior route on the path while node `<g>` transforms still reflect `resetToPrevious`; snapping to
            // `edge.line` here desyncs edges from nodes for the whole tween (Elk orientation full-scope blip).
            pathSelection.attr('d', edge.oldLine ?? edge.line);
          }
        }

        if (textPathEl && !textPathEl.empty() && !canMorph) {
          textPathEl.attr('d', edge.oldTextPath ?? edge.textPath);
        }

        this.updateMidpointOnEdge(edge, edge.points);
      });

      this.runUnifiedLayoutAnimation(edgeMorphs, duration);
      return;
    }

    this.linkElements()?.forEach(linkEl => {
      const edge = this.graph.edges.find(lin => lin.id === linkEl.nativeElement.id);

      if (!edge) {
        return;
      }

      const edgeKey = String(edge.id ?? linkEl.nativeElement.id);

      let pathSelection: any = select(linkEl.nativeElement).select('path.edge, path.line');
      if (pathSelection.empty()) {
        pathSelection = select(linkEl.nativeElement).select('path');
      }

      const textPathEl = edge.id ? this.selectTextPathInHostById(edge.id) : null;

      const prevRaw = edge.previousPoints;
      const nextRaw = edge.points;
      const n = this.effectiveEdgePathSampleCount();
      const hasPrev = !!(prevRaw && prevRaw.length >= 2);
      const prevN = hasPrev ? this.resamplePolyline(prevRaw, n) : [];
      const nextN = nextRaw && nextRaw.length >= 2 ? this.resamplePolyline(nextRaw, n) : [];

      const canMorph =
        _animate &&
        hasPrev &&
        nextRaw &&
        nextRaw.length >= 2 &&
        prevN.length >= 2 &&
        nextN.length >= 2 &&
        prevN.length === nextN.length;

      const resampledPrev = canMorph ? prevN : [];
      const resampledNext = canMorph ? nextN : [];

      if (!pathSelection.empty()) {
        if (canMorph) {
          const startLine = this.generateLine(
            this.interpolatePinnedEdgeRoute(prevRaw!, nextRaw, resampledPrev, resampledNext, 0)
          );
          const startText = edge.oldTextPath ?? edge.textPath ?? '';
          this.runEdgePathMorphAnimation(
            edgeKey,
            pathSelection,
            textPathEl,
            edge,
            prevRaw!,
            nextRaw,
            resampledPrev,
            resampledNext,
            duration,
            startLine,
            startText
          );
        } else {
          pathSelection.attr('d', edge.line);
        }
      }

      if (textPathEl && !textPathEl.empty() && !canMorph) {
        textPathEl.attr('d', edge.textPath);
      }

      this.updateMidpointOnEdge(edge, edge.points);
    });
  }

  private clonePoints(points: Array<{ x: number; y: number }>): Array<{ x: number; y: number }> {
    return points.map(p => ({ x: p.x, y: p.y }));
  }

  /** Resample a polyline to `count` points along cumulative arc length. */
  private resamplePolyline(points: Array<{ x: number; y: number }>, count: number): Array<{ x: number; y: number }> {
    if (!points?.length || count < 2) {
      return points?.length ? this.clonePoints(points) : [];
    }
    if (points.length === 1) {
      return Array.from({ length: count }, () => ({ ...points[0] }));
    }

    const segLens: number[] = [];
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      const d = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
      segLens.push(d);
      total += d;
    }
    if (total === 0) {
      return Array.from({ length: count }, () => ({ ...points[0] }));
    }

    const result: Array<{ x: number; y: number }> = [];
    for (let k = 0; k < count; k++) {
      const targetDist = (k / (count - 1)) * total;
      let acc = 0;
      for (let s = 0; s < segLens.length; s++) {
        const sl = segLens[s];
        if (acc + sl >= targetDist || s === segLens.length - 1) {
          const t = sl === 0 ? 0 : Math.min(1, Math.max(0, (targetDist - acc) / sl));
          const a = points[s];
          const b = points[s + 1];
          result.push({
            x: a.x + t * (b.x - a.x),
            y: a.y + t * (b.y - a.y)
          });
          break;
        }
        acc += sl;
      }
    }
    return result;
  }

  /**
   * Interpolate between two layout snapshots. The first and last points always follow
   * the raw layout endpoints (ports on source/target nodes); interior points blend the
   * arc-length–resampled routes so straight, orthogonal, and curved polylines all morph smoothly.
   */
  private interpolatePinnedEdgeRoute(
    prev: Array<{ x: number; y: number }>,
    next: Array<{ x: number; y: number }>,
    resampledPrev: Array<{ x: number; y: number }>,
    resampledNext: Array<{ x: number; y: number }>,
    s: number
  ): Array<{ x: number; y: number }> {
    const n = resampledPrev.length;
    if (n < 2 || resampledNext.length !== n) {
      return prev?.length ? this.clonePoints(prev) : [];
    }
    const start = {
      x: prev[0].x + s * (next[0].x - prev[0].x),
      y: prev[0].y + s * (next[0].y - prev[0].y)
    };
    const pe = prev[prev.length - 1];
    const ne = next[next.length - 1];
    const end = {
      x: pe.x + s * (ne.x - pe.x),
      y: pe.y + s * (ne.y - pe.y)
    };
    const out: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < n; i++) {
      const a = resampledPrev[i];
      const b = resampledNext[i];
      out.push({
        x: a.x + s * (b.x - a.x),
        y: a.y + s * (b.y - a.y)
      });
    }
    out[0] = start;
    out[n - 1] = end;
    return out;
  }

  private lineAndTextPathFromPoints(points: Array<{ x: number; y: number }>): {
    line: string;
    textPath: string;
  } {
    if (!points?.length) {
      return { line: '', textPath: '' };
    }
    const line = this.generateLine(points);
    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];
    if (lastPoint.x < firstPoint.x) {
      return { line, textPath: this.generateLine([...points].reverse()) };
    }
    return { line, textPath: line };
  }

  /**
   * Layout-space node center from a prior `translate(tx,ty)` (inverse of {@link updateNodeGroupTransform}).
   */
  private layoutCenterFromPreviousTransform(node: Node, prev: { tx: number; ty: number }): { x: number; y: number } {
    const center = this.centerNodesOnPositionChange();
    const dx = center ? (node.dimension?.width ?? 0) / 2 : 0;
    const dy = center ? (node.dimension?.height ?? 0) / 2 : 0;
    return { x: prev.tx + dx, y: prev.ty + dy };
  }

  /** Same curve template as {@link buildFallbackEdgePoints} — smooth polyline between two layout centers. */
  private polylineBetweenLayoutCenters(
    s: { x: number; y: number },
    t: { x: number; y: number }
  ): Array<{ x: number; y: number }> {
    const dx = t.x - s.x;
    const dy = t.y - s.y;
    const dist = Math.hypot(dx, dy) || 1;
    const ox = (dx / dist) * Math.min(dist * 0.35, 120);
    const oy = (dy / dist) * Math.min(dist * 0.35, 120);
    return [s, { x: s.x + ox, y: s.y + oy }, { x: t.x - ox, y: t.y - oy }, t];
  }

  /**
   * Prior-tick polyline for a brand-new edge key so full-scope morph starts from anchors aligned with
   * `previousLayoutTransforms` (and current position for endpoints without a prior transform).
   */
  private syntheticPreviousEdgePointsFromPriorTransforms(edge: Edge): Array<{ x: number; y: number }> | undefined {
    const prevs = this.previousLayoutTransforms;
    if (!prevs?.size) {
      return undefined;
    }
    const srcId = typeof edge.source === 'string' ? edge.source : (edge.source as { id?: string })?.id;
    const tgtId = typeof edge.target === 'string' ? edge.target : (edge.target as { id?: string })?.id;
    const src = this.graph.nodes?.find(n => n.id === srcId);
    const tgt = this.graph.nodes?.find(n => n.id === tgtId);
    const s = this.layoutCenterForSyntheticEdgeEndpoint(src, prevs);
    const t = this.layoutCenterForSyntheticEdgeEndpoint(tgt, prevs);
    if (s === undefined || t === undefined) {
      return undefined;
    }
    return this.polylineBetweenLayoutCenters(s, t);
  }

  private layoutCenterForSyntheticEdgeEndpoint(
    node: Node | undefined,
    prevs: Map<string, { tx: number; ty: number }>
  ): { x: number; y: number } | undefined {
    if (!node) {
      return undefined;
    }
    const p = prevs.get(node.id);
    if (p) {
      return this.layoutCenterFromPreviousTransform(node, p);
    }
    if (node.position) {
      return { x: node.position.x, y: node.position.y };
    }
    return undefined;
  }

  /**
   * When layout does not provide edge routes, build a smooth polyline between node centers (Bezier-friendly).
   */
  private buildFallbackEdgePoints(edge: Edge): Array<{ x: number; y: number }> {
    const srcId = typeof edge.source === 'string' ? edge.source : (edge.source as any)?.id;
    const tgtId = typeof edge.target === 'string' ? edge.target : (edge.target as any)?.id;
    const src = this.graph.nodes.find(n => n.id === srcId);
    const tgt = this.graph.nodes.find(n => n.id === tgtId);
    if (!src?.position || !tgt?.position) {
      return [];
    }
    const s = { x: src.position.x, y: src.position.y };
    const t = { x: tgt.position.x, y: tgt.position.y };
    return this.polylineBetweenLayoutCenters(s, t);
  }

  /**
   * Calculate the text directions / flipping
   *
   * @memberOf GraphComponent
   */
  calcDominantBaseline(link: any, displayPoints?: Array<{ x: number; y: number }>): void {
    const firstPoint = link.points[0];
    const lastPoint = link.points[link.points.length - 1];
    link.oldTextPath = link.textPath;

    if (lastPoint.x < firstPoint.x) {
      link.dominantBaseline = 'text-before-edge';

      const rev =
        displayPoints && displayPoints.length >= 2 ? [...displayPoints].reverse() : [...link.points].reverse();
      link.textPath = this.generateLine(rev);
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
      .curve(this.curve());
    return lineFunction(points);
  }

  /**
   * Resamples the route polyline to {@link edgePathSampleCount} (via {@link effectiveEdgePathSampleCount}) and builds
   * the stroke with {@link generateLine} so drag-time paths match layout ticks and morphs (same d3 `curve` + density).
   */
  private lineAndDisplayFromRoutePoints(points: Array<{ x: number; y: number }>): {
    line: string;
    displayPoints: Array<{ x: number; y: number }>;
  } {
    const n = this.effectiveEdgePathSampleCount();
    const displayPoints = this.resamplePolyline(points, n);
    return { line: this.generateLine(displayPoints), displayPoints };
  }

  /**
   * Zoom was invoked from event
   *
   * @memberOf GraphComponent
   */
  onZoom($event: WheelEvent, direction: string): void {
    if (this.enableTrackpadSupport() && !$event.ctrlKey) {
      this.pan($event.deltaX * -1, $event.deltaY * -1);
      return;
    }

    const zoomFactor = 1 + (direction === 'in' ? this.zoomSpeed() : -this.zoomSpeed());

    // Check that zooming wouldn't put us out of bounds
    const newZoomLevel = this.zoomLevel * zoomFactor;
    if (newZoomLevel <= this.minZoomLevel() || newZoomLevel >= this.maxZoomLevel()) {
      return;
    }

    // Check if zooming is enabled or not
    if (!this.enableZoom()) {
      return;
    }

    this.setViewportMorphSuppress();

    if (this.panOnZoom() === true && $event) {
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
    this.cancelViewportPanAnimation();
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

    const dx = panX / this.zoomLevel;
    const dy = panY / this.zoomLevel;
    this.animateViewportPanDelta(dx, dy);
  }

  /**
   * Zoom by a factor
   *
   */
  zoom(factor: number): void {
    this.cancelViewportPanAnimation();
    this.transformationMatrix = transform(this.transformationMatrix, scale(factor, factor));
    this.zoomChange.emit(this.zoomLevel);
    this.updateTransform();
  }

  /**
   * Zoom to a fixed level. Pass `{ layout: false }` for viewport-only sync (e.g. `[zoomLevel]` binding).
   */
  zoomTo(level: number, options?: { layout?: boolean }): void {
    const relayout = options?.layout ?? true;
    this.cancelViewportPanAnimation();
    this.transformationMatrix.a = isNaN(level) ? this.transformationMatrix.a : Number(level);
    this.transformationMatrix.d = isNaN(level) ? this.transformationMatrix.d : Number(level);
    this.zoomChange.emit(this.zoomLevel);
    if (relayout) {
      if (this.enablePreUpdateTransform()) {
        this.updateTransform();
      }
      this.update({ forceRelayout: true });
    } else {
      this.setViewportMorphSuppress();
      this.updateTransform();
    }
  }

  /**
   * Drag was invoked from an event
   *
   * @memberOf GraphComponent
   */
  onDrag(event: MouseEvent): void {
    if (!this.enableDrag()) {
      return;
    }
    const node = this.draggingNode;
    const layout = this.layout();
    if (layout && typeof layout !== 'string' && layout.onDrag) {
      layout.onDrag(node, event);
    }

    node.position.x += event.movementX / this.zoomLevel;
    node.position.y += event.movementY / this.zoomLevel;

    // move the node
    const x = node.position.x - (this.centerNodesOnPositionChange() ? node.dimension.width / 2 : 0);
    const y = node.position.y - (this.centerNodesOnPositionChange() ? node.dimension.height / 2 : 0);
    node.transform = `translate(${x}, ${y})`;

    for (const link of this.graph.edges) {
      if (
        link.target === node.id ||
        link.source === node.id ||
        (link.target as any).id === node.id ||
        (link.source as any).id === node.id
      ) {
        if (layout && typeof layout !== 'string') {
          const result = layout.updateEdge(this.graph, link);
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
    let points = edge.points as Array<{ x: number; y: number }>;
    if (!points || points.length < 2) {
      const fb = this.buildFallbackEdgePoints(edge);
      if (fb.length >= 2) {
        points = fb;
      }
    }
    if (!points || points.length < 2) {
      points = [
        { x: 0, y: 0 },
        { x: 0, y: 0 }
      ];
    }
    const { line, displayPoints } = this.lineAndDisplayFromRoutePoints(points);
    edge.oldLine = edge.line;
    edge.line = line;
    this.calcDominantBaseline(edge, displayPoints);
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
    if (this.activeEntries().indexOf(event) > -1) {
      return;
    }
    this.activeEntries.set([event, ...this.activeEntries()]);
    this.activate.emit({ value: event, entries: this.activeEntries() });
  }

  /**
   * Node was defocused
   *
   * @memberOf GraphComponent
   */
  onDeactivate(event): void {
    const idx = this.activeEntries().indexOf(event);

    const next = [...this.activeEntries()];
    next.splice(idx, 1);
    this.activeEntries.set(next);

    this.deactivate.emit({ value: event, entries: this.activeEntries() });
  }

  /**
   * Get the domain series for the nodes
   *
   * @memberOf GraphComponent
   */
  getSeriesDomain(): any[] {
    return (this.nodes() ?? [])
      .map(d => this.groupResultsBy()(d))
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
    this.colors = new ColorHelper(this.scheme(), this.seriesDomain, this.customColors());
  }

  /**
   * On mouse move event, used for panning and dragging.
   *
   * @memberOf GraphComponent
   */
  @HostListener('document:mousemove', ['$event'])
  onMouseMove($event: MouseEvent): void {
    this.isMouseMoveCalled = true;
    if ((this.isPanning || this.isMinimapPanning) && this.enablePan()) {
      this.panWithConstraints(this.panningAxis(), $event);
    } else if (this.isDragging && this.enableDrag()) {
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
    if (!this.enablePan()) {
      return;
    }
    this.cancelViewportPanAnimation();
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
    if (this.isPanning && this.enablePan()) {
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
    const layout = this.layout();
    if (layout && typeof layout !== 'string' && layout.onDragEnd) {
      layout.onDragEnd(this.draggingNode, event);
    }
  }

  /**
   * On node mouse down to kick off dragging
   *
   * @memberOf GraphComponent
   */
  onNodeMouseDown(event: MouseEvent, node: any): void {
    if (!this.enableDrag()) {
      return;
    }
    this.isDragging = true;
    this.draggingNode = node;

    const layout = this.layout();
    if (layout && typeof layout !== 'string' && layout.onDragStart) {
      layout.onDragStart(node, event);
    }
  }

  /**
   * On minimap drag mouse down to kick off minimap panning
   *
   * @memberOf GraphComponent
   */
  onMinimapDragMouseDown(): void {
    if (!this.enablePan()) {
      return;
    }
    this.isMinimapPanning = true;
  }

  /**
   * On minimap pan event. Pans the graph to the clicked position.
   * Uses screen→local conversion so it works for any `miniMapPosition` (the old formula assumed UpperRight).
   *
   * @memberOf GraphComponent
   */
  onMinimapPanTo(event: MouseEvent): void {
    if (!this.enablePan()) {
      return;
    }
    const p = this.minimapClientEventToGraphCoords(event);
    if (!p) {
      return;
    }
    this.panTo(p.gx, p.gy);
    this.isMinimapPanning = true;
  }

  /**
   * Map a click on the minimap background to graph (world) coordinates. `minimapTransform` is applied on the host
   * `<g class="minimap">`; `getScreenCTM()` on the target rect includes that transform so all corners behave the same.
   */
  private minimapClientEventToGraphCoords(event: MouseEvent): { gx: number; gy: number } | null {
    const el = event.currentTarget;
    if (!(el instanceof SVGGraphicsElement)) {
      return null;
    }
    const svg = el.ownerSVGElement;
    if (!svg) {
      return null;
    }
    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const ctm = el.getScreenCTM();
    if (!ctm) {
      return null;
    }
    const local = pt.matrixTransform(ctm.inverse());
    const s = this.minimapScaleCoefficient;
    return {
      gx: this.minimapOffsetX + local.x * s,
      gy: this.minimapOffsetY + local.y * s
    };
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

    if (zoomLevel < this.minZoomLevel()) {
      zoomLevel = this.minZoomLevel();
    }

    if (zoomLevel > this.maxZoomLevel()) {
      zoomLevel = this.maxZoomLevel();
    }

    if (zoomOptions?.force === true || zoomLevel !== this.zoomLevel) {
      this.zoomTo(zoomLevel);

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
    return this.nodes().filter(node => ids.includes(node.id));
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
      if ((this.layout() as Layout)?.settings?.properties?.['elk.direction']) {
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
    const orientation = (this.layout() as Layout).settings?.properties['elk.direction'];
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
    const view = this.view();
    if (view) {
      this.width = view[0];
      this.height = view[1];
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
      ((this.compoundNodes()?.length ? this.hasCompoundNodeDims() : true) ||
        (this.clusters()?.length ? this.hasClusterDims() : true))
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

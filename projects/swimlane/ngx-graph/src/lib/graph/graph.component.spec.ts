import { Component } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Observable, of } from 'rxjs';

import { Graph } from '../models/graph.model';
import { Layout } from '../models/layout.model';
import { Edge } from '../models/edge.model';
import { ClusterNode, CompoundNode, Node } from '../models/node.model';
import { GraphComponent } from './graph.component';

/** Synchronous layout for tests: positions nodes/clusters/compound nodes and assigns edge polylines. */
class TestSyncLayout implements Layout {
  run(graph: Graph): Observable<Graph> {
    const nodes: Node[] = graph.nodes.map((n, i) => ({
      ...n,
      position: { x: 120 + i * 100, y: 140 },
      dimension: { width: n.dimension?.width ?? 48, height: n.dimension?.height ?? 32 }
    }));
    const clusters: ClusterNode[] = (graph.clusters ?? []).map((c, i) => ({
      ...c,
      position: { x: 80, y: 80 },
      dimension: { width: c.dimension?.width ?? 200, height: c.dimension?.height ?? 160 }
    }));
    const compoundNodes: CompoundNode[] = (graph.compoundNodes ?? []).map(c => ({
      ...c,
      position: { x: 400, y: 120 },
      dimension: { width: c.dimension?.width ?? 120, height: c.dimension?.height ?? 80 }
    }));
    const edges: Edge[] = graph.edges.map(e => ({
      ...e,
      points: [
        { x: 50, y: 50 },
        { x: 250, y: 150 }
      ]
    }));
    return of({
      ...graph,
      nodes,
      clusters,
      compoundNodes,
      edges
    });
  }

  updateEdge(graph: Graph, edge: Edge): Graph {
    return graph;
  }
}

/** First run pins compound at the chart origin; second run moves it (simulates post-bootstrap reflow). */
class TestTwoPhaseCompoundLayout implements Layout {
  pass = 0;

  run(graph: Graph): Observable<Graph> {
    this.pass++;
    const atOrigin = this.pass === 1;
    const cx = atOrigin ? 0 : 400;
    const cy = atOrigin ? 0 : 120;
    const nodes: Node[] = graph.nodes.map((n, i) => ({
      ...n,
      position: { x: 120 + i * 100, y: 140 },
      dimension: { width: n.dimension?.width ?? 48, height: n.dimension?.height ?? 32 }
    }));
    const compoundNodes: CompoundNode[] = (graph.compoundNodes ?? []).map(c => ({
      ...c,
      position: { x: cx, y: cy },
      dimension: { width: c.dimension?.width ?? 120, height: c.dimension?.height ?? 80 }
    }));
    const edges: Edge[] = graph.edges.map(e => ({
      ...e,
      points: [
        { x: 50, y: 50 },
        { x: 250, y: 150 }
      ]
    }));
    return of({
      ...graph,
      nodes,
      compoundNodes,
      edges
    });
  }

  updateEdge(graph: Graph, _edge: Edge): Graph {
    return graph;
  }
}

class TestLayoutWithCustomParseTranslate extends TestSyncLayout {
  parseTranslate(_transformStr: string | undefined): { tx: number; ty: number } {
    return { tx: 42, ty: -3 };
  }
}

@Component({
  selector: 'test-graph-draw-complete-host',
  template: `
    <ngx-graph
      [nodes]="nodes"
      [clusters]="clusters"
      [compoundNodes]="compoundNodes"
      [links]="links"
      [layout]="syncLayout"
      [width]="800"
      [height]="600"
      [animate]="false"
      (drawComplete)="onDrawComplete()"
    ></ngx-graph>
  `,
  imports: [GraphComponent]
})
class TestGraphDrawCompleteHostComponent {
  syncLayout = new TestSyncLayout();

  nodes: Node[] = [
    { id: 'n1', label: 'A' },
    { id: 'n2', label: 'B' }
  ];
  clusters: ClusterNode[] = [{ id: 'cl1', label: 'Cluster' }];
  compoundNodes: CompoundNode[] = [{ id: 'cp1', label: 'Compound', childNodeIds: ['n1'] }];
  links: Edge[] = [{ id: 'e1', source: 'n1', target: 'n2' }];

  drawCompleteCount = 0;

  onDrawComplete(): void {
    this.drawCompleteCount++;
  }
}

describe('GraphComponent drawComplete', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestGraphDrawCompleteHostComponent]
    }).compileComponents();
  });

  it('emits drawComplete after link paths are bound and dimensions reflect DOM for nodes, clusters, and compound nodes', fakeAsync(() => {
    const fixture = TestBed.createComponent(TestGraphDrawCompleteHostComponent);
    const host = fixture.componentInstance;
    fixture.detectChanges();
    flush();
    tick(16);
    fixture.detectChanges();
    flush();

    expect(host.drawCompleteCount).toBe(1);

    const graphEl = fixture.debugElement.query(By.directive(GraphComponent));
    const graph = graphEl.componentInstance as GraphComponent;

    expect(graph.graph.edges.length).toBe(1);
    expect(graph.linkElements()?.length ?? 0).toBe(graph.graph.edges.length);

    for (const linkRef of graph.linkElements() ?? []) {
      const g = linkRef.nativeElement as SVGGElement;
      const path = g.querySelector('path');
      expect(path?.getAttribute('d')?.length).toBeGreaterThan(0);
    }

    const assertBBoxMatchesModel = (nodeId: string, model: Node) => {
      const g = fixture.nativeElement.querySelector(`#${nodeId}`) as SVGGElement | null;
      expect(g).withContext(nodeId).toBeTruthy();
      const bb = g!.getBBox();
      expect(model.dimension.width).toBeCloseTo(bb.width, 0);
      expect(model.dimension.height).toBeCloseTo(bb.height, 0);
    };

    graph.graph.nodes.forEach(n => assertBBoxMatchesModel(n.id, n));
    graph.graph.clusters?.forEach(c => assertBBoxMatchesModel(c.id, c));
    graph.graph.compoundNodes?.forEach(c => assertBBoxMatchesModel(c.id, c));
  }));
});

@Component({
  selector: 'test-graph-layout-js-host',
  template: `
    <ngx-graph
      [view]="[400, 300]"
      [nodes]="nodes"
      [links]="links"
      [layout]="syncLayout"
      [animate]="false"
      [useLayoutTransitions]="useLayoutTransitions"
      [edgePathSampleCount]="edgePathSampleCount"
    ></ngx-graph>
  `,
  imports: [GraphComponent]
})
class TestGraphLayoutJsHostComponent {
  syncLayout = new TestSyncLayout();
  nodes: Node[] = [
    { id: 'n1', label: 'A' },
    { id: 'n2', label: 'B' }
  ];
  links: Edge[] = [{ id: 'e1', source: 'n1', target: 'n2' }];
  useLayoutTransitions = true;
  edgePathSampleCount: number | undefined = undefined;
}

@Component({
  selector: 'snap-morph-compound-host',
  template: `
    <ngx-graph
      [view]="[400, 300]"
      [nodes]="nodes"
      [links]="links"
      [compoundNodes]="compoundNodes"
      [layout]="syncLayout"
      [animate]="true"
      [transitionAfterChanges]="transitionAfterChanges"
    ></ngx-graph>
  `,
  imports: [GraphComponent]
})
class SnapMorphCompoundHostComponent {
  syncLayout = new TestSyncLayout();
  nodes: Node[] = [
    { id: 'n1', label: 'A' },
    { id: 'n2', label: 'B' }
  ];
  links: Edge[] = [{ id: 'e1', source: 'n1', target: 'n2' }];
  compoundNodes: CompoundNode[] = [];
  transitionAfterChanges = {
    mode: 'tween' as const,
    scope: 'full' as const,
    durationMs: 120,
    morphCapture: {
      snapAddedNodeIds: true,
      syncTargetsFromPositionAfterTick: true
    }
  };
}

@Component({
  selector: 'snap-morph-two-phase-compound-host',
  template: `
    <ngx-graph
      [view]="[400, 300]"
      [nodes]="nodes"
      [links]="links"
      [compoundNodes]="compoundNodes"
      [layout]="twoPhaseLayout"
      [centerNodesOnPositionChange]="false"
      [animate]="true"
      [transitionAfterChanges]="transitionAfterChanges"
    ></ngx-graph>
  `,
  imports: [GraphComponent]
})
class SnapMorphTwoPhaseCompoundHostComponent {
  twoPhaseLayout = new TestTwoPhaseCompoundLayout();
  nodes: Node[] = [
    { id: 'n1', label: 'A' },
    { id: 'n2', label: 'B' }
  ];
  links: Edge[] = [{ id: 'e1', source: 'n1', target: 'n2' }];
  compoundNodes: CompoundNode[] = [
    { id: 'cp1', label: 'C', childNodeIds: ['n1'], dimension: { width: 120, height: 80 } }
  ];
  transitionAfterChanges = {
    mode: 'tween' as const,
    scope: 'full' as const,
    durationMs: 120,
    morphCapture: {
      snapAddedNodeIds: true,
      syncTargetsFromPositionAfterTick: true
    }
  };
}

@Component({
  selector: 'test-graph-parse-translate-host',
  template: `
    <ngx-graph [view]="[400, 300]" [nodes]="nodes" [links]="links" [layout]="syncLayout" [animate]="false"></ngx-graph>
  `,
  imports: [GraphComponent]
})
class TestGraphParseTranslateHostComponent {
  syncLayout = new TestLayoutWithCustomParseTranslate();
  nodes: Node[] = [
    { id: 'n1', label: 'A' },
    { id: 'n2', label: 'B' }
  ];
  links: Edge[] = [{ id: 'e1', source: 'n1', target: 'n2' }];
}

describe('GraphComponent layout-js-driven host class', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestGraphLayoutJsHostComponent]
    }).compileComponents();
  });

  function outerHasLayoutJsDriven(fixture: ComponentFixture<TestGraphLayoutJsHostComponent>): boolean {
    const outer = fixture.nativeElement.querySelector('.ngx-graph-outer') as HTMLElement | null;
    expect(outer).toBeTruthy();
    return outer!.classList.contains('layout-js-driven');
  }

  it('applies layout-js-driven when useLayoutTransitions is true (default)', fakeAsync(() => {
    const fixture = TestBed.createComponent(TestGraphLayoutJsHostComponent);
    fixture.detectChanges();
    flush();
    tick(16);
    fixture.detectChanges();
    flush();
    expect(outerHasLayoutJsDriven(fixture)).toBe(true);
  }));

  it('omits layout-js-driven when useLayoutTransitions is false and tween is inactive', fakeAsync(() => {
    const fixture = TestBed.createComponent(TestGraphLayoutJsHostComponent);
    fixture.componentInstance.useLayoutTransitions = false;
    fixture.detectChanges();
    flush();
    tick(16);
    fixture.detectChanges();
    flush();
    expect(outerHasLayoutJsDriven(fixture)).toBe(false);
  }));
});

/** Default {@link GraphComponent} edge path resample count when `edgePathSampleCount` is unset. */
const DEFAULT_EDGE_PATH_SAMPLE_COUNT = 48;

describe('GraphComponent redrawEdge (curve + resampling)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestGraphLayoutJsHostComponent]
    }).compileComponents();
  });

  it('resamples route points to default sample count before building line (same as layout tick)', fakeAsync(() => {
    const fixture = TestBed.createComponent(TestGraphLayoutJsHostComponent);
    fixture.detectChanges();
    flush();
    tick(16);
    fixture.detectChanges();
    flush();

    const graphEl = fixture.debugElement.query(By.directive(GraphComponent));
    const graph = graphEl.componentInstance as GraphComponent;

    const resampleSpy = spyOn(graph as any, 'resamplePolyline').and.callThrough();

    const edge = graph.graph.edges[0];
    edge.points = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 40 },
      { x: 120, y: 40 }
    ];

    graph.redrawEdge(edge);

    expect(resampleSpy).toHaveBeenCalled();
    const [ptsArg, countArg] = resampleSpy.calls.mostRecent().args as [Array<{ x: number; y: number }>, number];
    expect(ptsArg.length).toBe(4);
    expect(countArg).toBe(DEFAULT_EDGE_PATH_SAMPLE_COUNT);
    expect(edge.line?.length).toBeGreaterThan(0);
  }));

  it('sets edge.line to the same stroke as lineAndDisplayFromRoutePoints for those points', fakeAsync(() => {
    const fixture = TestBed.createComponent(TestGraphLayoutJsHostComponent);
    fixture.detectChanges();
    flush();
    tick(16);
    fixture.detectChanges();
    flush();

    const graphEl = fixture.debugElement.query(By.directive(GraphComponent));
    const graph = graphEl.componentInstance as GraphComponent;

    const pts = [
      { x: 10, y: 10 },
      { x: 90, y: 12 },
      { x: 88, y: 100 },
      { x: 200, y: 95 }
    ];
    const edge = graph.graph.edges[0];
    edge.points = pts;

    graph.redrawEdge(edge);
    const { line: expectedLine } = (graph as any).lineAndDisplayFromRoutePoints(pts);
    expect(edge.line).toBe(expectedLine);
  }));

  it('uses edgePathSampleCount when set (clamped)', fakeAsync(() => {
    const fixture = TestBed.createComponent(TestGraphLayoutJsHostComponent);
    fixture.detectChanges();
    flush();
    tick(16);
    fixture.detectChanges();
    flush();

    const graphEl = fixture.debugElement.query(By.directive(GraphComponent));
    const graph = graphEl.componentInstance as GraphComponent;
    const host = fixture.componentInstance as TestGraphLayoutJsHostComponent;
    host.edgePathSampleCount = 24;
    fixture.detectChanges();

    const resampleSpy = spyOn(graph as any, 'resamplePolyline').and.callThrough();
    const edge = graph.graph.edges[0];
    edge.points = [
      { x: 0, y: 0 },
      { x: 50, y: 0 }
    ];
    graph.redrawEdge(edge);
    expect((resampleSpy.calls.mostRecent().args[1] as number) === 24).toBe(true);

    host.edgePathSampleCount = 1;
    fixture.detectChanges();
    graph.redrawEdge(edge);
    expect(resampleSpy.calls.mostRecent().args[1] as number).toBe(2);

    host.edgePathSampleCount = 900;
    fixture.detectChanges();
    graph.redrawEdge(edge);
    expect(resampleSpy.calls.mostRecent().args[1] as number).toBe(512);
  }));
});

@Component({
  selector: 'test-viewport-interactions-host',
  template: `
    <ngx-graph [view]="[400, 300]" [nodes]="nodes" [links]="links" [layout]="syncLayout" [animate]="false"></ngx-graph>
  `,
  imports: [GraphComponent]
})
class TestViewportInteractionsHostComponent {
  syncLayout = new TestSyncLayout();
  nodes: Node[] = [
    { id: 'n1', label: 'A' },
    { id: 'n2', label: 'B' }
  ];
  links: Edge[] = [{ id: 'e1', source: 'n1', target: 'n2' }];
}

describe('GraphComponent viewport interactions', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestViewportInteractionsHostComponent]
    }).compileComponents();
  });

  function bootstrap(fixture: ComponentFixture<TestViewportInteractionsHostComponent>): GraphComponent {
    fixture.detectChanges();
    flush();
    tick(16);
    fixture.detectChanges();
    flush();
    return fixture.debugElement.query(By.directive(GraphComponent)).componentInstance as GraphComponent;
  }

  it('setenablePan clears active pan; panning surface mousedown is no-op when panning is off', fakeAsync(() => {
    const fixture = TestBed.createComponent(TestViewportInteractionsHostComponent);
    const graph = bootstrap(fixture);
    expect(graph.enablePan()).toBe(true);

    graph.onPanningSurfaceMouseDown();
    expect(graph.isPanning).toBe(true);

    graph.setenablePan(false);
    expect(graph.enablePan()).toBe(false);
    expect(graph.isPanning).toBe(false);

    graph.onPanningSurfaceMouseDown();
    expect(graph.isPanning).toBe(false);

    graph.setenablePan(true);
    graph.onPanningSurfaceMouseDown();
    expect(graph.isPanning).toBe(true);
  }));

  it('setViewportInteractions updates pan and zoom keys that are passed', fakeAsync(() => {
    const fixture = TestBed.createComponent(TestViewportInteractionsHostComponent);
    const graph = bootstrap(fixture);
    graph.setViewportInteractions({ pan: false, zoom: false, drag: false });
    expect(graph.enablePan()).toBe(false);
    expect(graph.enableZoom()).toBe(false);
    expect(graph.enableDrag()).toBe(false);

    graph.setViewportInteractions({ pan: true });
    expect(graph.enablePan()).toBe(true);
    expect(graph.enableZoom()).toBe(false);
    expect(graph.enableDrag()).toBe(false);
  }));

  it('setenableDrag ends active drag; onNodeMouseDown is no-op when dragging is off', fakeAsync(() => {
    const fixture = TestBed.createComponent(TestViewportInteractionsHostComponent);
    const graph = bootstrap(fixture);
    const node = graph.graph.nodes[0];
    graph.onNodeMouseDown(new MouseEvent('mousedown'), node);
    expect(graph.isDragging).toBe(true);

    graph.enableDrag.set(false);
    expect(graph.enableDrag()).toBe(false);
    expect(graph.isDragging).toBe(false);

    graph.onNodeMouseDown(new MouseEvent('mousedown'), node);
    expect(graph.isDragging).toBe(false);

    graph.enableDrag.set(true);
    graph.onNodeMouseDown(new MouseEvent('mousedown'), node);
    expect(graph.isDragging).toBe(true);
  }));

  it('onZoom does not change zoom when setZoomEnabled(false)', fakeAsync(() => {
    const fixture = TestBed.createComponent(TestViewportInteractionsHostComponent);
    const graph = bootstrap(fixture);
    graph.enableZoom.set(false);
    const before = graph.zoomLevel;
    const wheel = new WheelEvent('wheel', { clientX: 200, clientY: 150, deltaY: -100 });
    graph.onZoom(wheel, 'in');
    expect(graph.zoomLevel).toBe(before);
  }));
});

describe('GraphComponent resolveTranslateFromTransform', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestGraphParseTranslateHostComponent]
    }).compileComponents();
  });

  it('delegates to Layout.parseTranslate when the layout instance provides it', fakeAsync(() => {
    const fixture = TestBed.createComponent(TestGraphParseTranslateHostComponent);
    fixture.detectChanges();
    flush();
    tick(16);
    fixture.detectChanges();
    flush();

    const graph = fixture.debugElement.query(By.directive(GraphComponent)).componentInstance as GraphComponent;
    expect((graph as any).resolveTranslateFromTransform('translate(1,2)')).toEqual({ tx: 42, ty: -3 });
    expect((graph as any).parseTranslateDefault('translate(1,2)')).toEqual({ tx: 1, ty: 2 });
  }));
});

describe('GraphComponent layout anchor helpers (full-scope edge morph)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestGraphLayoutJsHostComponent]
    }).compileComponents();
  });

  it('layoutCenterFromPreviousTransform recovers layout center from translate (centered nodes)', fakeAsync(() => {
    const fixture = TestBed.createComponent(TestGraphLayoutJsHostComponent);
    fixture.detectChanges();
    flush();
    tick(16);
    fixture.detectChanges();
    flush();

    const graph = fixture.debugElement.query(By.directive(GraphComponent)).componentInstance as GraphComponent;
    const n = graph.graph.nodes[0];
    n.dimension = { width: 48, height: 32 };
    n.position = { x: 200, y: 100 };
    (graph as any).updateNodeGroupTransform(n);
    const prev = (graph as any).parseTranslateDefault(n.transform);
    const center = (graph as any).layoutCenterFromPreviousTransform(n, prev);
    expect(center.x).toBe(200);
    expect(center.y).toBe(100);
  }));

  it('polylineBetweenLayoutCenters returns four points like buildFallbackEdgePoints', fakeAsync(() => {
    const fixture = TestBed.createComponent(TestGraphLayoutJsHostComponent);
    fixture.detectChanges();
    flush();
    tick(16);
    fixture.detectChanges();
    flush();

    const graph = fixture.debugElement.query(By.directive(GraphComponent)).componentInstance as GraphComponent;
    const s = { x: 0, y: 0 };
    const t = { x: 100, y: 0 };
    const poly = (graph as any).polylineBetweenLayoutCenters(s, t);
    expect(poly.length).toBe(4);
    expect(poly[0]).toEqual(s);
    expect(poly[3]).toEqual(t);
  }));
});

describe('GraphComponent snapAddedNodeIds before resetToPrevious', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SnapMorphCompoundHostComponent, SnapMorphTwoPhaseCompoundHostComponent]
    }).compileComponents();
  });

  it('snaps new compound previous translate to target before reset so transform is not translate(0,0)', fakeAsync(() => {
    const fixture = TestBed.createComponent(SnapMorphCompoundHostComponent);
    fixture.detectChanges();
    flush();
    tick(16);
    fixture.detectChanges();
    flush();

    const graph = fixture.debugElement.query(By.directive(GraphComponent)).componentInstance as GraphComponent;
    expect(graph.layoutMorphActive).toBe(true);

    const cp: CompoundNode = {
      id: 'cpNew',
      label: 'New',
      childNodeIds: ['n1'],
      dimension: { width: 120, height: 80 },
      position: { x: 400, y: 120 }
    };
    graph.graph.compoundNodes = [cp];
    graph.graph.nodes.forEach((n, i) => {
      n.position = { x: 120 + i * 100, y: 140 };
      n.dimension = { width: 48, height: 32 };
    });

    const n1 = graph.graph.nodes[0];
    const prevsMap = new Map<string, { tx: number; ty: number }>();
    prevsMap.set('n1', (graph as any).parseTranslateDefault(n1.transform));
    prevsMap.set('cpNew', { tx: 0, ty: 0 });
    (graph as any).previousLayoutTransforms = prevsMap;
    (graph as any).priorTickGraphNodeIds = new Set(graph.graph.nodes.map((n: Node) => n.id));
    const priorKinds = new Map<string, 'node' | 'cluster' | 'compound'>();
    graph.graph.nodes.forEach((n: Node) => priorKinds.set(n.id, 'node'));
    (graph as any).priorTickGraphKindById = priorKinds;
    expect((graph as any).priorTickGraphNodeIds.has('cpNew')).toBe(false);

    (graph as any)._oldLinks = graph.graph.edges.map((e: Edge) => ({ ...e, points: [...(e.points ?? [])] }));

    (graph as any).tick();

    const cpAfter = graph.graph.compoundNodes.find(c => c.id === 'cpNew')!;
    const t = (graph as any).parseTranslateDefault(cpAfter.transform);
    expect(t.tx).toBeCloseTo(340, 5);
    expect(t.ty).toBeCloseTo(80, 5);
    expect(t.tx === 0 && t.ty === 0).toBe(false);
  }));

  it('seeds compound dimension from previous map for morph while capturing layout targets', fakeAsync(() => {
    const fixture = TestBed.createComponent(SnapMorphCompoundHostComponent);
    fixture.detectChanges();
    flush();
    tick(16);
    fixture.detectChanges();
    flush();

    const graph = fixture.debugElement.query(By.directive(GraphComponent)).componentInstance as GraphComponent;

    const cp: CompoundNode = {
      id: 'cpNew',
      label: 'New',
      childNodeIds: ['n1'],
      dimension: { width: 120, height: 80 },
      position: { x: 400, y: 120 }
    };
    graph.graph.compoundNodes = [cp];
    graph.graph.nodes.forEach((n, i) => {
      n.position = { x: 120 + i * 100, y: 140 };
      n.dimension = { width: 48, height: 32 };
    });

    const n1 = graph.graph.nodes[0];
    const prevsMap = new Map<string, { tx: number; ty: number }>();
    prevsMap.set('n1', (graph as any).parseTranslateDefault(n1.transform));
    prevsMap.set('cpNew', { tx: 0, ty: 0 });
    (graph as any).previousLayoutTransforms = prevsMap;
    (graph as any).previousLayoutClusterCompoundDimensions = new Map([['cpNew', { width: 60, height: 40 }]]);
    (graph as any).priorTickGraphNodeIds = new Set(graph.graph.nodes.map((n: Node) => n.id));
    const priorKinds = new Map<string, 'node' | 'cluster' | 'compound'>();
    graph.graph.nodes.forEach((n: Node) => priorKinds.set(n.id, 'node'));
    (graph as any).priorTickGraphKindById = priorKinds;

    (graph as any)._oldLinks = graph.graph.edges.map((e: Edge) => ({ ...e, points: [...(e.points ?? [])] }));

    (graph as any).tick();

    const cpAfter = graph.graph.compoundNodes.find(c => c.id === 'cpNew')!;
    expect(cpAfter.dimension).toEqual({ width: 60, height: 40 });
    expect((graph as any).layoutAnimationClusterCompoundDimensions?.get('cpNew')).toEqual({
      width: 120,
      height: 80
    });
  }));

  it('snaps stable compound when prior tick already had its id but previous translate is degenerate', fakeAsync(() => {
    const fixture = TestBed.createComponent(SnapMorphCompoundHostComponent);
    fixture.detectChanges();
    flush();
    tick(16);
    fixture.detectChanges();
    flush();

    const graph = fixture.debugElement.query(By.directive(GraphComponent)).componentInstance as GraphComponent;
    const cp: CompoundNode = {
      id: 'cpNew',
      label: 'New',
      childNodeIds: ['n1'],
      dimension: { width: 120, height: 80 },
      position: { x: 400, y: 120 }
    };
    graph.graph.compoundNodes = [cp];
    graph.graph.nodes.forEach((n, i) => {
      n.position = { x: 120 + i * 100, y: 140 };
      n.dimension = { width: 48, height: 32 };
    });

    const n1 = graph.graph.nodes[0];
    const prevsMap = new Map<string, { tx: number; ty: number }>();
    prevsMap.set('n1', (graph as any).parseTranslateDefault(n1.transform));
    prevsMap.set('cpNew', { tx: 0, ty: 0 });
    (graph as any).previousLayoutTransforms = prevsMap;
    const prior = new Set<string>([...graph.graph.nodes.map((n: Node) => n.id), 'cpNew']);
    (graph as any).priorTickGraphNodeIds = prior;
    const priorKinds = new Map<string, 'node' | 'cluster' | 'compound'>();
    graph.graph.nodes.forEach((n: Node) => priorKinds.set(n.id, 'node'));
    priorKinds.set('cpNew', 'compound');
    (graph as any).priorTickGraphKindById = priorKinds;
    expect(prior.has('cpNew')).toBe(true);

    (graph as any)._oldLinks = graph.graph.edges.map((e: Edge) => ({ ...e, points: [...(e.points ?? [])] }));

    (graph as any).tick();

    const cpAfter = graph.graph.compoundNodes.find(c => c.id === 'cpNew')!;
    const parsed = (graph as any).parseTranslateDefault(cpAfter.transform);
    expect(parsed.tx).toBeCloseTo(340, 5);
    expect(parsed.ty).toBeCloseTo(80, 5);
    expect(parsed.tx === 0 && parsed.ty === 0).toBe(false);
  }));

  it('snaps compound when same id was a regular node on the prior tick (role change)', fakeAsync(() => {
    const fixture = TestBed.createComponent(SnapMorphCompoundHostComponent);
    fixture.detectChanges();
    flush();
    tick(16);
    fixture.detectChanges();
    flush();

    const graph = fixture.debugElement.query(By.directive(GraphComponent)).componentInstance as GraphComponent;
    const n2: Node = { id: 'n2', label: 'B', dimension: { width: 48, height: 32 }, position: { x: 220, y: 140 } };
    const cp: CompoundNode = {
      id: 'shared1',
      label: 'WasNodeNowCompound',
      childNodeIds: ['n2'],
      dimension: { width: 120, height: 80 },
      position: { x: 400, y: 120 }
    };
    graph.graph.nodes = [n2];
    graph.graph.compoundNodes = [cp];
    (graph as any).updateNodeGroupTransform(n2);
    graph.graph.edges = [
      {
        id: 'e1',
        source: 'n2',
        target: 'shared1',
        points: [
          { x: 50, y: 50 },
          { x: 250, y: 150 }
        ]
      }
    ];

    const prevsMap = new Map<string, { tx: number; ty: number }>();
    prevsMap.set('shared1', { tx: 90, ty: 124 });
    prevsMap.set('n2', (graph as any).parseTranslateDefault(n2.transform));
    (graph as any).previousLayoutTransforms = prevsMap;
    (graph as any).priorTickGraphNodeIds = new Set(['shared1', 'n2']);
    (graph as any).priorTickGraphKindById = new Map<string, 'node' | 'cluster' | 'compound'>([
      ['shared1', 'node'],
      ['n2', 'node']
    ]);

    (graph as any)._oldLinks = graph.graph.edges.map((e: Edge) => ({ ...e, points: [...(e.points ?? [])] }));

    (graph as any).tick();

    const cpAfter = graph.graph.compoundNodes.find(c => c.id === 'shared1')!;
    const parsed = (graph as any).parseTranslateDefault(cpAfter.transform);
    expect(parsed.tx).toBeCloseTo(340, 5);
    expect(parsed.ty).toBeCloseTo(80, 5);
  }));

  it('two layout passes: after reflow compound is at final translate synchronously (not stuck at origin)', fakeAsync(() => {
    const fixture = TestBed.createComponent(SnapMorphTwoPhaseCompoundHostComponent);
    const host = fixture.componentInstance;
    fixture.detectChanges();
    flush();
    tick(16);
    fixture.detectChanges();
    flush();

    host.links = host.links.map(e => ({ ...e }));
    fixture.detectChanges();
    flush();
    tick(16);
    fixture.detectChanges();
    flush();

    const graph = fixture.debugElement.query(By.directive(GraphComponent)).componentInstance as GraphComponent;
    expect(host.twoPhaseLayout.pass).toBeGreaterThanOrEqual(2);
    const cp = graph.graph.compoundNodes?.find(c => c.id === 'cp1');
    expect(cp).toBeTruthy();
    const parsed = (graph as any).parseTranslateDefault(cp!.transform);
    expect(parsed.tx).toBeCloseTo(400, 5);
    expect(parsed.ty).toBeCloseTo(120, 5);
  }));
});

import { Component } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Observable, of, Subject } from 'rxjs';

import { Graph } from '../models/graph.model';
import { Layout } from '../models/layout.model';
import { Edge } from '../models/edge.model';
import { ClusterNode, CompoundNode, Node } from '../models/node.model';
import { PanningAxis } from '../enums/panning.enum';
import { GraphComponent, NgxGraphStates, NgxGraphZoomOptions } from './graph.component';
import { LayoutService } from './layouts/layout.service';

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
      [view]="[800, 600]"
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
      imports: [TestGraphDrawCompleteHostComponent],
      providers: [LayoutService]
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
    tick(1000);
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
      const slackPx = 14;
      expect(Math.abs(model.dimension.width - bb.width))
        .withContext(`${nodeId} width`)
        .toBeLessThanOrEqual(slackPx);
      expect(Math.abs(model.dimension.height - bb.height))
        .withContext(`${nodeId} height`)
        .toBeLessThanOrEqual(slackPx);
    };

    graph.graph.nodes.forEach(n => assertBBoxMatchesModel(n.id, n));
    graph.graph.clusters?.forEach(c => assertBBoxMatchesModel(c.id, c));
    graph.graph.compoundNodes?.forEach(c => assertBBoxMatchesModel(c.id, c));
  }));

  it('tick assigns oldNodes for newly added ids synchronously before post-tick rAF', fakeAsync(() => {
    const fixture = TestBed.createComponent(TestGraphDrawCompleteHostComponent);
    fixture.detectChanges();
    flush();
    tick(16);
    fixture.detectChanges();
    flush();

    const graph = fixture.debugElement.query(By.directive(GraphComponent)).componentInstance as GraphComponent;
    graph.graph.nodes = [
      ...graph.graph.nodes,
      {
        id: 'n3',
        label: 'C',
        dimension: { width: 48, height: 32 },
        position: { x: 320, y: 140 },
        meta: { forceDimensions: false }
      }
    ];
    (graph as any)._oldLinks = graph.graph.edges.map((e: Edge) => ({ ...e, points: [...(e.points ?? [])] }));
    (graph as any).tick();
    expect(graph.oldNodes.has('n3')).toBe(true);
  }));
});

@Component({
  selector: 'test-graph-empty-view-host',
  template: `
    <ngx-graph [view]="[200, 150]" [nodes]="nodes" [links]="links" [layout]="syncLayout" [animate]="false"></ngx-graph>
  `,
  imports: [GraphComponent]
})
class TestGraphEmptyViewHostComponent {
  syncLayout = new TestSyncLayout();
  nodes: Node[] = [];
  links: Edge[] = [];
}

@Component({
  selector: 'test-graph-mutable-data-host',
  template: `
    <ngx-graph [view]="[400, 300]" [nodes]="nodes" [links]="links" [layout]="syncLayout" [animate]="false"></ngx-graph>
  `,
  imports: [GraphComponent]
})
class TestGraphMutableDataHostComponent {
  syncLayout = new TestSyncLayout();
  nodes: Node[] = [
    { id: 'n1', label: 'A' },
    { id: 'n2', label: 'B' }
  ];
  links: Edge[] = [{ id: 'e1', source: 'n1', target: 'n2' }];
}

@Component({
  selector: 'test-graph-dagre-name-host',
  template: `
    <ngx-graph [view]="[400, 300]" [nodes]="nodes" [links]="links" layout="dagre" [animate]="false"></ngx-graph>
  `,
  imports: [GraphComponent]
})
class TestGraphDagreNameHostComponent {
  nodes: Node[] = [
    { id: 'n1', label: 'A' },
    { id: 'n2', label: 'B' }
  ];
  links: Edge[] = [{ id: 'e1', source: 'n1', target: 'n2' }];
}

@Component({
  selector: 'test-graph-state-change-capture-host',
  template: `
    <ngx-graph
      [view]="[400, 300]"
      [nodes]="nodes"
      [links]="links"
      [layout]="syncLayout"
      [animate]="false"
      (stateChange)="recordState($event)"
    ></ngx-graph>
  `,
  imports: [GraphComponent]
})
class TestGraphStateChangeCaptureHostComponent {
  syncLayout = new TestSyncLayout();
  nodes: Node[] = [
    { id: 'n1', label: 'A' },
    { id: 'n2', label: 'B' }
  ];
  links: Edge[] = [{ id: 'e1', source: 'n1', target: 'n2' }];
  stateEvents: { state: NgxGraphStates }[] = [];

  recordState(event: { state: NgxGraphStates }): void {
    this.stateEvents.push(event);
  }
}

@Component({
  selector: 'test-graph-stream-inputs-host',
  template: `
    <ngx-graph
      [view]="[400, 300]"
      [nodes]="nodes"
      [links]="links"
      [layout]="syncLayout"
      [animate]="false"
      [center$]="centerRequests"
      [zoomToFit$]="zoomToFitRequests"
      [update$]="updateRequests"
      [panToNode$]="panToNodeRequests"
    ></ngx-graph>
  `,
  imports: [GraphComponent]
})
class TestGraphStreamInputsHostComponent {
  syncLayout = new TestSyncLayout();
  nodes: Node[] = [
    { id: 'n1', label: 'A' },
    { id: 'n2', label: 'B' }
  ];
  links: Edge[] = [{ id: 'e1', source: 'n1', target: 'n2' }];
  centerRequests = new Subject<void>();
  zoomToFitRequests = new Subject<NgxGraphZoomOptions | undefined>();
  updateRequests = new Subject<void>();
  panToNodeRequests = new Subject<string>();
}

@Component({
  selector: 'test-graph-panning-axis-host',
  template: `
    <ngx-graph
      [view]="[400, 300]"
      [nodes]="nodes"
      [links]="links"
      [layout]="syncLayout"
      [animate]="false"
      [panningAxis]="panningAxis"
    ></ngx-graph>
  `,
  imports: [GraphComponent]
})
class TestGraphPanningAxisHostComponent {
  syncLayout = new TestSyncLayout();
  panningAxis: PanningAxis = PanningAxis.Vertical;
  nodes: Node[] = [
    { id: 'n1', label: 'A' },
    { id: 'n2', label: 'B' }
  ];
  links: Edge[] = [{ id: 'e1', source: 'n1', target: 'n2' }];
}

describe('GraphComponent graph data and layout behavior', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        TestGraphEmptyViewHostComponent,
        TestGraphMutableDataHostComponent,
        TestGraphDagreNameHostComponent,
        TestGraphStateChangeCaptureHostComponent,
        GraphComponent
      ],
      providers: [LayoutService]
    }).compileComponents();
  });

  it('creates without error when nodes and links are empty arrays', fakeAsync(() => {
    const fixture = TestBed.createComponent(TestGraphEmptyViewHostComponent);
    expect(() => {
      fixture.detectChanges();
      flush();
    }).not.toThrow();
    const graph = fixture.debugElement.query(By.directive(GraphComponent)).componentInstance as GraphComponent;
    expect(graph.graph.nodes.length).toBe(0);
    expect(graph.graph.edges.length).toBe(0);
  }));

  it('updates the graph model when nodes and links inputs are replaced on the graph component', fakeAsync(() => {
    const fixture = TestBed.createComponent(GraphComponent);
    const graph = fixture.componentInstance;
    fixture.componentRef.setInput('layout', new TestSyncLayout());
    fixture.componentRef.setInput('view', [400, 300]);
    fixture.componentRef.setInput('animate', false);
    fixture.componentRef.setInput('nodes', [
      { id: 'n1', label: 'A' },
      { id: 'n2', label: 'B' }
    ]);
    fixture.componentRef.setInput('links', [{ id: 'e1', source: 'n1', target: 'n2' }]);
    fixture.detectChanges();
    flush();
    tick(16);
    fixture.detectChanges();
    flush();

    expect(graph.graph.nodes.length).toBe(2);
    expect(graph.graph.edges.length).toBe(1);

    fixture.componentRef.setInput('nodes', [
      { id: 'a', label: 'Alpha' },
      { id: 'b', label: 'Beta' },
      { id: 'c', label: 'Gamma' }
    ]);
    fixture.componentRef.setInput('links', [
      { id: 'l1', source: 'a', target: 'b' },
      { id: 'l2', source: 'b', target: 'c' }
    ]);
    fixture.detectChanges();
    flush();
    tick(16);
    fixture.detectChanges();
    flush();

    expect(graph.graph.nodes.length).toBe(3);
    expect(graph.graph.edges.length).toBe(2);
    expect(graph.graph.nodes.map(n => n.id).sort()).toEqual(['a', 'b', 'c']);
  }));

  it('keeps link group count aligned with edge count after nodes and links inputs are replaced', fakeAsync(() => {
    const fixture = TestBed.createComponent(GraphComponent);
    const graph = fixture.componentInstance;
    fixture.componentRef.setInput('layout', new TestSyncLayout());
    fixture.componentRef.setInput('view', [400, 300]);
    fixture.componentRef.setInput('animate', false);
    fixture.componentRef.setInput('nodes', [
      { id: 'n1', label: 'A' },
      { id: 'n2', label: 'B' }
    ]);
    fixture.componentRef.setInput('links', [{ id: 'e1', source: 'n1', target: 'n2' }]);
    fixture.detectChanges();
    flush();
    tick(16);
    fixture.detectChanges();
    flush();

    expect(graph.linkElements()?.length ?? 0).toBe(1);

    fixture.componentRef.setInput('nodes', [
      { id: 'n1', label: 'A' },
      { id: 'n2', label: 'B' },
      { id: 'n3', label: 'C' }
    ]);
    fixture.componentRef.setInput('links', [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' }
    ]);
    fixture.detectChanges();
    flush();
    tick(16);
    fixture.detectChanges();
    flush();

    expect(graph.graph.edges.length).toBe(2);
    expect(graph.linkElements()?.length ?? 0).toBe(2);
  }));

  it('accepts the registered layout name dagre and renders a graph', fakeAsync(() => {
    const fixture = TestBed.createComponent(TestGraphDagreNameHostComponent);
    fixture.detectChanges();
    flush();
    tick(16);
    fixture.detectChanges();
    flush();

    const graph = fixture.debugElement.query(By.directive(GraphComponent)).componentInstance as GraphComponent;
    expect(graph.graph).toBeTruthy();
    expect(graph.graph.nodes.length).toBe(2);
    expect(graph.graph.edges.length).toBe(1);
  }));

  it('reports graph dimensions after the view input is applied', fakeAsync(() => {
    const fixture = TestBed.createComponent(TestGraphMutableDataHostComponent);
    fixture.detectChanges();
    flush();
    tick(16);
    fixture.detectChanges();
    flush();

    const graph = fixture.debugElement.query(By.directive(GraphComponent)).componentInstance as GraphComponent;
    expect(graph.hasGraphDims()).toBe(true);
    expect(graph.hasDims()).toBe(true);
  }));

  it('emits stateChange with Subscribe during bootstrap and Output after layout output is finalized', fakeAsync(() => {
    const fixture = TestBed.createComponent(TestGraphStateChangeCaptureHostComponent);
    const host = fixture.componentInstance;
    fixture.detectChanges();
    flush();
    tick(16);
    fixture.detectChanges();
    flush();

    expect(host.stateEvents.some(e => e.state === NgxGraphStates.Subscribe)).toBe(true);
    expect(host.stateEvents.some(e => e.state === NgxGraphStates.Output)).toBe(true);
  }));
});

describe('GraphComponent stream inputs from the host', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestGraphStreamInputsHostComponent],
      providers: [LayoutService]
    }).compileComponents();
  });

  it('runs center when the center stream emits', fakeAsync(() => {
    const fixture = TestBed.createComponent(TestGraphStreamInputsHostComponent);
    const host = fixture.componentInstance;
    fixture.detectChanges();
    flush();
    tick(16);
    fixture.detectChanges();
    flush();

    const graph = fixture.debugElement.query(By.directive(GraphComponent)).componentInstance as GraphComponent;
    const centerSpy = spyOn(graph, 'center').and.callThrough();
    host.centerRequests.next();
    expect(centerSpy).toHaveBeenCalledTimes(1);
  }));

  it('runs zoomToFit when the zoomToFit stream emits', fakeAsync(() => {
    const fixture = TestBed.createComponent(TestGraphStreamInputsHostComponent);
    const host = fixture.componentInstance;
    fixture.detectChanges();
    flush();
    tick(16);
    fixture.detectChanges();
    flush();

    const graph = fixture.debugElement.query(By.directive(GraphComponent)).componentInstance as GraphComponent;
    const zoomToFitSpy = spyOn(graph, 'zoomToFit').and.callThrough();
    host.zoomToFitRequests.next({ force: true });
    expect(zoomToFitSpy).toHaveBeenCalled();
  }));

  it('runs update when the update stream emits', fakeAsync(() => {
    const fixture = TestBed.createComponent(TestGraphStreamInputsHostComponent);
    const host = fixture.componentInstance;
    fixture.detectChanges();
    flush();
    tick(16);
    fixture.detectChanges();
    flush();

    const graph = fixture.debugElement.query(By.directive(GraphComponent)).componentInstance as GraphComponent;
    const updateSpy = spyOn(graph, 'update').and.callThrough();
    host.updateRequests.next();
    expect(updateSpy).toHaveBeenCalled();
  }));

  it('runs panToNodeId when the panToNode stream emits a node id', fakeAsync(() => {
    const fixture = TestBed.createComponent(TestGraphStreamInputsHostComponent);
    const host = fixture.componentInstance;
    fixture.detectChanges();
    flush();
    tick(16);
    fixture.detectChanges();
    flush();

    const graph = fixture.debugElement.query(By.directive(GraphComponent)).componentInstance as GraphComponent;
    const panSpy = spyOn(graph, 'panToNodeId').and.callThrough();
    host.panToNodeRequests.next('n1');
    expect(panSpy).toHaveBeenCalledWith('n1');
  }));

  it('does not throw when the fixture is destroyed and stream subjects are completed', fakeAsync(() => {
    const fixture = TestBed.createComponent(TestGraphStreamInputsHostComponent);
    fixture.detectChanges();
    flush();
    tick(16);
    fixture.detectChanges();
    flush();

    const host = fixture.componentInstance;
    fixture.destroy();
    expect(() => {
      host.centerRequests.complete();
      host.zoomToFitRequests.complete();
      host.updateRequests.complete();
      host.panToNodeRequests.complete();
    }).not.toThrow();
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
      imports: [TestGraphLayoutJsHostComponent],
      providers: [LayoutService]
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
      imports: [TestGraphLayoutJsHostComponent],
      providers: [LayoutService]
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

  it('uses edgePathSampleCount when set before first change detection', fakeAsync(() => {
    const fixture = TestBed.createComponent(TestGraphLayoutJsHostComponent);
    const host = fixture.componentInstance as TestGraphLayoutJsHostComponent;
    host.edgePathSampleCount = 24;
    fixture.detectChanges();
    flush();
    tick(16);
    fixture.detectChanges();
    flush();

    const graph = fixture.debugElement.query(By.directive(GraphComponent)).componentInstance as GraphComponent;
    const resampleSpy = spyOn(graph as any, 'resamplePolyline').and.callThrough();
    const edge = graph.graph.edges[0];
    edge.points = [
      { x: 0, y: 0 },
      { x: 50, y: 0 }
    ];
    graph.redrawEdge(edge);
    expect((resampleSpy.calls.mostRecent().args[1] as number) === 24).toBe(true);
  }));

  it('clamps edgePathSampleCount minimum when set before first change detection', fakeAsync(() => {
    const fixture = TestBed.createComponent(TestGraphLayoutJsHostComponent);
    const host = fixture.componentInstance as TestGraphLayoutJsHostComponent;
    host.edgePathSampleCount = 1;
    fixture.detectChanges();
    flush();
    tick(16);
    fixture.detectChanges();
    flush();

    const graph = fixture.debugElement.query(By.directive(GraphComponent)).componentInstance as GraphComponent;
    const resampleSpy = spyOn(graph as any, 'resamplePolyline').and.callThrough();
    const edge = graph.graph.edges[0];
    edge.points = [
      { x: 0, y: 0 },
      { x: 50, y: 0 }
    ];
    graph.redrawEdge(edge);
    expect(resampleSpy.calls.mostRecent().args[1] as number).toBe(2);
  }));

  it('clamps edgePathSampleCount maximum when set before first change detection', fakeAsync(() => {
    const fixture = TestBed.createComponent(TestGraphLayoutJsHostComponent);
    const host = fixture.componentInstance as TestGraphLayoutJsHostComponent;
    host.edgePathSampleCount = 900;
    fixture.detectChanges();
    flush();
    tick(16);
    fixture.detectChanges();
    flush();

    const graph = fixture.debugElement.query(By.directive(GraphComponent)).componentInstance as GraphComponent;
    const resampleSpy = spyOn(graph as any, 'resamplePolyline').and.callThrough();
    const edge = graph.graph.edges[0];
    edge.points = [
      { x: 0, y: 0 },
      { x: 50, y: 0 }
    ];
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
      imports: [TestViewportInteractionsHostComponent],
      providers: [LayoutService]
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

  it('enablePan.set clears active pan; panning surface mousedown is no-op when panning is off', fakeAsync(() => {
    const fixture = TestBed.createComponent(TestViewportInteractionsHostComponent);
    const graph = bootstrap(fixture);
    expect(graph.enablePan()).toBe(true);

    graph.onPanningSurfaceMouseDown();
    expect(graph.isPanning).toBe(true);

    graph.enablePan.set(false);
    tick();
    expect(graph.enablePan()).toBe(false);
    expect(graph.isPanning).toBe(false);

    graph.onPanningSurfaceMouseDown();
    expect(graph.isPanning).toBe(false);

    graph.enablePan.set(true);
    tick();
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
    tick();
    expect(graph.enableDrag()).toBe(false);
    expect(graph.isDragging).toBe(false);

    graph.onNodeMouseDown(new MouseEvent('mousedown'), node);
    expect(graph.isDragging).toBe(false);

    graph.enableDrag.set(true);
    tick();
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

  it('emits zoomChange and increases zoom level when wheel zoom is enabled', fakeAsync(() => {
    const fixture = TestBed.createComponent(TestViewportInteractionsHostComponent);
    const graph = bootstrap(fixture);
    graph.enableZoom.set(true);
    tick();
    const zoomSpy = jasmine.createSpy('zoomChangeSpy');
    graph.zoomChange.subscribe(zoomSpy);
    const beforeLevel = graph.zoomLevel;
    const wheel = new WheelEvent('wheel', { clientX: 200, clientY: 150, deltaY: -100, bubbles: true });
    graph.onZoom(wheel, 'in');
    expect(graph.zoomLevel).toBeGreaterThan(beforeLevel);
    expect(zoomSpy).toHaveBeenCalled();
  }));

  it('changes pan offsets after center is called with animation off', fakeAsync(() => {
    const fixture = TestBed.createComponent(TestViewportInteractionsHostComponent);
    const graph = bootstrap(fixture);
    const panXBefore = graph.panOffsetX;
    const panYBefore = graph.panOffsetY;
    graph.center();
    tick();
    expect(graph.panOffsetX !== panXBefore || graph.panOffsetY !== panYBefore).toBe(true);
  }));

  it('calls zoomTo when zoomToFit is called with force', fakeAsync(() => {
    const fixture = TestBed.createComponent(TestViewportInteractionsHostComponent);
    const graph = bootstrap(fixture);
    const zoomToSpy = spyOn(graph as any, 'zoomTo').and.callThrough();
    graph.zoomToFit({ force: true });
    tick();
    expect(zoomToSpy).toHaveBeenCalled();
  }));

  it('does not change zoom level when wheel zoom is turned off after tick', fakeAsync(() => {
    const fixture = TestBed.createComponent(TestViewportInteractionsHostComponent);
    const graph = bootstrap(fixture);
    graph.enableZoom.set(true);
    tick();
    graph.enableZoom.set(false);
    tick();
    const level = graph.zoomLevel;
    graph.onZoom(new WheelEvent('wheel', { clientX: 200, clientY: 150, deltaY: -100 }), 'in');
    expect(graph.zoomLevel).toBe(level);
  }));

  it('zoomTo without layout does not call update', fakeAsync(() => {
    const fixture = TestBed.createComponent(TestViewportInteractionsHostComponent);
    const graph = bootstrap(fixture);
    const updateSpy = spyOn(graph, 'update').and.callThrough();
    graph.zoomTo(1.5, { layout: false });
    tick();
    expect(graph.zoomLevel).toBeCloseTo(1.5, 5);
    expect(updateSpy).not.toHaveBeenCalled();
  }));

  it('zoomTo without layout arms viewport morph suppress', fakeAsync(() => {
    const fixture = TestBed.createComponent(TestViewportInteractionsHostComponent);
    const graph = bootstrap(fixture);
    graph.zoomTo(1.5, { layout: false });
    expect((graph as any).isViewportMorphSuppressActive()).toBe(true);
  }));

  it('suppressLayoutMorphThisTick skips layoutAnimationTargets', fakeAsync(() => {
    const fixture = TestBed.createComponent(TestViewportInteractionsHostComponent);
    const graph = bootstrap(fixture);
    (graph as any)._oldLinks = graph.graph.edges.map((e: Edge) => ({ ...e, points: [...(e.points ?? [])] }));
    (graph as any).previousLayoutTransforms = new Map([['n1', { tx: 10, ty: 20 }]]);
    (graph as any).suppressLayoutMorphThisTick = true;
    (graph as any).tick();
    expect((graph as any).layoutAnimationTargets).toBeNull();
    expect((graph as any).previousLayoutTransforms).toBeNull();
  }));

  it('arms suppressLayoutMorphThisTick when input topology unchanged despite ELK internal split', fakeAsync(() => {
    const fixture = TestBed.createComponent(TestViewportInteractionsHostComponent);
    const graph = bootstrap(fixture);
    (graph as any).lastInputTopologySignature = (graph as any).buildInputTopology();
    graph.graph = {
      nodes: [{ id: 'n1', label: 'A', position: { x: 0, y: 0 }, dimension: { width: 30, height: 30 } }],
      clusters: [],
      compoundNodes: [{ id: 'n2', label: 'B', position: { x: 100, y: 0 }, dimension: { width: 30, height: 30 } }],
      edges: graph.graph.edges
    };
    (graph as any).setViewportMorphSuppress();
    let suppressWhenArmed = false;
    spyOn(graph as any, 'draw').and.callFake(function (this: GraphComponent) {
      suppressWhenArmed = (this as any).suppressLayoutMorphThisTick;
    });
    (graph as any).createGraph();
    expect(suppressWhenArmed).toBe(true);
  }));

  it('createGraph clears stale suppressLayoutMorphThisTick when suppress is not re-armed', fakeAsync(() => {
    const fixture = TestBed.createComponent(TestViewportInteractionsHostComponent);
    const graph = bootstrap(fixture);
    (graph as any).suppressLayoutMorphThisTick = true;
    spyOn(graph as any, 'shouldSuppressLayoutMorphForViewport').and.returnValue(false);
    spyOn(graph as any, 'draw').and.stub();
    (graph as any).createGraph();
    expect((graph as any).suppressLayoutMorphThisTick).toBe(false);
  }));

  it('update fast path skips createGraph when input topology unchanged and suppress active', fakeAsync(() => {
    const fixture = TestBed.createComponent(TestViewportInteractionsHostComponent);
    const graph = bootstrap(fixture);
    (graph as any).lastInputTopologySignature = (graph as any).buildInputTopology();
    (graph as any).setViewportMorphSuppress();
    const createGraphSpy = spyOn(graph as any, 'createGraph').and.callThrough();
    graph.update();
    tick();
    expect(createGraphSpy).not.toHaveBeenCalled();
  }));

  it('zoomTo with default layout runs full update during suppress window', fakeAsync(() => {
    const fixture = TestBed.createComponent(TestViewportInteractionsHostComponent);
    const graph = bootstrap(fixture);
    (graph as any).lastInputTopologySignature = (graph as any).buildInputTopology();
    (graph as any).setViewportMorphSuppress();
    const createGraphSpy = spyOn(graph as any, 'createGraph').and.callThrough();
    graph.zoomTo(1.5);
    tick();
    expect(createGraphSpy).toHaveBeenCalled();
  }));

  it('tick suppresses morph when viewport suppress active and topology unchanged without createGraph', fakeAsync(() => {
    const fixture = TestBed.createComponent(TestViewportInteractionsHostComponent);
    const graph = bootstrap(fixture);
    (graph as any).lastInputTopologySignature = (graph as any).buildInputTopology();
    (graph as any).previousLayoutTransforms = new Map([
      ['n1', { tx: 10, ty: 20 }],
      ['n2', { tx: 110, ty: 20 }]
    ]);
    (graph as any)._oldLinks = graph.graph.edges.map((e: Edge) => ({ ...e, points: [...(e.points ?? [])] }));
    (graph as any).suppressLayoutMorphThisTick = false;
    (graph as any).setViewportMorphSuppress();
    spyOnProperty(graph, 'layoutMorphActive', 'get').and.returnValue(true);
    const redrawLinesSpy = spyOn(graph, 'redrawLines').and.callThrough();
    (graph as any).tick();
    flush();
    tick(16);
    fixture.detectChanges();
    flush();
    expect((graph as any).layoutAnimationTargets).toBeNull();
    expect((graph as any).previousLayoutTransforms).toBeNull();
    expect(redrawLinesSpy).toHaveBeenCalled();
    expect(redrawLinesSpy.calls.mostRecent().args[0]).toBe(false);
    expect(graph.graph.edges.every((e: Edge) => e.previousPoints == null)).toBe(true);
  }));

  it('update runs full path when suppress active but container size changed', fakeAsync(() => {
    const fixture = TestBed.createComponent(TestViewportInteractionsHostComponent);
    const graph = bootstrap(fixture);
    (graph as any).lastInputTopologySignature = (graph as any).buildInputTopology();
    (graph as any).setViewportMorphSuppress();
    spyOn(graph, 'view').and.returnValue([500, 350]);
    const createGraphSpy = spyOn(graph as any, 'createGraph').and.callThrough();
    graph.update();
    tick();
    expect(createGraphSpy).toHaveBeenCalled();
  }));

  it('buildInputTopology, createGraph, and getSeriesDomain tolerate undefined inputs on load', fakeAsync(() => {
    const fixture = TestBed.createComponent(TestViewportInteractionsHostComponent);
    const graph = bootstrap(fixture);
    spyOn(graph, 'nodes').and.returnValue(undefined as unknown as Node[]);
    spyOn(graph, 'clusters').and.returnValue(undefined as unknown as ClusterNode[]);
    spyOn(graph, 'compoundNodes').and.returnValue(undefined as unknown as CompoundNode[]);
    spyOn(graph, 'links').and.returnValue(undefined as unknown as Edge[]);
    const emptySig = JSON.stringify({ nodeIds: [], clusterIds: [], compoundIds: [], edgeKeys: [] });
    expect((graph as any).buildInputTopology()).toBe(emptySig);
    expect(graph.getSeriesDomain()).toEqual([]);
    spyOn(graph as any, 'draw').and.stub();
    expect(() => (graph as any).createGraph()).not.toThrow();
    expect(graph.graph.nodes).toEqual([]);
    expect(graph.graph.clusters).toEqual([]);
    expect(graph.graph.compoundNodes).toEqual([]);
    expect(graph.graph.edges).toEqual([]);
  }));

  it('ngOnChanges tolerates null nodes/links inputs without calling update', fakeAsync(() => {
    const fixture = TestBed.createComponent(TestViewportInteractionsHostComponent);
    const graph = bootstrap(fixture);
    spyOn(graph, 'nodes').and.returnValue(null as unknown as Node[]);
    spyOn(graph, 'links').and.returnValue(null as unknown as Edge[]);
    spyOn(graph, 'layout').and.returnValue('dagre');
    const updateSpy = spyOn(graph, 'update').and.stub();
    expect(() => graph.ngOnChanges({})).not.toThrow();
    expect(updateSpy).not.toHaveBeenCalled();
  }));
});

describe('GraphComponent panning axis constraints', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestGraphPanningAxisHostComponent],
      providers: [LayoutService]
    }).compileComponents();
  });

  it('applies vertical movement only when panning axis is vertical', fakeAsync(() => {
    const fixture = TestBed.createComponent(TestGraphPanningAxisHostComponent);
    const host = fixture.componentInstance;
    host.panningAxis = PanningAxis.Vertical;
    fixture.detectChanges();
    flush();
    tick(16);
    fixture.detectChanges();
    flush();

    const graph = fixture.debugElement.query(By.directive(GraphComponent)).componentInstance as GraphComponent;
    graph.onPanningSurfaceMouseDown();
    const panXBefore = graph.panOffsetX;
    const panYBefore = graph.panOffsetY;
    document.dispatchEvent(
      new MouseEvent('mousemove', { bubbles: true, movementX: 40, movementY: 25, clientX: 100, clientY: 100 })
    );
    expect(Math.abs(graph.panOffsetY - panYBefore)).toBeGreaterThan(0.001);
    expect(Math.abs(graph.panOffsetX - panXBefore)).toBeLessThan(0.001);
  }));

  it('applies horizontal movement only when panning axis is horizontal', fakeAsync(() => {
    const fixture = TestBed.createComponent(TestGraphPanningAxisHostComponent);
    const host = fixture.componentInstance;
    host.panningAxis = PanningAxis.Horizontal;
    fixture.detectChanges();
    flush();
    tick(16);
    fixture.detectChanges();
    flush();

    const graph = fixture.debugElement.query(By.directive(GraphComponent)).componentInstance as GraphComponent;
    graph.onPanningSurfaceMouseDown();
    const panXBefore = graph.panOffsetX;
    const panYBefore = graph.panOffsetY;
    document.dispatchEvent(
      new MouseEvent('mousemove', { bubbles: true, movementX: 40, movementY: 25, clientX: 100, clientY: 100 })
    );
    expect(Math.abs(graph.panOffsetX - panXBefore)).toBeGreaterThan(0.001);
    expect(Math.abs(graph.panOffsetY - panYBefore)).toBeLessThan(0.001);
  }));
});

describe('GraphComponent node selection and activation outputs', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestViewportInteractionsHostComponent],
      providers: [LayoutService]
    }).compileComponents();
  });

  it('emits select with the clicked node when a node receives a click', fakeAsync(() => {
    const fixture = TestBed.createComponent(TestViewportInteractionsHostComponent);
    fixture.detectChanges();
    flush();
    tick(16);
    fixture.detectChanges();
    flush();

    const graph = fixture.debugElement.query(By.directive(GraphComponent)).componentInstance as GraphComponent;
    const selectSpy = jasmine.createSpy('selectSpy');
    graph.select.subscribe(selectSpy);

    const nodeGroup = fixture.nativeElement.querySelector('#n1') as SVGGElement;
    expect(nodeGroup).toBeTruthy();
    nodeGroup.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(selectSpy).toHaveBeenCalledTimes(1);
    expect(selectSpy.calls.mostRecent().args[0].id).toBe('n1');
  }));

  it('emits activate with value and entries when onActivate is called', fakeAsync(() => {
    const fixture = TestBed.createComponent(TestViewportInteractionsHostComponent);
    fixture.detectChanges();
    flush();
    tick(16);
    fixture.detectChanges();
    flush();

    const graph = fixture.debugElement.query(By.directive(GraphComponent)).componentInstance as GraphComponent;
    const activateSpy = jasmine.createSpy('activateSpy');
    graph.activate.subscribe(activateSpy);

    const node = graph.graph.nodes[0];
    graph.onActivate(node);

    expect(activateSpy).toHaveBeenCalledTimes(1);
    const payload = activateSpy.calls.mostRecent().args[0];
    expect(payload.value).toBe(node);
    expect(Array.isArray(payload.entries)).toBe(true);
    expect(payload.entries.length).toBe(1);
    expect(payload.entries[0]).toBe(node);
  }));

  it('emits deactivate with updated entries when onDeactivate is called', fakeAsync(() => {
    const fixture = TestBed.createComponent(TestViewportInteractionsHostComponent);
    fixture.detectChanges();
    flush();
    tick(16);
    fixture.detectChanges();
    flush();

    const graph = fixture.debugElement.query(By.directive(GraphComponent)).componentInstance as GraphComponent;
    const deactivateSpy = jasmine.createSpy('deactivateSpy');
    graph.deactivate.subscribe(deactivateSpy);

    const node = graph.graph.nodes[0];
    graph.onActivate(node);
    graph.onDeactivate(node);

    expect(deactivateSpy).toHaveBeenCalledTimes(1);
    const payload = deactivateSpy.calls.mostRecent().args[0];
    expect(payload.value).toBe(node);
    expect(payload.entries.length).toBe(0);
  }));
});

describe('GraphComponent resolveTranslateFromTransform', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestGraphParseTranslateHostComponent],
      providers: [LayoutService]
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
      imports: [TestGraphLayoutJsHostComponent],
      providers: [LayoutService]
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
      imports: [SnapMorphCompoundHostComponent, SnapMorphTwoPhaseCompoundHostComponent],
      providers: [LayoutService]
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

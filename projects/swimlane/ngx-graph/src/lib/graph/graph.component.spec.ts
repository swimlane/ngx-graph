import { Component } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Observable, of } from 'rxjs';

import { Graph } from '../models/graph.model';
import { Layout } from '../models/layout.model';
import { Edge } from '../models/edge.model';
import { ClusterNode, CompoundNode, Node } from '../models/node.model';
import { GraphComponent } from './graph.component';
import { GraphModule } from './graph.module';

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
  standalone: false
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
      imports: [GraphModule],
      declarations: [TestGraphDrawCompleteHostComponent]
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
    expect(graph.linkElements?.length ?? 0).toBe(graph.graph.edges.length);

    for (const linkRef of graph.linkElements ?? []) {
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
    ></ngx-graph>
  `,
  standalone: false
})
class TestGraphLayoutJsHostComponent {
  syncLayout = new TestSyncLayout();
  nodes: Node[] = [
    { id: 'n1', label: 'A' },
    { id: 'n2', label: 'B' }
  ];
  links: Edge[] = [{ id: 'e1', source: 'n1', target: 'n2' }];
  useLayoutTransitions = true;
}

@Component({
  selector: 'test-graph-parse-translate-host',
  template: `
    <ngx-graph [view]="[400, 300]" [nodes]="nodes" [links]="links" [layout]="syncLayout" [animate]="false"></ngx-graph>
  `,
  standalone: false
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
      imports: [GraphModule],
      declarations: [TestGraphLayoutJsHostComponent]
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
      imports: [GraphModule],
      declarations: [TestGraphLayoutJsHostComponent]
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

    const graph = fixture.debugElement.query(By.directive(GraphComponent)).componentInstance as GraphComponent;
    graph.edgePathSampleCount = 24;

    const resampleSpy = spyOn(graph as any, 'resamplePolyline').and.callThrough();
    const edge = graph.graph.edges[0];
    edge.points = [
      { x: 0, y: 0 },
      { x: 50, y: 0 }
    ];
    graph.redrawEdge(edge);
    expect((resampleSpy.calls.mostRecent().args[1] as number) === 24).toBe(true);

    graph.edgePathSampleCount = 1;
    graph.redrawEdge(edge);
    expect(resampleSpy.calls.mostRecent().args[1] as number).toBe(2);

    graph.edgePathSampleCount = 900;
    graph.redrawEdge(edge);
    expect(resampleSpy.calls.mostRecent().args[1] as number).toBe(512);
  }));
});

describe('GraphComponent resolveTranslateFromTransform', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GraphModule],
      declarations: [TestGraphParseTranslateHostComponent]
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
      imports: [GraphModule],
      declarations: [TestGraphLayoutJsHostComponent]
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

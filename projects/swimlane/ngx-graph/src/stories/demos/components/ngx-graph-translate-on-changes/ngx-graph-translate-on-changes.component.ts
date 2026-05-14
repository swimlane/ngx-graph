import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { Edge, Node } from '@swimlane/ngx-graph';
import { NgxGraphModule, Orientation } from '@swimlane/ngx-graph';
import type { DagreSettings } from '@swimlane/ngx-graph';

const NODE_DIM = { width: 36, height: 36 };

const MIN_NODES = 4;
const MAX_NODES = 10;

function dagreDemoNode(id: string, label: string): Node {
  return {
    id,
    label,
    dimension: { ...NODE_DIM },
    meta: { forceDimensions: true }
  };
}

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function randomInt(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

/** Fisher–Yates shuffle (copy). */
function shuffle<T>(items: readonly T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const ORIENTATIONS: Orientation[] = [
  Orientation.TOP_TO_BOTTOM,
  Orientation.LEFT_TO_RIGHT,
  Orientation.RIGHT_TO_LEFT,
  Orientation.BOTTOM_TO_TOM
];

const RANKERS: NonNullable<DagreSettings['ranker']>[] = ['network-simplex', 'tight-tree', 'longest-path'];

/** Stable edge id for simple graphs without parallel edges (matches Dagre non-multigraph lookup by source+target). */
function edgeId(source: string, target: string): string {
  return `${source}--${target}`;
}

/**
 * Dagre with **transitionAfterChanges** (`mode: 'tween'`, `scope: 'full'`, 2000 ms): node `translate(...)` and edge
 * paths interpolate between layouts. There is no separate `translateOnChanges` input—use `transitionAfterChanges`.
 */
@Component({
  selector: 'ngx-graph-translate-on-changes-demo',
  templateUrl: './ngx-graph-translate-on-changes.component.html',
  styleUrls: ['./ngx-graph-translate-on-changes.component.scss'],
  imports: [NgxGraphModule, CommonModule]
})
export class NgxGraphTranslateOnChangesDemoComponent {
  nodes: Node[] = [
    dagreDemoNode('1', 'Node A'),
    dagreDemoNode('2', 'Node B'),
    dagreDemoNode('3', 'Node C'),
    dagreDemoNode('4', 'Node D'),
    dagreDemoNode('5', 'Node E'),
    dagreDemoNode('6', 'Node F')
  ];

  links: Edge[] = [
    { id: edgeId('1', '2'), source: '1', target: '2' },
    { id: edgeId('1', '3'), source: '1', target: '3' },
    { id: edgeId('3', '4'), source: '3', target: '4' },
    { id: edgeId('3', '5'), source: '3', target: '5' },
    { id: edgeId('4', '5'), source: '4', target: '5' },
    { id: edgeId('2', '6'), source: '2', target: '6' }
  ];

  /** Next numeric id for newly added nodes (string keys). */
  private nextNodeId = 7;

  /** Hide until first `drawComplete` only; do not toggle off on layout changes (avoids blank flash). */
  chartVisible = false;

  /** Center viewport once; keep `false` after first draw so randomize does not re-center every time. */
  recenterOnLayout = true;

  readonly groupByNodeId = (node: Node) => node.id;

  layoutSettings: DagreSettings & { viewDimensions?: { width: number; height: number } } = {
    orientation: Orientation.TOP_TO_BOTTOM,
    ranker: 'network-simplex',
    rankPadding: 80,
    marginX: 24,
    marginY: 24,
    acyclicer: 'greedy',
    viewDimensions: { width: 1200, height: 800 }
  };

  onGraphDrawComplete(): void {
    this.chartVisible = true;
    this.recenterOnLayout = false;
  }

  /**
   * Random DAG on `nodeIds`: a random Hamiltonian path plus random forward chords in a topological order
   * (shuffle order, only edges from earlier to later index) so Dagre never sees cycles.
   */
  private buildRandomEdges(nodeIds: string[]): Edge[] {
    if (nodeIds.length < 2) {
      return [];
    }
    const ord = shuffle(nodeIds);
    const edges: Edge[] = [];
    const seen = new Set<string>();
    const add = (source: string, target: string) => {
      const k = `${source}\0${target}`;
      if (seen.has(k)) {
        return;
      }
      seen.add(k);
      edges.push({ id: edgeId(source, target), source, target });
    };
    for (let i = 0; i < ord.length - 1; i++) {
      add(ord[i], ord[i + 1]);
    }
    for (let i = 0; i < ord.length; i++) {
      for (let j = i + 2; j < ord.length; j++) {
        if (Math.random() < 0.42) {
          add(ord[i], ord[j]);
        }
      }
    }
    return edges;
  }

  /**
   * Same nodes and edges; only Dagre settings change. Prior `(source, target)` routes exist on the last tick so edge
   * paths participate in the unified tween.
   */
  randomizeLayoutOnly(): void {
    this.nodes = this.nodes.map(n => ({ ...n }));
    this.links = this.links.map(e => ({ ...e }));
    this.shuffleLayoutSettings();
  }

  /**
   * New random DAG (may add/remove nodes between 4 and 10). Most edges are new `(source, target)` pairs vs the prior
   * tick, so ngx-graph has no prior polyline to morph from and paths may snap while nodes still tween.
   */
  randomizeGraphTopology(): void {
    let nodes = [...this.nodes];

    if (nodes.length > MIN_NODES && Math.random() < 0.45) {
      const removeId = pickRandom(nodes).id;
      nodes = nodes.filter(n => n.id !== removeId);
    }

    if (nodes.length < MAX_NODES && Math.random() < 0.45) {
      const id = String(this.nextNodeId++);
      nodes = [...nodes, dagreDemoNode(id, `Node ${id}`)];
    }

    const ids = nodes.map(n => n.id);
    const links = this.buildRandomEdges(ids);

    this.nodes = nodes.map(n => ({ ...n }));
    this.links = links.map(e => ({ ...e }));
    this.shuffleLayoutSettings();
  }

  private shuffleLayoutSettings(): void {
    this.layoutSettings = {
      ...this.layoutSettings,
      orientation: pickRandom(ORIENTATIONS),
      ranker: pickRandom(RANKERS),
      rankPadding: randomInt(40, 140),
      marginX: randomInt(16, 48),
      marginY: randomInt(16, 48),
      acyclicer: 'greedy',
      viewDimensions: { width: 1200, height: 800 }
    };
  }
}

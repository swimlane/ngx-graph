import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { Edge, Node } from '@swimlane/ngx-graph';
import { NgxGraphModule, Orientation } from '@swimlane/ngx-graph';

const NODE_DIM = { width: 36, height: 36 };

function dagreDemoNode(id: string, label: string): Node {
  return {
    id,
    label,
    dimension: { ...NODE_DIM },
    meta: { forceDimensions: true }
  };
}

/**
 * Dagre TB ↔ LR toggle with **transitionAfterChanges** (full-scope tween, 2000 ms) so nodes and edges interpolate when
 * rank direction changes.
 */
@Component({
  selector: 'ngx-graph-dagre-layout-transition-demo',
  templateUrl: './ngx-graph-dagre-layout-transition.component.html',
  styleUrls: ['./ngx-graph-dagre-layout-transition.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [NgxGraphModule, CommonModule]
})
export class NgxGraphDagreLayoutTransitionDemoComponent {
  readonly nodes: Node[] = [
    dagreDemoNode('1', 'Node A'),
    dagreDemoNode('2', 'Node B'),
    dagreDemoNode('3', 'Node C'),
    dagreDemoNode('4', 'Node D'),
    dagreDemoNode('5', 'Node E'),
    dagreDemoNode('6', 'Node F')
  ];

  readonly links: Edge[] = [
    { id: 'a', source: '1', target: '2' },
    { id: 'b', source: '1', target: '3' },
    { id: 'c', source: '3', target: '4' },
    { id: 'd', source: '3', target: '5' },
    { id: 'e', source: '4', target: '5' },
    { id: 'f', source: '2', target: '6' }
  ];

  /** Hide until first `drawComplete` only (initial pan/center). Do not toggle off on layout changes — that would flash blank on every button press. */
  chartVisible = false;

  /** Center viewport once; later toggles would otherwise re-center every tick. */
  recenterOnLayout = true;

  readonly groupByNodeId = (node: Node) => node.id;

  private orientation = Orientation.TOP_TO_BOTTOM;

  /** `viewDimensions` matches the ngx-graph `view` size for Storybook; Dagre ignores extra keys. */
  layoutSettings: { orientation: Orientation; viewDimensions?: { width: number; height: number } } = {
    orientation: this.orientation,
    viewDimensions: { width: 1200, height: 800 }
  };

  onGraphDrawComplete(): void {
    this.chartVisible = true;
    this.recenterOnLayout = false;
  }

  toggleOrientation(): void {
    this.orientation =
      this.orientation === Orientation.TOP_TO_BOTTOM ? Orientation.LEFT_TO_RIGHT : Orientation.TOP_TO_BOTTOM;
    this.layoutSettings = {
      ...this.layoutSettings,
      orientation: this.orientation
    };
  }
}

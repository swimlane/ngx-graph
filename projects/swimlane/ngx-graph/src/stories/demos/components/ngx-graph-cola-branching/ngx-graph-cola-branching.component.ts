import { Component } from '@angular/core';
import type { OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as shape from 'd3-shape';
import type { Edge, Node, Layout } from '@swimlane/ngx-graph';
import { ColaForceDirectedLayout, NgxGraphModule } from '@swimlane/ngx-graph';

/** Cumulative graph snapshots: each step adds nodes and edges in a branching tree. */
const BRANCHING_STEPS: Array<{ nodes: Node[]; links: Edge[] }> = (() => {
  const n = (id: string, label: string): Node => ({ id, label });
  const e = (id: string, source: string, target: string): Edge => ({ id, source, target });
  return [
    {
      nodes: [n('1', 'Root'), n('2', 'A')],
      links: [e('a', '1', '2')]
    },
    {
      nodes: [n('1', 'Root'), n('2', 'A'), n('3', 'B')],
      links: [e('a', '1', '2'), e('b', '1', '3')]
    },
    {
      nodes: [n('1', 'Root'), n('2', 'A'), n('3', 'B'), n('4', 'A1')],
      links: [e('a', '1', '2'), e('b', '1', '3'), e('c', '2', '4')]
    },
    {
      nodes: [n('1', 'Root'), n('2', 'A'), n('3', 'B'), n('4', 'A1'), n('5', 'A2')],
      links: [e('a', '1', '2'), e('b', '1', '3'), e('c', '2', '4'), e('d', '2', '5')]
    },
    {
      nodes: [n('1', 'Root'), n('2', 'A'), n('3', 'B'), n('4', 'A1'), n('5', 'A2'), n('6', 'B1')],
      links: [e('a', '1', '2'), e('b', '1', '3'), e('c', '2', '4'), e('d', '2', '5'), e('f', '3', '6')]
    },
    {
      nodes: [n('1', 'Root'), n('2', 'A'), n('3', 'B'), n('4', 'A1'), n('5', 'A2'), n('6', 'B1'), n('7', 'B2')],
      links: [
        e('a', '1', '2'),
        e('b', '1', '3'),
        e('c', '2', '4'),
        e('d', '2', '5'),
        e('f', '3', '6'),
        e('g', '3', '7')
      ]
    },
    {
      nodes: [
        n('1', 'Root'),
        n('2', 'A'),
        n('3', 'B'),
        n('4', 'A1'),
        n('5', 'A2'),
        n('6', 'B1'),
        n('7', 'B2'),
        n('8', 'Leaf')
      ],
      links: [
        e('a', '1', '2'),
        e('b', '1', '3'),
        e('c', '2', '4'),
        e('d', '2', '5'),
        e('f', '3', '6'),
        e('g', '3', '7'),
        e('h', '6', '8')
      ]
    }
  ];
})();

@Component({
  selector: 'ngx-graph-cola-branching-demo',
  templateUrl: './ngx-graph-cola-branching.component.html',
  styleUrls: ['./ngx-graph-cola-branching.component.scss'],
  imports: [NgxGraphModule, CommonModule]
})
export class NgxGraphColaBranchingDemoComponent implements OnDestroy {
  /** Straight segments between node bounds; `curveLinear` matches the two-point polylines from Cola. */
  readonly curve = shape.curveLinear;

  readonly layout: Layout = new ColaForceDirectedLayout();

  layoutSettings = {
    viewDimensions: { width: 720, height: 480 }
  };

  nodes: Node[] = [];
  links: Edge[] = [];

  stepIndex = -1;
  autoTimer: ReturnType<typeof setInterval> | null = null;
  readonly maxStep = BRANCHING_STEPS.length - 1;

  addSegment(): void {
    if (this.stepIndex >= this.maxStep) {
      return;
    }
    this.stepIndex++;
    const snap = BRANCHING_STEPS[this.stepIndex];
    this.nodes = snap.nodes.map(x => ({ ...x }));
    this.links = snap.links.map(x => ({ ...x }));
  }

  reset(): void {
    this.stopAuto();
    this.stepIndex = -1;
    this.nodes = [];
    this.links = [];
  }

  toggleAuto(): void {
    if (this.autoTimer) {
      this.stopAuto();
    } else {
      if (this.stepIndex >= this.maxStep) {
        this.reset();
      }
      this.autoTimer = setInterval(() => {
        if (this.stepIndex >= this.maxStep) {
          this.stopAuto();
          return;
        }
        this.addSegment();
      }, 900);
    }
  }

  stopAuto(): void {
    if (this.autoTimer) {
      clearInterval(this.autoTimer);
      this.autoTimer = null;
    }
  }

  get atEnd(): boolean {
    return this.stepIndex >= this.maxStep;
  }

  get autoLabel(): string {
    return this.autoTimer ? 'Pause auto' : 'Auto-play segments';
  }

  ngOnDestroy(): void {
    this.stopAuto();
  }
}

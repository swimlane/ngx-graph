import { Component } from '@angular/core';
import type { Edge, Node } from '@swimlane/ngx-graph';
import { NgxGraphModule } from '@swimlane/ngx-graph';

@Component({
  selector: 'graph-intro',
  imports: [NgxGraphModule],
  template: `
    <ngx-graph class="chart-container" [view]="view" [showMiniMap]="true" [links]="links" [nodes]="nodes"> </ngx-graph>
  `,
  styleUrls: ['./introduction.css']
})
export class GraphIntroComponent {
  view: Array<number> = [800, 200];
  links: Array<Edge> = [
    {
      id: 'a',
      source: 'first',
      target: 'second',
      label: 'is parent of'
    },
    {
      id: 'b',
      source: 'first',
      target: 'third',
      label: 'custom label'
    }
  ];
  nodes: Array<Node> = [
    {
      id: 'first',
      label: 'A'
    },
    {
      id: 'second',
      label: 'B'
    },
    {
      id: 'third',
      label: 'C'
    }
  ];
}

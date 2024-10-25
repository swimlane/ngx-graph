import { Component } from '@angular/core';
import { NgxGraphModule } from '@swimlane/ngx-graph';

@Component({
  selector: 'dagre-layout',
  standalone: true,
  imports: [NgxGraphModule],
  template: `
    <ngx-graph
      [view]="[500, 500]"
      layout="dagreCluster"
      [links]="[
        {
          id: 'a',
          source: '1',
          target: '2'
        },
        {
          id: 'b',
          source: '1',
          target: '3'
        },
        {
          id: 'c',
          source: '3',
          target: '4'
        },
        {
          id: 'd',
          source: '3',
          target: '5'
        },
        {
          id: 'e',
          source: '4',
          target: '5'
        },
        {
          id: 'f',
          source: '2',
          target: '6'
        }
      ]"
      [nodes]="[
        {
          id: '1',
          label: 'Node A'
        },
        {
          id: '2',
          label: 'Node B'
        },
        {
          id: '3',
          label: 'Node C'
        },
        {
          id: '4',
          label: 'Node D'
        },
        {
          id: '5',
          label: 'Node E'
        },
        {
          id: '6',
          label: 'Node F'
        }
      ]"
      [clusters]="[
        {
          id: 'cluster0',
          label: 'Cluster node',
          childNodeIds: ['2', '3']
        }
      ]"
    ></ngx-graph>
  `
})
export class DagreLayoutComponent {}

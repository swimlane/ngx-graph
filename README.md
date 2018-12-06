# ngx-graph
[![Join the chat at https://gitter.im/swimlane/ngx-graph](https://badges.gitter.im/swimlane/ngx-graph.svg)](https://gitter.im/swimlane/ngx-graph?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![npm version](https://badge.fury.io/js/%40swimlane%2Fngx-graph.svg)](https://badge.fury.io/js/%40swimlane%2Fngx-graph)
[![npm downloads](https://img.shields.io/npm/dm/@swimlane/ngx-graph.svg)](https://npmjs.org/@swimlane/ngx-graph)


#### A Graph visualization component for angular

## Demo
https://swimlane.github.io/ngx-graph/

## Features
* Custom templates for nodes and edges
* Automatic layout using [Dagre](https://github.com/cpettitt/dagre)
* Animations

### How is it different from `ngx-charts`?
This library is focused on handling graph data (anything with nodes and edges) rather than chart data.  Currently the only visualization uses the Dagre layout, which is specialized for directed graphs.  The plan is to implement multiple visualisations for graph data within this same library.  Eventually, `ngx-charts-force-directed-graph` may be imported into this library as another option to visualize your graph data.

## Installation
1. `npm install @swimlane/ngx-graph @swimlane/ngx-charts d3 --save`
2. Import `NgxGraphModule` and `NgxChartsModule` into your module
```typescript
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { NgxGraphModule } from '@swimlane/ngx-graph';
// ...
@NgModule({
  // ...
  imports: [
    NgxChartsModule,
    NgxGraphModule
  ],
  // ...
})
export class AppModule { }
```
3. Use the `ngx-graph` component in your component template
```xml
<ngx-graph
  class="chart-container"
  [view]="view"
  [legend]="showLegend"
  [links]="hierarchialGraph.links"
  (legendLabelClick)="onLegendLabelClick($event)"
  [nodes]="hierarchialGraph.nodes"
  [scheme]="colorScheme"
  [orientation]="orientation"
  [curve]="curve"
  (select)="select($event)">

  <ng-template #defsTemplate>
    <svg:marker id="arrow" viewBox="0 -5 10 10" refX="8" refY="0" markerWidth="4" markerHeight="4" orient="auto">
      <svg:path d="M0,-5L10,0L0,5" class="arrow-head" />
    </svg:marker>
  </ng-template>

  <ng-template #nodeTemplate let-node>
    <svg:g class="node"
      ngx-tooltip
      [tooltipPlacement]="'top'"
      [tooltipType]="'tooltip'"
      [tooltipTitle]="node.label">
      <svg:rect [attr.width]="node.width" [attr.height]="node.height" [attr.fill]="node.options.color" />
      <svg:text alignment-baseline="central" [attr.x]="10" [attr.y]="node.height / 2">{{node.label}}</svg:text>
    </svg:g>
  </ng-template>

  <ng-template #linkTemplate let-link>
    <svg:g class="edge">
      <svg:path
        class="line"
        stroke-width="2"
        marker-end="url(#arrow)" >
      </svg:path>
    </svg:g>
  </ng-template>

</ngx-graph>
```
4. Add imports and graph input variables to your component definition ([see full example file here](https://github.com/swimlane/ngx-graph/blob/master/demo/app.component.ts))
```typescript
// dont need to import d3 in your app.module,
// but you need to import it in your component for link line shape
import * as shape from 'd3-shape';
// ...
export class AppComponent implements OnInit {
  curve: any = shape.curveLinear;
  view: any[];
  autoZoom: boolean = false;
  panOnZoom: boolean = true;
  enableZoom: boolean = true;
  autoCenter: boolean = false;
  showLegend: boolean = false;
  colorScheme: any = {
    domain: ['#5AA454', '#A10A28', '#C7B42C', '#AAAAAA']
  };
  // ...
}
```

5. Add data for nodes and links
```typescript
nodes: any[] = [
  {
    id: 'start',
    label: 'start'
  }, {
    id: '1',
    label: 'Query ThreatConnect',
  }, {
    id: '2',
    label: 'Query XForce',
  }, {
    id: '3',
    label: 'Format Results'
  }, {
    id: '4',
    label: 'Search Splunk'
  }, {
    id: '5',
    label: 'Block LDAP'
  }, {
    id: '6',
    label: 'Email Results'
  }
]
links: any[] = [
  {
    source: 'start',
    target: '1',
    label: 'links to'
  }, {
    source: 'start',
    target: '2'
  }, {
    source: '1',
    target: '3',
    label: 'related to'
  }, {
    source: '2',
    target: '4'
  }, {
    source: '2',
    target: '6'
  }, {
    source: '3',
    target: '5'
  }
]
```


## Credits
`ngx-graph` is a [Swimlane](http://swimlane.com) open-source project; we believe in giving back to the open-source community by sharing some of the projects we build for our application. Swimlane is an automated cyber security operations and incident response platform that enables cyber security teams to leverage threat intelligence, speed up incident response and automate security operations.

[SecOps Hub](http://secopshub.com) is an open, product-agnostic, online community for security professionals to share ideas, use cases, best practices, and incident response strategies.


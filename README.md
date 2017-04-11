# ngx-charts-dag

A Directed Acyclic Graph (DAG) visualization for angular - implemented using [ngx-charts](https://github.com/swimlane/ngx-charts).

**Note: ngx-charts-dag 2.0.0 works only with Angular 4.x. To use ngx-charts-dag with Angular 2.x, use ngx-charts-dag 1.x.**



## Demo
https://swimlane.github.io/ngx-charts-dag/

## Features
* Custom templates for nodes and edges
* Automatic layout using [Dagre](https://github.com/cpettitt/dagre)
* Animations

### How is it different than the `ngx-charts-force-directed-graph` component which is distributed with ngx-charts?
This visualization uses the Dagre layout, which is specialized for directed graphs, where as `ngx-charts-force-directed-graph` uses D3's force directed layout.

`ngx-charts-dag` is better suited for visualizing flow diagrams which have a clear start and end.

## Installation
1. `npm install @swimlane/ngx-charts-dag --save`
2. Make sure the peer dependencies are installed (d3)
3. Import `NgxChartsDagModule` into your module
4. Use the `ngx-charts-directed-graph` component in your components
```
<ngx-charts-directed-graph
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

  <template #defsTemplate>
    <svg:marker id="arrow" viewBox="0 -5 10 10" refX="8" refY="0" markerWidth="4" markerHeight="4" orient="auto">
      <svg:path d="M0,-5L10,0L0,5" class="arrow-head" />
    </svg:marker>
  </template>

  <template #nodeTemplate let-node>
    <svg:g class="node"
      ngx-tooltip
      [tooltipPlacement]="'top'"
      [tooltipType]="'tooltip'"
      [tooltipTitle]="node.label">
      <svg:rect [attr.width]="node.width" [attr.height]="node.height" [attr.fill]="node.options.color" />
      <svg:text alignment-baseline="central" [attr.x]="10" [attr.y]="node.height / 2">{{node.label}}</svg:text>
    </svg:g>
  </template>

  <template #linkTemplate let-link>
    <svg:g class="edge">
      <svg:path
        stroke-width="2"
        marker-end="url(#arrow)" >
      </svg:path>
    </svg:g>
  </template>

</ngx-charts-directed-graph>
```

## Data

### Nodes
```
[
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
```

### Links
```
[
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
`ngx-charts-dag` is a [Swimlane](http://swimlane.com) open-source project; we believe in giving back to the open-source community by sharing some of the projects we build for our application. Swimlane is an automated cyber security operations and incident response platform that enables cyber security teams to leverage threat intelligence, speed up incident response and automate security operations.

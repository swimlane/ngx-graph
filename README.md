# ngx-charts-dag

A Directed Acyclic Graph (DAG) visualization for angular - implemented using ngx-charts.

## Demo
https://swimlane.github.io/ngx-charts-dag/

# Features
* Custom templates for nodes and edges
* Automatic layout using [Dagre](https://github.com/cpettitt/dagre)
* Animations

# Installation
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

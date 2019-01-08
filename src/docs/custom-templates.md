# Custom Templates

ngx-graph gives you complete control over the look and behavior of your graph. You can pass custom templates for your nodes, edges, and clusters.

```html { playground }
<ngx-graph class="chart-container" [view]="[500, 550]"
  [links]="[
    {
      id: 'a',
      source: 'first',
      target: 'second',
      label: 'is parent of'
    }, {
      id: 'b',
      source: 'first',
      target: 'c1',
      label: 'custom label'
    }, {
      id: 'c',
      source: 'first',
      target: 'c1',
      label: 'custom label'
    }, {
      id: 'd',
      source: 'first',
      target: 'c2',
      label: 'custom label'
    }
  ]"
  [nodes]="[
    {
      id: 'first',
      label: 'A'
    }, {
      id: 'second',
      label: 'B'
    }, {
      id: 'c1',
      label: 'C1'
    }, {
      id: 'c2',
      label: 'C2'
    }
  ]"
  [clusters]="[
    {
      id: 'third',
      label: 'C',
      childNodeIds: ['c1', 'c2']
    }
  ]"
  layout="dagreCluster"
  >

  <ng-template #defsTemplate>
    <svg:marker id="arrow" viewBox="0 -5 10 10" refX="8" refY="0" markerWidth="4" markerHeight="4" orient="auto">
      <svg:path d="M0,-5L10,0L0,5" class="arrow-head" />
    </svg:marker>
  </ng-template>

  <ng-template #clusterTemplate let-cluster>
    <svg:g class="node cluster" ngx-tooltip [tooltipPlacement]="'top'" [tooltipType]="'tooltip'" [tooltipTitle]="cluster.label">
      <svg:rect rx="5" ry="5" [attr.width]="cluster.dimension.width" [attr.height]="cluster.dimension.height" [attr.fill]="cluster.data.color" />
    </svg:g>
  </ng-template>

  <ng-template #nodeTemplate let-node>
    <svg:g class="node" ngx-tooltip [tooltipPlacement]="'top'" [tooltipType]="'tooltip'" [tooltipTitle]="node.label">
      <svg:rect [attr.width]="node.dimension.width" [attr.height]="node.dimension.height" [attr.fill]="node.data.color" />
      <svg:text alignment-baseline="central" [attr.x]="10" [attr.y]="node.dimension.height / 2">{{node.label}}</svg:text>
    </svg:g>
  </ng-template>

  <ng-template #linkTemplate let-link>
    <svg:g class="edge">
      <svg:path class="line" stroke-width="2" marker-end="url(#arrow)">
      </svg:path>
      <svg:text class="edge-label" text-anchor="middle">
        <textPath class="text-path" [attr.href]="'#' + link.id" [style.dominant-baseline]="link.dominantBaseline" startOffset="50%">
          {{link.label}}
        </textPath>
      </svg:text>
    </svg:g>
  </ng-template>
</ngx-graph>
```

## Node Template

## Edge Template

## Cluster Template

## Defs Template

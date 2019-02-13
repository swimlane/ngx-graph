# Custom Templates

ngx-graph gives you complete control over the look and behavior of your graph. You can pass custom templates for your nodes, edges, and clusters.

```html { playground }
<ngx-graph
  class="chart-container"
  [view]="[500, 550]"
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
      id: 'd',
      source: 'first',
      target: 'c2',
      label: 'custom label'
    }, {
      id: 'e',
      source: 'c1',
      target: 'd',
      label: 'first link'
    }, {
      id: 'f',
      source: 'c1',
      target: 'd',
      label: 'second link'
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
    }, {
      id: 'd',
      label: 'D'
    }
  ]"
  [clusters]="[
    {
      id: 'third',
      label: 'Cluster node',
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
    <svg:g
      class="node cluster"
      ngx-tooltip
      [tooltipPlacement]="'top'"
      [tooltipType]="'tooltip'"
      [tooltipTitle]="cluster.label"
    >
      <svg:rect
        rx="5"
        ry="5"
        [attr.width]="cluster.dimension.width"
        [attr.height]="cluster.dimension.height"
        [attr.fill]="cluster.data.color"
      />
    </svg:g>
  </ng-template>

  <ng-template #nodeTemplate let-node>
    <svg:g class="node" ngx-tooltip [tooltipPlacement]="'top'" [tooltipType]="'tooltip'" [tooltipTitle]="node.label">
      <svg:rect
        [attr.width]="node.dimension.width"
        [attr.height]="node.dimension.height"
        [attr.fill]="node.data.color"
      />
      <svg:text alignment-baseline="central" [attr.x]="10" [attr.y]="node.dimension.height / 2">
        {{node.label}}
      </svg:text>
    </svg:g>
  </ng-template>

  <ng-template #linkTemplate let-link>
    <svg:g class="edge">
      <svg:path class="line" stroke-width="2" marker-end="url(#arrow)"></svg:path>
      <svg:text class="edge-label" text-anchor="middle">
        <textPath
          class="text-path"
          [attr.href]="'#' + link.id"
          [style.dominant-baseline]="link.dominantBaseline"
          startOffset="50%"
        >
          {{link.label}}
        </textPath>
      </svg:text>
    </svg:g>
  </ng-template>
</ngx-graph>
```

## Node Template

To define a custom template for your nodes, define a `#nodeTemplate` element as a content child of the `ngx-graph` component. Each node object is passed to the template via the `node` template context, so you can style each node based on its properties.

```
<ng-template #nodeTemplate let-node>
  // your SVG code here
</ng-template>
```

## Edge Template

To define a custom template for the edges, define a `#linkTemplate` element as a content child of the `ngx-graph` component. Each link object is passed to the template via the `link` template context, so you can style each link based on its properties.

```
<ng-template #linkTemplate let-link>
  // your SVG code here
</ng-template>
```

## Cluster Template

To define a custom template for the cluster nodes, define a `#clusterTemplate` element as a content child of the `ngx-graph` component. Each cluster object is passed to the template via the `cluster` template context, so you can style each cluster based on its properties.

```
<ng-template #clusterTemplate let-cluster>
  // your SVG code here
</ng-template>
```

## Defs Template

If you want to define SVG defs object that you can reference in the other templates, define a `#defsTemplate` element as a content of the `ngx-graph` component, and add them in it. All of the objects you define inside this template will be insterted into a `defs` SVG element, and can be referenced from the other templates of the component.

```
<ng-template #defsTemplate>
  // your SVG defs here
</ng-template>
```

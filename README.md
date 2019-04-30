# ngx-graph

[![Join the chat at https://gitter.im/swimlane/ngx-graph](https://badges.gitter.im/swimlane/ngx-graph.svg)](https://gitter.im/swimlane/ngx-graph?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

A Graph visualization for angular

## Documentation & Demos 
https://swimlane.github.io/ngx-graph/

## Installation
1. `npm install @swimlane/ngx-graph --save`
3. Import `NgxGraphModule` into your module
4. Use the `ngx-graph` component in your components

## Usage

### Simple
```html
<ngx-graph
  class="chart-container"
  [view]="[500, 200]"
  [links]="[
    {
      id: 'a',
      source: 'first',
    target: 'second',
      label: 'is parent of'
    }, {
      id: 'b',
      source: 'first',
      target: 'third',
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
      id: 'third',
      label: 'C'
    }
  ]"
>
</ngx-graph>
```

### Custom Templates

```html
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

## Data

### Nodes
```javascript
[
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
]
```

### Edges
```javascript
[
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
]
```

### Clusters
```javascript
[
  {
    id: 'cluster0',
    label: 'Cluster node',
    childNodeIds: ['2', '3']
  }
]
```


## Credits
`ngx-graph` is a [Swimlane](http://swimlane.com) open-source project; we believe in giving back to the open-source community by sharing some of the projects we build for our application. Swimlane is an automated cyber security operations and incident response platform that enables cyber security teams to leverage threat intelligence, speed up incident response and automate security operations.

[SecOps Hub](http://secopshub.com) is an open, product-agnostic, online community for security professionals to share ideas, use cases, best practices, and incident response strategies.


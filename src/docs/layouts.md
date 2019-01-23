# Layouts

ngx-graph provides different types of built-in graph layouts, as well as the option to define your own custom layout.
The component has a `layoutSettings` inputs, through which you can pass an object with the layout-speciffic options.

## Dagre

```html { playground }
<ngx-graph
  [view]="[500, 300]"
  layout="dagre"
  [links]="[
    {
      id: 'a',
      source: '1',
      target: '2'
    }, {
      id: 'b',
      source: '1',
      target: '3'
    }, {
      id: 'c',
      source: '3',
      target: '4'
    }, {
      id: 'd',
      source: '3',
      target: '5'
    }, {
      id: 'e',
      source: '4',
      target: '5'
    }, {
      id: 'f',
      source: '2',
      target: '6'
    }
  ]"
  [nodes]="[
    {
      id: '1',
      label: 'Node A'
    }, {
      id: '2',
      label: 'Node B'
    }, {
      id: '3',
      label: 'Node C'
    }, {
      id: '4',
      label: 'Node D'
    }, {
      id: '5',
      label: 'Node E'
    }, {
      id: '6',
      label: 'Node F'
    }
  ]"
></ngx-graph>
```

### Dagre Cluster

The dagre cluster layout groups clustered nodes together into a rectangle

```html { playground }
<ngx-graph
  [view]="[500, 500]"
  layout="dagreCluster"
  [links]="[
    {
      id: 'a',
      source: '1',
      target: '2'
    }, {
      id: 'b',
      source: '1',
      target: '3'
    }, {
      id: 'c',
      source: '3',
      target: '4'
    }, {
      id: 'd',
      source: '3',
      target: '5'
    }, {
      id: 'e',
      source: '4',
      target: '5'
    }, {
      id: 'f',
      source: '2',
      target: '6'
    }
  ]"
  [nodes]="[
    {
      id: '1',
      label: 'Node A'
    }, {
      id: '2',
      label: 'Node B'
    }, {
      id: '3',
      label: 'Node C'
    }, {
      id: '4',
      label: 'Node D'
    }, {
      id: '5',
      label: 'Node E'
    }, {
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
```

---

## Force-Directed

### D3 Force Directed

```html { playground }
<ngx-graph
  [view]="[500, 300]"
  layout="d3ForceDirected"
  [links]="[
    {
      id: 'a',
      source: '1',
      target: '2'
    }, {
      id: 'b',
      source: '1',
      target: '3'
    }, {
      id: 'c',
      source: '3',
      target: '4'
    }, {
      id: 'd',
      source: '3',
      target: '5'
    }, {
      id: 'e',
      source: '4',
      target: '5'
    }, {
      id: 'f',
      source: '2',
      target: '6'
    }
  ]"
  [nodes]="[
    {
      id: '1',
      label: 'Node A'
    }, {
      id: '2',
      label: 'Node B'
    }, {
      id: '3',
      label: 'Node C'
    }, {
      id: '4',
      label: 'Node D'
    }, {
      id: '5',
      label: 'Node E'
    }, {
      id: '6',
      label: 'Node F'
    }
  ]"
></ngx-graph>
```

### Cola Force Directed

```html { playground }
<ngx-graph
  [view]="[500, 300]"
  layout="colaForceDirected"
  [links]="[
    {
      id: 'a',
      source: '1',
      target: '2'
    }, {
      id: 'b',
      source: '1',
      target: '3'
    }, {
      id: 'c',
      source: '3',
      target: '4'
    }, {
      id: 'd',
      source: '3',
      target: '5'
    }, {
      id: 'e',
      source: '4',
      target: '5'
    }, {
      id: 'f',
      source: '2',
      target: '6'
    }
  ]"
  [nodes]="[
    {
      id: '1',
      label: 'Node A'
    }, {
      id: '2',
      label: 'Node B'
    }, {
      id: '3',
      label: 'Node C'
    }, {
      id: '4',
      label: 'Node D'
    }, {
      id: '5',
      label: 'Node E'
    }, {
      id: '6',
      label: 'Node F'
    }
  ]"
></ngx-graph>
```

### Cola Force Directed Cluster

```html { playground }
<ngx-graph
  [view]="[500, 500]"
  layout="colaForceDirected"
  [links]="[
    {
      id: 'a',
      source: '1',
      target: '2'
    }, {
      id: 'b',
      source: '1',
      target: '3'
    }, {
      id: 'c',
      source: '3',
      target: '4'
    }, {
      id: 'd',
      source: '3',
      target: '5'
    }, {
      id: 'e',
      source: '4',
      target: '5'
    }, {
      id: 'f',
      source: '2',
      target: '6'
    }
  ]"
  [nodes]="[
    {
      id: '1',
      label: 'Node A'
    }, {
      id: '2',
      label: 'Node B'
    }, {
      id: '3',
      label: 'Node C'
    }, {
      id: '4',
      label: 'Node D'
    }, {
      id: '5',
      label: 'Node E'
    }, {
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
```

---

## Custom Layouts

In addition to the layouts that come bundled with the library, you can also define your own custom layout:

1. Create a layout class that implements the `Layout` interface, which can be imported from `NgxGraphModule`
2. Instantiate an object from the layout
3. Pass the layout object to the `layout` input of the `ngx-graph` component

[Here](https://github.com/swimlane/ngx-graph/tree/master/projects/swimlane/ngx-graph/src/lib/graph/layouts) is the list of layout implementations that come bundled with the library.

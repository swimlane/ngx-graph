# Data Format

The graph data is passed through 3 inputs of the component: `nodes`, `edges`, and `clusters`. All of the interfaces for these inputs can be imported from the npm package.

[[include path="./demos/data-format.ts" codeblock='js]]

## Nodes

The `nodes` input accepts an array of items of type `Node`.

## Edges

The `edges` input accepts an array of items of type `Edge`.

## Clusters (Optional)

The `clusters` input accepts an array of items of type `ClusterNode`. This input will only be used by layouts that support it. Other layouts will ignore it.

## Example

```js
this.edges = [
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
];

this.nodes = [
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
];

this.clusters = [
  {
    id: 'cluster0',
    label: 'Cluster node',
    childNodeIds: ['2', '3']
  }
];
```

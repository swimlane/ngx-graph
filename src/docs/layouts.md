# Layouts

ngx-graph provides different types of built-in graph layouts, as well as the option to define your own custom layout.

## Dagre

```html { playground }
<ngx-graph class="chart-container" [view]="[500, 200]"
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
```

### Dagre Cluster

---

## Force-Directed

### D3 Force Directed

```html { playground }
<ngx-graph class="chart-container" [view]="[500, 200]"
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
```

### Cola Force Directed

---

## Custom Layouts

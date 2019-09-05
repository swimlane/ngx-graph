# Introduction

ngx-graph is a graph visualization library for Angular

## Quick Start

- Install the package

  `npm install @swimlane/ngx-graph --save`

- Import `NgxGraphModule` into your angular module
- Add the `ngx-graph` component:

```html { playground }
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

---

## Inputs

| Property                                                  | Type                | Default Value | Description                                                                                                                                         |
| --------------------------------------------------------- | ------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| [view](/demos/interactive-demo#dimensions)                | number[]            |               | The size of the graph element - accepts an array of two numbers `[width, height]`. If not specified, the graph is resized to fit its parent element |
| [nodes](/data-format)                                     | Node[]              | []            | The list of graph nodes                                                                                                                             |
| [links](/data-format)                                     | Edge[]              | []            | The list of graph edges                                                                                                                             |
| [clusters](/data-format)                                  | ClusterNode[]       | []            | The list of cluster nodes                                                                                                                           |
| [layout](/layouts)                                        | string or Layout    | 'dagre'       | The graph layout - can be either one of the built-in layouts or a custom layout                                                                     |
| [layoutSettings](/layouts)                                | any                 |               | The setting for the layout                                                                                                                          |
| [curve](/demos/interactive-demo#line-curve-interpolation) | any                 |               | The interpolation function used to generate the curve. It accepts any d3.curve function                                                             |
| legend                                                    | boolean             | false         | Show/hide the legend. **deprecated**{ .badge .warn }                                                                                                |
| draggingEnabled                                           | boolean             | true          | Enable dragging nodes                                                                                                                               |
| panOffsetAxis                                             | number[]            | [0, 0]        | Set/Get panning offset for X and Y axis.                                                                                                            |
| panningEnabled                                            | boolean             | true          | Enable panning. If enabled, the panningAxis will be set to 'both'.                                                                                  |
| panningAxis                                               | string              | 'both'        | Set panning direction. Possible values: 'both', 'horizontal', 'vertical'.                                                                           |
| enableZoom                                                | boolean             | true          | Enable zoom                                                                                                                                         |
| animate                                                   | boolean             | false         | Enable animations                                                                                                                                   |
| zoomSpeed                                                 | number              | 0.1           | The zoom speed                                                                                                                                      |
| minZoomLevel                                              | number              | 0.1           | The minimum zoom level                                                                                                                              |
| maxZoomLevel                                              | number              | 4.0           | The maximum zoom level                                                                                                                              |
| autoZoom                                                  | boolean             | false         | Automatically zoom the graph to fit in the avialable viewport when the graph is updated                                                             |
| panOnZoom                                                 | boolean             | true          | Pan to the mouse cursor while zooming                                                                                                               |
| autoCenter                                                | boolean             | false         | Center the graph in the viewport when the graph is updated                                                                                          |
| [update\$](/demos/interactive-demo#triggering-update)     | Observable<boolean> |               | Update the graph                                                                                                                                    |
| [center\$](/demos/interactive-demo#centering-the-graph)   | Observable<boolean> |               | Center the graph                                                                                                                                    |
| [zoomToFit\$](/demos/interactive-demo#fit-to-view)        | Observable<boolean> |               | Zoom the graph to fit in the viewport                                                                                                               |
| panToNode\$                                               | Observable<number>  |               | Pans the graph to center on the node ID passed emited from the observable                                                                           |
| nodeHeight                                                | number              |               | The height of the nodes **deprecated**{ .badge .warn }                                                                                              |
| nodeMaxHeight                                             | number              |               | The max height of the nodes **deprecated**{ .badge .warn }                                                                                          |
| nodeMinHeight                                             | number              |               | The min height of the nodes **deprecated**{ .badge .warn }                                                                                          |
| nodeWidth                                                 | number              |               | The width of the nodes **deprecated**{ .badge .warn }                                                                                               |
| nodeMinWidth                                              | number              |               | The min width of the nodes **deprecated**{ .badge .warn }                                                                                           |
| nodeMaxWidth                                              | number              |               | The max width of the nodes **deprecated**{ .badge .warn }                                                                                           |

_Deprecated inputs will be removed in the next major version of the package._

## Outputs

| Event      | Description                                 |
| ---------- | ------------------------------------------- |
| activate   | element activation event (mouse enter)      |
| deactivate | element deactivation event (mouse leave)    |
| zoomChange | zoom change event, emits the new zoom level |

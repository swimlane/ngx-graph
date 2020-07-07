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
  [view]="[800, 200]"
  [showMiniMap]="true"
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

| Property                                                  | Type                | Default Value                    | Description                                                                                                                                         |
| --------------------------------------------------------- | ------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| [view](/demos/interactive-demo#dimensions)                | number[]            |                                  | the size of the graph element - accepts an array of two numbers `[width, height]`. If not specified, the graph is resized to fit its parent element |
| [nodes](/data-format)                                     | Node[]              | []                               | the list of graph nodes                                                                                                                             |
| [links](/data-format)                                     | Edge[]              | []                               | the list of graph edges                                                                                                                             |
| [clusters](/data-format)                                  | ClusterNode[]       | []                               | the list of cluster nodes                                                                                                                           |
| [layout](/layouts)                                        | string or Layout    | 'dagre'                          | the graph layout - can be either one of the built-in layouts or a custom layout                                                                     |
| [layoutSettings](/layouts)                                | any                 |                                  | the setting for the layout                                                                                                                          |
| [curve](/demos/interactive-demo#line-curve-interpolation) | any                 |                                  | the interpolation function used to generate the curve. It accepts any d3.curve function                                                             |
| legend                                                    | boolean             | false                            | show/hide the legend. **deprecated**{ .badge .warn }                                                                                                |
| draggingEnabled                                           | boolean             | true                             | enable dragging nodes                                                                                                                               |
| panningEnabled                                            | boolean             | true                             | enable panning                                                                                                                                      |
| panOffsetX                                                | number              |                                  | set the current `x` position of the graph                                                                                                           |
| panOffsetY                                                | number              |                                  | set the current `y` position of the graph                                                                                                           |
| panningAxis                                               | string              | 'both', 'horizontal', 'vertical' | set panning direction                                                                                                                               |
| enableZoom                                                | boolean             | true                             | enable zoom                                                                                                                                         |
| animate                                                   | boolean             | false                            | enable animations                                                                                                                                   |
| zoomSpeed                                                 | number              | 0.1                              | the zoom speed                                                                                                                                      |
| zoomLevel                                                 | number              |                                  | the zoom level                                                                                                                                      |
| minZoomLevel                                              | number              | 0.1                              | the minimum zoom level                                                                                                                              |
| maxZoomLevel                                              | number              | 4.0                              | the maximum zoom level                                                                                                                              |
| zoomLevel                                                 | number              |                                  | sets the zoom level, set autoZoom to false to use                                                                                                   |
| autoZoom                                                  | boolean             | false                            | automatically zoom the graph to fit in the avialable viewport when the graph is updated                                                             |
| panOnZoom                                                 | boolean             | true                             | pan to the mouse cursor while zooming                                                                                                               |
| autoCenter                                                | boolean             | false                            | center the graph in the viewport when the graph is updated                                                                                          |
| [update\$](/demos/interactive-demo#triggering-update)     | Observable<boolean> |                                  | update the graph                                                                                                                                    |
| [center\$](/demos/interactive-demo#centering-the-graph)   | Observable<boolean> |                                  | center the graph                                                                                                                                    |
| [zoomToFit\$](/demos/interactive-demo#fit-to-view)        | Observable<boolean> |                                  | zoom the graph to fit in the viewport                                                                                                               |
| panToNode\$                                               | Observable<number>  |                                  | pans the graph to center on the node ID passed emited from the observable                                                                           |
| nodeHeight                                                | number              |                                  | the height of the nodes **deprecated**{ .badge .warn }                                                                                              |
| nodeMaxHeight                                             | number              |                                  | the max height of the nodes **deprecated**{ .badge .warn }                                                                                          |
| nodeMinHeight                                             | number              |                                  | the min height of the nodes **deprecated**{ .badge .warn }                                                                                          |
| nodeWidth                                                 | number              |                                  | the width of the nodes **deprecated**{ .badge .warn }                                                                                               |
| nodeMinWidth                                              | number              |                                  | the min width of the nodes **deprecated**{ .badge .warn }                                                                                           |
| nodeMaxWidth                                              | number              |                                  | the max width of the nodes **deprecated**{ .badge .warn }                                                                                           |
| showMiniMap                                               | boolean             | false                            | show/hide the minimap                                                                                                                               |
| miniMapMaxWidth                                           | number              | 100                              | the maximum width of the minimap (in pixels)                                                                                                        |
| miniMapMaxHeight                                          | number              |                                  | the maximum height of the minimap (in pixels)                                                                                                       |
| miniMapPosition                                           | MiniMapPosition     | MiniMapPosition.UpperRight       | the position of the minimap                                                                                                                         |

_Deprecated inputs will be removed in the next major version of the package._

## Outputs

| Event      | Description                                 |
| ---------- | ------------------------------------------- |
| activate   | element activation event (mouse enter)      |
| deactivate | element deactivation event (mouse leave)    |
| zoomChange | zoom change event, emits the new zoom level |

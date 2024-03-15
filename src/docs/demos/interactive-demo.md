# Interactive Demo

Use the controls to configure the inputs of the graph and see how they affect its behavior

<embed-stackblitz
title='NGX-GRAPH DEMO'
project-id='ngx-graph-demo'
embed-opts='{"height": 800, "clickToLoad": false, "hideExplorer": true, "hideNavigation": true, "forceEmbedLayout": true, "view": "preview"}'>
</embed-stackblitz>

## Dimensions

The graph component accepts a `view` input, which is an array with two numeric elements: `[width, height]` in pixels. If the `view` input is ommited or undefined, the graph will resize itself to fit the parent container.

[[note | Note]]
| The parent container must have a non-zero height defined, and no padding in order for the graph to properly fit its size.

Methods exist on `GraphComponent` to check if the graph has dimension. This can be useful for waiting to display the entire graph after it has proper dimensions.

| Method              | Description                                                                                                                |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| hasGraphDims        | Returns true when the graph container has dimension.                                                                       |
| hasNodeDims         | Returns true when every node in the graph has dimension.                                                                   |
| hasCompoundNodeDims | Returns true when every compound node in the graph has dimension.                                                          |
| hasDims             | Returns true when all of the above methods combined return true. This means entire graph is ready to be drawn and updated. |

These methods can be used with the `stateChange @Output` to check when the graph has dimension. Suppose you had `GraphComponent` has a `ViewChild` in a parent `Component`.

```typescript
@ViewChild(GraphComponent) graphRef: GraphComponent;
```

In your template, bind the `stateChange @Output` of `GraphComponent` to a handler on the parent `Component class`.

```javascript
    <ngx-graph
      (stateChange)="handleStateChange($event)"
      [zoomToFit$]="zoomToFit$"
    >
```

In this callback, you can check for the `NgxGraphStates.Transform` state. `GraphComponent` emits this particular state whenever the graph is transformed. `NgxGraphStates` is an enum exported from @swimlane/ngx-graph. Upon a transform of the graph, check the graph has dimension with `hasDims()`. When `hasDims()` is `true`, it should be safe to zoom and center the graph on load, since these operations depend on the graph having proper dimensions. Additionally, if the parent `Component` implements a loading indicator (`this.isLoading`), the loading indicator can be removed since the graph is ready to display.

```javascript
handleStateChange(event: NgxGraphStateChangeEvent) {
    if (event.state === NgxGraphStates.Transform && this.graphRef?.hasDims()) {
        this.zoomToFit$.next({ autoCenter: true, force: true });
        this.isLoading = false;
    }
}
```

If you are interested in what's happening in the above example with `zoomToFit$`, check out [Fit To View](#fit-to-view) below.

## Line Curve Interpolation

This input allows you to choose the curve interpolation function for the edge lines. It accepts a function as an input, which is compatibe with D3's line interpolation functions and accepts any of them as an input, or a custom one ([link](https://github.com/d3/d3-shape/blob/master/README.md#curves)).

Example, to switch to the linear interpolation, install the d3-shape package and import it in your component file, then pass the curveLinear function to the curve input:

#### Component:

```javascript
import * as shape from 'd3-shape';
...

export class MyComponent{
    ...
    curve = shape.curveLinear;
    ...
}
```

#### Template:

```html
<ngx-graph ... [curve]="curve"> </ngx-graph>
```

## Triggering Update

The graph component updates itself on every input change. The inputs are immutable, so in order to trigger the update, you would need to pass a new object instance.

Example, this will not trigger an update, because we are modifying the nodes array in place, and not creating a new instance:

```javascript
this.nodes.push(newNode);
```

We need to create a new instance of the array in order to trigger change detection in the component:

```javascript
this.nodes.push(newNode);
this.nodes = [...this.nodes];
```

To manually trigger the update, the graph accepts an `update$` input as an observable:

#### Component:

```javascript
import { Subject } from 'rxjs';
...
export class MyComponent{
    ...
    update$: Subject<boolean> = new Subject();
    ...

    updateGraph() {
        this.update$.next(true)
    }
}
```

#### Template:

```html
<ngx-graph ... [update$]="update$"> </ngx-graph>
```

## Centering the graph

To center the graph, pass a Subject to the `center$` input and then call `next` on it.

#### Component:

```javascript
import { Subject } from 'rxjs';
...
export class MyComponent{
    ...
    center$: Subject<boolean> = new Subject();
    ...

    centerGraph() {
        this.center$.next(true)
    }
}
```

#### Template:

```html
<ngx-graph ... [center$]="center$"> </ngx-graph>
```

## Fit to view

To fit the whole graph into the current view, pass a Subject to the `zoomToFit$` input, and call `next` on it.

#### Component:

```javascript
import { Subject } from 'rxjs';
...
export class MyComponent{
    ...
    zoomToFit$: Subject<boolean> = new Subject();
    ...

    fitGraph() {
        this.zoomToFit$.next()
    }
}
```

`zoomToFit$` optionally takes a configuration typed `NgxGraphZoomOptions`, i.e.

```javascript
this.zoomToFit$.next({ force: true, autoCenter: true });
```

| Event      | Description                                                |
| ---------- | ---------------------------------------------------------- |
| force      | skips an internal check for the zoom value and forces zoom |
| autoCenter | combines zoomToFit with center                             |

#### Template:

```html
<ngx-graph ... [zoomToFit$]="zoomToFit$"> </ngx-graph>
```

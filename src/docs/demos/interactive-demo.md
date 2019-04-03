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

To manually trigger the updade, the graph accepts an `update$` input as an observable:

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
        this.zoomToFit$.next(true)
    }
}
```

#### Template:

```html
<ngx-graph ... [zoomToFit$]="zoomToFit$"> </ngx-graph>
```

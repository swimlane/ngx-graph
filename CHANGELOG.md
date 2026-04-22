# CHANGELOG

## HEAD (unreleased)

- Breaking: `GraphComponent` is now a standalone component built on signal APIs (`input`, `output`, `model`, `contentChild`, `viewChildren`) instead of decorator-based `@Input` / `@Output` and classic queries. The published `NgxGraphModule` and `GraphModule` wrappers are still there so existing NgModule-based applications can import the graph as before, but those modules are deprecated; new code should import `GraphComponent` (and add it to the consuming component or route `imports` array) the same way you would any other standalone piece.
- Breaking: From TypeScript, inputs behave like signal readers: for example, read the current node list with `graph.nodes()` rather than `graph.nodes`. The `layout`, `curve`, and `activeEntries` bindings use `model()` where the graph needs to write back internally; consumers generally keep using normal property bindings, while code inside the component updates via `.set()`.
- Breaking: Outputs are `OutputRef` values, not `EventEmitter`, so they do not offer `.pipe()`. To keep using RxJS operators, turn an output into an observable with `outputToObservable` from `@angular/core/rxjs-interop` (in an appropriate injection context), or subscribe to the ref directly. Payload types (such as `NgxGraphStateChangeEvent`) are unchanged; only the subscription shape differs.
- Breaking: `@ViewChildren` / `@ContentChild` style access is replaced with signal query functions, so in component code you call `graph.linkElements()` (or the other query methods) instead of keeping a `QueryList` on a property.
- Breaking: The in-component `animations: [ trigger(...) ]` definition was removed. Enter styling on the root now uses the framework’s `animate.enter` class binding together with keyframes in the graph stylesheet, which replaces the old opacity `:enter` transition and avoids the deprecated `trigger` API. Angular does not support mixing the legacy `animations` metadata and `animate.enter` / `animate.leave` on the same component. The old `[@.disabled]` host binding for the legacy tree is also gone; it was scoped to the previous animation system and did not drive node positions, but projected templates that relied on that subtree being disabled for their own `[@...]` triggers may need a different approach.
- Breaking: Optional viewport inputs `zoomLevel`, `panOffsetX`, and `panOffsetY` are now signal inputs wired through `effect()` to `zoomTo` and `panTo`, so the graph no longer assigns those via a property setter, and the effects run when the parent binding’s value actually changes. If a parent expression changes on every data refresh, you may see extra viewport updates; binding stable values (or leaving these inputs unset) matches the old mental model. Automatic fit and centering still come from the documented `autoZoom`, `autoCenter`, and `zoomToFit$` behavior. If you use `transitionAfterChanges` with full-scope layout morph, whether the post-tick block runs `zoomToFit` or `center` can differ from the additive or instant paths, as before.
- Enhancement: `transitionAfterChanges`, `transitionDuringTransform`, `layoutTransitionEffect`, and `applyVisualContinuityBeforeLayout` inputs configure rich continuity when a prior graph had nodes, allowing for animations between graph updates.
- Breaking: `useLayoutTransitions` (default `true` controls `layout-js-driven`; when `false` it applies only during JS `mode: 'tween'`);
- Enhancement: `GraphComponent` `edgePathSampleCount` input (default 48, clamped 2–512) for edge resampling in layout, morph, and `redrawEdge`
- Enhancement: `transitionAfterChanges.morphCapture` for prior translate source (model vs main-chart DOM, optional model fallback) and `syncTargetsFromPositionAfterTick` / `snapAddedNodeIds`; `mergeGraphLayoutTransition` merges `morphCapture` with defaults
- Enhancement: `drawComplete` emits after a completed draw/tick pass (paths bound, graph ready). Use to hide loading UI or run one-shot center/zoomToFit without flashing before first layout.
- Enhancement: Minimap can be displayed on bottom.
- Fix: Observable layouts (Cola, D3 force) faster than `afterNextRender`—superseded passes repaint link paths from the current model without full `redrawLines` so layout morph is not cancelled.
- Fix: Layout morph keeps `oldLine` / `oldTextPath` on paths that are not resampled-tweening until the tween ends instead of snapping to the new route early.
- Fix: Drag `updateEdge` for Dagre and DagreCluster uses orientation-aware paths aligned with DagreNodesOnly.
- Chore: Update Storybook with documentation, examples

## 12.0.0-alpha.0

- Enhancement: Support for Angular 21
- Chore: Upgrade storybook to v10

## 11.0.0

- Enhancement: Added support for Angular 20
- Breaking: Removed support for Angular 17 and earlier versions

## 11.0.0-alpha.0

- Enhancement: Added support for Angular 20
- Breaking: Removed support for Angular 17 and earlier versions

## 10.0.0

- Enhancement: Support Angular 19, `standalone` now required in all `@Component`

## 9.0.1

- Fix: Restore versions in package.json to last 4 Angular

## 9.0.0

- Breaking: Fix issues with load due to asynchronous node dimension handling
- Chore: Updated peer dependencies to support angular 18 and newer dependencies
- Chore: Updated documentation portal to run on Storybook

This release causes possible breaking changes to how ngx-graph displays on load. The changes should make ngx-graph load more reliably.

If you have developed in the repository previously, you may need to delete your node_modules and run yarn after updating to the latest on master. This repository switched from npm to yarn. Multiple development commands in the package.json have moved. See the README.md for an up to date reference.

## 8.4.0

- Fix: Fixes a styling issue when using ngx-graph and ngx-charts on the same page
- Chore: Updated peer dependencies to support new angular versions

## 8.3.0

- Feature: new `ZoomOptions` gives users the ability to force update zoom to fit by omitting internal check and combining auto center to reduce chance of flicker.

- Feature: `enablePreUpdateTransform @Input` allows users to disable extra call to `updateTransform` internally, reducing chance of flicker.

- Feature: `stateChange @Output` emits changes in state, allowing users to check status of the graph.

- Feature: `hasGraphDims`, `hasDims`, `hasNodeDims`, and `hasCompoundNodeDims` allow users to check elements have dimension.

- Chore: Update docs.

- Bug: Update graph dimensions before zoom because sometimes they were out of sync.

- Bug: Format README instructions.

## 8.2.4

- Bug: Position was offset by default (#539)

## 8.2.3

- Feature: `centerNodesOnPositionChange` Input when set to `false` will ignore dimensions when positioning nodes. Default is set to `true` to replicate existing behavior.

## 8.2.2

- Bug: Getting right values for edge midPoints (#511)

## 8.2.1

- Bug: When using `deferDisplayUntilPosition` compound nodes and clusters may not be displayed (#511)

## 8.2.0

- Feature: Update Angular 16 as a peer dependency (#499)
- Feature: Use `deferDisplayUntilPosition` Input to display nodes after position returned by layout (#509)

## 8.1.0

- Feature: Support Elk Compound Nodes (#502) (#506)
- Bug: Fix issues with the build (#507)

## 8.0.3

- Chore: Bump d3 dependencies (#477)
- Bug: Fix an issue where fixing a node position would not work (#463)

## 8.0.2

- Chore: Add angular 14 as a peer dependency

## 8.0.1

- Chore: Add rxjs 7 as a peer dependency
- Chore: Bump msagl tp 0.0.51 and update msagl layout

## 8.0.0

- Chore; Upgrade to angular 13

## 8.0.0-rc.1

- Breaking: Remove dependency on ngx-charts (removes the `legend` input) (#363)
- Chore: Update angular to 11

## 7.2.0

- Chore: Update angular to 10.1

## 7.1.2

- Bug: Fix center and fit to screen functionality

## 7.1.1

- Chore: Remove console.log

## 7.1.0

- Feature: Add Minimap (#324)
- Bug: Remove extra call to update() on initial render (#303)

## 7.0.1

- Chore: update dependecies

## 7.0.0

- Bug: Fix pan to node (#288)
- Bug: Set min and max zoom incase zoom is out of bounce and remove EmptyError (#297)
- Chore: Update angular to 9.1

## 7.0.0-rc.1

- Enhancement: Implement animation of cluster nodes (#234)
- Enhancement: Support in track pad navigation instead of zoom (#241)
- Bug: Update events in mouse wheel directive (#232)

## 6.2.0

- Enhancement: Support in output click handler for graph clicks (#229)
- Bug: Fix error when using fullTemplateTypeCheck (#237)
- Docs: Fix custom curve demo

## 6.1.0

- Enhancement: Update dependencies to Angular 8 (#211)
- Bug: Fix issue with wrong transformation matrix calculated when nodes list is empty (#196)
- Bug: Update midpoint UI to be updated on drag + update org tree example with mid point UI (#202)
- Bug: Add parameter check for update mid point function (#209)
- Docs: add a custom curve demo + create demo components folder (#198)
- Chore: Added panning enum, enforced types and updated docs (#195)

## 6.0.1

- Fix: Added readme and licence files to npm package

## 6.0.0

- Breaking: Changed the data format, removed inputs. Please refer to the docs to see what the newly available inputs are.
- Feature: Added support for different layouts, as well as custom layouts
- Feature: Improved animations
- Feature: Added support for clusters

## 5.5.0

- Feature: Support multiple links between two nodes (#159)
- Enhancement: Update layout to spread orphan nodes in a grid (#161)
- Bug: Fix pan on zoom (#157)
- Bug: Fix flickering problem with the link data UI. (#160)

## 5.4.1

- Bug: Fixes issue where the node width is ignored when setting a custom width (#151)

## 5.4.0

- Feature: Adding ability to have custom width and height per each node. (#148)

## 5.3.0

- Feature: Adds zoomChange output (#141)
- Feature: Adds dagre layout options input (#146)
- Enhancement: Calculates biggest bounding box of tall text fields in node (#84)
- Bug: Fixes issue not being able to zoom if the current zoom goes out of the min/max zoom range (#146)

## 5.2.1

- Fix: Restore the HTML content inside the component (#140)

## 5.2.0

- Add new user template in order to show UI data on the link (#138)
- Feature: Adds zoom to node functionality (#133)
- Bug: Fixes panning to a location and centering the graph

## 5.1.2

- Chore: Update dependencies

## 5.1.1

- Bug: TouchEvent not defined in dev mode for non-Chrome browsers (#99)

## 5.1.0

- Feature: Allow panning on touch events (#86)
- Bug: Fix panning speed (#88)

## 5.0.1

- Chore: Update dagre version

## 5.0.0

- Chore: Upgrade to Angular 6

## 4.3.0

- Feature: Add update$, center$, and zoomToFit\$ inputs

## 4.2.0

- Feature: Add autoCenter and autoZoom inputs (#51)

## 4.1.0

- Feature: Allow enable/disable zooming (#64)
- Feature: Pan to cursor on zoom (#53)
- Docs: Use ng-template instead of template (#48)

## 4.0.2

- Fix: Error in Firefox when trying to render diagram when it is hidden

## 4.0.1

- Fix: Fix build for AOT projects.

## 4.0.0

- Breaking: Renamed the npm package to `@swimlane/ngx-graph`
- Breaking: Renamed the module to `NgxGraph`
- Breaking: Renamed the component selector to `ngx-graph`
- Docs: Updated readme

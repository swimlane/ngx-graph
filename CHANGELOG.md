# Changelog

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

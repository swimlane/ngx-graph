// This file is required by karma.conf.js and loads all spec modules (explicit imports; Karma/Electron may not provide webpack require.context).

import 'zone.js';
import 'zone.js/testing';
import { getTestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';

// First, initialize the Angular testing environment.
getTestBed().initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting(), {
  teardown: { destroyAfterEach: true }
});

// Load each spec explicitly — add new files here when you add *.spec.ts under this project.
import './lib/graph/graph.component.spec';
import './lib/graph/transition.model.spec';
import './lib/graph/layouts/edge-geometry.spec';
import './stories/demos/components/ngx-graph-org-tree/ngx-graph-org-tree.component.spec';

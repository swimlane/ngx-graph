import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
// import { expect, userEvent, within } from '@storybook/test';
import { importProvidersFrom } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { LayoutService, GraphComponent, MiniMapPosition } from '../public_api';

const meta: Meta<GraphComponent> = {
  title: 'GraphComponent',
  component: GraphComponent,
  decorators: [
    // Apply application config to all stories
    applicationConfig({
      // List of providers and environment providers that should be available to the root component and all its children.
      providers: [LayoutService, importProvidersFrom(BrowserAnimationsModule)]
    })
  ],
  parameters: {
    // More on how to position stories at: https://storybook.js.org/docs/configure/story-layout
    layout: 'fullscreen',
    controls: { expanded: true }
  }
};

export default meta;
type Story = StoryObj<GraphComponent>;

// More on interaction testing: https://storybook.js.org/docs/writing-tests/interaction-testing
export const Demo: Story = {
  args: {
    nodes: [
      {
        id: 'first',
        label: 'A'
      },
      {
        id: 'second',
        label: 'B'
      },
      {
        id: 'third',
        label: 'C'
      }
    ],
    links: [
      {
        id: 'a',
        source: 'first',
        target: 'second',
        label: 'is parent of'
      },
      {
        id: 'b',
        source: 'first',
        target: 'third',
        label: 'custom label'
      }
    ],
    clusters: [],
    compoundNodes: [],
    layout: 'dagre',
    layoutSettings: {},
    view: [1024, 768],
    showMiniMap: false,
    deferDisplayUntilPosition: false,
    centerNodesOnPositionChange: true,
    enablePreUpdateTransform: true,
    miniMapPosition: MiniMapPosition.UpperRight,
    zoomSpeed: 0.1,
    minZoomLevel: 0.1,
    maxZoomLevel: 4.0,
    autoZoom: false,
    panOnZoom: true,
    animate: false,
    autoCenter: false,
    scheme: 'cool',
    customColors: []
  }
};

Demo.parameters = {
  argTypes: {
    nodes: {
      control: { type: 'array' }
    },
    links: {
      control: { type: 'array' }
    },
    clusters: {
      control: { type: 'array' }
    },
    compoundNodes: {
      control: { type: 'array' }
    },
    activeEntries: {
      control: { type: 'array' }
    },
    layout: {
      control: { type: 'string' }
    },
    view: {
      control: { type: 'array' }
    },
    showMiniMap: {
      control: { type: 'boolean' }
    },
    miniMapPosition: {
      control: { type: 'string' }
    },
    miniMapMaxWidth: {
      control: { type: 'number' }
    },
    miniMapMaxHeight: {
      control: { type: 'number' }
    },
    deferDisplayUntilPosition: {
      control: { type: 'boolean' }
    },
    centerNodesOnPositionChange: {
      control: { type: 'boolean' }
    },
    enablePreUpdateTransform: {
      control: { type: 'boolean' }
    },
    animate: {
      control: { type: 'boolean' }
    },
    curve: {
      control: { type: 'string' }
    },
    draggingEnabled: {
      control: { type: 'boolean' }
    },
    panningEnabled: {
      control: { type: 'boolean' }
    },
    panningAxis: {
      control: { type: 'string' }
    },
    autoCenter: {
      control: { type: 'boolean' }
    },
    enableZoom: {
      control: { type: 'boolean' }
    },
    panOnZoom: {
      control: { type: 'boolean' }
    },
    minZoomLevel: {
      control: { type: 'number' }
    },
    maxZoomLevel: {
      control: { type: 'number' }
    },
    zoomSpeed: {
      control: { type: 'number' }
    }
  },
  docs: {
    source: {
      code: `
       <ngx-graph
         class="chart-container"
         [view]="[1024, 768]"
         [showMiniMap]="false"
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
       </ngx-graph>`
    },
    language: 'html',
    type: 'auto'
  }
};
Demo.tags = [];

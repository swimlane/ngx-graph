import type { Meta, StoryObj } from '@storybook/angular';
// import { expect, userEvent, within } from '@storybook/test';

import { ColaLayoutComponent } from './cola.component';
import type { ColaClusterLayoutComponent } from './cola.component';

const meta: Meta<ColaLayoutComponent> = {
  title: 'Cola',
  component: ColaLayoutComponent,
  parameters: {
    // More on how to position stories at: https://storybook.js.org/docs/configure/story-layout
    layout: 'fullscreen'
  }
};

export default meta;
type Story = StoryObj<ColaLayoutComponent>;

// More on interaction testing: https://storybook.js.org/docs/writing-tests/interaction-testing
export const ColaForceDirected: Story = {};
ColaForceDirected.parameters = {
  docs: {
    source: {
      code: `
<ngx-graph
        [view]="[800, 300]"
        layout="colaForceDirected"
        [links]="[
          {
            id: 'a',
            source: '1',
            target: '2'
          }, {
            id: 'b',
            source: '1',
            target: '3'
          }, {
            id: 'c',
            source: '3',
            target: '4'
          }, {
            id: 'd',
            source: '3',
            target: '5'
          }, {
            id: 'e',
            source: '4',
            target: '5'
          }, {
            id: 'f',
            source: '2',
            target: '6'
          }
        ]"
        [nodes]="[
          {
            id: '1',
            label: 'Node A'
          }, {
            id: '2',
            label: 'Node B'
          }, {
            id: '3',
            label: 'Node C'
          }, {
            id: '4',
            label: 'Node D'
          }, {
            id: '5',
            label: 'Node E'
          }, {
            id: '6',
            label: 'Node F'
          }
        ]"
      ></ngx-graph>
       `
    },
    language: 'html',
    type: 'auto'
  }
};
ColaForceDirected.tags = ['!dev'];

type ClusterStory = StoryObj<ColaClusterLayoutComponent>;

// More on interaction testing: https://storybook.js.org/docs/writing-tests/interaction-testing
export const ColaClusterForceDirected: ClusterStory = {};
ColaClusterForceDirected.parameters = {
  docs: {
    source: {
      code: `
<ngx-graph
        [view]="[800, 500]"
        layout="colaForceDirected"
        [links]="[
          {
            id: 'a',
            source: '1',
            target: '2'
          }, {
            id: 'b',
            source: '1',
            target: '3'
          }, {
            id: 'c',
            source: '3',
            target: '4'
          }, {
            id: 'd',
            source: '3',
            target: '5'
          }, {
            id: 'e',
            source: '4',
            target: '5'
          }, {
            id: 'f',
            source: '2',
            target: '6'
          }
        ]"
        [nodes]="[
          {
            id: '1',
            label: 'Node A'
          }, {
            id: '2',
            label: 'Node B'
          }, {
            id: '3',
            label: 'Node C'
          }, {
            id: '4',
            label: 'Node D'
          }, {
            id: '5',
            label: 'Node E'
          }, {
            id: '6',
            label: 'Node F'
          }
        ]"
        [clusters]="[
          {
            id: 'cluster0',
            label: 'Cluster node',
            childNodeIds: ['2', '3']
          }
        ]"
      ></ngx-graph>
       `
    },
    language: 'html',
    type: 'auto'
  }
};
ColaClusterForceDirected.tags = ['!dev'];

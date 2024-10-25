import type { Meta, StoryObj } from '@storybook/angular';
// import { expect, userEvent, within } from '@storybook/test';

import { GraphIntroComponent } from './introduction.component';

const meta: Meta<GraphIntroComponent> = {
  title: 'Introduction',
  component: GraphIntroComponent,
  parameters: {
    // More on how to position stories at: https://storybook.js.org/docs/configure/story-layout
    layout: 'fullscreen'
  }
};

export default meta;
type Story = StoryObj<GraphIntroComponent>;

// More on interaction testing: https://storybook.js.org/docs/writing-tests/interaction-testing
export const GettingStarted: Story = {};
GettingStarted.parameters = {
  docs: {
    source: {
      code: `
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
       </ngx-graph>`
    },
    language: 'html',
    type: 'auto'
  }
};
GettingStarted.tags = ['!dev'];

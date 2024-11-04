import type { Meta, StoryObj } from '@storybook/angular';
// import { fn } from '@storybook/test';

import { NgxGraphMSAGLComponent } from './ngx-graph-msagl.component';

const meta: Meta<NgxGraphMSAGLComponent> = {
  title: 'Example/NgxGraphMSAGLComponent',
  component: NgxGraphMSAGLComponent,
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ['autodocs'],
  parameters: {
    // More on how to position stories at: https://storybook.js.org/docs/configure/story-layout
    layout: 'fullscreen'
  },
  args: {}
};

export default meta;
type Story = StoryObj<NgxGraphMSAGLComponent>;

export const MSAGL: Story = {
  args: {}
};

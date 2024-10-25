import type { Meta, StoryObj } from '@storybook/angular';
// import { fn } from '@storybook/test';

import { NgxGraphCustomCurve } from './ngx-graph-custom-curve.component';

const meta: Meta<NgxGraphCustomCurve> = {
  title: 'Example/NgxGraphCustomCurveComponent',
  component: NgxGraphCustomCurve,
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ['autodocs'],
  parameters: {
    // More on how to position stories at: https://storybook.js.org/docs/configure/story-layout
    layout: 'fullscreen'
  },
  args: {}
};

export default meta;
type Story = StoryObj<NgxGraphCustomCurve>;

export const CustomCurve: Story = {
  args: {}
};

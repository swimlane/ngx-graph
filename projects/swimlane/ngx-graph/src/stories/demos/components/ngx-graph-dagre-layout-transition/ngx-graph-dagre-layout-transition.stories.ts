import type { Meta, StoryObj } from '@storybook/angular';

import { NgxGraphDagreLayoutTransitionDemoComponent } from './ngx-graph-dagre-layout-transition.component';

const meta: Meta<NgxGraphDagreLayoutTransitionDemoComponent> = {
  title: 'Example/NgxGraphDagreLayoutTransition',
  component: NgxGraphDagreLayoutTransitionDemoComponent,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `**Dagre** graph toggling rank direction (TB ↔ LR) with **transitionAfterChanges** (\`full\` scope, \`durationMs: 2000\`) so nodes and edges tween over two seconds on re-layout. The viewport is sized so both orientations fit.

**animate** is off so the host enter animation does not run; use **transitionAfterChanges** for interpolation on model updates.`
      }
    }
  }
};

export default meta;
type Story = StoryObj<NgxGraphDagreLayoutTransitionDemoComponent>;

export const DagreLayoutTransition: Story = {};

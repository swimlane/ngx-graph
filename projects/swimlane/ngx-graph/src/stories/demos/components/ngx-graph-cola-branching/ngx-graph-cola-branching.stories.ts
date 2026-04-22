import type { Meta, StoryObj } from '@storybook/angular';

import { NgxGraphColaBranchingDemoComponent } from './ngx-graph-cola-branching.component';

const meta: Meta<NgxGraphColaBranchingDemoComponent> = {
  title: 'Example/NgxGraphColaBranching',
  component: NgxGraphColaBranchingDemoComponent,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `**Cola branching growth:** add nodes and edges in stages with \`curveLinear\` (straight links between node bounds from Cola) and \`transitionAfterChanges\` (\`{ mode: 'tween', scope: 'additive', durationMs: 0 }\`). After the first segment, each update interpolates from the previous layout. Use **Add segment** or **Auto-play**.`
      }
    }
  }
};

export default meta;
type Story = StoryObj<NgxGraphColaBranchingDemoComponent>;

export const ColaBranching: Story = {};

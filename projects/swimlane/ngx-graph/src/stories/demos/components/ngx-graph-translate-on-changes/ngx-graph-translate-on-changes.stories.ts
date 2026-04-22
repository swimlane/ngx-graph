import type { Meta, StoryObj } from '@storybook/angular';

import { NgxGraphTranslateOnChangesDemoComponent } from './ngx-graph-translate-on-changes.component';

const meta: Meta<NgxGraphTranslateOnChangesDemoComponent> = {
  title: 'Example/NgxGraphTranslateOnChanges',
  component: NgxGraphTranslateOnChangesDemoComponent,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `**Translate-on-changes style behavior** is configured with \`transitionAfterChanges\` (tween, full scope, 2000 ms), not a separate \`translateOnChanges\` input. **Randomize layout** keeps the same graph and only changes Dagre settings so edge paths tween. **New random graph** rebuilds topology; edges may snap when \`(source, target)\` pairs do not match the previous tick.`
      }
    }
  }
};

export default meta;
type Story = StoryObj<NgxGraphTranslateOnChangesDemoComponent>;

export const TranslateOnChanges: Story = {};

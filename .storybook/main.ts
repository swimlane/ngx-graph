import type { StorybookConfig } from '@storybook/angular';
import remarkGfm from 'remark-gfm';

const config: StorybookConfig = {
  stories: [
    '../projects/swimlane/ngx-graph/src/**/*.mdx',
    '../projects/swimlane/ngx-graph/src/**/*.stories.@(js|jsx|mjs|ts|tsx)'
  ],
  addons: [
    '@storybook/addon-onboarding',
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@chromatic-com/storybook',
    '@storybook/addon-interactions',
    {
      name: '@storybook/addon-docs',
      options: {
        mdxPluginOptions: {
          mdxCompileOptions: {
            remarkPlugins: [remarkGfm]
          }
        }
      }
    }
  ],
  framework: {
    name: '@storybook/angular',
    options: {}
  },
  core: {
    builder: '@storybook/builder-webpack5'
  }
};
export default config;

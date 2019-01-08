import { environment } from './environments/environment';
import { NgxGraphModule } from '@swimlane/ngx-graph';

import { docspaRemarkPreset, prism, runtime } from '@swimlane/docspa-remark-preset';
import { NgxChartsModule } from '@swimlane/ngx-charts';

export const config = {
  name: 'NGX-Graph',
  basePath: 'docs/',
  homepage: 'main.md',
  notFoundPage: '_404.md',
  sideLoad: ['_sidebar.md', '_navbar.md', '_sidebar2.md'],
  coverpage: false,
  plugins: [],
  remarkPlugins: [...docspaRemarkPreset, runtime, prism],
  runtimeModules: [NgxGraphModule, NgxChartsModule],
  environment
};

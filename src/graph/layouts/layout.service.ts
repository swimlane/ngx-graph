import { Injectable } from '@angular/core';
import { Layout } from '../../models/layout.model';
import { D3ForceDirectedLayout } from './d3ForceDirected';
import { DagreLayout } from './dagre';
import { DagreNodesOnlyLayout } from './dagreNodesOnly';

const layouts = {
  d3ForceDirected: D3ForceDirectedLayout,
  dagre: DagreLayout,
  dagreNodesOnly: DagreNodesOnlyLayout,
};

@Injectable()
export class LayoutService {
  getLayout(name: string): Layout {
    if (layouts[name]) {
      return new layouts[name]();
    } else {
      throw new Error(`Unknown layout type '${name}'`);
    }
  }
}

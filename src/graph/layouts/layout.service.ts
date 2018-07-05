import { Injectable } from '@angular/core';
import { Layout } from '../../models/layout.model';
import { DagreLayout } from './dagre';

const layouts = {
  dagre: DagreLayout
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

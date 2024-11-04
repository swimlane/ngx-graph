import { Component } from '@angular/core';
import type { Layout } from '@swimlane/ngx-graph';
import { NgxGraphModule } from '@swimlane/ngx-graph';
import { MSAGLLayout } from './msaglLayout';

import * as shape from 'd3-shape';

@Component({
  standalone: true,
  selector: 'ngx-graph-msagl',
  templateUrl: './ngx-graph-msagl.component.html',
  styleUrls: ['./ngx-graph-msagl.component.css'],
  imports: [NgxGraphModule]
})
export class NgxGraphMSAGLComponent {
  public layout: Layout = new MSAGLLayout();
  public curve: any = shape.curveBasis;
}

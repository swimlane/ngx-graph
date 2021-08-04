import { Component } from '@angular/core';
import { Layout } from '@swimlane/ngx-graph';
import { MSAGLLayout } from './msaglLayout';

import * as shape from 'd3-shape';

@Component({
  selector: 'ngx-graph-msagl',
  templateUrl: './ngx-graph-msagl.component.html',
  styleUrls: ['./ngx-graph-msagl.component.scss']
})
export class NgxGraphMSAGLComponent {
  public layout: Layout = new MSAGLLayout();
  public curve: any = shape.curveBasis;
}

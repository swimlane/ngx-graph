import { NgModule } from '@angular/core';
import { BaseModule } from './base/base.module';
import { CommonModule } from '@angular/common';
import { NgxGraphCustomCurve } from './components/ngx-graph-custom-curve/ngx-graph-custom-curve.component';
import { NgxGraphOrgTreeComponent } from './components/ngx-graph-org-tree/ngx-graph-org-tree.component';
import { NgxGraphModule } from '@swimlane/ngx-graph';
import { NgxGraphMSAGLComponent } from './components/ngx-graph-msagl/ngx-graph-msagl.component';

@NgModule({
  imports: [BaseModule, CommonModule, NgxGraphModule],
  declarations: [NgxGraphCustomCurve, NgxGraphOrgTreeComponent, NgxGraphMSAGLComponent],
  exports: [NgxGraphCustomCurve, NgxGraphOrgTreeComponent, NgxGraphMSAGLComponent]
})
export class DemoModule {}

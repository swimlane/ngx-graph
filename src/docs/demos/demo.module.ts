import { NgModule } from '@angular/core';
import { BaseModule } from './base/base.module';
import { CommonModule } from '@angular/common';
import { NgxGraphCustomCurve } from './components/ngx-graph-custom-curve/ngx-graph-custom-curve.component';
import { NgxGraphOrgTreeComponent } from './components/ngx-graph-org-tree/ngx-graph-org-tree.component';
import { NgxGraphModule } from '@swimlane/ngx-graph';
import { NgxChartsModule } from '@swimlane/ngx-charts';

@NgModule({
  imports: [BaseModule,
    CommonModule,
    NgxGraphModule,
    NgxChartsModule
  ],
  declarations: [
    NgxGraphCustomCurve,
    NgxGraphOrgTreeComponent
  ],
  exports: [
    NgxGraphCustomCurve,
    NgxGraphOrgTreeComponent
  ],
})
export class DemoModule {}

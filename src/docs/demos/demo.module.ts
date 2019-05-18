import { NgModule } from '@angular/core';
import { BaseModule } from './base/base.module';
import { NgxGraphCustomCurve } from './components/ngx-graph-custom-curve/ngx-graph-custom-curve.component';
import { NgxGraphModule } from '@swimlane/ngx-graph';

@NgModule({
  imports: [BaseModule,
    NgxGraphModule
  ],
  declarations: [NgxGraphCustomCurve],
  exports: [
    NgxGraphCustomCurve
  ],
})
export class DemoModule {}

import { NgModule } from '@angular/core';
import { GraphModule } from './graph/graph.module';
import { NgxChartsModule } from '@swimlane/ngx-charts';

export * from './models/index';
export * from './graph/graph.component';

@NgModule({
  imports: [NgxChartsModule],
  exports: [GraphModule]
})
export class NgxGraphModule {}

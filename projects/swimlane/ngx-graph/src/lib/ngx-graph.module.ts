import { NgModule } from '@angular/core';
import { GraphModule } from './graph/graph.module';
import { NgxChartsModule } from '@swimlane/ngx-charts';

@NgModule({
  imports: [NgxChartsModule],
  exports: [GraphModule]
})
export class NgxGraphModule {}

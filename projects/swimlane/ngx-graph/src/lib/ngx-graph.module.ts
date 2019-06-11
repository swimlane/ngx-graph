import { NgModule } from '@angular/core';
import { GraphModule } from './graph/graph.module';

export * from './models/index';
export * from './graph/graph.component';

@NgModule({
  imports: [],
  exports: [GraphModule]
})
export class NgxGraphModule {}

import { NgModule } from '@angular/core';
import { GraphModule } from './graph/graph.module';

export * from './models/index';

@NgModule({
  exports: [GraphModule]
})
export class NgxGraphModule {}

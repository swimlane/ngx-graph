import { NgModule } from '@angular/core';
import { GraphModule } from './graph/graph.module';

@NgModule({
  exports: [
    GraphModule
  ]
})
export class NgxGraphModule {}

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GraphModule } from './graph/graph.module';

@NgModule({
  imports: [CommonModule],
  exports: [GraphModule]
})
export class NgxGraphModule {}

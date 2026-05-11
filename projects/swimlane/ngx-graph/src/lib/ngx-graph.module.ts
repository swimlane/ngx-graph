import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GraphModule } from './graph/graph.module';

/**
 * @deprecated `GraphComponent` is now standalone. Import it directly into your component's
 * `imports` array instead of importing `NgxGraphModule`.
 */
@NgModule({
  imports: [CommonModule, GraphModule],
  exports: [GraphModule]
})
export class NgxGraphModule {}

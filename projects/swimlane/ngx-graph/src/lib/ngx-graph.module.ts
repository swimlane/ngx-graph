import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GraphModule } from './graph/graph.module';
import { LayoutService } from '@swimlane/ngx-graph/lib/graph/layouts/layout.service';

@NgModule({
  imports: [CommonModule],
  exports: [GraphModule],
  providers: [LayoutService]
})
export class NgxGraphModule {}

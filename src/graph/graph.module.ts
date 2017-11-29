import { NgModule } from '@angular/core';
import { GraphComponent } from './graph.component';
import { ChartCommonModule } from '@swimlane/ngx-charts';
import { MouseWheelDirective } from './mouse-wheel.directive';
export { GraphComponent };

@NgModule({
  imports: [ChartCommonModule],
  declarations: [
    GraphComponent,
    MouseWheelDirective
  ],
  exports: [
    GraphComponent,
    MouseWheelDirective
  ]
})
export class GraphModule {}

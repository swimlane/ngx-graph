import { NgModule } from '@angular/core';
import { DirectedGraphComponent } from './directed-graph.component';
import { ChartCommonModule } from '@swimlane/ngx-charts';
import { MouseWheelDirective } from './mouse-wheel.directive';
export { DirectedGraphComponent };

@NgModule({
  imports: [ChartCommonModule],
  declarations: [
    DirectedGraphComponent,
    MouseWheelDirective
  ],
  exports: [
    DirectedGraphComponent,
    MouseWheelDirective
  ]
})
export class DirectedGraphModule {}

import { NgModule } from '@angular/core';
import { GraphComponent } from './graph.component';
import { MouseWheelDirective } from './mouse-wheel.directive';
import { CommonModule } from '@angular/common';
import { VisibilityObserver } from '../utils/visibility-observer';
export { GraphComponent, LayoutService };

@NgModule({
  imports: [CommonModule],
  declarations: [GraphComponent, MouseWheelDirective, VisibilityObserver],
  exports: [GraphComponent, MouseWheelDirective],
  providers: []
})
export class GraphModule {}

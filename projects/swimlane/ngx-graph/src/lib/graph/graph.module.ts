import { NgModule } from '@angular/core';
import { GraphComponent } from './graph.component';
import { MouseWheelDirective } from './mouse-wheel.directive';
import { LayoutService } from './layouts/layout.service';
import { CommonModule } from '@angular/common';
import { VisibilityObserver } from '../utils/visibility-observer';
export { GraphComponent };

@NgModule({
  imports: [CommonModule],
  declarations: [GraphComponent, MouseWheelDirective, VisibilityObserver],
  exports: [GraphComponent, MouseWheelDirective],
  providers: [LayoutService]
})
export class GraphModule {}

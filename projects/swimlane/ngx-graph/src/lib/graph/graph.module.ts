import { NgModule } from '@angular/core';
import { GraphComponent } from './graph.component';
import { MouseWheelDirective } from './mouse-wheel.directive';
import { LayoutService } from './layouts/layout.service';
import { CommonModule } from '@angular/common';
import { VisibilityObserver } from '../utils/visibility-observer';
export { GraphComponent, LayoutService };

/**
 * @deprecated `GraphComponent`, `MouseWheelDirective`, and `VisibilityObserver` are now standalone.
 * Import them directly into your component's `imports` array instead of importing this module.
 */
@NgModule({
  imports: [CommonModule, GraphComponent, MouseWheelDirective, VisibilityObserver],
  exports: [GraphComponent, MouseWheelDirective],
  providers: [LayoutService]
})
export class GraphModule {}

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GraphComponent } from './graph.component';
import { MouseWheelDirective } from '../directives/mouse-wheel.directive';
import { TooltipDirective } from '../directives/tooltip.directive';
import { LayoutService } from './layouts/layout.service';
import { GraphLegendComponent } from './graph-legend/graph-legend.component';
import { GraphLegendEntryComponent } from './graph-legend-entry/graph-legend-entry.component';
import { GraphScaleLegendComponent } from './graph-scale-legend/graph-scale-legend.component';
import { GraphWrapperComponent } from './graph-wrapper/graph-wrapper.component';
import { TooltipContentComponent } from './tooltip/tooltip.component';
import { TooltipService } from '../services/tooltip.service';
import { InjectionService } from '../services/injection.service';

export { GraphComponent };

@NgModule({
  imports: [CommonModule],
  declarations: [
    GraphComponent,
    GraphLegendComponent,
    GraphLegendEntryComponent,
    GraphScaleLegendComponent,
    GraphWrapperComponent,
    MouseWheelDirective,
    TooltipDirective,
    TooltipContentComponent,
  ],
  exports: [GraphComponent, MouseWheelDirective, TooltipDirective],
  providers: [InjectionService, LayoutService, TooltipService]
})
export class GraphModule {}

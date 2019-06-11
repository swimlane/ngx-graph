import {
  Component, Input, OnChanges, ViewContainerRef, ChangeDetectionStrategy, EventEmitter,
  Output, SimpleChanges
} from '@angular/core';
import {
  trigger,
  style,
  animate,
  transition
} from '@angular/animations';
import { TooltipService } from '../../services/tooltip.service';

@Component({
  providers: [TooltipService],
  selector: 'ngx-graph-wrapper',
  templateUrl: './graph-wrapper.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('animationState', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('500ms 100ms', style({ opacity: 1 }))
      ])
    ])
  ]
})
export class GraphWrapperComponent implements OnChanges {

  @Input() view;
  @Input() showLegend = false;
  @Input() legendOptions: any;

  // remove
  @Input() data;
  @Input() legendData;
  @Input() legendType: any;
  @Input() colors: any;
  @Input() activeEntries: any[];
  @Input() animations: boolean = true;

  @Output() legendLabelClick: EventEmitter<any> = new EventEmitter();
  @Output() legendLabelActivate: EventEmitter<any> = new EventEmitter();
  @Output() legendLabelDeactivate: EventEmitter<any> = new EventEmitter();

  chartWidth: any;
  title: any;
  legendWidth: any;

  constructor(
    private vcr: ViewContainerRef,
    private tooltipService: TooltipService) {
    this.tooltipService.injectionService.setRootViewContainer(this.vcr);
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.update();
  }

  update(): void {
    let legendColumns = 0;
    if (this.showLegend) {
      this.legendType = this.getLegendType();

      if (this.legendType === 'scaleLegend') {
        legendColumns = 1;
      } else {
        legendColumns = 2;
      }
    }

    const chartColumns = 12 - legendColumns;

    this.chartWidth = ~~(this.view[0] * chartColumns / 12.0);
    this.legendWidth = ~~(this.view[0] * legendColumns / 12.0);
  }

  getLegendType(): string {
    if (this.legendOptions.scaleType === 'linear') {
      return 'scaleLegend';
    } else {
      return 'legend';
    }
  }

}
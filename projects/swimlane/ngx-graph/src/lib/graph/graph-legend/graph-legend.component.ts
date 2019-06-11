import {
  Component, Input, ChangeDetectionStrategy, Output, EventEmitter,
  SimpleChanges, OnChanges, ChangeDetectorRef, ViewEncapsulation
 } from '@angular/core';
import { formatLabel } from '../../utils/label-helper';

@Component({
  selector: 'ngx-graph-legend',
  templateUrl: './graph-legend.component.html',
  styleUrls: ['./graph-legend.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GraphLegendComponent implements OnChanges {

  @Input() data;
  @Input() title;
  @Input() colors;
  @Input() height;
  @Input() width;
  @Input() activeEntries;
  @Input() horizontal = false;

  @Output() labelClick: EventEmitter<any> = new EventEmitter();
  @Output() labelActivate: EventEmitter<any> = new EventEmitter();
  @Output() labelDeactivate: EventEmitter<any> = new EventEmitter();

  legendEntries: any[] = [];

  constructor(private cd: ChangeDetectorRef) { }

  ngOnChanges(changes: SimpleChanges): void {
    this.update();
  }

  update(): void {
    this.cd.markForCheck();
    this.legendEntries = this.getLegendEntries();
  }

  getLegendEntries(): any[] {
    const items = [];

    for(const label of this.data) {
      const formattedLabel = formatLabel(label);

      const idx = items.findIndex((i) => {
        return i.label === formattedLabel;
      });

      if (idx === -1) {
        items.push({
          label,
          formattedLabel,
          color: this.colors.getColor(label)
        });
      }
    }

    return items;
  }

  isActive(entry): boolean {
    if(!this.activeEntries) return false;
    const item = this.activeEntries.find(d => {
      return entry.label === d.name;
    });
    return item !== undefined;
  }

  activate(item) {
    this.labelActivate.emit(item);
  }

  deactivate(item) {
    this.labelDeactivate.emit(item);
  }

  trackBy(index, item): string {
    return item.label;
  }

}

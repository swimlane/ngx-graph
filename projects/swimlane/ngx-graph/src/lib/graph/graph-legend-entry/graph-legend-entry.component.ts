import {
  Component, 
  Input, 
  Output, 
  ChangeDetectionStrategy,   
  HostListener,
  EventEmitter
 } from '@angular/core';

@Component({
  selector: 'ngx-charts-legend-entry',
  templateUrl: './graph-legend-entry.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GraphLegendEntryComponent {

  @Input() color: string;
  @Input() label: any;
  @Input() formattedLabel: string;
  @Input() isActive: boolean = false;

  @Output() select: EventEmitter<any> = new EventEmitter();
  @Output() activate: EventEmitter<any> = new EventEmitter();
  @Output() deactivate: EventEmitter<any> = new EventEmitter();
  @Output() toggle: EventEmitter<any> = new EventEmitter();

  get trimmedLabel(): string {
    return this.formattedLabel || '(empty)';
  }

  @HostListener('mouseenter')
  onMouseEnter(): void {
    this.activate.emit({name: this.label});
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    this.deactivate.emit({name: this.label});
  }

}
import {
  Component, Input, OnChanges, ChangeDetectionStrategy, SimpleChanges, ViewEncapsulation
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'ngx-graph-scale-legend',
  templateUrl: 'graph-scale-legend.component.html',
  styleUrls: ['./graph-scale-legend.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GraphScaleLegendComponent implements OnChanges {

  @Input() valueRange;
  @Input() colors;
  @Input() height;
  @Input() width;
  @Input() horizontal = false;

  gradient: any;

  constructor(private sanitizer: DomSanitizer) { }

  ngOnChanges(changes: SimpleChanges): void {
    const gradientValues = this.gradientString(this.colors.range(), this.colors.domain());
    const direction = (this.horizontal) ? 'right' : 'bottom';
    this.gradient = this.sanitizer.bypassSecurityTrustStyle(`linear-gradient(to ${direction}, ${gradientValues})`);
  }

  /**
   * Generates the string used in the gradient stylesheet properties
   * @param  {array} colors array of colors
   * @param  {array} splits array of splits on a scale of (0, 1)
   * @return {string}
   */
  gradientString(colors, splits): string {
    // add the 100%
    splits.push(1);
    const pairs = [];
    colors.reverse().forEach((c, i) => {
      pairs.push(`${c} ${Math.round(splits[i] * 100)}%`);
    });

    return pairs.join(', ');
  }

}
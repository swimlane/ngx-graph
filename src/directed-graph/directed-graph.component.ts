import {
  Component,
  ContentChild,
  ContentChildren,
  ElementRef,
  HostListener,
  Input,
  TemplateRef,
  ViewChild,
  ViewChildren,
  Output,
  ViewEncapsulation,
  EventEmitter,
  ChangeDetectionStrategy,
  trigger,
  style,
  transition,
  animate,
  QueryList
} from '@angular/core';

import {
  BaseChartComponent,
  ChartComponent,
  calculateViewDimensions,
  ViewDimensions,
  ColorHelper
} from '@swimlane/ngx-charts';

import { id } from '../utils';

import d3 from '../d3';
import * as dagre from 'dagre';

@Component({
  selector: 'ngx-charts-directed-graph',
  template: `
    <ngx-charts-chart
      [view]="[width, height]"
      [showLegend]="legend"
      [legendOptions]="legendOptions"
      (legendLabelClick)="onClick($event)"
      (legendLabelActivate)="onActivate($event)"
      (legendLabelDeactivate)="onDeactivate($event)"
      mouse-wheel (mouseWheelUp)="zoom($event, 'in')" (mouseWheelDown)="zoom($event, 'out')">
      <svg:g *ngIf="initialized" [attr.transform]="transform" class="directed-graph chart">

        <defs>
          <template *ngIf="defsTemplate"
            [ngTemplateOutlet]="defsTemplate">
          </template>
        </defs>

        <svg:rect
          class="panning-rect"
          [attr.width]="dims.width * 100"
          [attr.height]="dims.height * 100"
          [attr.transform]="'translate(' + (-dims.width * 50) +',' + (-dims.height*50) + ')' "
          (mousedown)="isPanning = true"
        />

        <svg:g class="links">
          <svg:g *ngFor="let link of _links; trackBy:trackLinkBy"
            class="link-group"
            #linkElement
            [id]="link.id">
            <template *ngIf="linkTemplate"
              [ngTemplateOutlet]="linkTemplate"
              [ngOutletContext]="{ $implicit: link }">
            </template>
            <svg:path *ngIf="!linkTemplate"
              class="edge"
              [attr.d]="link.line"
            />
          </svg:g>
        </svg:g>

        <svg:g class="nodes">
          <svg:g *ngFor="let node of _nodes; trackBy:trackNodeBy"
            class="node-group"
            #nodeElement
            [id]="node.id"
            [style.transform]="node.options.transform"
            (click)="onClick(node)">
            <template *ngIf="nodeTemplate"
              [ngTemplateOutlet]="nodeTemplate"
              [ngOutletContext]="{ $implicit: node }">
            </template>
            <svg:circle *ngIf="!nodeTemplate"
              r="10"
              [attr.cx]="node.width / 2"
              [attr.cy]="node.height / 2"
              [attr.fill]="node.options.color" />
          </svg:g>
        </svg:g>
      </svg:g>
    </ngx-charts-chart>

  `,
  styleUrls: [
    './directed-graph.component.scss'
  ],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('link', [
      transition('* => *', [
        animate(500, style({transform: '*'}))
      ])
    ])
  ]
})
export class DirectedGraphComponent extends BaseChartComponent {

  @Input() legend: boolean;
  @Input() nodes: any[] = [];
  @Input() links: any[] = [];
  @Input() activeEntries: any[] = [];
  @Input() zoomLevel: number = 1;
  @Input() panOffset: any = {x: 0, y: 0};
  @Input() orientation: string = 'LR';
  @Input() curve: any;

  @Output() activate: EventEmitter<any> = new EventEmitter();
  @Output() deactivate: EventEmitter<any> = new EventEmitter();

  @ContentChild('linkTemplate') linkTemplate: TemplateRef<any>;
  @ContentChild('nodeTemplate') nodeTemplate: TemplateRef<any>;
  @ContentChild('defsTemplate') defsTemplate: TemplateRef<any>;
  @ViewChild(ChartComponent, { read: ElementRef }) chart: ElementRef;

  @ViewChildren('nodeElement') nodeElements: QueryList<ElementRef>;
  @ViewChildren('linkElement') linkElements: QueryList<ElementRef>;

  colors: ColorHelper;
  dims: ViewDimensions;
  margin = [0, 0, 0, 0];
  results = [];
  seriesDomain: any;
  transform: string;
  legendOptions: any;
  isPanning: boolean = false;
  initialized: boolean = false;
  graph: any;
  graphDims: any = {width: 0, height: 0};
  _nodes: any[];
  _links: any[];
  _oldLinks: any[] = [];

  @Input() groupResultsBy: (node: any) => string = node => node.label;

  update(): void {
    super.update();

    this.zone.run(() => {
      this.dims = calculateViewDimensions({
        width: this.width,
        height: this.height,
        margins: this.margin,
        showLegend: this.legend,
      });

      this.seriesDomain = this.getSeriesDomain();
      this.setColors();
      this.legendOptions = this.getLegendOptions();

      this.createGraph();
      this.updateTransform();
      this.initialized = true;
    });
  }

  ngAfterViewInit() {
    super.ngAfterViewInit();
    setTimeout(() => {
      this.update();
    });
  }

  draw() {
    if (this.nodeElements && this.nodeElements.length) {
      this.nodeElements.map(elem => {
        let nativeElement = elem.nativeElement;
        let node = this._nodes.find(n => n.id === nativeElement.id);

        let dims = nativeElement.getBBox();
        node.height = dims.height;

        if (nativeElement.getElementsByTagName('text').length) {
          let textDims = nativeElement.getElementsByTagName('text')[0].getBBox();
          node.width = textDims.width + 20;
        } else {
          node.width = dims.width;
        }
      });
    }

    dagre.layout(this.graph);

    let index = {};
    this._nodes.map(n => {
      index[n.id] = n;

      n.options = {
        color: this.colors.getColor(this.groupResultsBy(n)),
        transform: `translate( ${n.x - n.width / 2}px, ${n.y - n.height / 2}px)`
      };
    });

    let newLinks = [];

    for (let k in this.graph._edgeLabels) {
      let l = this.graph._edgeLabels[k];

      let normKey = k.replace(/[^\w]*/g, '');
      let oldLink = this._oldLinks.find(ol => `${ol.source}${ol.target}` === normKey);
      if (!oldLink) {
        oldLink = this._links.find(nl => `${nl.source}${nl.target}` === normKey)
      }

      oldLink.oldLine = oldLink.line;

      let points = l.points;
      let line = this.generateLine(points);

      let newLink = Object.assign({}, oldLink);
      newLink.line = line;
      if (!newLink.oldLine) {
        newLink.oldLine = newLink.line;
      }

      newLinks.push(newLink);
    }

    this._links = newLinks;

    if (this._links){
      this._oldLinks = this._links.map(l => {
        let newL =  Object.assign({}, l);
        newL.oldLine = l.line;
        return newL;
      });
    }

    this.graphDims.width = Math.max(...this._nodes.map(n => n.x));
    this.graphDims.height = Math.max(...this._nodes.map(n => n.y));

    setTimeout(() => {
      this.linkElements.map(linkEl => {
        let l = this._links.find(lin => lin.id === linkEl.nativeElement.id);

        if (l) {
          let linkSelection = d3.select(linkEl.nativeElement).select('path');

          linkSelection
            .attr('d', l.oldLine)
            .transition()
            .duration(500)
            .attr('d', l.line);
        }
      });
    });

    this.cd.markForCheck();
  }

  createGraph() {
    this.graph = new dagre.graphlib.Graph();
    this.graph.setGraph({
      rankdir: this.orientation,
      marginx: 20,
      marginy: 20,
      // acyclicer: 'greedy',
      edgesep: 100,
      ranksep: 100,
      // ranker: 'longest-path'
    });

    // Default to assigning a new object as a label for each new edge.
    this.graph.setDefaultEdgeLabel(() => { return {}; });

    this._nodes = this.nodes.map(n => {
      return Object.assign({}, n);
    });

    this._links = this.links.map(l => {
      let newLink = Object.assign({}, l);

      if (!newLink.id) {
        newLink.id = id();
      }

      return newLink;
    });

    for (let node of this._nodes) {
      node.width = 20;
      node.height = 30;
      this.graph.setNode(node.id, node);

      node.options = {
        color: this.colors.getColor(this.groupResultsBy(node)),
        transform: `translate( ${node.x - node.width / 2}, ${node.y - node.height / 2})`
      };
    }

    for (let edge of this._links) {
      this.graph.setEdge(edge.source, edge.target);
    }

    setTimeout(() => { this.draw(); }, 0);
  }

  generateLine(points, interpolation = 'linear') {
    let lineFunction = d3.line().x(d => d.x).y(d => d.y).curve(this.curve);
    return lineFunction(points);
  }

  zoom($event: MouseEvent, direction) {
    if (direction === 'in') {
      this.zoomLevel += 0.1;
    } else {
      this.zoomLevel -= 0.1;
    }

    this.zoomLevel = Math.max(this.zoomLevel, 0.1);
    this.zoomLevel = Math.min(this.zoomLevel, 4.0);

    this.updateTransform();
  }

  pan(event) {
    if (this.isPanning) {
      this.panOffset.x += event.movementX;
      this.panOffset.y += event.movementY;

      this.updateTransform();
    }
  }

  updateTransform() {
    this.transform = `
      translate(${ this.panOffset.x }, ${ this.panOffset.y }) scale(${this.zoomLevel})
    `;
  }

  onClick(data, node): void {
    this.select.emit(data);
  }

  onActivate(event): void {
    if(this.activeEntries.indexOf(event) > -1) return;
    this.activeEntries = [ event, ...this.activeEntries ];
    this.activate.emit({ value: event, entries: this.activeEntries });
  }

  onDeactivate(event): void {
    const idx = this.activeEntries.indexOf(event);

    this.activeEntries.splice(idx, 1);
    this.activeEntries = [...this.activeEntries];

    this.deactivate.emit({ value: event, entries: this.activeEntries });
  }

  getSeriesDomain(): any[] {
    return this.nodes.map(d => this.groupResultsBy(d))
      .reduce((nodes: any[], node): any[] => nodes.includes(node) ? nodes : nodes.concat([node]), [])
      .sort();
  }

  trackLinkBy(index, link): any {
    return link.id;
  }

  trackNodeBy(index, node): any {
    return node.id;
  }

  setColors(): void {
    this.colors = new ColorHelper(this.scheme, 'ordinal', this.seriesDomain, this.customColors);
  }

  getLegendOptions() {
    return {
      scaleType: 'ordinal',
      domain: this.seriesDomain,
      colors: this.colors
    };
  }

  @HostListener('document:mousemove', ['$event'])
  mousemove($event: MouseEvent): void {
    this.pan($event);
  }

  @HostListener('document:mouseup')
  mouseup(node, $event: MouseEvent): void {
    this.isPanning = false;
  }
}

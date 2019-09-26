import { Component, ViewChild, HostListener, ChangeDetectorRef } from '@angular/core';
import { Layout, Edge, Node, ClusterNode } from '@swimlane/ngx-graph';
import { DagreNodesOnlyLayout } from './customDagreNodesOnly'
import { stepRound } from './customStepCurved';
import { GraphComponent } from '../../../../../projects/swimlane/ngx-graph/src/public_api';
import * as shape from 'd3-shape';

interface IHierarchialGraph {
  nodes: Node[];
  links: Edge[];
}

enum KEY_CODE {
  DOWN_ARROW = 40,
  RIGHT_ARROW = 39,
  UP_ARROW = 38,
  LEFT_ARROW = 37
}


@Component({
  selector: 'ngx-graph-custom-curve',
  templateUrl: './ngx-graph-custom-curve.component.html',
})
export class NgxGraphCustomCurve {

  @ViewChild(GraphComponent, { static: false }) graphEl: GraphComponent;
  public name = 'Angular 5';
  public hierarchialGraph = {
    nodes: [],
    links: [],
  }

  public curve = shape.curveBundle.beta(1);
  // curve = shape.curveLinear;


  // Just to test pan offset
  public panOffsetX: number = 0;
  public panOffsetY: number = 0;
  @HostListener('window:keyup', ['$event'])
  keyEvent(event: KeyboardEvent) {
    console.log(`Key pressed: ${event.keyCode}`);

    // Use a switch to handle keycode.
    if (event.keyCode === KEY_CODE.RIGHT_ARROW) {
      this.movePanning(10, 0);
    }

    if (event.keyCode === KEY_CODE.LEFT_ARROW) {
      this.movePanning(-10, 0);
    }

    if (event.keyCode === KEY_CODE.UP_ARROW) {
      this.movePanning(0, 10);
    }
    if (event.keyCode === KEY_CODE.DOWN_ARROW) {
      this.movePanning(0, -10);
    }
    this.cdr.detectChanges();
  }

  public constructor(private cdr: ChangeDetectorRef) {

  }

  public ngOnInit(): void {
    this.showGraph();
  }

  /** Testing panning offset */
  public movePanning(x, y) {
    // console.log('Panning changed!');
    // console.log('Previous values');
    // console.log(`- X: ${this.graphEl.panOffsetX}, Y: ${this.graphEl.panOffsetY}`);
    // this.panOffsetX = this.graphEl.panOffsetX + x;
    // this.panOffsetY = this.graphEl.panOffsetY + y;
    // console.log('New values');
    // console.log(`- X: ${this.graphEl.panOffsetX}, Y: ${this.graphEl.panOffsetY}`);
  }

  private showGraph() {
    this.hierarchialGraph.nodes = [
      {
        id: 'start',
        label: 'scan',
        title: 'x0'
      }, {
        id: '1',
        label: 'Event#a',
        title: 'x1'
      }, {
        id: '2',
        label: 'Event#x',
        title: 'x2'
      }, {
        id: '3',
        label: 'Event#b',
        title: 'x3'
      }, {
        id: '4',
        label: 'Event#c',
        title: 'x4'
      }, {
        id: '5',
        label: 'Event#y',
        title: 'x5'
      }, {
        id: '6',
        label: 'Event#z',
        title: 'x6'
      }
    ];

    this.hierarchialGraph.links = [
      {
        source: 'start',
        target: '1',
        label: 'Process#1'
      }, {
        source: 'start',
        target: '2',
        label: 'Process#2'
      }, {
        source: '1',
        target: '3',
        label: 'Process#3'
      }, {
        source: '2',
        target: '4',
        label: 'Process#4'
      }, {
        source: '2',
        target: '6',
        label: 'Process#6'
      }, {
        source: '3',
        target: '5'
      }
    ];

  }
}

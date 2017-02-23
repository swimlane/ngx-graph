import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import d3 from '../src/d3';

import { colorSets } from '../src/utils/color-sets';
import { countries, generateHierarchialGraph } from './data';
import chartGroups from './chartTypes';
import { id } from '../src/utils/id';

@Component({
  selector: 'app',
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['./app.component.scss'],
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit {

  version = APP_VERSION;

  theme = 'dark';
  chartType = 'directed-graph';
  chartGroups: any;
  chart: any;
  realTimeData: boolean = false;
  countries: any[];
  graph: { links: any[], nodes: any[] };
  hierarchialGraph: { links: any[], nodes: any[] };

  view: any[];
  width: number = 700;
  height: number = 300;
  fitContainer: boolean = true;

  // options
  showLegend = false;

  colorSets: any;
  colorScheme: any;
  schemeType: string = 'ordinal';
  selectedColorScheme: string;
  rangeFillOpacity: number = 0.15;

  constructor() {
    Object.assign(this, {
      countries,
      colorSets,
      chartGroups,
      hierarchialGraph: generateHierarchialGraph(),
    });

    this.setColorScheme('picnic');
  }

  ngOnInit() {
    this.selectChart(this.chartType);

    setInterval(this.updateData.bind(this), 1000);

    if (!this.fitContainer) {
      this.applyDimensions();
    }
  }

  updateData() {
    if (!this.realTimeData) {
      return;
    }

    const country = this.countries[Math.floor(Math.random() * this.countries.length)];
    const add = Math.random() < 0.7;
    const remove = Math.random() < 0.5;

    if (add) {
      // directed graph

      let hNode = {
        id: id(),
        label: country
      };

      this.hierarchialGraph.nodes.push(hNode);

      this.hierarchialGraph.links.push({
        source: this.hierarchialGraph.nodes[Math.floor(Math.random() * (this.hierarchialGraph.nodes.length - 1))].id,
        target: hNode.id
      });

      this.hierarchialGraph.links = [...this.hierarchialGraph.links];
      this.hierarchialGraph.nodes = [...this.hierarchialGraph.nodes];
    }
  }

  applyDimensions() {
    this.view = [this.width, this.height];
  }

  toggleFitContainer(event) {
    this.fitContainer = event;

    if (this.fitContainer) {
      this.view = undefined;
    } else {
      this.applyDimensions();
    }
  }

  selectChart(chartSelector) {
    this.chartType = chartSelector;

    for (const group of this.chartGroups) {
      for (const chart of group.charts) {
        if (chart.selector === chartSelector) {
          this.chart = chart;
          return;
        }
      }
    }
  }

  select(data) {
    console.log('Item clicked', data);
  }

  setColorScheme(name) {
    this.selectedColorScheme = name;
    this.colorScheme = this.colorSets.find(s => s.name === name);
  }

  onLegendLabelClick(entry) {
    console.log('Legend clicked', entry);
  }

  toggleExpand(node) {
    console.log('toggle expand', node);
  }

}

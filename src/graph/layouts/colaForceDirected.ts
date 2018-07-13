import { Layout } from '../../models/layout.model';
import { Graph } from '../../models/graph.model';
import { Node, ClusterNode } from '../../models/node.model';
import { id } from '../../utils';
import {
  d3adaptor, ID3StyleLayoutAdaptor, Layout as ColaLayout, Group, InputNode, Link, GraphNode, Rectangle,
} from 'webcola';
import * as d3Dispatch from 'd3-dispatch';
import * as d3Force from 'd3-force';
import * as d3Timer from 'd3-timer';
import { Edge } from '../..';
import { Observable, Subject } from 'rxjs';
import { ViewDimensions } from '@swimlane/ngx-charts';

export interface ColaForceDirectedSettings {
  force?: ColaLayout & ID3StyleLayoutAdaptor;
  viewDimensions?: ViewDimensions;
}
export interface ColaGraph {
  groups: Group[];
  nodes: InputNode[];
  links: Array<Link<number>>;
}
export function toNode(nodes: InputNode[], nodeRef: InputNode | number): InputNode {
  if (typeof nodeRef === 'number') {
    return nodes[nodeRef];
  }
  return nodeRef;
}

export class ColaForceDirectedLayout implements Layout {
  defaultSettings: ColaForceDirectedSettings = {
    force: d3adaptor({
      ...d3Dispatch,
      ...d3Force,
      ...d3Timer,
    })
      .linkDistance(150)
      .avoidOverlaps(true),
    viewDimensions: {
      width: 600,
      height: 600,
      xOffset: 0,
    }
  };
  settings: ColaForceDirectedSettings = {};

  inputGraph: Graph;
  outputGraph: Graph;
  internalGraph: ColaGraph;
  outputGraph$: Subject<Graph> = new Subject();

  draggingStart: { x: number, y: number };

  run(graph: Graph): Observable<Graph> {
    console.log(graph);
    this.inputGraph = graph;
    if (!this.inputGraph.clusters) {
      this.inputGraph.clusters = [];
    }
    this.internalGraph = {
      nodes: [...this.inputGraph.nodes.map(n => ({
        ...n,
        width: n.dimension ? n.dimension.width : 20,
        height: n.dimension ? n.dimension.height : 20,
      }))] as any,
      groups: [...this.inputGraph.clusters.map((cluster): Group => ({
        padding: 5,
        leaves: cluster.childNodeIds.map(nodeId => <any>this.inputGraph.nodes.findIndex(node => node.id === nodeId)),
      }))],
      links: [...this.inputGraph.edges.map(e => ({
        ...e,
        source: this.inputGraph.nodes.findIndex(node => e.source === node.id),
        target: this.inputGraph.nodes.findIndex(node => e.target === node.id),
      }))] as any,
    };
    this.outputGraph = {
      nodes: [],
      clusters: [],
      edges: [],
      edgeLabels: [],
    };
    this.outputGraph$.next(this.outputGraph);
    this.settings = Object.assign({}, this.defaultSettings, this.settings);
    if(this.settings.force) {
      this.settings.force = this.settings.force.nodes(this.internalGraph.nodes)
      .groups(this.internalGraph.groups)
      .links(this.internalGraph.links)
      .alpha(0.5)
        .on('tick', () => {
          this.outputGraph$.next(this.internalGraphToOutputGraph(this.internalGraph));
        });
      if (this.settings.viewDimensions) {
        this.settings.force = this.settings.force.size([
          this.settings.viewDimensions.width,
          this.settings.viewDimensions.height,
        ]);
      }
      this.settings.force.start();
    }

    return this.outputGraph$.asObservable();
  }

  updateEdge(graph: Graph, edge: Edge): Observable<Graph> {
    const settings = Object.assign({}, this.defaultSettings, this.settings);
    if(settings.force) {
      settings.force.start();
    }

    return this.outputGraph$.asObservable();
  }

  internalGraphToOutputGraph(internalGraph: any): Graph {
    this.outputGraph.nodes = internalGraph.nodes.map((node) => ({
      ...node,
      id: node.id || id(),
      position: {
        x: node.x,
        y: node.y,
      },
      dimension: {
        width: node.dimension && node.dimension.width || 20,
        height: node.dimension && node.dimension.height || 20,
      },
      transform: `translate(${
        node.x - (node.dimension && node.dimension.width || 20) / 2 || 0
      }, ${
        node.y - (node.dimension && node.dimension.height || 20) / 2 || 0
      })`,
    }));

    this.outputGraph.edges = internalGraph.links.map((edge) => ({
      ...edge,
      source: (toNode(internalGraph.nodes, edge.source) as any).id,
      target: (toNode(internalGraph.nodes, edge.target) as any).id,
      points: [
        {
          x: toNode(internalGraph.nodes, edge.source).x,
          y: toNode(internalGraph.nodes, edge.source).y,
        },
        {
          x: toNode(internalGraph.nodes, edge.target).x,
          y: toNode(internalGraph.nodes, edge.target).y,
        },
      ]
    }));

    this.outputGraph.clusters = this.internalGraph.groups.map((group, index): ClusterNode => {
      const inputGroup = this.inputGraph.clusters[index];
      return {
        ...inputGroup,
        dimension: {
          width: group.bounds ? group.bounds.width() : 20,
          height: group.bounds ? group.bounds.height() : 20,
        },
        position: {
          x: group.bounds ? (group.bounds.x + group.bounds.width() / 2) : 0,
          y: group.bounds ? (group.bounds.y + group.bounds.height() / 2) : 0,
        }
      };
    });
    this.outputGraph.edgeLabels = this.outputGraph.edges;
    return this.outputGraph;
  }

  onDragStart(draggingNode: Node, $event: MouseEvent): void {
    const nodeIndex = this.outputGraph.nodes.findIndex(foundNode => foundNode.id === draggingNode.id);
    const node = this.internalGraph.nodes[nodeIndex];
    if (!node) {
      return;
    }
    this.draggingStart = { x: node.x - $event.x, y: node.y - $event.y };
    node.fixed = 1;
    this.settings.force.start();
  }

  onDrag(draggingNode: Node, $event: MouseEvent): void {
    if (!draggingNode) return;
    const nodeIndex = this.outputGraph.nodes.findIndex(foundNode => foundNode.id === draggingNode.id);
    const node = this.internalGraph.nodes[nodeIndex];
    if (!node) {
      return;
    }
    node.x = this.draggingStart.x + $event.x;
    node.y = this.draggingStart.y + $event.y;
  }

  onDragEnd(draggingNode: Node, $event: MouseEvent): void {
    if (!draggingNode) return;
    const nodeIndex = this.outputGraph.nodes.findIndex(foundNode => foundNode.id === draggingNode.id);
    const node = this.internalGraph.nodes[nodeIndex];
    if (!node) {
      return;
    }

    this.settings.force.start();
    node.fixed = 0;
  }
}

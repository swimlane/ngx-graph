import { Layout } from '../../models/layout.model';
import { Graph } from '../../models/graph.model';
import { id } from '../../utils';
import * as dagre from 'dagre';

export enum Orientation {
  LEFT_TO_RIGHT = 'LR',
  RIGHT_TO_LEFT = 'RL',
  TOP_TO_BOTTOM = 'TB',
  BOTTOM_TO_TOM = 'BT'
}

export class DagreLayout implements Layout {
  orientation: Orientation = Orientation.LEFT_TO_RIGHT;
  marginX: number = 20;
  marginY: number = 20;
  edgePadding: number = 100;
  rankPadding: number = 100;

  dagreGraph: any;
  dagreNodes: any;
  dagreEdges: any;

  run(graph: Graph): void {
    this.createDagreGraph(graph);
    dagre.layout(this.dagreGraph);

    graph.edgeLabels = this.dagreGraph._edgeLabels;

    for (const dagreNodeId in this.dagreGraph._nodes) {
      const dagreNode = this.dagreGraph._nodes[dagreNodeId];
      const node = graph.nodes.find(n => n.id === dagreNode.id);
      node.position = {
        x: dagreNode.x,
        y: dagreNode.y
      };
      node.dimension = {
        width: dagreNode.width,
        height: dagreNode.height
      };
    }
  }

  createDagreGraph(graph: Graph): any {
    this.dagreGraph = new dagre.graphlib.Graph();
    this.dagreGraph.setGraph({
      rankdir: this.orientation,
      marginx: this.marginX,
      marginy: this.marginY,
      edgesep: this.edgePadding,
      ranksep: this.rankPadding
    });

    // Default to assigning a new object as a label for each new edge.
    this.dagreGraph.setDefaultEdgeLabel(() => {
      return {
        /* empty */
      };
    });

    this.dagreNodes = graph.nodes.map(n => {
      const node: any = Object.assign({}, n);
      node.width = n.dimension.width;
      node.height = n.dimension.height;
      node.x = n.position.x;
      node.y = n.position.y;
      return node;
    });

    this.dagreEdges = graph.edges.map(l => {
      const newLink: any = Object.assign({}, l);
      if (!newLink.id) newLink.id = id();
      return newLink;
    });

    for (const node of this.dagreNodes) {
      if (!node.width) {
        node.width = 20;
      }
      if (!node.height) {
        node.height = 30;
      }

      // update dagre
      this.dagreGraph.setNode(node.id, node);

      // set view options
      node.options = {
        transform: `translate( ${node.x - node.width / 2 || 0}, ${node.y - node.height / 2 || 0})`
      };
    }

    // update dagre
    for (const edge of this.dagreEdges) {
      this.dagreGraph.setEdge(edge.source, edge.target);
    }

    return this.dagreGraph;
  }
}

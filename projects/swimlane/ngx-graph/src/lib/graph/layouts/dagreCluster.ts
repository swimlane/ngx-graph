import { Layout } from '../../models/layout.model';
import { Graph } from '../../models/graph.model';
import { id } from '../../utils/id';
import * as dagre from 'dagre';
import { Edge } from '../../models/edge.model';
import { Node, ClusterNode } from '../../models/node.model';
import { DagreSettings, Orientation } from './dagre';

export class DagreClusterLayout implements Layout {
  defaultSettings: DagreSettings = {
    orientation: Orientation.LEFT_TO_RIGHT,
    marginX: 20,
    marginY: 20,
    edgePadding: 100,
    rankPadding: 100,
    nodePadding: 50,
    multigraph: true,
    compound: true
  };
  settings: DagreSettings = {};

  dagreGraph: any;
  dagreNodes: Node[];
  dagreClusters: ClusterNode[];
  dagreEdges: any;

  run(graph: Graph): Graph {
    this.createDagreGraph(graph);
    dagre.layout(this.dagreGraph);

    graph.edgeLabels = this.dagreGraph._edgeLabels;

    const dagreToOutput = node => {
      const dagreNode = this.dagreGraph._nodes[node.id];
      return {
        ...node,
        position: {
          x: dagreNode.x,
          y: dagreNode.y
        },
        dimension: {
          width: dagreNode.width,
          height: dagreNode.height
        }
      };
    };
    graph.clusters = (graph.clusters || []).map(dagreToOutput);
    graph.nodes = graph.nodes.map(dagreToOutput);

    return graph;
  }

  updateEdge(graph: Graph, edge: Edge): Graph {
    const sourceNode = graph.nodes.find(n => n.id === edge.source);
    const targetNode = graph.nodes.find(n => n.id === edge.target);

    // determine new arrow position
    const dir = sourceNode.position.y <= targetNode.position.y ? -1 : 1;
    const startingPoint = {
      x: sourceNode.position.x,
      y: sourceNode.position.y - dir * (sourceNode.dimension.height / 2)
    };
    const endingPoint = {
      x: targetNode.position.x,
      y: targetNode.position.y + dir * (targetNode.dimension.height / 2)
    };

    // generate new points
    edge.points = [startingPoint, endingPoint];
    return graph;
  }

  createDagreGraph(graph: Graph): any {
    const settings = Object.assign({}, this.defaultSettings, this.settings);
    this.dagreGraph = new dagre.graphlib.Graph({ compound: settings.compound, multigraph: settings.multigraph });
    this.dagreGraph.setGraph({
      rankdir: settings.orientation,
      marginx: settings.marginX,
      marginy: settings.marginY,
      edgesep: settings.edgePadding,
      ranksep: settings.rankPadding,
      nodesep: settings.nodePadding,
      align: settings.align,
      acyclicer: settings.acyclicer,
      ranker: settings.ranker,
      multigraph: settings.multigraph,
      compound: settings.compound
    });

    // Default to assigning a new object as a label for each new edge.
    this.dagreGraph.setDefaultEdgeLabel(() => {
      return {
        /* empty */
      };
    });

    this.dagreNodes = graph.nodes.map((n: Node) => {
      const node: any = Object.assign({}, n);
      node.width = n.dimension.width;
      node.height = n.dimension.height;
      node.x = n.position.x;
      node.y = n.position.y;
      return node;
    });

    this.dagreClusters = graph.clusters || [];

    this.dagreEdges = graph.edges.map(l => {
      const newLink: any = Object.assign({}, l);
      if (!newLink.id) {
        newLink.id = id();
      }
      return newLink;
    });

    for (const node of this.dagreNodes) {
      this.dagreGraph.setNode(node.id, node);
    }

    for (const cluster of this.dagreClusters) {
      this.dagreGraph.setNode(cluster.id, cluster);
      cluster.childNodeIds.forEach(childNodeId => {
        this.dagreGraph.setParent(childNodeId, cluster.id);
      });
    }

    // update dagre
    for (const edge of this.dagreEdges) {
      if (settings.multigraph) {
        this.dagreGraph.setEdge(edge.source, edge.target, edge, edge.id);
      } else {
        this.dagreGraph.setEdge(edge.source, edge.target);
      }
    }

    return this.dagreGraph;
  }
}

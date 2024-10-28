import type { Graph, Layout, Edge } from '@swimlane/ngx-graph';
import {
  Node,
  SugiyamaLayoutSettings,
  interpolateICurve,
  LayerDirectionEnum,
  Size,
  GeomNode,
  CurveFactory,
  layoutGraphWithSugiayma,
  Point
} from 'msagl-js';
import type { GeomGraph, GeomEdge } from 'msagl-js';

const DEFAULT_EDGE_NAME = '\x00';
const EDGE_KEY_DELIM = '\x01';

export class MSAGLLayout implements Layout {
  public run(graph: Graph): Graph {
    const g = this.createGeomGraph(graph);

    const ss = new SugiyamaLayoutSettings();

    ss.layerDirection = LayerDirectionEnum.LR;
    ss.LayerSeparation = 150;
    ss.MinNodeHeight = 100;
    ss.MinNodeWidth = 100;

    g.layoutSettings = ss;
    layoutGraphWithSugiayma(g);

    graph.edgeLabels = [];

    for (const node of g.shallowNodes()) {
      const graphNode = graph.nodes.find(n => n.id === node.id);
      graphNode.position = {
        x: (node as any).center.x,
        y: (node as any).center.y
      };
      graphNode.dimension = {
        width: graphNode.dimension.width,
        height: graphNode.dimension.height
      };
    }

    const geomEdges = Array.from(g.edges());
    for (const edge of graph.edges) {
      this.updateGraphEdge(graph, edge, geomEdges);
    }

    return graph;
  }

  // MSAGL don't support drag
  public updateEdge(graph: Graph, edge: Edge): Graph {
    return graph;
  }

  public setNode(g: GeomGraph, id: string, width: number, height: number, center = new Point(0, 0)): GeomNode {
    let node = g.graph.findNode(id);
    if (node == null) {
      g.graph.addNode((node = new Node(id)));
    }
    const geomNode = new GeomNode(node);
    geomNode.boundaryCurve = CurveFactory.createRectangle(width, height, center);
    return geomNode;
  }

  public createGeomGraph(graph: Graph): GeomGraph {
    const g = GeomGraph.mk('graph', new Size(0, 0));
    graph.nodes.forEach(n => {
      this.setNode(g, n.id, n.dimension.width, n.dimension.height);
    });

    graph.edges.forEach(l => {
      g.setEdge(l.source, l.target);
    });

    return g;
  }

  public updateGraphEdge(graph: Graph, edge: Edge, geomEdges: any): Graph {
    const geoEdge = geomEdges.find(e => e.source.id === edge.source && e.target.id === edge.target);
    edge.points = this.getPointsFromGeoEdge(geoEdge);

    const edgeLabelId = `${edge.source}${EDGE_KEY_DELIM}${edge.target}${EDGE_KEY_DELIM}${DEFAULT_EDGE_NAME}`;
    const matchingEdgeLabel = graph.edgeLabels[edgeLabelId];
    if (matchingEdgeLabel) {
      matchingEdgeLabel.points = edge.points;
    } else {
      graph.edgeLabels[edgeLabelId] = { points: edge.points };
    }
    return graph;
  }

  private getPointsFromGeoEdge(e: GeomEdge): any {
    const result = [];
    const points = interpolateICurve(e.curve, e.curve.end.sub(e.curve.start).length / 20);

    for (let i = 0; i < points.length; i++) {
      result.push({
        ['y']: points[i].y,
        ['x']: points[i].x
      });
    }

    result.push({
      ['y']: e.targetArrowhead.tipPosition.y,
      ['x']: e.targetArrowhead.tipPosition.x
    });

    return result;
  }
}

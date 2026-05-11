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
  Point,
  GeomGraph
} from 'msagl-js';
import type { GeomEdge } from 'msagl-js';

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
      this.updateGraphEdge(edge, geomEdges);
    }

    // Match ELK / GraphComponent.tick array branch: `edgeLabels` must list edges with `points` or tick iterates zero links.
    graph.edgeLabels = graph.edges;

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

  public updateGraphEdge(edge: Edge, geomEdges: GeomEdge[]): void {
    const src = String(edge.source);
    const tgt = String(edge.target);
    const geoEdge = geomEdges.find(e => e.source.id === src && e.target.id === tgt);
    edge.points = geoEdge ? this.getPointsFromGeoEdge(geoEdge) : [];
  }

  private getPointsFromGeoEdge(e: GeomEdge): Array<{ x: number; y: number }> {
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

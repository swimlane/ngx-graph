import { Graph, Layout, Edge } from '@swimlane/ngx-graph';
import { GeomGraph, SugiyamaLayoutSettings, interpolateICurve, LayerDirectionEnum } from 'msagl-js';
import { Rectangle } from 'msagl-js/dist/layoutPlatform/math/geometry/rectangle';
import { layoutGraph } from 'msagl-js/dist/layoutPlatform/layout/driver';

const DEFAULT_EDGE_NAME = '\x00';
const EDGE_KEY_DELIM = '\x01';

export class MSAGLLayout implements Layout {
  public run(graph: Graph): Graph {
    const g = this.createGeomGraph(graph);

    const sl = new SugiyamaLayoutSettings();
    sl.layerDirection = LayerDirectionEnum.LR;
    sl.MinNodeHeight = 100;
    sl.MinNodeWidth = 100;

    layoutGraph(g, null, () => sl);

    graph.edgeLabels = [];

    for (const node of g.shallowNodes()) {
      const graphNode = graph.nodes.find(n => n.id === node.id);
      graphNode.position = {
        x: (node as any).center.x_,
        y: (node as any).center.y_
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

  public createGeomGraph(graph: Graph): GeomGraph {
    const g = GeomGraph.mk('graph', Rectangle.mkEmpty());
    graph.nodes.forEach(n => {
      g.setNode(n.id, { width: n.dimension.width, height: n.dimension.height });
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
      graph.edgeLabels.set(edgeLabelId, { points: edge.points });
    }
    return graph;
  }

  private getPointsFromGeoEdge(e): any {
    const result = [];
    const points = interpolateICurve(e.curve, e.curve.end.sub(e.curve.start).length / 20);

    for (let i = 0; i < points.length; i++) {
      result.push({
        ['y']: points[i].y,
        ['x']: points[i].x
      });
    }

    return result;
  }
}

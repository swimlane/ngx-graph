import { Layout } from '../../models/layout.model';
import { Graph } from '../../models/graph.model';
import { id } from '../../utils/id';
import ELK, { ElkNode } from 'elkjs/lib/elk.bundled';
import { Edge } from '../../models/edge.model';
import { Node } from '../../models/node.model';
import { Observable, Subject } from 'rxjs';
import { NodePosition } from '../../models';

type ModifiedElkNode = ElkNode & Node;

export class ElkLayout implements Layout {
  inputGraph: Graph;
  internalGraph: ElkNode;
  outputGraph: Graph;
  outputGraph$: Subject<Graph> = new Subject();

  run(graph: Graph): Observable<Graph> {
    this.inputGraph = graph;
    console.log('input', graph);
    if (!this.inputGraph.clusters) {
      this.inputGraph.clusters = [];
    }
    this.internalGraph = {
      id: 'dummy',
      children: this.inputGraph.nodes,
      edges: this.inputGraph.edges.map(e => ({ id: e.id, sources: [e.source], targets: [e.target] }))
    };

    this.outputGraph = {
      nodes: [],
      clusters: [],
      edges: [],
      edgeLabels: []
    };
    this.outputGraph$.next(this.outputGraph);
    const elk = this.createGraph(this.internalGraph)
      .then(elkNode => {
        this.outputGraph$.next(this.internalGraphToOutputGraph(elkNode));
      })
      .catch(console.error);

    this.outputGraph = {
      nodes: [],
      clusters: [],
      edges: [],
      edgeLabels: []
    };

    this.outputGraph$.next(this.outputGraph);

    return this.outputGraph$.asObservable();
  }

  internalGraphToOutputGraph(internalGraph: ElkNode): Graph {
    this.outputGraph.nodes = (internalGraph.children as Array<ModifiedElkNode>).map(node => ({
      ...node,
      position: {
        x: node.x,
        y: node.y
      },
      dimension: {
        width: (node.dimension && node.dimension.width) || 20,
        height: (node.dimension && node.dimension.height) || 20
      }
    }));

    this.outputGraph.edges = internalGraph.edges.map(edge => {
      return {
        id: edge.id,
        sections: edge.sections,
        source: edge.sources[0],
        target: edge.targets[0],
        points: [edge.sections[0].startPoint, ...edge.sections[0].bendPoints, edge.sections[0].endPoint]
      };
    });

    this.outputGraph.edgeLabels = this.outputGraph.edges;
    return this.outputGraph;
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

  createGraph(graph: any): Promise<ElkNode> {
    // const settings = Object.assign({}, this.defaultSettings, this.settings);
    const g = {
      ...graph,
      ...{
        properties: {
          'elk.algorithm': 'org.eclipse.elk.layered',
          'elk.spacing.nodeNode': 100,
          'elk.layered.spacing.nodeNodeBetweenLayers': 100,
          'org.eclipse.elk.layered.wrapping.additionalEdgeSpacing': 100,
          'org.eclipse.elk.margins': 20,
          'org.eclipse.elk.padding': 100,
          'org.eclipse.elk.nodeLabels.padding': 100,
          'org.eclipse.elk.spacing.edgeNode': 100,
          'org.eclipse.elk.edgeRouting': 'SPLINES',
          'org.eclipse.elk.layered.nodePlacement.favorStraightEdges': false,
          'org.eclipse.elk.insideSelfLoops.activate': true
        }
      }
    };
    const elk = new ELK();
    return elk.layout(g, {});
  }
}

import { Layout } from '../../models/layout.model';
import { Graph } from '../../models/graph.model';
import { id } from '../../utils/id';
import ELK, { ElkNode, LayoutOptions } from 'elkjs/lib/elk.bundled';
import { Edge } from '../../models/edge.model';
import { Node } from '../../models/node.model';
import { Observable, Subject } from 'rxjs';
import { NodePosition } from '../../models';
import { ViewDimensions } from '../../utils/view-dimensions.helper';

type ModifiedElkNode = ElkNode & Node;

export interface ElkLayoutSettings {
  properties?: LayoutOptions;
  viewDimensions?: ViewDimensions;
}

function createNodeTree(graph: Graph): Array<ElkNode> {
  const { nodes, compoundNodes } = graph;
  const nodeMap = new Map(nodes.map(node => [node.id, { ...node, children: [] }]));
  compoundNodes.forEach(cluster => {
    const parentNode = nodeMap.get(cluster.id);
    if (parentNode) {
      const childNodes = cluster.childNodeIds.map(childId => nodeMap.get(childId)).filter(Boolean);
      (parentNode as any).children = childNodes;
    }
  });
  const rootNodes = nodes.filter(
    node => !compoundNodes.some(compoundNode => compoundNode.childNodeIds.includes(node.id))
  );
  return rootNodes.map(rootNode => nodeMap.get(rootNode.id));
}

export class ElkLayout implements Layout {
  defaultSettings: ElkLayoutSettings = {
    // https://www.eclipse.org/elk/reference/options.html
    properties: {
      'elk.algorithm': 'layered',
      'elk.spacing.nodeNode': '100',
      'elk.layered.spacing.nodeNodeBetweenLayers': '100',
      'org.eclipse.elk.layered.wrapping.additionalEdgeSpacing': '100',
      'org.eclipse.elk.padding': '100',
      'org.eclipse.elk.nodeLabels.padding': '100',
      'org.eclipse.elk.spacing.edgeNode': '100',
      'org.eclipse.elk.edgeRouting': 'SPLINES',
      'org.eclipse.elk.layered.nodePlacement.favorStraightEdges': 'false',
      'org.eclipse.elk.insideSelfLoops.activate': 'true',
      'org.eclipse.elk.hierarchyHandling': 'INCLUDE_CHILDREN',
      'org.eclipse.elk.childAreaHeight': '300',
      'org.eclipse.elk.childAreaWidth': '300'
    },
    viewDimensions: {
      width: 600,
      height: 600
    }
  };
  settings: ElkLayoutSettings = {};
  inputGraph: Graph;
  internalGraph: ElkNode;
  outputGraph: Graph;
  outputGraph$: Subject<Graph> = new Subject();
  compoundNodeIds: Set<string> = new Set();
  run(graph: Graph): Observable<Graph> {
    this.inputGraph = graph;

    if (!this.inputGraph.clusters) {
      this.inputGraph.clusters = [];
    }

    if (!this.inputGraph.compoundNodes) {
      this.inputGraph.compoundNodes = [];
    }

    if (this.inputGraph.compoundNodes) {
      this.inputGraph.compoundNodes.forEach(compoundNode => {
        this.compoundNodeIds.add(compoundNode.id);
      });
    }

    this.internalGraph = {
      id: 'root',
      children: createNodeTree(graph),
      edges: this.inputGraph.edges.map(e => ({ id: e.id, sources: [e.source], targets: [e.target] }))
    };

    this.createGraph(this.internalGraph)
      .then(elkNode => {
        console.warn(elkNode);
        this.outputGraph$.next(this.internalGraphToOutputGraph(elkNode));
      })
      .catch(console.error);

    this.outputGraph = {
      nodes: [],
      clusters: [],
      edges: [],
      edgeLabels: [],
      compoundNodes: []
    };

    this.outputGraph$.next(this.outputGraph);

    return this.outputGraph$.asObservable();
  }

  internalGraphToOutputGraph(internalGraph: ElkNode): Graph {
    this.outputGraph.compoundNodes = this.compoundNodesFromTree(internalGraph, []);
    this.outputGraph.nodes = this.nodesFromTree(internalGraph, []);
    this.outputGraph.edges = internalGraph.edges.map(edge => {
      return {
        id: edge.id,
        sections: edge.sections,
        source: edge.sources[0],
        target: edge.targets[0],
        points: [
          edge.sections[0].startPoint,
          ...(edge.sections[0].bendPoints ? edge.sections[0].bendPoints : []),
          edge.sections[0].endPoint
        ]
      };
    });

    this.outputGraph.edgeLabels = this.outputGraph.edges;
    return this.outputGraph;
  }

  nodesFromTree(node: ElkNode & Node, result: Array<ElkNode> = []): Array<ElkNode> {
    const compoundNodes = this.outputGraph.compoundNodes;
    const parent = compoundNodes.find(compoundNode => compoundNode.childNodeIds.includes(node.id));
    if (!node.children.length && node.id !== 'root') {
      const modifiedNode = {
        ...node,
        position: {
          x: node.x + (parent ? parent.position.x - parent.dimension.width / 2 : 0),
          y: node.y
        },
        dimension: {
          width: node.width || 20,
          height: node.height || 20
        }
      };
      result.push(modifiedNode);
    }

    if (node.children) {
      for (const child of node.children) {
        this.nodesFromTree(child, result);
      }
    }
    return result;
  }

  compoundNodesFromTree(node: ElkNode & Node, result: Array<ElkNode> = []): Array<ElkNode> {
    if (this.compoundNodeIds.has(node.id) && node.children && node.children.length > 0) {
      const compoundNode = {
        childNodeIds: node.children.map(child => child.id),
        ...node,
        position: {
          x: node.x,
          y: node.y
        },
        dimension: {
          width: node.width || 20,
          height: node.height || 20
        }
      };
      result.push(compoundNode);
    }

    if (node.children) {
      for (const child of node.children) {
        this.compoundNodesFromTree(child, result);
      }
    }
    return result;
  }

  updateEdge(graph: Graph, edge: Edge): Observable<Graph> {
    return this.outputGraph$.asObservable();
  }

  createGraph(graph: any): Promise<ElkNode> {
    const settings = {
      ...this.defaultSettings,
      ...this.settings
    };
    const elkRootNode = {
      ...graph,
      ...settings
    };
    const elk = new ELK();
    return elk.layout(elkRootNode, {});
  }
}

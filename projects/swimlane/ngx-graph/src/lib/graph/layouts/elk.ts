import { Layout } from '../../models/layout.model';
import { Graph } from '../../models/graph.model';
import ELK, { ElkNode, LayoutOptions } from 'elkjs/lib/elk.bundled';
import { Edge } from '../../models/edge.model';
import { Node } from '../../models/node.model';
import { Observable, Subject } from 'rxjs';
import { ViewDimensions } from '../../utils/view-dimensions.helper';

export interface ElkLayoutSettings {
  properties?: LayoutOptions;
  viewDimensions?: ViewDimensions;
}

export class ElkLayout implements Layout {
  defaultSettings: ElkLayoutSettings = {
    // https://www.eclipse.org/elk/reference/options.html
    properties: {
      'elk.algorithm': 'layered',
      'elk.spacing.nodeNode': '100',
      'elk.layered.spacing.nodeNodeBetweenLayers': '100',
      'elk.padding': '70',
      'elk.spacing.edgeNode': '100',
      'elk.edgeRouting': 'SPLINES',
      'elk.insideSelfLoops.activate': 'true',
      'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
      'elk.childAreaHeight': '300',
      'elk.childAreaWidth': '300',
      'elk.nodeLabels.padding': '100',
      'elk.nodeLabels.placement': 'INSIDE V_CENTER H_RIGHT',
      'elk.alg.layered.options.NodePlacementStrategy': 'NETWORK_SIMPLEX',
      'elk.nodeSize.constraints': 'NODE_LABELS',
      'elk.layered.spacing': '70'
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
  nodeMap: Map<string, Node> = new Map();
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
      children: this.createNodeTree(graph),
      edges: this.inputGraph.edges.map(e => ({ id: e.id, sources: [e.source], targets: [e.target] }))
    };

    this.createGraph(this.internalGraph)
      .then(elkNode => {
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

  createNodeTree(graph: Graph): Array<ElkNode> {
    const { nodes, compoundNodes } = graph;
    const nodePadding = this.settings?.properties['elk.padding'] ?? this.defaultSettings.properties['elk.padding'];
    this.nodeMap = new Map(
      nodes.map(node => [
        node.id,
        {
          ...node,
          layoutOptions: {
            'elk.padding': `[left=${nodePadding}, top=${nodePadding}, right=${nodePadding}, bottom=${nodePadding}]`,
            ...(node.layoutOptions || {})
          },
          children: []
        }
      ])
    );
    compoundNodes.forEach(cluster => {
      const parentNode = this.nodeMap.get(cluster.id);
      if (parentNode) {
        const childNodes = cluster.childNodeIds.map(childId => {
          this.nodeMap.set(childId, { ...this.nodeMap.get(childId), parentId: parentNode.id });
          return this.nodeMap.get(childId);
        });
        (parentNode as any).children = childNodes;
        this.nodeMap.set(parentNode.id, { ...parentNode });
      }
    });
    const rootNodes = nodes.filter(
      node => !compoundNodes.some(compoundNode => compoundNode.childNodeIds.includes(node.id))
    );
    return rootNodes.map(rootNode => this.nodeMap.get(rootNode.id));
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
    const parent = node.parentId ? this.nodeMap.get(node.parentId) : null;
    if (!node.children.length) {
      const modifiedNode = {
        ...node,
        position: {
          x: node.x + (parent ? parent.position.x - parent.dimension.width / 2 : 0),
          y: node.y + (parent ? parent.position.y - parent.dimension.height / 2 : 0)
        },
        dimension: {
          width: node.width || 20,
          height: node.height || 20
        }
      };
      this.nodeMap.set(modifiedNode.id, modifiedNode);
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
      const parent = node.parentId ? this.nodeMap.get(node.parentId) : null;
      const compoundNode = {
        childNodeIds: node.children.map(child => child.id),
        ...node,
        position: {
          x: node.x + node.width / 2 + (parent ? parent.position.x - parent.dimension.width / 2 : 0),
          y: node.y + node.height / 2 + (parent ? parent.position.y - parent.dimension.height / 2 : 0)
        },
        dimension: {
          width: node.width || 20,
          height: node.height || 20
        }
      };
      this.nodeMap.set(compoundNode.id, compoundNode);
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

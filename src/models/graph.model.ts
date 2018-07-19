import { Node, ClusterNode } from './node.model';
import { Edge } from './edge.model';

export interface Graph {
  edges: Edge[];
  nodes: Node[];
  clusters?: ClusterNode[];
  edgeLabels?: any;
}

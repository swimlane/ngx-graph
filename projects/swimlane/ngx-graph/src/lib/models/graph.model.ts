import { Node, ClusterNode, CompoundNode } from './node.model';
import { Edge } from './edge.model';

export interface Graph {
  edges: Edge[];
  nodes: Node[];
  compoundNodes?: CompoundNode[];
  clusters?: ClusterNode[];
  edgeLabels?: any;
}

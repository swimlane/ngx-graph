import { Node } from './node.model';
import { Edge } from './edge.model';

export interface Graph {
  edges: Edge[];
  nodes: Node[];
  edgeLabels?: any;
}

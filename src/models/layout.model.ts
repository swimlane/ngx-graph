import { Graph } from './graph.model';
import { Edge } from './edge.model';

export interface Layout {
  settings?: any;
  run(graph: Graph): Graph;
  updateEdge(graph: Graph, edge: Edge): Graph;
}

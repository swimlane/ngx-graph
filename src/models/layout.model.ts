import { Graph } from './graph.model';

export interface Layout {
  run(graph: Graph): void;
}

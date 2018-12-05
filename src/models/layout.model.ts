import { Graph } from './graph.model';
import { Edge } from './edge.model';
import { Node } from './node.model';
import { Observable } from 'rxjs';

export interface Layout {
  settings?: any;
  run(graph: Graph): Graph | Observable<Graph>;
  updateEdge(graph: Graph, edge: Edge): Graph | Observable<Graph>;
  onDragStart?(draggingNode: Node, $event: MouseEvent): void;
  onDrag?(draggingNode: Node, $event: MouseEvent): void;
  onDragEnd?(draggingNode: Node, $event: MouseEvent): void;
}

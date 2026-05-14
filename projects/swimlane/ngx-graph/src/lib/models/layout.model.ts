import { Graph } from './graph.model';
import { Edge } from './edge.model';
import { Node } from './node.model';
import { Observable } from 'rxjs';

/**
 * Layout engine contract. Optional hooks support custom drag behavior and parsing `Node.transform` for
 * layout transition bookkeeping (same translate semantics as the graph default: node-group origin in layout space).
 */
export interface Layout {
  settings?: any;
  run(graph: Graph): Graph | Observable<Graph>;
  updateEdge(graph: Graph, edge: Edge): Graph | Observable<Graph>;
  onDragStart?(draggingNode: Node, $event: MouseEvent): void;
  onDrag?(draggingNode: Node, $event: MouseEvent): void;
  onDragEnd?(draggingNode: Node, $event: MouseEvent): void;
  parseTranslate?(transformStr: string | undefined): { tx: number; ty: number };
}

import { Layout } from '../../models/layout.model';
import { Graph } from '../../models/graph.model';
import { Node } from '../../models/node.model';
import { Edge } from '../..';
import { Observable, Subject } from 'rxjs';
export interface D3ForceDirectedSettings {
    force?: any;
    forceLink?: any;
}
export interface D3Node {
    id?: string;
    x: number;
    y: number;
    width?: number;
    height?: number;
    fx?: number;
    fy?: number;
}
export interface D3Edge {
    source: string | D3Node;
    target: string | D3Node;
}
export interface D3Graph {
    nodes: D3Node[];
    edges: D3Edge[];
}
export interface MergedNode extends D3Node, Node {
    id: string;
}
export declare function toD3Node(maybeNode: string | D3Node): D3Node;
export declare class D3ForceDirectedLayout implements Layout {
    defaultSettings: D3ForceDirectedSettings;
    settings: D3ForceDirectedSettings;
    inputGraph: Graph;
    outputGraph: Graph;
    d3Graph: D3Graph;
    outputGraph$: Subject<Graph>;
    draggingStart: {
        x: number;
        y: number;
    };
    run(graph: Graph): Observable<Graph>;
    updateEdge(graph: Graph, edge: Edge): Observable<Graph>;
    d3GraphToOutputGraph(d3Graph: D3Graph): Graph;
    onDragStart(draggingNode: Node, $event: MouseEvent): void;
    onDrag(draggingNode: Node, $event: MouseEvent): void;
    onDragEnd(draggingNode: Node, $event: MouseEvent): void;
}

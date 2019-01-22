import { Layout } from '../../models/layout.model';
import { Graph } from '../../models/graph.model';
import { Node } from '../../models/node.model';
import { ID3StyleLayoutAdaptor, Layout as ColaLayout, Group, InputNode, Link } from 'webcola';
import { Edge } from '../..';
import { Observable, Subject } from 'rxjs';
import { ViewDimensions } from '@swimlane/ngx-charts';
export interface ColaForceDirectedSettings {
    force?: ColaLayout & ID3StyleLayoutAdaptor;
    forceModifierFn?: (force: ColaLayout & ID3StyleLayoutAdaptor) => ColaLayout & ID3StyleLayoutAdaptor;
    onTickListener?: (internalGraph: ColaGraph) => void;
    viewDimensions?: ViewDimensions;
}
export interface ColaGraph {
    groups: Group[];
    nodes: InputNode[];
    links: Array<Link<number>>;
}
export declare function toNode(nodes: InputNode[], nodeRef: InputNode | number): InputNode;
export declare class ColaForceDirectedLayout implements Layout {
    defaultSettings: ColaForceDirectedSettings;
    settings: ColaForceDirectedSettings;
    inputGraph: Graph;
    outputGraph: Graph;
    internalGraph: ColaGraph & {
        groupLinks?: Edge[];
    };
    outputGraph$: Subject<Graph>;
    draggingStart: {
        x: number;
        y: number;
    };
    run(graph: Graph): Observable<Graph>;
    updateEdge(graph: Graph, edge: Edge): Observable<Graph>;
    internalGraphToOutputGraph(internalGraph: any): Graph;
    onDragStart(draggingNode: Node, $event: MouseEvent): void;
    onDrag(draggingNode: Node, $event: MouseEvent): void;
    onDragEnd(draggingNode: Node, $event: MouseEvent): void;
}

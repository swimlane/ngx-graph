import { Layout } from '../../models/layout.model';
import { Graph } from '../../models/graph.model';
import { Edge } from '../..';
export declare enum Orientation {
    LEFT_TO_RIGHT = "LR",
    RIGHT_TO_LEFT = "RL",
    TOP_TO_BOTTOM = "TB",
    BOTTOM_TO_TOM = "BT",
}
export declare enum Alignment {
    CENTER = "C",
    UP_LEFT = "UL",
    UP_RIGHT = "UR",
    DOWN_LEFT = "DL",
    DOWN_RIGHT = "DR",
}
export interface DagreSettings {
    orientation?: Orientation;
    marginX?: number;
    marginY?: number;
    edgePadding?: number;
    rankPadding?: number;
    nodePadding?: number;
    align?: Alignment;
    acyclicer?: 'greedy' | undefined;
    ranker?: 'network-simplex' | 'tight-tree' | 'longest-path';
}
export interface DagreNodesOnlySettings extends DagreSettings {
    curveDistance?: number;
}
export declare class DagreNodesOnlyLayout implements Layout {
    defaultSettings: DagreNodesOnlySettings;
    settings: DagreNodesOnlySettings;
    dagreGraph: any;
    dagreNodes: any;
    dagreEdges: any;
    run(graph: Graph): Graph;
    updateEdge(graph: Graph, edge: Edge): Graph;
    createDagreGraph(graph: Graph): any;
}

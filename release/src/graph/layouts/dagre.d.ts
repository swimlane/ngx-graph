import { Layout } from '../../models/layout.model';
import { Graph } from '../../models/graph.model';
export declare enum Orientation {
    LEFT_TO_RIGHT = "LR",
    RIGHT_TO_LEFT = "RL",
    TOP_TO_BOTTOM = "TB",
    BOTTOM_TO_TOM = "BT",
}
export declare class DagreLayout implements Layout {
    orientation: Orientation;
    marginX: number;
    marginY: number;
    edgePadding: number;
    rankPadding: number;
    dagreGraph: any;
    dagreNodes: any;
    dagreEdges: any;
    run(graph: Graph): void;
    createDagreGraph(graph: Graph): any;
}

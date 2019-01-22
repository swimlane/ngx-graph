import { Layout } from '../../models/layout.model';
import { Graph } from '../../models/graph.model';
import { Edge, Node, ClusterNode } from '../..';
import { DagreSettings } from './dagre';
export declare class DagreClusterLayout implements Layout {
    defaultSettings: DagreSettings;
    settings: DagreSettings;
    dagreGraph: any;
    dagreNodes: Node[];
    dagreClusters: ClusterNode[];
    dagreEdges: any;
    run(graph: Graph): Graph;
    updateEdge(graph: Graph, edge: Edge): Graph;
    createDagreGraph(graph: Graph): any;
}

export interface NodePosition {
  x: number;
  y: number;
}

export interface NodeDimension {
  width: number;
  height: number;
}

export interface Node {
  id: string;
  position?: NodePosition;
  dimension?: NodeDimension;
  transform?: string;
  label?: string;
  data?: any;
  meta?: any;
  layoutOptions?: any;
  parentId?: string;
}

export interface ClusterNode extends Node {
  childNodeIds?: string[];
}

export interface CompoundNode extends Node {
  childNodeIds?: string[];
}

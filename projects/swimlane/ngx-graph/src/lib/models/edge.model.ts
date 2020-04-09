import { NodePosition } from './node.model';

export interface Edge {
  id?: string;
  source: string;
  target: string;
  label?: string;
  data?: any;
  points?: any;
  line?: string;
  textTransform?: string;
  textAngle?: number;
  oldLine?: any;
  oldTextPath?: string;
  textPath?: string;
  midPoint?: NodePosition;
}

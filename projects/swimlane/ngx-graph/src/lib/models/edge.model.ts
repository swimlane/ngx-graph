import { NodePosition } from './node.model';

export interface Edge {
  id?: string;
  source: string;
  target: string;
  label?: string;
  data?: any;
  points?: any;
  /** Raw layout polyline from before the latest tick; morphing resamples this in redrawLines. */
  previousPoints?: Array<{ x: number; y: number }>;
  line?: string;
  textTransform?: string;
  textAngle?: number;
  oldLine?: any;
  oldTextPath?: string;
  textPath?: string;
  midPoint?: NodePosition;
}

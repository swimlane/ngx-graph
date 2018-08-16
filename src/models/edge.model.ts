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
  oldLine?: any; // TODO: get rid of this
  oldTextPath?: string;
  textPath?: string;
}

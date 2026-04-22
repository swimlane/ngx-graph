export enum MiniMapPosition {
  UpperLeft = 'UpperLeft',
  UpperRight = 'UpperRight',
  LowerLeft = 'LowerLeft',
  LowerRight = 'LowerRight'
}

export interface MiniMapMargin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const DefaultMiniMapMargin = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0
};

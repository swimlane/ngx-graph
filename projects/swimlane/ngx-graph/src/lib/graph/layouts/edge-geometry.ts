import type { Node } from '../../models/node.model';

const AXIS_EPS = 1e-3;

/** Dagre `rankdir` string (e.g. LR, TB). */
export type DagreRankdir = string | undefined;

/** ELK `elk.direction` value (e.g. RIGHT, DOWN). */
export type ElkDirection = string | undefined;

export interface RankOrderAxes {
  rankAxis: 'x' | 'y';
  orderAxis: 'x' | 'y';
}

/**
 * Maps Dagre `rankdir` to rank (layer) vs order (within layer) axes, matching
 * {@link DagreNodesOnlyLayout} / graphlib conventions.
 */
export function rankOrderAxesFromDagreRankdir(rankdir: DagreRankdir): RankOrderAxes {
  const r = rankdir ?? 'LR';
  const rankAxis: 'x' | 'y' = r === 'BT' || r === 'TB' ? 'y' : 'x';
  const orderAxis: 'x' | 'y' = rankAxis === 'y' ? 'x' : 'y';
  return { rankAxis, orderAxis };
}

/**
 * Maps ELK layered `elk.direction` to rank vs order axes for drag-time edge ports.
 */
export function rankOrderAxesFromElkDirection(direction: ElkDirection): RankOrderAxes {
  const u = (direction ?? 'DOWN').toUpperCase();
  if (u === 'LEFT' || u === 'RIGHT') {
    return { rankAxis: 'x', orderAxis: 'y' };
  }
  return { rankAxis: 'y', orderAxis: 'x' };
}

export interface DragEdgePointsOptions {
  curveDistance: number;
  rankAxis: 'x' | 'y';
  orderAxis: 'x' | 'y';
}

/** Drag-time edge style for Dagre-family layouts (`layoutSettings` on `ngx-graph`). */
export type DagreDragEdgeStyle = 'auto' | 'orthogonal' | 'smooth' | 'straight';

/** Resolved style after `auto` heuristic. */
export type ResolvedDagreDragStyle = 'orthogonal' | 'smooth' | 'straight';

function withRankOrder(
  rankAxis: 'x' | 'y',
  orderAxis: 'x' | 'y',
  rank: number,
  order: number
): { x: number; y: number } {
  return rankAxis === 'x' ? { x: rank, y: order } : { x: order, y: rank };
}

/**
 * Rank-facing attachment points (centers projected to box faces toward the other node),
 * matching the endpoints used by {@link edgePointsAfterDrag}.
 */
export function rankFacePortPoints(
  source: Node,
  target: Node,
  axes: RankOrderAxes
): [{ x: number; y: number }, { x: number; y: number }] {
  const { rankAxis, orderAxis } = axes;
  const sp = source.position ?? { x: 0, y: 0 };
  const tp = target.position ?? { x: 0, y: 0 };
  const sw = source.dimension?.width ?? 0;
  const sh = source.dimension?.height ?? 0;
  const tw = target.dimension?.width ?? 0;
  const th = target.dimension?.height ?? 0;
  const halfRankS = (rankAxis === 'x' ? sw : sh) / 2;
  const halfRankT = (rankAxis === 'x' ? tw : th) / 2;
  const dir = sp[rankAxis] <= tp[rankAxis] ? -1 : 1;
  const sRank = sp[rankAxis] - dir * halfRankS;
  const tRank = tp[rankAxis] + dir * halfRankT;
  const sOrd = sp[orderAxis];
  const tOrd = tp[orderAxis];
  return [withRankOrder(rankAxis, orderAxis, sRank, sOrd), withRankOrder(rankAxis, orderAxis, tRank, tOrd)];
}

/** Axis-aligned Manhattan path (one bend) between two ports. */
export function orthogonalManhattanPolyline(
  p0: { x: number; y: number },
  p1: { x: number; y: number }
): Array<{ x: number; y: number }> {
  if (Math.abs(p0.x - p1.x) < AXIS_EPS || Math.abs(p0.y - p1.y) < AXIS_EPS) {
    return [p0, p1];
  }
  return [p0, { x: p1.x, y: p0.y }, p1];
}

/** Normalize ELK `elk.edgeRouting` for branching. */
export function normalizeElkEdgeRouting(value: string | undefined): 'SPLINES' | 'ORTHOGONAL' | 'POLYLINE' | 'UNKNOWN' {
  const u = (value ?? '').toUpperCase();
  if (u.includes('SPLINE') || u === 'SPLINES') {
    return 'SPLINES';
  }
  if (u === 'ORTHOGONAL') {
    return 'ORTHOGONAL';
  }
  if (u === 'POLYLINE') {
    return 'POLYLINE';
  }
  return 'UNKNOWN';
}

function segmentAxisAligned(a: { x: number; y: number }, b: { x: number; y: number }): boolean {
  return Math.abs(a.x - b.x) < AXIS_EPS || Math.abs(a.y - b.y) < AXIS_EPS;
}

/**
 * Classify last laid-out polyline for `dragEdgeStyle: 'auto'`.
 */
export function inferDragStyleFromPoints(
  points: Array<{ x: number; y: number }> | undefined | null
): ResolvedDagreDragStyle {
  if (!points || points.length < 2) {
    return 'smooth';
  }
  if (points.length === 2) {
    return 'straight';
  }
  let allOrtho = true;
  for (let i = 0; i < points.length - 1; i++) {
    if (!segmentAxisAligned(points[i], points[i + 1])) {
      allOrtho = false;
      break;
    }
  }
  if (allOrtho) {
    return 'orthogonal';
  }
  if (points.length >= 3) {
    return 'smooth';
  }
  return 'straight';
}

/**
 * Resolves `auto` using prior `edge.points`, otherwise returns the explicit style.
 */
export function resolveDagreDragEdgeStyle(
  dragEdgeStyle: DagreDragEdgeStyle | undefined,
  priorPoints: Array<{ x: number; y: number }> | undefined
): ResolvedDagreDragStyle {
  const mode = dragEdgeStyle ?? 'auto';
  if (mode === 'auto') {
    return inferDragStyleFromPoints(priorPoints);
  }
  return mode;
}

/**
 * Builds drag polyline for Dagre / DagreCluster / DagreNodesOnly from resolved style.
 * `smooth` uses {@link edgePointsAfterDrag} (rank-offset interior points) for curved spline-style strokes;
 * `orthogonal` uses {@link orthogonalManhattanPolyline}; `straight` uses two port points only.
 */
export function dagreDragPolyline(
  source: Node,
  target: Node,
  axes: RankOrderAxes,
  curveDistance: number,
  style: ResolvedDagreDragStyle
): Array<{ x: number; y: number }> {
  if (style === 'straight') {
    const [p0, p1] = rankFacePortPoints(source, target, axes);
    return [p0, p1];
  }
  if (style === 'orthogonal') {
    const [p0, p1] = rankFacePortPoints(source, target, axes);
    return orthogonalManhattanPolyline(p0, p1);
  }
  return edgePointsAfterDrag(source, target, { curveDistance, ...axes });
}

/**
 * Drag-time polyline for ElkLayout from normalized `elk.edgeRouting`.
 * `UNKNOWN` defaults to smooth spline-style segments (four-point rank path).
 */
export function elkDragPolyline(
  source: Node,
  target: Node,
  axes: RankOrderAxes,
  curveDistance: number,
  routing: ReturnType<typeof normalizeElkEdgeRouting>
): Array<{ x: number; y: number }> {
  const mode = routing === 'UNKNOWN' ? 'SPLINES' : routing;
  const [p0, p1] = rankFacePortPoints(source, target, axes);
  if (mode === 'ORTHOGONAL' || mode === 'POLYLINE') {
    return orthogonalManhattanPolyline(p0, p1);
  }
  return edgePointsAfterDrag(source, target, { curveDistance, ...axes });
}

/**
 * Builds a 4-point polyline for interactive drag updates: ports on the rank-facing
 * sides of each node box (using node centers + dimensions), plus two interior
 * control points so d3 curve generators (e.g. `curveBasis`) have knots to bend.
 *
 * Aligns with {@link DagreNodesOnlyLayout.updateEdge}, with explicit rank/order axes
 * so LR/RL/TB/BT and ELK directions attach on the correct face.
 */
export function edgePointsAfterDrag(
  source: Node,
  target: Node,
  options: DragEdgePointsOptions
): Array<{ x: number; y: number }> {
  const { rankAxis, orderAxis, curveDistance } = options;
  const sp = source.position ?? { x: 0, y: 0 };
  const tp = target.position ?? { x: 0, y: 0 };
  const dir = sp[rankAxis] <= tp[rankAxis] ? -1 : 1;
  const cd = Math.max(0, curveDistance);
  const axes = { rankAxis, orderAxis };
  const [startingPoint, endingPoint] = rankFacePortPoints(source, target, axes);

  return [
    startingPoint,
    withRankOrder(rankAxis, orderAxis, startingPoint[rankAxis] - dir * cd, startingPoint[orderAxis]),
    withRankOrder(rankAxis, orderAxis, endingPoint[rankAxis] + dir * cd, endingPoint[orderAxis]),
    endingPoint
  ];
}

/**
 * When `style` is `linear`, returns only the two port points (straight segment).
 * Otherwise returns the full 4-point drag polyline.
 */
export function edgePointsForDragMode(
  source: Node,
  target: Node,
  options: DragEdgePointsOptions & { style?: 'linear' | 'smooth' }
): Array<{ x: number; y: number }> {
  const pts = edgePointsAfterDrag(source, target, options);
  if (options.style === 'linear') {
    return [pts[0], pts[pts.length - 1]];
  }
  return pts;
}

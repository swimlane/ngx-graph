import {
  dagreDragPolyline,
  edgePointsAfterDrag,
  elkDragPolyline,
  inferDragStyleFromPoints,
  normalizeElkEdgeRouting,
  orthogonalManhattanPolyline,
  rankOrderAxesFromDagreRankdir,
  rankOrderAxesFromElkDirection
} from './edge-geometry';
import type { Node } from '../../models/node.model';

function node(cx: number, cy: number, w: number, h: number): Node {
  return {
    id: 'n',
    position: { x: cx, y: cy },
    dimension: { width: w, height: h }
  };
}

describe('edge-geometry', () => {
  describe('rankOrderAxesFromDagreRankdir', () => {
    it('maps LR to rank x', () => {
      expect(rankOrderAxesFromDagreRankdir('LR')).toEqual({ rankAxis: 'x', orderAxis: 'y' });
    });
    it('maps TB to rank y', () => {
      expect(rankOrderAxesFromDagreRankdir('TB')).toEqual({ rankAxis: 'y', orderAxis: 'x' });
    });
  });

  describe('rankOrderAxesFromElkDirection', () => {
    it('maps RIGHT to rank x', () => {
      expect(rankOrderAxesFromElkDirection('RIGHT')).toEqual({ rankAxis: 'x', orderAxis: 'y' });
    });
    it('maps DOWN to rank y', () => {
      expect(rankOrderAxesFromElkDirection('DOWN')).toEqual({ rankAxis: 'y', orderAxis: 'x' });
    });
  });

  describe('edgePointsAfterDrag', () => {
    it('produces four points for LR with horizontal separation', () => {
      const a = node(100, 100, 40, 40);
      const b = node(300, 100, 40, 40);
      const pts = edgePointsAfterDrag(a, b, {
        curveDistance: 20,
        rankAxis: 'x',
        orderAxis: 'y'
      });
      expect(pts.length).toBe(4);
      // Source right face toward target; target left face toward source (rank x, dir -1)
      expect(pts[0].x).toBeCloseTo(120, 5);
      expect(pts[0].y).toBeCloseTo(100, 5);
      expect(pts[3].x).toBeCloseTo(280, 5);
      expect(pts[3].y).toBeCloseTo(100, 5);
    });

    it('produces four points for TB with vertical separation', () => {
      const a = node(100, 100, 40, 40);
      const b = node(100, 300, 40, 40);
      const pts = edgePointsAfterDrag(a, b, {
        curveDistance: 20,
        rankAxis: 'y',
        orderAxis: 'x'
      });
      expect(pts.length).toBe(4);
      expect(pts[0].y).toBeLessThan(pts[3].y);
    });
  });

  describe('normalizeElkEdgeRouting', () => {
    it('maps SPLINES and ORTHOGONAL', () => {
      expect(normalizeElkEdgeRouting('SPLINES')).toBe('SPLINES');
      expect(normalizeElkEdgeRouting('ORTHOGONAL')).toBe('ORTHOGONAL');
      expect(normalizeElkEdgeRouting('POLYLINE')).toBe('POLYLINE');
    });
  });

  describe('orthogonalManhattanPolyline', () => {
    it('uses one bend for diagonal ports', () => {
      const pts = orthogonalManhattanPolyline({ x: 0, y: 0 }, { x: 10, y: 20 });
      expect(pts.length).toBe(3);
      expect(pts[0].x).toBe(0);
      expect(pts[1].x).toBe(10);
      expect(pts[1].y).toBe(0);
      expect(pts[2].y).toBe(20);
    });
  });

  describe('inferDragStyleFromPoints', () => {
    it('detects orthogonal polylines', () => {
      expect(
        inferDragStyleFromPoints([
          { x: 0, y: 0 },
          { x: 10, y: 0 },
          { x: 10, y: 20 }
        ])
      ).toBe('orthogonal');
    });
    it('detects straight two-point edges', () => {
      expect(
        inferDragStyleFromPoints([
          { x: 0, y: 0 },
          { x: 100, y: 0 }
        ])
      ).toBe('straight');
    });
    it('does not treat slight float drift on a segment as orthogonal', () => {
      expect(
        inferDragStyleFromPoints([
          { x: 0, y: 0 },
          { x: 100, y: 0.5 },
          { x: 100, y: 50 }
        ])
      ).toBe('smooth');
    });
  });

  describe('dagreDragPolyline', () => {
    it('uses four-point smooth path for smooth, Manhattan for orthogonal', () => {
      const a = node(100, 100, 40, 40);
      const b = node(300, 200, 40, 40);
      const axes = { rankAxis: 'x' as const, orderAxis: 'y' as const };
      const smooth = dagreDragPolyline(a, b, axes, 20, 'smooth');
      const ortho = dagreDragPolyline(a, b, axes, 20, 'orthogonal');
      expect(smooth.length).toBe(4);
      expect(ortho.length).toBe(3);
      expect(smooth).not.toEqual(ortho);
    });
  });

  describe('elkDragPolyline', () => {
    it('uses axis-aligned path for ORTHOGONAL', () => {
      const a = node(100, 100, 40, 40);
      const b = node(300, 200, 40, 40);
      const pts = elkDragPolyline(a, b, { rankAxis: 'x', orderAxis: 'y' }, 20, 'ORTHOGONAL');
      for (let i = 0; i < pts.length - 1; i++) {
        const dx = Math.abs(pts[i].x - pts[i + 1].x);
        const dy = Math.abs(pts[i].y - pts[i + 1].y);
        expect(dx < 1e-3 || dy < 1e-3).toBe(true);
      }
    });
    it('uses four points for SPLINES', () => {
      const a = node(100, 100, 40, 40);
      const b = node(300, 100, 40, 40);
      const pts = elkDragPolyline(a, b, { rankAxis: 'x', orderAxis: 'y' }, 20, 'SPLINES');
      expect(pts.length).toBe(4);
    });
  });
});

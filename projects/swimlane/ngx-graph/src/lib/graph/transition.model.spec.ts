import {
  DEFAULT_GRAPH_LAYOUT_TRANSITION,
  mergeGraphLayoutTransition,
  mergeLayoutMorphCapture
} from './transition.model';

describe('mergeLayoutMorphCapture', () => {
  it('fills defaults when partial is empty', () => {
    expect(mergeLayoutMorphCapture({})).toEqual(mergeLayoutMorphCapture(undefined));
  });

  it('overrides only provided keys', () => {
    const m = mergeLayoutMorphCapture({ snapAddedNodeIds: true });
    expect(m.snapAddedNodeIds).toBe(true);
    expect(m.previousSource).toBe('model-transform');
    expect(m.syncTargetsFromPositionAfterTick).toBe(false);
  });
});

describe('mergeGraphLayoutTransition', () => {
  it('deep-merges morphCapture with defaults', () => {
    const merged = mergeGraphLayoutTransition({
      mode: 'tween',
      morphCapture: { previousSource: 'dom-svg', snapAddedNodeIds: true }
    });
    expect(merged.mode).toBe('tween');
    expect(merged.morphCapture.previousSource).toBe('dom-svg');
    expect(merged.morphCapture.snapAddedNodeIds).toBe(true);
    expect(merged.morphCapture.syncTargetsFromPositionAfterTick).toBe(false);
    expect(merged.morphCapture.degenerateEpsilon).toBe(1e-3);
  });

  it('preserves default morph when transition fields are set without morphCapture', () => {
    const merged = mergeGraphLayoutTransition({ mode: 'tween' });
    expect(merged.morphCapture).toEqual(mergeLayoutMorphCapture(DEFAULT_GRAPH_LAYOUT_TRANSITION.morphCapture));
  });

  it('merges partial morphCapture without dropping sibling keys from defaults', () => {
    const merged = mergeGraphLayoutTransition({
      morphCapture: { degenerateEpsilon: 0.5 }
    });
    expect(merged.morphCapture.degenerateEpsilon).toBe(0.5);
    expect(merged.morphCapture.previousSource).toBe('model-transform');
  });
});

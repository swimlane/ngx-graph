import * as d3ease from 'd3-ease';

/** Named easings mapped to d3-ease factories (same as layout morph animations). */
export type GraphTransitionEasingName = 'linear' | 'cubicIn' | 'cubicOut' | 'cubicInOut' | 'quadInOut' | 'elasticOut';

export type GraphLayoutTransitionMode = 'none' | 'instant' | 'tween';

/** Where “previous” node-group translates come from before `graph` is replaced (layout morph). */
export type LayoutMorphPreviousSource =
  /** Current behavior: read `transform` on the incoming graph model only. */
  | 'model-transform'
  /** Read `g.node-group[id]` under `.graph.chart` (excludes minimap). */
  | 'dom-svg'
  /** DOM first; if translate is near zero, use model `position` / `transform` (see `degenerateEpsilon`). */
  | 'dom-with-model-fallback';

/** Options for capturing prior node translates when `mode: 'tween'`. */
export interface LayoutMorphCapture {
  /** Default `model-transform` (backward compatible). */
  previousSource?: LayoutMorphPreviousSource;
  /** Used with `dom-with-model-fallback`. Default `1e-3`. */
  degenerateEpsilon?: number;
  /**
   * Order when resolving a node id on the **model** graph for fallback math.
   * Default `['compound', 'cluster', 'node']`.
   */
  modelResolutionOrder?: Array<'compound' | 'cluster' | 'node'>;
  /** After `tick()`, refresh `layoutAnimationTargets` from layout `position` for full-scope tween. Default false. */
  syncTargetsFromPositionAfterTick?: boolean;
  /** For ids added since last tick, set previous = target so they do not tween from origin. Default false. */
  snapAddedNodeIds?: boolean;
}

export const DEFAULT_LAYOUT_MORPH_CAPTURE: LayoutMorphCapture = {
  previousSource: 'model-transform',
  degenerateEpsilon: 1e-3,
  modelResolutionOrder: ['compound', 'cluster', 'node'],
  syncTargetsFromPositionAfterTick: false,
  snapAddedNodeIds: false
};

export function mergeLayoutMorphCapture(partial: LayoutMorphCapture | null | undefined): LayoutMorphCapture {
  return { ...DEFAULT_LAYOUT_MORPH_CAPTURE, ...partial };
}

/**
 * Layout transition after graph model / layout output changes.
 * - `none` / `instant`: keep prior snapshot for continuity, then snap to final layout in one frame (no rAF morph).
 * - `tween`: interpolate node translates and edge paths over `durationMs` with `easing`.
 */
export interface GraphLayoutTransition {
  mode: GraphLayoutTransitionMode;
  /** When `tween`, only new ids interpolate in additive mode; stable nodes/edges snap. */
  scope: 'full' | 'additive';
  durationMs: number;
  easing: GraphTransitionEasingName | ((t: number) => number);
  /** When `mode: 'tween'`, how prior node translates are captured (DOM vs model). */
  morphCapture?: LayoutMorphCapture;
}

export const DEFAULT_GRAPH_LAYOUT_TRANSITION: GraphLayoutTransition = {
  mode: 'instant',
  scope: 'full',
  durationMs: 500,
  easing: 'cubicInOut',
  morphCapture: mergeLayoutMorphCapture(undefined)
};

/** Programmatic viewport pan (panTo, center, minimap, zoomToFit autoCenter): optional eased translation only; zoom scale unchanged. */
export interface ViewportTranslationTransition {
  enabled: boolean;
  durationMs: number;
  easing: GraphTransitionEasingName | ((t: number) => number);
}

export const DEFAULT_VIEWPORT_TRANSLATION_TRANSITION: ViewportTranslationTransition = {
  enabled: false,
  durationMs: 280,
  easing: 'cubicOut'
};

/** Optional flair during layout tween only (default off). */
export interface LayoutTransitionEffect {
  kind: 'none' | 'perspectiveFlip' | 'rotate';
  /** Max rotation in degrees (perspective flip uses rotateX). */
  peakDegrees?: number;
  /** For `rotate`: pivot in graph coordinates. */
  rotatePivot?: 'graphCenter' | 'viewportCenter' | { nodeId: string };
}

export const DEFAULT_LAYOUT_TRANSITION_EFFECT: LayoutTransitionEffect = {
  kind: 'none',
  peakDegrees: 12
};

export function resolveGraphTransitionEasing(
  easing: GraphLayoutTransition['easing'] | ViewportTranslationTransition['easing']
): (t: number) => number {
  if (typeof easing === 'function') {
    return easing;
  }
  switch (easing) {
    case 'linear':
      return d3ease.easeLinear;
    case 'cubicIn':
      return d3ease.easeCubicIn;
    case 'cubicOut':
      return d3ease.easeCubicOut;
    case 'quadInOut':
      return d3ease.easeQuadInOut;
    case 'elasticOut':
      return d3ease.easeElasticOut;
    case 'cubicInOut':
    default:
      return d3ease.easeCubicInOut;
  }
}

/**
 * Resolves final layout transition from the graph `transitionAfterChanges` input merged with defaults.
 * When unset or empty, returns {@link DEFAULT_GRAPH_LAYOUT_TRANSITION} (`mode: 'instant'`).
 */
export function mergeGraphLayoutTransition(
  explicit: Partial<GraphLayoutTransition> | null | undefined
): GraphLayoutTransition {
  const baseMorph = mergeLayoutMorphCapture(DEFAULT_GRAPH_LAYOUT_TRANSITION.morphCapture);
  const base: GraphLayoutTransition = { ...DEFAULT_GRAPH_LAYOUT_TRANSITION, morphCapture: baseMorph };
  if (explicit != null) {
    const defined = Object.fromEntries(
      Object.entries(explicit).filter(([, v]) => v !== undefined)
    ) as Partial<GraphLayoutTransition>;
    if (Object.keys(defined).length > 0) {
      const { morphCapture: morphPartial, ...rest } = defined;
      return {
        ...base,
        ...rest,
        morphCapture: mergeLayoutMorphCapture(morphPartial ?? base.morphCapture)
      };
    }
  }
  return base;
}

export function mergeViewportTransition(
  explicit: Partial<ViewportTranslationTransition> | null | undefined
): ViewportTranslationTransition {
  if (explicit != null) {
    const defined = Object.fromEntries(
      Object.entries(explicit).filter(([, v]) => v !== undefined)
    ) as Partial<ViewportTranslationTransition>;
    if (Object.keys(defined).length > 0) {
      return { ...DEFAULT_VIEWPORT_TRANSLATION_TRANSITION, ...defined };
    }
  }
  return { ...DEFAULT_VIEWPORT_TRANSLATION_TRANSITION };
}

export function mergeLayoutEffect(
  explicit: Partial<LayoutTransitionEffect> | null | undefined
): LayoutTransitionEffect {
  if (explicit != null) {
    const defined = Object.fromEntries(
      Object.entries(explicit).filter(([, v]) => v !== undefined)
    ) as Partial<LayoutTransitionEffect>;
    if (Object.keys(defined).length > 0) {
      return { ...DEFAULT_LAYOUT_TRANSITION_EFFECT, ...defined };
    }
  }
  return { ...DEFAULT_LAYOUT_TRANSITION_EFFECT };
}

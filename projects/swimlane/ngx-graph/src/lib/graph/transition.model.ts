import * as d3ease from 'd3-ease';

/** Named easings mapped to d3-ease factories (same as layout morph animations). */
export type GraphTransitionEasingName = 'linear' | 'cubicIn' | 'cubicOut' | 'cubicInOut' | 'quadInOut' | 'elasticOut';

export type GraphLayoutTransitionMode = 'none' | 'instant' | 'tween';

/**
 * Where **previous** `translate(tx,ty)` values come from before the graph model is replaced (layout morph).
 * Applies to **nodes, clusters, and compound nodes** equally (`g.node-group[id]` under `.graph.chart`).
 * Does **not** affect cluster/compound **size** morph: prior width/height for that tween always come from the
 * graph model at capture time, not from the DOM.
 */
export type LayoutMorphPreviousSource =
  /** Read `transform` on the graph model only (backward compatible). */
  | 'model-transform'
  /** Read `g.node-group[id]` under `.graph.chart` (excludes minimap). */
  | 'dom-svg'
  /** DOM first; if translate is near zero, use model `position` / `transform` (see `degenerateEpsilon`). */
  | 'dom-with-model-fallback';

/**
 * Options for capturing prior node-group translates when `mode: 'tween'`.
 * With `scope: 'full'`, the same unified rAF tween drives **nodes, clusters, and compounds** (translate lerp plus,
 * for clusters/compounds only, optional width/height lerp from model snapshots).
 */
export interface LayoutMorphCapture {
  /**
   * Default `model-transform` (backward compatible).
   * DOM modes read the same `g.node-group` elements used for regular nodes; clusters and compounds use the same
   * `class="node-group"` + `id` wiring in the graph template.
   */
  previousSource?: LayoutMorphPreviousSource;
  /** Used with `dom-with-model-fallback`. Default `1e-3`. */
  degenerateEpsilon?: number;
  /**
   * Order when resolving a node id on the **model** graph for fallback math.
   * Default `['compound', 'cluster', 'node']`.
   */
  modelResolutionOrder?: Array<'compound' | 'cluster' | 'node'>;
  /**
   * After `tick()`, for `scope: 'full'` only, recompute `layoutAnimationTargets` from layout `position` (and
   * `dimension` via `centerNodesOnPositionChange`) for every id already in the target map — **including clusters and
   * compounds**. Runs before transforms are reset to “previous” for the tween, so endpoints match the new layout.
   * Default false.
   */
  syncTargetsFromPositionAfterTick?: boolean;
  /**
   * When true: new **node** ids also get `previousLayoutTransforms` snapped to the current target so they do not tween
   * from a missing or bogus origin; plus degenerate-stable snap for clusters/compounds (see `degenerateEpsilon`).
   * Role changes (same id moving between `nodes` / `clusters` / `compoundNodes`) and **new** cluster/compound ids snap
   * even when this flag is false. Default false.
   */
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
 * - `tween`: interpolate node-group translates and edge paths over `durationMs` with `easing`. Full scope tweens
 *   **nodes, clusters, and compounds** together; cluster/compound rects can also tween width/height from prior model
 *   dimensions to the new layout’s dimensions (`scope: 'additive'` skips positional and size tweens on groups).
 */
export interface GraphLayoutTransition {
  mode: GraphLayoutTransitionMode;
  /** When `tween`, only new ids interpolate in additive mode; stable nodes/edges snap. */
  scope: 'full' | 'additive';
  durationMs: number;
  easing: GraphTransitionEasingName | ((t: number) => number);
  /** When `mode: 'tween'`, how **prior translates** are captured; see {@link LayoutMorphPreviousSource}. */
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

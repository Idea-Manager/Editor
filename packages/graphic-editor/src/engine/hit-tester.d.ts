import type { GraphicPageNode, GraphicElement, FrameElement, Rect } from '@core/model/interfaces';
import type { GraphicBlockRegistry } from '../blocks/block-registry';
import type { SelectionEntry } from './selection-manager';
export type HandleId = 'corner-nw' | 'corner-ne' | 'corner-se' | 'corner-sw';
export type HitTarget = {
    kind: 'element';
    element: GraphicElement;
} | {
    kind: 'frame';
    frame: FrameElement;
} | {
    kind: 'handle';
    handle: HandleId;
    element: GraphicElement;
} | {
    kind: 'grip';
    element?: GraphicElement;
};
/**
 * Grip offset from the selection bounding rect’s left edge (screen px) for `left` before
 * `translate(-100%)`. Must match `selection-manager` overlay `left`.
 */
export declare const GRAPHIC_GRIP_SCREEN_PX = 16;
/** Grip control outer size (square, screen px). Must match `.idea-graphic-selection__grip` in SCSS. */
export declare const GRAPHIC_GRIP_WIDTH_PX = 20;
/**
 * Returns true when two axis-aligned bounding boxes intersect or touch.
 * Touching edges (shared border) count as intersect — required for frame attach logic.
 */
export declare function aabbIntersect(a: Rect, b: Rect): boolean;
/**
 * Returns the combined AABB of an array of rects.
 * Returns null if the array is empty.
 */
export declare function combinedAABB(rects: Rect[]): Rect | null;
/**
 * Hit-test in world coordinates.
 *
 * Priority order (highest wins):
 *   1. corner handles   — only for single selected element
 *   2. grip             — combined selection bounds
 *   3. element body     — any element (back-to-front)
 *   4. frame body
 */
export declare function hitTest(page: GraphicPageNode, registry: GraphicBlockRegistry, world: {
    x: number;
    y: number;
}, selection: SelectionEntry[], zoom?: number): HitTarget | null;
//# sourceMappingURL=hit-tester.d.ts.map
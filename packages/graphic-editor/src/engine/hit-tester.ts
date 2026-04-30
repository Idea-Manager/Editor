import type { GraphicPageNode, GraphicElement, FrameElement, Rect } from '@core/model/interfaces';
import type { GraphicBlockRegistry } from '../blocks/block-registry';
import type { SelectionEntry } from './selection-manager';

// ─── Handle / target types ────────────────────────────────────────────────────

export type HandleId =
  | 'corner-nw'
  | 'corner-ne'
  | 'corner-se'
  | 'corner-sw';

export type ArrowEdge = 'top' | 'right' | 'bottom' | 'left';

export type HitTarget =
  | { kind: 'element'; element: GraphicElement }
  | { kind: 'frame'; frame: FrameElement }
  | { kind: 'handle'; handle: HandleId; element: GraphicElement }
  | { kind: 'arrow-edge'; edge: ArrowEdge; element: GraphicElement }
  | { kind: 'grip'; element: GraphicElement };

// ─── Constants ────────────────────────────────────────────────────────────────

/** Half the handle div size (12px circle → 6px radius). Hit zone in world pixels. */
const HANDLE_RADIUS_PX = 6;
/** Extra outset of the grip icon from the bounding rect left edge (screen pixels → world). */
const GRIP_SIZE_PX = 24;
/** Hit zone for arrow-edge handles (screen pixels outset from bounding rect edge). */
const ARROW_EDGE_HIT_PX = 8;

// ─── AABB helpers ─────────────────────────────────────────────────────────────

/**
 * Returns true when two axis-aligned bounding boxes intersect or touch.
 * Touching edges (shared border) count as intersect — required for frame attach logic.
 */
export function aabbIntersect(a: Rect, b: Rect): boolean {
  return (
    a.x <= b.x + b.width &&
    a.x + a.width >= b.x &&
    a.y <= b.y + b.height &&
    a.y + a.height >= b.y
  );
}

/**
 * Returns the combined AABB of an array of rects.
 * Returns null if the array is empty.
 */
export function combinedAABB(rects: Rect[]): Rect | null {
  if (rects.length === 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const r of rects) {
    if (r.x < minX) minX = r.x;
    if (r.y < minY) minY = r.y;
    if (r.x + r.width > maxX) maxX = r.x + r.width;
    if (r.y + r.height > maxY) maxY = r.y + r.height;
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function ptInRect(x: number, y: number, rect: Rect): boolean {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

/** Returns world-space corner center for a given handle on the bounding rect. */
function cornerCenter(bounds: Rect, handle: HandleId): { x: number; y: number } {
  switch (handle) {
    case 'corner-nw': return { x: bounds.x, y: bounds.y };
    case 'corner-ne': return { x: bounds.x + bounds.width, y: bounds.y };
    case 'corner-se': return { x: bounds.x + bounds.width, y: bounds.y + bounds.height };
    case 'corner-sw': return { x: bounds.x, y: bounds.y + bounds.height };
  }
}

function distSq(ax: number, ay: number, bx: number, by: number): number {
  return (ax - bx) ** 2 + (ay - by) ** 2;
}

/**
 * Returns the squared distance from point (px, py) to the line segment (ax,ay)→(bx,by).
 */
function pointToSegmentDistSq(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return distSq(px, py, ax, ay);
  // Project point onto segment, clamped to [0, 1]
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return distSq(px, py, ax + t * dx, ay + t * dy);
}

/**
 * Hit-test a path element in world space.
 *
 * Phase 1: AABB pre-filter using data.bounds — fast reject.
 * Phase 2: per-segment minimum distance ≤ max(strokeWidth, 4) world units.
 */
function _hitTestPath(el: import('@core/model/interfaces').GraphicElement, world: { x: number; y: number }): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = el.data as any;
  const bounds = data.bounds as Rect;
  const points = data.points as Array<{ x: number; y: number }>;
  const strokeWidth = (data.strokeWidth as number) ?? 2;

  if (!bounds || points.length === 0) return false;

  // Phase 1: AABB pre-filter — expand by hit tolerance
  const tol = Math.max(strokeWidth, 4);
  const expanded: Rect = {
    x: bounds.x - tol,
    y: bounds.y - tol,
    width: bounds.width + tol * 2,
    height: bounds.height + tol * 2,
  };
  if (!ptInRect(world.x, world.y, expanded)) return false;

  if (points.length === 1) {
    return distSq(world.x, world.y, points[0].x, points[0].y) <= tol * tol;
  }

  // Phase 2: per-segment distance test
  const tolSq = tol * tol;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (pointToSegmentDistSq(world.x, world.y, a.x, a.y, b.x, b.y) <= tolSq) {
      return true;
    }
  }
  return false;
}

// ─── Main hit-test ────────────────────────────────────────────────────────────

/**
 * Hit-test in world coordinates.
 *
 * Priority order (highest wins):
 *   1. corner handles   — only for single selected element
 *   2. grip             — only for any selected element
 *   3. arrow-edge       — only for single selected element (arrow-type excluded via caller)
 *   4. element body     — any element (back-to-front / last rendered on top)
 *   5. frame body
 *
 * @param zoom Current viewport zoom (used to convert screen-pixel tolerances to world units).
 */
export function hitTest(
  page: GraphicPageNode,
  registry: GraphicBlockRegistry,
  world: { x: number; y: number },
  selection: SelectionEntry[],
  zoom: number = 1,
): HitTarget | null {
  const selectedIds = new Set(selection.map(e => e.id));
  const selectedElements = page.elements.filter(el => selectedIds.has(el.id));

  // Tolerances in world units derived from screen-pixel constants
  const handleR = HANDLE_RADIUS_PX / zoom;
  const gripSize = GRIP_SIZE_PX / zoom;
  const arrowEdgeHit = ARROW_EDGE_HIT_PX / zoom;

  // ── 1. Corner handles (single-element selection only) ─────────────────────
  if (selectedElements.length === 1) {
    const el = selectedElements[0];
    if (registry.has(el.type)) {
      const bounds = registry.get(el.type).getBounds(el);
      for (const handle of ['corner-nw', 'corner-ne', 'corner-se', 'corner-sw'] as HandleId[]) {
        const c = cornerCenter(bounds, handle);
        if (distSq(world.x, world.y, c.x, c.y) <= handleR * handleR) {
          return { kind: 'handle', handle, element: el };
        }
      }
    }
  }

  // ── 2. Grip (any selected element) ───────────────────────────────────────
  for (const el of selectedElements) {
    if (!registry.has(el.type)) continue;
    const bounds = registry.get(el.type).getBounds(el);
    // Grip is placed at left: bounds.x - gripSize, top: bounds.y (world coords)
    const gripRect: Rect = {
      x: bounds.x - gripSize,
      y: bounds.y,
      width: gripSize,
      height: gripSize,
    };
    if (ptInRect(world.x, world.y, gripRect)) {
      return { kind: 'grip', element: el };
    }
  }

  // ── 3. Arrow-edge handles (single-element selection only) ─────────────────
  if (selectedElements.length === 1) {
    const el = selectedElements[0];
    if (registry.has(el.type)) {
      const b = registry.get(el.type).getBounds(el);
      const cx = b.x + b.width / 2;
      const cy = b.y + b.height / 2;
      // Arrow handle centers are at the midpoint of each edge, arrowEdgeHit outside the rect
      const edgeCenters: Array<{ edge: ArrowEdge; x: number; y: number }> = [
        { edge: 'top',    x: cx,          y: b.y - arrowEdgeHit },
        { edge: 'right',  x: b.x + b.width + arrowEdgeHit, y: cy },
        { edge: 'bottom', x: cx,          y: b.y + b.height + arrowEdgeHit },
        { edge: 'left',   x: b.x - arrowEdgeHit,           y: cy },
      ];
      for (const { edge, x, y } of edgeCenters) {
        if (distSq(world.x, world.y, x, y) <= handleR * handleR) {
          return { kind: 'arrow-edge', edge, element: el };
        }
      }
    }
  }

  // ── 4. Element body (iterate back-to-front; last element = top render) ───
  //
  // Path elements use a two-phase test:
  //   a) AABB pre-filter via data.bounds (fast reject)
  //   b) Per-segment minimum distance test within max(strokeWidth, 4) world units
  // This gives accurate stroke picking without relying on a bounding-box approximation.
  // Non-path elements still use the simple AABB ptInRect test.
  for (let i = page.elements.length - 1; i >= 0; i--) {
    const el = page.elements[i];
    if (!registry.has(el.type)) continue;

    if (el.type === 'path') {
      if (!_hitTestPath(el, world)) continue;
      return { kind: 'element', element: el };
    }

    const bounds = registry.get(el.type).getBounds(el);
    if (ptInRect(world.x, world.y, bounds)) {
      return { kind: 'element', element: el };
    }
  }

  // ── 5. Frame body ─────────────────────────────────────────────────────────
  for (let i = page.frames.length - 1; i >= 0; i--) {
    const frame = page.frames[i];
    const b = frame.data;
    if (ptInRect(world.x, world.y, { x: b.x, y: b.y, width: b.width, height: b.height })) {
      return { kind: 'frame', frame };
    }
  }

  return null;
}

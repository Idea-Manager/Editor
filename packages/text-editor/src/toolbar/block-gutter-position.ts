/** Viewport delta plus scroll offset → content-relative position inside a scroll host. */
export function contentOffsetWithinScrollHost(
  targetRect: Pick<DOMRect, 'top' | 'left'>,
  hostRect: Pick<DOMRect, 'top' | 'left'>,
  scrollTop: number,
  scrollLeft: number,
): { top: number; left: number } {
  return {
    top: targetRect.top - hostRect.top + scrollTop,
    left: targetRect.left - hostRect.left + scrollLeft,
  };
}

export const BLOCK_GUTTER_WIDTH = 49;
export const BLOCK_GUTTER_GAP = 4;

export function blockGutterContentPosition(
  blockRect: Pick<DOMRect, 'top' | 'left'>,
  leftRef: number,
  hostRect: Pick<DOMRect, 'top' | 'left'>,
  scrollTop: number,
  scrollLeft: number,
  gutterWidth = BLOCK_GUTTER_WIDTH,
  gutterGap = BLOCK_GUTTER_GAP,
): { top: number; left: number } {
  const blockOffset = contentOffsetWithinScrollHost(blockRect, hostRect, scrollTop, scrollLeft);
  const leftAnchor = contentOffsetWithinScrollHost(
    { top: blockRect.top, left: leftRef },
    hostRect,
    scrollTop,
    scrollLeft,
  );
  return {
    top: blockOffset.top,
    left: leftAnchor.left - gutterWidth - gutterGap,
  };
}

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

/** Place an overlay below (or above) an anchor using content-relative coords inside a scroll host. */
export function overlayContentPositionNearRect(
  anchorRect: Pick<DOMRect, 'top' | 'bottom' | 'left' | 'width'>,
  overlaySize: Pick<DOMRect, 'width' | 'height'>,
  scrollHostRect: Pick<DOMRect, 'top' | 'bottom' | 'left' | 'width'>,
  scrollTop: number,
  scrollLeft: number,
  gap = 4,
  padding = 8,
): { top: number; left: number } {
  const belowViewportBottom = anchorRect.bottom + gap + overlaySize.height;
  const placeAbove = belowViewportBottom > scrollHostRect.bottom;

  const contentTop = placeAbove
    ? anchorRect.top - scrollHostRect.top + scrollTop - overlaySize.height - gap
    : anchorRect.bottom - scrollHostRect.top + scrollTop + gap;

  let contentLeft = anchorRect.left - scrollHostRect.left + scrollLeft;
  const minLeft = scrollLeft + padding;
  const maxLeft = scrollLeft + scrollHostRect.width - overlaySize.width - padding;
  contentLeft = Math.max(minLeft, Math.min(contentLeft, maxLeft));

  return { top: contentTop, left: contentLeft };
}

/** Place an overlay below (or above) an anchor using fixed viewport coords, clamped to scroll host bounds. */
export function overlayViewportPositionNearRect(
  anchorRect: Pick<DOMRect, 'top' | 'bottom' | 'left' | 'width'>,
  overlaySize: Pick<DOMRect, 'width' | 'height'>,
  scrollHostRect: Pick<DOMRect, 'top' | 'bottom' | 'left' | 'width'>,
  gap = 4,
  padding = 8,
): { top: number; left: number } {
  const minTop = scrollHostRect.top + padding;
  const maxTop = scrollHostRect.bottom - overlaySize.height - padding;

  const belowTop = anchorRect.bottom + gap;
  const aboveTop = anchorRect.top - overlaySize.height - gap;

  const spaceBelow = scrollHostRect.bottom - padding - anchorRect.bottom - gap;
  const spaceAbove = anchorRect.top - gap - scrollHostRect.top - padding;

  const fitsBelow = spaceBelow >= overlaySize.height;
  const fitsAbove = spaceAbove >= overlaySize.height;

  let top: number;
  if (fitsBelow) {
    top = belowTop;
  } else if (fitsAbove) {
    top = aboveTop;
  } else if (spaceBelow >= spaceAbove) {
    top = belowTop;
  } else {
    top = aboveTop;
  }

  top = Math.max(minTop, Math.min(top, maxTop));

  let left = anchorRect.left;
  const minLeft = scrollHostRect.left + padding;
  const maxLeft = scrollHostRect.left + scrollHostRect.width - overlaySize.width - padding;
  left = Math.max(minLeft, Math.min(left, maxLeft));

  return { top, left };
}

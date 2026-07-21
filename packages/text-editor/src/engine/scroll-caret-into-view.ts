
const SCROLLABLE_OVERFLOW = /auto|scroll|overlay/;

export function findVerticalScrollParent(el: HTMLElement): HTMLElement | null {
  let parent = el.parentElement;
  while (parent) {
    const style = parent.ownerDocument.defaultView?.getComputedStyle(parent);
    if (style && SCROLLABLE_OVERFLOW.test(style.overflowY)) {
      return parent;
    }
    parent = parent.parentElement;
  }
  return null;
}

export function getCollapsedCaretRect(rootEl: HTMLElement): DOMRect | null {
  const win = rootEl.ownerDocument.defaultView;
  if (!win) return null;

  const domSel = win.getSelection();
  if (!domSel || domSel.rangeCount === 0 || !domSel.isCollapsed) return null;

  const range = domSel.getRangeAt(0);
  if (!rootEl.contains(range.startContainer)) return null;

  let rect = range.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) {
    const rects = Array.from(range.getClientRects()).filter(r => r.width > 0 || r.height > 0);
    if (rects.length > 0) {
      rect = rects[0];
    }
  }

  if (rect.width === 0 && rect.height === 0) {
    const anchorNode = domSel.anchorNode;
    let blockEl: Element | null = null;
    if (anchorNode instanceof Element) {
      blockEl = anchorNode.closest('[data-block-id]');
    } else if (anchorNode?.parentElement) {
      blockEl = anchorNode.parentElement.closest('[data-block-id]');
    }
    if (blockEl && rootEl.contains(blockEl)) {
      rect = blockEl.getBoundingClientRect();
    }
  }

  if (rect.width === 0 && rect.height === 0) {
    const activeBlock = rootEl.querySelector('.idea-block--active[data-block-id]');
    if (activeBlock) {
      rect = activeBlock.getBoundingClientRect();
    }
  }

  if (rect.width === 0 && rect.height === 0) return null;
  return rect;
}

export function scrollRectIntoView(
  scrollParent: HTMLElement,
  rect: DOMRect,
  padding = 24,
): void {
  const parentRect = scrollParent.getBoundingClientRect();

  if (rect.bottom > parentRect.bottom - padding) {
    scrollParent.scrollTop += rect.bottom - parentRect.bottom + padding;
  } else if (rect.top < parentRect.top + padding) {
    scrollParent.scrollTop -= parentRect.top + padding - rect.top;
  }
}

export function scrollRectIntoWindow(win: Window, rect: DOMRect, padding = 24): void {
  const viewportHeight = win.innerHeight;

  if (rect.bottom > viewportHeight - padding) {
    win.scrollBy(0, rect.bottom - viewportHeight + padding);
  } else if (rect.top < padding) {
    win.scrollBy(0, rect.top - padding);
  }
}

export function scrollCaretIntoView(rootEl: HTMLElement, padding = 24): void {
  const rect = getCollapsedCaretRect(rootEl);
  if (!rect) return;

  const scrollParent = findVerticalScrollParent(rootEl);
  if (scrollParent) {
    scrollRectIntoView(scrollParent, rect, padding);
    return;
  }

  const win = rootEl.ownerDocument.defaultView;
  if (win) {
    scrollRectIntoWindow(win, rect, padding);
  }
}

const scheduledByRoot = new WeakMap<HTMLElement, number>();

export function scheduleScrollCaretIntoView(rootEl: HTMLElement, padding = 24): void {
  const win = rootEl.ownerDocument.defaultView;
  if (!win) return;

  const existing = scheduledByRoot.get(rootEl);
  if (existing != null) {
    win.cancelAnimationFrame(existing);
  }

  const frameId = win.requestAnimationFrame(() => {
    scheduledByRoot.delete(rootEl);
    scrollCaretIntoView(rootEl, padding);
  });
  scheduledByRoot.set(rootEl, frameId);
}

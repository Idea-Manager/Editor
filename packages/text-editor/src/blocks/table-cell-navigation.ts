/** Table cell horizontal caret moves (DOM). Used from the editor root keydown — cell-level listeners never fire when focus is the root contenteditable. */

const ZWSP = '\u200B';

function getLastTextNodeIn(el: Element): Text | null {
  const walker = el.ownerDocument.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let last: Text | null = null;
  let n = walker.nextNode();
  while (n) {
    last = n as Text;
    n = walker.nextNode();
  }
  return last;
}

function getFirstTextNodeIn(el: Element): Text | null {
  const walker = el.ownerDocument.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  return walker.nextNode() as Text | null;
}

function closestCellElement(startContainer: Node): HTMLElement | null {
  let n: Node | null = startContainer;
  if (n.nodeType === Node.TEXT_NODE) n = n.parentElement;
  while (n && n instanceof Element) {
    if (n.hasAttribute('data-cell-id')) return n as HTMLElement;
    n = n.parentElement;
  }
  return null;
}

/** True when the caret is at the end of the last content block in the cell. */
export function isCollapsedRangeAtCellContentEnd(inner: HTMLElement, range: Range): boolean {
  if (!range.collapsed) return false;
  const { startContainer, startOffset } = range;
  if (!inner.contains(startContainer) && startContainer !== inner) return false;

  const blocks = inner.querySelectorAll<HTMLElement>('[data-block-id]');
  if (blocks.length === 0) return false;
  const lastBlock = blocks[blocks.length - 1];
  if (!lastBlock.contains(startContainer) && startContainer !== lastBlock) return false;

  const doc = inner.ownerDocument;
  const endRange = doc.createRange();
  endRange.selectNodeContents(lastBlock);
  endRange.collapse(false);
  if (range.compareBoundaryPoints(Range.START_TO_START, endRange) === 0) return true;

  // Same boundary as "end of block" but different (node, offset) — common for headings/spans vs text nodes.
  const probeToEnd = range.cloneRange();
  try {
    probeToEnd.setEnd(endRange.startContainer, endRange.startOffset);
    if (probeToEnd.collapsed) return true;
  } catch {
    // ignore
  }

  const lastText = getLastTextNodeIn(lastBlock);
  if (lastText && startContainer === lastText && startOffset === lastText.length) return true;

  // Caret after all children of the block root (WebKit-style).
  if (startContainer === lastBlock && startOffset === lastBlock.childNodes.length) return true;

  // Caret after last text when selection is (parentElement, indexAfterTextChild).
  if (startContainer.nodeType === Node.ELEMENT_NODE && lastText?.parentNode === startContainer) {
    const children = startContainer.childNodes;
    const idx = Array.prototype.indexOf.call(children, lastText);
    if (idx !== -1 && startOffset === idx + 1) return true;
  }

  // Empty / placeholder runs use a single ZWSP.
  if (
    lastText &&
    lastText.textContent === ZWSP &&
    startContainer === lastText &&
    (startOffset === 0 || startOffset === 1)
  ) {
    return true;
  }

  return false;
}

/** True when the caret is at the start of the first content block in the cell. */
export function isCollapsedRangeAtCellContentStart(inner: HTMLElement, range: Range): boolean {
  if (!range.collapsed) return false;
  const { startContainer, startOffset } = range;
  if (!inner.contains(startContainer) && startContainer !== inner) return false;

  const blocks = inner.querySelectorAll<HTMLElement>('[data-block-id]');
  if (blocks.length === 0) return false;
  const firstBlock = blocks[0];
  if (!firstBlock.contains(startContainer) && startContainer !== firstBlock) return false;

  const doc = inner.ownerDocument;
  const startRange = doc.createRange();
  startRange.selectNodeContents(firstBlock);
  startRange.collapse(true);
  if (range.compareBoundaryPoints(Range.START_TO_START, startRange) === 0) return true;

  const probeToStart = range.cloneRange();
  try {
    probeToStart.setStart(startRange.startContainer, startRange.startOffset);
    if (probeToStart.collapsed) return true;
  } catch {
    // ignore
  }

  const firstText = getFirstTextNodeIn(firstBlock);
  if (firstText && startContainer === firstText && startOffset === 0) return true;

  if (startContainer === firstBlock && startOffset === 0) return true;

  if (startContainer.nodeType === Node.ELEMENT_NODE && firstText?.parentNode === startContainer) {
    const children = startContainer.childNodes;
    const idx = Array.prototype.indexOf.call(children, firstText);
    if (idx !== -1 && startOffset === idx) return true;
  }

  return false;
}

function placeCaretAtBlockEdge(block: Element, edge: 'start' | 'end'): Range {
  const doc = block.ownerDocument;
  const range = doc.createRange();
  if (edge === 'start') {
    const firstText = getFirstTextNodeIn(block);
    if (firstText) {
      range.setStart(firstText, 0);
      range.collapse(true);
    } else {
      range.selectNodeContents(block);
      range.collapse(true);
    }
  } else {
    const lastText = getLastTextNodeIn(block);
    if (lastText) {
      range.setStart(lastText, lastText.length);
      range.collapse(true);
    } else {
      range.selectNodeContents(block);
      range.collapse(false);
    }
  }
  return range;
}

export function navigateTableCellDOM(wrapper: HTMLElement, currentCellId: string, direction: 'next' | 'prev'): void {
  const cells = Array.from(wrapper.querySelectorAll<HTMLElement>('[data-cell-id]'));
  const idx = cells.findIndex(c => c.getAttribute('data-cell-id') === currentCellId);
  if (idx === -1) return;

  const targetIdx = direction === 'next' ? idx + 1 : idx - 1;
  if (targetIdx < 0 || targetIdx >= cells.length) return;

  const target = cells[targetIdx];
  const inner = target.querySelector<HTMLElement>('.idea-table-cell__inner');
  const sel = wrapper.ownerDocument.defaultView?.getSelection() ?? null;
  const doc = wrapper.ownerDocument;

  let range: Range;
  if (!inner) {
    range = doc.createRange();
    range.selectNodeContents(target);
    range.collapse(direction === 'next');
  } else {
    const blocks = inner.querySelectorAll<HTMLElement>('[data-block-id]');
    if (blocks.length === 0) {
      range = doc.createRange();
      range.selectNodeContents(inner);
      range.collapse(direction === 'next');
    } else {
      const block = direction === 'next' ? blocks[0] : blocks[blocks.length - 1];
      range = placeCaretAtBlockEdge(block, direction === 'next' ? 'start' : 'end');
    }
  }

  sel?.removeAllRanges();
  sel?.addRange(range);
}

/**
 * If the collapsed caret is at a horizontal cell boundary, move to the adjacent cell.
 * @returns true if the event was handled (caller should not run other key handling).
 */
export function tryTableCellHorizontalNavigation(
  root: HTMLElement,
  e: KeyboardEvent,
): boolean {
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Tab') return false;
  if (e.metaKey || e.ctrlKey || e.altKey) return false;
  if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && e.shiftKey) return false;

  const sel = root.ownerDocument.defaultView?.getSelection();
  if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return false;

  const r = sel.getRangeAt(0);
  const cellEl = closestCellElement(r.startContainer);
  if (!cellEl || !root.contains(cellEl)) return false;

  const inner = cellEl.querySelector<HTMLElement>('.idea-table-cell__inner');
  if (!inner) return false;

  const wrapper = cellEl.closest<HTMLElement>('.idea-block--table');
  if (!wrapper || !root.contains(wrapper)) return false;

  const cellId = cellEl.getAttribute('data-cell-id');
  if (!cellId) return false;

  if (e.key === 'Tab') {
    e.preventDefault();
    e.stopPropagation();
    navigateTableCellDOM(wrapper, cellId, e.shiftKey ? 'prev' : 'next');
    return true;
  }

  if (e.key === 'ArrowRight' && isCollapsedRangeAtCellContentEnd(inner, r)) {
    e.preventDefault();
    e.stopPropagation();
    navigateTableCellDOM(wrapper, cellId, 'next');
    return true;
  }

  if (e.key === 'ArrowLeft' && isCollapsedRangeAtCellContentStart(inner, r)) {
    e.preventDefault();
    e.stopPropagation();
    navigateTableCellDOM(wrapper, cellId, 'prev');
    return true;
  }

  return false;
}

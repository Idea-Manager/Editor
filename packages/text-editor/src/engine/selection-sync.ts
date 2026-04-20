import type { BlockSelection } from '@core/model/interfaces';

/** Safe for `[data-block-id="..."]` in querySelector; works in Jest where `CSS` may be missing. */
export function escapeSelectorAttr(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function compareDomPoints(doc: Document, a: Node, ao: number, b: Node, bo: number): number {
  const r = doc.createRange();
  r.setStart(a, ao);
  r.setEnd(b, bo);
  if (!r.collapsed) return -1;
  r.setStart(b, bo);
  r.setEnd(a, ao);
  if (!r.collapsed) return 1;
  return 0;
}

function unionClientRects(range: Range): DOMRect {
  const rects = Array.from(range.getClientRects()).filter(r => r.width > 0 || r.height > 0);
  if (rects.length === 0) {
    return range.getBoundingClientRect();
  }
  let minL = Infinity;
  let minT = Infinity;
  let maxR = -Infinity;
  let maxB = -Infinity;
  for (const r of rects) {
    minL = Math.min(minL, r.left);
    minT = Math.min(minT, r.top);
    maxR = Math.max(maxR, r.right);
    maxB = Math.max(maxB, r.bottom);
  }
  return new DOMRect(minL, minT, maxR - minL, maxB - minT);
}

export class SelectionSync {
  syncToDOM(sel: BlockSelection, rootEl: HTMLElement): void {
    const win = rootEl.ownerDocument.defaultView;
    if (!win) return;

    const domSel = win.getSelection();
    if (!domSel) return;

    const anchorResult = this.findTextNodeAtOffset(rootEl, sel.anchorBlockId, sel.anchorOffset);
    const focusResult = sel.isCollapsed
      ? anchorResult
      : this.findTextNodeAtOffset(rootEl, sel.focusBlockId, sel.focusOffset);

    if (!anchorResult || !focusResult) return;

    try {
      domSel.setBaseAndExtent(
        anchorResult.node,
        anchorResult.offset,
        focusResult.node,
        focusResult.offset,
      );
    } catch {
      // DOM may not support the range if nodes are detached
    }
  }

  syncFromDOM(rootEl: HTMLElement): BlockSelection | null {
    const win = rootEl.ownerDocument.defaultView;
    if (!win) return null;

    const domSel = win.getSelection();
    if (!domSel || domSel.rangeCount === 0) return null;

    const anchorNode = domSel.anchorNode;
    const focusNode = domSel.focusNode;
    if (!anchorNode || !focusNode) return null;

    const anchor = this.resolveBlockOffset(rootEl, anchorNode, domSel.anchorOffset);
    const focus = this.resolveBlockOffset(rootEl, focusNode, domSel.focusOffset);

    if (!anchor || !focus) return null;

    return {
      anchorBlockId: anchor.blockId,
      anchorOffset: anchor.offset,
      focusBlockId: focus.blockId,
      focusOffset: focus.offset,
      isCollapsed: anchor.blockId === focus.blockId && anchor.offset === focus.offset,
    };
  }

  /**
   * Client rect for the selection from the same DOM mapping as syncToDOM.
   * Prefer over window.getSelection() when the native range has no geometry (e.g. table cells).
   */
  getSelectionClientRect(rootEl: HTMLElement, sel: BlockSelection): DOMRect | null {
    if (sel.isCollapsed) return null;

    const doc = rootEl.ownerDocument;
    const anchorResult = this.findTextNodeAtOffset(rootEl, sel.anchorBlockId, sel.anchorOffset);
    const focusResult = this.findTextNodeAtOffset(rootEl, sel.focusBlockId, sel.focusOffset);
    if (!anchorResult || !focusResult) return null;

    const cmp = compareDomPoints(
      doc,
      anchorResult.node,
      anchorResult.offset,
      focusResult.node,
      focusResult.offset,
    );

    const range = doc.createRange();
    try {
      if (cmp <= 0) {
        range.setStart(anchorResult.node, anchorResult.offset);
        range.setEnd(focusResult.node, focusResult.offset);
      } else {
        range.setStart(focusResult.node, focusResult.offset);
        range.setEnd(anchorResult.node, anchorResult.offset);
      }
    } catch {
      return null;
    }

    let rect = unionClientRects(range);
    if (rect.width === 0 && rect.height === 0) {
      rect = range.getBoundingClientRect();
    }

    if (rect.width === 0 && rect.height === 0) {
      const blockEl = rootEl.querySelector(`[data-block-id="${escapeSelectorAttr(sel.anchorBlockId)}"]`);
      if (blockEl) {
        rect = blockEl.getBoundingClientRect();
      }
    }

    if (rect.width === 0 && rect.height === 0) return null;
    return rect;
  }

  private findTextNodeAtOffset(
    rootEl: HTMLElement,
    blockId: string,
    offset: number,
  ): { node: Node; offset: number } | null {
    const blockEl = this.findBlockElement(rootEl, blockId);
    if (!blockEl) return null;

    const walker = document.createTreeWalker(blockEl, NodeFilter.SHOW_TEXT);
    let remaining = offset;

    let textNode = walker.nextNode();
    while (textNode) {
      const len = textNode.textContent?.length ?? 0;
      if (remaining <= len) {
        return { node: textNode, offset: remaining };
      }
      remaining -= len;
      textNode = walker.nextNode();
    }

    const lastText = this.getLastTextNode(blockEl);
    if (lastText) {
      return { node: lastText, offset: lastText.textContent?.length ?? 0 };
    }

    return { node: blockEl, offset: 0 };
  }

  /** Resolves `[data-block-id]`; if multiple, prefer the one containing the live selection anchor. */
  private findBlockElement(rootEl: HTMLElement, blockId: string): Element | null {
    const matches = rootEl.querySelectorAll(`[data-block-id="${escapeSelectorAttr(blockId)}"]`);
    if (matches.length === 0) return null;
    if (matches.length === 1) return matches[0];

    const win = rootEl.ownerDocument.defaultView;
    const anchor = win?.getSelection()?.anchorNode;
    if (anchor) {
      for (const el of matches) {
        if (el.contains(anchor)) return el;
      }
    }
    return matches[0];
  }

  private resolveBlockOffset(
    rootEl: HTMLElement,
    domNode: Node,
    domOffset: number,
  ): { blockId: string; offset: number } | null {
    let blockEl = this.findBlockAncestor(rootEl, domNode);

    if (!blockEl && domNode === rootEl) {
      const idx = Math.min(domOffset, rootEl.children.length - 1);
      const child = rootEl.children[Math.max(idx, 0)] as HTMLElement | undefined;
      if (child) {
        blockEl = child.hasAttribute('data-block-id')
          ? child
          : child.querySelector('[data-block-id]');
      }
    }

    if (!blockEl) return null;

    const blockId = blockEl.getAttribute('data-block-id');
    if (!blockId) return null;

    let offset = 0;
    const walker = document.createTreeWalker(blockEl, NodeFilter.SHOW_TEXT);
    let textNode = walker.nextNode();

    while (textNode) {
      if (textNode === domNode) {
        return { blockId, offset: offset + domOffset };
      }
      offset += textNode.textContent?.length ?? 0;
      textNode = walker.nextNode();
    }

    if (domNode === blockEl || blockEl.contains(domNode)) {
      return { blockId, offset: this.computeElementOffset(blockEl, domNode, domOffset) };
    }

    return null;
  }

  private computeElementOffset(blockEl: Element, node: Node, childIndex: number): number {
    let offset = 0;
    const walker = document.createTreeWalker(blockEl, NodeFilter.SHOW_TEXT);
    let textNode = walker.nextNode();
    let count = 0;

    while (textNode) {
      if (node.nodeType !== Node.TEXT_NODE && node.contains(textNode)) {
        if (count >= childIndex) break;
        count++;
      }
      offset += textNode.textContent?.length ?? 0;
      textNode = walker.nextNode();
    }

    return offset;
  }

  private findBlockAncestor(rootEl: HTMLElement, node: Node): Element | null {
    let current: Node | null = node;
    while (current && current !== rootEl) {
      if (
        current instanceof Element &&
        current.hasAttribute('data-block-id')
      ) {
        return current;
      }
      current = current.parentNode;
    }
    return null;
  }

  private getLastTextNode(el: Element): Text | null {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let last: Text | null = null;
    let node = walker.nextNode();
    while (node) {
      last = node as Text;
      node = walker.nextNode();
    }
    return last;
  }
}

import type { BlockSelection } from '@core/model/interfaces';

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

  private findTextNodeAtOffset(
    rootEl: HTMLElement,
    blockId: string,
    offset: number,
  ): { node: Node; offset: number } | null {
    const blockEl = rootEl.querySelector(`[data-block-id="${blockId}"]`);
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

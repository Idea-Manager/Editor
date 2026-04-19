import type { BlockNode, TextRun, InlineMark } from '@core/model/interfaces';
import type { EditorContext } from './editor-context';
import type { BlockRenderer } from '../renderer/block-renderer';
import type { SelectionSync } from './selection-sync';
import { generateId } from '@core/id';
import { PasteCommand } from './commands/paste-command';
import { DeleteSelectionCommand } from './commands/delete-selection-command';
import { InlineMarkManager } from '../inline/inline-mark-manager';

const ALLOWED_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'BR', 'P', 'DIV', 'SPAN']);

export class ClipboardHandler {
  private readonly disposers: (() => void)[] = [];

  constructor(
    private readonly ctx: EditorContext,
    private readonly blockRenderer: BlockRenderer,
    private readonly selectionSync: SelectionSync,
  ) {
    this.attach();
  }

  destroy(): void {
    this.disposers.forEach(fn => fn());
    this.disposers.length = 0;
  }

  private attach(): void {
    const root = this.ctx.rootElement;

    const onCopy = (e: ClipboardEvent) => this.handleCopy(e);
    const onCut = (e: ClipboardEvent) => this.handleCut(e);
    const onPaste = (e: ClipboardEvent) => this.handlePaste(e);

    root.addEventListener('copy', onCopy);
    root.addEventListener('cut', onCut);
    root.addEventListener('paste', onPaste);

    this.disposers.push(
      () => root.removeEventListener('copy', onCopy),
      () => root.removeEventListener('cut', onCut),
      () => root.removeEventListener('paste', onPaste),
    );
  }

  private handleCopy(e: ClipboardEvent): void {
    e.preventDefault();
    const sel = this.ctx.selectionManager.get();
    if (!sel || sel.isCollapsed) return;

    const { plainText, html } = this.serializeSelection();
    e.clipboardData?.setData('text/plain', plainText);
    e.clipboardData?.setData('text/html', html);
  }

  private handleCut(e: ClipboardEvent): void {
    e.preventDefault();
    const sel = this.ctx.selectionManager.get();
    if (!sel || sel.isCollapsed) return;

    const { plainText, html } = this.serializeSelection();
    e.clipboardData?.setData('text/plain', plainText);
    e.clipboardData?.setData('text/html', html);

    const delCmd = new DeleteSelectionCommand(this.ctx.document, sel);
    this.ctx.undoRedoManager.push(delCmd);

    const startOffset = Math.min(sel.anchorOffset, sel.focusOffset);
    this.ctx.selectionManager.setCollapsed(sel.anchorBlockId, startOffset);
    this.ctx.eventBus.emit('doc:change', { document: this.ctx.document });
  }

  private handlePaste(e: ClipboardEvent): void {
    e.preventDefault();
    const sel = this.ctx.selectionManager.get();
    if (!sel) return;

    // Delete existing selection first
    if (!sel.isCollapsed) {
      const delCmd = new DeleteSelectionCommand(this.ctx.document, sel);
      this.ctx.undoRedoManager.push(delCmd);
      const startOffset = Math.min(sel.anchorOffset, sel.focusOffset);
      this.ctx.selectionManager.setCollapsed(sel.anchorBlockId, startOffset);
    }

    const currentSel = this.ctx.selectionManager.get();
    if (!currentSel) return;

    const html = e.clipboardData?.getData('text/html');
    const plainText = e.clipboardData?.getData('text/plain') ?? '';

    const blocks = html
      ? this.parseHtml(html)
      : this.parsePlainText(plainText);

    if (blocks.length === 0) return;

    const cmd = new PasteCommand(
      this.ctx.document,
      currentSel.anchorBlockId,
      currentSel.anchorOffset,
      blocks,
    );

    this.ctx.undoRedoManager.push(cmd);
    this.ctx.eventBus.emit('doc:change', { document: this.ctx.document });
  }

  private serializeSelection(): { plainText: string; html: string } {
    const sel = this.ctx.selectionManager.get();
    if (!sel) return { plainText: '', html: '' };

    const mgr = new InlineMarkManager();
    const blocks = this.getSelectedBlocks(sel);

    const plainLines: string[] = [];
    const htmlParts: string[] = [];

    for (const block of blocks) {
      const text = block.children.map(r => r.data.text).join('');
      plainLines.push(text);

      const runHtml = block.children.map(r => {
        let content = this.escapeHtml(r.data.text);
        if (r.data.marks.includes('bold')) content = `<strong>${content}</strong>`;
        if (r.data.marks.includes('italic')) content = `<em>${content}</em>`;
        if (r.data.marks.includes('underline')) content = `<u>${content}</u>`;
        if (r.data.marks.includes('code')) content = `<code>${content}</code>`;
        return content;
      }).join('');

      htmlParts.push(`<p>${runHtml}</p>`);
    }

    return {
      plainText: plainLines.join('\n'),
      html: htmlParts.join(''),
    };
  }

  private getSelectedBlocks(sel: import('@core/model/interfaces').BlockSelection): BlockNode[] {
    const anchorIdx = this.ctx.document.children.findIndex(b => b.id === sel.anchorBlockId);
    const focusIdx = this.ctx.document.children.findIndex(b => b.id === sel.focusBlockId);

    const startIdx = Math.min(anchorIdx, focusIdx);
    const endIdx = Math.max(anchorIdx, focusIdx);

    return this.ctx.document.children.slice(startIdx, endIdx + 1);
  }

  parsePlainText(text: string): BlockNode[] {
    const lines = text.split('\n');
    return lines.map(line => ({
      id: generateId('blk'),
      type: 'paragraph' as const,
      data: { align: 'left' as const },
      children: [{
        id: generateId('txt'),
        type: 'text' as const,
        data: { text: line, marks: [] },
      }],
      meta: { createdAt: Date.now(), version: 1 },
    }));
  }

  parseHtml(html: string): BlockNode[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const blocks: BlockNode[] = [];

    const processNode = (node: Node): void => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent ?? '';
        if (text.trim()) {
          blocks.push(this.createParagraphFromRuns([{
            id: generateId('txt'),
            type: 'text',
            data: { text, marks: [] },
          }]));
        }
        return;
      }

      if (node.nodeType !== Node.ELEMENT_NODE) return;

      const el = node as Element;
      const tag = el.tagName;

      if (tag === 'P' || tag === 'DIV') {
        const runs = this.extractRuns(el, []);
        if (runs.length > 0) {
          blocks.push(this.createParagraphFromRuns(runs));
        }
        return;
      }

      if (tag === 'BR') {
        blocks.push(this.createParagraphFromRuns([{
          id: generateId('txt'),
          type: 'text',
          data: { text: '', marks: [] },
        }]));
        return;
      }

      // Process children
      for (const child of Array.from(el.childNodes)) {
        processNode(child);
      }
    };

    for (const child of Array.from(doc.body.childNodes)) {
      processNode(child);
    }

    if (blocks.length === 0 && doc.body.textContent) {
      blocks.push(this.createParagraphFromRuns([{
        id: generateId('txt'),
        type: 'text',
        data: { text: doc.body.textContent, marks: [] },
      }]));
    }

    return blocks;
  }

  private extractRuns(el: Element, inheritedMarks: InlineMark[]): TextRun[] {
    const runs: TextRun[] = [];

    for (const child of Array.from(el.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent ?? '';
        if (text) {
          runs.push({
            id: generateId('txt'),
            type: 'text',
            data: { text, marks: [...inheritedMarks] },
          });
        }
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const childEl = child as Element;
        const tag = childEl.tagName;
        const marks = [...inheritedMarks];

        if (tag === 'B' || tag === 'STRONG') marks.push('bold');
        else if (tag === 'I' || tag === 'EM') marks.push('italic');
        else if (tag === 'U') marks.push('underline');
        else if (tag === 'CODE') marks.push('code');

        // Deduplicate
        const uniqueMarks = [...new Set(marks)] as InlineMark[];
        runs.push(...this.extractRuns(childEl, uniqueMarks));
      }
    }

    return runs;
  }

  private createParagraphFromRuns(runs: TextRun[]): BlockNode {
    return {
      id: generateId('blk'),
      type: 'paragraph',
      data: { align: 'left' as const },
      children: runs,
      meta: { createdAt: Date.now(), version: 1 },
    };
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

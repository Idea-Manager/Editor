import type {
  BlockNode,
  BlockSelection,
  EmbedData,
  InlineMark,
  TextRun,
} from '@core/model/interfaces';
import type { EditorContext } from './editor-context';
import type { BlockRenderer } from '../renderer/block-renderer';
import type { SelectionSync } from './selection-sync';
import { generateId } from '@core/id';
import { PasteCommand } from './commands/paste-command';
import { DeleteBlockCommand } from './commands/delete-block-command';
import { DeleteSelectionCommand } from './commands/delete-selection-command';
import { InlineMarkManager } from '../inline/inline-mark-manager';
import {
  type BlockLocation,
  findBlockLocation,
  findTableCell,
  getBlockById,
  getSelectionStartAfterDelete,
} from './block-locator';
import { IDEA_EDITOR_CLIPBOARD_MIME } from './clipboard-constants';
import { DEFAULT_PASTE_DATA_SOURCES, type TextEditorClipboardOptions } from './clipboard-options';
import {
  parseIdeaEditorClipboardPayload,
  serializeIdeaEditorClipboardPayload,
} from './clipboard-idea';

const ALLOWED_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'BR', 'P', 'DIV', 'SPAN']);

function isAtomicCopyableCollapsed(type: string): boolean {
  return type === 'embed' || type === 'table' || type === 'graphic';
}

function blockTextLength(block: BlockNode): number {
  return block.children.reduce((n, r) => n + r.data.text.length, 0);
}

export class ClipboardHandler {
  private readonly disposers: (() => void)[] = [];

  constructor(
    private readonly ctx: EditorContext,
    private readonly blockRenderer: BlockRenderer,
    private readonly selectionSync: SelectionSync,
    private readonly clipboardOptions?: TextEditorClipboardOptions,
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
    if (!sel) return;

    const blocks = this.resolveBlocksForCopy(sel);
    if (blocks.length === 0) return;

    const { plainText, html } = this.serializeBlocks(blocks);
    e.clipboardData?.setData('text/plain', plainText);
    e.clipboardData?.setData('text/html', html);
    e.clipboardData?.setData(
      IDEA_EDITOR_CLIPBOARD_MIME,
      serializeIdeaEditorClipboardPayload(blocks),
    );
  }

  private handleCut(e: ClipboardEvent): void {
    e.preventDefault();
    const sel = this.ctx.selectionManager.get();
    if (!sel) return;

    if (sel.isCollapsed) {
      const b = getBlockById(this.ctx.document, sel.anchorBlockId);
      if (b && isAtomicCopyableCollapsed(b.type)) {
        const blocks: BlockNode[] = [b];
        const { plainText, html } = this.serializeBlocks(blocks);
        e.clipboardData?.setData('text/plain', plainText);
        e.clipboardData?.setData('text/html', html);
        e.clipboardData?.setData(
          IDEA_EDITOR_CLIPBOARD_MIME,
          serializeIdeaEditorClipboardPayload(blocks),
        );

        const preLoc = findBlockLocation(this.ctx.document, b.id);
        if (!preLoc) return;
        const oldLen = preLoc.parentList.length;
        const removedIndex = preLoc.index;

        this.ctx.undoRedoManager.push(new DeleteBlockCommand(this.ctx.document, b.id));
        const caret = this.caretAfterSingleBlockDelete(preLoc, oldLen, removedIndex);
        if (caret) this.ctx.selectionManager.setCollapsed(caret.blockId, caret.offset);
        this.ctx.eventBus.emit('doc:change', { document: this.ctx.document });
        return;
      }
      return;
    }

    const blocks = this.getSelectedBlocks(sel);
    if (blocks.length === 0) return;
    const { plainText, html } = this.serializeBlocks(blocks);
    e.clipboardData?.setData('text/plain', plainText);
    e.clipboardData?.setData('text/html', html);
    e.clipboardData?.setData(
      IDEA_EDITOR_CLIPBOARD_MIME,
      serializeIdeaEditorClipboardPayload(blocks),
    );

    const delCmd = new DeleteSelectionCommand(this.ctx.document, sel);
    this.ctx.undoRedoManager.push(delCmd);

    const { blockId, offset } = getSelectionStartAfterDelete(this.ctx.document, sel);
    this.ctx.selectionManager.setCollapsed(blockId, offset);
    this.ctx.eventBus.emit('doc:change', { document: this.ctx.document });
  }

  /**
   * After removing one block, place caret on the best neighbor: start of the block that
   * replaced the position, or end of the previous if the last block was cut.
   */
  private caretAfterSingleBlockDelete(
    preLoc: BlockLocation,
    oldLen: number,
    removedIndex: number,
  ): { blockId: string; offset: number } | null {
    if (preLoc.parentKind === 'table-cell' && preLoc.tableBlockId && preLoc.cellId) {
      const cell = findTableCell(this.ctx.document, preLoc.tableBlockId, preLoc.cellId);
      if (!cell || cell.blocks.length === 0) return null;
      if (oldLen === 1) {
        const b0 = cell.blocks[0]!;
        return { blockId: b0.id, offset: 0 };
      }
      return this.caretInBlockListAfterDelete(cell.blocks, removedIndex, oldLen);
    }

    const list = this.ctx.document.children;
    if (list.length === 0) return null;
    if (oldLen === 1) {
      const b0 = list[0]!;
      if (b0.type === 'embed' || b0.type === 'table' || b0.type === 'graphic') {
        return { blockId: b0.id, offset: 0 };
      }
      return { blockId: b0.id, offset: blockTextLength(b0) };
    }
    return this.caretInBlockListAfterDelete(list, removedIndex, oldLen);
  }

  private caretInBlockListAfterDelete(
    list: BlockNode[],
    removedIndex: number,
    oldLen: number,
  ): { blockId: string; offset: number } {
    const wasLast = removedIndex === oldLen - 1;
    const i = wasLast ? list.length - 1 : Math.min(removedIndex, list.length - 1);
    const b = list[i]!;
    if (b.type === 'table' || b.type === 'embed' || b.type === 'graphic') {
      return { blockId: b.id, offset: 0 };
    }
    if (wasLast) {
      return { blockId: b.id, offset: blockTextLength(b) };
    }
    return { blockId: b.id, offset: 0 };
  }

  private resolveBlocksForCopy(sel: BlockSelection): BlockNode[] {
    if (!sel.isCollapsed) {
      return this.getSelectedBlocks(sel);
    }
    const b = getBlockById(this.ctx.document, sel.anchorBlockId);
    if (b && isAtomicCopyableCollapsed(b.type)) {
      return [b];
    }
    return [];
  }

  private resolvePasteBlocksFromDataTransfer(data: DataTransfer): BlockNode[] {
    const order = this.clipboardOptions?.pasteDataSources ?? DEFAULT_PASTE_DATA_SOURCES;
    for (const src of order) {
      if (src === 'idea-editor') {
        const idea = data.getData(IDEA_EDITOR_CLIPBOARD_MIME) ?? '';
        if (idea) {
          const parsed = parseIdeaEditorClipboardPayload(idea);
          if (parsed && parsed.length > 0) return parsed;
        }
      } else if (src === 'text/html') {
        const html = data.getData('text/html');
        if (html) {
          const fromHtml = this.parseHtml(html);
          if (fromHtml.length > 0) return fromHtml;
        }
      } else if (src === 'text/plain') {
        return this.parsePlainText(data.getData('text/plain') ?? '');
      }
    }
    return [];
  }

  private handlePaste(e: ClipboardEvent): void {
    e.preventDefault();
    const sel = this.ctx.selectionManager.get();
    if (!sel) return;

    // Delete existing selection first
    if (!sel.isCollapsed) {
      const delCmd = new DeleteSelectionCommand(this.ctx.document, sel);
      this.ctx.undoRedoManager.push(delCmd);
      const { blockId, offset } = getSelectionStartAfterDelete(this.ctx.document, sel);
      this.ctx.selectionManager.setCollapsed(blockId, offset);
    }

    const currentSel = this.ctx.selectionManager.get();
    if (!currentSel) return;

    const loc = findBlockLocation(this.ctx.document, currentSel.anchorBlockId);
    const inTableCell = loc?.parentKind === 'table-cell';

    const data = e.clipboardData;
    if (!data) return;

    const custom = this.clipboardOptions?.transformPaste?.(this.ctx, e);
    let blocks: BlockNode[];
    if (custom != null && custom.length > 0) {
      blocks = custom;
    } else {
      blocks = this.resolvePasteBlocksFromDataTransfer(data);
    }

    if (inTableCell) {
      blocks = blocks.filter(b => b.type !== 'table');
    }
    if (blocks.length === 0) return;

    const cmd = new PasteCommand(
      this.ctx.document,
      currentSel.anchorBlockId,
      currentSel.anchorOffset,
      blocks,
    );

    this.ctx.undoRedoManager.push(cmd);
    const caret = cmd.getCaretAfterPaste();
    if (caret) {
      this.ctx.selectionManager.setCollapsed(caret.blockId, caret.offset);
    }
    this.ctx.eventBus.emit('doc:change', { document: this.ctx.document });
  }

  private serializeBlocks(blocks: BlockNode[]): { plainText: string; html: string } {
    const plainLines: string[] = [];
    const htmlParts: string[] = [];

    for (const block of blocks) {
      if (block.type === 'embed') {
        const d = block.data as EmbedData;
        const t = d.title || d.url || 'Embed';
        plainLines.push(t);
        htmlParts.push(`<p>${this.escapeHtml(t)}</p>`);
        continue;
      }
      if (block.type === 'table') {
        plainLines.push('Table');
        htmlParts.push('<p>Table</p>');
        continue;
      }
      if (block.type === 'graphic') {
        const id = (block.data as { frameId?: string }).frameId ?? 'graphic';
        plainLines.push(`Graphic: ${id}`);
        htmlParts.push(`<p>${this.escapeHtml(`Graphic: ${id}`)}</p>`);
        continue;
      }

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

  private getSelectedBlocks(sel: BlockSelection): BlockNode[] {
    const a = findBlockLocation(this.ctx.document, sel.anchorBlockId);
    const f = findBlockLocation(this.ctx.document, sel.focusBlockId);
    if (a && f && a.parentList === f.parentList) {
      const i1 = Math.min(a.index, f.index);
      const i2 = Math.max(a.index, f.index);
      return a.parentList.slice(i1, i2 + 1);
    }

    const single = getBlockById(this.ctx.document, sel.anchorBlockId);
    return single ? [single] : [];
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

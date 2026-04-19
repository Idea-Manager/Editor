import type { ListItemData } from '@core/model/interfaces';
import type { EditorContext } from './editor-context';
import type { BlockRenderer } from '../renderer/block-renderer';
import type { SelectionSync } from './selection-sync';
import type { SlashPalette } from '../toolbar/slash-palette';
import { IntentClassifier } from './intent-classifier';
import type { EditIntent } from './intent-classifier';
import { InsertTextCommand } from './commands/insert-text-command';
import { DeleteCharCommand } from './commands/delete-char-command';
import { SplitBlockCommand } from './commands/split-block-command';
import { MergeBlocksCommand } from './commands/merge-blocks-command';
import { ToggleMarkCommand } from '../inline/toggle-mark-command';
import { InlineMarkManager } from '../inline/inline-mark-manager';
import { DeleteSelectionCommand } from './commands/delete-selection-command';
import { IndentListCommand } from './commands/indent-list-command';
import { OutdentListCommand } from './commands/outdent-list-command';
import { ChangeBlockTypeCommand } from './commands/change-block-type-command';

export class InputInterceptor {
  private readonly classifier = new IntentClassifier();
  private readonly markManager = new InlineMarkManager();
  private readonly disposers: (() => void)[] = [];
  private slashPalette: SlashPalette | null = null;

  constructor(
    private readonly ctx: EditorContext,
    private readonly blockRenderer: BlockRenderer,
    private readonly selectionSync: SelectionSync,
  ) {
    this.attach();
  }

  setSlashPalette(palette: SlashPalette): void {
    this.slashPalette = palette;
  }

  destroy(): void {
    this.disposers.forEach(fn => fn());
    this.disposers.length = 0;
  }

  private attach(): void {
    const root = this.ctx.rootElement;

    const onKeydown = (e: KeyboardEvent) => this.handleKeydown(e);
    const onBeforeInput = (e: InputEvent) => this.handleBeforeInput(e);
    const onSelectionChange = () => this.handleSelectionChange();

    root.addEventListener('keydown', onKeydown);
    root.addEventListener('beforeinput', onBeforeInput);
    document.addEventListener('selectionchange', onSelectionChange);

    this.disposers.push(
      () => root.removeEventListener('keydown', onKeydown),
      () => root.removeEventListener('beforeinput', onBeforeInput),
      () => document.removeEventListener('selectionchange', onSelectionChange),
    );
  }

  private isInsideTableCell(e: Event): boolean {
    const target = e.target as HTMLElement | null;
    if (!target) return false;
    return !!target.closest?.('[data-cell-id]');
  }

  private handleKeydown(e: KeyboardEvent): void {
    if (this.slashPalette?.isVisible()) {
      if (e.key === 'Backspace') {
        e.preventDefault();
        this.slashPalette.updateFilter('Backspace');
        return;
      }
      if (['ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(e.key)) {
        return;
      }
    }

    if (this.isInsideTableCell(e)) {
      const intent = this.classifier.classifyKeydown(e);
      if (intent && (intent.type === 'undo' || intent.type === 'redo')) {
        e.preventDefault();
        this.dispatch(intent);
      }
      return;
    }

    const intent = this.classifier.classifyKeydown(e);
    if (!intent) return;

    if (['splitBlock', 'deleteBackward', 'deleteForward', 'toggleMark', 'undo', 'redo', 'indent', 'outdent'].includes(intent.type)) {
      e.preventDefault();
    }

    this.dispatch(intent);
  }

  private handleBeforeInput(e: InputEvent): void {
    if (this.slashPalette?.isVisible()) {
      e.preventDefault();
      if (e.inputType === 'insertText' && e.data) {
        this.slashPalette.updateFilter(e.data);
      }
      return;
    }

    if (this.isInsideTableCell(e)) return;

    const intent = this.classifier.classifyBeforeInput(e);
    if (!intent) return;

    e.preventDefault();
    this.dispatch(intent);
  }

  private handleSelectionChange(): void {
    const sel = this.selectionSync.syncFromDOM(this.ctx.rootElement);
    if (sel) {
      this.ctx.selectionManager.set(sel);
    }
  }

  private dispatch(intent: EditIntent): void {
    const sel = this.ctx.selectionManager.get();
    if (!sel && intent.type !== 'selectAll') return;

    switch (intent.type) {
      case 'insertText':
        this.handleInsertText(intent.text);
        break;

      case 'deleteBackward':
        this.handleDelete('backward');
        break;

      case 'deleteForward':
        this.handleDelete('forward');
        break;

      case 'splitBlock':
        this.handleSplitBlock();
        break;

      case 'toggleMark':
        this.handleToggleMark(intent.mark);
        break;

      case 'undo':
        this.ctx.undoRedoManager.undo();
        break;

      case 'redo':
        this.ctx.undoRedoManager.redo();
        break;

      case 'selectAll':
        this.handleSelectAll();
        break;

      case 'indent':
        this.handleIndent();
        break;

      case 'outdent':
        this.handleOutdent();
        break;
    }
  }

  private handleInsertText(text: string): void {
    const sel = this.ctx.selectionManager.get();
    if (!sel) return;

    // When slash palette is visible, forward characters as filter input
    if (this.slashPalette?.isVisible()) {
      if (text === '/') return; // Ignore extra slashes while palette open
      this.slashPalette.updateFilter(text);
      return;
    }

    // Detect "/" at the start of an empty paragraph to open slash palette
    if (text === '/' && this.slashPalette && sel.isCollapsed && sel.anchorOffset === 0) {
      const block = this.ctx.document.children.find(b => b.id === sel.anchorBlockId);
      if (block && block.type === 'paragraph') {
        const textLen = block.children.reduce((s, r) => s + r.data.text.length, 0);
        if (textLen === 0) {
          this.slashPalette.show(block.id);
          return;
        }
      }
    }

    if (!sel.isCollapsed) {
      this.deleteSelection();
    }

    const currentSel = this.ctx.selectionManager.get();
    if (!currentSel) return;

    const cmd = new InsertTextCommand(
      this.ctx.document,
      currentSel.anchorBlockId,
      currentSel.anchorOffset,
      text,
    );

    this.ctx.undoRedoManager.push(cmd);
    this.ctx.selectionManager.setCollapsed(
      currentSel.anchorBlockId,
      currentSel.anchorOffset + text.length,
    );
    this.emitChange();
  }

  private handleDelete(direction: 'backward' | 'forward'): void {
    const sel = this.ctx.selectionManager.get();
    if (!sel) return;

    if (!sel.isCollapsed) {
      this.deleteSelection();
      this.emitChange();
      return;
    }

    if (direction === 'backward' && sel.anchorOffset === 0) {
      const block = this.ctx.document.children.find(b => b.id === sel.anchorBlockId);
      if (block && block.type === 'list_item') {
        const textLen = block.children.reduce((s, r) => s + r.data.text.length, 0);
        if (textLen === 0) {
          const cmd = new ChangeBlockTypeCommand(
            this.ctx.document,
            block.id,
            'paragraph',
            this.ctx.blockRegistry,
          );
          this.ctx.undoRedoManager.push(cmd);
          this.emitChange();
          return;
        }
      }
      this.handleMergeBackward();
      return;
    }

    const cmd = new DeleteCharCommand(
      this.ctx.document,
      sel.anchorBlockId,
      sel.anchorOffset,
      direction,
    );

    this.ctx.undoRedoManager.push(cmd);

    if (direction === 'backward') {
      this.ctx.selectionManager.setCollapsed(
        sel.anchorBlockId,
        sel.anchorOffset - 1,
      );
    }
    this.emitChange();
  }

  private handleMergeBackward(): void {
    const sel = this.ctx.selectionManager.get();
    if (!sel) return;

    const cmd = new MergeBlocksCommand(this.ctx.document, sel.anchorBlockId);
    this.ctx.undoRedoManager.push(cmd);

    const prevBlockId = cmd.getPreviousBlockId();
    if (prevBlockId) {
      this.ctx.selectionManager.setCollapsed(prevBlockId, cmd.getMergeOffset());
    }
    this.emitChange();
  }

  private handleSplitBlock(): void {
    const sel = this.ctx.selectionManager.get();
    if (!sel) return;

    if (!sel.isCollapsed) {
      this.deleteSelection();
    }

    const currentSel = this.ctx.selectionManager.get();
    if (!currentSel) return;

    const block = this.ctx.document.children.find(b => b.id === currentSel.anchorBlockId);
    if (block && block.type === 'list_item') {
      const textLen = block.children.reduce((s, r) => s + r.data.text.length, 0);
      if (textLen === 0) {
        const cmd = new ChangeBlockTypeCommand(
          this.ctx.document,
          block.id,
          'paragraph',
          this.ctx.blockRegistry,
        );
        this.ctx.undoRedoManager.push(cmd);
        this.emitChange();
        return;
      }
    }

    const cmd = new SplitBlockCommand(
      this.ctx.document,
      currentSel.anchorBlockId,
      currentSel.anchorOffset,
    );

    this.ctx.undoRedoManager.push(cmd);
    this.ctx.selectionManager.setCollapsed(cmd.getNewBlockId(), 0);
    this.emitChange();
  }

  private handleToggleMark(mark: import('@core/model/interfaces').InlineMark): void {
    const sel = this.ctx.selectionManager.get();
    if (!sel || sel.isCollapsed) return;

    const block = this.ctx.document.children.find(b => b.id === sel.anchorBlockId);
    if (!block) return;

    const cmd = new ToggleMarkCommand(
      block,
      mark,
      Math.min(sel.anchorOffset, sel.focusOffset),
      Math.max(sel.anchorOffset, sel.focusOffset),
      this.markManager,
    );

    this.ctx.undoRedoManager.push(cmd);
    this.emitChange();
  }

  private handleSelectAll(): void {
    const children = this.ctx.document.children;
    if (children.length === 0) return;

    const firstBlock = children[0];
    const lastBlock = children[children.length - 1];
    const lastLen = lastBlock.children.reduce(
      (sum, r) => sum + r.data.text.length,
      0,
    );

    this.ctx.selectionManager.set({
      anchorBlockId: firstBlock.id,
      anchorOffset: 0,
      focusBlockId: lastBlock.id,
      focusOffset: lastLen,
      isCollapsed: false,
    });
  }

  private handleIndent(): void {
    const sel = this.ctx.selectionManager.get();
    if (!sel) return;

    const block = this.ctx.document.children.find(b => b.id === sel.anchorBlockId);
    if (!block || block.type !== 'list_item') return;

    const cmd = new IndentListCommand(this.ctx.document, block.id);
    this.ctx.undoRedoManager.push(cmd);
    this.emitChange();
  }

  private handleOutdent(): void {
    const sel = this.ctx.selectionManager.get();
    if (!sel) return;

    const block = this.ctx.document.children.find(b => b.id === sel.anchorBlockId);
    if (!block || block.type !== 'list_item') return;

    const cmd = new OutdentListCommand(this.ctx.document, block.id);
    this.ctx.undoRedoManager.push(cmd);
    this.emitChange();
  }

  private deleteSelection(): void {
    const sel = this.ctx.selectionManager.get();
    if (!sel || sel.isCollapsed) return;

    const cmd = new DeleteSelectionCommand(this.ctx.document, sel);
    this.ctx.undoRedoManager.push(cmd);

    const startOffset = Math.min(sel.anchorOffset, sel.focusOffset);
    const startBlockId = this.getStartBlockId(sel);
    this.ctx.selectionManager.setCollapsed(startBlockId, startOffset);
  }

  private getStartBlockId(sel: import('@core/model/interfaces').BlockSelection): string {
    const anchorIdx = this.ctx.document.children.findIndex(b => b.id === sel.anchorBlockId);
    const focusIdx = this.ctx.document.children.findIndex(b => b.id === sel.focusBlockId);

    if (anchorIdx <= focusIdx) {
      return anchorIdx === focusIdx && sel.anchorOffset > sel.focusOffset
        ? sel.focusBlockId
        : sel.anchorBlockId;
    }
    return sel.focusBlockId;
  }

  private emitChange(): void {
    this.ctx.eventBus.emit('doc:change', { document: this.ctx.document });
  }
}

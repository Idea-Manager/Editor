import type { GraphicContext } from './graphic-context';
import type { ArrowData } from '../blocks/arrow/arrow-block';
import { arrowMidpoint } from '../blocks/arrow/arrow-geometry';
import { UpdateElementCommand } from './commands/update-element-command';
import { GRAPHIC_ARROW_LABEL_PLACEHOLDER } from '../i18n/keys';

/**
 * Inline label editor that appears at the arrow's midpoint on double-click.
 *
 * Creates a `<input type="text">` positioned in the canvas overlay layer.
 * On commit (Enter / blur) pushes an `UpdateElementCommand` for `data.label`.
 * On Escape, closes without committing.
 */
export class ArrowLabelEditor {
  private readonly ctx: GraphicContext;
  private readonly canvas: HTMLElement;
  private input: HTMLInputElement | null = null;
  private activeElementId: string | null = null;

  constructor(ctx: GraphicContext, canvas: HTMLElement) {
    this.ctx = ctx;
    this.canvas = canvas;
  }

  /**
   * Opens the label editor for the given arrow element.
   * If the editor is already open for this element, no-ops.
   */
  open(elementId: string): void {
    if (this.activeElementId === elementId) return;
    this.close();

    const { page, viewportController, i18n } = this.ctx;
    const el = page.elements.find(e => e.id === elementId);
    if (!el || el.type !== 'arrow') return;

    const data = el.data as unknown as ArrowData;

    // Position at the arrow's world midpoint, converted to screen coords relative to canvas
    const mid = arrowMidpoint(data.from, data.to, data.arrowType);
    const canvasRect = this.canvas.getBoundingClientRect();
    const screen = viewportController.worldToClient(mid.x, mid.y, this.canvas);
    const screenX = screen.x - canvasRect.left;
    const screenY = screen.y - canvasRect.top;

    this.activeElementId = elementId;

    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.className = 'idea-graphic-arrow__label-editor';
    this.input.value = data.label ?? '';
    this.input.placeholder = i18n.t(GRAPHIC_ARROW_LABEL_PLACEHOLDER);
    this.input.style.left = `${screenX}px`;
    this.input.style.top = `${screenY}px`;
    this.input.style.transform = 'translate(-50%, -50%)';
    this.input.style.position = 'absolute';
    this.input.style.zIndex = '30';

    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.stopPropagation();
        this._commit();
      } else if (e.key === 'Escape') {
        e.stopPropagation();
        this.close();
      }
    });

    this.input.addEventListener('blur', () => {
      this._commit();
    });

    this.canvas.appendChild(this.input);
    this.input.focus();
    this.input.select();
  }

  close(): void {
    if (!this.input) return;
    this.input.remove();
    this.input = null;
    this.activeElementId = null;
  }

  isOpen(): boolean {
    return this.input !== null;
  }

  destroy(): void {
    this.close();
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private _commit(): void {
    if (!this.input || !this.activeElementId) return;

    const value = this.input.value.trim();
    const elementId = this.activeElementId;

    this.close();

    const { document: doc, page, undoRedoManager, eventBus } = this.ctx;

    const cmd = new UpdateElementCommand({
      doc,
      pageId: page.id,
      elementId,
      path: 'data.label',
      value: value || undefined,
    });

    undoRedoManager.push(cmd);
    eventBus.emit('element:update');
    eventBus.emit('doc:change');
  }
}

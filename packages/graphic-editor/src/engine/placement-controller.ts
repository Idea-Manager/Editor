import type { GraphicContext } from './graphic-context';
import type { GraphicSelectionManager } from './selection-manager';
import type { ToolStateSnapshot } from './tool-state';
import { AddElementCommand } from './commands/add-element-command';
import { InstantiateCustomBlockCommand } from '../groups/instantiate-custom-block-command';

const STICKER_DEFAULT_SIZE = 120;

/**
 * Handles ghost-placement mode ('placement' tool) and sticker single-click mode.
 *
 * Placement mode: shows a translucent ghost preview that follows the cursor.
 * On pointerdown, places the block at the cursor world position and selects it.
 * Selection change opens the floating properties window via GroupController.
 *
 * Sticker mode: a single click places a sticker immediately without a ghost.
 * The active tool stays 'sticker' so the user can drop multiple stickers.
 *
 * Canvas pointerdown is routed through GraphicEditor.bindPointerEvents — do not
 * register a separate listener here.
 */
export class PlacementController {
  private readonly ctx: GraphicContext;
  private readonly selectionManager: GraphicSelectionManager;
  private readonly canvas: HTMLElement;

  private ghostEl: HTMLElement | null = null;

  private readonly onToolChange: (snap: ToolStateSnapshot) => void;
  private readonly onPointerMove: (e: PointerEvent) => void;

  constructor(
    ctx: GraphicContext,
    selectionManager: GraphicSelectionManager,
    canvas: HTMLElement,
  ) {
    this.ctx = ctx;
    this.selectionManager = selectionManager;
    this.canvas = canvas;

    this.onToolChange = this._handleToolChange.bind(this);
    this.onPointerMove = this._handlePointerMove.bind(this);

    ctx.eventBus.on('tool:change', this.onToolChange);
    canvas.addEventListener('pointermove', this.onPointerMove);
  }

  /**
   * Handles placement and sticker clicks. Returns true when the event was consumed.
   */
  handlePointerDown(e: PointerEvent): boolean {
    if (e.button !== 0) return false;

    const toolState = this.ctx.toolState;
    if (!toolState) return false;

    const tool = toolState.getTool();

    if (tool === 'placement') {
      e.stopPropagation();
      e.stopImmediatePropagation();
      const worldPos = this.ctx.viewportController.clientToWorld(e.clientX, e.clientY, this.canvas);
      const blockType = toolState.consumePlacement();
      if (!blockType) return true;

      this._removeGhost();

      if (blockType.startsWith('custom:')) {
        const customBlockId = blockType.slice('custom:'.length);
        const idxBefore = this.ctx.page.elements.length;
        const instantiateCmd = new InstantiateCustomBlockCommand({
          doc: this.ctx.document,
          pageId: this.ctx.page.id,
          customBlockId,
          anchor: { x: worldPos.x, y: worldPos.y },
        });
        this.ctx.undoRedoManager.push(instantiateCmd);
        this.ctx.eventBus.emit('element:add');

        const newElements = this.ctx.page.elements.slice(idxBefore);
        if (newElements.length > 0) {
          const newId = newElements[0].id;
          this.selectionManager.setSelection(
            [{ type: 'element', id: newId }],
            { bypassGrouping: true },
          );
          this.selectionManager.setFocusedHighlight(newId);
        }

        this.ctx.eventBus.emit('doc:change');
      } else {
        const idxBefore = this.ctx.page.elements.length;
        const cmd = new AddElementCommand({
          doc: this.ctx.document,
          pageId: this.ctx.page.id,
          type: blockType,
          registry: this.ctx.registry,
          dataOverride: { x: worldPos.x, y: worldPos.y },
        });
        this.ctx.undoRedoManager.push(cmd);
        this.ctx.eventBus.emit('element:add');

        const newEl = this.ctx.page.elements[idxBefore];
        if (newEl) {
          this.selectionManager.setSelection([{ type: 'element', id: newEl.id }], { bypassGrouping: true });
          this.selectionManager.setFocusedHighlight(newEl.id);
        }

        this.ctx.eventBus.emit('doc:change');
      }

      return true;
    }

    if (tool === 'sticker') {
      e.stopPropagation();
      e.stopImmediatePropagation();
      const worldPos = this.ctx.viewportController.clientToWorld(e.clientX, e.clientY, this.canvas);

      const idxBefore = this.ctx.page.elements.length;
      const cmd = new AddElementCommand({
        doc: this.ctx.document,
        pageId: this.ctx.page.id,
        type: 'sticker',
        registry: this.ctx.registry,
        dataOverride: {
          x: worldPos.x - STICKER_DEFAULT_SIZE / 2,
          y: worldPos.y - STICKER_DEFAULT_SIZE / 2,
        },
      });
      this.ctx.undoRedoManager.push(cmd);
      this.ctx.eventBus.emit('element:add');

      const newEl = this.ctx.page.elements[idxBefore];
      if (newEl) {
        this.selectionManager.setSelection([{ type: 'element', id: newEl.id }], { bypassGrouping: true });
        this.selectionManager.setFocusedHighlight(newEl.id);
      }

      this.ctx.eventBus.emit('doc:change');
      return true;
    }

    return false;
  }

  private _handleToolChange(snap: ToolStateSnapshot): void {
    if (snap.tool === 'placement') {
      this._createGhost(snap.pendingBlockType!);
      this.canvas.classList.add('idea-graphic-canvas--placement');
      this.canvas.classList.remove('idea-graphic-canvas--sticker');
    } else if (snap.tool === 'sticker') {
      this._removeGhost();
      this.canvas.classList.add('idea-graphic-canvas--sticker');
      this.canvas.classList.remove('idea-graphic-canvas--placement');
    } else {
      this._removeGhost();
      this.canvas.classList.remove('idea-graphic-canvas--placement');
      this.canvas.classList.remove('idea-graphic-canvas--sticker');
    }
  }

  private _handlePointerMove(e: PointerEvent): void {
    if (!this.ghostEl) return;
    const canvasRect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - canvasRect.left;
    const screenY = e.clientY - canvasRect.top;
    this.ghostEl.style.left = `${screenX}px`;
    this.ghostEl.style.top = `${screenY}px`;
  }

  private _createGhost(blockType: string): void {
    this._removeGhost();

    if (!this.ctx.registry.has(blockType)) return;

    const def = this.ctx.registry.get(blockType);
    const defaultData = def.defaultData();
    const fakeElement = {
      id: '__ghost__',
      type: blockType,
      data: defaultData,
    };

    const renderCtx = {
      i18n: this.ctx.i18n,
      page: this.ctx.page,
      viewport: this.ctx.page.viewport,
      registry: this.ctx.registry,
      instanceId: '',
    };

    const svgEl = def.renderSvg(fakeElement as never, renderCtx as never);

    const ghost = document.createElement('div');
    ghost.className = 'idea-graphic-ghost';
    ghost.setAttribute('aria-hidden', 'true');
    ghost.appendChild(svgEl);
    this.canvas.appendChild(ghost);
    this.ghostEl = ghost;
  }

  private _removeGhost(): void {
    this.ghostEl?.remove();
    this.ghostEl = null;
  }

  destroy(): void {
    this._removeGhost();
    this.canvas.classList.remove('idea-graphic-canvas--placement');
    this.canvas.classList.remove('idea-graphic-canvas--sticker');
    this.ctx.eventBus.off('tool:change', this.onToolChange as never);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
  }
}

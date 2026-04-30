import type { EventBus } from '@core/events/event-bus';

export type ToolId = 'selection' | 'frame' | 'arrow' | 'pen' | 'sticker' | 'placement' | 'hand';

export interface ToolStateSnapshot {
  tool: ToolId;
  pendingBlockType?: string;
  previousTool?: ToolId;
}

type ChangeListener = (snap: ToolStateSnapshot) => void;

export class ToolState {
  private tool: ToolId = 'selection';
  private pendingBlockType: string | undefined;
  private previousTool: ToolId | undefined;
  private readonly listeners: Set<ChangeListener> = new Set();
  private readonly eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  getTool(): ToolId {
    return this.tool;
  }

  getSnapshot(): ToolStateSnapshot {
    const snap: ToolStateSnapshot = { tool: this.tool };
    if (this.pendingBlockType !== undefined) snap.pendingBlockType = this.pendingBlockType;
    if (this.previousTool !== undefined) snap.previousTool = this.previousTool;
    return snap;
  }

  setTool(tool: ToolId, opts?: { silent?: boolean }): void {
    if (tool === 'placement') {
      throw new Error('Use beginPlacement() to enter placement mode.');
    }
    if (this.tool === tool) return;
    this.tool = tool;
    this.pendingBlockType = undefined;
    this.previousTool = undefined;
    if (!opts?.silent) {
      this._emit();
    }
  }

  beginPlacement(blockType: string): void {
    if (this.tool !== 'placement') {
      this.previousTool = this.tool;
    }
    this.tool = 'placement';
    this.pendingBlockType = blockType;
    this._emit();
  }

  cancelPlacement(): void {
    if (this.tool !== 'placement') return;
    const restore = this.previousTool ?? 'selection';
    this.tool = restore;
    this.pendingBlockType = undefined;
    this.previousTool = undefined;
    this._emit();
  }

  consumePlacement(): string | null {
    if (this.tool !== 'placement') return null;
    const blockType = this.pendingBlockType ?? null;
    const restore = this.previousTool ?? 'selection';
    this.tool = restore;
    this.pendingBlockType = undefined;
    this.previousTool = undefined;
    this._emit();
    return blockType;
  }

  onChange(listener: ChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private _emit(): void {
    const snap = this.getSnapshot();
    for (const fn of this.listeners) fn(snap);
    this.eventBus.emit('tool:change', snap);
  }
}

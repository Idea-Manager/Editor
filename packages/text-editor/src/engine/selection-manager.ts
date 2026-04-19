import type { BlockSelection } from '@core/model/interfaces';
import type { EventBus } from '@core/events/event-bus';

export class SelectionManager {
  private selection: BlockSelection | null = null;

  constructor(private readonly eventBus: EventBus) {}

  get(): BlockSelection | null {
    return this.selection;
  }

  set(sel: BlockSelection): void {
    this.selection = sel;
    this.eventBus.emit('selection:change', sel);
  }

  clear(): void {
    this.selection = null;
    this.eventBus.emit('selection:change', null);
  }

  setCollapsed(blockId: string, offset: number): void {
    this.set({
      anchorBlockId: blockId,
      anchorOffset: offset,
      focusBlockId: blockId,
      focusOffset: offset,
      isCollapsed: true,
    });
  }

  extend(focusBlockId: string, focusOffset: number): void {
    if (!this.selection) return;
    this.set({
      anchorBlockId: this.selection.anchorBlockId,
      anchorOffset: this.selection.anchorOffset,
      focusBlockId,
      focusOffset,
      isCollapsed:
        this.selection.anchorBlockId === focusBlockId &&
        this.selection.anchorOffset === focusOffset,
    });
  }

  get isCollapsed(): boolean {
    return this.selection?.isCollapsed ?? true;
  }
}

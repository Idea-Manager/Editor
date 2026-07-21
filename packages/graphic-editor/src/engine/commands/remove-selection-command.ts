import type { DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import type { EventBus } from '@core/events/event-bus';
import { CompositeCommand } from '@core/commands/composite-command';
import { RemoveElementCommand } from './remove-element-command';
import type { SelectionEntry } from '../selection-manager';

export interface RemoveSelectionCommandOptions {
  doc: DocumentNode;
  pageId: string;
  entries: SelectionEntry[];
  eventBus: EventBus;
}

/**
 * Composite command that removes all selected elements.
 * Emits `selection:change` with an empty array on execute and undo
 * so the selection overlay is cleared after removal and restored after undo.
 */
export class RemoveSelectionCommand implements Command {
  private readonly composite: CompositeCommand;
  private readonly eventBus: EventBus;

  constructor({ doc, pageId, entries, eventBus }: RemoveSelectionCommandOptions) {
    this.eventBus = eventBus;

    const commands: Command[] = entries
      .filter(e => e.type === 'element')
      .map(e => new RemoveElementCommand({ doc, pageId, elementId: e.id }));

    this.composite = new CompositeCommand(commands);
  }

  get operationRecords(): OperationRecord[] {
    return this.composite.operationRecords;
  }

  execute(): void {
    this.composite.execute();
    this.eventBus.emit('selection:change', []);
  }

  undo(): void {
    this.composite.undo();
    this.eventBus.emit('selection:change', []);
  }
}

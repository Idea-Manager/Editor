import type { DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import type { GraphicBlockRegistry } from '../../blocks/block-registry';
import type { ArrowEndpoint, ArrowData } from '../../blocks/arrow/arrow-block';
import { ARROW_DEFAULTS } from '../../blocks/arrow/arrow-block';
import { AddElementCommand } from './add-element-command';

export interface AddArrowCommandOptions {
  doc: DocumentNode;
  pageId: string;
  registry: GraphicBlockRegistry;
  from: ArrowEndpoint;
  to: ArrowEndpoint;
  overrides?: Partial<ArrowData>;
}

/**
 * Creates a new 'arrow' GraphicElement from two endpoints.
 *
 * Arrows use generateId('conn') (handled inside AddElementCommand via type: 'arrow').
 * Frame attachment is skipped because arrows can span multiple frames.
 *
 * Delegates to AddElementCommand so that operation-log generation reuses
 * the shared infrastructure.
 */
export class AddArrowCommand implements Command {
  private readonly innerCmd: AddElementCommand;

  constructor({ doc, pageId, registry, from, to, overrides }: AddArrowCommandOptions) {
    const dataOverride: Record<string, unknown> = {
      from,
      to,
      ...ARROW_DEFAULTS,
      ...(overrides ?? {}),
    };

    this.innerCmd = new AddElementCommand({
      doc,
      pageId,
      type: 'arrow',
      registry,
      dataOverride,
      // Arrows are connectors; use the 'conn' ID prefix.
      idPrefix: 'conn',
      // Arrows span elements/frames; do not auto-attach to a frame.
      skipFrameAttach: true,
    });
  }

  get operationRecords(): OperationRecord[] {
    return this.innerCmd.operationRecords;
  }

  execute(): void {
    this.innerCmd.execute();
  }

  undo(): void {
    this.innerCmd.undo();
  }
}

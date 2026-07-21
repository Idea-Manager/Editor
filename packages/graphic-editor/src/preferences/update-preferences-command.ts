import type { DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { generateId } from '@core/id';
import { getGraphicPreferences } from '@core/model/document-data';
import { getAtPath, setAtPath } from '../util/object-path';

export interface UpdatePreferencesCommandInput {
  doc: DocumentNode;
  blockType: string;
  /**
   * Path relative to the block's preference record (no `data.` prefix).
   * e.g. `"border.thickness"`, `"background"`.
   */
  path: string;
  value: unknown;
}

/**
 * Records a single visual preference for a block type into
 * `DocumentNode.data.graphicPreferences[blockType][path]`.
 *
 */
export class UpdatePreferencesCommand implements Command {
  readonly operationRecords: OperationRecord[];

  private readonly doc: DocumentNode;
  private readonly blockType: string;
  private readonly path: string;
  private readonly oldValue: unknown;
  private readonly newValue: unknown;

  constructor({ doc, blockType, path, value }: UpdatePreferencesCommandInput) {
    this.doc = doc;
    this.blockType = blockType;
    this.path = path;
    this.newValue = value;

    const prefs = getGraphicPreferences(doc);
    const blockPrefs = (prefs[blockType] ?? {}) as Record<string, unknown>;
    this.oldValue = getAtPath(blockPrefs, path);

    const now = Date.now();
    this.operationRecords = [
      {
        id: generateId('op'),
        actorId: 'local',
        timestamp: now,
        wallClock: now,
        type: 'node:update',
        payload: {
          nodeId: doc.id,
          path: `data.graphicPreferences.${blockType}.${path}`,
          oldValue: this.oldValue,
          newValue: value,
        },
      },
    ];
  }

  execute(): void {
    const data = this.doc.data as Record<string, unknown>;
    const allPrefs = ((data['graphicPreferences'] as Record<string, unknown> | undefined) ?? {});
    const blockPrefs = ((allPrefs[this.blockType] as Record<string, unknown> | undefined) ?? {});
    const updatedBlock = setAtPath(blockPrefs, this.path, this.newValue);
    data['graphicPreferences'] = { ...allPrefs, [this.blockType]: updatedBlock };
  }

  undo(): void {
    const data = this.doc.data as Record<string, unknown>;
    const allPrefs = ((data['graphicPreferences'] as Record<string, unknown> | undefined) ?? {});
    const blockPrefs = ((allPrefs[this.blockType] as Record<string, unknown> | undefined) ?? {});
    const updatedBlock = setAtPath(blockPrefs, this.path, this.oldValue);
    data['graphicPreferences'] = { ...allPrefs, [this.blockType]: updatedBlock };
  }
}

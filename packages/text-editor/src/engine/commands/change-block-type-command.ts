import type { DocumentNode, TextRun, TableData } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { generateId } from '@core/id';
import type { BlockRegistry } from '../../blocks/block-registry';
import { findBlockLocation } from '../block-locator';
import { cloneTableData } from '../document-snapshot';

export class ChangeBlockTypeCommand implements Command {
  readonly operationRecords: OperationRecord[] = [];
  private oldType = 'paragraph';
  private oldData: Record<string, unknown> = {};
  private oldChildren: TextRun[] = [];

  constructor(
    private readonly doc: DocumentNode,
    private readonly blockId: string,
    private readonly newType: string,
    private readonly registry: BlockRegistry,
    private readonly dataOverride?: Record<string, unknown>,
  ) {}

  execute(): void {
    const block = findBlockLocation(this.doc, this.blockId)?.block;
    if (!block) return;

    this.oldType = block.type;
    this.oldData =
      block.type === 'table'
        ? (cloneTableData(block.data as TableData) as unknown as Record<string, unknown>)
        : { ...block.data };
    this.oldChildren = block.children.map(run => ({
      ...run,
      data: {
        text: run.data.text,
        marks: [...run.data.marks],
        ...(run.data.color !== undefined ? { color: run.data.color } : {}),
        ...(run.data.href !== undefined ? { href: run.data.href } : {}),
      },
    }));

    const def = this.registry.get(this.newType);
    block.type = this.newType;
    block.data = this.dataOverride
      ? this.newType === 'table'
        ? (cloneTableData(this.dataOverride as unknown as TableData) as typeof block.data)
        : ({ ...this.dataOverride } as typeof block.data)
      : def.defaultData();
    if (this.newType === 'table') {
      block.children = [];
    }

    this.operationRecords.push(
      {
        id: generateId('op'),
        actorId: 'local',
        timestamp: Date.now(),
        wallClock: Date.now(),
        type: 'node:update',
        payload: {
          nodeId: block.id,
          path: 'type',
          oldValue: this.oldType,
          newValue: this.newType,
        },
      },
      {
        id: generateId('op'),
        actorId: 'local',
        timestamp: Date.now(),
        wallClock: Date.now(),
        type: 'node:update',
        payload: {
          nodeId: block.id,
          path: 'data',
          oldValue: this.oldData,
          newValue: block.data,
        },
      },
    );
  }

  undo(): void {
    const block = findBlockLocation(this.doc, this.blockId)?.block;
    if (!block) return;

    block.type = this.oldType;
    block.data =
      this.oldType === 'table'
        ? (cloneTableData(this.oldData as unknown as TableData) as typeof block.data)
        : ({ ...this.oldData } as typeof block.data);
    block.children = this.oldChildren.map(run => ({
      ...run,
      data: {
        text: run.data.text,
        marks: [...run.data.marks],
        ...(run.data.color !== undefined ? { color: run.data.color } : {}),
        ...(run.data.href !== undefined ? { href: run.data.href } : {}),
      },
    }));
  }
}

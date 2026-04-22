import type { BlockNode } from '@core/model/interfaces';
import { cloneBlockNodeDeep, remapBlocksList } from './document-snapshot';

export function serializeIdeaEditorClipboardPayload(blocks: BlockNode[]): string {
  return JSON.stringify({
    version: 1,
    blocks: blocks.map(cloneBlockNodeDeep),
  });
}

export function parseIdeaEditorClipboardPayload(json: string): BlockNode[] | null {
  try {
    const o = JSON.parse(json) as { version?: number; blocks?: unknown };
    if (o?.version !== 1 || !Array.isArray(o.blocks) || o.blocks.length === 0) return null;
    return remapBlocksList(o.blocks as BlockNode[]);
  } catch {
    return null;
  }
}

import type { BlockNode, EmbedData, ListItemData, TextRun } from '@core/model/interfaces';
import { generateId } from '@core/id';
import { blocksFromLegacyCellContent } from './table-cell-defaults';

const textRuns = (obj: BlockNode): BlockNode['children'] =>
  (obj.children ?? []).map((run: TextRun) => ({
    id: run.id,
    type: 'text' as const,
    data: {
      text: run.data?.text ?? '',
      marks: [...(run.data?.marks ?? [])],
    },
  }));

/** Deserialize a block stored inside a table cell (no nested tables). */
export function deserializeCellBlock(raw: unknown): BlockNode {
  const obj = raw as BlockNode;
  const runs = textRuns(obj);

  switch (obj.type) {
    case 'heading':
      return {
        id: obj.id,
        type: 'heading',
        data: {
          level: (obj.data as { level?: number })?.level ?? 1,
          align: (obj.data as { align?: 'left' | 'center' | 'right' })?.align ?? 'left',
        },
        children: runs,
        meta: obj.meta ? { ...obj.meta } : undefined,
      };
    case 'list_item':
      return {
        id: obj.id,
        type: 'list_item',
        data: {
          listType: (obj.data as ListItemData)?.listType ?? 'unordered',
          depth: (obj.data as ListItemData)?.depth ?? 0,
        },
        children: runs,
        meta: obj.meta ? { ...obj.meta } : undefined,
      };
    case 'embed':
      return {
        id: obj.id,
        type: 'embed',
        data: {
          url: (obj.data as EmbedData)?.url ?? '',
          title: (obj.data as EmbedData)?.title ?? '',
          provider: (obj.data as EmbedData)?.provider,
        },
        children: [],
        meta: obj.meta ? { ...obj.meta } : undefined,
      };
    case 'paragraph':
    default:
      return {
        id: obj.id,
        type: 'paragraph',
        data: { align: (obj.data as { align?: string })?.align ?? 'left' },
        children: runs.length > 0 ? runs : [{
          id: generateId('txt'),
          type: 'text',
          data: { text: '', marks: [] },
        }],
        meta: obj.meta ? { ...obj.meta } : undefined,
      };
  }
}

export function deserializeCellBlocks(
  blocks: BlockNode[] | undefined,
  legacyContent: TextRun[] | undefined,
): BlockNode[] {
  if (blocks && blocks.length > 0) {
    return blocks.map(b => deserializeCellBlock(b));
  }
  return blocksFromLegacyCellContent(legacyContent);
}

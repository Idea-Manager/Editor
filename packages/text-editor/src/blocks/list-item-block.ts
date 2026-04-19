import type { BlockNode, ListItemData, ListType, TextRun } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { BlockDefinition, PaletteEntry } from './block-definition';
import type { RenderContext } from '../engine/render-context';
import type { EditorContext } from '../engine/editor-context';
import { renderInline } from '../inline/inline-renderer';

export const MAX_LIST_DEPTH = 4;

export class ListItemBlock implements BlockDefinition<ListItemData> {
  readonly type = 'list_item';
  readonly labelKey = 'block.listUnordered';
  readonly icon = 'format_list_bulleted';

  defaultData(): ListItemData {
    return { listType: 'unordered', depth: 0 };
  }

  paletteEntries(): PaletteEntry[] {
    return [
      {
        id: 'list_unordered',
        labelKey: 'block.listUnordered',
        icon: 'format_list_bulleted',
        dataFactory: () => ({ listType: 'unordered' as ListType, depth: 0 }),
        matchData: { listType: 'unordered' },
      },
      {
        id: 'list_ordered',
        labelKey: 'block.listOrdered',
        icon: 'format_list_numbered',
        dataFactory: () => ({ listType: 'ordered' as ListType, depth: 0 }),
        matchData: { listType: 'ordered' },
      },
    ];
  }

  render(node: BlockNode<ListItemData>, ctx: RenderContext): HTMLElement {
    const el = document.createElement('div');
    el.setAttribute('data-block-id', node.id);
    el.setAttribute('data-depth', String(node.data.depth));
    el.setAttribute('data-list-type', node.data.listType);
    el.classList.add('idea-block', 'idea-block--list-item');

    const hasText = node.children.some(r => r.data.text.length > 0);
    if (hasText) {
      el.appendChild(renderInline(node.children));
    } else {
      el.setAttribute('data-empty', '');
      el.setAttribute('data-placeholder', ctx.i18n.t('editor.placeholder'));
    }

    return el;
  }

  serialize(node: BlockNode<ListItemData>): BlockNode<ListItemData> {
    return {
      id: node.id,
      type: node.type,
      data: { ...node.data },
      children: node.children.map(run => ({
        ...run,
        data: { ...run.data, marks: [...run.data.marks] },
      })),
      meta: node.meta ? { ...node.meta } : undefined,
    };
  }

  deserialize(raw: unknown): BlockNode<ListItemData> {
    const obj = raw as BlockNode<ListItemData & { ordered?: boolean }>;

    let listType: ListType = 'unordered';
    if (obj.data?.listType) {
      listType = obj.data.listType;
    } else if ((obj.data as { ordered?: boolean })?.ordered === true) {
      listType = 'ordered';
    }

    return {
      id: obj.id,
      type: 'list_item',
      data: {
        listType,
        depth: obj.data?.depth ?? 0,
      },
      children: (obj.children ?? []).map((run: TextRun) => ({
        id: run.id,
        type: 'text' as const,
        data: {
          text: run.data?.text ?? '',
          marks: [...(run.data?.marks ?? [])],
        },
      })) as TextRun[],
      meta: obj.meta ? { ...obj.meta } : undefined,
    };
  }

  onEnter(_node: BlockNode<ListItemData>, _ctx: EditorContext): Command | null {
    return null;
  }

  onDelete(_node: BlockNode<ListItemData>, _ctx: EditorContext): Command | null {
    return null;
  }
}

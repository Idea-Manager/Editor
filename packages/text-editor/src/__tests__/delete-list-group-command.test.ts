import { createDocument, createParagraph } from '@core/model/factory';
import type { BlockNode, ListItemData } from '@core/model/interfaces';
import { generateId } from '@core/id';
import { findListGroupSpan } from '../engine/block-locator';
import { DeleteListGroupCommand } from '../engine/commands/delete-list-group-command';

function createListItem(text: string, listType: ListItemData['listType'] = 'unordered', depth = 0): BlockNode<ListItemData> {
  return {
    id: generateId('blk'),
    type: 'list_item',
    data: { listType, depth },
    children: [{ id: generateId('txt'), type: 'text', data: { text, marks: [] } }],
    meta: { createdAt: Date.now(), version: 1 },
  };
}

describe('findListGroupSpan', () => {
  it('returns span for consecutive items with same listType', () => {
    const doc = createDocument();
    const a = createListItem('One');
    const b = createListItem('Two');
    const c = createListItem('Three');
    doc.children = [createParagraph('Before'), a, b, c, createParagraph('After')];

    expect(findListGroupSpan(doc, b.id)).toEqual({ start: 1, end: 3 });
  });

  it('stops at different listType', () => {
    const doc = createDocument();
    const ul = createListItem('U1');
    const ol = createListItem('O1', 'ordered');
    doc.children = [ul, ol];

    expect(findListGroupSpan(doc, ul.id)).toEqual({ start: 0, end: 0 });
    expect(findListGroupSpan(doc, ol.id)).toEqual({ start: 1, end: 1 });
  });

  it('returns null for non-list blocks', () => {
    const doc = createDocument();
    const p = createParagraph('Hi');
    doc.children = [p];
    expect(findListGroupSpan(doc, p.id)).toBeNull();
  });
});

describe('DeleteListGroupCommand', () => {
  it('removes entire list group in one step', () => {
    const doc = createDocument();
    const a = createListItem('One');
    const b = createListItem('Two');
    doc.children = [createParagraph('Keep'), a, b];

    const cmd = new DeleteListGroupCommand(doc, 1, 2);
    cmd.execute();

    expect(doc.children).toHaveLength(1);
    expect(doc.children[0].type).toBe('paragraph');
  });

  it('undo restores full list group', () => {
    const doc = createDocument();
    const a = createListItem('One');
    const b = createListItem('Two');
    doc.children = [a, b];

    const cmd = new DeleteListGroupCommand(doc, 0, 1);
    cmd.execute();
    expect(doc.children).toHaveLength(1);
    expect(doc.children[0].type).toBe('paragraph');

    cmd.undo();
    expect(doc.children).toHaveLength(2);
    expect(doc.children[0].id).toBe(a.id);
    expect(doc.children[1].id).toBe(b.id);
  });
});

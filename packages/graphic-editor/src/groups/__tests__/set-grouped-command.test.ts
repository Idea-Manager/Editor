import { SetGroupedCommand } from '../set-grouped-command';
import { createDocument, createGraphicPage } from '@core/model/factory';
import { generateId } from '@core/id';
import type { DocumentNode, GraphicElement } from '@core/model/interfaces';

function makeEl(overrides: Partial<GraphicElement> = {}): GraphicElement {
  return {
    id: generateId('el'),
    type: 'rectangle',
    data: { x: 0, y: 0, width: 100, height: 100 },
    ...overrides,
  };
}

function makeDoc(elements: GraphicElement[]): { doc: DocumentNode; pageId: string } {
  const doc = createDocument();
  const page = createGraphicPage('Test');
  page.elements.push(...elements);
  doc.graphicPages.push(page);
  return { doc, pageId: page.id };
}

describe('SetGroupedCommand', () => {
  describe('grouping', () => {
    it('assigns a shared groupId to all elements on execute', () => {
      const el1 = makeEl();
      const el2 = makeEl();
      const { doc, pageId } = makeDoc([el1, el2]);

      const cmd = new SetGroupedCommand({ doc, pageId, elementIds: [el1.id, el2.id], grouped: true });
      cmd.execute();

      const elements = doc.graphicPages[0].elements;
      const id1 = elements[0].meta?.groupId;
      const id2 = elements[1].meta?.groupId;
      expect(id1).toBeTruthy();
      expect(id1).toBe(id2);
    });

    it('restores previous (undefined) groupId on undo', () => {
      const el1 = makeEl();
      const el2 = makeEl();
      const { doc, pageId } = makeDoc([el1, el2]);

      const cmd = new SetGroupedCommand({ doc, pageId, elementIds: [el1.id, el2.id], grouped: true });
      cmd.execute();
      cmd.undo();

      const elements = doc.graphicPages[0].elements;
      expect(elements[0].meta?.groupId).toBeUndefined();
      expect(elements[1].meta?.groupId).toBeUndefined();
    });
  });

  describe('ungrouping', () => {
    it('clears groupId on execute', () => {
      const existingGroupId = 'blk_test';
      const el1 = makeEl({ meta: { groupId: existingGroupId } });
      const el2 = makeEl({ meta: { groupId: existingGroupId } });
      const { doc, pageId } = makeDoc([el1, el2]);

      const cmd = new SetGroupedCommand({ doc, pageId, elementIds: [el1.id, el2.id], grouped: false });
      cmd.execute();

      const elements = doc.graphicPages[0].elements;
      expect(elements[0].meta?.groupId).toBeUndefined();
      expect(elements[1].meta?.groupId).toBeUndefined();
    });

    it('restores prior groupId on undo', () => {
      const existingGroupId = 'blk_existing';
      const el1 = makeEl({ meta: { groupId: existingGroupId } });
      const el2 = makeEl({ meta: { groupId: existingGroupId } });
      const { doc, pageId } = makeDoc([el1, el2]);

      const cmd = new SetGroupedCommand({ doc, pageId, elementIds: [el1.id, el2.id], grouped: false });
      cmd.execute();
      cmd.undo();

      const elements = doc.graphicPages[0].elements;
      expect(elements[0].meta?.groupId).toBe(existingGroupId);
      expect(elements[1].meta?.groupId).toBe(existingGroupId);
    });
  });

  it('emits one operation record per element', () => {
    const el1 = makeEl();
    const el2 = makeEl();
    const { doc, pageId } = makeDoc([el1, el2]);

    const cmd = new SetGroupedCommand({ doc, pageId, elementIds: [el1.id, el2.id], grouped: true });
    expect(cmd.operationRecords).toHaveLength(2);
    expect(cmd.operationRecords.every(r => r.type === 'node:update')).toBe(true);
  });
});

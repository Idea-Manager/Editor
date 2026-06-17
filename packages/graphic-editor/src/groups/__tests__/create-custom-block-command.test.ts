import { CreateCustomBlockCommand } from '../create-custom-block-command';
import { createDocument, createGraphicPage } from '@core/model/factory';
import { generateId } from '@core/id';
import { getCustomBlocks } from '@core/model/document-data';
import type { DocumentNode, GraphicElement } from '@core/model/interfaces';
import type { SelectionEntry } from '../../engine/selection-manager';

function makeEl(
  x: number,
  y: number,
  width: number,
  height: number,
  overrides: Partial<GraphicElement> = {},
): GraphicElement {
  return {
    id: generateId('el'),
    type: 'rectangle',
    data: { x, y, width, height },
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

function selEntry(el: GraphicElement): SelectionEntry {
  return { type: 'element', id: el.id };
}

describe('CreateCustomBlockCommand', () => {
  describe('basic creation', () => {
    it('adds a definition to doc.data.customBlocks on execute', () => {
      const el = makeEl(10, 20, 100, 50);
      const { doc, pageId } = makeDoc([el]);

      const cmd = new CreateCustomBlockCommand({
        doc, pageId, name: 'My Block', entries: [selEntry(el)],
      });
      cmd.execute();

      const blocks = getCustomBlocks(doc);
      expect(blocks).toHaveLength(1);
      expect(blocks[0].name).toBe('My Block');
    });

    it('removes the definition on undo', () => {
      const el = makeEl(10, 20, 100, 50);
      const { doc, pageId } = makeDoc([el]);

      const cmd = new CreateCustomBlockCommand({
        doc, pageId, name: 'My Block', entries: [selEntry(el)],
      });
      cmd.execute();
      cmd.undo();

      expect(getCustomBlocks(doc)).toHaveLength(0);
    });
  });

  describe('AABB rebasing', () => {
    it('zero-anchors element coordinates to the AABB origin', () => {
      const el1 = makeEl(50, 100, 80, 40);
      const el2 = makeEl(200, 150, 60, 60);
      const { doc, pageId } = makeDoc([el1, el2]);

      const cmd = new CreateCustomBlockCommand({
        doc, pageId, name: 'Test', entries: [selEntry(el1), selEntry(el2)],
      });
      cmd.execute();

      const blocks = getCustomBlocks(doc);
      expect(blocks).toHaveLength(1);
      const snapshot = blocks[0];

      // AABB origin is (50,100); el1 should be at (0,0)
      const snap1 = snapshot.elements.find(e => (e.data['x'] as number) === 0);
      expect(snap1).toBeDefined();
      expect(snap1!.data['y']).toBe(0);

      // el2 was at (200,150) → zeroed: (150, 50)
      const snap2 = snapshot.elements.find(e => (e.data['x'] as number) === 150);
      expect(snap2).toBeDefined();
      expect(snap2!.data['y']).toBe(50);
    });

    it('sets source.width and source.height from the AABB', () => {
      const el1 = makeEl(50, 100, 80, 40);  // right edge: 130, bottom: 140
      const el2 = makeEl(200, 150, 60, 60); // right edge: 260, bottom: 210
      const { doc, pageId } = makeDoc([el1, el2]);

      const cmd = new CreateCustomBlockCommand({
        doc, pageId, name: 'Test', entries: [selEntry(el1), selEntry(el2)],
      });
      cmd.execute();

      const block = getCustomBlocks(doc)[0];
      expect(block.source.width).toBe(210);  // 260 - 50
      expect(block.source.height).toBe(110); // 210 - 100
    });
  });

  describe('placeholder ids', () => {
    it('assigns unique placeholderIds to each element', () => {
      const el1 = makeEl(0, 0, 50, 50);
      const el2 = makeEl(60, 0, 50, 50);
      const { doc, pageId } = makeDoc([el1, el2]);

      const cmd = new CreateCustomBlockCommand({
        doc, pageId, name: 'Test', entries: [selEntry(el1), selEntry(el2)],
      });
      cmd.execute();

      const block = getCustomBlocks(doc)[0];
      const ids = block.elements.map(e => e.placeholderId);
      expect(new Set(ids).size).toBe(2);
    });
  });

  describe('operation records', () => {
    it('emits a node:update operation record targeting doc.id', () => {
      const el = makeEl(0, 0, 100, 100);
      const { doc, pageId } = makeDoc([el]);

      const cmd = new CreateCustomBlockCommand({
        doc, pageId, name: 'Rec', entries: [selEntry(el)],
      });

      expect(cmd.operationRecords).toHaveLength(1);
      expect(cmd.operationRecords[0].type).toBe('node:update');
      const payload = cmd.operationRecords[0].payload as { nodeId: string; path: string };
      expect(payload.nodeId).toBe(doc.id);
      expect(payload.path).toBe('data.customBlocks');
    });
  });
});

import { MoveElementCommand } from '../move-element-command';
import { createDocument, createGraphicPage } from '@core/model/factory';
import { generateId } from '@core/id';
import type { DocumentNode, GraphicElement } from '@core/model/interfaces';

function makeElement(x = 10, y = 20): GraphicElement {
  return {
    id: generateId('el'),
    type: 'rectangle',
    data: { x, y },
  };
}

function makeDoc(el?: GraphicElement): { doc: DocumentNode; pageId: string; el: GraphicElement } {
  const doc = createDocument();
  const page = createGraphicPage('Page 1');
  const element = el ?? makeElement();
  page.elements.push(element);
  doc.graphicPages.push(page);
  return { doc, pageId: page.id, el: element };
}

function getXY(doc: DocumentNode): { x: number; y: number } {
  const data = doc.graphicPages[0].elements[0].data as Record<string, unknown>;
  return { x: data.x as number, y: data.y as number };
}

describe('MoveElementCommand', () => {
  describe('execute / undo', () => {
    it('translates the element by (dx, dy) on execute', () => {
      const { doc, pageId, el } = makeDoc(makeElement(10, 20));
      const cmd = new MoveElementCommand({ doc, pageId, elementId: el.id, dx: 5, dy: -3 });

      cmd.execute();

      expect(getXY(doc)).toEqual({ x: 15, y: 17 });
    });

    it('restores original position on undo', () => {
      const { doc, pageId, el } = makeDoc(makeElement(10, 20));
      const cmd = new MoveElementCommand({ doc, pageId, elementId: el.id, dx: 5, dy: 10 });

      cmd.execute();
      cmd.undo();

      expect(getXY(doc)).toEqual({ x: 10, y: 20 });
    });
  });

  describe('operation records', () => {
    it('produces two node:update records for data.x and data.y', () => {
      const { doc, pageId, el } = makeDoc();
      const cmd = new MoveElementCommand({ doc, pageId, elementId: el.id, dx: 5, dy: 3 });

      expect(cmd.operationRecords).toHaveLength(2);
      const paths = cmd.operationRecords.map(r => (r.payload as { path: string }).path);
      expect(paths).toContain('data.x');
      expect(paths).toContain('data.y');
    });

    it('all records have type node:update', () => {
      const { doc, pageId, el } = makeDoc();
      const cmd = new MoveElementCommand({ doc, pageId, elementId: el.id, dx: 1, dy: 1 });

      expect(cmd.operationRecords.every(r => r.type === 'node:update')).toBe(true);
    });
  });

  describe('merge', () => {
    it('coalesces consecutive moves of the same element within window', () => {
      const { doc, pageId, el } = makeDoc(makeElement(0, 0));
      const cmd1 = new MoveElementCommand({ doc, pageId, elementId: el.id, dx: 5, dy: 0, mergeWindowMs: 500 });
      cmd1.execute();

      const cmd2 = new MoveElementCommand({ doc, pageId, elementId: el.id, dx: 3, dy: 0, mergeWindowMs: 500 });
      const merged = cmd1.merge(cmd2);

      expect(merged).toBe(true);
    });

    it('does not merge moves of different elements', () => {
      const el2 = makeElement(0, 0);
      const { doc, pageId, el } = makeDoc();
      doc.graphicPages[0].elements.push(el2);

      const cmd1 = new MoveElementCommand({ doc, pageId, elementId: el.id, dx: 5, dy: 0, mergeWindowMs: 500 });
      cmd1.execute();
      const cmd2 = new MoveElementCommand({ doc, pageId, elementId: el2.id, dx: 3, dy: 0, mergeWindowMs: 500 });

      expect(cmd1.merge(cmd2)).toBe(false);
    });

    it('does not merge when mergeWindowMs is 0', () => {
      const { doc, pageId, el } = makeDoc();
      const cmd1 = new MoveElementCommand({ doc, pageId, elementId: el.id, dx: 1, dy: 0, mergeWindowMs: 0 });
      cmd1.execute();
      const cmd2 = new MoveElementCommand({ doc, pageId, elementId: el.id, dx: 2, dy: 0, mergeWindowMs: 0 });

      expect(cmd1.merge(cmd2)).toBe(false);
    });

    it('undo after merge restores original position', () => {
      const { doc, pageId, el } = makeDoc(makeElement(0, 0));
      const cmd1 = new MoveElementCommand({ doc, pageId, elementId: el.id, dx: 5, dy: 0, mergeWindowMs: 500 });
      cmd1.execute();

      const cmd2 = new MoveElementCommand({ doc, pageId, elementId: el.id, dx: 3, dy: 0, mergeWindowMs: 500 });
      cmd1.merge(cmd2);

      cmd1.undo();

      expect(getXY(doc)).toEqual({ x: 0, y: 0 });
    });
  });
});

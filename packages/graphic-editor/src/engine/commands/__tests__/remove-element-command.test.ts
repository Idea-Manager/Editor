import { RemoveElementCommand } from '../remove-element-command';
import { createDocument, createGraphicPage, createFrame } from '@core/model/factory';
import { generateId } from '@core/id';
import type { DocumentNode, GraphicElement } from '@core/model/interfaces';

function makeElement(type = 'rectangle'): GraphicElement {
  return {
    id: generateId('el'),
    type,
    data: { x: 10, y: 20, fill: 'red' },
  };
}

function makeDoc(elements: GraphicElement[] = []): { doc: DocumentNode; pageId: string } {
  const doc = createDocument();
  const page = createGraphicPage('Page 1');
  page.elements.push(...elements);
  doc.graphicPages.push(page);
  return { doc, pageId: page.id };
}

describe('RemoveElementCommand', () => {
  describe('execute / undo', () => {
    it('removes the element from the page on execute', () => {
      const el = makeElement();
      const { doc, pageId } = makeDoc([el]);
      const page = doc.graphicPages[0];
      const cmd = new RemoveElementCommand({ doc, pageId, elementId: el.id });

      cmd.execute();

      expect(page.elements).toHaveLength(0);
    });

    it('restores the element at its original index on undo', () => {
      const elA = makeElement();
      const elB = makeElement();
      const elC = makeElement();
      const { doc, pageId } = makeDoc([elA, elB, elC]);
      const page = doc.graphicPages[0];

      const cmd = new RemoveElementCommand({ doc, pageId, elementId: elB.id });
      cmd.execute();
      cmd.undo();

      expect(page.elements[1].id).toBe(elB.id);
    });

    it('preserves the data snapshot on undo', () => {
      const el = makeElement();
      const { doc, pageId } = makeDoc([el]);
      const page = doc.graphicPages[0];

      const cmd = new RemoveElementCommand({ doc, pageId, elementId: el.id });
      cmd.execute();
      cmd.undo();

      expect(page.elements[0].data).toEqual({ x: 10, y: 20, fill: 'red' });
    });

    it('throws when the element does not exist', () => {
      const { doc, pageId } = makeDoc([]);
      expect(() => new RemoveElementCommand({ doc, pageId, elementId: 'nonexistent' })).toThrow();
    });
  });

  describe('frame membership', () => {
    it('removes the element id from frame.childElementIds on execute', () => {
      const el = makeElement();
      const { doc, pageId } = makeDoc([el]);
      const page = doc.graphicPages[0];
      const frame = createFrame('F', { x: 0, y: 0, width: 200, height: 200 });
      frame.childElementIds.push(el.id);
      el.frameId = frame.id;
      page.frames.push(frame);

      const cmd = new RemoveElementCommand({ doc, pageId, elementId: el.id });
      cmd.execute();

      expect(frame.childElementIds).not.toContain(el.id);
    });

    it('restores the element id to frame.childElementIds on undo', () => {
      const el = makeElement();
      const { doc, pageId } = makeDoc([el]);
      const page = doc.graphicPages[0];
      const frame = createFrame('F', { x: 0, y: 0, width: 200, height: 200 });
      frame.childElementIds.push(el.id);
      el.frameId = frame.id;
      page.frames.push(frame);

      const cmd = new RemoveElementCommand({ doc, pageId, elementId: el.id });
      cmd.execute();
      cmd.undo();

      expect(frame.childElementIds).toContain(el.id);
    });
  });

  describe('operation records', () => {
    it('emits a node:delete operation record', () => {
      const el = makeElement();
      const { doc, pageId } = makeDoc([el]);
      const cmd = new RemoveElementCommand({ doc, pageId, elementId: el.id });

      expect(cmd.operationRecords).toHaveLength(1);
      expect(cmd.operationRecords[0].type).toBe('node:delete');
      const payload = cmd.operationRecords[0].payload as { nodeId: string };
      expect(payload.nodeId).toBe(el.id);
    });
  });
});

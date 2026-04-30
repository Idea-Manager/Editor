import { RemoveFrameCommand } from '../remove-frame-command';
import { createDocument, createGraphicPage, createFrame } from '@core/model/factory';
import { generateId } from '@core/id';
import type { GraphicElement } from '@core/model/interfaces';

function makeDoc() {
  const doc = createDocument();
  const page = createGraphicPage('Page');
  doc.graphicPages.push(page);
  return { doc, page };
}

function makeAttachedElement(frameId: string): GraphicElement {
  return { id: generateId('el'), type: 'rectangle', data: { x: 0, y: 0 }, frameId };
}

describe('RemoveFrameCommand', () => {
  describe('execute', () => {
    it('removes the frame from page.frames', () => {
      const { doc, page } = makeDoc();
      const frame = createFrame('F1', { x: 0, y: 0, width: 200, height: 200 });
      page.frames.push(frame);

      const cmd = new RemoveFrameCommand({ doc, pageId: page.id, frameId: frame.id });
      cmd.execute();

      expect(page.frames).toHaveLength(0);
    });

    it('clears frameId on all child elements', () => {
      const { doc, page } = makeDoc();
      const frame = createFrame('F1', { x: 0, y: 0, width: 200, height: 200 });
      const el = makeAttachedElement(frame.id);
      frame.childElementIds.push(el.id);
      page.frames.push(frame);
      page.elements.push(el);

      const cmd = new RemoveFrameCommand({ doc, pageId: page.id, frameId: frame.id });
      cmd.execute();

      expect(el.frameId).toBeUndefined();
    });

    it('does NOT delete child elements', () => {
      const { doc, page } = makeDoc();
      const frame = createFrame('F1', { x: 0, y: 0, width: 200, height: 200 });
      const el = makeAttachedElement(frame.id);
      frame.childElementIds.push(el.id);
      page.frames.push(frame);
      page.elements.push(el);

      const cmd = new RemoveFrameCommand({ doc, pageId: page.id, frameId: frame.id });
      cmd.execute();

      expect(page.elements).toHaveLength(1);
    });
  });

  describe('undo', () => {
    it('restores the frame at its original index', () => {
      const { doc, page } = makeDoc();
      const f1 = createFrame('F1', { x: 0, y: 0, width: 100, height: 100 });
      const f2 = createFrame('F2', { x: 200, y: 0, width: 100, height: 100 });
      page.frames.push(f1, f2);

      const cmd = new RemoveFrameCommand({ doc, pageId: page.id, frameId: f1.id });
      cmd.execute();
      cmd.undo();

      expect(page.frames[0].id).toBe(f1.id);
    });

    it('restores frameId on child elements', () => {
      const { doc, page } = makeDoc();
      const frame = createFrame('F1', { x: 0, y: 0, width: 200, height: 200 });
      const el = makeAttachedElement(frame.id);
      frame.childElementIds.push(el.id);
      page.frames.push(frame);
      page.elements.push(el);

      const cmd = new RemoveFrameCommand({ doc, pageId: page.id, frameId: frame.id });
      cmd.execute();
      cmd.undo();

      expect(el.frameId).toBe(frame.id);
    });
  });

  describe('operation records', () => {
    it('emits node:delete for the frame and node:update for each child', () => {
      const { doc, page } = makeDoc();
      const frame = createFrame('F1', { x: 0, y: 0, width: 200, height: 200 });
      const el1 = makeAttachedElement(frame.id);
      const el2 = makeAttachedElement(frame.id);
      frame.childElementIds.push(el1.id, el2.id);
      page.frames.push(frame);
      page.elements.push(el1, el2);

      const cmd = new RemoveFrameCommand({ doc, pageId: page.id, frameId: frame.id });

      const types = cmd.operationRecords.map(r => r.type);
      expect(types).toContain('node:delete');
      expect(types.filter(t => t === 'node:update')).toHaveLength(2);
    });
  });
});

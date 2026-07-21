import { AttachToFrameCommand } from '../attach-to-frame-command';
import { createDocument, createGraphicPage, createFrame } from '@core/model/factory';
import { generateId } from '@core/id';
import type { DocumentNode, GraphicElement } from '@core/model/interfaces';

function makeDoc() {
  const doc = createDocument();
  const page = createGraphicPage('Page');
  doc.graphicPages.push(page);
  return { doc, page };
}

function makeElement(): GraphicElement {
  return { id: generateId('el'), type: 'rectangle', data: { x: 0, y: 0 } };
}

describe('AttachToFrameCommand', () => {
  describe('execute', () => {
    it('sets element.frameId to the given frameId', () => {
      const { doc, page } = makeDoc();
      const frame = createFrame('F1', { x: 0, y: 0, width: 200, height: 200 });
      const el = makeElement();
      page.frames.push(frame);
      page.elements.push(el);

      const cmd = new AttachToFrameCommand({ doc, pageId: page.id, frameId: frame.id, elementId: el.id });
      cmd.execute();

      expect(el.frameId).toBe(frame.id);
    });

    it('appends elementId to frame.childElementIds', () => {
      const { doc, page } = makeDoc();
      const frame = createFrame('F1', { x: 0, y: 0, width: 200, height: 200 });
      const el = makeElement();
      page.frames.push(frame);
      page.elements.push(el);

      const cmd = new AttachToFrameCommand({ doc, pageId: page.id, frameId: frame.id, elementId: el.id });
      cmd.execute();

      expect(frame.childElementIds).toContain(el.id);
    });

    it('is idempotent — execute twice does not duplicate the child id', () => {
      const { doc, page } = makeDoc();
      const frame = createFrame('F1', { x: 0, y: 0, width: 200, height: 200 });
      const el = makeElement();
      page.frames.push(frame);
      page.elements.push(el);

      const cmd = new AttachToFrameCommand({ doc, pageId: page.id, frameId: frame.id, elementId: el.id });
      cmd.execute();
      cmd.execute();

      expect(frame.childElementIds.filter(id => id === el.id)).toHaveLength(1);
    });
  });

  describe('undo', () => {
    it('clears element.frameId', () => {
      const { doc, page } = makeDoc();
      const frame = createFrame('F1', { x: 0, y: 0, width: 200, height: 200 });
      const el = makeElement();
      page.frames.push(frame);
      page.elements.push(el);

      const cmd = new AttachToFrameCommand({ doc, pageId: page.id, frameId: frame.id, elementId: el.id });
      cmd.execute();
      cmd.undo();

      expect(el.frameId).toBeUndefined();
    });

    it('removes elementId from frame.childElementIds', () => {
      const { doc, page } = makeDoc();
      const frame = createFrame('F1', { x: 0, y: 0, width: 200, height: 200 });
      const el = makeElement();
      page.frames.push(frame);
      page.elements.push(el);

      const cmd = new AttachToFrameCommand({ doc, pageId: page.id, frameId: frame.id, elementId: el.id });
      cmd.execute();
      cmd.undo();

      expect(frame.childElementIds).not.toContain(el.id);
    });
  });

  describe('operation records', () => {
    it('emits two node:update records', () => {
      const { doc, page } = makeDoc();
      const frame = createFrame('F1', { x: 0, y: 0, width: 200, height: 200 });
      const el = makeElement();
      page.frames.push(frame);
      page.elements.push(el);

      const cmd = new AttachToFrameCommand({ doc, pageId: page.id, frameId: frame.id, elementId: el.id });

      expect(cmd.operationRecords).toHaveLength(2);
      expect(cmd.operationRecords.every(r => r.type === 'node:update')).toBe(true);
    });
  });

  it('is a no-op when element or frame does not exist', () => {
    const { doc, page } = makeDoc();
    expect(() => {
      const cmd = new AttachToFrameCommand({ doc, pageId: page.id, frameId: 'missing', elementId: 'missing' });
      cmd.execute();
      cmd.undo();
    }).not.toThrow();
  });
});

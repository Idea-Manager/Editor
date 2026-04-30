import { DetachFromFrameCommand } from '../detach-from-frame-command';
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

describe('DetachFromFrameCommand', () => {
  describe('execute', () => {
    it('clears element.frameId', () => {
      const { doc, page } = makeDoc();
      const frame = createFrame('F1', { x: 0, y: 0, width: 200, height: 200 });
      const el = makeAttachedElement(frame.id);
      frame.childElementIds.push(el.id);
      page.frames.push(frame);
      page.elements.push(el);

      const cmd = new DetachFromFrameCommand({ doc, pageId: page.id, frameId: frame.id, elementId: el.id });
      cmd.execute();

      expect(el.frameId).toBeUndefined();
    });

    it('removes elementId from frame.childElementIds', () => {
      const { doc, page } = makeDoc();
      const frame = createFrame('F1', { x: 0, y: 0, width: 200, height: 200 });
      const el = makeAttachedElement(frame.id);
      frame.childElementIds.push(el.id);
      page.frames.push(frame);
      page.elements.push(el);

      const cmd = new DetachFromFrameCommand({ doc, pageId: page.id, frameId: frame.id, elementId: el.id });
      cmd.execute();

      expect(frame.childElementIds).not.toContain(el.id);
    });

    it('is idempotent — execute twice on an already-detached element does not throw', () => {
      const { doc, page } = makeDoc();
      const frame = createFrame('F1', { x: 0, y: 0, width: 200, height: 200 });
      const el = makeAttachedElement(frame.id);
      frame.childElementIds.push(el.id);
      page.frames.push(frame);
      page.elements.push(el);

      const cmd = new DetachFromFrameCommand({ doc, pageId: page.id, frameId: frame.id, elementId: el.id });
      cmd.execute();
      expect(() => cmd.execute()).not.toThrow();
    });
  });

  describe('undo', () => {
    it('restores element.frameId', () => {
      const { doc, page } = makeDoc();
      const frame = createFrame('F1', { x: 0, y: 0, width: 200, height: 200 });
      const el = makeAttachedElement(frame.id);
      frame.childElementIds.push(el.id);
      page.frames.push(frame);
      page.elements.push(el);

      const cmd = new DetachFromFrameCommand({ doc, pageId: page.id, frameId: frame.id, elementId: el.id });
      cmd.execute();
      cmd.undo();

      expect(el.frameId).toBe(frame.id);
    });

    it('re-appends elementId to frame.childElementIds', () => {
      const { doc, page } = makeDoc();
      const frame = createFrame('F1', { x: 0, y: 0, width: 200, height: 200 });
      const el = makeAttachedElement(frame.id);
      frame.childElementIds.push(el.id);
      page.frames.push(frame);
      page.elements.push(el);

      const cmd = new DetachFromFrameCommand({ doc, pageId: page.id, frameId: frame.id, elementId: el.id });
      cmd.execute();
      cmd.undo();

      expect(frame.childElementIds).toContain(el.id);
    });
  });

  describe('operation records', () => {
    it('emits two node:update records', () => {
      const { doc, page } = makeDoc();
      const frame = createFrame('F1', { x: 0, y: 0, width: 200, height: 200 });
      const el = makeAttachedElement(frame.id);
      frame.childElementIds.push(el.id);
      page.frames.push(frame);
      page.elements.push(el);

      const cmd = new DetachFromFrameCommand({ doc, pageId: page.id, frameId: frame.id, elementId: el.id });

      expect(cmd.operationRecords).toHaveLength(2);
      expect(cmd.operationRecords.every(r => r.type === 'node:update')).toBe(true);
    });
  });
});

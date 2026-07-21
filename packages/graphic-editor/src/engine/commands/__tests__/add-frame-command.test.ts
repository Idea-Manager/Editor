import { AddFrameCommand } from '../add-frame-command';
import { AttachToFrameCommand } from '../attach-to-frame-command';
import { createDocument, createGraphicPage } from '@core/model/factory';
import { generateId } from '@core/id';
import type { GraphicElement } from '@core/model/interfaces';

function makeDoc() {
  const doc = createDocument();
  const page = createGraphicPage('Page');
  doc.graphicPages.push(page);
  return { doc, page };
}

function makeElement(x = 50, y = 50): GraphicElement {
  return { id: generateId('el'), type: 'rectangle', data: { x, y, width: 100, height: 100 } };
}

describe('AddFrameCommand', () => {
  describe('execute', () => {
    it('appends a frame to page.frames', () => {
      const { doc, page } = makeDoc();
      const cmd = new AddFrameCommand({ doc, pageId: page.id, rect: { x: 0, y: 0, width: 200, height: 200 } });
      cmd.execute();

      expect(page.frames).toHaveLength(1);
    });

    it('generated frame has a frm id prefix', () => {
      const { doc, page } = makeDoc();
      const cmd = new AddFrameCommand({ doc, pageId: page.id, rect: { x: 0, y: 0, width: 200, height: 200 } });
      cmd.execute();

      expect(page.frames[0].id).toMatch(/^frm/);
    });

    it('uses provided name', () => {
      const { doc, page } = makeDoc();
      const cmd = new AddFrameCommand({ doc, pageId: page.id, rect: { x: 0, y: 0, width: 100, height: 100 }, name: 'My Frame' });
      cmd.execute();

      expect(page.frames[0].name).toBe('My Frame');
    });

    it('auto-names Frame N based on frame count at construction time', () => {
      const { doc, page } = makeDoc();
      const cmd = new AddFrameCommand({ doc, pageId: page.id, rect: { x: 0, y: 0, width: 100, height: 100 } });
      cmd.execute();

      expect(page.frames[0].name).toBe('Frame 1');
    });

    it('is idempotent — execute twice does not duplicate the frame', () => {
      const { doc, page } = makeDoc();
      const cmd = new AddFrameCommand({ doc, pageId: page.id, rect: { x: 0, y: 0, width: 200, height: 200 } });
      cmd.execute();
      cmd.execute();

      expect(page.frames).toHaveLength(1);
    });

    it('sets correct transparent background and clipContent: false', () => {
      const { doc, page } = makeDoc();
      const cmd = new AddFrameCommand({ doc, pageId: page.id, rect: { x: 10, y: 20, width: 300, height: 150 } });
      cmd.execute();

      expect(page.frames[0].data.background).toBe('rgba(0,0,0,0)');
      expect(page.frames[0].data.clipContent).toBe(false);
    });
  });

  describe('undo', () => {
    it('removes the frame from page.frames', () => {
      const { doc, page } = makeDoc();
      const cmd = new AddFrameCommand({ doc, pageId: page.id, rect: { x: 0, y: 0, width: 200, height: 200 } });
      cmd.execute();
      cmd.undo();

      expect(page.frames).toHaveLength(0);
    });

    it('clears frameId on child elements when undone', () => {
      const { doc, page } = makeDoc();
      const el = makeElement();
      page.elements.push(el);

      const addFrame = new AddFrameCommand({ doc, pageId: page.id, rect: { x: 0, y: 0, width: 200, height: 200 } });
      addFrame.execute();

      const attach = new AttachToFrameCommand({ doc, pageId: page.id, frameId: addFrame.frameId, elementId: el.id });
      attach.execute();

      expect(el.frameId).toBe(addFrame.frameId);

      addFrame.undo();

      expect(el.frameId).toBeUndefined();
    });

    it('undo → re-execute cycle restores frame', () => {
      const { doc, page } = makeDoc();
      const cmd = new AddFrameCommand({ doc, pageId: page.id, rect: { x: 0, y: 0, width: 200, height: 200 } });
      cmd.execute();
      const id = page.frames[0].id;
      cmd.undo();
      cmd.execute();

      expect(page.frames[0].id).toBe(id);
    });
  });

  describe('operation records', () => {
    it('emits a node:insert operation record', () => {
      const { doc, page } = makeDoc();
      const cmd = new AddFrameCommand({ doc, pageId: page.id, rect: { x: 0, y: 0, width: 200, height: 200 } });

      expect(cmd.operationRecords).toHaveLength(1);
      expect(cmd.operationRecords[0].type).toBe('node:insert');
      const payload = cmd.operationRecords[0].payload as { parentId: string };
      expect(payload.parentId).toBe(page.id);
    });
  });
});

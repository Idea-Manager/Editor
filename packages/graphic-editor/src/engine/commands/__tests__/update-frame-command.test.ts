import { UpdateFrameCommand } from '../update-frame-command';
import { createDocument, createGraphicPage, createFrame } from '@core/model/factory';

function makeDoc() {
  const doc = createDocument();
  const page = createGraphicPage('Page');
  const frame = createFrame('F1', { x: 10, y: 20, width: 200, height: 150 });
  page.frames.push(frame);
  doc.graphicPages.push(page);
  return { doc, page, frame };
}

describe('UpdateFrameCommand', () => {
  describe('execute / undo', () => {
    it('updates frame.data.x on execute', () => {
      const { doc, page, frame } = makeDoc();
      const cmd = new UpdateFrameCommand({ doc, pageId: page.id, frameId: frame.id, path: 'data.x', value: 99 });
      cmd.execute();

      expect(page.frames[0].data.x).toBe(99);
    });

    it('reverts frame.data.x on undo', () => {
      const { doc, page, frame } = makeDoc();
      const cmd = new UpdateFrameCommand({ doc, pageId: page.id, frameId: frame.id, path: 'data.x', value: 99 });
      cmd.execute();
      cmd.undo();

      expect(page.frames[0].data.x).toBe(10);
    });

    it('updates nested data.width', () => {
      const { doc, page, frame } = makeDoc();
      const cmd = new UpdateFrameCommand({ doc, pageId: page.id, frameId: frame.id, path: 'data.width', value: 400 });
      cmd.execute();

      expect(page.frames[0].data.width).toBe(400);
    });
  });

  describe('validation', () => {
    it('throws when path does not start with data.', () => {
      const { doc, page, frame } = makeDoc();
      expect(() => new UpdateFrameCommand({ doc, pageId: page.id, frameId: frame.id, path: 'name', value: 'X' }))
        .toThrow();
    });

    it('throws for empty path', () => {
      const { doc, page, frame } = makeDoc();
      expect(() => new UpdateFrameCommand({ doc, pageId: page.id, frameId: frame.id, path: '', value: 0 }))
        .toThrow();
    });
  });

  describe('merge', () => {
    it('merges consecutive updates within the merge window', () => {
      const { doc, page, frame } = makeDoc();
      const a = new UpdateFrameCommand({ doc, pageId: page.id, frameId: frame.id, path: 'data.x', value: 50, mergeWindowMs: 1000 });
      const b = new UpdateFrameCommand({ doc, pageId: page.id, frameId: frame.id, path: 'data.x', value: 80, mergeWindowMs: 1000 });
      a.execute();
      const merged = a.merge(b);

      expect(merged).toBe(true);
      expect(page.frames[0].data.x).toBe(80);
    });

    it('does not merge commands for different frames', () => {
      const { doc, page, frame } = makeDoc();
      const f2 = createFrame('F2', { x: 100, y: 100, width: 50, height: 50 });
      page.frames.push(f2);

      const a = new UpdateFrameCommand({ doc, pageId: page.id, frameId: frame.id, path: 'data.x', value: 50, mergeWindowMs: 1000 });
      const b = new UpdateFrameCommand({ doc, pageId: page.id, frameId: f2.id, path: 'data.x', value: 80, mergeWindowMs: 1000 });
      a.execute();

      expect(a.merge(b)).toBe(false);
    });
  });

  describe('operation records', () => {
    it('emits a node:update record', () => {
      const { doc, page, frame } = makeDoc();
      const cmd = new UpdateFrameCommand({ doc, pageId: page.id, frameId: frame.id, path: 'data.width', value: 300 });

      expect(cmd.operationRecords).toHaveLength(1);
      expect(cmd.operationRecords[0].type).toBe('node:update');
    });
  });
});

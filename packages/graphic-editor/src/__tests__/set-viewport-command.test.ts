import { SetViewportCommand } from '../engine/commands/set-viewport-command';
import type { DocumentNode } from '@core/model/interfaces';
import { createDocument, createGraphicPage } from '@core/model/factory';

function makeDoc(): DocumentNode {
  const doc = createDocument();
  const page = createGraphicPage('Test Page');
  doc.graphicPages.push(page);
  return doc;
}

describe('SetViewportCommand', () => {
  describe('execute / undo', () => {
    it('updates the page viewport on execute', () => {
      const doc = makeDoc();
      const page = doc.graphicPages[0];
      const next = { x: 10, y: 20, zoom: 2 };
      const cmd = new SetViewportCommand(doc, page.id, next, 'set');

      cmd.execute();

      expect(page.viewport).toEqual(next);
    });

    it('restores prior viewport on undo', () => {
      const doc = makeDoc();
      const page = doc.graphicPages[0];
      const original = { ...page.viewport };
      const cmd = new SetViewportCommand(doc, page.id, { x: 5, y: 5, zoom: 1.5 }, 'set');

      cmd.execute();
      cmd.undo();

      expect(page.viewport).toEqual(original);
    });

    it('includes a node:update operation record with path "viewport"', () => {
      const doc = makeDoc();
      const page = doc.graphicPages[0];
      const cmd = new SetViewportCommand(doc, page.id, { x: 0, y: 0, zoom: 1 }, 'set');

      expect(cmd.operationRecords).toHaveLength(1);
      expect(cmd.operationRecords[0].type).toBe('node:update');
      const payload = cmd.operationRecords[0].payload as { nodeId: string; path: string };
      expect(payload.nodeId).toBe(page.id);
      expect(payload.path).toBe('viewport');
    });
  });

  describe('merge', () => {
    it('coalesces same-reason commands within 500 ms', () => {
      const doc = makeDoc();
      const page = doc.graphicPages[0];
      const cmd1 = new SetViewportCommand(doc, page.id, { x: 0, y: 0, zoom: 1 }, 'pan');
      cmd1.execute();

      const cmd2 = new SetViewportCommand(doc, page.id, { x: 10, y: 0, zoom: 1 }, 'pan');
      const merged = cmd1.merge(cmd2);

      expect(merged).toBe(true);
      // After merge, page viewport should reflect cmd2's viewport
      expect(page.viewport.x).toBeCloseTo(10);
    });

    it('does not coalesce commands with different reasons', () => {
      const doc = makeDoc();
      const page = doc.graphicPages[0];
      const cmd1 = new SetViewportCommand(doc, page.id, { x: 0, y: 0, zoom: 1 }, 'pan');
      cmd1.execute();
      const cmd2 = new SetViewportCommand(doc, page.id, { x: 10, y: 0, zoom: 2 }, 'wheel-zoom');
      expect(cmd1.merge(cmd2)).toBe(false);
    });

    it('does not coalesce commands for different pages', () => {
      const doc = makeDoc();
      const page1 = doc.graphicPages[0];
      const page2 = createGraphicPage('Page 2');
      doc.graphicPages.push(page2);

      const cmd1 = new SetViewportCommand(doc, page1.id, { x: 0, y: 0, zoom: 1 }, 'pan');
      cmd1.execute();
      const cmd2 = new SetViewportCommand(doc, page2.id, { x: 5, y: 5, zoom: 1 }, 'pan');
      expect(cmd1.merge(cmd2)).toBe(false);
    });

    it('does not coalesce after 500 ms have elapsed', () => {
      jest.useFakeTimers();
      const doc = makeDoc();
      const page = doc.graphicPages[0];
      const cmd1 = new SetViewportCommand(doc, page.id, { x: 0, y: 0, zoom: 1 }, 'wheel-zoom');
      cmd1.execute();

      jest.advanceTimersByTime(600);

      const cmd2 = new SetViewportCommand(doc, page.id, { x: 5, y: 5, zoom: 1.5 }, 'wheel-zoom');
      expect(cmd1.merge(cmd2)).toBe(false);

      jest.useRealTimers();
    });

    it('undo after merge restores the original pre-cmd1 viewport', () => {
      const doc = makeDoc();
      const page = doc.graphicPages[0];
      const original = { ...page.viewport };

      const cmd1 = new SetViewportCommand(doc, page.id, { x: 5, y: 0, zoom: 1 }, 'pan');
      cmd1.execute();
      const cmd2 = new SetViewportCommand(doc, page.id, { x: 10, y: 0, zoom: 1 }, 'pan');
      cmd1.merge(cmd2);

      cmd1.undo();

      expect(page.viewport).toEqual(original);
    });
  });
});

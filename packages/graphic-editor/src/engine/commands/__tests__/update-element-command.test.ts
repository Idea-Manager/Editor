import { UpdateElementCommand } from '../update-element-command';
import { createDocument, createGraphicPage } from '@core/model/factory';
import { generateId } from '@core/id';
import type { DocumentNode, GraphicElement } from '@core/model/interfaces';

function makeElement(): GraphicElement {
  return {
    id: generateId('el'),
    type: 'rectangle',
    data: { x: 10, y: 20, fill: 'red', nested: { value: 1 } },
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

describe('UpdateElementCommand', () => {
  describe('execute / undo', () => {
    it('updates a top-level data field', () => {
      const { doc, pageId, el } = makeDoc();
      const cmd = new UpdateElementCommand({ doc, pageId, elementId: el.id, path: 'data.fill', value: 'blue' });

      cmd.execute();

      expect((doc.graphicPages[0].elements[0].data as Record<string, unknown>).fill).toBe('blue');
    });

    it('restores the old value on undo', () => {
      const { doc, pageId, el } = makeDoc();
      const cmd = new UpdateElementCommand({ doc, pageId, elementId: el.id, path: 'data.fill', value: 'blue' });

      cmd.execute();
      cmd.undo();

      expect((doc.graphicPages[0].elements[0].data as Record<string, unknown>).fill).toBe('red');
    });

    it('updates a deep nested path', () => {
      const { doc, pageId, el } = makeDoc();
      const cmd = new UpdateElementCommand({ doc, pageId, elementId: el.id, path: 'data.nested.value', value: 99 });

      cmd.execute();

      const data = doc.graphicPages[0].elements[0].data as Record<string, unknown>;
      expect((data.nested as Record<string, unknown>).value).toBe(99);
    });

    it('uses immutable updates (does not mutate original element reference)', () => {
      const { doc, pageId, el } = makeDoc();
      const originalEl = doc.graphicPages[0].elements[0];
      const cmd = new UpdateElementCommand({ doc, pageId, elementId: el.id, path: 'data.fill', value: 'blue' });

      cmd.execute();

      expect(doc.graphicPages[0].elements[0]).not.toBe(originalEl);
    });
  });

  describe('path validation', () => {
    it('throws when path does not start with data. or meta.', () => {
      const { doc, pageId, el } = makeDoc();
      expect(() => new UpdateElementCommand({ doc, pageId, elementId: el.id, path: 'x', value: 1 })).toThrow();
    });

    it('throws when path is "id"', () => {
      const { doc, pageId, el } = makeDoc();
      expect(() => new UpdateElementCommand({ doc, pageId, elementId: el.id, path: 'id', value: 'other' })).toThrow();
    });

    it('throws when path is "type"', () => {
      const { doc, pageId, el } = makeDoc();
      expect(() => new UpdateElementCommand({ doc, pageId, elementId: el.id, path: 'type', value: 'circle' })).toThrow();
    });
  });

  describe('merge', () => {
    it('merges within the window for the same element + path', () => {
      const { doc, pageId, el } = makeDoc();
      const cmd1 = new UpdateElementCommand({ doc, pageId, elementId: el.id, path: 'data.x', value: 50, mergeWindowMs: 500 });
      cmd1.execute();

      const cmd2 = new UpdateElementCommand({ doc, pageId, elementId: el.id, path: 'data.x', value: 100, mergeWindowMs: 500 });
      const merged = cmd1.merge(cmd2);

      expect(merged).toBe(true);
      expect((doc.graphicPages[0].elements[0].data as Record<string, unknown>).x).toBe(100);
    });

    it('does not merge when paths differ', () => {
      const { doc, pageId, el } = makeDoc();
      const cmd1 = new UpdateElementCommand({ doc, pageId, elementId: el.id, path: 'data.x', value: 50, mergeWindowMs: 500 });
      cmd1.execute();

      const cmd2 = new UpdateElementCommand({ doc, pageId, elementId: el.id, path: 'data.y', value: 100, mergeWindowMs: 500 });
      expect(cmd1.merge(cmd2)).toBe(false);
    });

    it('does not merge when elementIds differ', () => {
      const el2 = makeElement();
      const { doc, pageId, el } = makeDoc();
      doc.graphicPages[0].elements.push(el2);

      const cmd1 = new UpdateElementCommand({ doc, pageId, elementId: el.id, path: 'data.x', value: 50, mergeWindowMs: 500 });
      cmd1.execute();

      const cmd2 = new UpdateElementCommand({ doc, pageId, elementId: el2.id, path: 'data.x', value: 100, mergeWindowMs: 500 });
      expect(cmd1.merge(cmd2)).toBe(false);
    });

    it('does not merge when mergeWindowMs is 0', () => {
      const { doc, pageId, el } = makeDoc();
      const cmd1 = new UpdateElementCommand({ doc, pageId, elementId: el.id, path: 'data.x', value: 50, mergeWindowMs: 0 });
      cmd1.execute();

      const cmd2 = new UpdateElementCommand({ doc, pageId, elementId: el.id, path: 'data.x', value: 100, mergeWindowMs: 0 });
      expect(cmd1.merge(cmd2)).toBe(false);
    });

    it('does not merge after the window has elapsed', () => {
      jest.useFakeTimers();
      const { doc, pageId, el } = makeDoc();
      const cmd1 = new UpdateElementCommand({ doc, pageId, elementId: el.id, path: 'data.x', value: 50, mergeWindowMs: 300 });
      cmd1.execute();

      jest.advanceTimersByTime(400);

      const cmd2 = new UpdateElementCommand({ doc, pageId, elementId: el.id, path: 'data.x', value: 100, mergeWindowMs: 300 });
      expect(cmd1.merge(cmd2)).toBe(false);
      jest.useRealTimers();
    });

    it('undo after merge restores the original value', () => {
      const { doc, pageId, el } = makeDoc();
      const originalFill = (el.data as Record<string, unknown>).fill;

      const cmd1 = new UpdateElementCommand({ doc, pageId, elementId: el.id, path: 'data.fill', value: 'blue', mergeWindowMs: 500 });
      cmd1.execute();
      const cmd2 = new UpdateElementCommand({ doc, pageId, elementId: el.id, path: 'data.fill', value: 'green', mergeWindowMs: 500 });
      cmd1.merge(cmd2);
      cmd1.undo();

      expect((doc.graphicPages[0].elements[0].data as Record<string, unknown>).fill).toBe(originalFill);
    });
  });

  describe('operation records', () => {
    it('emits a node:update operation record', () => {
      const { doc, pageId, el } = makeDoc();
      const cmd = new UpdateElementCommand({ doc, pageId, elementId: el.id, path: 'data.fill', value: 'blue' });

      expect(cmd.operationRecords).toHaveLength(1);
      expect(cmd.operationRecords[0].type).toBe('node:update');
      const payload = cmd.operationRecords[0].payload as { nodeId: string; path: string; oldValue: unknown; newValue: unknown };
      expect(payload.nodeId).toBe(el.id);
      expect(payload.path).toBe('data.fill');
      expect(payload.newValue).toBe('blue');
    });
  });
});

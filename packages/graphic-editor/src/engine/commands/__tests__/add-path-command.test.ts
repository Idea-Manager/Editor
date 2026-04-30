import { AddPathCommand } from '../add-path-command';
import { GraphicBlockRegistry } from '../../../blocks/block-registry';
import { PathBlock } from '../../../blocks/path/path-block';
import { createDocument, createGraphicPage, createFrame } from '@core/model/factory';
import type { DocumentNode } from '@core/model/interfaces';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRegistry(): GraphicBlockRegistry {
  const registry = new GraphicBlockRegistry();
  registry.register({ ...PathBlock });
  return registry;
}

function makeDoc(): DocumentNode {
  const doc = createDocument();
  doc.graphicPages.push(createGraphicPage('Page 1'));
  return doc;
}

const SIMPLE_POINTS = [
  { x: 0, y: 0 },
  { x: 10, y: 5 },
  { x: 20, y: 0 },
  { x: 30, y: 5 },
];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AddPathCommand', () => {
  describe('execute / undo', () => {
    it('adds a path element to the page on execute', () => {
      const doc = makeDoc();
      const page = doc.graphicPages[0];
      const cmd = new AddPathCommand({ doc, pageId: page.id, registry: makeRegistry(), points: SIMPLE_POINTS });

      cmd.execute();

      expect(page.elements).toHaveLength(1);
      expect(page.elements[0].type).toBe('path');
    });

    it('element data contains the supplied points', () => {
      const doc = makeDoc();
      const page = doc.graphicPages[0];
      const cmd = new AddPathCommand({ doc, pageId: page.id, registry: makeRegistry(), points: SIMPLE_POINTS });

      cmd.execute();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = page.elements[0].data as any;
      expect(data.points).toEqual(SIMPLE_POINTS);
    });

    it('element data contains a computed bounds AABB', () => {
      const doc = makeDoc();
      const page = doc.graphicPages[0];
      const cmd = new AddPathCommand({ doc, pageId: page.id, registry: makeRegistry(), points: SIMPLE_POINTS });

      cmd.execute();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { bounds } = page.elements[0].data as any;
      expect(bounds.x).toBe(0);
      expect(bounds.y).toBe(0);
      expect(bounds.width).toBe(30);
      expect(bounds.height).toBe(5);
    });

    it('overrides merge with PATH_DEFAULTS (overrides win)', () => {
      const doc = makeDoc();
      const page = doc.graphicPages[0];
      const cmd = new AddPathCommand({
        doc,
        pageId: page.id,
        registry: makeRegistry(),
        points: SIMPLE_POINTS,
        overrides: { stroke: '#123456', strokeWidth: 4 },
      });

      cmd.execute();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = page.elements[0].data as any;
      expect(data.stroke).toBe('#123456');
      expect(data.strokeWidth).toBe(4);
    });

    it('removes the element on undo', () => {
      const doc = makeDoc();
      const page = doc.graphicPages[0];
      const cmd = new AddPathCommand({ doc, pageId: page.id, registry: makeRegistry(), points: SIMPLE_POINTS });

      cmd.execute();
      cmd.undo();

      expect(page.elements).toHaveLength(0);
    });

    it('re-execute after undo re-adds the same element id', () => {
      const doc = makeDoc();
      const page = doc.graphicPages[0];
      const cmd = new AddPathCommand({ doc, pageId: page.id, registry: makeRegistry(), points: SIMPLE_POINTS });

      cmd.execute();
      const id = page.elements[0].id;
      cmd.undo();
      cmd.execute();

      expect(page.elements[0].id).toBe(id);
    });
  });

  describe('operation records', () => {
    it('exposes at least one operation record of type node:insert', () => {
      const doc = makeDoc();
      const page = doc.graphicPages[0];
      const cmd = new AddPathCommand({ doc, pageId: page.id, registry: makeRegistry(), points: SIMPLE_POINTS });

      const insertOps = cmd.operationRecords.filter(r => r.type === 'node:insert');
      expect(insertOps).toHaveLength(1);
    });

    it('node:insert payload references the correct pageId', () => {
      const doc = makeDoc();
      const page = doc.graphicPages[0];
      const cmd = new AddPathCommand({ doc, pageId: page.id, registry: makeRegistry(), points: SIMPLE_POINTS });

      const op = cmd.operationRecords.find(r => r.type === 'node:insert')!;
      expect((op.payload as { parentId: string }).parentId).toBe(page.id);
    });
  });

  describe('frame auto-attachment', () => {
    it('auto-attaches to an enclosing frame', () => {
      const doc = makeDoc();
      const page = doc.graphicPages[0];
      // Frame covers the path's AABB
      const frame = createFrame('F1', { x: -10, y: -10, width: 60, height: 30 });
      page.frames.push(frame);

      const cmd = new AddPathCommand({ doc, pageId: page.id, registry: makeRegistry(), points: SIMPLE_POINTS });
      cmd.execute();

      const el = page.elements[0];
      expect(el.frameId).toBe(frame.id);
      expect(frame.childElementIds).toContain(el.id);
    });

    it('undo detaches from the frame', () => {
      const doc = makeDoc();
      const page = doc.graphicPages[0];
      const frame = createFrame('F1', { x: -10, y: -10, width: 60, height: 30 });
      page.frames.push(frame);

      const cmd = new AddPathCommand({ doc, pageId: page.id, registry: makeRegistry(), points: SIMPLE_POINTS });
      cmd.execute();
      cmd.undo();

      expect(page.elements).toHaveLength(0);
      expect(frame.childElementIds).toHaveLength(0);
    });

    it('does NOT attach when path is outside all frames', () => {
      const doc = makeDoc();
      const page = doc.graphicPages[0];
      const frame = createFrame('F1', { x: 500, y: 500, width: 100, height: 100 });
      page.frames.push(frame);

      const cmd = new AddPathCommand({ doc, pageId: page.id, registry: makeRegistry(), points: SIMPLE_POINTS });
      cmd.execute();

      expect(page.elements[0].frameId).toBeUndefined();
      expect(frame.childElementIds).toHaveLength(0);
    });
  });
});

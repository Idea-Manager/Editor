import { AddElementCommand } from '../add-element-command';
import { GraphicBlockRegistry } from '../../../blocks/block-registry';
import type { GraphicBlockDefinition } from '../../../blocks/block-definition';
import { createDocument, createGraphicPage, createFrame } from '@core/model/factory';
import type { DocumentNode, Rect } from '@core/model/interfaces';
import { StyleMemoryService } from '../../../preferences/style-memory-service';
import { UndoRedoManager } from '@core/history/undo-redo-manager';
import { EventBus } from '@core/events/event-bus';

function makeRegistry(
  type = 'rectangle',
  defaultData: Record<string, unknown> = {},
  bounds: Rect = { x: 0, y: 0, width: 100, height: 100 },
): GraphicBlockRegistry {
  const registry = new GraphicBlockRegistry();
  const def: GraphicBlockDefinition = {
    type,
    labelKey: `graphic.block.${type}`,
    icon: '<rect x="4" y="4" width="16" height="16"/>',
    defaultData: () => ({ ...defaultData }),
    renderSvg: () => document.createElementNS('http://www.w3.org/2000/svg', 'rect'),
    getBounds: (el) => {
      const d = el.data as Record<string, unknown>;
      return {
        x: (d.x as number) ?? bounds.x,
        y: (d.y as number) ?? bounds.y,
        width: (d.width as number) ?? bounds.width,
        height: (d.height as number) ?? bounds.height,
      };
    },
  };
  registry.register(def);
  return registry;
}

function makeDoc(): DocumentNode {
  const doc = createDocument();
  doc.graphicPages.push(createGraphicPage('Page 1'));
  return doc;
}

describe('AddElementCommand', () => {
  describe('execute / undo', () => {
    it('adds an element to the page on execute', () => {
      const doc = makeDoc();
      const page = doc.graphicPages[0];
      const registry = makeRegistry();
      const cmd = new AddElementCommand({ doc, pageId: page.id, type: 'rectangle', registry });

      cmd.execute();

      expect(page.elements).toHaveLength(1);
      expect(page.elements[0].type).toBe('rectangle');
    });

    it('removes the element on undo', () => {
      const doc = makeDoc();
      const page = doc.graphicPages[0];
      const registry = makeRegistry();
      const cmd = new AddElementCommand({ doc, pageId: page.id, type: 'rectangle', registry });

      cmd.execute();
      cmd.undo();

      expect(page.elements).toHaveLength(0);
    });

    it('re-execute after undo uses the same element id (idempotency)', () => {
      const doc = makeDoc();
      const page = doc.graphicPages[0];
      const registry = makeRegistry();
      const cmd = new AddElementCommand({ doc, pageId: page.id, type: 'rectangle', registry });

      cmd.execute();
      const id = page.elements[0].id;
      cmd.undo();
      cmd.execute();

      expect(page.elements[0].id).toBe(id);
    });

    it('calling execute twice does not duplicate the element', () => {
      const doc = makeDoc();
      const page = doc.graphicPages[0];
      const registry = makeRegistry();
      const cmd = new AddElementCommand({ doc, pageId: page.id, type: 'rectangle', registry });

      cmd.execute();
      cmd.execute();

      expect(page.elements).toHaveLength(1);
    });
  });

  describe('auto frame attachment', () => {
    it('auto-attaches the element to a frame when its AABB intersects', () => {
      const doc = makeDoc();
      const page = doc.graphicPages[0];
      // Frame covers (0,0)→(200,200); element defaultData at (0,0) with 100×100 — intersects
      const frame = createFrame('F1', { x: 0, y: 0, width: 200, height: 200 });
      page.frames.push(frame);
      const registry = makeRegistry('rectangle', {}, { x: 0, y: 0, width: 100, height: 100 });

      const cmd = new AddElementCommand({ doc, pageId: page.id, type: 'rectangle', registry });
      cmd.execute();

      const el = page.elements[0];
      expect(el.frameId).toBe(frame.id);
      expect(frame.childElementIds).toContain(el.id);
    });

    it('does NOT attach when element AABB is entirely outside all frames', () => {
      const doc = makeDoc();
      const page = doc.graphicPages[0];
      // Frame at (500,500); element at (0,0) — no overlap
      const frame = createFrame('F1', { x: 500, y: 500, width: 200, height: 200 });
      page.frames.push(frame);
      const registry = makeRegistry('rectangle', {}, { x: 0, y: 0, width: 100, height: 100 });

      const cmd = new AddElementCommand({ doc, pageId: page.id, type: 'rectangle', registry });
      cmd.execute();

      const el = page.elements[0];
      expect(el.frameId).toBeUndefined();
      expect(frame.childElementIds).toHaveLength(0);
    });

    it('skipFrameAttach: true bypasses auto-detection', () => {
      const doc = makeDoc();
      const page = doc.graphicPages[0];
      const frame = createFrame('F1', { x: 0, y: 0, width: 200, height: 200 });
      page.frames.push(frame);
      const registry = makeRegistry('rectangle', {}, { x: 0, y: 0, width: 100, height: 100 });

      const cmd = new AddElementCommand({ doc, pageId: page.id, type: 'rectangle', registry, skipFrameAttach: true });
      cmd.execute();

      const el = page.elements[0];
      expect(el.frameId).toBeUndefined();
      expect(frame.childElementIds).toHaveLength(0);
    });

    it('undo removes element from frame.childElementIds when auto-attached', () => {
      const doc = makeDoc();
      const page = doc.graphicPages[0];
      const frame = createFrame('F1', { x: 0, y: 0, width: 200, height: 200 });
      page.frames.push(frame);
      const registry = makeRegistry('rectangle', {}, { x: 0, y: 0, width: 100, height: 100 });

      const cmd = new AddElementCommand({ doc, pageId: page.id, type: 'rectangle', registry });
      cmd.execute();
      cmd.undo();

      expect(frame.childElementIds).toHaveLength(0);
    });

    it('picks the first frame by document order when element overlaps multiple', () => {
      const doc = makeDoc();
      const page = doc.graphicPages[0];
      const f1 = createFrame('F1', { x: 0, y: 0, width: 200, height: 200 });
      const f2 = createFrame('F2', { x: 50, y: 50, width: 200, height: 200 });
      page.frames.push(f1, f2);
      const registry = makeRegistry('rectangle', {}, { x: 100, y: 100, width: 100, height: 100 });

      const cmd = new AddElementCommand({ doc, pageId: page.id, type: 'rectangle', registry });
      cmd.execute();

      const el = page.elements[0];
      expect(el.frameId).toBe(f1.id);
    });
  });

  describe('data merge layering', () => {
    it('merges defaultData → graphicPreferences → dataOverride', () => {
      const doc = makeDoc();
      doc.data = {
        graphicPreferences: {
          rectangle: { fill: 'blue', border: 'thick' },
        },
      };
      const page = doc.graphicPages[0];
      const registry = makeRegistry('rectangle', { fill: 'red', opacity: 1 });

      const cmd = new AddElementCommand({
        doc,
        pageId: page.id,
        type: 'rectangle',
        registry,
        dataOverride: { fill: 'green' },
      });
      cmd.execute();

      const data = page.elements[0].data as Record<string, unknown>;
      expect(data.opacity).toBe(1);         // from defaultData
      expect(data.border).toBe('thick');    // from graphicPreferences (overrides defaultData)
      expect(data.fill).toBe('green');      // from dataOverride (highest priority)
    });
  });

  describe('operation records', () => {
    it('emits a node:insert operation record', () => {
      const doc = makeDoc();
      const page = doc.graphicPages[0];
      const registry = makeRegistry();
      const cmd = new AddElementCommand({ doc, pageId: page.id, type: 'rectangle', registry });

      expect(cmd.operationRecords).toHaveLength(1);
      expect(cmd.operationRecords[0].type).toBe('node:insert');
      const payload = cmd.operationRecords[0].payload as { parentId: string };
      expect(payload.parentId).toBe(page.id);
    });
  });

  describe('StyleMemoryService integration', () => {
    function makeStyleMemory(doc: DocumentNode) {
      const bus = new EventBus();
      const undoRedo = new UndoRedoManager(bus);
      return new StyleMemoryService(doc, undoRedo);
    }

    it('uses getEffectiveDefaults when styleMemory is provided', () => {
      const doc = makeDoc();
      doc.data = {
        graphicPreferences: {
          rectangle: { background: 'blue' },
        },
      };
      const page = doc.graphicPages[0];
      const registry = makeRegistry('rectangle', { background: 'red', opacity: 0.5 });
      const styleMemory = makeStyleMemory(doc);

      const cmd = new AddElementCommand({ doc, pageId: page.id, type: 'rectangle', registry, styleMemory });
      cmd.execute();

      const data = page.elements[0].data as Record<string, unknown>;
      expect(data.opacity).toBe(0.5);       // from defaultData
      expect(data.background).toBe('blue'); // from graphicPreferences (overrides default)
    });

    it('NON_PERSISTABLE_PATHS (x, y, width, height) are filtered from prefs', () => {
      const doc = makeDoc();
      doc.data = {
        graphicPreferences: {
          rectangle: { x: 999, y: 999, width: 999, height: 999, background: 'blue' },
        },
      };
      const page = doc.graphicPages[0];
      const registry = makeRegistry('rectangle', { x: 0, y: 0, width: 100, height: 100, background: 'red' });
      const styleMemory = makeStyleMemory(doc);

      const cmd = new AddElementCommand({ doc, pageId: page.id, type: 'rectangle', registry, styleMemory });
      cmd.execute();

      const data = page.elements[0].data as Record<string, unknown>;
      expect(data.x).toBe(0);              // not inherited from prefs
      expect(data.y).toBe(0);
      expect(data.background).toBe('blue'); // visual prefs ARE inherited
    });

    it('dataOverride always wins over styleMemory prefs', () => {
      const doc = makeDoc();
      doc.data = {
        graphicPreferences: {
          rectangle: { background: 'blue' },
        },
      };
      const page = doc.graphicPages[0];
      const registry = makeRegistry('rectangle', { background: 'red' });
      const styleMemory = makeStyleMemory(doc);

      const cmd = new AddElementCommand({
        doc,
        pageId: page.id,
        type: 'rectangle',
        registry,
        styleMemory,
        dataOverride: { background: 'green' },
      });
      cmd.execute();

      const data = page.elements[0].data as Record<string, unknown>;
      expect(data.background).toBe('green'); // dataOverride wins
    });
  });
});

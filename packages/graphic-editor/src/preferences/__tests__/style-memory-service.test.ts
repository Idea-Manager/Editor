import { StyleMemoryService, NON_PERSISTABLE_PATHS } from '../style-memory-service';
import { GraphicBlockRegistry } from '../../blocks/block-registry';
import type { GraphicBlockDefinition } from '../../blocks/block-definition';
import { createDocument } from '@core/model/factory';
import { EventBus } from '@core/events/event-bus';
import { UndoRedoManager } from '@core/history/undo-redo-manager';
import type { DocumentNode } from '@core/model/interfaces';

function makeRegistry(
  type = 'rectangle',
  defaults: Record<string, unknown> = {},
): GraphicBlockRegistry {
  const registry = new GraphicBlockRegistry();
  const def: GraphicBlockDefinition = {
    type,
    labelKey: `graphic.block.${type}`,
    icon: 'square',
    defaultData: () => ({ ...defaults }),
    renderSvg: () => document.createElementNS('http://www.w3.org/2000/svg', 'rect'),
    getBounds: () => ({ x: 0, y: 0, width: 100, height: 100 }),
  };
  registry.register(def);
  return registry;
}

function makeService(doc: DocumentNode) {
  const bus = new EventBus();
  const undoRedo = new UndoRedoManager(bus);
  return { service: new StyleMemoryService(doc, undoRedo), undoRedo };
}

describe('NON_PERSISTABLE_PATHS', () => {
  it('contains positional and structural fields', () => {
    expect(NON_PERSISTABLE_PATHS.has('x')).toBe(true);
    expect(NON_PERSISTABLE_PATHS.has('y')).toBe(true);
    expect(NON_PERSISTABLE_PATHS.has('width')).toBe(true);
    expect(NON_PERSISTABLE_PATHS.has('height')).toBe(true);
    expect(NON_PERSISTABLE_PATHS.has('points')).toBe(true);
    expect(NON_PERSISTABLE_PATHS.has('from')).toBe(true);
    expect(NON_PERSISTABLE_PATHS.has('to')).toBe(true);
    expect(NON_PERSISTABLE_PATHS.has('bounds')).toBe(true);
  });
});

describe('StyleMemoryService.getEffectiveDefaults', () => {
  it('returns defaults when no prefs are stored', () => {
    const doc = createDocument();
    const registry = makeRegistry('rectangle', { background: 'white', fontSize: 14 });
    const { service } = makeService(doc);

    const result = service.getEffectiveDefaults('rectangle', registry);
    expect(result['background']).toBe('white');
    expect(result['fontSize']).toBe(14);
  });

  it('merges stored prefs over defaults', () => {
    const doc = createDocument();
    doc.data = { graphicPreferences: { rectangle: { background: 'blue' } } };
    const registry = makeRegistry('rectangle', { background: 'white', fontSize: 14 });
    const { service } = makeService(doc);

    const result = service.getEffectiveDefaults('rectangle', registry);
    expect(result['background']).toBe('blue');
    expect(result['fontSize']).toBe(14);
  });

  it('deep-merges nested prefs', () => {
    const doc = createDocument();
    doc.data = {
      graphicPreferences: {
        rectangle: { border: { thickness: 3 } },
      },
    };
    const registry = makeRegistry('rectangle', { border: { thickness: 1, color: '#000' } });
    const { service } = makeService(doc);

    const result = service.getEffectiveDefaults('rectangle', registry);
    const border = result['border'] as Record<string, unknown>;
    expect(border['thickness']).toBe(3);
    expect(border['color']).toBe('#000'); // kept from defaults
  });

  it('filters out NON_PERSISTABLE_PATHS (x, y, width, height)', () => {
    const doc = createDocument();
    doc.data = {
      graphicPreferences: {
        rectangle: { x: 999, y: 999, width: 500, height: 500, background: 'blue' },
      },
    };
    const registry = makeRegistry('rectangle', { x: 0, y: 0, width: 100, height: 100, background: 'white' });
    const { service } = makeService(doc);

    const result = service.getEffectiveDefaults('rectangle', registry);
    expect(result['x']).toBe(0);
    expect(result['y']).toBe(0);
    expect(result['background']).toBe('blue');
  });

  it('filters out text path', () => {
    const doc = createDocument();
    doc.data = {
      graphicPreferences: {
        sticker: { text: 'saved text', background: 'yellow' },
      },
    };
    const registry = makeRegistry('sticker', { text: '', background: 'white' });
    const { service } = makeService(doc);

    const result = service.getEffectiveDefaults('sticker', registry);
    expect(result['text']).toBe('');
    expect(result['background']).toBe('yellow');
  });

  it('filters out template path', () => {
    const doc = createDocument();
    doc.data = {
      graphicPreferences: {
        custom: { template: 'saved', background: 'red' },
      },
    };
    const registry = makeRegistry('custom', { template: '', background: 'white' });
    const { service } = makeService(doc);

    const result = service.getEffectiveDefaults('custom', registry);
    expect(result['template']).toBe('');
    expect(result['background']).toBe('red');
  });
});

describe('StyleMemoryService.recordUpdate', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not persist NON_PERSISTABLE_PATHS (x, y)', () => {
    const doc = createDocument();
    const { service, undoRedo } = makeService(doc);

    service.recordUpdate('rectangle', 'data.x', 99);
    service.recordUpdate('rectangle', 'data.y', 99);
    jest.runAllTimers();

    expect(undoRedo.undoStackSize).toBe(0);
  });

  it('does not persist data.text', () => {
    const doc = createDocument();
    const { service, undoRedo } = makeService(doc);

    service.recordUpdate('sticker', 'data.text', 'hello');
    jest.runAllTimers();

    expect(undoRedo.undoStackSize).toBe(0);
  });

  it('does not persist data.template.*', () => {
    const doc = createDocument();
    const { service, undoRedo } = makeService(doc);

    service.recordUpdate('custom', 'data.template.field', 'val');
    jest.runAllTimers();

    expect(undoRedo.undoStackSize).toBe(0);
  });

  it('persists visual properties after the coalescing window', () => {
    const doc = createDocument();
    const { service, undoRedo } = makeService(doc);

    service.recordUpdate('rectangle', 'data.background', 'blue');
    expect(undoRedo.undoStackSize).toBe(0);

    jest.runAllTimers();

    expect(undoRedo.undoStackSize).toBe(1);
    const prefs = (doc.data as Record<string, unknown>)['graphicPreferences'] as Record<string, unknown>;
    const rectPrefs = prefs['rectangle'] as Record<string, unknown>;
    expect(rectPrefs['background']).toBe('blue');
  });

  it('coalesces multiple updates of the same path within 1 s', () => {
    const doc = createDocument();
    const { service, undoRedo } = makeService(doc);

    service.recordUpdate('rectangle', 'data.background', 'blue');
    jest.advanceTimersByTime(300);
    service.recordUpdate('rectangle', 'data.background', 'green');
    jest.advanceTimersByTime(300);
    service.recordUpdate('rectangle', 'data.background', 'red');
    jest.runAllTimers();

    expect(undoRedo.undoStackSize).toBe(1);
    const prefs = (doc.data as Record<string, unknown>)['graphicPreferences'] as Record<string, unknown>;
    const rectPrefs = prefs['rectangle'] as Record<string, unknown>;
    expect(rectPrefs['background']).toBe('red');
  });

  it('does NOT coalesce updates for different paths', () => {
    const doc = createDocument();
    const { service, undoRedo } = makeService(doc);

    service.recordUpdate('rectangle', 'data.background', 'blue');
    service.recordUpdate('rectangle', 'data.fontSize', 16);
    jest.runAllTimers();

    expect(undoRedo.undoStackSize).toBe(2);
  });

  it('does NOT coalesce updates for different block types', () => {
    const doc = createDocument();
    const { service, undoRedo } = makeService(doc);

    service.recordUpdate('rectangle', 'data.background', 'blue');
    service.recordUpdate('triangle', 'data.background', 'red');
    jest.runAllTimers();

    expect(undoRedo.undoStackSize).toBe(2);
  });

  it('strips data. prefix when storing', () => {
    const doc = createDocument();
    const { service } = makeService(doc);

    service.recordUpdate('rectangle', 'data.background', 'blue');
    service.flushPending();

    const prefs = (doc.data as Record<string, unknown>)['graphicPreferences'] as Record<string, unknown>;
    const rectPrefs = prefs['rectangle'] as Record<string, unknown>;
    expect(rectPrefs['background']).toBe('blue');
    expect(rectPrefs['data.background']).toBeUndefined();
  });
});

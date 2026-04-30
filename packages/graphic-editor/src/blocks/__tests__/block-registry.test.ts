import { GraphicBlockRegistry, CUSTOM_BLOCK_GROUP_KEY } from '../block-registry';
import type { GraphicBlockDefinition } from '../block-definition';
import { createDocument } from '@core/model/factory';
import { DOCUMENT_DATA_KEYS } from '@core/model/document-data';
import type { CustomBlockDefinition } from '@core/model/graphic-preferences';

function makeDef(type: string, groupKey?: string): GraphicBlockDefinition {
  return {
    type,
    labelKey: `graphic.block.${type}`,
    icon: 'square',
    groupKey,
    defaultData: () => ({}),
    renderSvg: () => document.createElementNS('http://www.w3.org/2000/svg', 'rect'),
    getBounds: () => ({ x: 0, y: 0, width: 100, height: 100 }),
  };
}

describe('GraphicBlockRegistry', () => {
  describe('register / get / has', () => {
    it('retrieves a registered definition by type', () => {
      const registry = new GraphicBlockRegistry();
      const def = makeDef('rectangle');
      registry.register(def);
      expect(registry.get('rectangle')).toBe(def);
    });

    it('has() returns true for registered types and false otherwise', () => {
      const registry = new GraphicBlockRegistry();
      registry.register(makeDef('circle'));
      expect(registry.has('circle')).toBe(true);
      expect(registry.has('triangle')).toBe(false);
    });

    it('throws when getting an unregistered type', () => {
      const registry = new GraphicBlockRegistry();
      expect(() => registry.get('missing')).toThrow('"missing"');
    });

    it('overwrites a definition when registering the same type twice', () => {
      const registry = new GraphicBlockRegistry();
      const def1 = makeDef('rectangle');
      const def2 = { ...makeDef('rectangle'), labelKey: 'updated' };
      registry.register(def1);
      registry.register(def2);
      expect(registry.get('rectangle').labelKey).toBe('updated');
    });
  });

  describe('getAll', () => {
    it('returns all registered definitions in insertion order', () => {
      const registry = new GraphicBlockRegistry();
      const a = makeDef('a');
      const b = makeDef('b');
      const c = makeDef('c');
      registry.register(a);
      registry.register(b);
      registry.register(c);
      expect(registry.getAll()).toEqual([a, b, c]);
    });
  });

  describe('getGroups', () => {
    it('groups definitions by groupKey', () => {
      const registry = new GraphicBlockRegistry();
      registry.register(makeDef('rectangle', 'shapes'));
      registry.register(makeDef('circle', 'shapes'));
      registry.register(makeDef('arrow', 'connectors'));

      const groups = registry.getGroups();
      const shapesGroup = groups.find(g => g.groupKey === 'shapes');
      const connGroup = groups.find(g => g.groupKey === 'connectors');

      expect(shapesGroup?.definitions).toHaveLength(2);
      expect(connGroup?.definitions).toHaveLength(1);
    });

    it('places definitions without groupKey into __ungrouped', () => {
      const registry = new GraphicBlockRegistry();
      registry.register(makeDef('custom-block'));

      const groups = registry.getGroups();
      const ungrouped = groups.find(g => g.groupKey === '__ungrouped');

      expect(ungrouped).toBeDefined();
      expect(ungrouped?.definitions[0].type).toBe('custom-block');
    });

    it('preserves registration order within a group', () => {
      const registry = new GraphicBlockRegistry();
      registry.register(makeDef('b', 'g'));
      registry.register(makeDef('a', 'g'));

      const groups = registry.getGroups();
      const g = groups.find(grp => grp.groupKey === 'g');

      expect(g?.definitions.map(d => d.type)).toEqual(['b', 'a']);
    });

    it('returns an empty array when no definitions are registered', () => {
      const registry = new GraphicBlockRegistry();
      expect(registry.getGroups()).toEqual([]);
    });
  });

  describe('syncCustomBlocks', () => {
    function makeCustomBlock(id: string, name: string): CustomBlockDefinition {
      return {
        id,
        name,
        createdAt: '2024-01-01T00:00:00.000Z',
        source: { width: 200, height: 100 },
        elements: [],
        arrows: [],
      };
    }

    it('registers a synthetic custom:* definition for each custom block', () => {
      const doc = createDocument();
      doc.data[DOCUMENT_DATA_KEYS.customBlocks] = [makeCustomBlock('blk_abc', 'My Widget')];

      const registry = new GraphicBlockRegistry();
      registry.syncCustomBlocks(doc);

      expect(registry.has('custom:blk_abc')).toBe(true);
    });

    it('uses staticLabel equal to the block name', () => {
      const doc = createDocument();
      doc.data[DOCUMENT_DATA_KEYS.customBlocks] = [makeCustomBlock('blk_lbl', 'Button Group')];

      const registry = new GraphicBlockRegistry();
      registry.syncCustomBlocks(doc);

      expect(registry.get('custom:blk_lbl').staticLabel).toBe('Button Group');
    });

    it('places custom blocks in the __custom group', () => {
      const doc = createDocument();
      doc.data[DOCUMENT_DATA_KEYS.customBlocks] = [makeCustomBlock('blk_g', 'G')];

      const registry = new GraphicBlockRegistry();
      registry.syncCustomBlocks(doc);

      const groups = registry.getGroups();
      const customGroup = groups.find(g => g.groupKey === CUSTOM_BLOCK_GROUP_KEY);
      expect(customGroup?.definitions).toHaveLength(1);
    });

    it('removes stale custom:* definitions and re-registers from doc', () => {
      const doc = createDocument();
      doc.data[DOCUMENT_DATA_KEYS.customBlocks] = [makeCustomBlock('blk_old', 'Old')];

      const registry = new GraphicBlockRegistry();
      registry.syncCustomBlocks(doc);
      expect(registry.has('custom:blk_old')).toBe(true);

      // Update doc to remove 'blk_old' and add 'blk_new'
      doc.data[DOCUMENT_DATA_KEYS.customBlocks] = [makeCustomBlock('blk_new', 'New')];
      registry.syncCustomBlocks(doc);

      expect(registry.has('custom:blk_old')).toBe(false);
      expect(registry.has('custom:blk_new')).toBe(true);
    });

    it('does not remove non-custom definitions', () => {
      const doc = createDocument();
      doc.data[DOCUMENT_DATA_KEYS.customBlocks] = [];

      const registry = new GraphicBlockRegistry();
      registry.register(makeDef('rectangle'));
      registry.syncCustomBlocks(doc);

      expect(registry.has('rectangle')).toBe(true);
    });

    it('defaultData uses source dimensions', () => {
      const doc = createDocument();
      const cb = makeCustomBlock('blk_sz', 'Sized');
      cb.source = { width: 300, height: 150 };
      doc.data[DOCUMENT_DATA_KEYS.customBlocks] = [cb];

      const registry = new GraphicBlockRegistry();
      registry.syncCustomBlocks(doc);

      const def = registry.get('custom:blk_sz');
      const defaults = def.defaultData() as { x: number; y: number; width: number; height: number };
      expect(defaults.width).toBe(300);
      expect(defaults.height).toBe(150);
    });
  });
});

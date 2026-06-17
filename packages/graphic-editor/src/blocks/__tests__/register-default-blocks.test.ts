import { GraphicBlockRegistry } from '../block-registry';
import { registerDefaultBlocks } from '../index';

describe('registerDefaultBlocks', () => {
  it('registers 5 block definitions (3 shapes + sticker + path)', () => {
    const registry = new GraphicBlockRegistry();
    registerDefaultBlocks(registry);
    expect(registry.getAll()).toHaveLength(5);
  });

  it('produces one "shapes" group with 3 entries', () => {
    const registry = new GraphicBlockRegistry();
    registerDefaultBlocks(registry);
    const groups = registry.getGroups();
    const shapesGroup = groups.find(g => g.groupKey === 'shapes');
    expect(shapesGroup).toBeDefined();
    expect(shapesGroup?.definitions).toHaveLength(3);
  });

  it('shapes group contains rectangle, triangle, circle in order', () => {
    const registry = new GraphicBlockRegistry();
    registerDefaultBlocks(registry);
    const groups = registry.getGroups();
    const shapesGroup = groups.find(g => g.groupKey === 'shapes');
    expect(shapesGroup?.definitions.map(d => d.type)).toEqual([
      'rectangle',
      'triangle',
      'circle',
    ]);
  });

  it('produces an "__ungrouped" group containing sticker and path (both have no groupKey)', () => {
    const registry = new GraphicBlockRegistry();
    registerDefaultBlocks(registry);
    const groups = registry.getGroups();
    const ungrouped = groups.find(g => g.groupKey === '__ungrouped');
    expect(ungrouped).toBeDefined();
    expect(ungrouped?.definitions).toHaveLength(2);
    const types = ungrouped!.definitions.map(d => d.type);
    expect(types).toContain('sticker');
    expect(types).toContain('path');
  });

  it('the sticker definition has no groupKey', () => {
    const registry = new GraphicBlockRegistry();
    registerDefaultBlocks(registry);
    const sticker = registry.get('sticker');
    expect(sticker.groupKey).toBeUndefined();
  });

  it('the path definition has no groupKey (created via pen tool, not the left panel)', () => {
    const registry = new GraphicBlockRegistry();
    registerDefaultBlocks(registry);
    const path = registry.get('path');
    expect(path.groupKey).toBeUndefined();
  });
});

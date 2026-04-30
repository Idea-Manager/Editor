import { GraphicBlockRegistry } from '../block-registry';
import { registerDefaultBlocks } from '../index';

describe('registerDefaultBlocks', () => {
  it('registers 7 block definitions (4 shapes + sticker + path + arrow)', () => {
    const registry = new GraphicBlockRegistry();
    registerDefaultBlocks(registry);
    expect(registry.getAll()).toHaveLength(7);
  });

  it('produces one "shapes" group with 4 entries', () => {
    const registry = new GraphicBlockRegistry();
    registerDefaultBlocks(registry);
    const groups = registry.getGroups();
    const shapesGroup = groups.find(g => g.groupKey === 'shapes');
    expect(shapesGroup).toBeDefined();
    expect(shapesGroup?.definitions).toHaveLength(4);
  });

  it('shapes group contains rectangle, triangle, circle, ellipse in order', () => {
    const registry = new GraphicBlockRegistry();
    registerDefaultBlocks(registry);
    const groups = registry.getGroups();
    const shapesGroup = groups.find(g => g.groupKey === 'shapes');
    expect(shapesGroup?.definitions.map(d => d.type)).toEqual([
      'rectangle',
      'triangle',
      'circle',
      'ellipse',
    ]);
  });

  it('produces an "__ungrouped" group containing sticker, path, and arrow (all have no groupKey)', () => {
    const registry = new GraphicBlockRegistry();
    registerDefaultBlocks(registry);
    const groups = registry.getGroups();
    const ungrouped = groups.find(g => g.groupKey === '__ungrouped');
    expect(ungrouped).toBeDefined();
    expect(ungrouped?.definitions).toHaveLength(3);
    const types = ungrouped!.definitions.map(d => d.type);
    expect(types).toContain('sticker');
    expect(types).toContain('path');
    expect(types).toContain('arrow');
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

  it('the arrow definition has no groupKey (created via arrow tool, not the left panel)', () => {
    const registry = new GraphicBlockRegistry();
    registerDefaultBlocks(registry);
    const arrow = registry.get('arrow');
    expect(arrow.groupKey).toBeUndefined();
  });
});

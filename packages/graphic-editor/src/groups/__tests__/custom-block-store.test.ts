import { CustomBlockStore } from '../custom-block-store';
import { createDocument } from '@core/model/factory';
import { DOCUMENT_DATA_KEYS } from '@core/model/document-data';
import type { CustomBlockDefinition } from '@core/model/graphic-preferences';

function makeDefinition(overrides: Partial<CustomBlockDefinition> = {}): CustomBlockDefinition {
  return {
    id: 'blk_test',
    name: 'Test Block',
    createdAt: '2024-01-01T00:00:00.000Z',
    source: { width: 100, height: 50 },
    elements: [],
    arrows: [],
    ...overrides,
  };
}

describe('CustomBlockStore', () => {
  it('list() returns [] when doc has no customBlocks', () => {
    const doc = createDocument();
    const store = new CustomBlockStore(doc);
    expect(store.list()).toEqual([]);
  });

  it('list() returns all stored definitions', () => {
    const doc = createDocument();
    const defs: CustomBlockDefinition[] = [
      makeDefinition({ id: 'blk_a', name: 'A' }),
      makeDefinition({ id: 'blk_b', name: 'B' }),
    ];
    doc.data[DOCUMENT_DATA_KEYS.customBlocks] = defs;
    const store = new CustomBlockStore(doc);
    expect(store.list()).toHaveLength(2);
  });

  it('has() returns true for a stored id', () => {
    const doc = createDocument();
    const def = makeDefinition({ id: 'blk_exists' });
    doc.data[DOCUMENT_DATA_KEYS.customBlocks] = [def];
    const store = new CustomBlockStore(doc);
    expect(store.has('blk_exists')).toBe(true);
  });

  it('has() returns false for a missing id', () => {
    const doc = createDocument();
    const store = new CustomBlockStore(doc);
    expect(store.has('blk_missing')).toBe(false);
  });

  it('get() returns the correct definition', () => {
    const doc = createDocument();
    const def = makeDefinition({ id: 'blk_get', name: 'Get Block' });
    doc.data[DOCUMENT_DATA_KEYS.customBlocks] = [def];
    const store = new CustomBlockStore(doc);
    expect(store.get('blk_get')).toBe(def);
  });

  it('get() returns undefined for a missing id', () => {
    const doc = createDocument();
    const store = new CustomBlockStore(doc);
    expect(store.get('blk_none')).toBeUndefined();
  });

  it('reflects live doc changes without reconstructing the store', () => {
    const doc = createDocument();
    const store = new CustomBlockStore(doc);
    expect(store.list()).toHaveLength(0);

    const def = makeDefinition({ id: 'blk_late' });
    doc.data[DOCUMENT_DATA_KEYS.customBlocks] = [def];

    expect(store.list()).toHaveLength(1);
    expect(store.has('blk_late')).toBe(true);
    expect(store.get('blk_late')).toBe(def);
  });
});

import { EventBus } from '@core/events/event-bus';
import { SelectionManager } from '../engine/selection-manager';
import { SelectionSync } from '../engine/selection-sync';
import type { BlockSelection } from '@core/model/interfaces';

describe('SelectionManager', () => {
  let eventBus: EventBus;
  let sm: SelectionManager;

  beforeEach(() => {
    eventBus = new EventBus();
    sm = new SelectionManager(eventBus);
  });

  it('starts with null selection', () => {
    expect(sm.get()).toBeNull();
    expect(sm.isCollapsed).toBe(true);
  });

  it('set() stores a selection and emits selection:change', () => {
    const handler = jest.fn();
    eventBus.on('selection:change', handler);

    const sel: BlockSelection = {
      anchorBlockId: 'blk_1',
      anchorOffset: 0,
      focusBlockId: 'blk_1',
      focusOffset: 5,
      isCollapsed: false,
    };

    sm.set(sel);

    expect(sm.get()).toEqual(sel);
    expect(handler).toHaveBeenCalledWith(sel);
  });

  it('clear() resets to null and emits', () => {
    const handler = jest.fn();
    eventBus.on('selection:change', handler);

    sm.setCollapsed('blk_1', 3);
    sm.clear();

    expect(sm.get()).toBeNull();
    expect(handler).toHaveBeenLastCalledWith(null);
  });

  it('setCollapsed() creates a collapsed selection', () => {
    sm.setCollapsed('blk_1', 7);
    const sel = sm.get()!;

    expect(sel.anchorBlockId).toBe('blk_1');
    expect(sel.anchorOffset).toBe(7);
    expect(sel.focusBlockId).toBe('blk_1');
    expect(sel.focusOffset).toBe(7);
    expect(sel.isCollapsed).toBe(true);
    expect(sm.isCollapsed).toBe(true);
  });

  it('extend() expands the selection keeping anchor', () => {
    sm.setCollapsed('blk_1', 3);
    sm.extend('blk_2', 5);

    const sel = sm.get()!;
    expect(sel.anchorBlockId).toBe('blk_1');
    expect(sel.anchorOffset).toBe(3);
    expect(sel.focusBlockId).toBe('blk_2');
    expect(sel.focusOffset).toBe(5);
    expect(sel.isCollapsed).toBe(false);
    expect(sm.isCollapsed).toBe(false);
  });

  it('extend() to same position marks collapsed', () => {
    sm.setCollapsed('blk_1', 3);
    sm.extend('blk_1', 3);

    expect(sm.isCollapsed).toBe(true);
    expect(sm.get()!.isCollapsed).toBe(true);
  });

  it('extend() does nothing when no selection exists', () => {
    sm.extend('blk_1', 5);
    expect(sm.get()).toBeNull();
  });
});

describe('SelectionSync', () => {
  let sync: SelectionSync;
  let root: HTMLDivElement;

  beforeEach(() => {
    sync = new SelectionSync();
    root = document.createElement('div');
    document.body.appendChild(root);
  });

  afterEach(() => {
    document.body.removeChild(root);
  });

  function createBlock(id: string, text: string): HTMLDivElement {
    const block = document.createElement('div');
    block.setAttribute('data-block-id', id);
    block.textContent = text;
    root.appendChild(block);
    return block;
  }

  it('syncFromDOM returns null when no selection', () => {
    window.getSelection()?.removeAllRanges();
    expect(sync.syncFromDOM(root)).toBeNull();
  });

  it('round-trips a collapsed selection', () => {
    createBlock('blk_1', 'Hello world');

    const sel: BlockSelection = {
      anchorBlockId: 'blk_1',
      anchorOffset: 5,
      focusBlockId: 'blk_1',
      focusOffset: 5,
      isCollapsed: true,
    };

    sync.syncToDOM(sel, root);
    const result = sync.syncFromDOM(root);

    expect(result).not.toBeNull();
    expect(result!.anchorBlockId).toBe('blk_1');
    expect(result!.anchorOffset).toBe(5);
    expect(result!.isCollapsed).toBe(true);
  });

  it('round-trips a range selection within one block', () => {
    createBlock('blk_1', 'Hello world');

    const sel: BlockSelection = {
      anchorBlockId: 'blk_1',
      anchorOffset: 2,
      focusBlockId: 'blk_1',
      focusOffset: 8,
      isCollapsed: false,
    };

    sync.syncToDOM(sel, root);
    const result = sync.syncFromDOM(root);

    expect(result).not.toBeNull();
    expect(result!.anchorBlockId).toBe('blk_1');
    expect(result!.anchorOffset).toBe(2);
    expect(result!.focusBlockId).toBe('blk_1');
    expect(result!.focusOffset).toBe(8);
    expect(result!.isCollapsed).toBe(false);
  });

  it('handles cross-block selection', () => {
    createBlock('blk_1', 'Hello');
    createBlock('blk_2', 'World');

    const sel: BlockSelection = {
      anchorBlockId: 'blk_1',
      anchorOffset: 3,
      focusBlockId: 'blk_2',
      focusOffset: 2,
      isCollapsed: false,
    };

    sync.syncToDOM(sel, root);
    const result = sync.syncFromDOM(root);

    expect(result).not.toBeNull();
    expect(result!.anchorBlockId).toBe('blk_1');
    expect(result!.focusBlockId).toBe('blk_2');
  });
});

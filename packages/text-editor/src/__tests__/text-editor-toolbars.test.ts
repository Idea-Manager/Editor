import { createDocument, createParagraph } from '@core/model/factory';
import { EventBus } from '@core/events/event-bus';
import { UndoRedoManager } from '@core/history/undo-redo-manager';
import { TextEditor } from '../engine/text-editor';
import {
  DEFAULT_CONVERTIBLE_BLOCK_TYPES,
  mergeFloatingToolbarConfig,
} from '../toolbar/toolbar-options';
import { EventBus as SlashEventBus } from '@core/events/event-bus';
import { I18nService } from '@core/i18n/i18n';
import { BlockRegistry } from '../blocks/block-registry';
import { ParagraphBlock } from '../blocks/paragraph-block';
import { HeadingBlock } from '../blocks/heading-block';
import { SelectionManager } from '../engine/selection-manager';
import type { EditorContext } from '../engine/editor-context';
import { SlashPalette } from '../toolbar/slash-palette';
import type { PaletteItem } from '../blocks/block-registry';

function makeSlashCtx(): EditorContext {
  const eventBus = new EventBus();
  const registry = new BlockRegistry();
  registry.register(new ParagraphBlock());
  registry.register(new HeadingBlock());

  const doc = createDocument();
  doc.children = [createParagraph('x')];

  const root = document.createElement('div');
  document.body.appendChild(root);

  return {
    document: doc,
    selectionManager: new SelectionManager(eventBus),
    undoRedoManager: new UndoRedoManager(eventBus),
    eventBus,
    blockRegistry: registry,
    rootElement: root,
    i18n: new I18nService('en'),
  };
}

describe('FloatingToolbarConfig defaults', () => {
  it('mergeFloatingToolbarConfig preserves default convertible block types', () => {
    expect(mergeFloatingToolbarConfig().convertibleBlockTypes).toEqual(DEFAULT_CONVERTIBLE_BLOCK_TYPES);
  });
});

describe('TextEditor toolbars', () => {
  it('invokes floatingToolbarFactory once and destroy on disconnect', () => {
    const factory = jest.fn((_deps, _config) => ({
      destroy: jest.fn(),
      isVisible: (): boolean => false,
    }));

    const editor = new TextEditor();
    document.body.appendChild(editor);

    const bus = new EventBus();
    const undo = new UndoRedoManager(bus);
    const doc = createDocument();
    doc.children = [createParagraph('hi')];

    editor.init(doc, bus, undo, {
      toolbars: { floatingToolbarFactory: factory },
    });

    expect(factory).toHaveBeenCalledTimes(1);
    const inst = factory.mock.results[0].value as { destroy: jest.Mock };

    editor.remove();
    expect(inst.destroy).toHaveBeenCalledTimes(1);
  });
});

describe('SlashPalette options', () => {
  it('filterItems reduces palette entries', () => {
    const ctx = makeSlashCtx();
    const host = document.createElement('div');
    const filterItems = (items: PaletteItem[]): PaletteItem[] =>
      items.filter(i => i.type === 'paragraph');

    const palette = new SlashPalette(ctx, host, { filterItems });
    const blockId = ctx.document.children[0].id;
    palette.show(blockId, 'change');

    const items = host.querySelectorAll('.idea-slash-palette__item');
    expect(items.length).toBe(1);

    palette.destroy();
    ctx.rootElement.remove();
    host.remove();
  });
});

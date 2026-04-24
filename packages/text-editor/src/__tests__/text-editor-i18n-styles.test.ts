import { createDocument, createParagraph } from '@core/model/factory';
import { EventBus } from '@core/events/event-bus';
import { UndoRedoManager } from '@core/history/undo-redo-manager';
import type { BlockNode } from '@core/model/interfaces';
import { TextEditor } from '../engine/text-editor';
import type { BlockDefinition } from '../blocks/block-definition';
import type { RenderContext } from '../engine/render-context';

const STYLE_ID = 'idea-editor-styles';

function removeGlobalEditorStyles(): void {
  document.getElementById(STYLE_ID)?.remove();
}

class PluginBlock implements BlockDefinition {
  readonly type = 'plugin_demo';
  readonly labelKey = 'plugin.demo.customLabel';
  readonly icon = 'label';

  defaultData() {
    return {};
  }
  render(node: BlockNode, _ctx: RenderContext): HTMLElement {
    const el = document.createElement('p');
    el.setAttribute('data-block-id', node.id);
    return el;
  }
  serialize(node: BlockNode) {
    return node;
  }
  deserialize(raw: unknown) {
    return raw as BlockNode;
  }
}

describe('TextEditor i18n and styles (options)', () => {
  beforeEach(() => {
    removeGlobalEditorStyles();
  });

  test('i18nOverrides resolve custom block labelKey on context', () => {
    const editor = new TextEditor();
    document.body.appendChild(editor);
    const bus = new EventBus();
    const undo = new UndoRedoManager(bus);
    const doc = createDocument();
    doc.children = [createParagraph('x')];

    editor.init(doc, bus, undo, {
      includeDefaultBlocks: true,
      blocks: [new PluginBlock()],
      i18nOverrides: { 'plugin.demo.customLabel': 'Plugin label' },
    });

    expect(editor.getContext().i18n.t('plugin.demo.customLabel')).toBe('Plugin label');
    expect(editor.getContext().i18n.t('slash.noResults')).toBeTruthy();
    expect(editor.getContext().blockRegistry.get('plugin_demo').labelKey).toBe('plugin.demo.customLabel');

    editor.remove();
  });

  test('includeDefaultStyles: false does not create #idea-editor-styles on first init', () => {
    const editor = new TextEditor();
    document.body.appendChild(editor);
    const bus = new EventBus();
    const undo = new UndoRedoManager(bus);
    const doc = createDocument();
    doc.children = [createParagraph('x')];

    editor.init(doc, bus, undo, { includeDefaultStyles: false });
    expect(document.getElementById(STYLE_ID)).toBeNull();

    editor.remove();
  });

  test('default options inject bundled styles into head once', () => {
    const editor = new TextEditor();
    document.body.appendChild(editor);
    const bus = new EventBus();
    const undo = new UndoRedoManager(bus);
    const doc = createDocument();
    doc.children = [createParagraph('x')];

    editor.init(doc, bus, undo);
    const el = document.getElementById(STYLE_ID);
    expect(el).toBeTruthy();
    expect((el as HTMLStyleElement).textContent?.length).toBeGreaterThan(10);

    editor.remove();
  });

  test('extraStyleText is applied as a style child on the host', () => {
    const editor = new TextEditor();
    document.body.appendChild(editor);
    const bus = new EventBus();
    const undo = new UndoRedoManager(bus);
    const doc = createDocument();
    doc.children = [createParagraph('x')];

    const marker = '/* test-extra */';
    editor.init(doc, bus, undo, { extraStyleText: marker });
    const extra = editor.querySelector('style.idea-editor-extra-style');
    expect(extra?.textContent).toBe(marker);

    editor.remove();
  });
});

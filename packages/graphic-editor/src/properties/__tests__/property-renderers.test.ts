import { createTextRenderer } from '../property-renderers/text-property';
import { createFontSizeRenderer } from '../property-renderers/font-size-property';
import { createPivotsRenderer } from '../property-renderers/pivots-property';
import { createHtmlTemplateRenderer } from '../property-renderers/html-template-property';
import { createCustomRenderer } from '../property-renderers/custom-property';
import { EventBus } from '@core/events/event-bus';
import { UndoRedoManager } from '@core/history/undo-redo-manager';
import { I18nService } from '@core/i18n/i18n';
import { GraphicBlockRegistry } from '../../blocks/block-registry';
import { createDocument, createGraphicPage } from '@core/model/factory';
import type { GraphicElement } from '@core/model/interfaces';
import type { RendererContext } from '../property-renderers/types';
import type { GraphicContext } from '../../engine/graphic-context';

function makeEl(type: string, data: Record<string, unknown> = {}): GraphicElement {
  return { id: 'el-1', type, data };
}

function makeRendererCtx(node?: GraphicElement): RendererContext {
  const bus = new EventBus();
  const undoRedo = new UndoRedoManager(bus);
  const doc = createDocument();
  const page = createGraphicPage('Page 1');
  doc.graphicPages.push(page);
  const i18n = new I18nService('en');
  const registry = new GraphicBlockRegistry();

  const el = node ?? makeEl('rectangle', { text: 'hello', fontSize: 14 });
  page.elements.push(el);

  const ctx: GraphicContext = {
    document: doc,
    page,
    undoRedoManager: undoRedo,
    eventBus: bus,
    rootElement: document.createElement('div'),
    i18n,
    viewportController: {} as never,
    registry,
  };

  return { node: el, ctx };
}

describe('text-property renderer', () => {
  it('renders an input with the current text value', () => {
    const node = makeEl('rectangle', { text: 'current text' });
    const rendCtx = makeRendererCtx(node);

    const i18n = new I18nService('en');
    const result = createTextRenderer(
      { kind: 'text', path: 'data.text' },
      rendCtx,
      i18n,
    );

    const input = result.element.querySelector('input');
    expect(input).not.toBeNull();
    expect(input?.value).toBe('current text');
  });

  it('isActive returns false initially and true when focused', () => {
    const node = makeEl('rectangle', { text: '' });
    const rendCtx = makeRendererCtx(node);

    const i18n = new I18nService('en');
    const result = createTextRenderer({ kind: 'text', path: 'data.text' }, rendCtx, i18n);

    expect(result.isActive?.()).toBe(false);

    const input = result.element.querySelector('input') as HTMLInputElement;
    input.dispatchEvent(new Event('focus'));
    expect(result.isActive?.()).toBe(true);

    input.dispatchEvent(new Event('blur'));
    expect(result.isActive?.()).toBe(false);
  });

  it('setValue does NOT update input while active', () => {
    const node = makeEl('rectangle', { text: 'initial' });
    const rendCtx = makeRendererCtx(node);

    const i18n = new I18nService('en');
    const result = createTextRenderer({ kind: 'text', path: 'data.text' }, rendCtx, i18n);

    const input = result.element.querySelector('input') as HTMLInputElement;
    input.dispatchEvent(new Event('focus'));

    const updatedNode: GraphicElement = { ...node, data: { text: 'external update' } };
    result.setValue?.(updatedNode);

    expect(input.value).toBe('initial'); // unchanged because active
  });

  it('setValue updates input when not active', () => {
    const node = makeEl('rectangle', { text: 'initial' });
    const rendCtx = makeRendererCtx(node);

    const i18n = new I18nService('en');
    const result = createTextRenderer({ kind: 'text', path: 'data.text' }, rendCtx, i18n);

    const updatedNode: GraphicElement = { ...node, data: { text: 'external update' } };
    result.setValue?.(updatedNode);

    const input = result.element.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('external update');
  });
});

describe('font-size renderer', () => {
  it('renders a combobox container', () => {
    const node = makeEl('rectangle', { fontSize: 14 });
    const rendCtx = makeRendererCtx(node);

    const result = createFontSizeRenderer(
      { kind: 'fontSize', path: 'data.fontSize', min: 8, max: 72, unit: 'pt' },
      rendCtx,
    );

    expect(result.element).toBeDefined();
    expect(result.element.classList.contains('idea-prop-panel')).toBe(true);
  });
});

describe('pivots renderer', () => {
  it('renders the panel element', () => {
    const rendCtx = makeRendererCtx();
    const result = createPivotsRenderer({ kind: 'pivots' }, rendCtx);
    expect(result.element).toBeDefined();
    expect(result.isActive).toBeUndefined(); // read-only, no active state
  });
});

describe('htmlTemplate renderer', () => {
  it('wraps the supplied element', () => {
    const customEl = document.createElement('div');
    customEl.textContent = 'template content';
    const result = createHtmlTemplateRenderer({
      kind: 'htmlTemplate',
      element: customEl,
      titleKey: 'my.template',
    });

    expect(result.element.contains(customEl)).toBe(true);
  });
});

describe('custom renderer', () => {
  it('wraps the supplied element', () => {
    const customEl = document.createElement('span');
    customEl.textContent = 'custom';
    const result = createCustomRenderer({
      kind: 'custom',
      element: customEl,
      titleKey: 'my.custom',
    });

    expect(result.element.contains(customEl)).toBe(true);
  });
});

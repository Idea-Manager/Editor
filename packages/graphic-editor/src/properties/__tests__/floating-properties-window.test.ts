import { FloatingPropertiesWindow } from '../floating-properties-window';
import { GraphicBlockRegistry } from '../../blocks/block-registry';
import type { GraphicBlockDefinition } from '../../blocks/block-definition';
import type { GraphicBlockProperty } from '../../blocks/properties';
import { createDocument, createGraphicPage } from '@core/model/factory';
import { EventBus } from '@core/events/event-bus';
import { UndoRedoManager } from '@core/history/undo-redo-manager';
import { I18nService } from '@core/i18n/i18n';
import type { GraphicElement } from '@core/model/interfaces';
import type { GraphicContext } from '../../engine/graphic-context';
import { StyleMemoryService } from '../../preferences/style-memory-service';

function makeEl(type = 'rectangle', data: Record<string, unknown> = {}): GraphicElement {
  return { id: `el-${Math.random().toString(36).slice(2, 7)}`, type, data };
}

function makeCtx(
  els: GraphicElement[] = [],
): {
  ctx: GraphicContext;
  bus: EventBus;
  undoRedo: UndoRedoManager;
  registry: GraphicBlockRegistry;
  styleMemory: StyleMemoryService;
} {
  const bus = new EventBus();
  const undoRedo = new UndoRedoManager(bus);
  const doc = createDocument();
  const page = createGraphicPage('Page 1');
  page.elements.push(...els);
  doc.graphicPages.push(page);
  const i18n = new I18nService('en');
  const registry = new GraphicBlockRegistry();
  const styleMemory = new StyleMemoryService(doc, undoRedo);

  const ctx: GraphicContext = {
    document: doc,
    page,
    undoRedoManager: undoRedo,
    eventBus: bus,
    rootElement: document.createElement('div'),
    i18n,
    viewportController: {} as never,
    registry,
    styleMemory,
  };

  return { ctx, bus, undoRedo, registry, styleMemory };
}

function registerBlock(
  registry: GraphicBlockRegistry,
  type: string,
  properties?: (node: GraphicElement) => GraphicBlockProperty[],
) {
  const def: GraphicBlockDefinition = {
    type,
    labelKey: `graphic.block.${type}`,
    icon: 'square',
    defaultData: () => ({ text: '', background: '#fff' }),
    renderSvg: () => document.createElementNS('http://www.w3.org/2000/svg', 'rect'),
    getBounds: () => ({ x: 0, y: 0, width: 100, height: 100 }),
    properties,
  };
  registry.register(def);
}

describe('FloatingPropertiesWindow', () => {
  let host: HTMLElement;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
  });

  afterEach(() => {
    host.remove();
  });

  it('open() mounts the floating window to the host', () => {
    const el = makeEl('rectangle');
    const { ctx, registry } = makeCtx([el]);
    registerBlock(registry, 'rectangle');

    const fpw = new FloatingPropertiesWindow(host, {
      i18n: ctx.i18n,
      ctx,
      hostSelector: '.idea-graphic-editor',
    });

    fpw.open(el);

    expect(host.querySelector('.idea-graphic-floating-window')).not.toBeNull();
    fpw.destroy();
  });

  it('close() removes the floating window', () => {
    const el = makeEl('rectangle');
    const { ctx, registry } = makeCtx([el]);
    registerBlock(registry, 'rectangle');

    const fpw = new FloatingPropertiesWindow(host, {
      i18n: ctx.i18n,
      ctx,
      hostSelector: '.idea-graphic-editor',
    });

    fpw.open(el);
    fpw.close();

    expect(host.querySelector('.idea-graphic-floating-window')).toBeNull();
  });

  it('calls onClose when the floating window close button is clicked', () => {
    const el = makeEl('rectangle');
    const { ctx, registry } = makeCtx([el]);
    registerBlock(registry, 'rectangle');
    const onClose = jest.fn();

    const fpw = new FloatingPropertiesWindow(host, {
      i18n: ctx.i18n,
      ctx,
      hostSelector: '.idea-graphic-editor',
      onClose,
    });

    fpw.open(el);

    const closeBtn = host.querySelector<HTMLButtonElement>('.idea-graphic-floating-window__close');
    closeBtn?.click();

    expect(onClose).toHaveBeenCalledTimes(1);
    fpw.destroy();
  });

  it('renders htmlTemplate properties BEFORE other properties', () => {
    const el = makeEl('rectangle');
    const tplEl = document.createElement('div');
    tplEl.textContent = 'template content';

    const { ctx, registry } = makeCtx([el]);
    registerBlock(registry, 'rectangle', () => [
      { kind: 'background', colorPath: 'data.background' },
      { kind: 'htmlTemplate', element: tplEl, titleKey: 'my.template' },
    ]);

    const fpw = new FloatingPropertiesWindow(host, {
      i18n: ctx.i18n,
      ctx,
      hostSelector: '.idea-graphic-editor',
    });

    fpw.open(el);

    const accordionSections = host.querySelectorAll('.idea-accordion__section');
    // htmlTemplate should be the first section
    const firstContent = accordionSections[0]?.querySelector('.idea-prop-panel__template-host');
    expect(firstContent).not.toBeNull();
    fpw.destroy();
  });

  it('setNode updates text input value when not active', () => {
    const el = makeEl('sticker', { text: 'initial' });
    const { ctx, registry, bus } = makeCtx([el]);
    registerBlock(registry, 'sticker', (node) => [
      { kind: 'text', path: 'data.text' },
    ]);

    const fpw = new FloatingPropertiesWindow(host, {
      i18n: ctx.i18n,
      ctx,
      hostSelector: '.idea-graphic-editor',
    });
    fpw.open(el);

    // Simulate external update
    el.data = { text: 'updated externally' };
    ctx.page.elements[0] = el;
    bus.emit('element:update');

    const input = host.querySelector<HTMLInputElement>('input[type="text"]');
    expect(input?.value).toBe('updated externally');
    fpw.destroy();
  });

  it('text two-way sync: property window input fires UpdateElementCommand', () => {
    const el = makeEl('sticker', { text: 'hello' });
    const { ctx, registry, undoRedo } = makeCtx([el]);
    registerBlock(registry, 'sticker', () => [
      { kind: 'text', path: 'data.text' },
    ]);

    const fpw = new FloatingPropertiesWindow(host, {
      i18n: ctx.i18n,
      ctx,
      hostSelector: '.idea-graphic-editor',
    });
    fpw.open(el);

    const input = host.querySelector<HTMLInputElement>('input[type="text"]');
    expect(input).not.toBeNull();

    input!.value = 'world';
    input!.dispatchEvent(new Event('input'));

    // A command should have been pushed (undoRedo stack grows)
    expect(undoRedo.undoStackSize).toBeGreaterThan(0);
    fpw.destroy();
  });
});

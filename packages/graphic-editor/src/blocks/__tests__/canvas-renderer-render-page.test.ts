import { CanvasRenderer } from '../../engine/canvas-renderer';
import { GraphicBlockRegistry } from '../block-registry';
import { registerDefaultBlocks } from '../index';
import type { GraphicContext } from '../../engine/graphic-context';
import type { GraphicPageNode } from '@core/model/interfaces';
import { EventBus } from '@core/events/event-bus';
function makeRegistry(): GraphicBlockRegistry {
  const registry = new GraphicBlockRegistry();
  registerDefaultBlocks(registry);
  return registry;
}

function makeCtx(registry: GraphicBlockRegistry, page: GraphicPageNode): GraphicContext {
  const rootElement = document.createElement('div');
  rootElement.dataset.instanceId = 'test-inst';
  return {
    document: { graphicPages: [page] } as never,
    page,
    undoRedoManager: { push: jest.fn() } as never,
    eventBus: new EventBus(),
    rootElement,
    i18n: { t: (k: string) => k } as never,
    viewportController: {} as never,
    registry,
  };
}

function makePage(elements: GraphicPageNode['elements'] = []): GraphicPageNode {
  return {
    id: 'page-1',
    name: 'Test page',
    elements,
    frames: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('CanvasRenderer.renderPage', () => {
  it('populates worldGroup with one SVG node per element', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const renderer = new CanvasRenderer();
    const { worldGroup } = renderer.build(container, 'test-inst');

    const page = makePage([
      { id: 'e1', type: 'rectangle', data: { x: 10, y: 10, width: 160, height: 100, border: { thickness: 1, color: '#000' }, background: '#fff', text: '', textColor: '#111', fontSize: 14 } },
      { id: 'e2', type: 'rectangle', data: { x: 200, y: 10, width: 160, height: 100, border: { thickness: 1, color: '#000' }, background: '#fff', text: '', textColor: '#111', fontSize: 14 } },
      { id: 'e3', type: 'sticker', data: { x: 50, y: 200, width: 180, height: 140, border: { thickness: 0, color: '#000' }, background: '#fff8b3', text: '', textColor: '#111', fontSize: 14 } },
    ]);

    const registry = makeRegistry();
    const ctx = makeCtx(registry, page);
    renderer.renderPage(page, ctx);

    // worldGroup should have 3 <g> children (one per element)
    expect(worldGroup.children).toHaveLength(3);
  });

  it('sets data-element-id on each rendered SVG node', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const renderer = new CanvasRenderer();
    const { worldGroup } = renderer.build(container, 'test-inst');

    const page = makePage([
      { id: 'my-rect', type: 'rectangle', data: { x: 0, y: 0, width: 160, height: 100, border: { thickness: 1, color: '#000' }, background: '#fff', text: '', textColor: '#111', fontSize: 14 } },
    ]);

    const registry = makeRegistry();
    const ctx = makeCtx(registry, page);
    renderer.renderPage(page, ctx);

    expect(worldGroup.children[0].getAttribute('data-element-id')).toBe('my-rect');
  });

  it('populates the overlay with one text node per element', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const renderer = new CanvasRenderer();
    const { overlay } = renderer.build(container, 'test-inst');

    const page = makePage([
      { id: 'e1', type: 'rectangle', data: { x: 10, y: 10, width: 160, height: 100, border: { thickness: 1, color: '#000' }, background: '#fff', text: '', textColor: '#111', fontSize: 14 } },
      { id: 'e2', type: 'rectangle', data: { x: 200, y: 10, width: 160, height: 100, border: { thickness: 1, color: '#000' }, background: '#fff', text: '', textColor: '#111', fontSize: 14 } },
      { id: 'e3', type: 'sticker', data: { x: 50, y: 200, width: 180, height: 140, border: { thickness: 0, color: '#000' }, background: '#fff8b3', text: '', textColor: '#111', fontSize: 14 } },
    ]);

    const registry = makeRegistry();
    const ctx = makeCtx(registry, page);
    renderer.renderPage(page, ctx);

    expect(overlay.children).toHaveLength(3);
  });

  it('positions overlay nodes in world-space coordinates at zoom 1', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const renderer = new CanvasRenderer();
    const { overlay } = renderer.build(container, 'test-inst');

    const page = makePage([
      { id: 'e1', type: 'rectangle', data: { x: 42, y: 77, width: 160, height: 100, border: { thickness: 1, color: '#000' }, background: '#fff', text: '', textColor: '#111', fontSize: 14 } },
    ]);

    const registry = makeRegistry();
    const ctx = makeCtx(registry, page);
    renderer.renderPage(page, ctx);

    const overlayChild = overlay.children[0] as HTMLElement;
    expect(overlayChild.style.left).toBe('42px');
    expect(overlayChild.style.top).toBe('77px');
    expect(overlayChild.style.width).toBe('160px');
    expect(overlayChild.style.height).toBe('100px');
  });

  it('is idempotent — calling renderPage twice does not duplicate nodes', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const renderer = new CanvasRenderer();
    const { worldGroup, overlay } = renderer.build(container, 'test-inst');

    const page = makePage([
      { id: 'e1', type: 'rectangle', data: { x: 0, y: 0, width: 160, height: 100, border: { thickness: 1, color: '#000' }, background: '#fff', text: '', textColor: '#111', fontSize: 14 } },
    ]);

    const registry = makeRegistry();
    const ctx = makeCtx(registry, page);
    renderer.renderPage(page, ctx);
    renderer.renderPage(page, ctx);

    expect(worldGroup.children).toHaveLength(1);
    expect(overlay.children).toHaveLength(1);
  });

  it('restores shape text overlay after rebuild when it had DOM focus', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const renderer = new CanvasRenderer();
    const { overlay } = renderer.build(container, 'test-inst');

    const page = makePage([
      { id: 'e1', type: 'rectangle', data: { x: 0, y: 0, width: 160, height: 100, border: { thickness: 1, color: '#000' }, background: '#fff', text: 'hi', textColor: '#111', fontSize: 14 } },
    ]);

    const registry = makeRegistry();
    const ctx = makeCtx(registry, page);
    renderer.renderPage(page, ctx);

    const textEl = overlay.querySelector('.idea-graphic-shape__text') as HTMLElement;
    expect(textEl).not.toBeNull();

    const spy = jest.spyOn(document, 'activeElement', 'get').mockReturnValue(textEl);
    try {
      renderer.renderPage(page, ctx);
    } finally {
      spy.mockRestore();
    }

    const textEl2 = overlay.querySelector('.idea-graphic-shape__text') as HTMLElement;
    expect(textEl2).not.toBeNull();
    expect(textEl2).not.toBe(textEl);
    expect(textEl2.textContent).toBe('hi');
  });
});

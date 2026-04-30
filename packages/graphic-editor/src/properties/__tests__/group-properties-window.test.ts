import { GroupPropertiesWindow } from '../group-properties-window';
import { EventBus } from '@core/events/event-bus';
import { UndoRedoManager } from '@core/history/undo-redo-manager';
import { createDocument, createGraphicPage } from '@core/model/factory';
import { generateId } from '@core/id';
import { ViewportController } from '../../engine/viewport-controller';
import { GraphicBlockRegistry } from '../../blocks/block-registry';
import type { GraphicContext } from '../../engine/graphic-context';
import type { GraphicElement } from '@core/model/interfaces';
import type { I18nService } from '@core/i18n/i18n';
import type { SelectionEntry } from '../../engine/selection-manager';

function makeEl(type = 'rectangle', meta: GraphicElement['meta'] = undefined): GraphicElement {
  return { id: generateId('el'), type, data: { x: 0, y: 0, width: 100, height: 100 }, meta };
}

function makeCtx(elements: GraphicElement[] = []): GraphicContext {
  const eventBus = new EventBus();
  const undoRedoManager = new UndoRedoManager(eventBus);
  const doc = createDocument();
  const page = createGraphicPage('Test');
  page.elements.push(...elements);
  doc.graphicPages.push(page);
  const vp = new ViewportController(() => page.viewport, (next) => { page.viewport = next; });
  return {
    document: doc,
    page,
    undoRedoManager,
    eventBus,
    rootElement: document.createElement('div'),
    i18n: { t: (k: string, vars?: Record<string, unknown>) => {
      if (!vars) return k;
      return k.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ''));
    } } as unknown as I18nService,
    viewportController: vp,
    registry: new GraphicBlockRegistry(),
  };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('GroupPropertiesWindow', () => {
  it('renders the lock and group rows', () => {
    const el1 = makeEl();
    const el2 = makeEl();
    const ctx = makeCtx([el1, el2]);
    const host = document.createElement('div');
    document.body.appendChild(host);

    const entries: SelectionEntry[] = [
      { type: 'element', id: el1.id },
      { type: 'element', id: el2.id },
    ];

    new GroupPropertiesWindow(host, {
      i18n: ctx.i18n,
      ctx,
      hostSelector: 'body',
      selection: entries,
    });

    const checkboxes = host.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes.length).toBeGreaterThanOrEqual(2);
  });

  it('renders the create block name input and disabled button', () => {
    const el1 = makeEl();
    const el2 = makeEl();
    const ctx = makeCtx([el1, el2]);
    const host = document.createElement('div');
    document.body.appendChild(host);

    const entries: SelectionEntry[] = [
      { type: 'element', id: el1.id },
      { type: 'element', id: el2.id },
    ];

    new GroupPropertiesWindow(host, {
      i18n: ctx.i18n,
      ctx,
      hostSelector: 'body',
      selection: entries,
    });

    // Name input should exist
    const nameInput = host.querySelector<HTMLInputElement>('.idea-group-props__name-input');
    expect(nameInput).toBeTruthy();

    // Create button should be disabled initially
    const createBtn = host.querySelector<HTMLButtonElement>('.idea-group-props__create-btn');
    expect(createBtn).toBeTruthy();
    expect(createBtn!.disabled).toBe(true);
  });

  it('enables the create button when name input is non-empty', () => {
    const el1 = makeEl();
    const el2 = makeEl();
    const ctx = makeCtx([el1, el2]);
    const host = document.createElement('div');
    document.body.appendChild(host);

    const entries: SelectionEntry[] = [
      { type: 'element', id: el1.id },
      { type: 'element', id: el2.id },
    ];

    new GroupPropertiesWindow(host, {
      i18n: ctx.i18n,
      ctx,
      hostSelector: 'body',
      selection: entries,
    });

    const nameInput = host.querySelector<HTMLInputElement>('.idea-group-props__name-input')!;
    const createBtn = host.querySelector<HTMLButtonElement>('.idea-group-props__create-btn')!;

    nameInput.value = 'My Block';
    nameInput.dispatchEvent(new Event('input'));

    expect(createBtn.disabled).toBe(false);
  });

  it('shows lock checkbox as checked when all elements are locked', () => {
    const el1 = makeEl('rectangle', { locked: true });
    const el2 = makeEl('rectangle', { locked: true });
    const ctx = makeCtx([el1, el2]);
    const host = document.createElement('div');
    document.body.appendChild(host);

    const entries: SelectionEntry[] = [
      { type: 'element', id: el1.id },
      { type: 'element', id: el2.id },
    ];

    new GroupPropertiesWindow(host, {
      i18n: ctx.i18n,
      ctx,
      hostSelector: 'body',
      selection: entries,
    });

    const lockCheckbox = host.querySelector<HTMLInputElement>('.idea-group-props__checkbox');
    expect(lockCheckbox!.checked).toBe(true);
    expect(lockCheckbox!.indeterminate).toBe(false);
  });

  it('shows lock checkbox as indeterminate for mixed lock state', () => {
    const el1 = makeEl('rectangle', { locked: true });
    const el2 = makeEl('rectangle', { locked: false });
    const ctx = makeCtx([el1, el2]);
    const host = document.createElement('div');
    document.body.appendChild(host);

    const entries: SelectionEntry[] = [
      { type: 'element', id: el1.id },
      { type: 'element', id: el2.id },
    ];

    new GroupPropertiesWindow(host, {
      i18n: ctx.i18n,
      ctx,
      hostSelector: 'body',
      selection: entries,
    });

    const lockCheckbox = host.querySelector<HTMLInputElement>('.idea-group-props__checkbox');
    expect(lockCheckbox!.indeterminate).toBe(true);
  });

  it('destroy() unmounts the window', () => {
    const el1 = makeEl();
    const el2 = makeEl();
    const ctx = makeCtx([el1, el2]);
    const host = document.createElement('div');
    document.body.appendChild(host);

    const entries: SelectionEntry[] = [
      { type: 'element', id: el1.id },
      { type: 'element', id: el2.id },
    ];

    const win = new GroupPropertiesWindow(host, {
      i18n: ctx.i18n,
      ctx,
      hostSelector: 'body',
      selection: entries,
    });

    win.destroy();

    // After destroy, the floating window element should be removed
    const floatingWindows = host.querySelectorAll('.idea-graphic-floating-window');
    expect(floatingWindows.length).toBe(0);
  });
});

/**
 * End-to-end smoke test for the graphic editor.
 *
 * Mounts a real GraphicEditor custom element in jsdom, exercises the most
 * important flows, and asserts document state + DOM state.
 */
import { GraphicEditor } from '../engine/graphic-editor';
import { EventBus } from '@core/events/event-bus';
import { UndoRedoManager } from '@core/history/undo-redo-manager';
import { createDocument } from '@core/model/factory';
import { UpdateElementCommand } from '../engine/commands/update-element-command';
import type { GraphicSelectionManager } from '../engine/selection-manager';

if (!customElements.get('idea-graphic-editor')) {
  customElements.define('idea-graphic-editor', GraphicEditor);
}

/** Access private field via cast — avoids touching production internals. */
function priv<T>(obj: object, key: string): T {
  return (obj as unknown as Record<string, unknown>)[key] as T;
}

function makeEnv() {
  const doc = createDocument();
  const eventBus = new EventBus();
  const undoRedoManager = new UndoRedoManager(eventBus);

  const editor = document.createElement('idea-graphic-editor') as GraphicEditor;
  document.body.appendChild(editor);
  editor.init(doc, eventBus, undoRedoManager);

  const canvas = editor.querySelector<HTMLDivElement>('.idea-graphic-canvas')!;
  canvas.getBoundingClientRect = () => ({
    left: 0, top: 0, right: 800, bottom: 600,
    width: 800, height: 600, x: 0, y: 0, toJSON: () => ({}),
  });

  const ctx = editor.getContext();
  return { doc, eventBus, undoRedoManager, editor, canvas, ctx };
}

afterEach(() => {
  document.body.innerHTML = '';
});

// ── 1. Element placement via ghost flow ───────────────────────────────────────

describe('Placement flow', () => {
  it('places a rectangle element on pointerdown after beginPlacement', () => {
    const { ctx, canvas } = makeEnv();
    const page = ctx.page;

    expect(page.elements).toHaveLength(0);

    ctx.toolState!.beginPlacement('rectangle');

    canvas.dispatchEvent(new PointerEvent('pointerdown', {
      button: 0, clientX: 200, clientY: 150, bubbles: true,
    }));

    expect(page.elements).toHaveLength(1);
    expect(page.elements[0].type).toBe('rectangle');
    // World coords at zoom=1, offset=(0,0): clientX/Y maps directly to world X/Y
    expect(page.elements[0].data.x).toBeCloseTo(200);
    expect(page.elements[0].data.y).toBeCloseTo(150);
  });

  it('placement is undoable', () => {
    const { ctx, canvas, undoRedoManager } = makeEnv();
    const page = ctx.page;

    ctx.toolState!.beginPlacement('rectangle');
    canvas.dispatchEvent(new PointerEvent('pointerdown', {
      button: 0, clientX: 100, clientY: 100, bubbles: true,
    }));

    expect(page.elements).toHaveLength(1);

    undoRedoManager.undo();
    expect(page.elements).toHaveLength(0);
    expect(undoRedoManager.canUndo).toBe(false);
  });
});

// ── 2. UpdateElementCommand ───────────────────────────────────────────────────

describe('UpdateElementCommand', () => {
  it('updates data.border.thickness and is reflected in the element', () => {
    const { ctx, canvas, undoRedoManager } = makeEnv();
    const page = ctx.page;

    ctx.toolState!.beginPlacement('rectangle');
    canvas.dispatchEvent(new PointerEvent('pointerdown', {
      button: 0, clientX: 100, clientY: 100, bubbles: true,
    }));

    const el = page.elements[0];
    expect(el).toBeTruthy();

    const cmd = new UpdateElementCommand({
      doc: ctx.document,
      pageId: page.id,
      elementId: el.id,
      path: 'data.border.thickness',
      value: 4,
    });
    undoRedoManager.push(cmd);

    const updated = page.elements.find(e => e.id === el.id)!;
    expect((updated.data.border as Record<string, unknown>).thickness).toBe(4);
  });
});

// ── 3. FloatingPropertiesWindow opens on selection:change ─────────────────────

describe('FloatingPropertiesWindow', () => {
  it('is mounted after placing an element (selection triggers the window)', () => {
    const { editor, ctx, canvas } = makeEnv();

    ctx.toolState!.beginPlacement('rectangle');
    canvas.dispatchEvent(new PointerEvent('pointerdown', {
      button: 0, clientX: 200, clientY: 200, bubbles: true,
    }));

    // selection:change → GroupController → FloatingPropertiesWindow.open()
    expect(editor.querySelector('.idea-graphic-floating-window')).not.toBeNull();
  });

  it('is removed when selection is cleared', () => {
    const { editor, ctx, canvas } = makeEnv();

    ctx.toolState!.beginPlacement('rectangle');
    canvas.dispatchEvent(new PointerEvent('pointerdown', {
      button: 0, clientX: 200, clientY: 200, bubbles: true,
    }));
    expect(editor.querySelector('.idea-graphic-floating-window')).not.toBeNull();

    const selMgr = priv<GraphicSelectionManager>(editor, 'selectionManager');
    selMgr.clear();

    expect(editor.querySelector('.idea-graphic-floating-window')).toBeNull();
  });
});

// ── 4. Undo x2 returns document to empty ─────────────────────────────────────

describe('Undo / redo', () => {
  it('two undos after place+update returns to empty', () => {
    const { ctx, canvas, undoRedoManager } = makeEnv();
    const page = ctx.page;

    ctx.toolState!.beginPlacement('rectangle');
    canvas.dispatchEvent(new PointerEvent('pointerdown', {
      button: 0, clientX: 100, clientY: 100, bubbles: true,
    }));

    const el = page.elements[0];
    const cmd = new UpdateElementCommand({
      doc: ctx.document,
      pageId: page.id,
      elementId: el.id,
      path: 'data.border.thickness',
      value: 4,
    });
    undoRedoManager.push(cmd);
    expect(page.elements).toHaveLength(1);

    undoRedoManager.undo(); // undo UpdateElementCommand
    expect((page.elements[0].data.border as Record<string, unknown> | undefined)?.thickness).not.toBe(4);

    undoRedoManager.undo(); // undo AddElementCommand
    expect(page.elements).toHaveLength(0);
  });
});

// ── 5. Detach / re-attach preserves document state ───────────────────────────

describe('Re-attach', () => {
  it('element count and document are preserved when editor is re-attached to the DOM', () => {
    const { doc, eventBus, undoRedoManager, editor, canvas, ctx } = makeEnv();
    const page = ctx.page;

    ctx.toolState!.beginPlacement('rectangle');
    canvas.dispatchEvent(new PointerEvent('pointerdown', {
      button: 0, clientX: 100, clientY: 100, bubbles: true,
    }));
    expect(page.elements).toHaveLength(1);

    // Detach (simulates switching away from graphic mode)
    editor.remove();

    // The document is the source of truth — elements survive in memory
    expect(page.elements).toHaveLength(1);

    // Re-attach with the same document
    document.body.appendChild(editor);
    editor.init(doc, eventBus, undoRedoManager);

    expect(editor.getContext().page.elements).toHaveLength(1);
    expect(editor.getContext().page.elements[0].type).toBe('rectangle');
  });
});

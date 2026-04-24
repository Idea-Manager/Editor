/**
 * Copy into your app and adjust paths. This file is a documentation snippet; it is not part of the webpack build.
 */
import type { BlockNode } from '@core/model/interfaces';
import type { BlockDefinition } from '@text-editor';
import type { RenderContext } from '@text-editor';
import { TextEditor } from '@text-editor';
// import { EventBus } from '@core/events/event-bus';
// import { UndoRedoManager } from '@core/history/undo-redo-manager';
// import { createDocument, createTextRun } from '@core/model/factory';

/** Example data for a “callout” block. */
interface CalloutData {
  tone: 'info' | 'warn';
}

class MyCalloutBlock implements BlockDefinition<CalloutData> {
  readonly type = 'callout';
  readonly labelKey = 'plugin.callout.label';
  readonly icon = 'campaign';

  defaultData(): CalloutData {
    return { tone: 'info' };
  }

  render(node: BlockNode<CalloutData>, _ctx: RenderContext): HTMLElement {
    const el = document.createElement('aside');
    el.setAttribute('data-block-id', node.id);
    el.classList.add('idea-block', 'idea-block--callout');
    el.textContent = node.children.map(r => r.data.text).join('');
    return el;
  }

  serialize(node: BlockNode<CalloutData>): BlockNode<CalloutData> {
    return {
      ...node,
      data: { ...node.data },
      children: node.children.map(run => ({
        ...run,
        data: { ...run.data, marks: [...run.data.marks] },
      })),
    };
  }

  deserialize(raw: unknown): BlockNode<CalloutData> {
    return raw as BlockNode<CalloutData>;
  }
}

// --- Host wiring (pseudocode; wire EventBus, UndoRedoManager, and document in your app) ---
// const editor = document.createElement('idea-text-editor') as TextEditor;
// document.body.appendChild(editor);
// const doc = createDocument();
// doc.children = […];
// const bus = new EventBus();
// const history = new UndoRedoManager(bus);
// editor.init(doc, bus, history, {
//   includeDefaultBlocks: true,
//   blocks: [new MyCalloutBlock()],
//   i18nOverrides: { 'plugin.callout.label': 'Callout' },
// });
export { MyCalloutBlock };

import type { BlockNode } from '@core/model/interfaces';
import { BlockRegistry } from '../blocks/block-registry';
import type { BlockDefinition } from '../blocks/block-definition';
import type { AnyBlockDefinition } from '../blocks/block-registry';
import { registerDefaultBlocks, createDefaultBlockRegistry } from '../blocks/register-default-blocks';
import type { RenderContext } from '../engine/render-context';

interface CalloutData {
  tone: 'info' | 'warn';
}

/** Mirrors {@link TextEditor.init} block registration order. */
function applyTextEditorBlockOptions(
  registry: BlockRegistry,
  options?: { blocks?: AnyBlockDefinition[]; includeDefaultBlocks?: boolean },
): void {
  if (options?.includeDefaultBlocks !== false) {
    registerDefaultBlocks(registry);
  }
  for (const def of options?.blocks ?? []) {
    registry.register(def);
  }
}

class CalloutBlock implements BlockDefinition<CalloutData> {
  readonly type = 'callout';
  readonly labelKey = 'block.callout';
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

describe('TextEditor block registration (options parity)', () => {
  it('includeDefaultBlocks: false + one custom block yields only that block in the palette', () => {
    const registry = new BlockRegistry();
    applyTextEditorBlockOptions(registry, {
      includeDefaultBlocks: false,
      blocks: [new CalloutBlock()],
    });

    expect(registry.getAll()).toHaveLength(1);
    expect(registry.has('callout')).toBe(true);

    const items = registry.getPaletteItems();
    expect(items).toHaveLength(1);
    expect(items[0].type).toBe('callout');
    expect(items[0].labelKey).toBe('block.callout');
  });

  it('default options register all built-ins then custom blocks', () => {
    const registry = new BlockRegistry();
    applyTextEditorBlockOptions(registry, {
      blocks: [new CalloutBlock()],
    });

    const types = registry.getAll().map(d => d.type).sort();
    expect(types).toContain('callout');
    expect(types).toContain('paragraph');
    expect(types).toContain('heading');
    expect(types).toContain('list_item');
    expect(types).toContain('table');
    expect(types).toContain('embed');
    expect(types).toHaveLength(6);
  });

  it('custom block registered after defaults overrides same type', () => {
    const registry = new BlockRegistry();
    applyTextEditorBlockOptions(registry, {
      blocks: [new CalloutBlock(), new CalloutBlock()],
    });
    expect(registry.getAll().filter(d => d.type === 'callout')).toHaveLength(1);
  });
});

describe('createDefaultBlockRegistry', () => {
  it('returns a registry with five built-in block types', () => {
    const registry = createDefaultBlockRegistry();
    expect(registry.getAll()).toHaveLength(5);
    expect(registry.has('paragraph')).toBe(true);
    expect(registry.has('embed')).toBe(true);
  });
});

import { EventBus } from '@core/events/event-bus';
import { I18nService } from '@core/i18n/i18n';
import { createParagraph, createHeading, createTextRun, createDocument } from '@core/model/factory';
import { BlockRegistry } from '../blocks/block-registry';
import { ParagraphBlock } from '../blocks/paragraph-block';
import { HeadingBlock } from '../blocks/heading-block';
import { BlockRenderer } from '../renderer/block-renderer';
import type { RenderContext } from '../engine/render-context';

describe('BlockRegistry', () => {
  let registry: BlockRegistry;

  beforeEach(() => {
    registry = new BlockRegistry();
  });

  it('registers and retrieves a block definition', () => {
    const para = new ParagraphBlock();
    registry.register(para);

    expect(registry.has('paragraph')).toBe(true);
    expect(registry.get('paragraph')).toBe(para);
  });

  it('throws for unknown block type', () => {
    expect(() => registry.get('unknown')).toThrow('BlockDefinition not found');
  });

  it('getAll() returns all registered definitions', () => {
    registry.register(new ParagraphBlock());
    registry.register(new HeadingBlock());

    const all = registry.getAll();
    expect(all).toHaveLength(2);
    expect(all.map(d => d.type)).toContain('paragraph');
    expect(all.map(d => d.type)).toContain('heading');
  });
});

describe('ParagraphBlock', () => {
  const para = new ParagraphBlock();
  const eventBus = new EventBus();
  const ctx: RenderContext = {
    document: createDocument(),
    eventBus,
    selection: null,
    i18n: new I18nService('en'),
  };

  it('renders a div with correct class and data-block-id', () => {
    const node = createParagraph('Hello world');
    const el = para.render(node, ctx);

    expect(el.tagName).toBe('DIV');
    expect(el.getAttribute('data-block-id')).toBe(node.id);
    expect(el.classList.contains('idea-block')).toBe(true);
    expect(el.classList.contains('idea-block--paragraph')).toBe(true);
    expect(el.textContent).toBe('Hello world');
  });

  it('renders with text-align from data', () => {
    const node = createParagraph('Centered', 'center');
    const el = para.render(node, ctx);
    expect(el.style.textAlign).toBe('center');
  });

  it('renders empty paragraph', () => {
    const node = createParagraph();
    const el = para.render(node, ctx);
    expect(el.textContent).toBe('');
  });

  it('serialize is pure (no side effects)', () => {
    const node = createParagraph('Test');
    const serialized = para.serialize(node);
    expect(serialized.id).toBe(node.id);
    expect(serialized.data).toEqual(node.data);
    expect(serialized).not.toBe(node);
  });

  it('deserialize reconstructs the block', () => {
    const raw = {
      id: 'blk_test',
      type: 'paragraph',
      data: { align: 'right' as const },
      children: [{
        id: 'txt_test',
        type: 'text' as const,
        data: { text: 'Hello', marks: ['bold' as const] },
      }],
    };

    const result = para.deserialize(raw);
    expect(result.id).toBe('blk_test');
    expect(result.type).toBe('paragraph');
    expect(result.data.align).toBe('right');
    expect(result.children[0].data.text).toBe('Hello');
    expect(result.children[0].data.marks).toEqual(['bold']);
  });
});

describe('HeadingBlock', () => {
  const heading = new HeadingBlock();
  const eventBus = new EventBus();
  const ctx: RenderContext = {
    document: createDocument(),
    eventBus,
    selection: null,
    i18n: new I18nService('en'),
  };

  it('renders heading with level data attribute', () => {
    const node = createHeading(2, 'Title');
    const el = heading.render(node, ctx);

    expect(el.getAttribute('data-block-id')).toBe(node.id);
    expect(el.getAttribute('data-level')).toBe('2');
    expect(el.classList.contains('idea-block--heading')).toBe(true);
    expect(el.textContent).toBe('Title');
  });

  it.each([1, 2, 3, 4, 5] as const)('renders heading level %d', (level) => {
    const node = createHeading(level, `H${level}`);
    const el = heading.render(node, ctx);
    expect(el.getAttribute('data-level')).toBe(String(level));
  });

  it('defaultData returns level 1', () => {
    expect(heading.defaultData()).toEqual({ level: 1, align: 'left' });
  });
});

describe('BlockRenderer', () => {
  let registry: BlockRegistry;
  let renderer: BlockRenderer;
  let root: HTMLDivElement;
  let eventBus: EventBus;

  beforeEach(() => {
    registry = new BlockRegistry();
    registry.register(new ParagraphBlock());
    registry.register(new HeadingBlock());
    renderer = new BlockRenderer(registry);
    root = document.createElement('div');
    eventBus = new EventBus();
  });

  function makeCtx(doc: ReturnType<typeof createDocument>): RenderContext {
    return { document: doc, eventBus, selection: null, i18n: new I18nService('en') };
  }

  it('renders initial document blocks', () => {
    const doc = createDocument();
    doc.children = [
      createParagraph('First'),
      createParagraph('Second'),
    ];
    renderer.reconcile(doc, root, makeCtx(doc));

    expect(root.children.length).toBe(2);
    expect(root.children[0].getAttribute('data-block-id')).toBe(doc.children[0].id);
    expect(root.children[1].getAttribute('data-block-id')).toBe(doc.children[1].id);
  });

  it('removes blocks no longer in document', () => {
    const doc = createDocument();
    const p1 = createParagraph('Keep');
    const p2 = createParagraph('Remove');
    doc.children = [p1, p2];
    renderer.reconcile(doc, root, makeCtx(doc));

    expect(root.children.length).toBe(2);

    doc.children = [p1];
    renderer.reconcile(doc, root, makeCtx(doc));

    expect(root.children.length).toBe(1);
    expect(root.children[0].getAttribute('data-block-id')).toBe(p1.id);
  });

  it('adds new blocks to the DOM', () => {
    const doc = createDocument();
    const p1 = createParagraph('First');
    doc.children = [p1];
    renderer.reconcile(doc, root, makeCtx(doc));

    const p2 = createParagraph('Second');
    doc.children = [p1, p2];
    renderer.reconcile(doc, root, makeCtx(doc));

    expect(root.children.length).toBe(2);
    expect(root.children[1].getAttribute('data-block-id')).toBe(p2.id);
  });

  it('handles mixed block types', () => {
    const doc = createDocument();
    doc.children = [
      createHeading(1, 'Title'),
      createParagraph('Body text'),
    ];
    renderer.reconcile(doc, root, makeCtx(doc));

    expect(root.children[0].classList.contains('idea-block--heading')).toBe(true);
    expect(root.children[1].classList.contains('idea-block--paragraph')).toBe(true);
  });
});

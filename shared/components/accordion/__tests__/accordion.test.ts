import { Accordion } from '@shared/components/accordion';
import type { AccordionItem } from '@shared/components/accordion';

function makeContent(text: string): HTMLElement {
  const el = document.createElement('p');
  el.textContent = text;
  return el;
}

function makeItems(count: number): AccordionItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `item-${i + 1}`,
    title: `Item ${i + 1}`,
    content: makeContent(`Content ${i + 1}`),
  }));
}

function getSection(accordion: Accordion, id: string): HTMLElement {
  return accordion.element.querySelector(`[data-id="${id}"]`) as HTMLElement;
}

function getHeader(accordion: Accordion, id: string): HTMLButtonElement {
  return getSection(accordion, id).querySelector('.idea-accordion__header') as HTMLButtonElement;
}

describe('Accordion', () => {
  test('renders items; first item is open when defaultOpen is true', () => {
    const items = makeItems(2);
    items[0].defaultOpen = true;

    const accordion = new Accordion({ items });
    document.body.appendChild(accordion.element);

    const section1 = getSection(accordion, 'item-1');
    const header1 = getHeader(accordion, 'item-1');
    const section2 = getSection(accordion, 'item-2');
    const header2 = getHeader(accordion, 'item-2');

    expect(section1.dataset['open']).toBe('true');
    expect(header1.getAttribute('aria-expanded')).toBe('true');
    expect(accordion.getOpen()).toEqual(['item-1']);

    expect(section2.dataset['open']).toBe('false');
    expect(header2.getAttribute('aria-expanded')).toBe('false');

    accordion.destroy();
    accordion.element.remove();
  });

  test("mode 'single' — opening another item closes the previous one", () => {
    const items = makeItems(2);
    items[0].defaultOpen = true;

    const accordion = new Accordion({ items, mode: 'single' });
    document.body.appendChild(accordion.element);

    expect(accordion.getOpen()).toEqual(['item-1']);

    accordion.open('item-2');

    expect(getSection(accordion, 'item-1').dataset['open']).toBe('false');
    expect(getHeader(accordion, 'item-1').getAttribute('aria-expanded')).toBe('false');
    expect(getSection(accordion, 'item-2').dataset['open']).toBe('true');
    expect(getHeader(accordion, 'item-2').getAttribute('aria-expanded')).toBe('true');
    expect(accordion.getOpen()).toEqual(['item-2']);

    accordion.destroy();
    accordion.element.remove();
  });

  test("mode 'multiple' — multiple items can be open simultaneously", () => {
    const items = makeItems(3);
    const accordion = new Accordion({ items, mode: 'multiple' });
    document.body.appendChild(accordion.element);

    accordion.open('item-1');
    accordion.open('item-2');
    accordion.open('item-3');

    expect(getSection(accordion, 'item-1').dataset['open']).toBe('true');
    expect(getSection(accordion, 'item-2').dataset['open']).toBe('true');
    expect(getSection(accordion, 'item-3').dataset['open']).toBe('true');
    expect(accordion.getOpen()).toEqual(['item-1', 'item-2', 'item-3']);

    accordion.destroy();
    accordion.element.remove();
  });

  test("toggle(id) flips aria-expanded and data-open", () => {
    const items = makeItems(1);
    const accordion = new Accordion({ items });
    document.body.appendChild(accordion.element);

    const section = getSection(accordion, 'item-1');
    const header = getHeader(accordion, 'item-1');

    expect(section.dataset['open']).toBe('false');
    expect(header.getAttribute('aria-expanded')).toBe('false');

    accordion.toggle('item-1');

    expect(section.dataset['open']).toBe('true');
    expect(header.getAttribute('aria-expanded')).toBe('true');

    accordion.toggle('item-1');

    expect(section.dataset['open']).toBe('false');
    expect(header.getAttribute('aria-expanded')).toBe('false');

    accordion.destroy();
    accordion.element.remove();
  });

  test("setItems preserves getOpen() for ids that still exist", () => {
    const items = makeItems(3);
    const accordion = new Accordion({ items, mode: 'multiple' });
    document.body.appendChild(accordion.element);

    accordion.open('item-1');
    accordion.open('item-2');

    expect(accordion.getOpen()).toEqual(['item-1', 'item-2']);

    // Replace with new items: item-1 stays, item-2 removed, item-4 added
    const newItems: AccordionItem[] = [
      { id: 'item-1', title: 'Item 1 updated', content: makeContent('Content 1') },
      { id: 'item-4', title: 'Item 4', content: makeContent('Content 4') },
    ];

    accordion.setItems(newItems);

    // item-1 was open and still exists → preserved
    expect(accordion.getOpen()).toEqual(['item-1']);
    expect(getSection(accordion, 'item-1').dataset['open']).toBe('true');

    // item-2 no longer exists
    expect(accordion.element.querySelector('[data-id="item-2"]')).toBeNull();

    accordion.destroy();
    accordion.element.remove();
  });

  test("onToggle fires with (id, true) on open and (id, false) on close", () => {
    const items = makeItems(1);
    const onToggle = jest.fn();
    const accordion = new Accordion({ items, onToggle });
    document.body.appendChild(accordion.element);

    accordion.open('item-1');
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenLastCalledWith('item-1', true);

    accordion.close('item-1');
    expect(onToggle).toHaveBeenCalledTimes(2);
    expect(onToggle).toHaveBeenLastCalledWith('item-1', false);

    accordion.destroy();
    accordion.element.remove();
  });

  test("destroy() — toggling after destroy does not change DOM", () => {
    const items = makeItems(1);
    const accordion = new Accordion({ items });
    document.body.appendChild(accordion.element);

    accordion.destroy();

    // After destroy, element is cleared, so we just verify toggle is a no-op
    accordion.toggle('item-1');

    // No items should remain in the element
    expect(accordion.element.querySelector('[data-id="item-1"]')).toBeNull();
    expect(accordion.getOpen()).toEqual([]);

    accordion.element.remove();
  });
});

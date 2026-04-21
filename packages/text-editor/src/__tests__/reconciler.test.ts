import { reconcileChildren } from '../engine/reconciler';

function el(tag: string, id?: string): HTMLElement {
  const node = document.createElement(tag);
  if (id) node.setAttribute('data-id', id);
  return node;
}

describe('reconcileChildren', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
  });

  it('leaves container empty when elements is empty', () => {
    container.appendChild(el('span'));
    reconcileChildren(container, []);
    expect(container.children.length).toBe(0);
  });

  it('appends when container is empty', () => {
    const a = el('div', 'a');
    const b = el('div', 'b');
    reconcileChildren(container, [a, b]);
    expect(Array.from(container.children)).toEqual([a, b]);
  });

  it('removes children not in the target list', () => {
    const a = el('div', 'a');
    const b = el('div', 'b');
    const extra = el('div', 'x');
    container.appendChild(a);
    container.appendChild(extra);
    container.appendChild(b);
    reconcileChildren(container, [a, b]);
    expect(Array.from(container.children)).toEqual([a, b]);
  });

  it('reorders using stable references', () => {
    const a = el('div', 'a');
    const b = el('div', 'b');
    const c = el('div', 'c');
    container.appendChild(a);
    container.appendChild(b);
    container.appendChild(c);
    reconcileChildren(container, [c, a, b]);
    expect(Array.from(container.children)).toEqual([c, a, b]);
    expect(container.children[0]).toBe(c);
    expect(container.children[1]).toBe(a);
    expect(container.children[2]).toBe(b);
  });

  it('is a no-op when order and references already match', () => {
    const a = el('div', 'a');
    const b = el('div', 'b');
    container.appendChild(a);
    container.appendChild(b);
    const insertBefore = jest.spyOn(container, 'insertBefore');
    const appendChild = jest.spyOn(container, 'appendChild');
    const removeChild = jest.spyOn(container, 'removeChild');
    reconcileChildren(container, [a, b]);
    expect(Array.from(container.children)).toEqual([a, b]);
    expect(insertBefore).not.toHaveBeenCalled();
    expect(appendChild).not.toHaveBeenCalled();
    expect(removeChild).not.toHaveBeenCalled();
    insertBefore.mockRestore();
    appendChild.mockRestore();
    removeChild.mockRestore();
  });

  it('second call with same array is idempotent', () => {
    const a = el('div');
    const b = el('div');
    reconcileChildren(container, [a, b]);
    reconcileChildren(container, [a, b]);
    expect(Array.from(container.children)).toEqual([a, b]);
  });

  it('inserts new node not previously in container', () => {
    const a = el('div');
    const b = el('div');
    container.appendChild(a);
    reconcileChildren(container, [a, b]);
    expect(Array.from(container.children)).toEqual([a, b]);
  });
});

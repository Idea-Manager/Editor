import {
  findVerticalScrollParent,
  getCollapsedCaretRect,
  scheduleScrollCaretIntoView,
  scrollCaretIntoView,
  scrollRectIntoView,
  scrollRectIntoWindow,
} from '../scroll-caret-into-view';

function mockRect(el: Element, rect: Partial<DOMRect>): void {
  jest.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    x: rect.left ?? 0,
    y: rect.top ?? 0,
    width: rect.width ?? 100,
    height: rect.height ?? 20,
    top: rect.top ?? 0,
    left: rect.left ?? 0,
    right: (rect.left ?? 0) + (rect.width ?? 100),
    bottom: (rect.top ?? 0) + (rect.height ?? 20),
    toJSON: () => ({}),
  } as DOMRect);
}

function mockOverflowY(el: HTMLElement, overflowY: string): void {
  jest.spyOn(window, 'getComputedStyle').mockImplementation(node => {
    if (node === el) {
      return { overflowY } as CSSStyleDeclaration;
    }
    return { overflowY: 'visible' } as CSSStyleDeclaration;
  });
}

function mockCollapsedSelection(
  root: HTMLElement,
  node: Node,
  offset: number,
  rect: { top: number; bottom: number; left?: number; height?: number },
): void {
  const range = document.createRange();
  range.setStart(node, offset);
  range.collapse(true);

  Object.defineProperty(range, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      x: rect.left ?? 10,
      y: rect.top,
      width: 0,
      height: rect.height ?? rect.bottom - rect.top,
      top: rect.top,
      left: rect.left ?? 10,
      right: (rect.left ?? 10),
      bottom: rect.bottom,
      toJSON: () => ({}),
    }),
  });
  Object.defineProperty(range, 'getClientRects', {
    configurable: true,
    value: () => [],
  });

  const sel = window.getSelection()!;
  sel.removeAllRanges();
  sel.addRange(range);
}

afterEach(() => {
  document.body.innerHTML = '';
  jest.restoreAllMocks();
});

describe('findVerticalScrollParent', () => {
  it('returns the nearest ancestor with scrollable overflow-y', () => {
    const scrollParent = document.createElement('div');
    scrollParent.style.overflowY = 'auto';
    const middle = document.createElement('div');
    const root = document.createElement('div');
    scrollParent.appendChild(middle);
    middle.appendChild(root);
    document.body.appendChild(scrollParent);

    mockOverflowY(scrollParent, 'auto');

    expect(findVerticalScrollParent(root)).toBe(scrollParent);
  });
});

describe('getCollapsedCaretRect', () => {
  it('returns null when there is no collapsed selection', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    expect(getCollapsedCaretRect(root)).toBeNull();
  });

  it('returns the range bounding rect for a collapsed selection', () => {
    const root = document.createElement('div');
    const text = document.createTextNode('hello');
    root.appendChild(text);
    document.body.appendChild(root);

    mockCollapsedSelection(root, text, 3, { top: 200, bottom: 218 });

    const rect = getCollapsedCaretRect(root);
    expect(rect?.top).toBe(200);
    expect(rect?.bottom).toBe(218);
  });
});

describe('scrollRectIntoView', () => {
  it('does not change scrollTop when caret is already visible', () => {
    const scrollParent = document.createElement('div');
    scrollParent.scrollTop = 50;
    mockRect(scrollParent, { top: 0, height: 200, left: 0, width: 300 });

    const caretRect = new DOMRect(10, 80, 0, 18);
    scrollRectIntoView(scrollParent, caretRect, 24);

    expect(scrollParent.scrollTop).toBe(50);
  });

  it('increases scrollTop when caret is below the visible bottom', () => {
    const scrollParent = document.createElement('div');
    scrollParent.scrollTop = 0;
    mockRect(scrollParent, { top: 0, height: 200, left: 0, width: 300 });

    const caretRect = new DOMRect(10, 210, 0, 18);
    scrollRectIntoView(scrollParent, caretRect, 24);

    expect(scrollParent.scrollTop).toBe(52);
  });

  it('decreases scrollTop when caret is above the visible top', () => {
    const scrollParent = document.createElement('div');
    scrollParent.scrollTop = 100;
    mockRect(scrollParent, { top: 100, height: 200, left: 0, width: 300 });

    const caretRect = new DOMRect(10, 110, 0, 18);
    scrollRectIntoView(scrollParent, caretRect, 24);

    expect(scrollParent.scrollTop).toBe(86);
  });
});

describe('scrollCaretIntoView', () => {
  it('returns early when there is no collapsed selection', () => {
    const scrollParent = document.createElement('div');
    const root = document.createElement('div');
    scrollParent.appendChild(root);
    document.body.appendChild(scrollParent);

    mockOverflowY(scrollParent, 'auto');
    scrollParent.scrollTop = 10;

    scrollCaretIntoView(root);

    expect(scrollParent.scrollTop).toBe(10);
  });

  it('falls back to window scrolling when no scroll parent exists', () => {
    const root = document.createElement('div');
    const text = document.createTextNode('hello');
    root.appendChild(text);
    document.body.appendChild(root);

    mockCollapsedSelection(root, text, 3, { top: 210, bottom: 228 });

    const scrollBy = jest.spyOn(window, 'scrollBy').mockImplementation(() => {});
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 200 });

    scrollCaretIntoView(root);

    expect(scrollBy).toHaveBeenCalledWith(0, 52);
  });
});

describe('scrollRectIntoWindow', () => {
  it('scrolls the window when the caret is below the viewport', () => {
    const scrollBy = jest.spyOn(window, 'scrollBy').mockImplementation(() => {});
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 200 });

    scrollRectIntoWindow(window, new DOMRect(10, 210, 0, 18), 24);

    expect(scrollBy).toHaveBeenCalledWith(0, 52);
    scrollBy.mockRestore();
  });
});

describe('scheduleScrollCaretIntoView', () => {
  it('runs only once per frame when called multiple times', () => {
    jest.useFakeTimers();

    const scrollParent = document.createElement('div');
    const root = document.createElement('div');
    const text = document.createTextNode('hello');
    root.appendChild(text);
    scrollParent.appendChild(root);
    document.body.appendChild(scrollParent);

    mockOverflowY(scrollParent, 'auto');
    mockRect(scrollParent, { top: 0, height: 200, left: 0, width: 300 });
    mockCollapsedSelection(root, text, 3, { top: 210, bottom: 228 });

    scheduleScrollCaretIntoView(root);
    scheduleScrollCaretIntoView(root);
    scheduleScrollCaretIntoView(root);

    expect(scrollParent.scrollTop).toBe(0);

    jest.runAllTimers();
    expect(scrollParent.scrollTop).toBe(52);

    jest.useRealTimers();
  });
});

describe('text editor scroll container styles', () => {
  it('idea-editor host scss enables vertical scrolling for all embed contexts', () => {
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const scss = fs.readFileSync(path.join(__dirname, '../text-editor.scss'), 'utf8');
    expect(scss).toMatch(/\.idea-editor[\s\S]*overflow-y:\s*auto/);
    expect(scss).toMatch(/\.idea-editor[\s\S]*min-height:\s*0/);
  });
});

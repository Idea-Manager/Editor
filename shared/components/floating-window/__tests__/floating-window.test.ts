import { FloatingWindow } from '@shared/components/floating-window';

// ─── PointerEvent polyfill ─────────────────────────────────────────────────
// Older jsdom versions bundled with Jest don't include PointerEvent.
if (typeof PointerEvent === 'undefined') {
  class PointerEventPolyfill extends MouseEvent {
    readonly pointerId: number;
    constructor(type: string, init: PointerEventInit & MouseEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 1;
    }
  }
  (globalThis as Record<string, unknown>)['PointerEvent'] = PointerEventPolyfill;
}

// ─── Pointer-capture mock ──────────────────────────────────────────────────
// jsdom does not implement setPointerCapture / hasPointerCapture routing, so
// we provide a minimal stateful stub.
const captureMap = new Map<Element, Set<number>>();

function mockPointerCapture(): void {
  Element.prototype.setPointerCapture = function (id: number) {
    if (!captureMap.has(this)) captureMap.set(this, new Set());
    captureMap.get(this)!.add(id);
  };
  Element.prototype.hasPointerCapture = function (id: number): boolean {
    return captureMap.get(this)?.has(id) ?? false;
  };
  Element.prototype.releasePointerCapture = function (id: number) {
    captureMap.get(this)?.delete(id);
  };
}

// ─── ResizeObserver mock ───────────────────────────────────────────────────
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function makeBody(text: string): HTMLElement {
  const el = document.createElement('p');
  el.textContent = text;
  return el;
}

function makeHost(rect: Partial<DOMRect> = {}): HTMLElement {
  const host = document.createElement('div');
  const defaultRect: DOMRect = {
    left: 0,
    top: 0,
    right: 800,
    bottom: 600,
    width: 800,
    height: 600,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  };
  host.getBoundingClientRect = () => ({ ...defaultRect, ...rect } as DOMRect);
  return host;
}

function ptrDown(
  target: Element,
  opts: { clientX?: number; clientY?: number; pointerId?: number } = {},
): void {
  const { clientX = 0, clientY = 0, pointerId = 1 } = opts;
  target.dispatchEvent(
    new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX, clientY, pointerId }),
  );
}

function ptrMove(
  target: Element,
  opts: { clientX?: number; clientY?: number; pointerId?: number } = {},
): void {
  const { clientX = 0, clientY = 0, pointerId = 1 } = opts;
  target.dispatchEvent(
    new PointerEvent('pointermove', { bubbles: true, clientX, clientY, pointerId }),
  );
}

function ptrUp(target: Element, pointerId = 1): void {
  target.dispatchEvent(
    new PointerEvent('pointerup', { bubbles: true, pointerId }),
  );
}

function getTitlebar(fw: FloatingWindow): HTMLElement {
  return fw.element.querySelector<HTMLElement>(
    '.idea-graphic-floating-window__titlebar',
  )!;
}

function getHandle(fw: FloatingWindow, dir: string): HTMLElement {
  return fw.element.querySelector<HTMLElement>(
    `.idea-graphic-floating-window__resize--${dir}`,
  )!;
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe('FloatingWindow', () => {
  beforeAll(() => {
    mockPointerCapture();
    (globalThis as Record<string, unknown>)['ResizeObserver'] = MockResizeObserver;
  });

  afterEach(() => {
    captureMap.clear();
    document.body.innerHTML = '';
  });

  // ── Construction & render ──────────────────────────────────────────────

  test('mounts and renders title + body in the host', () => {
    const host = makeHost();
    document.body.appendChild(host);

    const body = makeBody('hello body');
    const fw = new FloatingWindow({ title: 'My Window', body });
    fw.mount(host);

    expect(host.contains(fw.element)).toBe(true);
    const title = fw.element.querySelector('.idea-graphic-floating-window__title');
    expect(title?.textContent).toBe('My Window');
    const bodyWrap = fw.element.querySelector('.idea-graphic-floating-window__body');
    expect(bodyWrap?.contains(body)).toBe(true);
    fw.unmount();
  });

  test('element has role="dialog" and tabindex="-1"', () => {
    const host = makeHost();
    document.body.appendChild(host);
    const fw = new FloatingWindow({ title: 'Test', body: makeBody('b') });
    fw.mount(host);
    expect(fw.element.getAttribute('role')).toBe('dialog');
    expect(fw.element.getAttribute('tabindex')).toBe('-1');
    fw.unmount();
  });

  test('renders 8 resize handles', () => {
    const host = makeHost();
    document.body.appendChild(host);
    const fw = new FloatingWindow({ title: 'T', body: makeBody('b') });
    fw.mount(host);
    const handles = fw.element.querySelectorAll('.idea-graphic-floating-window__resize');
    expect(handles).toHaveLength(8);
    for (const dir of ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']) {
      expect(
        fw.element.querySelector(`.idea-graphic-floating-window__resize--${dir}`),
      ).not.toBeNull();
    }
    fw.unmount();
  });

  test('SE handle has a grip icon', () => {
    const host = makeHost();
    document.body.appendChild(host);
    const fw = new FloatingWindow({ title: 'T', body: makeBody('b') });
    fw.mount(host);
    const se = getHandle(fw, 'se');
    expect(se.querySelector('.material-symbols-outlined')).not.toBeNull();
    fw.unmount();
  });

  // ── setTitle / setBody / setTargetId ──────────────────────────────────

  test('setTitle swaps title text without remounting', () => {
    const host = makeHost();
    document.body.appendChild(host);
    const fw = new FloatingWindow({ title: 'Old', body: makeBody('b') });
    fw.mount(host);

    fw.setTitle('New Title');
    const title = fw.element.querySelector('.idea-graphic-floating-window__title');
    expect(title?.textContent).toBe('New Title');
    expect(host.contains(fw.element)).toBe(true);
    fw.unmount();
  });

  test('setTitle accepts an HTMLElement', () => {
    const host = makeHost();
    document.body.appendChild(host);
    const fw = new FloatingWindow({ title: 'T', body: makeBody('b') });
    fw.mount(host);

    const customTitle = document.createElement('strong');
    customTitle.textContent = 'Bold Title';
    fw.setTitle(customTitle);

    const titleSpan = fw.element.querySelector('.idea-graphic-floating-window__title');
    expect(titleSpan?.contains(customTitle)).toBe(true);
    fw.unmount();
  });

  test('setBody replaces body content without remounting', () => {
    const host = makeHost();
    document.body.appendChild(host);
    const first = makeBody('first');
    const fw = new FloatingWindow({ title: 'T', body: first });
    fw.mount(host);

    const second = makeBody('second');
    fw.setBody(second);

    const bodyWrap = fw.element.querySelector('.idea-graphic-floating-window__body');
    expect(bodyWrap?.contains(first)).toBe(false);
    expect(bodyWrap?.contains(second)).toBe(true);
    expect(host.contains(fw.element)).toBe(true);
    fw.unmount();
  });

  test('setTargetId changes the id used in onFocusedTargetChange', () => {
    const host = makeHost();
    document.body.appendChild(host);
    const onChange = jest.fn();
    const fw = new FloatingWindow({
      title: 'T',
      body: makeBody('b'),
      targetId: 'el-1',
      onFocusedTargetChange: onChange,
    });
    fw.mount(host);

    fw.setTargetId('el-2');
    ptrDown(fw.element);
    expect(onChange).toHaveBeenCalledWith('el-2');
    fw.unmount();
  });

  // ── Drag ──────────────────────────────────────────────────────────────

  test('drag on titlebar updates position', () => {
    const host = makeHost({ left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600 });
    document.body.appendChild(host);
    const fw = new FloatingWindow({
      title: 'T',
      body: makeBody('b'),
      initialPosition: { x: 100, y: 100 },
      initialSize: { width: 320, height: 400 },
    });
    fw.mount(host);

    const titlebar = getTitlebar(fw);

    ptrDown(titlebar, { clientX: 200, clientY: 200, pointerId: 1 });
    ptrMove(titlebar, { clientX: 250, clientY: 220, pointerId: 1 });
    ptrUp(titlebar, 1);

    expect(fw.element.style.left).toBe('150px'); // 100 + 50
    expect(fw.element.style.top).toBe('120px');  // 100 + 20
    fw.unmount();
  });

  test('drag is clamped to parent bounds', () => {
    const host = makeHost({ left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600 });
    document.body.appendChild(host);
    const fw = new FloatingWindow({
      title: 'T',
      body: makeBody('b'),
      initialPosition: { x: 100, y: 100 },
      initialSize: { width: 320, height: 400 },
    });
    fw.mount(host);

    const titlebar = getTitlebar(fw);

    // Try to drag far beyond right edge; 800 - 320 = 480 max x
    ptrDown(titlebar, { clientX: 200, clientY: 200, pointerId: 1 });
    ptrMove(titlebar, { clientX: 9999, clientY: 200, pointerId: 1 });
    ptrUp(titlebar, 1);

    expect(fw.element.style.left).toBe('480px');

    fw.unmount();
  });

  test('drag is clamped at top-left bounds (min 0)', () => {
    const host = makeHost({ left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600 });
    document.body.appendChild(host);
    const fw = new FloatingWindow({
      title: 'T',
      body: makeBody('b'),
      initialPosition: { x: 100, y: 100 },
      initialSize: { width: 320, height: 400 },
    });
    fw.mount(host);

    const titlebar = getTitlebar(fw);
    ptrDown(titlebar, { clientX: 200, clientY: 200, pointerId: 1 });
    ptrMove(titlebar, { clientX: -9999, clientY: -9999, pointerId: 1 });
    ptrUp(titlebar, 1);

    expect(fw.element.style.left).toBe('0px');
    expect(fw.element.style.top).toBe('0px');
    fw.unmount();
  });

  // ── Resize ────────────────────────────────────────────────────────────

  test('resize east increases width, keeps x and y unchanged', () => {
    const host = makeHost({ left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600 });
    document.body.appendChild(host);
    const fw = new FloatingWindow({
      title: 'T',
      body: makeBody('b'),
      initialPosition: { x: 50, y: 50 },
      initialSize: { width: 320, height: 400 },
    });
    fw.mount(host);

    const handle = getHandle(fw, 'e');
    ptrDown(handle, { clientX: 370, clientY: 250, pointerId: 1 });
    ptrMove(handle, { clientX: 420, clientY: 250, pointerId: 1 }); // dx = +50
    ptrUp(handle, 1);

    expect(fw.element.style.width).toBe('370px');  // 320 + 50
    expect(fw.element.style.left).toBe('50px');    // unchanged
    expect(fw.element.style.height).toBe('400px'); // unchanged
    fw.unmount();
  });

  test('resize west increases width leftward, shifts x to keep right edge fixed', () => {
    const host = makeHost({ left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600 });
    document.body.appendChild(host);
    const fw = new FloatingWindow({
      title: 'T',
      body: makeBody('b'),
      initialPosition: { x: 100, y: 50 },
      initialSize: { width: 320, height: 400 },
    });
    fw.mount(host);

    const handle = getHandle(fw, 'w');
    // Drag left by 50 → width increases by 50, x decreases by 50
    ptrDown(handle, { clientX: 100, clientY: 250, pointerId: 1 });
    ptrMove(handle, { clientX: 50, clientY: 250, pointerId: 1 }); // dx = -50
    ptrUp(handle, 1);

    expect(fw.element.style.width).toBe('370px');  // 320 + 50
    expect(fw.element.style.left).toBe('50px');    // 100 - 50 (right edge stays at 420)
    fw.unmount();
  });

  test('resize south increases height, keeps y unchanged', () => {
    const host = makeHost({ left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600 });
    document.body.appendChild(host);
    const fw = new FloatingWindow({
      title: 'T',
      body: makeBody('b'),
      initialPosition: { x: 50, y: 50 },
      initialSize: { width: 320, height: 400 },
    });
    fw.mount(host);

    const handle = getHandle(fw, 's');
    ptrDown(handle, { clientX: 210, clientY: 450, pointerId: 1 });
    ptrMove(handle, { clientX: 210, clientY: 500, pointerId: 1 }); // dy = +50
    ptrUp(handle, 1);

    expect(fw.element.style.height).toBe('450px'); // 400 + 50
    expect(fw.element.style.top).toBe('50px');     // unchanged
    fw.unmount();
  });

  test('resize north increases height upward, shifts y to keep bottom edge fixed', () => {
    const host = makeHost({ left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600 });
    document.body.appendChild(host);
    const fw = new FloatingWindow({
      title: 'T',
      body: makeBody('b'),
      initialPosition: { x: 50, y: 100 },
      initialSize: { width: 320, height: 400 },
    });
    fw.mount(host);

    const handle = getHandle(fw, 'n');
    // Drag up by 50 → height increases by 50, y decreases by 50
    ptrDown(handle, { clientX: 210, clientY: 100, pointerId: 1 });
    ptrMove(handle, { clientX: 210, clientY: 50, pointerId: 1 }); // dy = -50
    ptrUp(handle, 1);

    expect(fw.element.style.height).toBe('450px'); // 400 + 50
    expect(fw.element.style.top).toBe('50px');     // 100 - 50 (bottom stays at 500)
    fw.unmount();
  });

  test('resize ne increases width right and height up', () => {
    const host = makeHost({ left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600 });
    document.body.appendChild(host);
    const fw = new FloatingWindow({
      title: 'T',
      body: makeBody('b'),
      initialPosition: { x: 50, y: 100 },
      initialSize: { width: 320, height: 400 },
    });
    fw.mount(host);

    const handle = getHandle(fw, 'ne');
    ptrDown(handle, { clientX: 370, clientY: 100, pointerId: 1 });
    ptrMove(handle, { clientX: 420, clientY: 50, pointerId: 1 }); // dx=+50, dy=-50
    ptrUp(handle, 1);

    expect(fw.element.style.width).toBe('370px');  // 320 + 50
    expect(fw.element.style.height).toBe('450px'); // 400 + 50
    expect(fw.element.style.left).toBe('50px');    // unchanged
    expect(fw.element.style.top).toBe('50px');     // 100 - 50
    fw.unmount();
  });

  test('resize nw increases width left and height up', () => {
    const host = makeHost({ left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600 });
    document.body.appendChild(host);
    const fw = new FloatingWindow({
      title: 'T',
      body: makeBody('b'),
      initialPosition: { x: 100, y: 100 },
      initialSize: { width: 320, height: 400 },
    });
    fw.mount(host);

    const handle = getHandle(fw, 'nw');
    ptrDown(handle, { clientX: 100, clientY: 100, pointerId: 1 });
    ptrMove(handle, { clientX: 60, clientY: 60, pointerId: 1 }); // dx=-40, dy=-40
    ptrUp(handle, 1);

    expect(fw.element.style.width).toBe('360px');  // 320 + 40
    expect(fw.element.style.left).toBe('60px');    // 100 - 40
    expect(fw.element.style.height).toBe('440px'); // 400 + 40
    expect(fw.element.style.top).toBe('60px');     // 100 - 40
    fw.unmount();
  });

  test('resize se increases width right and height down', () => {
    const host = makeHost({ left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600 });
    document.body.appendChild(host);
    const fw = new FloatingWindow({
      title: 'T',
      body: makeBody('b'),
      initialPosition: { x: 50, y: 50 },
      initialSize: { width: 320, height: 400 },
    });
    fw.mount(host);

    const handle = getHandle(fw, 'se');
    ptrDown(handle, { clientX: 370, clientY: 450, pointerId: 1 });
    ptrMove(handle, { clientX: 410, clientY: 490, pointerId: 1 }); // dx=+40, dy=+40
    ptrUp(handle, 1);

    expect(fw.element.style.width).toBe('360px');  // 320 + 40
    expect(fw.element.style.height).toBe('440px'); // 400 + 40
    expect(fw.element.style.left).toBe('50px');    // unchanged
    expect(fw.element.style.top).toBe('50px');     // unchanged
    fw.unmount();
  });

  test('resize sw increases width left and height down', () => {
    const host = makeHost({ left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600 });
    document.body.appendChild(host);
    const fw = new FloatingWindow({
      title: 'T',
      body: makeBody('b'),
      initialPosition: { x: 100, y: 50 },
      initialSize: { width: 320, height: 400 },
    });
    fw.mount(host);

    const handle = getHandle(fw, 'sw');
    ptrDown(handle, { clientX: 100, clientY: 450, pointerId: 1 });
    ptrMove(handle, { clientX: 60, clientY: 490, pointerId: 1 }); // dx=-40, dy=+40
    ptrUp(handle, 1);

    expect(fw.element.style.width).toBe('360px');  // 320 + 40
    expect(fw.element.style.left).toBe('60px');    // 100 - 40
    expect(fw.element.style.height).toBe('440px'); // 400 + 40
    expect(fw.element.style.top).toBe('50px');     // unchanged
    fw.unmount();
  });

  test('resize east enforces 300 px minimum width', () => {
    const host = makeHost({ left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600 });
    document.body.appendChild(host);
    const fw = new FloatingWindow({
      title: 'T',
      body: makeBody('b'),
      initialPosition: { x: 50, y: 50 },
      initialSize: { width: 320, height: 400 },
    });
    fw.mount(host);

    const handle = getHandle(fw, 'e');
    ptrDown(handle, { clientX: 370, clientY: 250, pointerId: 1 });
    // Drag left far — would make width < 300
    ptrMove(handle, { clientX: 100, clientY: 250, pointerId: 1 }); // dx = -270 → would be 50px
    ptrUp(handle, 1);

    expect(parseInt(fw.element.style.width, 10)).toBeGreaterThanOrEqual(300);
    fw.unmount();
  });

  test('resize south enforces 200 px minimum height', () => {
    const host = makeHost({ left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600 });
    document.body.appendChild(host);
    const fw = new FloatingWindow({
      title: 'T',
      body: makeBody('b'),
      initialPosition: { x: 50, y: 50 },
      initialSize: { width: 320, height: 400 },
    });
    fw.mount(host);

    const handle = getHandle(fw, 's');
    ptrDown(handle, { clientX: 210, clientY: 450, pointerId: 1 });
    ptrMove(handle, { clientX: 210, clientY: 100, pointerId: 1 }); // dy = -350 → would be 50px
    ptrUp(handle, 1);

    expect(parseInt(fw.element.style.height, 10)).toBeGreaterThanOrEqual(200);
    fw.unmount();
  });

  // ── Focus / onFocusedTargetChange ─────────────────────────────────────

  test('onFocusedTargetChange fires with targetId on pointerdown inside window', () => {
    const host = makeHost();
    document.body.appendChild(host);
    const onChange = jest.fn();
    const fw = new FloatingWindow({
      title: 'T',
      body: makeBody('b'),
      targetId: 'el-42',
      onFocusedTargetChange: onChange,
    });
    fw.mount(host);

    ptrDown(fw.element);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('el-42');
    fw.unmount();
  });

  test('onFocusedTargetChange fires with null on pointerdown outside window', () => {
    const host = makeHost();
    document.body.appendChild(host);
    const onChange = jest.fn();
    const fw = new FloatingWindow({
      title: 'T',
      body: makeBody('b'),
      targetId: 'el-42',
      onFocusedTargetChange: onChange,
    });
    fw.mount(host);

    // Focus first
    ptrDown(fw.element);
    expect(onChange).toHaveBeenCalledWith('el-42');

    // Click outside
    ptrDown(document.body);
    expect(onChange).toHaveBeenCalledWith(null);
    fw.unmount();
  });

  test('onFocusedTargetChange does not fire again if already focused', () => {
    const host = makeHost();
    document.body.appendChild(host);
    const onChange = jest.fn();
    const fw = new FloatingWindow({
      title: 'T',
      body: makeBody('b'),
      targetId: 'el-1',
      onFocusedTargetChange: onChange,
    });
    fw.mount(host);

    ptrDown(fw.element);
    ptrDown(fw.element);
    ptrDown(fw.element);
    expect(onChange).toHaveBeenCalledTimes(1);
    fw.unmount();
  });

  test('onFocusedTargetChange does not fire null if not focused', () => {
    const host = makeHost();
    document.body.appendChild(host);
    const onChange = jest.fn();
    const fw = new FloatingWindow({
      title: 'T',
      body: makeBody('b'),
      onFocusedTargetChange: onChange,
    });
    fw.mount(host);

    // Click outside without focusing first
    ptrDown(document.body);
    expect(onChange).not.toHaveBeenCalled();
    fw.unmount();
  });

  // ── Close button ──────────────────────────────────────────────────────

  test('close button fires onClose and unmounts the element', () => {
    const host = makeHost();
    document.body.appendChild(host);
    const onClose = jest.fn();
    const fw = new FloatingWindow({
      title: 'T',
      body: makeBody('b'),
      onClose,
    });
    fw.mount(host);

    const closeBtn = fw.element.querySelector<HTMLButtonElement>(
      '.idea-graphic-floating-window__close',
    )!;
    closeBtn.click();

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(host.contains(fw.element)).toBe(false);
  });

  // ── unmount ───────────────────────────────────────────────────────────

  test('unmount removes element from DOM', () => {
    const host = makeHost();
    document.body.appendChild(host);
    const fw = new FloatingWindow({ title: 'T', body: makeBody('b') });
    fw.mount(host);
    expect(host.contains(fw.element)).toBe(true);

    fw.unmount();
    expect(host.contains(fw.element)).toBe(false);
  });

  test('unmount detaches document pointerdown listener', () => {
    const host = makeHost();
    document.body.appendChild(host);
    const onChange = jest.fn();
    const fw = new FloatingWindow({
      title: 'T',
      body: makeBody('b'),
      targetId: 'el-1',
      onFocusedTargetChange: onChange,
    });
    fw.mount(host);

    // Focus then unmount
    ptrDown(fw.element);
    expect(onChange).toHaveBeenCalledTimes(1);

    fw.unmount();
    onChange.mockClear();

    // Events after unmount should not trigger callback
    ptrDown(document.body);
    expect(onChange).not.toHaveBeenCalled();
  });

  // ── focus() ───────────────────────────────────────────────────────────

  test('focus() fires onFocusedTargetChange with current targetId', () => {
    const host = makeHost();
    document.body.appendChild(host);
    const onChange = jest.fn();
    const fw = new FloatingWindow({
      title: 'T',
      body: makeBody('b'),
      targetId: 'el-7',
      onFocusedTargetChange: onChange,
    });
    fw.mount(host);

    fw.focus();
    expect(onChange).toHaveBeenCalledWith('el-7');
    fw.unmount();
  });

  // ── Initial position / getRect ────────────────────────────────────────

  test('applies custom initialSize', () => {
    const host = makeHost();
    document.body.appendChild(host);
    const fw = new FloatingWindow({
      title: 'T',
      body: makeBody('b'),
      initialSize: { width: 400, height: 500 },
      initialPosition: { x: 10, y: 10 },
    });
    fw.mount(host);

    expect(fw.element.style.width).toBe('400px');
    expect(fw.element.style.height).toBe('500px');
    fw.unmount();
  });

  test('applies custom initialPosition', () => {
    const host = makeHost();
    document.body.appendChild(host);
    const fw = new FloatingWindow({
      title: 'T',
      body: makeBody('b'),
      initialPosition: { x: 30, y: 60 },
    });
    fw.mount(host);

    expect(fw.element.style.left).toBe('30px');
    expect(fw.element.style.top).toBe('60px');
    fw.unmount();
  });

  test('default initial position is top-right with 16px margin', () => {
    const host = makeHost({ left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600 });
    document.body.appendChild(host);
    const fw = new FloatingWindow({
      title: 'T',
      body: makeBody('b'),
      initialSize: { width: 320, height: 400 },
    });
    fw.mount(host);

    // Expected: x = 800 - 320 - 16 = 464, y = 0 + 16 = 16
    expect(fw.element.style.left).toBe('464px');
    expect(fw.element.style.top).toBe('16px');
    fw.unmount();
  });
});

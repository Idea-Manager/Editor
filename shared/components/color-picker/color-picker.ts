export interface ColorPickerShowOptions {
  anchorX: number;
  anchorY: number;
  /** Any valid CSS color string, or undefined to use defaults below. */
  initialColor?: string;
  /**
   * Which CSS property to use when parsing `initialColor`.
   * @default 'background'
   */
  initialColorParseAs?: 'color' | 'background';
  /** Labels for footer buttons. */
  labels: { select: string; cancel: string };
  onSelect: (color: string) => void;
  onCancel?: () => void;
}

const VIEW_MARGIN = 8;
const CURSOR_OFFSET = 8;

export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

export function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  h *= 360;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  return { h, s, v };
}

export function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  const hh = ((h % 360) + 360) % 360;
  const c = v * s;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = v - c;
  let rp = 0;
  let gp = 0;
  let bp = 0;
  if (hh < 60) {
    rp = c;
    gp = x;
  } else if (hh < 120) {
    rp = x;
    gp = c;
  } else if (hh < 180) {
    gp = c;
    bp = x;
  } else if (hh < 240) {
    gp = x;
    bp = c;
  } else if (hh < 300) {
    rp = x;
    bp = c;
  } else {
    rp = c;
    bp = x;
  }
  return {
    r: rp + m,
    g: gp + m,
    b: bp + m,
  };
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

/** Parse via browser (supports hex, rgb, hsl, named colors). */
export function parseCssColorToRgba(
  css: string,
  parseAs: 'color' | 'background' = 'background',
): Rgba | null {
  const el = document.createElement('div');
  el.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;';
  if (parseAs === 'color') {
    el.style.color = css;
  } else {
    el.style.backgroundColor = css;
  }
  document.body.appendChild(el);
  const prop = parseAs === 'color' ? 'color' : 'backgroundColor';
  const raw = getComputedStyle(el)[prop];
  document.body.removeChild(el);

  const m = raw.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/);
  if (!m) return null;
  const r = Number(m[1]) / 255;
  const g = Number(m[2]) / 255;
  const b = Number(m[3]) / 255;
  const a = m[4] !== undefined ? Number(m[4]) : 1;
  return { r, g, b, a: clamp01(a) };
}

export function rgbaToCssString({ r, g, b, a }: Rgba): string {
  const ri = Math.round(clamp01(r) * 255);
  const gi = Math.round(clamp01(g) * 255);
  const bi = Math.round(clamp01(b) * 255);
  const ai = clamp01(a);
  if (ai >= 1) {
    return `#${[ri, gi, bi].map(x => x.toString(16).padStart(2, '0')).join('')}`;
  }
  return `rgba(${ri}, ${gi}, ${bi}, ${ai})`;
}

export function computePickerPosition(
  width: number,
  height: number,
  anchorX: number,
  anchorY: number,
): { left: number; top: number } {
  let left = anchorX + CURSOR_OFFSET;
  let top = anchorY + CURSOR_OFFSET;

  if (left + width > window.innerWidth - VIEW_MARGIN) {
    left = anchorX - width - CURSOR_OFFSET;
  }
  if (top + height > window.innerHeight - VIEW_MARGIN) {
    top = anchorY - height - CURSOR_OFFSET;
  }

  left = Math.min(Math.max(left, VIEW_MARGIN), window.innerWidth - width - VIEW_MARGIN);
  top = Math.min(Math.max(top, VIEW_MARGIN), window.innerHeight - height - VIEW_MARGIN);

  return { left, top };
}

/**
 * Floating HSV + alpha color picker (fixed to viewport).
 */
export class ColorPicker {
  private root: HTMLDivElement | null = null;
  private readonly disposers: (() => void)[] = [];

  get element(): HTMLDivElement | null {
    return this.root;
  }

  show(options: ColorPickerShowOptions): void {
    this.hide();

    let h = 0;
    let s = 0;
    let v = 1;
    let a = 1;

    const parseAs = options.initialColorParseAs ?? 'background';
    const trimmed = options.initialColor?.trim();
    const fallbackInitial = parseAs === 'color' ? '#000000' : 'rgba(0,0,0,0)';
    const initial = trimmed || fallbackInitial;
    const rgba = parseCssColorToRgba(initial, parseAs);
    if (rgba) {
      a = rgba.a;
      const { h: hh, s: ss, v: vv } = rgbToHsv(rgba.r, rgba.g, rgba.b);
      h = hh;
      s = ss;
      v = vv;
    }

    const root = document.createElement('div');
    root.classList.add('idea-color-picker');
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-label', 'Color picker');

    const panel = document.createElement('div');
    panel.classList.add('idea-color-picker__panel');

    const svWrap = document.createElement('div');
    svWrap.classList.add('idea-color-picker__sv-wrap');

    const sv = document.createElement('div');
    sv.classList.add('idea-color-picker__sv');
    svWrap.appendChild(sv);

    const svThumb = document.createElement('div');
    svThumb.classList.add('idea-color-picker__sv-thumb');
    svWrap.appendChild(svThumb);

    const hueTrack = document.createElement('div');
    hueTrack.classList.add('idea-color-picker__hue');
    const hueThumb = document.createElement('div');
    hueThumb.classList.add('idea-color-picker__hue-thumb');
    hueTrack.appendChild(hueThumb);

    const alphaTrack = document.createElement('div');
    alphaTrack.classList.add('idea-color-picker__alpha');
    const alphaFill = document.createElement('div');
    alphaFill.classList.add('idea-color-picker__alpha-fill');
    alphaTrack.appendChild(alphaFill);
    const alphaThumb = document.createElement('div');
    alphaThumb.classList.add('idea-color-picker__alpha-thumb');
    alphaTrack.appendChild(alphaThumb);

    const footer = document.createElement('div');
    footer.classList.add('idea-color-picker__footer');
    const btnCancel = document.createElement('button');
    btnCancel.type = 'button';
    btnCancel.classList.add('idea-color-picker__btn', 'idea-color-picker__btn--secondary');
    btnCancel.textContent = options.labels.cancel;
    const btnSelect = document.createElement('button');
    btnSelect.type = 'button';
    btnSelect.classList.add('idea-color-picker__btn', 'idea-color-picker__btn--primary');
    btnSelect.textContent = options.labels.select;
    footer.appendChild(btnCancel);
    footer.appendChild(btnSelect);

    panel.appendChild(svWrap);
    panel.appendChild(hueTrack);
    panel.appendChild(alphaTrack);
    panel.appendChild(footer);
    root.appendChild(panel);

    const applySvThumb = () => {
      svThumb.style.left = `${s * 100}%`;
      svThumb.style.top = `${(1 - v) * 100}%`;
    };

    const applyHueThumb = () => {
      hueThumb.style.left = `${(h / 360) * 100}%`;
    };

    const applyAlphaThumb = () => {
      alphaThumb.style.left = `${a * 100}%`;
    };

    const syncSvBackground = () => {
      sv.style.setProperty('--idea-cp-hue', `${h}`);
    };

    const syncAlphaFill = () => {
      const { r, g, b } = hsvToRgb(h, s, v);
      const R = Math.round(clamp01(r) * 255);
      const G = Math.round(clamp01(g) * 255);
      const B = Math.round(clamp01(b) * 255);
      alphaFill.style.setProperty('--idea-cp-rgb', `${R}, ${G}, ${B}`);
    };

    const syncThumbs = () => {
      const { r, g, b } = hsvToRgb(h, s, v);
      const R = Math.round(clamp01(r) * 255);
      const G = Math.round(clamp01(g) * 255);
      const B = Math.round(clamp01(b) * 255);
      svThumb.style.setProperty('--idea-cp-thumb', `rgb(${R},${G},${B})`);
      hueThumb.style.setProperty('--idea-cp-hue-thumb', `hsl(${h}, 100%, 50%)`);
      alphaThumb.style.setProperty('--idea-cp-thumb', `rgba(${R},${G},${B},${a})`);
      applySvThumb();
      applyHueThumb();
      applyAlphaThumb();
      syncSvBackground();
      syncAlphaFill();
    };

    syncThumbs();

    const currentRgba = (): Rgba => {
      const { r, g, b } = hsvToRgb(h, s, v);
      return { r, g, b, a };
    };

    const setFromSvClient = (clientX: number, clientY: number) => {
      const rect = sv.getBoundingClientRect();
      s = clamp01((clientX - rect.left) / rect.width);
      v = clamp01(1 - (clientY - rect.top) / rect.height);
      syncThumbs();
    };

    const setFromHueClient = (clientX: number) => {
      const rect = hueTrack.getBoundingClientRect();
      h = clamp01((clientX - rect.left) / rect.width) * 360;
      syncThumbs();
    };

    const setFromAlphaClient = (clientX: number) => {
      const rect = alphaTrack.getBoundingClientRect();
      a = clamp01((clientX - rect.left) / rect.width);
      syncThumbs();
    };

    const bindDrag = (
      target: HTMLElement,
      onMove: (e: PointerEvent) => void,
      onUp: (e: PointerEvent) => void,
    ) => {
      const down = (e: PointerEvent) => {
        if (e.button !== 0) return;
        e.preventDefault();
        target.setPointerCapture(e.pointerId);
        onMove(e);
      };
      const move = (e: PointerEvent) => {
        if (!target.hasPointerCapture(e.pointerId)) return;
        onMove(e);
      };
      const up = (e: PointerEvent) => {
        if (target.hasPointerCapture(e.pointerId)) {
          target.releasePointerCapture(e.pointerId);
        }
        onUp(e);
      };
      target.addEventListener('pointerdown', down);
      target.addEventListener('pointermove', move);
      target.addEventListener('pointerup', up);
      target.addEventListener('pointercancel', up);
      this.disposers.push(() => {
        target.removeEventListener('pointerdown', down);
        target.removeEventListener('pointermove', move);
        target.removeEventListener('pointerup', up);
        target.removeEventListener('pointercancel', up);
      });
    };

    bindDrag(
      svWrap,
      e => {
        setFromSvClient(e.clientX, e.clientY);
      },
      () => {},
    );

    bindDrag(
      hueTrack,
      e => {
        setFromHueClient(e.clientX);
      },
      () => {},
    );

    bindDrag(
      alphaTrack,
      e => {
        setFromAlphaClient(e.clientX);
      },
      () => {},
    );

    const cancel = () => {
      options.onCancel?.();
      this.hide();
    };

    const commit = () => {
      options.onSelect(rgbaToCssString(currentRgba()));
      this.hide();
    };

    btnCancel.addEventListener('click', () => cancel());
    btnSelect.addEventListener('click', () => commit());

    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        cancel();
      }
    };
    document.addEventListener('keydown', onKeydown, true);
    this.disposers.push(() => document.removeEventListener('keydown', onKeydown, true));

    document.body.appendChild(root);
    this.root = root;

    requestAnimationFrame(() => {
      if (!this.root) return;
      const rect = panel.getBoundingClientRect();
      const { left, top } = computePickerPosition(rect.width, rect.height, options.anchorX, options.anchorY);
      this.root.style.left = `${left}px`;
      this.root.style.top = `${top}px`;
    });
  }

  hide(): void {
    if (this.root) {
      this.root.remove();
      this.root = null;
    }
    this.disposers.forEach(fn => fn());
    this.disposers.length = 0;
  }

  isVisible(): boolean {
    return this.root !== null;
  }
}

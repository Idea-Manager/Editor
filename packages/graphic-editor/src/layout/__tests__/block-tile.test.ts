import { BlockTile } from '../block-tile';
import type { AnyGraphicBlockDefinition } from '../../blocks/block-registry';
import type { I18nService } from '@core/i18n/i18n';

function makeI18n(): I18nService {
  return { t: (k: string) => k } as unknown as I18nService;
}

function makeDef(overrides: Partial<AnyGraphicBlockDefinition> = {}): AnyGraphicBlockDefinition {
  return {
    type: 'rectangle',
    labelKey: 'graphic.block.rectangle',
    icon: 'rectangle',
    defaultData: () => ({}),
    renderSvg: () => document.createElementNS('http://www.w3.org/2000/svg', 'rect') as SVGElement,
    getBounds: () => ({ x: 0, y: 0, width: 100, height: 100 }),
    ...overrides,
  };
}

function makeSetup(def?: Partial<AnyGraphicBlockDefinition>) {
  const container = document.createElement('div');
  const i18n = makeI18n();
  const tile = new BlockTile(container, makeDef(def), i18n);
  return { container, tile, i18n };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('BlockTile', () => {
  describe('rendering', () => {
    it('renders a button with class idea-graphic-block-tile', () => {
      const { container } = makeSetup();
      const btn = container.querySelector('button');
      expect(btn).not.toBeNull();
      expect(btn?.className).toContain('idea-graphic-block-tile');
    });

    it('renders the icon in a span with material-symbols-outlined class', () => {
      const { container } = makeSetup({ icon: 'square' });
      const icon = container.querySelector('.idea-graphic-block-tile__icon');
      expect(icon?.textContent).toBe('square');
      expect(icon?.classList.contains('material-symbols-outlined')).toBe(true);
    });

    it('renders the labelKey-derived label when no staticLabel is set', () => {
      const { container } = makeSetup({ labelKey: 'graphic.block.rectangle' });
      const label = container.querySelector('.idea-graphic-block-tile__label');
      // i18n stub returns the key as-is
      expect(label?.textContent).toBe('graphic.block.rectangle');
    });

    it('renders staticLabel when provided, ignoring labelKey', () => {
      const { container } = makeSetup({ staticLabel: 'My Widget', labelKey: undefined });
      const label = container.querySelector('.idea-graphic-block-tile__label');
      expect(label?.textContent).toBe('My Widget');
    });

    it('sets the title attribute to the resolved label', () => {
      const { container } = makeSetup({ staticLabel: 'Circle' });
      const btn = container.querySelector('button');
      expect(btn?.title).toBe('Circle');
    });
  });

  describe('onActivate', () => {
    it('calls the registered callback on pointerdown', () => {
      const { container, tile } = makeSetup();
      const activated: number[] = [];
      tile.onActivate(() => activated.push(1));

      const btn = container.querySelector('button')!;
      btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));

      expect(activated).toHaveLength(1);
    });

    it('supports multiple onActivate callbacks', () => {
      const { container, tile } = makeSetup();
      const log: string[] = [];
      tile.onActivate(() => log.push('a'));
      tile.onActivate(() => log.push('b'));

      const btn = container.querySelector('button')!;
      btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

      expect(log).toEqual(['a', 'b']);
    });

    it('unsubscribe fn removes the callback', () => {
      const { container, tile } = makeSetup();
      const log: number[] = [];
      const unsub = tile.onActivate(() => log.push(1));
      unsub();

      const btn = container.querySelector('button')!;
      btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

      expect(log).toHaveLength(0);
    });
  });

  describe('destroy', () => {
    it('removes the button from the DOM', () => {
      const { container, tile } = makeSetup();
      expect(container.querySelector('button')).not.toBeNull();
      tile.destroy();
      expect(container.querySelector('button')).toBeNull();
    });

    it('no longer fires callbacks after destroy', () => {
      const { container, tile } = makeSetup();
      const log: number[] = [];
      tile.onActivate(() => log.push(1));
      tile.destroy();

      const div = document.createElement('button');
      container.appendChild(div);
      div.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

      expect(log).toHaveLength(0);
    });
  });
});

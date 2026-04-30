import { FlyoutArrowToolbar } from '../flyout-arrow-toolbar';
import type { ArrowToolbarValues } from '../flyout-arrow-toolbar';
import type { I18nService } from '@core/i18n/i18n';
import { ARROW_DEFAULTS } from '../../blocks/arrow/arrow-block';

function makeI18n(): I18nService {
  return {
    t: (key: string) => key,
  } as unknown as I18nService;
}

function makeHost(): HTMLDivElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

function makeValues(): ArrowToolbarValues {
  return { ...ARROW_DEFAULTS };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('FlyoutArrowToolbar', () => {
  describe('construction', () => {
    it('appends a toolbar element to the host', () => {
      const host = makeHost();
      new FlyoutArrowToolbar(host, {
        i18n: makeI18n(),
        initialValues: makeValues(),
        onChange: jest.fn(),
      });
      expect(host.querySelector('.idea-graphic-flyout-arrow')).toBeTruthy();
    });

    it('toolbar has role="toolbar"', () => {
      const host = makeHost();
      new FlyoutArrowToolbar(host, {
        i18n: makeI18n(),
        initialValues: makeValues(),
        onChange: jest.fn(),
      });
      const el = host.querySelector('.idea-graphic-flyout-arrow');
      expect(el?.getAttribute('role')).toBe('toolbar');
    });
  });

  describe('setPosition', () => {
    it('positions the toolbar at the given screen coords', () => {
      const host = makeHost();
      const toolbar = new FlyoutArrowToolbar(host, {
        i18n: makeI18n(),
        initialValues: makeValues(),
        onChange: jest.fn(),
      });
      toolbar.setPosition({ x: 100, y: 200 });
      const el = host.querySelector<HTMLElement>('.idea-graphic-flyout-arrow');
      expect(el?.style.left).toBe('100px');
      expect(el?.style.top).toBe('200px');
    });
  });

  describe('setValues', () => {
    it('rebuilds controls without throwing', () => {
      const host = makeHost();
      const toolbar = new FlyoutArrowToolbar(host, {
        i18n: makeI18n(),
        initialValues: makeValues(),
        onChange: jest.fn(),
      });
      expect(() => {
        toolbar.setValues({ ...ARROW_DEFAULTS, arrowType: 'line', thickness: 5 });
      }).not.toThrow();
    });
  });

  describe('onChange callbacks', () => {
    it('fires onChange when a heading dropdown item is clicked', () => {
      const host = makeHost();
      const onChange = jest.fn();
      new FlyoutArrowToolbar(host, {
        i18n: makeI18n(),
        initialValues: makeValues(),
        onChange,
      });

      const toolbar = host.querySelector('.idea-graphic-flyout-arrow')!;
      const dropdownBtns = toolbar.querySelectorAll<HTMLButtonElement>('.idea-graphic-flyout-arrow__dropdown-btn');
      // Open the first dropdown (heading)
      dropdownBtns[0].click();
      const items = toolbar.querySelectorAll<HTMLButtonElement>('.idea-graphic-flyout-arrow__dropdown-item');
      // Click the first item (none)
      items[0].click();

      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ heading: 'none' }));
    });

    it('fires onChange when direction dropdown item is clicked', () => {
      const host = makeHost();
      const onChange = jest.fn();
      new FlyoutArrowToolbar(host, {
        i18n: makeI18n(),
        initialValues: makeValues(),
        onChange,
      });

      const toolbar = host.querySelector('.idea-graphic-flyout-arrow')!;
      const dropdownBtns = toolbar.querySelectorAll<HTMLButtonElement>('.idea-graphic-flyout-arrow__dropdown-btn');
      // Open the second dropdown (direction)
      dropdownBtns[1].click();
      const menus = toolbar.querySelectorAll('.idea-graphic-flyout-arrow__dropdown-menu');
      const items = menus[1].querySelectorAll<HTMLButtonElement>('.idea-graphic-flyout-arrow__dropdown-item');
      // Click "both"
      items[3].click();

      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ direction: 'both' }));
    });

    it('fires onChange when type dropdown item is clicked', () => {
      const host = makeHost();
      const onChange = jest.fn();
      new FlyoutArrowToolbar(host, {
        i18n: makeI18n(),
        initialValues: makeValues(),
        onChange,
      });

      const toolbar = host.querySelector('.idea-graphic-flyout-arrow')!;
      const dropdownBtns = toolbar.querySelectorAll<HTMLButtonElement>('.idea-graphic-flyout-arrow__dropdown-btn');
      // Open the third dropdown (type)
      dropdownBtns[2].click();
      const menus = toolbar.querySelectorAll('.idea-graphic-flyout-arrow__dropdown-menu');
      const items = menus[2].querySelectorAll<HTMLButtonElement>('.idea-graphic-flyout-arrow__dropdown-item');
      // Click "line"
      items[0].click();

      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ arrowType: 'line' }));
    });
  });

  describe('destroy', () => {
    it('removes the toolbar element from the DOM', () => {
      const host = makeHost();
      const toolbar = new FlyoutArrowToolbar(host, {
        i18n: makeI18n(),
        initialValues: makeValues(),
        onChange: jest.fn(),
      });

      toolbar.destroy();

      expect(host.querySelector('.idea-graphic-flyout-arrow')).toBeNull();
    });
  });
});

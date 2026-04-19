import type { ShortcutManager, ShortcutEntry } from '@core/shortcuts/shortcut-manager';
import type { I18nService } from '@core/i18n/i18n';
import { formatHotkey } from '@core/platform/hotkey';
import './command-palette.scss';

export class CommandPalette {
  private backdrop: HTMLDivElement | null = null;
  private activeIndex = 0;
  private filteredItems: ShortcutEntry[] = [];

  constructor(
    private readonly shortcutManager: ShortcutManager,
    private readonly i18n: I18nService,
  ) {}

  isVisible(): boolean {
    return this.backdrop !== null;
  }

  toggle(): void {
    if (this.isVisible()) {
      this.hide();
    } else {
      this.show();
    }
  }

  show(): void {
    if (this.backdrop) return;

    this.filteredItems = this.shortcutManager.getAll();
    this.activeIndex = 0;

    this.backdrop = document.createElement('div');
    this.backdrop.classList.add('command-palette-backdrop');

    const palette = document.createElement('div');
    palette.classList.add('command-palette');

    const input = document.createElement('input');
    input.classList.add('command-palette__input');
    input.placeholder = this.i18n.t('palette.placeholder');
    input.addEventListener('input', () => {
      const query = input.value;
      this.filteredItems = query
        ? this.shortcutManager.search(query)
        : this.shortcutManager.getAll();
      this.activeIndex = 0;
      renderList();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.activeIndex = Math.min(this.activeIndex + 1, this.filteredItems.length - 1);
        renderList();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.activeIndex = Math.max(this.activeIndex - 1, 0);
        renderList();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = this.filteredItems[this.activeIndex];
        if (selected) {
          this.hide();
          selected.command();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.hide();
      }
    });

    const list = document.createElement('div');
    list.classList.add('command-palette__list');

    const renderList = () => {
      list.innerHTML = '';
      if (this.filteredItems.length === 0) {
        const empty = document.createElement('div');
        empty.classList.add('command-palette__empty');
        empty.textContent = this.i18n.t('palette.empty');
        list.appendChild(empty);
        return;
      }

      this.filteredItems.forEach((item, i) => {
        const el = document.createElement('div');
        el.classList.add('command-palette__item');
        if (i === this.activeIndex) el.classList.add('command-palette__item--active');

        const label = document.createElement('span');
        label.classList.add('command-palette__label');
        label.textContent = item.label;

        const keys = document.createElement('span');
        keys.classList.add('command-palette__keys');
        keys.textContent = this.formatKeys(item.keys);

        el.appendChild(label);
        el.appendChild(keys);

        el.addEventListener('mouseenter', () => {
          this.activeIndex = i;
          renderList();
        });
        el.addEventListener('click', () => {
          this.hide();
          item.command();
        });

        list.appendChild(el);
      });
    };

    palette.appendChild(input);
    palette.appendChild(list);
    this.backdrop.appendChild(palette);
    document.body.appendChild(this.backdrop);

    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop) this.hide();
    });

    renderList();
    requestAnimationFrame(() => input.focus());
  }

  hide(): void {
    if (this.backdrop) {
      this.backdrop.remove();
      this.backdrop = null;
    }
  }

  private formatKeys(keys: string): string {
    return formatHotkey(keys);
  }
}

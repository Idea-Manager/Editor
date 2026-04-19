import type { I18nService } from '@core/i18n/i18n';
import { createIcon } from '../../../../src/util/icon';

export type BorderPreset = 'all' | 'none' | 'outside' | 'inside';

export interface TableSizePickerResult {
  rows: number;
  cols: number;
  borderPreset: BorderPreset;
}

export class TableSizePicker {
  private overlay: HTMLDivElement | null = null;
  private hoverRow = 0;
  private hoverCol = 0;
  private borderPreset: BorderPreset = 'all';
  private sizeLabel: HTMLSpanElement | null = null;
  private gridContainer: HTMLDivElement | null = null;
  private readonly disposers: (() => void)[] = [];

  constructor(
    private readonly host: HTMLElement,
    private readonly i18n: I18nService,
  ) {}

  isVisible(): boolean {
    return this.overlay !== null;
  }

  show(
    anchorRect: DOMRect,
    onConfirm: (result: TableSizePickerResult) => void,
    onCancel: () => void,
  ): void {
    this.hide();

    this.hoverRow = 2;
    this.hoverCol = 2;
    this.borderPreset = 'all';

    this.overlay = document.createElement('div');
    this.overlay.classList.add('idea-table-picker');

    const title = document.createElement('div');
    title.classList.add('idea-table-picker__title');
    title.textContent = this.i18n.t('table.insertTable');
    this.overlay.appendChild(title);

    this.sizeLabel = document.createElement('span');
    this.sizeLabel.classList.add('idea-table-picker__size-label');
    this.updateSizeLabel();
    this.overlay.appendChild(this.sizeLabel);

    this.gridContainer = document.createElement('div');
    this.gridContainer.classList.add('idea-table-picker__grid');
    this.buildGrid();
    this.overlay.appendChild(this.gridContainer);

    const borderSection = document.createElement('div');
    borderSection.classList.add('idea-table-picker__borders');

    const borderLabel = document.createElement('span');
    borderLabel.classList.add('idea-table-picker__borders-label');
    borderLabel.textContent = this.i18n.t('table.borders');
    borderSection.appendChild(borderLabel);

    const borderButtons = document.createElement('div');
    borderButtons.classList.add('idea-table-picker__border-btns');

    const t = this.i18n.t.bind(this.i18n);
    const presets: { preset: BorderPreset; icon: string; title: string }[] = [
      { preset: 'all', icon: 'border_all', title: t('table.allBorders') },
      { preset: 'none', icon: 'border_clear', title: t('table.noBorders') },
      { preset: 'outside', icon: 'border_outer', title: t('table.outsideOnly') },
      { preset: 'inside', icon: 'border_inner', title: t('table.insideOnly') },
    ];

    for (const { preset, icon, title: t } of presets) {
      const btn = document.createElement('button');
      btn.classList.add('idea-table-picker__border-btn');
      if (preset === this.borderPreset) {
        btn.classList.add('idea-table-picker__border-btn--active');
      }
      btn.title = t;
      btn.appendChild(createIcon(icon));

      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.borderPreset = preset;
        borderButtons.querySelectorAll('.idea-table-picker__border-btn').forEach(b =>
          b.classList.remove('idea-table-picker__border-btn--active'),
        );
        btn.classList.add('idea-table-picker__border-btn--active');
      });

      borderButtons.appendChild(btn);
    }

    borderSection.appendChild(borderButtons);
    this.overlay.appendChild(borderSection);

    const actions = document.createElement('div');
    actions.classList.add('idea-table-picker__actions');

    const cancelBtn = document.createElement('button');
    cancelBtn.classList.add('idea-table-picker__cancel-btn');
    cancelBtn.textContent = this.i18n.t('table.cancel');
    cancelBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onCancel();
      this.hide();
    });

    const createBtn = document.createElement('button');
    createBtn.classList.add('idea-table-picker__create-btn');
    createBtn.textContent = this.i18n.t('table.create');
    createBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onConfirm({
        rows: this.hoverRow + 1,
        cols: this.hoverCol + 1,
        borderPreset: this.borderPreset,
      });
      this.hide();
    });

    actions.appendChild(cancelBtn);
    actions.appendChild(createBtn);
    this.overlay.appendChild(actions);

    this.host.appendChild(this.overlay);
    this.positionOverlay(anchorRect);

    const onMousedown = (e: MouseEvent) => {
      if (this.overlay && !this.overlay.contains(e.target as Node)) {
        onCancel();
        this.hide();
      }
    };

    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onCancel();
        this.hide();
      }
    };

    document.addEventListener('mousedown', onMousedown);
    document.addEventListener('keydown', onKeydown, true);
    this.disposers.push(
      () => document.removeEventListener('mousedown', onMousedown),
      () => document.removeEventListener('keydown', onKeydown, true),
    );
  }

  hide(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    this.gridContainer = null;
    this.sizeLabel = null;
    this.disposers.forEach(fn => fn());
    this.disposers.length = 0;
  }

  private buildGrid(): void {
    if (!this.gridContainer) return;
    this.gridContainer.innerHTML = '';

    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        const cell = document.createElement('div');
        cell.classList.add('idea-table-picker__cell');
        if (r <= this.hoverRow && c <= this.hoverCol) {
          cell.classList.add('idea-table-picker__cell--active');
        }

        cell.addEventListener('mouseenter', () => {
          this.hoverRow = r;
          this.hoverCol = c;
          this.updateGridHighlight();
          this.updateSizeLabel();
        });

        this.gridContainer!.appendChild(cell);
      }
    }
  }

  private updateGridHighlight(): void {
    if (!this.gridContainer) return;
    const cells = this.gridContainer.children;
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        const cell = cells[r * 10 + c];
        if (!cell) continue;
        cell.classList.toggle(
          'idea-table-picker__cell--active',
          r <= this.hoverRow && c <= this.hoverCol,
        );
      }
    }
  }

  private updateSizeLabel(): void {
    if (this.sizeLabel) {
      this.sizeLabel.textContent = `${this.hoverCol + 1} \u00d7 ${this.hoverRow + 1}`;
    }
  }

  private positionOverlay(anchorRect: DOMRect): void {
    if (!this.overlay) return;

    const overlay = this.overlay;
    overlay.style.top = `${anchorRect.bottom + 4}px`;
    overlay.style.left = `${anchorRect.left}px`;

    requestAnimationFrame(() => {
      if (!overlay.isConnected) return;
      const rect = overlay.getBoundingClientRect();

      let top = anchorRect.bottom + 4;
      if (top + rect.height > window.innerHeight) {
        top = anchorRect.top - rect.height - 4;
      }

      let left = anchorRect.left;
      left = Math.max(8, Math.min(left, window.innerWidth - rect.width - 8));

      overlay.style.top = `${top}px`;
      overlay.style.left = `${left}px`;
    });
  }
}

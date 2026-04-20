import type { I18nService } from '@core/i18n/i18n';
import { Modal } from '@shared/components/modal';
import { createIcon } from '../../../../src/util/icon';
import type { BorderPreset, TableSizePickerResult } from '../blocks/table-data-factory';

export type { BorderPreset, TableSizePickerResult } from '../blocks/table-data-factory';

export class TableSizePicker {
  private readonly modal = new Modal(this.host);
  private hoverRow = 0;
  private hoverCol = 0;
  private locked = false;
  private lockedRow = 0;
  private lockedCol = 0;
  private borderPreset: BorderPreset = 'all';
  private sizeLabel: HTMLSpanElement | null = null;
  private gridContainer: HTMLDivElement | null = null;

  constructor(
    private readonly host: HTMLElement,
    private readonly i18n: I18nService,
  ) {}

  isVisible(): boolean {
    return this.modal.isVisible();
  }

  show(
    onConfirm: (result: TableSizePickerResult) => void,
    onCancel: () => void,
  ): void {
    this.hide();

    this.hoverRow = 2;
    this.hoverCol = 2;
    this.locked = false;
    this.lockedRow = 2;
    this.lockedCol = 2;
    this.borderPreset = 'all';

    const body = document.createElement('div');
    body.classList.add('idea-table-picker');

    this.sizeLabel = document.createElement('span');
    this.sizeLabel.classList.add('idea-table-picker__size-label');
    this.updateSizeLabel();
    body.appendChild(this.sizeLabel);

    this.gridContainer = document.createElement('div');
    this.gridContainer.classList.add('idea-table-picker__grid');
    this.buildGrid();
    body.appendChild(this.gridContainer);

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

    for (const { preset, icon, title: presetTitle } of presets) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.classList.add('idea-table-picker__border-btn');
      if (preset === this.borderPreset) {
        btn.classList.add('idea-table-picker__border-btn--active');
      }
      btn.title = presetTitle;
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
    body.appendChild(borderSection);

    const actions = document.createElement('div');
    actions.classList.add('idea-table-picker__actions');

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.classList.add('idea-table-picker__cancel-btn');
    cancelBtn.textContent = this.i18n.t('table.cancel');
    cancelBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onCancel();
      this.hide();
    });

    const createBtn = document.createElement('button');
    createBtn.type = 'button';
    createBtn.classList.add('idea-table-picker__create-btn');
    createBtn.textContent = this.i18n.t('table.create');
    createBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const effRow = this.effectiveRow();
      const effCol = this.effectiveCol();
      onConfirm({
        rows: effRow + 1,
        cols: effCol + 1,
        borderPreset: this.borderPreset,
      });
      this.hide();
    });

    actions.appendChild(cancelBtn);
    actions.appendChild(createBtn);

    this.modal.show({
      title: this.i18n.t('table.createTableTitle'),
      body,
      footer: actions,
      onDismiss: () => onCancel(),
    });
  }

  hide(): void {
    this.modal.hide();
    this.gridContainer = null;
    this.sizeLabel = null;
  }

  private effectiveRow(): number {
    return this.locked ? this.lockedRow : this.hoverRow;
  }

  private effectiveCol(): number {
    return this.locked ? this.lockedCol : this.hoverCol;
  }

  private updateGridLockedClass(): void {
    if (!this.gridContainer) return;
    this.gridContainer.classList.toggle('idea-table-picker__grid--locked', this.locked);
  }

  private buildGrid(): void {
    if (!this.gridContainer) return;
    this.gridContainer.innerHTML = '';

    const effRow = this.effectiveRow();
    const effCol = this.effectiveCol();

    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        const cell = document.createElement('div');
        cell.classList.add('idea-table-picker__cell');
        if (r <= effRow && c <= effCol) {
          cell.classList.add('idea-table-picker__cell--active');
        }

        cell.addEventListener('mouseenter', () => {
          if (this.locked) return;
          this.hoverRow = r;
          this.hoverCol = c;
          this.updateGridHighlight();
          this.updateSizeLabel();
        });

        cell.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (this.locked) {
            this.hoverRow = this.lockedRow;
            this.hoverCol = this.lockedCol;
            this.locked = false;
          } else {
            this.locked = true;
            this.lockedRow = r;
            this.lockedCol = c;
            this.hoverRow = r;
            this.hoverCol = c;
          }
          this.updateGridLockedClass();
          this.updateGridHighlight();
          this.updateSizeLabel();
        });

        this.gridContainer.appendChild(cell);
      }
    }
    this.updateGridLockedClass();
  }

  private updateGridHighlight(): void {
    if (!this.gridContainer) return;
    const effRow = this.effectiveRow();
    const effCol = this.effectiveCol();
    const cells = this.gridContainer.children;
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        const cell = cells[r * 10 + c];
        if (!cell) continue;
        cell.classList.toggle(
          'idea-table-picker__cell--active',
          r <= effRow && c <= effCol,
        );
      }
    }
  }

  private updateSizeLabel(): void {
    if (this.sizeLabel) {
      const effCol = this.effectiveCol();
      const effRow = this.effectiveRow();
      this.sizeLabel.textContent = `${effCol + 1} \u00d7 ${effRow + 1}`;
    }
  }
}

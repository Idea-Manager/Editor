import type { I18nService } from '@core/i18n/i18n';
import { FloatingWindow } from '@shared/components/floating-window';
import { Accordion } from '@shared/components/accordion';
import { showToast } from '@shared/components/toast';
import type { GraphicContext } from '../engine/graphic-context';
import type { SelectionEntry } from '../engine/selection-manager';
import { computeLockState, computeGroupState } from '../groups/group-state';
import { SetLockedCommand } from '../groups/set-locked-command';
import { SetGroupedCommand } from '../groups/set-grouped-command';
import { CreateCustomBlockCommand } from '../groups/create-custom-block-command';
import {
  GRAPHIC_GROUP_TITLE,
  GRAPHIC_GROUP_LOCK,
  GRAPHIC_GROUP_GROUP,
  GRAPHIC_GROUP_CREATE_BLOCK,
  GRAPHIC_GROUP_CREATE_BLOCK_INPUT,
  GRAPHIC_GROUP_CREATE_BLOCK_SUCCESS,
  GRAPHIC_PROPS_WINDOW_CLOSE,
} from '../i18n/keys';
import groupPropsStyles from './group-properties-window.scss?inline';

export interface GroupPropertiesWindowConfig {
  i18n: I18nService;
  ctx: GraphicContext;
  hostSelector: string;
  selection: SelectionEntry[];
  onClose?: () => void;
}

let stylesInjected = false;
function ensureStyles(): void {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement('style');
  style.textContent = groupPropsStyles;
  document.head.appendChild(style);
}

export class GroupPropertiesWindow {
  private readonly host: HTMLElement;
  private readonly config: GroupPropertiesWindowConfig;
  private floatingWindow: FloatingWindow | null = null;
  private currentSelection: SelectionEntry[] = [];
  private lockCheckbox: HTMLInputElement | null = null;
  private groupCheckbox: HTMLInputElement | null = null;
  private nameInput: HTMLInputElement | null = null;
  private createBtn: HTMLButtonElement | null = null;
  private accordion: Accordion | null = null;

  constructor(host: HTMLElement, config: GroupPropertiesWindowConfig) {
    ensureStyles();
    this.host = host;
    this.config = config;
    this.currentSelection = [...config.selection];
    this._build();
  }

  setSelection(entries: SelectionEntry[]): void {
    this.currentSelection = [...entries];
    this._updateTitle();
    this._updateCheckboxes();
  }

  destroy(): void {
    this.accordion?.destroy();
    this.accordion = null;
    this.floatingWindow?.unmount();
    this.floatingWindow = null;
    this.lockCheckbox = null;
    this.groupCheckbox = null;
    this.nameInput = null;
    this.createBtn = null;
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  private _build(): void {
    const { i18n } = this.config;

    const body = this._buildBody();

    this.floatingWindow = new FloatingWindow({
      title: this._titleText(),
      body,
      boundsSelector: this.config.hostSelector,
      initialPosition: this._calcInitialPosition(),
      closeAriaLabel: i18n.t(GRAPHIC_PROPS_WINDOW_CLOSE),
      onClose: () => {
        this.config.onClose?.();
      },
    });

    this.floatingWindow.mount(this.host);
  }

  private _titleText(): string {
    return this.config.i18n.t(GRAPHIC_GROUP_TITLE, { count: this.currentSelection.length });
  }

  private _updateTitle(): void {
    this.floatingWindow?.setTitle(this._titleText());
  }

  private _updateCheckboxes(): void {
    const { ctx } = this.config;
    const page = ctx.page;

    if (this.lockCheckbox) {
      const lockState = computeLockState(this.currentSelection, page);
      this._applyTriState(this.lockCheckbox, lockState);
    }

    if (this.groupCheckbox) {
      const groupState = computeGroupState(this.currentSelection, page);
      this._applyTriState(this.groupCheckbox, groupState);
    }
  }

  private _applyTriState(checkbox: HTMLInputElement, state: 'all' | 'none' | 'mixed'): void {
    checkbox.indeterminate = state === 'mixed';
    checkbox.checked = state === 'all';
  }

  private _buildBody(): HTMLElement {
    const { i18n, ctx } = this.config;
    const page = ctx.page;

    // ── Lock row ──
    const lockRow = document.createElement('div');
    lockRow.className = 'idea-group-props__row';

    const lockLabel = document.createElement('label');
    lockLabel.className = 'idea-group-props__label';
    lockLabel.textContent = i18n.t(GRAPHIC_GROUP_LOCK);

    this.lockCheckbox = document.createElement('input');
    this.lockCheckbox.type = 'checkbox';
    this.lockCheckbox.className = 'idea-group-props__checkbox';

    const lockState = computeLockState(this.currentSelection, page);
    this._applyTriState(this.lockCheckbox, lockState);

    this.lockCheckbox.addEventListener('change', () => {
      const elementIds = this.currentSelection
        .filter(e => e.type === 'element')
        .map(e => e.id);
      if (elementIds.length === 0) return;

      const cmd = new SetLockedCommand({
        doc: ctx.document,
        pageId: ctx.page.id,
        elementIds,
        locked: this.lockCheckbox!.checked,
      });
      ctx.undoRedoManager.push(cmd);
      ctx.eventBus.emit('element:update');
      ctx.eventBus.emit('doc:change');
    });

    lockLabel.appendChild(this.lockCheckbox);
    lockRow.appendChild(lockLabel);

    // ── Group row ──
    const groupRow = document.createElement('div');
    groupRow.className = 'idea-group-props__row';

    const groupLabel = document.createElement('label');
    groupLabel.className = 'idea-group-props__label';
    groupLabel.textContent = i18n.t(GRAPHIC_GROUP_GROUP);

    this.groupCheckbox = document.createElement('input');
    this.groupCheckbox.type = 'checkbox';
    this.groupCheckbox.className = 'idea-group-props__checkbox';

    const groupState = computeGroupState(this.currentSelection, page);
    this._applyTriState(this.groupCheckbox, groupState);

    this.groupCheckbox.addEventListener('change', () => {
      const elementIds = this.currentSelection
        .filter(e => e.type === 'element')
        .map(e => e.id);
      if (elementIds.length === 0) return;

      const cmd = new SetGroupedCommand({
        doc: ctx.document,
        pageId: ctx.page.id,
        elementIds,
        grouped: this.groupCheckbox!.checked,
      });
      ctx.undoRedoManager.push(cmd);
      ctx.eventBus.emit('element:update');
      ctx.eventBus.emit('doc:change');
    });

    groupLabel.appendChild(this.groupCheckbox);
    groupRow.appendChild(groupLabel);

    // ── Create block panel ──
    const createBlockContent = this._buildCreateBlockPanel();

    this.accordion = new Accordion({
      items: [
        {
          id: 'create-block',
          title: i18n.t(GRAPHIC_GROUP_CREATE_BLOCK),
          content: createBlockContent,
          defaultOpen: false,
        },
      ],
      mode: 'single',
    });

    const wrapper = document.createElement('div');
    wrapper.className = 'idea-group-props';
    wrapper.appendChild(lockRow);
    wrapper.appendChild(groupRow);
    wrapper.appendChild(this.accordion.element);

    return wrapper;
  }

  private _buildCreateBlockPanel(): HTMLElement {
    const { i18n, ctx } = this.config;

    const panel = document.createElement('div');
    panel.className = 'idea-group-props__create-panel';

    // Icon preview
    const preview = document.createElement('div');
    preview.className = 'idea-group-props__preview';
    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined idea-group-props__preview-icon';
    icon.textContent = 'auto_awesome_motion';
    const countBadge = document.createElement('span');
    countBadge.className = 'idea-group-props__preview-count';
    countBadge.textContent = String(
      this.currentSelection.filter(e => e.type === 'element').length,
    );
    preview.appendChild(icon);
    preview.appendChild(countBadge);

    // Name input
    const inputLabel = document.createElement('label');
    inputLabel.className = 'idea-group-props__input-label';
    inputLabel.textContent = i18n.t(GRAPHIC_GROUP_CREATE_BLOCK_INPUT);

    this.nameInput = document.createElement('input');
    this.nameInput.type = 'text';
    this.nameInput.className = 'idea-group-props__name-input';
    this.nameInput.minLength = 1;
    this.nameInput.maxLength = 40;
    this.nameInput.placeholder = i18n.t(GRAPHIC_GROUP_CREATE_BLOCK_INPUT);

    this.nameInput.addEventListener('input', () => {
      const hasValue = (this.nameInput?.value.trim().length ?? 0) > 0;
      if (this.createBtn) this.createBtn.disabled = !hasValue;
    });

    // Create button
    this.createBtn = document.createElement('button');
    this.createBtn.type = 'button';
    this.createBtn.className = 'idea-group-props__create-btn';
    this.createBtn.textContent = i18n.t(GRAPHIC_GROUP_CREATE_BLOCK);
    this.createBtn.disabled = true;

    this.createBtn.addEventListener('click', () => {
      const name = this.nameInput?.value.trim();
      if (!name) return;

      const cmd = new CreateCustomBlockCommand({
        doc: ctx.document,
        pageId: ctx.page.id,
        name,
        entries: this.currentSelection,
      });
      ctx.undoRedoManager.push(cmd);

      // Sync registry with the new custom block
      ctx.registry.syncCustomBlocks(ctx.document);
      ctx.eventBus.emit('doc:change');

      showToast({
        message: i18n.t(GRAPHIC_GROUP_CREATE_BLOCK_SUCCESS, { name: cmd.definitionName }),
        type: 'success',
      });

      if (this.nameInput) this.nameInput.value = '';
      if (this.createBtn) this.createBtn.disabled = true;
    });

    panel.appendChild(preview);
    panel.appendChild(inputLabel);
    panel.appendChild(this.nameInput);
    panel.appendChild(this.createBtn);

    return panel;
  }

  private _calcInitialPosition(): { x: number; y: number } {
    const hostRect = this.host.getBoundingClientRect();
    const windowWidth = 320;
    const margin = 16;
    return {
      x: hostRect.width - windowWidth - margin,
      y: margin,
    };
  }
}

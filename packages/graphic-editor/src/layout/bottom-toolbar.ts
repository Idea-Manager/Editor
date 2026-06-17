import type { EventBus } from '@core/events/event-bus';
import type { I18nService } from '@core/i18n/i18n';
import type { ToolId, ToolStateSnapshot } from '../engine/tool-state';
import { createIcon } from '@text-editor/icons/create-icon';
import {
  GRAPHIC_TOOL_SELECTION,
  GRAPHIC_TOOL_FRAME,
  GRAPHIC_TOOL_PEN,
  GRAPHIC_TOOL_STICKER,
  GRAPHIC_TOOL_HAND,
} from '../i18n/keys';

export interface BottomToolbarOptions {
  onToolSelect: (tool: ToolId) => void;
  initialTool?: ToolId;
}

interface ToolDef {
  id: ToolId;
  icon: string;
  labelKey: string;
}

const TOOL_DEFS: ToolDef[] = [
  { id: 'selection', icon: 'arrow_selector_tool', labelKey: GRAPHIC_TOOL_SELECTION },
  { id: 'hand',      icon: 'pan_tool',             labelKey: GRAPHIC_TOOL_HAND },
  { id: 'frame',     icon: 'crop_landscape',       labelKey: GRAPHIC_TOOL_FRAME },
  { id: 'pen',       icon: 'edit',                 labelKey: GRAPHIC_TOOL_PEN },
  { id: 'sticker',   icon: 'sticky_note_2',        labelKey: GRAPHIC_TOOL_STICKER },
];

/**
 * Bottom-centre floating toolbar that shows the tool buttons.
 * Mounted inside the GraphicEditor element, owned by it.
 */
export class BottomToolbar {
  private readonly el: HTMLDivElement;
  private readonly buttons = new Map<ToolId, HTMLButtonElement>();
  private activeTool: ToolId;
  private readonly disposeToolChange: () => void;

  constructor(
    private readonly eventBus: EventBus,
    private readonly i18n: I18nService,
    options: BottomToolbarOptions,
  ) {
    this.activeTool = options.initialTool ?? 'selection';

    this.el = document.createElement('div');
    this.el.className = 'idea-graphic-toolbar idea-graphic-toolbar--bottom';
    this.el.setAttribute('role', 'toolbar');

    for (const def of TOOL_DEFS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'idea-graphic-toolbar__btn';
      btn.setAttribute('data-tool', def.id);
      btn.setAttribute('title', i18n.t(def.labelKey));
      btn.appendChild(createIcon(def.icon));

      if (def.id === this.activeTool) {
        btn.classList.add('is-active');
      }

      btn.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        e.preventDefault();
      });

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        options.onToolSelect(def.id);
      });

      this.buttons.set(def.id, btn);
      this.el.appendChild(btn);
    }

    this.disposeToolChange = eventBus.on<ToolStateSnapshot>('tool:change', (snap) => {
      this._updateActive(snap.tool);
    });
  }

  mount(container: HTMLElement): void {
    container.appendChild(this.el);
  }

  destroy(): void {
    this.disposeToolChange();
    this.el.remove();
  }

  private _updateActive(tool: ToolId): void {
    if (tool === 'placement') return;
    if (tool === this.activeTool) return;
    const prev = this.buttons.get(this.activeTool);
    prev?.classList.remove('is-active');
    this.activeTool = tool;
    const next = this.buttons.get(tool);
    next?.classList.add('is-active');
  }
}

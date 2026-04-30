import type { I18nService } from '@core/i18n/i18n';
import { createIcon } from '@text-editor/icons/create-icon';
import { ColorPicker } from '@shared/components/color-picker';
import type { ColorPickerShowOptions } from '@shared/components/color-picker';
import { createDropdownCombobox } from '@shared/components/dropdown-combobox';
import type { ArrowData, ArrowHeading, ArrowDirection, ArrowType } from '../blocks/arrow/arrow-block';
import {
  GRAPHIC_ARROW_HEADING,
  GRAPHIC_ARROW_HEADING_NONE,
  GRAPHIC_ARROW_HEADING_STROKE,
  GRAPHIC_ARROW_HEADING_FILL,
  GRAPHIC_ARROW_DIRECTION,
  GRAPHIC_ARROW_DIRECTION_NONE,
  GRAPHIC_ARROW_DIRECTION_TO,
  GRAPHIC_ARROW_DIRECTION_FROM,
  GRAPHIC_ARROW_DIRECTION_BOTH,
  GRAPHIC_ARROW_TYPE,
  GRAPHIC_ARROW_TYPE_LINE,
  GRAPHIC_ARROW_TYPE_CURVE,
  GRAPHIC_ARROW_COLOR,
  GRAPHIC_ARROW_THICKNESS,
} from '../i18n/keys';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ArrowToolbarValues = Pick<ArrowData, 'heading' | 'direction' | 'arrowType' | 'color' | 'thickness'>;

export interface FlyoutArrowToolbarConfig {
  i18n: I18nService;
  initialValues: ArrowToolbarValues;
  onChange: (next: Partial<ArrowToolbarValues>) => void;
  onClose?: () => void;
}

// ─── Helper: dropdown button ──────────────────────────────────────────────────

interface DropdownOption<T extends string> {
  value: T;
  icon: string;
  labelKey: string;
}

function buildDropdown<T extends string>(
  options: DropdownOption<T>[],
  current: T,
  title: string,
  onChange: (val: T) => void,
): HTMLDivElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'idea-graphic-flyout-arrow__dropdown';
  wrapper.setAttribute('title', title);

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'idea-graphic-flyout-arrow__dropdown-btn';

  const updateBtn = (val: T) => {
    const opt = options.find(o => o.value === val);
    btn.innerHTML = '';
    if (opt) {
      btn.appendChild(createIcon(opt.icon));
    }
  };

  updateBtn(current);

  const menu = document.createElement('div');
  menu.className = 'idea-graphic-flyout-arrow__dropdown-menu';
  menu.style.display = 'none';

  for (const opt of options) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'idea-graphic-flyout-arrow__dropdown-item';
    item.title = opt.labelKey;
    item.appendChild(createIcon(opt.icon));

    item.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.style.display = 'none';
      updateBtn(opt.value);
      onChange(opt.value);
    });

    menu.appendChild(item);
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = menu.style.display !== 'none';
    menu.style.display = isOpen ? 'none' : 'flex';
  });

  // Close on outside click
  const closeOnOutside = (e: MouseEvent) => {
    if (!wrapper.contains(e.target as Node)) {
      menu.style.display = 'none';
    }
  };
  document.addEventListener('mousedown', closeOnOutside);
  (wrapper as HTMLDivElement & { _cleanup?: () => void })._cleanup = () => {
    document.removeEventListener('mousedown', closeOnOutside);
  };

  wrapper.appendChild(btn);
  wrapper.appendChild(menu);
  return wrapper;
}

// ─── FlyoutArrowToolbar ───────────────────────────────────────────────────────

/**
 * Arrow-specific flyout toolbar shown when an arrow element is selected or when
 * the Arrow button in the BottomToolbar is clicked (defaults mode).
 *
 * Positioned in screen coords via `setPosition`. Append to the graphic editor
 * root element directly (not the SVG).
 */
const colorPickerInstance = new ColorPicker();

export class FlyoutArrowToolbar {
  private readonly el: HTMLDivElement;
  private currentValues: ArrowToolbarValues;
  private readonly i18n: I18nService;
  private readonly onChange: FlyoutArrowToolbarConfig['onChange'];

  // Control references for setValues
  private headingDropdown!: HTMLDivElement;
  private directionDropdown!: HTMLDivElement;
  private typeDropdown!: HTMLDivElement;
  private colorSwatch!: HTMLButtonElement;
  private thicknessComboRoot!: HTMLDivElement;
  private thicknessComboCommit!: () => void;

  constructor(host: HTMLElement, config: FlyoutArrowToolbarConfig) {
    this.i18n = config.i18n;
    this.onChange = config.onChange;
    this.currentValues = { ...config.initialValues };

    this.el = document.createElement('div');
    this.el.className = 'idea-graphic-flyout-arrow';
    this.el.setAttribute('role', 'toolbar');

    this._buildControls();
    host.appendChild(this.el);
  }

  setValues(next: ArrowToolbarValues): void {
    this.currentValues = { ...next };
    // Rebuild to reflect new values (simpler than patching individual controls)
    this.el.innerHTML = '';
    this._buildControls();
  }

  setPosition(p: { x: number; y: number }): void {
    this.el.style.left = `${p.x}px`;
    this.el.style.top = `${p.y}px`;
  }

  destroy(): void {
    // Clean up outside-click listeners on dropdowns
    for (const child of Array.from(this.el.children)) {
      const c = child as HTMLDivElement & { _cleanup?: () => void };
      c._cleanup?.();
    }
    this.el.remove();
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  private _buildControls(): void {
    const { i18n, currentValues, onChange } = this;

    // 1. Heading dropdown
    // none → remove (no arrow head representation), stroke → arrow_outward, fill → arrow_forward
    const headingOptions: DropdownOption<ArrowHeading>[] = [
      { value: 'none', icon: 'remove', labelKey: i18n.t(GRAPHIC_ARROW_HEADING_NONE) },
      { value: 'stroke', icon: 'arrow_outward', labelKey: i18n.t(GRAPHIC_ARROW_HEADING_STROKE) },
      { value: 'fill', icon: 'arrow_forward', labelKey: i18n.t(GRAPHIC_ARROW_HEADING_FILL) },
    ];
    this.headingDropdown = buildDropdown(
      headingOptions,
      currentValues.heading,
      i18n.t(GRAPHIC_ARROW_HEADING),
      (val) => { this.currentValues.heading = val; onChange({ heading: val }); },
    );

    // 2. Direction dropdown
    const directionOptions: DropdownOption<ArrowDirection>[] = [
      { value: 'none', icon: 'horizontal_rule', labelKey: i18n.t(GRAPHIC_ARROW_DIRECTION_NONE) },
      { value: 'to', icon: 'arrow_forward', labelKey: i18n.t(GRAPHIC_ARROW_DIRECTION_TO) },
      { value: 'from', icon: 'arrow_back', labelKey: i18n.t(GRAPHIC_ARROW_DIRECTION_FROM) },
      { value: 'both', icon: 'swap_horiz', labelKey: i18n.t(GRAPHIC_ARROW_DIRECTION_BOTH) },
    ];
    this.directionDropdown = buildDropdown(
      directionOptions,
      currentValues.direction,
      i18n.t(GRAPHIC_ARROW_DIRECTION),
      (val) => { this.currentValues.direction = val; onChange({ direction: val }); },
    );

    // 3. Type dropdown
    const typeOptions: DropdownOption<ArrowType>[] = [
      { value: 'line', icon: 'drag_handle', labelKey: i18n.t(GRAPHIC_ARROW_TYPE_LINE) },
      { value: 'curve', icon: 'gesture', labelKey: i18n.t(GRAPHIC_ARROW_TYPE_CURVE) },
    ];
    this.typeDropdown = buildDropdown(
      typeOptions,
      currentValues.arrowType,
      i18n.t(GRAPHIC_ARROW_TYPE),
      (val) => { this.currentValues.arrowType = val; onChange({ arrowType: val }); },
    );

    // 4. Color button — swatch opens ColorPicker
    const colorWrapper = document.createElement('div');
    colorWrapper.className = 'idea-graphic-flyout-arrow__control';
    colorWrapper.title = i18n.t(GRAPHIC_ARROW_COLOR);

    this.colorSwatch = document.createElement('button');
    this.colorSwatch.type = 'button';
    this.colorSwatch.className = 'idea-graphic-flyout-arrow__color-btn';
    this.colorSwatch.style.backgroundColor = currentValues.color;

      this.colorSwatch.addEventListener('click', (e) => {
      e.stopPropagation();
      const rect = this.colorSwatch.getBoundingClientRect();
      const opts: ColorPickerShowOptions = {
        anchorX: rect.left + rect.width / 2,
        anchorY: rect.bottom + 4,
        initialColor: this.currentValues.color,
        labels: {
          select: i18n.t('colorPicker.select'),
          cancel: i18n.t('colorPicker.cancel'),
        },
        onSelect: (color: string) => {
          this.currentValues.color = color;
          this.colorSwatch.style.backgroundColor = color;
          onChange({ color });
        },
      };
      colorPickerInstance.show(opts);
    });

    colorWrapper.appendChild(this.colorSwatch);

    // 5. Thickness combobox (1–8 px)
    const thicknessWrapper = document.createElement('div');
    thicknessWrapper.className = 'idea-graphic-flyout-arrow__control';
    thicknessWrapper.title = i18n.t(GRAPHIC_ARROW_THICKNESS);

    const thicknessOptions = Array.from({ length: 8 }, (_, i) => ({
      value: String(i + 1) as string,
      label: String(i + 1),
    })) as { value: string; label: string }[];

    const { root: comboRoot, commit } = createDropdownCombobox({
      options: thicknessOptions,
      value: String(currentValues.thickness),
      allowCustomInput: true,
      inputMode: 'integer' as never,
      unit: 'px',
      numericMin: 1,
      numericMax: 8,
      onChange: (val) => {
        const n = Math.max(1, Math.min(8, parseInt(val, 10)));
        if (Number.isFinite(n)) {
          this.currentValues.thickness = n;
          onChange({ thickness: n });
        }
      },
    });

    this.thicknessComboRoot = comboRoot;
    this.thicknessComboCommit = commit;
    thicknessWrapper.appendChild(comboRoot);

    // Assemble toolbar
    const separator = () => {
      const sep = document.createElement('div');
      sep.className = 'idea-graphic-flyout-arrow__sep';
      return sep;
    };

    this.el.appendChild(this.headingDropdown);
    this.el.appendChild(separator());
    this.el.appendChild(this.directionDropdown);
    this.el.appendChild(separator());
    this.el.appendChild(this.typeDropdown);
    this.el.appendChild(separator());
    this.el.appendChild(colorWrapper);
    this.el.appendChild(separator());
    this.el.appendChild(thicknessWrapper);
  }
}

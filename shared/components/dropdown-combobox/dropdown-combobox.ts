export type ComboboxInputMode =
  | 'text'
  | 'number'
  | { pattern: string | RegExp };

export interface DropdownComboboxConfig<T extends string> {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /**
   * Fires on every `input` event with the trimmed value (e.g. live preview while typing).
   * Does not replace `onChange` (still fired on list pick / committed blur/Enter).
   */
  onInput?: (trimmed: string) => void;
  /** When true, the field accepts typed text (subject to `inputMode`). */
  allowCustomInput?: boolean;
  /** How typed input is validated; default is free text. */
  inputMode?: ComboboxInputMode;
  /**
   * Suffix shown to the right of the editable value (e.g. "px"), styled muted and not editable.
   * Omitted = no unit column.
   */
  unit?: string;
  /**
   * When both are set, non-empty `allowCustomInput` values that are integer digit strings
   * are clamped to [numericMin, numericMax] (commit, live `onInput`, and display on commit).
   * Ignored if either is undefined.
   */
  numericMin?: number;
  numericMax?: number;
}

function toRegExp(p: string | RegExp): RegExp {
  return p instanceof RegExp ? p : new RegExp(p);
}

function isValidTypedValue(
  raw: string,
  inputMode: ComboboxInputMode | undefined,
  numericMin?: number,
  numericMax?: number,
): boolean {
  if (raw === '') return false;
  if (numericMin != null && numericMax != null) {
    if (!/^\d+$/.test(raw)) return false;
    return true;
  }
  if (inputMode == null || inputMode === 'text') {
    return true;
  }
  if (inputMode === 'number') {
    if (!/^\d+$/.test(raw)) return false;
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return false;
    if (numericMin != null && n < numericMin) return false;
    if (numericMax != null && n > numericMax) return false;
    return true;
  }
  return toRegExp(inputMode.pattern).test(raw);
}

function nearestOptionValue<T extends string>(
  options: readonly { value: T; label: string }[],
  value: T,
): T {
  return options.some(o => o.value === value) ? value : (options[0]?.value as T) ?? value;
}

/**
 * List + optional editable input; validates typed value against `inputMode` and snaps to last good on failure.
 * When the list is open, it is attached to `document.body` with `position: fixed` so it is not clipped by
 * scrollable parents (e.g. modal bodies).
 */
export type DropdownComboboxResult<T extends string> = {
  root: HTMLDivElement;
  /** Apply the current input (call before actions that need the latest typed value, e.g. when parent uses mousedown on a button). */
  commit: () => void;
};

function clampInt(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function createDropdownCombobox<T extends string>(config: DropdownComboboxConfig<T>): DropdownComboboxResult<T> {
  const {
    options,
    onChange,
    onInput,
    allowCustomInput = false,
    inputMode = 'text',
    unit: unitText,
    numericMin,
    numericMax,
  } = config;
  const hasNumericBounds = numericMin != null && numericMax != null;
  const safeValue = nearestOptionValue(options, config.value);
  const hasUnit = unitText != null && unitText.length > 0;

  const root = document.createElement('div');
  root.className = 'idea-dropdown-combobox';
  if (hasUnit) {
    root.classList.add('idea-dropdown-combobox--with-unit');
  }

  const input = document.createElement('input');
  input.className = 'idea-dropdown-combobox__input';
  input.type = 'text';
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.value = valueShownInField(options, safeValue);
  if (!allowCustomInput) {
    input.readOnly = true;
  }
  if (hasNumericBounds) {
    input.inputMode = 'numeric';
  }

  const wrap = document.createElement('div');
  wrap.className = 'idea-dropdown-combobox__field';
  wrap.appendChild(input);

  if (hasUnit) {
    const el = document.createElement('span');
    el.className = 'idea-dropdown-combobox__unit';
    el.textContent = unitText;
    el.setAttribute('aria-hidden', 'true');
    wrap.appendChild(el);
  }

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'idea-dropdown-combobox__toggle';
  toggle.setAttribute('tabindex', '-1');
  toggle.setAttribute('aria-label', 'Open');
  toggle.textContent = '▾';
  wrap.appendChild(toggle);

  const list = document.createElement('ul');
  list.className = 'idea-dropdown-combobox__list';
  list.hidden = true;
  list.setAttribute('role', 'listbox');

  for (const o of options) {
    const li = document.createElement('li');
    li.className = 'idea-dropdown-combobox__option';
    li.setAttribute('role', 'option');
    li.textContent = o.label;
    li.dataset.value = o.value;
    if (o.value === safeValue) {
      li.classList.add('idea-dropdown-combobox__option--current');
    }
    li.addEventListener('mousedown', (e) => {
      e.preventDefault();
    });
    li.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      selectOption(o.value);
      close();
    });
    list.appendChild(li);
  }

  let current: T = safeValue;
  const inputModeRef = inputMode;

  function fieldValue(v: T): string {
    return valueShownInField(options, v);
  }

  function selectOption(v: T) {
    current = v;
    input.value = fieldValue(v);
    onChange(v);
    list.querySelectorAll('.idea-dropdown-combobox__option').forEach(el => {
      const opt = el as HTMLLIElement;
      opt.classList.toggle('idea-dropdown-combobox__option--current', opt.dataset.value === v);
    });
  }

  function positionList(): void {
    const r = wrap.getBoundingClientRect();
    const gap = 2;
    const spaceBelow = window.innerHeight - r.bottom - gap;
    const maxH = 200;
    list.style.position = 'fixed';
    list.style.left = `${r.left}px`;
    list.style.width = `${r.width}px`;
    list.style.zIndex = '200';
    if (spaceBelow < 80 && r.top > spaceBelow) {
      list.style.top = 'auto';
      list.style.bottom = `${window.innerHeight - r.top + gap}px`;
      list.style.maxHeight = `${Math.min(maxH, Math.max(40, r.top - gap * 2))}px`;
    } else {
      list.style.bottom = 'auto';
      list.style.top = `${r.bottom + gap}px`;
      list.style.maxHeight = `${Math.min(maxH, Math.max(40, spaceBelow))}px`;
    }
  }

  const onScrollOrResize = () => {
    if (!list.hidden) {
      positionList();
    }
  };

  function open() {
    if (list.parentElement !== document.body) {
      document.body.appendChild(list);
    }
    positionList();
    list.hidden = false;
    root.classList.add('idea-dropdown-combobox--open');
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
  }

  function close() {
    list.hidden = true;
    root.classList.remove('idea-dropdown-combobox--open');
    if (list.parentElement === document.body) {
      root.appendChild(list);
    }
    list.style.position = '';
    list.style.top = '';
    list.style.left = '';
    list.style.width = '';
    list.style.right = '';
    list.style.bottom = '';
    list.style.zIndex = '';
    list.style.maxHeight = '';
    window.removeEventListener('scroll', onScrollOrResize, true);
    window.removeEventListener('resize', onScrollOrResize);
  }

  function commitTyped(): void {
    if (!allowCustomInput) return;
    let raw = input.value.trim();
    if (hasNumericBounds && /^\d+$/.test(raw)) {
      raw = String(clampInt(parseInt(raw, 10), numericMin!, numericMax!));
      input.value = fieldValue(raw as T) || raw;
    }
    if (!isValidTypedValue(raw, inputModeRef, numericMin, numericMax)) {
      input.value = fieldValue(current);
      return;
    }
    const byLabel = options.find(o => o.label === raw);
    if (byLabel) {
      selectOption(byLabel.value);
      return;
    }
    const byVal = options.find(o => o.value === (raw as T));
    if (byVal) {
      selectOption(byVal.value);
      return;
    }
    if (options.some(o => o.value === (raw as T))) {
      selectOption(raw as T);
    } else {
      onChange(raw as T);
      current = raw as T;
    }
  }

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    if (list.hidden) open();
    else close();
  });

  input.addEventListener('click', (e) => {
    e.stopPropagation();
    if (input.readOnly) open();
  });

  input.addEventListener('focus', () => {
    if (input.readOnly) open();
  });

  if (allowCustomInput) {
    input.addEventListener('input', () => {
      const t = input.value.trim();
      if (hasNumericBounds && t.length > 0 && /^\d+$/.test(t)) {
        const n = parseInt(t, 10);
        const c = clampInt(n, numericMin!, numericMax!);
        const canonical = String(c);
        const display = valueShownInField(options, canonical as T) ?? canonical;
        if (t !== display) {
          input.value = display;
          const end = input.value.length;
          requestAnimationFrame(() => {
            try {
              input.setSelectionRange(end, end);
            } catch {
              /* some browsers if not focused */
            }
          });
        }
        onInput?.(canonical);
      } else {
        onInput?.(t);
      }
    });
  }

  input.addEventListener('blur', () => {
    if (allowCustomInput) {
      commitTyped();
    }
    requestAnimationFrame(() => close());
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      input.value = fieldValue(current);
      close();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      commitTyped();
      (e.target as HTMLInputElement).blur();
    }
  });

  const onDoc = (e: MouseEvent) => {
    const t = e.target as Node;
    if (root.contains(t) || list.contains(t)) {
      return;
    }
    close();
  };
  document.addEventListener('mousedown', onDoc, true);

  root.appendChild(wrap);
  root.appendChild(list);

  return {
    root,
    commit: () => {
      if (allowCustomInput) {
        commitTyped();
      }
    },
  };
}

function valueShownInField<T extends string>(
  options: readonly { value: T; label: string }[],
  v: T,
): string {
  return findLabel(options, v) ?? v;
}

function findLabel<T extends string>(
  options: readonly { value: T; label: string }[],
  v: T,
): string | undefined {
  return options.find(o => o.value === v)?.label;
}

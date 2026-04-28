# Prompt 12 — Floating properties window + per-block style memory

> Read [`prompts/00-INDEX.md`](./00-INDEX.md) first.
>
> Depends on prompts 03, 06, 07.

## Goal

Build the `FloatingPropertiesWindow` driven by the current selection, plus a
small `StyleMemoryService` that persists the last-used visual properties per
block type into `DocumentNode.data.graphicPreferences` (already typed in
prompt 01). New blocks of the same type inherit those preferences.

## Files to add / change

```
packages/graphic-editor/src/properties/
  floating-properties-window.ts
  floating-properties-window.scss
  property-renderers/
    border-property.ts            # thickness combobox + color picker
    background-property.ts
    fill-property.ts
    text-color-property.ts
    font-size-property.ts
    text-property.ts              # mirrors the inline contenteditable input
    pivots-property.ts
    html-template-property.ts
    custom-property.ts
  __tests__/
    floating-properties-window.test.ts
    property-renderers.test.ts
packages/graphic-editor/src/preferences/
  style-memory-service.ts
  update-preferences-command.ts
  __tests__/style-memory-service.test.ts
  __tests__/update-preferences-command.test.ts
```

`AddElementCommand` (prompt 05) is extended to consult `StyleMemoryService`
when no `dataOverride` is provided. Update its tests.

## `FloatingPropertiesWindow`

```ts
export interface FloatingPropertiesWindowConfig {
  i18n: I18nService;
  ctx: GraphicContext;
  /** Used to position the window initially within the canvas. */
  hostSelector: string;
  /** Called when the user clicks the close icon or the selection becomes empty. */
  onClose?: () => void;
  /** Called whenever the focused state changes (for highlight ring on the block). */
  onFocusedTargetChange?: (targetId: string | null) => void;
}

export class FloatingPropertiesWindow {
  constructor(host: HTMLElement, config: FloatingPropertiesWindowConfig);
  open(node: GraphicElement): void;
  setNode(node: GraphicElement): void;     // re-render contents on data change
  close(): void;
  destroy(): void;
}
```

It composes a `FloatingWindow` (prompt 03) and an `Accordion` (prompt 02)
inside.

### Layout

`FloatingWindow` configuration:

- title: `i18n.t(definition.labelKey)` (e.g. "Rectangle").
- min width 300px, min height computed from content, max width = half
  parent, max height = parent height − some padding (use the `parentSelector`
  config), all already enforced by prompt 03.
- Initial position: top-right corner of the canvas, offset by
  `$spacing-md`.
- `onFocusedTargetChange` from `FloatingWindow` is forwarded; the
  selection-manager uses it to draw a `$color-graphic-selection` outline
  around the target element while the window is focused. (The
  selection-manager already draws a dashed black ring; on focus add a
  secondary 2px solid ring with `$color-graphic-selection` and 50% alpha.)

Inside the window, an `Accordion` is built from the selected block's
`definition.properties(node, ctx)`. Each property kind maps to a renderer:

| `kind`         | Renderer                                                                                                            |
| -------------- | ------------------------------------------------------------------------------------------------------------------- |
| `htmlTemplate` | Wraps the supplied `element`. Always rendered FIRST (per roadmap).                                                  |
| `border`       | Two-row group: thickness `dropdown-combobox` (1..8 px) + colour picker.                                             |
| `background`   | Colour picker.                                                                                                      |
| `fill`         | Colour picker. (For path block, label is "Color".)                                                                  |
| `textColor`    | Colour picker.                                                                                                      |
| `fontSize`     | `dropdown-combobox` with `numericMin`/`numericMax`/`unit` from the property spec; predefined options.               |
| `text`         | Single-line input bound bidirectionally to the element's text overlay.                                              |
| `pivots`       | Read-only display of the pivot list (icons), `readonly: true` only.                                                 |
| `custom`       | Insert the supplied `element` as the panel body.                                                                    |

Each renderer:

- Reads its initial value via `getAtPath(node.data, path)`.
- Wires its `onChange` to push `new UpdateElementCommand({ ... mergeWindowMs: 400 })`.
- After every successful update, also call `styleMemory.recordUpdate(blockType, path, value)`.

The accordion items are titled with i18n keys from `graphic.props.<kind>`
(e.g. `graphic.props.border`).

### Refresh on doc change

The window subscribes to `'element:update'` filtered by `node.id` to call
`setNode(updatedNode)` and re-render the controls. Take care to preserve
focus (e.g. while typing in the text input). Strategy: only re-bind values
that didn't originate from this window's controls. Use a small "in-flight
edits" map keyed by path.

### Show / hide

The graphic editor maintains a single `FloatingPropertiesWindow` instance
per page and:

- Opens it when selection becomes a single non-arrow element (listen to
  `'selection:change'`). The roadmap says: "After element is placed on main
  content area, it should be selected and properties window should be
  opened" — placement controller already selects; this listener shows.
- For multi-selection, prompt 13 takes over (group window).
- Closes (or hides) it when selection becomes empty or contains an arrow
  (arrow uses FlyoutArrowToolbar instead, prompt 11).

### Roadmap-specific bits

- **Sticker text bidirectional sync**: when the sticker block is selected,
  the `text` property's input is bound to the same `data.text` path that
  the in-canvas contenteditable also writes. Both fire
  `UpdateElementCommand` with the same path; the merging window means a
  burst on one side does not break the other. Test that typing in either
  the canvas overlay or the property input keeps both values in lockstep.
- **HTML-template panel first**: blocks that supply
  `properties` returning a `kind: 'htmlTemplate'` render that panel ABOVE
  every other panel.
- **Disable default input**: the roadmap mentions blocks that opt out of
  the default text input. We expose this via a flag on the block
  definition — add `supportsDefaultText?: boolean` (default `true`) to
  `GraphicBlockDefinition`. When `false`, the text overlay is not rendered
  and the `text` property panel is omitted by default. This is used by
  future blocks; built-ins keep the default.

## `StyleMemoryService`

```ts
export class StyleMemoryService {
  constructor(doc: DocumentNode, undoRedoManager: UndoRedoManager);

  /** Returns merged defaults for a block type: registry default ⊕ saved prefs. */
  getEffectiveDefaults(blockType: string, registry: GraphicBlockRegistry): Record<string, unknown>;

  /** Records an update; pushed as a single coalescing UpdatePreferencesCommand. */
  recordUpdate(blockType: string, path: string, value: unknown): void;
}
```

Behaviour:

- Reads from `getGraphicPreferences(doc)` (prompt 01 helper).
- Skips paths under `data.text` (and any paths inside an HTML template — the
  block can override by listing `htmlTemplate` props with paths under
  `data.template`; treat any path beginning with `data.template.` as
  non-persistable).
- Coalesces consecutive updates of the same `blockType + path` within 1
  second (similar to the `merge` window in element commands).

## `UpdatePreferencesCommand`

```ts
class UpdatePreferencesCommand implements Command {
  constructor(input: { doc: DocumentNode; blockType: string; path: string; value: unknown });
}
```

- Sets `data.graphicPreferences[blockType][path] = value` immutably.
- Single `node:update` op with `nodeId: doc.id` and `path:
  'data.graphicPreferences.<blockType>.<path>'`.
- Subsumes prompt 11's provisional `SetArrowDefaultsCommand`. After
  shipping this prompt, replace `SetArrowDefaultsCommand` references with
  `UpdatePreferencesCommand({ blockType: 'arrow', ... })` and delete the
  provisional file.

## `AddElementCommand` integration

When `dataOverride` is undefined, the command consults
`styleMemory.getEffectiveDefaults(type, registry)` and merges the result
over `definition.defaultData()`. When `dataOverride` is supplied (e.g. by
the placement controller passing `{ x, y }`), the order is:

```
defaultData ⊕ savedPrefs ⊕ dataOverride
```

Position fields (`x`, `y`, plus `width`/`height` if present) are NEVER
read from saved prefs — even if a user accidentally edits one through
the floating window the resulting `recordUpdate` is rejected by
`StyleMemoryService` for the path keys `x`, `y`, `width`, `height`. (Sizes
are intentionally not persisted across kinds; the user usually wants the
default size for new blocks.) Document this in `style-memory-service.ts`
as a constant `NON_PERSISTABLE_PATHS = new Set(['x','y','width','height','points','from','to','bounds'])`.

## Property renderer requirements

- Use existing shared components only:
  `shared/components/color-picker`, `shared/components/dropdown-combobox`.
- Layout per panel: a label row at the top, controls below, both
  full-width inside the accordion item body.
- Property inputs MUST debounce or use the merge window so dragging a
  hex slider doesn't spam the operation log.
- Colour picker `onSelect` returns `rgba(...)` strings; persist exactly
  what's returned. Renderers should accept legacy hex too.

## i18n keys (en + uk)

```
graphic.props.window.title    {label}
graphic.props.window.close    Close
graphic.props.text            Text
graphic.props.text.placeholder  Type something…
graphic.props.htmlTemplate    Template
graphic.props.pivots          Pivot points
graphic.props.color           Color
graphic.props.thickness       Thickness
```

(Plus the keys already added by prompt 06.)

## Tests

- `floating-properties-window.test.ts`:
  - opens on single-element selection, closes when selection empties;
  - sticker-text two-way sync with the canvas overlay;
  - htmlTemplate panel rendered first when present;
  - changing a property pushes an `UpdateElementCommand` AND records to
    `StyleMemoryService`.
- `property-renderers.test.ts` per renderer: read initial value, fire
  `onChange` updates the model, debounce/merge respected.
- `style-memory-service.test.ts`: get effective defaults composition,
  record/skip rules for `NON_PERSISTABLE_PATHS`, coalescing window.
- `update-preferences-command.test.ts`: execute/undo, immutable update,
  correct op record.
- Update `add-element-command.test.ts`: prefers preferences over defaults
  when no override; `dataOverride` always wins.

## Don'ts

- **Do not** open the floating window for arrow selections.
- **Do not** persist text content / HTML form fields (`data.text`,
  template field values) into preferences — only visual prefs.
- **Do not** reach into another block's data shape from the renderer; only
  read/write through the `path` strings declared by the block.

## Acceptance criteria

- `npm test` green.
- `npm run build` succeeds.
- Manual:
  - Place a rectangle, change its border to 3px red — confirm the canvas
    rect updates live.
  - Place another rectangle — its border is 3px red.
  - Place a circle — its border is also 3px red (per-type prefs are
    independent; if you confirm circles use a separate slot then this is
    expected because circle hadn't been edited yet).
  - Edit the same rectangle in the floating window WHILE typing in the
    sticker text input on a different sticker — both edits remain
    independent and the floating window doesn't lose focus on bus events.

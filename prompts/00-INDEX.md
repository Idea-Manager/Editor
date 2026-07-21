# Graphic Editor — Prompt Index & Shared Context

> This folder contains a sequence of standalone prompts. Each prompt is meant to
> be pasted into a fresh agent session. Every prompt **starts** by saying
> "Read `prompts/00-INDEX.md` first, then carry out the task in
> `prompts/NN-…md`." That lets one agent at a time make a focused change without
> needing the full prior history in its context window.
>
> Roadmap source of truth: [`Graphic_Editor_Roadmap.md`](../Graphic_Editor_Roadmap.md).

---

## 1. Project context (read first, every prompt)

### Repository

- Repo root: `/Users/fedirm/Documents/Projects/IdeaEditor`. TypeScript monorepo. Strict TS.
- Path aliases (`tsconfig.json`, `webpack/webpack.common.js`, `jest.config.js` all in sync):
  - `@core/*` → `packages/core/src/*`
  - `@text-editor/*` → `packages/text-editor/src/*`
  - `@graphic-editor/*` → `packages/graphic-editor/src/*` *(reserved; created by prompt 04)*
  - `@ui/*` → `packages/ui/src/*` *(reserved; not used by this work)*
  - `@shared/*` → `shared/*`
- Scripts: `npm run dev`, `npm run build`, `npm test`, `npm run check:text-editor-imports`, `npm run docs:dev`.

### Always-applied workspace rules (from `.cursor/rules/`)

- **`g_styles.mdc`**: every `.scss` file (except `_variables.scss` and `_base.scss`) MUST begin with `@use '<relative>/styles/variables' as *;`. Use only tokens from `src/styles/_variables.scss`. Monochrome (`$gray-{50..900}`, `$black`, `$white`, semantic tokens). The only color exceptions are `$color-error`, `$color-error-dark`, `$color-success-dark`. Component-specific pixel values (radii, widths, heights) are allowed inline when not part of the global scale.
- **`g_i8n.mdc`**: every user-visible string goes through `I18nService.t()`. Add new keys to BOTH `packages/core/src/i18n/locales/en.ts` AND `uk.ts`. Use a `graphic.*` namespace for graphic-editor strings.
- **`g_multi-editing.mdc`**: keep designs compatible with future multi-editing / CRDT collaboration. Don't introduce single-user-only assumptions where a small abstraction would keep the door open.
- **`g_lumora.mdc`**: a Lumora MCP server is available (tools like `lumora.file_outline`, `lumora.search_files`, `lumora.list_directory`, `lumora.symbol_definitions`, etc.). Prefer Lumora over re-reading large files for code/structure questions to save tokens.
- **`c_icon.mdc`**: use Material Symbols Outlined via `createIcon(name)` (re-exported from `@text-editor/icons/create-icon`; the demo helper at `src/util/icon.ts`). Do NOT create raw SVGs without explicit user approval — ask first if a glyph is missing.

### Document model (already shipped — do not change shape)

`packages/core/src/model/interfaces.ts`:

```ts
DocumentNode {
  id; type:'document'; schemaVersion; data: Record<string, unknown>;
  children: BlockNode[]; graphicPages: GraphicPageNode[]; assets: AssetMap; meta?;
}
GraphicPageNode {
  id; name; elements: GraphicElement[]; frames: FrameElement[];
  viewport: { x; y; zoom };
}
GraphicElement<TData> { id; type: string; frameId?: string; data: TData; meta?; }
FrameElement {
  id; name;
  data: { x, y, width, height, background, clipContent, showLabel, labelFontSize };
  childElementIds: string[]; meta?;
}
```

Schema root has `additionalProperties: false`, **but** `DocumentNode.data` is `type: object` with no key restrictions — so additive document-level state (custom blocks, style memory) goes there, not at the root.

ID prefixes (`packages/core/src/id/index.ts`): `doc | blk | txt | el | frm | page | op | row | cell | conn`. Use:

- `el` → `GraphicElement` for shapes, stickers, paths.
- `conn` → `GraphicElement` for arrows (connectors).
- `frm` → `FrameElement`.
- `op` → `OperationRecord`.

### Commands & history (use, do not duplicate)

`packages/core/src/commands/command.ts`:

```ts
interface Command {
  readonly operationRecords: OperationRecord[];
  execute(): void;
  undo(): void;
  merge?(next: Command): boolean;
}
```

Pushed via `UndoRedoManager.push(cmd)` (`packages/core/src/history/undo-redo-manager.ts`). `OperationRecord` types in `packages/core/src/operation-log/interfaces.ts` (`node:insert/delete/update/move`, `text:insert/delete`).

For granular updates use `node:update` with `path` like `data.fill`, `data.x`, etc. — never overwrite the whole `data` blob in one op when a single field changed.

Reference command for shape/conventions: `packages/text-editor/src/engine/commands/insert-block-command.ts`.

### Events (already declared; reuse — do not add new union members lightly)

`packages/core/src/events/event-bus.ts` already includes:
`doc:change | doc:save | mode:change | selection:change | block:insert | block:delete | block:update | element:add | element:remove | element:update | frame:add | frame:remove | frame:update | history:push | history:undo | history:redo | operation:local | operation:remote | table:range-select-end | table:range-ui`.

If a new event is genuinely needed (e.g. `tool:change`, `viewport:change`), add it to this union; otherwise reuse the existing ones.

### Shared components (reuse)

`shared/components/`:

- `modal/` — centered dialog with backdrop.
- `color-picker/` — HSV + alpha, returns `rgba(...)`/hex. `ColorPicker.show({ anchorX, anchorY, initialColor, labels: { select, cancel }, onSelect })`.
- `dropdown-combobox/` — `createDropdownCombobox({ options, value, onChange, allowCustomInput, inputMode, unit, numericMin, numericMax })`.
- `toast/` — `showToast({ message, type, duration })`.

Two more components are added by prompts 02 and 03:

- `accordion/`
- `floating-window/`

### Style tokens (reuse, do not hardcode colors)

`src/styles/_variables.scss`:

- `$gray-{50,100,200,300,400,500,600,700,800,900}`, `$black`, `$white`.
- Semantic: `$color-primary`, `$color-primary-hover`, `$color-bg`, `$color-bg-subtle`, `$color-text`, `$color-text-secondary`, `$color-placeholder`, `$color-border`, `$color-selection`, `$color-focus-ring`.
- Status: `$color-error`, `$color-error-dark`, `$color-success-dark`.
- `$font-family-base`, `$font-family-mono`, `$font-size-{xs,sm,base,lg,xl}`.
- Spacing: `$spacing-{xs,sm,md,lg,xl}`.

If you need a new token (e.g. `$color-graphic-selection: #2563eb`), add it to `_variables.scss` first.

Effects: use `rgba($black, …)` — never `rgba(0,0,0, …)`.

### Coordinate system (graphic-editor convention)

- Element coordinates are in **world** (document) space. Stored on `GraphicElement.data.x` / `.y` (and `.width` / `.height` for shapes; per-block schemas defined by each `GraphicBlockDefinition`).
- The renderer draws into an SVG `<g class="graphic-canvas__world">` and a DOM `.graphic-canvas__overlay` that share the same transform: `translate(-vp.x * vp.zoom, -vp.y * vp.zoom) scale(vp.zoom)`.
- Mouse coords are converted via `clientToWorld(clientX, clientY): {x, y}` on the viewport controller.

### Persistence convention (decided)

Place these under `DocumentNode.data` (round-trips through `DocumentSerializer` already):

```ts
data.graphicPreferences?: Record<string /* blockType */, Partial<GraphicElement['data']>>;
data.customBlocks?: CustomBlockDefinition[];
```

Where `CustomBlockDefinition` describes a user-created block as a deep-cloned group of elements (with placeholder IDs) plus a name and source group bounds. Defined in prompt 01.

### Mode integration (decided, future-proof)

- This work adds a **standalone Graphic mode**. `src/layout/top-bar.ts` gains a Text/Graphic segmented control; `src/layout/app-shell.ts` mounts both editors and shows the active one.
- The `GraphicEditor` engine is host-agnostic (takes a `DocumentNode` reference and a `pageId`). A later "Frame block" in the text editor will mount the same `GraphicEditor` inside a text block — design APIs accordingly.

### Rendering technology (decided)

- **SVG + DOM overlay hybrid.**
- Shapes (rect/triangle/circle/ellipse), arrows, and pen paths are SVG inside a single `<svg>` root with one transformed `<g>` "world" group.
- Sticker text, optional HTML templates inside blocks, resize handles, edge arrow handles, lasso rectangle, and the bottom-right zoom panel live as DOM in an absolutely-positioned overlay layer that mirrors the same transform (overlay handles use **screen-space** sizes, e.g. 6px circles, regardless of zoom).

### Frame tool semantics (decided)

- Drag on canvas to create a `FrameElement`. On commit, every existing `GraphicElement` whose AABB *intersects* the frame's AABB (any overlap, even partial) is auto-attached: set `element.frameId = frame.id` and append `element.id` to `frame.childElementIds`. Same rule applies to elements created later inside the frame.
- A frame is itself a "viewport" you can later use to copy a region into a text-editor frame block. Moving a frame translates all its child elements by the same delta.

### Pen tool (decided)

- Freehand only for now. Each stroke is one `GraphicElement` of `type: 'path'`, data `{ points: { x, y }[], stroke, strokeWidth, ... }`. Implemented in prompt 10.

---

## 2. Prompt sequence

Run in this order. Within each phase, prompts can be parallelised where the
"Depends on" list allows it. Each `NN-…md` file is a complete brief; agents
should not need to read sibling prompts.

### Phase A — foundations

| #   | File                                        | Depends on | Summary                                                                                          |
| --- | ------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------ |
| 01  | `01-core-data-extensions.md`                | —          | Extend `@core` with typed graphic preferences and custom-blocks accessors. No UI.                |
| 02  | `02-shared-accordion.md`                    | —          | Reusable `Accordion` in `shared/components/accordion/`.                                          |
| 03  | `03-shared-floating-window.md`              | —          | Reusable `FloatingWindow` in `shared/components/floating-window/`.                               |

### Phase B — graphic-editor scaffold

| #   | File                                        | Depends on | Summary                                                                                          |
| --- | ------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------ |
| 04  | `04-graphic-editor-scaffold.md`             | 01         | Create the package: `GraphicEditor` HTMLElement, `GraphicContext`, viewport controller, SVG+DOM canvas with dotted bg, wheel-zoom + zoom panel. |
| 05  | `05-block-registry-and-element-commands.md` | 04         | `GraphicBlockDefinition`, `GraphicBlockRegistry`, element commands (Add/Remove/Update/Move).      |
| 06  | `06-default-blocks-and-sticker.md`          | 05         | Rectangle / Triangle / Circle / Ellipse + Sticker block definitions and renderers.               |

### Phase C — interaction & tools

| #   | File                                        | Depends on | Summary                                                                                          |
| --- | ------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------ |
| 07  | `07-selection-handles-lasso.md`             | 06         | Selection manager, dashed bounding rect, 6px corner resize circles, edge arrow handles, drag handle, lasso, Delete/Backspace. |
| 08  | `08-bottom-toolbar-tool-state.md`           | 07         | Bottom toolbar (icons), tool state machine, ghost placement from left-panel click, ESC cancel.   |
| 09  | `09-frame-tool-and-attachment.md`           | 08         | Add/Remove/Update Frame commands, AttachToFrame / DetachFromFrame, intersect-on-create logic, frame translation moves children. |
| 10  | `10-pen-tool-freehand.md`                   | 08         | Freehand pen → `path` GraphicElement, smoothing, AddPathCommand.                                 |
| 11  | `11-arrow-tool-and-flyout-toolbar.md`       | 08         | Arrow element, arrow tool, FlyoutArrowToolbar, arrow editing (drag endpoint, double-click label).|

### Phase D — properties & block lifecycle

| #   | File                                        | Depends on | Summary                                                                                          |
| --- | ------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------ |
| 12  | `12-floating-properties-and-style-memory.md`| 03,06,07   | `FloatingPropertiesWindow` driven by selection; per-block-type style memory persisted in `data.graphicPreferences`. |
| 13  | `13-group-window-and-custom-blocks.md`      | 12         | Multi-select group window (Lock/Group/Create new block); `customBlocks` store; sticky Custom accordion in left panel. |
| 14  | `14-left-panel-block-library.md`            | 02,13      | Left panel: scrollable accordions of block groups + sticky Custom; click-to-place wiring.        |

### Phase E — app integration & docs

| #   | File                                        | Depends on | Summary                                                                                          |
| --- | ------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------ |
| 15  | `15-mode-toggle-app-shell.md`               | 14         | Text/Graphic segmented control in `top-bar`, AppShell mounts both editors, shortcut scope flips. |
| 16  | `16-docs-and-i18n-finalize.md`              | 15         | Rewrite `website/docs/graphic-editor/*`, add architecture page, audit `graphic.*` keys, smoke tests pass. |

---

## 3. House rules every prompt must follow

1. **Use Lumora MCP** for code lookups. Don't `cat` huge files; use `lumora.file_outline`, `lumora.symbol_definitions`, `lumora.search_files` first.
2. **Add tests** for non-trivial logic (commands, registry, utilities). Use the existing Jest config (jsdom for any package that touches the DOM). Co-locate under `__tests__/` next to the code, like `packages/text-editor/src/blocks/__tests__/`.
3. **Run `npm test`** at the end. If you touched the text editor's tree, also `npm run check:text-editor-imports`.
4. **Don't break existing public APIs.** No breaking changes to `@core` types; only additive optional fields. No breaking changes to `DocumentSerializer`/`DocumentDeserializer`/`document.schema.json`.
5. **No `any`** unless commented and justified.
6. **No raw hex / rgba** — go through `_variables.scss`. Add new tokens there if needed.
7. **Strings via `I18nService.t()`** with keys in both `en.ts` and `uk.ts`. Namespace `graphic.*`.
8. **Icons** are Material Symbols Outlined. Use `createIcon('icon_name')`.
9. **Be additive**. Don't refactor unrelated code.
10. **Do not import from `src/` inside `packages/graphic-editor/`** (mirroring the text-editor import-guard rule). The graphic editor should be a self-contained package; only `@core/*`, `@shared/*`, and its own `@graphic-editor/*` are allowed inside the package.

---

## 4. Naming conventions used across prompts

- Engine-level types: `GraphicEditor`, `GraphicContext`, `GraphicRenderContext`, `GraphicSelectionManager`, `ViewportController`.
- Block plugin: `GraphicBlockDefinition<TData>`, `GraphicBlockRegistry`.
- Commands: `AddElementCommand`, `RemoveElementCommand`, `UpdateElementCommand` (granular field path), `MoveElementCommand`, `AddFrameCommand`, `RemoveFrameCommand`, `UpdateFrameCommand`, `AttachToFrameCommand`, `DetachFromFrameCommand`, `AddArrowCommand`, `UpdateArrowEndpointCommand`, `AddPathCommand`, `MoveSelectionCommand`, `ResizeElementCommand`.
- DOM class names use the `idea-graphic-` prefix to match the existing `idea-` convention (e.g. `idea-graphic-canvas`, `idea-graphic-canvas__world`, `idea-graphic-toolbar`, `idea-graphic-floating-window`, `idea-graphic-block--rectangle`).
- i18n keys: `graphic.tool.<tool>`, `graphic.block.<kind>`, `graphic.props.<field>`, `graphic.group.<action>`, `graphic.zoom.<action>`, `graphic.arrow.<field>`, `graphic.confirm.*`, etc.

---

## 5. What "done" looks like for the whole sequence

Running `npm run dev` should produce:

- A working IdeaEditor where the top bar has a Text / Graphic toggle.
- Text mode: same as today.
- Graphic mode: dotted-grid canvas, left panel with one default group ("Shapes") containing Rectangle / Triangle / Circle / Ellipse, sticky empty "Custom" accordion, bottom toolbar with Selection / Frame / Arrow / Pen / Sticker tools, bottom-right zoom panel, mouse-wheel zoom and pan.
- Click a shape in the left panel → ghost preview follows cursor → click on canvas places it → selected → floating properties window opens.
- Property edits (border, bg, fill, text color, font size) persist as the new "last-used" preference, so creating another shape uses the same style.
- Multi-select via lasso → group floating window with Lock / Group / Create new block. Creating a custom block adds it to the sticky Custom accordion.
- Frame tool draws a frame; existing intersecting elements are auto-attached; moving the frame moves them together.
- Arrows: arrow tool draws a connector with chosen heading/direction/type/color/thickness; clicking an arrow opens the FlyoutArrowToolbar above it; double-click adds a label; dragging an endpoint reattaches.
- Pen tool draws freehand strokes.
- Undo / redo work for every action above.
- All strings localised (en + uk).
- `npm test` green.
- Docs site reflects the new state under `website/docs/graphic-editor/`.

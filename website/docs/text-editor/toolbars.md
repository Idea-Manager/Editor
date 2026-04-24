---
sidebar_position: 3
---

# Toolbars and menus

Customize slash palette, floating toolbar, block gutter, table context menu, and link hover UI via **`TextEditorOptions.toolbars`**. Omit the field for the default layout and behavior.

## Shape

```ts
editor.init(doc, eventBus, undoRedoManager, {
  toolbars: {
    slashPalette: { /* … */ },
    floatingToolbar: { /* … */ },
    blockGutter: { /* … */ },
    tableContextMenu: { /* … */ },
    linkHover: { /* … */ },
    // Optional factories (see below)
  },
});
```

Every toolbar instance must implement **`destroy()`**. The editor calls it from `disconnectedCallback`. Built-in classes also expose **`isVisible()`** where relevant (`FloatingToolbar`, `SlashPalette`).

## Factories (escape hatch)

For each surface you may provide a **factory** instead of the default class. The factory receives the same dependencies the built-in constructor uses (see types in `@text-editor`). Return an object with at least **`destroy()`**.

| Key | Replaces |
| --- | -------- |
| `slashPaletteFactory` | `SlashPalette` |
| `floatingToolbarFactory` | `FloatingToolbar` |
| `blockGutterFactory` | `BlockGutter` |
| `tableContextMenuFactory` | `TableContextMenu` |
| `linkHover.factory` | `LinkHoverPopover` |

If you use **`blockGutterFactory`**, the editor only calls **`setSlashPalette`** on the default **`BlockGutter`** implementation. Custom gutters must wire the shared slash palette themselves if needed.

## Slash palette (`slashPalette`)

- **`excludeTypes`** — Passed to `getPaletteItems` when `show()` is called without a per-call override.
- **`filterItems(items)`** — Post-process palette rows after registry resolution.
- **`maxHeightPx`** — Scrollable list when set.

## Floating toolbar (`floatingToolbar`)

Merged with defaults via **`mergeFloatingToolbarConfig`** (exported from `@text-editor`).

- **`sections`** — Booleans: `marks`, `color`, `link`, `align`, `blockConvert`.
- **`convertibleBlockTypes`** — Block kinds that get the “turn into …” dropdown (default: `paragraph`, `heading`, `list_item`).
- **`extraButtons`** — `{ id, icon, titleKey, isActive?(ctx), onClick(ctx) }` appended after built-in controls.

Use **`floatingToolbarFactory(deps, config)`** to supply a completely custom overlay; `deps` is `{ ctx, host, selectionSync? }`.

## Block gutter (`blockGutter`)

- **`showAddButton`**, **`showDragHandle`**, **`showDeleteButton`** — Default `true`.
- **`confirmRemoveMessageKey`** — Optional i18n key for delete confirmation body (default `gutter.confirmRemoveMessage`).

## Table context menu (`tableContextMenu`)

All flags default **`true`**:

- **`showRowOperations`**, **`showColumnOperations`**, **`showMergeCells`**
- **`showCellBorders`**, **`showCellBackground`**

## Link hover (`linkHover`)

- **`disabled: true`** — No link hover popover is created.
- **`factory(ctx)`** — Custom link UX; must return `{ destroy() }`.

## Types

Import **`TextEditorToolbarsOptions`** and related config types from **`@text-editor`** (see `packages/text-editor/src/toolbar/toolbar-options.ts`).

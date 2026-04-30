---
sidebar_position: 6
---

# Properties

When you select an element on the canvas, its **Floating Properties Window** appears. When multiple elements are selected, the **Group Properties Window** appears instead.

## Property kinds

Property renderers live in `packages/graphic-editor/src/properties/property-renderers/`. Each renderer corresponds to one _kind_ of editable property:

| Kind | Renderer file | What it edits |
| ---- | ------------- | ------------- |
| `fill` | `fill-property.ts` | Fill color (color picker) |
| `border` | `border-property.ts` | Border color + thickness |
| `background` | `background-property.ts` | Background color |
| `textColor` | `text-color-property.ts` | Text color |
| `fontSize` | `font-size-property.ts` | Font size (numeric input) |
| `pivots` | `pivots-property.ts` | Rotation pivot point selector |
| `htmlTemplate` | `html-template-property.ts` | Custom HTML template field |
| `custom` | `custom-property.ts` | Arbitrary key/value pair |

A block definition advertises which properties it exposes by returning a `PropertyDefinition[]` from its optional `properties()` method:

```ts
interface PropertyDefinition {
  kind: 'fill' | 'border' | 'background' | 'textColor' | 'fontSize' | 'pivots' | 'htmlTemplate' | 'custom';
  /** Dot-notation path into the element object, e.g. 'data.fill' */
  path: string;
  /** Whether changes to this path are remembered as style defaults. */
  persistable?: boolean;
}
```

## The path-based update flow

When a user changes a property value, the renderer calls the editor's update callback with the `path` and new value. The editor creates an `UpdateElementCommand`:

```
user input → property renderer → UpdateElementCommand(elementId, path, newValue)
           → UndoRedoManager.execute()
           → OperationLog.append(operationRecords)
           → CanvasRenderer.render() (re-renders the element)
```

See [Commands](../concepts/commands.md) for the full command pattern and [Operation log](../concepts/operation-log.md) for how records are stored.

## Style memory

`StyleMemoryService` remembers the last used style values for each `persistable` property path, scoped to block type. The next time you place a block of the same type, its default data is merged with the style memory.

This lets you draw five rectangles in a row with the same border color without re-selecting it each time.

Non-persistable paths (e.g. `data.text`, `data.label`, `data.pivots`) are always reset to their `defaultData()` values on new placements.

## Property window behaviour

- **Floating Properties Window** (`FloatingPropertiesWindow`) is draggable and resizable. It shows when exactly one element is selected. It collapses when the selection is cleared and re-populates when a new element is selected.
- **Group Properties Window** (`GroupPropertiesWindow`) shows when two or more elements are selected. It provides group/lock controls and the custom-block creation UI.

Both windows use the shared `FloatingWindow` component from `shared/components/floating-window/`.

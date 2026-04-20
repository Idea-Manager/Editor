import type { TableData, TableCell } from '@core/model/interfaces';

export type BorderSide = 'borderTop' | 'borderRight' | 'borderBottom' | 'borderLeft';

function findCellGridPosition(data: TableData, cellId: string): { row: number; col: number } | null {
  for (let r = 0; r < data.rows.length; r++) {
    for (let c = 0; c < data.rows[r].cells.length; c++) {
      if (data.rows[r].cells[c].id === cellId) {
        return { row: r, col: c };
      }
    }
  }
  return null;
}

/**
 * Applies a border value on one side and mirrors it on adjacent cells so shared edges stay consistent.
 * Records patches for undo (caller records primary cell before calling).
 */
export function applyBorderWithAdjacentSync(
  data: TableData,
  row: number,
  col: number,
  side: BorderSide,
  newValue: boolean,
  recordPatch: (cellId: string, side: BorderSide, oldValue: boolean) => void,
  apply: (cell: TableCell, side: BorderSide, value: boolean) => void,
): void {
  const numRows = data.rows.length;
  const numCols = data.columnWidths.length;
  const cell = data.rows[row].cells[col];
  const rs = cell.rowspan ?? 1;
  const cs = cell.colspan ?? 1;

  const touch = (target: TableCell, s: BorderSide, v: boolean) => {
    recordPatch(target.id, s, target.style[s]);
    apply(target, s, v);
  };

  switch (side) {
    case 'borderTop':
      if (row > 0) {
        const prevRow = data.rows[row - 1].cells;
        for (let cc = col; cc < col + cs && cc < numCols; cc++) {
          const n = prevRow[cc];
          if (!n.absorbed) touch(n, 'borderBottom', newValue);
        }
      }
      break;
    case 'borderBottom':
      if (row + rs < numRows) {
        const nextRow = data.rows[row + rs].cells;
        for (let cc = col; cc < col + cs && cc < numCols; cc++) {
          const n = nextRow[cc];
          if (!n.absorbed) touch(n, 'borderTop', newValue);
        }
      }
      break;
    case 'borderLeft':
      if (col > 0) {
        for (let rr = row; rr < row + rs && rr < numRows; rr++) {
          const n = data.rows[rr].cells[col - 1];
          if (!n.absorbed) touch(n, 'borderRight', newValue);
        }
      }
      break;
    case 'borderRight':
      if (col + cs < numCols) {
        for (let rr = row; rr < row + rs && rr < numRows; rr++) {
          const n = data.rows[rr].cells[col + cs];
          if (!n.absorbed) touch(n, 'borderLeft', newValue);
        }
      }
      break;
    default:
      break;
  }
}

export { findCellGridPosition };

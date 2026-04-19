import { nanoid } from 'nanoid';

export type IdPrefix =
  | 'doc'
  | 'blk'
  | 'txt'
  | 'el'
  | 'frm'
  | 'page'
  | 'op'
  | 'row'
  | 'cell'
  | 'conn';

export function generateId(prefix: IdPrefix): string {
  return `${prefix}_${nanoid(12)}`;
}

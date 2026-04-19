import { OperationRecord } from '../operation-log/interfaces';

export interface Command {
  readonly operationRecords: OperationRecord[];
  execute(): void;
  undo(): void;
  merge?(next: Command): boolean;
}

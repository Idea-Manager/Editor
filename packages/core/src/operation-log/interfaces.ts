// ─── Operation Types ─────────────────────────────────────────────────────────

export type OperationType =
  | 'node:insert'
  | 'node:delete'
  | 'node:update'
  | 'node:move'
  | 'text:insert'
  | 'text:delete';

// ─── Payloads ────────────────────────────────────────────────────────────────

export interface NodeInsertPayload {
  parentId: string;
  index: number;
  node: unknown;       // serialized Node snapshot
}

export interface NodeDeletePayload {
  parentId: string;
  index: number;
  nodeId: string;
  node: unknown;       // serialized snapshot for undo
}

export interface NodeUpdatePayload {
  nodeId: string;
  path: string;        // e.g. "data.fill" — always granular [CRDT]
  oldValue: unknown;
  newValue: unknown;
}

export interface NodeMovePayload {
  nodeId: string;
  oldParentId: string;
  oldIndex: number;
  newParentId: string;
  newIndex: number;
}

export interface TextInsertPayload {
  nodeId: string;      // TextRun id
  offset: number;
  text: string;
}

export interface TextDeletePayload {
  nodeId: string;      // TextRun id
  offset: number;
  length: number;
  deletedText: string; // for undo
}

export type OperationPayload =
  | NodeInsertPayload
  | NodeDeletePayload
  | NodeUpdatePayload
  | NodeMovePayload
  | TextInsertPayload
  | TextDeletePayload;

// ─── Operation Record ────────────────────────────────────────────────────────

export interface OperationRecord {
  id: string;
  actorId: string;
  timestamp: number;   // Lamport logical clock
  wallClock: number;   // Date.now() — display only, not for ordering
  type: OperationType;
  payload: OperationPayload;
}

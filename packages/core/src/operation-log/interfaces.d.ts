export type OperationType = 'node:insert' | 'node:delete' | 'node:update' | 'node:move' | 'text:insert' | 'text:delete';
export interface NodeInsertPayload {
    parentId: string;
    index: number;
    node: unknown;
}
export interface NodeDeletePayload {
    parentId: string;
    index: number;
    nodeId: string;
    node: unknown;
}
export interface NodeUpdatePayload {
    nodeId: string;
    path: string;
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
    nodeId: string;
    offset: number;
    text: string;
}
export interface TextDeletePayload {
    nodeId: string;
    offset: number;
    length: number;
    deletedText: string;
}
export type OperationPayload = NodeInsertPayload | NodeDeletePayload | NodeUpdatePayload | NodeMovePayload | TextInsertPayload | TextDeletePayload;
export interface OperationRecord {
    id: string;
    actorId: string;
    timestamp: number;
    wallClock: number;
    type: OperationType;
    payload: OperationPayload;
}
//# sourceMappingURL=interfaces.d.ts.map
export type EliminationStatus = 'normal' | 'to_eliminate' | 'eliminated' | 'cleared';

export type CleanStatus = 'clean' | 'dirty' | 'need_clean';

export type ChangeLogType =
  | 'count'
  | 'elimination_status'
  | 'clean_status'
  | 'strain'
  | 'shelf'
  | 'cage_created'
  | 'cage_deleted'
  | 'elimination'
  | 'batch_mark_to_eliminate'
  | 'batch_clear'
  | 'batch_update_clean_status';

export interface Cage {
  id: string;
  cageNumber: string;
  strain: string;
  currentCount: number;
  shelf: string;
  eliminationStatus: EliminationStatus;
  cleanStatus: CleanStatus;
  createdAt: string;
  updatedAt: string;
}

export interface EliminationRecord {
  id: string;
  cageId: string;
  cageNumber: string;
  eliminationDate: string;
  eliminationCount: number;
  personInCharge: string;
  remarks: string;
  createdAt: string;
}

export interface CageChangeLog {
  id: string;
  cageId: string;
  cageNumber: string;
  strain: string;
  changeType: ChangeLogType;
  fieldName?: string;
  oldValue?: string | number;
  newValue?: string | number;
  personInCharge?: string;
  remarks?: string;
  timestamp: string;
  batchId?: string;
}

export interface BatchOperationResult {
  success: string[];
  failed: { cageId: string; cageNumber: string; reason: string }[];
  total: number;
}

export type BatchOperationType =
  | 'mark_to_eliminate'
  | 'clear_cages'
  | 'update_clean_status';

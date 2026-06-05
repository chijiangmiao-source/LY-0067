export type EliminationStatus = 'normal' | 'to_eliminate' | 'eliminated' | 'cleared';

export type CleanStatus = 'clean' | 'dirty' | 'need_clean';

export type TransferType = 'transfer_in' | 'transfer_out' | 'merge_cage' | 'split_cage' | 'shelf_adjust';

export type TransferReason =
  | 'experimental_arrangement'
  | 'population_balance'
  | 'health_isolation'
  | 'cage_cleaning'
  | 'rearing_adjustment'
  | 'other';

export type ExperimentStage =
  | 'preparation'
  | 'adaptation'
  | 'treatment'
  | 'observation'
  | 'sample_collection'
  | 'completed'
  | 'other';

export type BatchUsageStatus =
  | 'active'
  | 'idle'
  | 'completed'
  | 'archived';

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
  | 'batch_update_clean_status'
  | 'transfer_in'
  | 'transfer_out'
  | 'merge_cage'
  | 'split_cage'
  | 'shelf_adjust'
  | 'experiment_batch_bind'
  | 'experiment_batch_unbind'
  | 'experiment_batch_update';

export interface ExperimentBatch {
  id: string;
  batchNumber: string;
  projectName: string;
  experimentStage: ExperimentStage;
  usageStatus: BatchUsageStatus;
  personInCharge: string;
  startDate: string;
  endDate?: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExperimentBatchCageAssociation {
  id: string;
  batchId: string;
  cageId: string;
  cageNumber: string;
  strain: string;
  animalCount: number;
  bindDate: string;
  unbindDate?: string;
  isActive: boolean;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExperimentBatchOperationAssociation {
  id: string;
  batchId: string;
  operationType: 'transfer_in' | 'transfer_out' | 'merge_cage' | 'split_cage' | 'elimination' | 'cage_created';
  operationId: string;
  operationDate: string;
  cageIds: string[];
  animalCount: number;
  personInCharge?: string;
  remarks?: string;
  createdAt: string;
}

export interface Cage {
  id: string;
  cageNumber: string;
  strain: string;
  currentCount: number;
  shelf: string;
  eliminationStatus: EliminationStatus;
  cleanStatus: CleanStatus;
  experimentBatchId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EliminationRecord {
  id: string;
  cageId: string;
  cageNumber: string;
  strain: string;
  eliminationDate: string;
  eliminationCount: number;
  personInCharge: string;
  remarks: string;
  experimentBatchId?: string;
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
  experimentBatchId?: string;
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

export interface TransferRecord {
  id: string;
  transferType: TransferType;
  transferDate: string;
  transferCount: number;
  fromCageId?: string;
  fromCageNumber?: string;
  fromStrain?: string;
  toCageId?: string;
  toCageNumber?: string;
  toStrain?: string;
  fromShelf?: string;
  toShelf?: string;
  externalSource?: string;
  externalTarget?: string;
  reason: TransferReason;
  personInCharge: string;
  remarks: string;
  experimentBatchId?: string;
  createdAt: string;
}

export type EliminationStatus = 'normal' | 'to_eliminate' | 'eliminated' | 'cleared';

export type CleanStatus = 'clean' | 'dirty' | 'need_clean';

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

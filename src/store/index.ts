import { createSignal, createEffect } from 'solid-js';
import type { Cage, EliminationRecord } from '../types';

const CAGES_KEY = 'cage_tracker_cages';
const RECORDS_KEY = 'cage_tracker_records';

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

const [cages, setCages] = createSignal<Cage[]>(loadFromStorage<Cage[]>(CAGES_KEY, []));
const [records, setRecords] = createSignal<EliminationRecord[]>(
  loadFromStorage<EliminationRecord[]>(RECORDS_KEY, [])
);

createEffect(() => {
  saveToStorage(CAGES_KEY, cages());
});

createEffect(() => {
  saveToStorage(RECORDS_KEY, records());
});

export function useCageStore() {
  const validateCage = (cage: Omit<Cage, 'id' | 'createdAt' | 'updatedAt'>, excludeId?: string): string | null => {
    if (!cage.cageNumber.trim()) return '笼位编号不能为空';
    if (!cage.strain.trim()) return '动物品系不能为空';
    if (cage.currentCount < 0) return '当前数量必须大于等于 0';

    const duplicate = cages().find(
      (c) => c.cageNumber === cage.cageNumber && c.id !== excludeId
    );
    if (duplicate) return '笼位编号不能重复';

    return null;
  };

  const addCage = (cageData: Omit<Cage, 'id' | 'createdAt' | 'updatedAt'>): string | null => {
    const error = validateCage(cageData);
    if (error) return error;

    const now = new Date().toISOString();
    const newCage: Cage = {
      ...cageData,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    setCages([...cages(), newCage]);
    return null;
  };

  const updateCage = (id: string, cageData: Partial<Cage>): string | null => {
    const existing = cages().find((c) => c.id === id);
    if (!existing) return '笼位不存在';

    const merged = { ...existing, ...cageData };
    const error = validateCage(merged, id);
    if (error) return error;

    setCages(
      cages().map((c) =>
        c.id === id ? { ...merged, updatedAt: new Date().toISOString() } : c
      )
    );
    return null;
  };

  const deleteCage = (id: string): void => {
    setCages(cages().filter((c) => c.id !== id));
  };

  const getCageById = (id: string): Cage | undefined => {
    return cages().find((c) => c.id === id);
  };

  return {
    cages,
    addCage,
    updateCage,
    deleteCage,
    getCageById,
  };
}

export function useRecordStore() {
  const validateRecord = (
    record: Omit<EliminationRecord, 'id' | 'cageNumber' | 'createdAt'>,
    cage: Cage
  ): string | null => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const elimDate = new Date(record.eliminationDate);
    elimDate.setHours(0, 0, 0, 0);

    if (elimDate > today) return '淘汰日期不能晚于当前日期';
    if (record.eliminationCount <= 0) return '淘汰数量必须大于 0';
    if (record.eliminationCount > cage.currentCount) return '淘汰数量不能超过当前数量';
    if (!record.personInCharge.trim()) return '负责人不能为空';

    return null;
  };

  const addRecord = (
    recordData: Omit<EliminationRecord, 'id' | 'cageNumber' | 'createdAt'>
  ): string | null => {
    const cageStore = useCageStore();
    const cage = cageStore.getCageById(recordData.cageId);
    if (!cage) return '笼位不存在';

    const error = validateRecord(recordData, cage);
    if (error) return error;

    const now = new Date().toISOString();
    const newRecord: EliminationRecord = {
      ...recordData,
      id: generateId(),
      cageNumber: cage.cageNumber,
      createdAt: now,
    };
    setRecords([...records(), newRecord]);

    const newCount = cage.currentCount - recordData.eliminationCount;
    const newStatus = newCount === 0 ? 'eliminated' : cage.eliminationStatus;
    cageStore.updateCage(cage.id, {
      currentCount: newCount,
      eliminationStatus: newStatus,
    });

    return null;
  };

  const clearCage = (cageId: string): string | null => {
    const cageStore = useCageStore();
    const cage = cageStore.getCageById(cageId);
    if (!cage) return '笼位不存在';
    if (cage.currentCount > 0) return '笼位还有动物，不能清空';

    cageStore.updateCage(cageId, { eliminationStatus: 'cleared' });
    return null;
  };

  const getRecordsByCageId = (cageId: string): EliminationRecord[] => {
    return records().filter((r) => r.cageId === cageId);
  };

  return {
    records,
    addRecord,
    clearCage,
    getRecordsByCageId,
  };
}

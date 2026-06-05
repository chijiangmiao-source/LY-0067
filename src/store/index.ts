import { createSignal, createEffect } from 'solid-js';
import type { Cage, EliminationRecord } from '../types';

const CAGES_KEY = 'cage_tracker_cages';
const RECORDS_KEY = 'cage_tracker_records';
const DELETED_NUMBERS_KEY = 'cage_tracker_deleted_numbers';

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
const [deletedNumbers, setDeletedNumbers] = createSignal<string[]>(
  loadFromStorage<string[]>(DELETED_NUMBERS_KEY, [])
);

createEffect(() => {
  saveToStorage(CAGES_KEY, cages());
});

createEffect(() => {
  saveToStorage(RECORDS_KEY, records());
});

createEffect(() => {
  saveToStorage(DELETED_NUMBERS_KEY, deletedNumbers());
});

export function validatePersonName(name: string): string | null {
  if (!name.trim()) return '负责人不能为空';
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 20) {
    return '负责人姓名长度必须在 2-20 个字符之间';
  }
  const validPattern = /^[\u4e00-\u9fa5a-zA-Z0-9·\s]+$/;
  if (!validPattern.test(trimmed)) {
    return '负责人姓名只能包含中文、英文字母、数字、空格和中间点';
  }
  return null;
}

export function useCageStore() {
  const validateCage = (cage: Omit<Cage, 'id' | 'createdAt' | 'updatedAt'>, excludeId?: string, isNew = false): string | null => {
    if (!cage.cageNumber.trim()) return '笼位编号不能为空';
    if (!cage.strain.trim()) return '动物品系不能为空';
    if (cage.currentCount < 0) return '当前数量必须大于等于 0';

    const duplicate = cages().find(
      (c) => c.cageNumber === cage.cageNumber && c.id !== excludeId
    );
    if (duplicate) return '笼位编号不能重复';

    if (isNew && deletedNumbers().includes(cage.cageNumber)) {
      return '该笼位编号已被删除过，不能重复使用';
    }

    return null;
  };

  const addCage = (cageData: Omit<Cage, 'id' | 'createdAt' | 'updatedAt'>): string | null => {
    const error = validateCage(cageData, undefined, true);
    if (error) return error;

    const now = new Date().toISOString();
    const newCage: Cage = {
      ...cageData,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    setCages([...cages(), newCage]);
    setDeletedNumbers(deletedNumbers().filter((n) => n !== cageData.cageNumber));
    return null;
  };

  const updateCage = (id: string, cageData: Partial<Cage>): string | null => {
    const existing = cages().find((c) => c.id === id);
    if (!existing) return '笼位不存在';

    const merged = { ...existing, ...cageData };
    const error = validateCage(merged, id, false);
    if (error) return error;

    setCages(
      cages().map((c) =>
        c.id === id ? { ...merged, updatedAt: new Date().toISOString() } : c
      )
    );
    return null;
  };

  const deleteCage = (id: string): void => {
    const cage = cages().find((c) => c.id === id);
    if (cage && !deletedNumbers().includes(cage.cageNumber)) {
      setDeletedNumbers([...deletedNumbers(), cage.cageNumber]);
    }
    setCages(cages().filter((c) => c.id !== id));
  };

  const getCageById = (id: string): Cage | undefined => {
    return cages().find((c) => c.id === id);
  };

  return {
    cages,
    deletedNumbers,
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

    const nameError = validatePersonName(record.personInCharge);
    if (nameError) return nameError;

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

import { createSignal, createEffect } from 'solid-js';
import type {
  Cage,
  EliminationRecord,
  CageChangeLog,
  CleanStatus,
  BatchOperationResult,
  ChangeLogType,
} from '../types';
import {
  ELIMINATION_STATUS_LABELS,
  CLEAN_STATUS_LABELS,
} from '../constants';

const CAGES_KEY = 'cage_tracker_cages';
const RECORDS_KEY = 'cage_tracker_records';
const DELETED_NUMBERS_KEY = 'cage_tracker_deleted_numbers';
const CHANGE_LOGS_KEY = 'cage_tracker_change_logs';

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

function generateBatchId(): string {
  return 'batch_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
}

const [cages, setCages] = createSignal<Cage[]>(loadFromStorage<Cage[]>(CAGES_KEY, []));
const [records, setRecords] = createSignal<EliminationRecord[]>(
  loadFromStorage<EliminationRecord[]>(RECORDS_KEY, [])
);
const [deletedNumbers, setDeletedNumbers] = createSignal<string[]>(
  loadFromStorage<string[]>(DELETED_NUMBERS_KEY, [])
);
const [changeLogs, setChangeLogs] = createSignal<CageChangeLog[]>(
  loadFromStorage<CageChangeLog[]>(CHANGE_LOGS_KEY, [])
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

createEffect(() => {
  saveToStorage(CHANGE_LOGS_KEY, changeLogs());
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

function addChangeLog(log: Omit<CageChangeLog, 'id' | 'timestamp'>): void {
  const newLog: CageChangeLog = {
    ...log,
    id: generateId(),
    timestamp: new Date().toISOString(),
  };
  setChangeLogs((prev) => [newLog, ...prev]);
}

function getFieldLabel(fieldName: string): string {
  const labels: Record<string, string> = {
    currentCount: '当前数量',
    eliminationStatus: '淘汰状态',
    cleanStatus: '清洁状态',
    strain: '动物品系',
    shelf: '所在架位',
    cageNumber: '笼位编号',
  };
  return labels[fieldName] || fieldName;
}

function formatFieldValue(fieldName: string, value: string | number): string {
  if (fieldName === 'eliminationStatus') {
    return ELIMINATION_STATUS_LABELS[value as keyof typeof ELIMINATION_STATUS_LABELS] || String(value);
  }
  if (fieldName === 'cleanStatus') {
    return CLEAN_STATUS_LABELS[value as keyof typeof CLEAN_STATUS_LABELS] || String(value);
  }
  return String(value);
}

function logFieldChanges(existing: Cage, updates: Partial<Cage>, personInCharge?: string): void {
  const fieldMap: Record<string, { key: string; logType: ChangeLogType }> = {
    currentCount: { key: 'currentCount', logType: 'count' },
    eliminationStatus: { key: 'eliminationStatus', logType: 'elimination_status' },
    cleanStatus: { key: 'cleanStatus', logType: 'clean_status' },
    strain: { key: 'strain', logType: 'strain' },
    shelf: { key: 'shelf', logType: 'shelf' },
  };

  for (const mapping of Object.values(fieldMap)) {
    const key = mapping.key as keyof Cage;
    if (key in updates) {
      const oldValue = existing[key];
      const newValue = updates[key];
      if (oldValue !== newValue) {
        addChangeLog({
          cageId: existing.id,
          cageNumber: existing.cageNumber,
          strain: existing.strain,
          changeType: mapping.logType,
          fieldName: getFieldLabel(key),
          oldValue: formatFieldValue(key, oldValue as string | number),
          newValue: formatFieldValue(key, newValue as string | number),
          personInCharge,
        });
      }
    }
  }
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

  const addCage = (cageData: Omit<Cage, 'id' | 'createdAt' | 'updatedAt'>, personInCharge?: string): string | null => {
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

    addChangeLog({
      cageId: newCage.id,
      cageNumber: newCage.cageNumber,
      strain: newCage.strain,
      changeType: 'cage_created',
      fieldName: '笼位创建',
      newValue: `${newCage.cageNumber} (品系: ${newCage.strain}, 数量: ${newCage.currentCount})`,
      personInCharge,
    });

    return null;
  };

  const updateCage = (id: string, cageData: Partial<Cage>, personInCharge?: string): string | null => {
    const existing = cages().find((c) => c.id === id);
    if (!existing) return '笼位不存在';

    const merged = { ...existing, ...cageData };
    const error = validateCage(merged, id, false);
    if (error) return error;

    logFieldChanges(existing, cageData, personInCharge);

    setCages(
      cages().map((c) =>
        c.id === id ? { ...merged, updatedAt: new Date().toISOString() } : c
      )
    );
    return null;
  };

  const deleteCage = (id: string, personInCharge?: string): void => {
    const cage = cages().find((c) => c.id === id);
    if (cage) {
      if (!deletedNumbers().includes(cage.cageNumber)) {
        setDeletedNumbers([...deletedNumbers(), cage.cageNumber]);
      }

      addChangeLog({
        cageId: cage.id,
        cageNumber: cage.cageNumber,
        strain: cage.strain,
        changeType: 'cage_deleted',
        fieldName: '笼位删除',
        oldValue: `${cage.cageNumber} (品系: ${cage.strain}, 数量: ${cage.currentCount})`,
        personInCharge,
      });
    }
    setCages(cages().filter((c) => c.id !== id));
  };

  const getCageById = (id: string): Cage | undefined => {
    return cages().find((c) => c.id === id);
  };

  const batchMarkToEliminate = (cageIds: string[], personInCharge?: string): BatchOperationResult => {
    const result: BatchOperationResult = { success: [], failed: [], total: cageIds.length };
    const batchId = generateBatchId();

    for (const id of cageIds) {
      const cage = getCageById(id);
      if (!cage) {
        result.failed.push({ cageId: id, cageNumber: '未知', reason: '笼位不存在' });
        continue;
      }
      if (cage.eliminationStatus === 'eliminated' || cage.eliminationStatus === 'cleared') {
        result.failed.push({
          cageId: id,
          cageNumber: cage.cageNumber,
          reason: `当前状态为「${ELIMINATION_STATUS_LABELS[cage.eliminationStatus]}」，无法标记待淘汰`,
        });
        continue;
      }
      if (cage.eliminationStatus === 'to_eliminate') {
        result.failed.push({
          cageId: id,
          cageNumber: cage.cageNumber,
          reason: '已经是待淘汰状态',
        });
        continue;
      }

      addChangeLog({
        cageId: cage.id,
        cageNumber: cage.cageNumber,
        strain: cage.strain,
        changeType: 'batch_mark_to_eliminate',
        fieldName: '淘汰状态',
        oldValue: formatFieldValue('eliminationStatus', cage.eliminationStatus),
        newValue: ELIMINATION_STATUS_LABELS.to_eliminate,
        personInCharge,
        batchId,
      });

      setCages(
        cages().map((c) =>
          c.id === id
            ? { ...c, eliminationStatus: 'to_eliminate' as const, updatedAt: new Date().toISOString() }
            : c
        )
      );
      result.success.push(cage.cageNumber);
    }

    return result;
  };

  const batchClearCages = (cageIds: string[], personInCharge?: string): BatchOperationResult => {
    const result: BatchOperationResult = { success: [], failed: [], total: cageIds.length };
    const batchId = generateBatchId();

    for (const id of cageIds) {
      const cage = getCageById(id);
      if (!cage) {
        result.failed.push({ cageId: id, cageNumber: '未知', reason: '笼位不存在' });
        continue;
      }
      if (cage.currentCount > 0) {
        result.failed.push({
          cageId: id,
          cageNumber: cage.cageNumber,
          reason: `笼位还有 ${cage.currentCount} 只动物，不能清空`,
        });
        continue;
      }
      if (cage.eliminationStatus === 'cleared') {
        result.failed.push({
          cageId: id,
          cageNumber: cage.cageNumber,
          reason: '已经是已清空状态',
        });
        continue;
      }

      addChangeLog({
        cageId: cage.id,
        cageNumber: cage.cageNumber,
        strain: cage.strain,
        changeType: 'batch_clear',
        fieldName: '淘汰状态',
        oldValue: formatFieldValue('eliminationStatus', cage.eliminationStatus),
        newValue: ELIMINATION_STATUS_LABELS.cleared,
        personInCharge,
        batchId,
      });

      setCages(
        cages().map((c) =>
          c.id === id
            ? { ...c, eliminationStatus: 'cleared' as const, updatedAt: new Date().toISOString() }
            : c
        )
      );
      result.success.push(cage.cageNumber);
    }

    return result;
  };

  const batchUpdateCleanStatus = (
    cageIds: string[],
    cleanStatus: CleanStatus,
    personInCharge?: string
  ): BatchOperationResult => {
    const result: BatchOperationResult = { success: [], failed: [], total: cageIds.length };
    const batchId = generateBatchId();

    for (const id of cageIds) {
      const cage = getCageById(id);
      if (!cage) {
        result.failed.push({ cageId: id, cageNumber: '未知', reason: '笼位不存在' });
        continue;
      }
      if (cage.cleanStatus === cleanStatus) {
        result.failed.push({
          cageId: id,
          cageNumber: cage.cageNumber,
          reason: `已经是「${CLEAN_STATUS_LABELS[cleanStatus]}」状态`,
        });
        continue;
      }

      addChangeLog({
        cageId: cage.id,
        cageNumber: cage.cageNumber,
        strain: cage.strain,
        changeType: 'batch_update_clean_status',
        fieldName: '清洁状态',
        oldValue: formatFieldValue('cleanStatus', cage.cleanStatus),
        newValue: CLEAN_STATUS_LABELS[cleanStatus],
        personInCharge,
        batchId,
      });

      setCages(
        cages().map((c) =>
          c.id === id
            ? { ...c, cleanStatus, updatedAt: new Date().toISOString() }
            : c
        )
      );
      result.success.push(cage.cageNumber);
    }

    return result;
  };

  return {
    cages,
    deletedNumbers,
    addCage,
    updateCage,
    deleteCage,
    getCageById,
    batchMarkToEliminate,
    batchClearCages,
    batchUpdateCleanStatus,
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

    addChangeLog({
      cageId: cage.id,
      cageNumber: cage.cageNumber,
      strain: cage.strain,
      changeType: 'elimination',
      fieldName: '淘汰登记',
      oldValue: `数量 ${cage.currentCount}`,
      newValue: `淘汰 ${recordData.eliminationCount} 只，剩余 ${newCount}`,
      personInCharge: recordData.personInCharge,
      remarks: recordData.remarks,
    });

    if (newCount !== cage.currentCount) {
      addChangeLog({
        cageId: cage.id,
        cageNumber: cage.cageNumber,
        strain: cage.strain,
        changeType: 'count',
        fieldName: '当前数量',
        oldValue: cage.currentCount,
        newValue: newCount,
        personInCharge: recordData.personInCharge,
      });
    }
    if (newStatus !== cage.eliminationStatus) {
      addChangeLog({
        cageId: cage.id,
        cageNumber: cage.cageNumber,
        strain: cage.strain,
        changeType: 'elimination_status',
        fieldName: '淘汰状态',
        oldValue: formatFieldValue('eliminationStatus', cage.eliminationStatus),
        newValue: formatFieldValue('eliminationStatus', newStatus),
        personInCharge: recordData.personInCharge,
      });
    }

    cageStore.updateCage(cage.id, {
      currentCount: newCount,
      eliminationStatus: newStatus,
    });

    return null;
  };

  const clearCage = (cageId: string, personInCharge?: string): string | null => {
    const cageStore = useCageStore();
    const cage = cageStore.getCageById(cageId);
    if (!cage) return '笼位不存在';
    if (cage.currentCount > 0) return '笼位还有动物，不能清空';

    addChangeLog({
      cageId: cage.id,
      cageNumber: cage.cageNumber,
      strain: cage.strain,
      changeType: 'elimination_status',
      fieldName: '淘汰状态',
      oldValue: formatFieldValue('eliminationStatus', cage.eliminationStatus),
      newValue: ELIMINATION_STATUS_LABELS.cleared,
      personInCharge,
    });

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

export function useChangeLogStore() {
  const getChangeLogsByCageId = (cageId: string): CageChangeLog[] => {
    return changeLogs().filter((l) => l.cageId === cageId);
  };

  const getAllChangeLogs = (): CageChangeLog[] => {
    return changeLogs();
  };

  const getChangeLogsByBatchId = (batchId: string): CageChangeLog[] => {
    return changeLogs().filter((l) => l.batchId === batchId);
  };

  return {
    changeLogs,
    getChangeLogsByCageId,
    getAllChangeLogs,
    getChangeLogsByBatchId,
  };
}

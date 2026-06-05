import { createSignal, createEffect } from 'solid-js';
import type {
  Cage,
  EliminationRecord,
  CageChangeLog,
  CleanStatus,
  BatchOperationResult,
  ChangeLogType,
  TransferRecord,
  TransferType,
  TransferReason,
} from '../types';
import {
  ELIMINATION_STATUS_LABELS,
  CLEAN_STATUS_LABELS,
  TRANSFER_TYPE_LABELS,
  TRANSFER_REASON_LABELS,
} from '../constants';

const CAGES_KEY = 'cage_tracker_cages';
const RECORDS_KEY = 'cage_tracker_records';
const DELETED_NUMBERS_KEY = 'cage_tracker_deleted_numbers';
const CHANGE_LOGS_KEY = 'cage_tracker_change_logs';
const TRANSFER_RECORDS_KEY = 'cage_tracker_transfer_records';

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
const [transferRecords, setTransferRecords] = createSignal<TransferRecord[]>(
  loadFromStorage<TransferRecord[]>(TRANSFER_RECORDS_KEY, [])
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

createEffect(() => {
  saveToStorage(TRANSFER_RECORDS_KEY, transferRecords());
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
  const validateCage = (
    cage: Omit<Cage, 'id' | 'createdAt' | 'updatedAt'>,
    excludeId?: string,
    isNew = false,
    originalNumber?: string
  ): string | null => {
    if (!cage.cageNumber.trim()) return '笼位编号不能为空';
    if (!cage.strain.trim()) return '动物品系不能为空';
    if (cage.currentCount < 0) return '当前数量必须大于等于 0';

    const duplicate = cages().find(
      (c) => c.cageNumber === cage.cageNumber && c.id !== excludeId
    );
    if (duplicate) return '笼位编号不能重复';

    const numberChanged = originalNumber === undefined || cage.cageNumber !== originalNumber;
    if (numberChanged && deletedNumbers().includes(cage.cageNumber)) {
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

  const updateCage = (
    id: string,
    cageData: Partial<Cage>,
    personInCharge?: string,
    skipChangeLog = false
  ): string | null => {
    const existing = cages().find((c) => c.id === id);
    if (!existing) return '笼位不存在';

    const merged = { ...existing, ...cageData };
    const error = validateCage(merged, id, false, existing.cageNumber);
    if (error) return error;

    if (!skipChangeLog) {
      logFieldChanges(existing, cageData, personInCharge);
    }

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
    record: Omit<EliminationRecord, 'id' | 'cageNumber' | 'strain' | 'createdAt'>,
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
    recordData: Omit<EliminationRecord, 'id' | 'cageNumber' | 'strain' | 'createdAt'>
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
      strain: cage.strain,
      createdAt: now,
    };
    setRecords([...records(), newRecord]);

    const newCount = cage.currentCount - recordData.eliminationCount;
    const newStatus = newCount === 0 ? 'eliminated' : cage.eliminationStatus;

    const oldStatusLabel = formatFieldValue('eliminationStatus', cage.eliminationStatus);
    const newStatusLabel = formatFieldValue('eliminationStatus', newStatus);
    const statusChanged = newStatus !== cage.eliminationStatus;

    addChangeLog({
      cageId: cage.id,
      cageNumber: cage.cageNumber,
      strain: cage.strain,
      changeType: 'elimination',
      fieldName: '淘汰登记',
      oldValue: `数量 ${cage.currentCount}，状态 ${oldStatusLabel}`,
      newValue: statusChanged
        ? `淘汰 ${recordData.eliminationCount} 只，剩余 ${newCount}，状态 ${newStatusLabel}`
        : `淘汰 ${recordData.eliminationCount} 只，剩余 ${newCount}`,
      personInCharge: recordData.personInCharge,
      remarks: recordData.remarks,
    });

    cageStore.updateCage(
      cage.id,
      { currentCount: newCount, eliminationStatus: newStatus },
      undefined,
      true
    );

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

export function useTransferStore() {
  const cageStore = useCageStore();

  const validateTransferBase = (data: {
    transferDate: string;
    transferCount: number;
    personInCharge: string;
  }): string | null => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tDate = new Date(data.transferDate);
    tDate.setHours(0, 0, 0, 0);
    if (tDate > today) return '转移日期不能晚于当前日期';
    if (data.transferCount <= 0) return '转移数量必须大于 0';

    const nameError = validatePersonName(data.personInCharge);
    if (nameError) return nameError;

    return null;
  };

  const validateCageUsable = (cage: Cage, action: 'source' | 'target'): string | null => {
    if (cage.eliminationStatus === 'cleared') {
      return `笼位「${cage.cageNumber}」已清空，${action === 'source' ? '不能作为转出笼位' : '不能作为转入笼位'}`;
    }
    return null;
  };

  const addTransferChangeLog = (
    cageId: string,
    cageNumber: string,
    strain: string,
    changeType: ChangeLogType,
    oldValue: string,
    newValue: string,
    personInCharge?: string,
    remarks?: string
  ) => {
    addChangeLog({
      cageId,
      cageNumber,
      strain,
      changeType,
      fieldName: TRANSFER_TYPE_LABELS[changeType as TransferType] || '转移',
      oldValue,
      newValue,
      personInCharge,
      remarks,
    });
  };

  const createTransferRecord = (
    data: Omit<TransferRecord, 'id' | 'createdAt'>
  ): TransferRecord => {
    return {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
  };

  const transferIn = (data: {
    transferDate: string;
    transferCount: number;
    toCageId: string;
    reason: TransferReason;
    personInCharge: string;
    remarks: string;
  }): string | null => {
    const baseError = validateTransferBase(data);
    if (baseError) return baseError;

    const toCage = cageStore.getCageById(data.toCageId);
    if (!toCage) return '转入笼位不存在';

    const usableError = validateCageUsable(toCage, 'target');
    if (usableError) return usableError;

    const newCount = toCage.currentCount + data.transferCount;
    if (newCount < 0) return '转移后数量不合法';

    const newElimStatus: Cage['eliminationStatus'] =
      toCage.eliminationStatus === 'eliminated' && newCount > 0 ? 'normal' : toCage.eliminationStatus;

    const record = createTransferRecord({
      transferType: 'transfer_in',
      transferDate: data.transferDate,
      transferCount: data.transferCount,
      toCageId: toCage.id,
      toCageNumber: toCage.cageNumber,
      toStrain: toCage.strain,
      reason: data.reason,
      personInCharge: data.personInCharge,
      remarks: data.remarks,
    });
    setTransferRecords((prev) => [record, ...prev]);

    addTransferChangeLog(
      toCage.id,
      toCage.cageNumber,
      toCage.strain,
      'transfer_in',
      `数量 ${toCage.currentCount}${toCage.eliminationStatus !== newElimStatus ? `，状态 ${formatFieldValue('eliminationStatus', toCage.eliminationStatus)}` : ''}`,
      `转入 ${data.transferCount} 只，数量 ${newCount}${toCage.eliminationStatus !== newElimStatus ? `，状态 ${formatFieldValue('eliminationStatus', newElimStatus)}` : ''}（原因：${TRANSFER_REASON_LABELS[data.reason]}）`,
      data.personInCharge,
      data.remarks
    );

    cageStore.updateCage(
      toCage.id,
      { currentCount: newCount, eliminationStatus: newElimStatus },
      undefined,
      true
    );

    return null;
  };

  const transferOut = (data: {
    transferDate: string;
    transferCount: number;
    fromCageId: string;
    reason: TransferReason;
    personInCharge: string;
    remarks: string;
  }): string | null => {
    const baseError = validateTransferBase(data);
    if (baseError) return baseError;

    const fromCage = cageStore.getCageById(data.fromCageId);
    if (!fromCage) return '转出笼位不存在';

    const usableError = validateCageUsable(fromCage, 'source');
    if (usableError) return usableError;

    if (data.transferCount > fromCage.currentCount) {
      return `转出数量不能超过笼位当前数量（${fromCage.currentCount}）`;
    }

    const newCount = fromCage.currentCount - data.transferCount;
    const newElimStatus: Cage['eliminationStatus'] =
      newCount === 0 && fromCage.eliminationStatus === 'normal' ? 'eliminated' : fromCage.eliminationStatus;

    const record = createTransferRecord({
      transferType: 'transfer_out',
      transferDate: data.transferDate,
      transferCount: data.transferCount,
      fromCageId: fromCage.id,
      fromCageNumber: fromCage.cageNumber,
      fromStrain: fromCage.strain,
      reason: data.reason,
      personInCharge: data.personInCharge,
      remarks: data.remarks,
    });
    setTransferRecords((prev) => [record, ...prev]);

    addTransferChangeLog(
      fromCage.id,
      fromCage.cageNumber,
      fromCage.strain,
      'transfer_out',
      `数量 ${fromCage.currentCount}${fromCage.eliminationStatus !== newElimStatus ? `，状态 ${formatFieldValue('eliminationStatus', fromCage.eliminationStatus)}` : ''}`,
      `转出 ${data.transferCount} 只，剩余 ${newCount}${fromCage.eliminationStatus !== newElimStatus ? `，状态 ${formatFieldValue('eliminationStatus', newElimStatus)}` : ''}（原因：${TRANSFER_REASON_LABELS[data.reason]}）`,
      data.personInCharge,
      data.remarks
    );

    cageStore.updateCage(
      fromCage.id,
      { currentCount: newCount, eliminationStatus: newElimStatus },
      undefined,
      true
    );

    return null;
  };

  const mergeCage = (data: {
    transferDate: string;
    transferCount: number;
    fromCageId: string;
    toCageId: string;
    reason: TransferReason;
    personInCharge: string;
    remarks: string;
  }): string | null => {
    const baseError = validateTransferBase(data);
    if (baseError) return baseError;

    const fromCage = cageStore.getCageById(data.fromCageId);
    const toCage = cageStore.getCageById(data.toCageId);
    if (!fromCage) return '转出笼位不存在';
    if (!toCage) return '转入笼位不存在';
    if (fromCage.id === toCage.id) return '转出笼位和转入笼位不能相同';

    const fromUsable = validateCageUsable(fromCage, 'source');
    if (fromUsable) return fromUsable;
    const toUsable = validateCageUsable(toCage, 'target');
    if (toUsable) return toUsable;

    if (fromCage.strain !== toCage.strain) {
      return `合笼要求品系一致（转出：${fromCage.strain}，转入：${toCage.strain}）`;
    }

    if (data.transferCount > fromCage.currentCount) {
      return `转出数量不能超过笼位当前数量（${fromCage.currentCount}）`;
    }

    const fromNewCount = fromCage.currentCount - data.transferCount;
    const toNewCount = toCage.currentCount + data.transferCount;
    const fromNewElimStatus: Cage['eliminationStatus'] =
      fromNewCount === 0 && fromCage.eliminationStatus === 'normal' ? 'eliminated' : fromCage.eliminationStatus;
    const toNewElimStatus: Cage['eliminationStatus'] =
      toCage.eliminationStatus === 'eliminated' && toNewCount > 0 ? 'normal' : toCage.eliminationStatus;

    const record = createTransferRecord({
      transferType: 'merge_cage',
      transferDate: data.transferDate,
      transferCount: data.transferCount,
      fromCageId: fromCage.id,
      fromCageNumber: fromCage.cageNumber,
      fromStrain: fromCage.strain,
      toCageId: toCage.id,
      toCageNumber: toCage.cageNumber,
      toStrain: toCage.strain,
      reason: data.reason,
      personInCharge: data.personInCharge,
      remarks: data.remarks,
    });
    setTransferRecords((prev) => [record, ...prev]);

    addTransferChangeLog(
      fromCage.id,
      fromCage.cageNumber,
      fromCage.strain,
      'merge_cage',
      `数量 ${fromCage.currentCount}${fromCage.eliminationStatus !== fromNewElimStatus ? `，状态 ${formatFieldValue('eliminationStatus', fromCage.eliminationStatus)}` : ''}`,
      `合笼转出 ${data.transferCount} 只 → ${toCage.cageNumber}，剩余 ${fromNewCount}${fromCage.eliminationStatus !== fromNewElimStatus ? `，状态 ${formatFieldValue('eliminationStatus', fromNewElimStatus)}` : ''}（原因：${TRANSFER_REASON_LABELS[data.reason]}）`,
      data.personInCharge,
      data.remarks
    );

    addTransferChangeLog(
      toCage.id,
      toCage.cageNumber,
      toCage.strain,
      'merge_cage',
      `数量 ${toCage.currentCount}${toCage.eliminationStatus !== toNewElimStatus ? `，状态 ${formatFieldValue('eliminationStatus', toCage.eliminationStatus)}` : ''}`,
      `合笼转入 ${data.transferCount} 只 ← ${fromCage.cageNumber}，数量 ${toNewCount}${toCage.eliminationStatus !== toNewElimStatus ? `，状态 ${formatFieldValue('eliminationStatus', toNewElimStatus)}` : ''}（原因：${TRANSFER_REASON_LABELS[data.reason]}）`,
      data.personInCharge,
      data.remarks
    );

    cageStore.updateCage(
      fromCage.id,
      { currentCount: fromNewCount, eliminationStatus: fromNewElimStatus },
      undefined,
      true
    );
    cageStore.updateCage(
      toCage.id,
      { currentCount: toNewCount, eliminationStatus: toNewElimStatus },
      undefined,
      true
    );

    return null;
  };

  const splitCage = (data: {
    transferDate: string;
    transferCount: number;
    fromCageId: string;
    toCageId: string;
    reason: TransferReason;
    personInCharge: string;
    remarks: string;
  }): string | null => {
    const baseError = validateTransferBase(data);
    if (baseError) return baseError;

    const fromCage = cageStore.getCageById(data.fromCageId);
    const toCage = cageStore.getCageById(data.toCageId);
    if (!fromCage) return '原笼位不存在';
    if (!toCage) return '目标笼位不存在';
    if (fromCage.id === toCage.id) return '原笼位和目标笼位不能相同';

    const fromUsable = validateCageUsable(fromCage, 'source');
    if (fromUsable) return fromUsable;
    const toUsable = validateCageUsable(toCage, 'target');
    if (toUsable) return toUsable;

    if (toCage.strain !== fromCage.strain && toCage.currentCount > 0) {
      return `目标笼位已有动物且品系不同（目标：${toCage.strain}，原笼：${fromCage.strain}）`;
    }

    if (data.transferCount > fromCage.currentCount) {
      return `拆笼数量不能超过原笼位当前数量（${fromCage.currentCount}）`;
    }

    const fromNewCount = fromCage.currentCount - data.transferCount;
    const toNewCount = toCage.currentCount + data.transferCount;
    const fromNewElimStatus: Cage['eliminationStatus'] =
      fromNewCount === 0 && fromCage.eliminationStatus === 'normal' ? 'eliminated' : fromCage.eliminationStatus;
    const toNewElimStatus: Cage['eliminationStatus'] =
      toCage.eliminationStatus === 'eliminated' && toNewCount > 0 ? 'normal' : toCage.eliminationStatus;
    const toNewStrain = toCage.currentCount === 0 ? fromCage.strain : toCage.strain;

    const record = createTransferRecord({
      transferType: 'split_cage',
      transferDate: data.transferDate,
      transferCount: data.transferCount,
      fromCageId: fromCage.id,
      fromCageNumber: fromCage.cageNumber,
      fromStrain: fromCage.strain,
      toCageId: toCage.id,
      toCageNumber: toCage.cageNumber,
      toStrain: toNewStrain,
      reason: data.reason,
      personInCharge: data.personInCharge,
      remarks: data.remarks,
    });
    setTransferRecords((prev) => [record, ...prev]);

    addTransferChangeLog(
      fromCage.id,
      fromCage.cageNumber,
      fromCage.strain,
      'split_cage',
      `数量 ${fromCage.currentCount}${fromCage.eliminationStatus !== fromNewElimStatus ? `，状态 ${formatFieldValue('eliminationStatus', fromCage.eliminationStatus)}` : ''}`,
      `拆笼转出 ${data.transferCount} 只 → ${toCage.cageNumber}，剩余 ${fromNewCount}${fromCage.eliminationStatus !== fromNewElimStatus ? `，状态 ${formatFieldValue('eliminationStatus', fromNewElimStatus)}` : ''}（原因：${TRANSFER_REASON_LABELS[data.reason]}）`,
      data.personInCharge,
      data.remarks
    );

    const strainChanged = toCage.strain !== toNewStrain;
    addTransferChangeLog(
      toCage.id,
      toCage.cageNumber,
      toNewStrain,
      'split_cage',
      `数量 ${toCage.currentCount}，品系 ${toCage.strain}${toCage.eliminationStatus !== toNewElimStatus ? `，状态 ${formatFieldValue('eliminationStatus', toCage.eliminationStatus)}` : ''}`,
      `拆笼转入 ${data.transferCount} 只 ← ${fromCage.cageNumber}，数量 ${toNewCount}${strainChanged ? `，品系 ${toNewStrain}` : ''}${toCage.eliminationStatus !== toNewElimStatus ? `，状态 ${formatFieldValue('eliminationStatus', toNewElimStatus)}` : ''}（原因：${TRANSFER_REASON_LABELS[data.reason]}）`,
      data.personInCharge,
      data.remarks
    );

    cageStore.updateCage(
      fromCage.id,
      { currentCount: fromNewCount, eliminationStatus: fromNewElimStatus },
      undefined,
      true
    );
    cageStore.updateCage(
      toCage.id,
      { currentCount: toNewCount, eliminationStatus: toNewElimStatus, strain: toNewStrain },
      undefined,
      true
    );

    return null;
  };

  const shelfAdjust = (data: {
    transferDate: string;
    fromCageId: string;
    fromShelf: string;
    toShelf: string;
    reason: TransferReason;
    personInCharge: string;
    remarks: string;
  }): string | null => {
    if (!data.personInCharge.trim()) return '负责人不能为空';
    const nameError = validatePersonName(data.personInCharge);
    if (nameError) return nameError;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tDate = new Date(data.transferDate);
    tDate.setHours(0, 0, 0, 0);
    if (tDate > today) return '调整日期不能晚于当前日期';

    const cage = cageStore.getCageById(data.fromCageId);
    if (!cage) return '笼位不存在';

    if (!data.toShelf.trim()) return '目标架位不能为空';

    const record = createTransferRecord({
      transferType: 'shelf_adjust',
      transferDate: data.transferDate,
      transferCount: cage.currentCount,
      fromCageId: cage.id,
      fromCageNumber: cage.cageNumber,
      fromStrain: cage.strain,
      fromShelf: data.fromShelf,
      toShelf: data.toShelf,
      reason: data.reason,
      personInCharge: data.personInCharge,
      remarks: data.remarks,
    });
    setTransferRecords((prev) => [record, ...prev]);

    addTransferChangeLog(
      cage.id,
      cage.cageNumber,
      cage.strain,
      'shelf_adjust',
      `架位 ${data.fromShelf || '-'}`,
      `架位调整至 ${data.toShelf}（原因：${TRANSFER_REASON_LABELS[data.reason]}）`,
      data.personInCharge,
      data.remarks
    );

    cageStore.updateCage(cage.id, { shelf: data.toShelf }, undefined, true);

    return null;
  };

  const getTransferRecordsByCageId = (cageId: string): TransferRecord[] => {
    return transferRecords().filter(
      (r) => r.fromCageId === cageId || r.toCageId === cageId
    );
  };

  return {
    transferRecords,
    transferIn,
    transferOut,
    mergeCage,
    splitCage,
    shelfAdjust,
    getTransferRecordsByCageId,
  };
}

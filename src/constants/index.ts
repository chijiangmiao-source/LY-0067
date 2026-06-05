import type { EliminationStatus, CleanStatus, ChangeLogType, TransferType, TransferReason } from '../types';

export const ELIMINATION_STATUS_LABELS: Record<EliminationStatus, string> = {
  normal: '正常',
  to_eliminate: '待淘汰',
  eliminated: '已淘汰',
  cleared: '已清空',
};

export const ELIMINATION_STATUS_COLORS: Record<EliminationStatus, string> = {
  normal: 'success',
  to_eliminate: 'warning',
  eliminated: 'danger',
  cleared: 'neutral',
};

export const CLEAN_STATUS_LABELS: Record<CleanStatus, string> = {
  clean: '清洁',
  dirty: '污染',
  need_clean: '待清洁',
};

export const CLEAN_STATUS_COLORS: Record<CleanStatus, string> = {
  clean: 'success',
  dirty: 'danger',
  need_clean: 'warning',
};

export const TRANSFER_TYPE_LABELS: Record<TransferType, string> = {
  transfer_in: '转入',
  transfer_out: '转出',
  merge_cage: '合笼',
  split_cage: '拆笼',
  shelf_adjust: '架位调整',
};

export const TRANSFER_TYPE_COLORS: Record<TransferType, string> = {
  transfer_in: 'success',
  transfer_out: 'warning',
  merge_cage: 'primary',
  split_cage: 'info',
  shelf_adjust: 'neutral',
};

export const TRANSFER_REASON_LABELS: Record<TransferReason, string> = {
  experimental_arrangement: '实验安排',
  population_balance: '数量平衡',
  health_isolation: '健康隔离',
  cage_cleaning: '笼位清洁',
  rearing_adjustment: '饲养调整',
  other: '其他原因',
};

export const TRANSFER_REASON_LIST: TransferReason[] = [
  'experimental_arrangement',
  'population_balance',
  'health_isolation',
  'cage_cleaning',
  'rearing_adjustment',
  'other',
];

export const CHANGE_LOG_TYPE_LABELS: Record<ChangeLogType, string> = {
  count: '数量变更',
  elimination_status: '淘汰状态变更',
  clean_status: '清洁状态变更',
  strain: '品系变更',
  shelf: '架位变更',
  cage_created: '笼位创建',
  cage_deleted: '笼位删除',
  elimination: '淘汰记录',
  batch_mark_to_eliminate: '批量标记待淘汰',
  batch_clear: '批量清空',
  batch_update_clean_status: '批量修改清洁状态',
  transfer_in: '转入',
  transfer_out: '转出',
  merge_cage: '合笼',
  split_cage: '拆笼',
  shelf_adjust: '架位调整',
};

export const CHANGE_LOG_TYPE_COLORS: Record<ChangeLogType, string> = {
  count: 'info',
  elimination_status: 'warning',
  clean_status: 'success',
  strain: 'primary',
  shelf: 'neutral',
  cage_created: 'success',
  cage_deleted: 'danger',
  elimination: 'danger',
  batch_mark_to_eliminate: 'warning',
  batch_clear: 'neutral',
  batch_update_clean_status: 'success',
  transfer_in: 'success',
  transfer_out: 'warning',
  merge_cage: 'primary',
  split_cage: 'info',
  shelf_adjust: 'neutral',
};

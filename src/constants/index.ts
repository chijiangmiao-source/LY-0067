import type { EliminationStatus, CleanStatus } from '../types';

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

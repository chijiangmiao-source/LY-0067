import { createMemo, createSignal } from 'solid-js';
import {
  Box,
  Heading,
  HStack,
  VStack,
  Button,
  Input,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Text,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalContent,
  ModalOverlay,
  Checkbox,
} from '@hope-ui/solid';
import type { Cage, CleanStatus, BatchOperationType, BatchOperationResult } from '../types';
import { useCageStore, useRecordStore } from '../store';
import {
  ELIMINATION_STATUS_LABELS,
  ELIMINATION_STATUS_COLORS,
  CLEAN_STATUS_LABELS,
  CLEAN_STATUS_COLORS,
} from '../constants';
import CageModal from './CageModal';
import EliminationModal from './EliminationModal';
import BatchOperationModal from './BatchOperationModal';

export default function CageList() {
  const {
    cages,
    updateCage,
    deleteCage,
    batchMarkToEliminate,
    batchClearCages,
    batchUpdateCleanStatus,
  } = useCageStore();
  const { clearCage } = useRecordStore();
  const [searchText, setSearchText] = createSignal('');
  const [statusFilter, setStatusFilter] = createSignal('all');
  const [isModalOpen, setIsModalOpen] = createSignal(false);
  const [isElimModalOpen, setIsElimModalOpen] = createSignal(false);
  const [editingCage, setEditingCage] = createSignal<Cage | null>(null);
  const [eliminationCage, setEliminationCage] = createSignal<Cage | null>(null);
  const [clearAlertOpen, setClearAlertOpen] = createSignal(false);
  const [clearingCage, setClearingCage] = createSignal<Cage | null>(null);
  const [deleteAlertOpen, setDeleteAlertOpen] = createSignal(false);
  const [deletingCage, setDeletingCage] = createSignal<Cage | null>(null);
  const [clearError, setClearError] = createSignal('');

  const [selectedIds, setSelectedIds] = createSignal<Set<string>>(new Set());
  const [batchModalOpen, setBatchModalOpen] = createSignal(false);
  const [batchOperationType, setBatchOperationType] = createSignal<BatchOperationType>('mark_to_eliminate');
  const [batchResult, setBatchResult] = createSignal<BatchOperationResult | null>(null);
  const [batchResultOpen, setBatchResultOpen] = createSignal(false);

  const filteredCages = createMemo(() => {
    const text = searchText().toLowerCase();
    return cages()
      .filter((cage) => {
        const matchText =
          cage.cageNumber.toLowerCase().includes(text) ||
          cage.strain.toLowerCase().includes(text) ||
          cage.shelf.toLowerCase().includes(text);
        const matchStatus =
          statusFilter() === 'all' || cage.eliminationStatus === statusFilter();
        return matchText && matchStatus;
      })
      .sort((a, b) => {
        const priority = { to_eliminate: 0, normal: 1, eliminated: 2, cleared: 3 };
        return priority[a.eliminationStatus] - priority[b.eliminationStatus];
      });
  });

  const selectedCages = createMemo(() => {
    return cages().filter((c) => selectedIds().has(c.id));
  });

  const isAllSelected = createMemo(() => {
    const filtered = filteredCages();
    return filtered.length > 0 && filtered.every((c) => selectedIds().has(c.id));
  });

  const toggleSelectAll = () => {
    const filtered = filteredCages();
    if (isAllSelected()) {
      const newSet = new Set(selectedIds());
      filtered.forEach((c) => newSet.delete(c.id));
      setSelectedIds(newSet);
    } else {
      const newSet = new Set(selectedIds());
      filtered.forEach((c) => newSet.add(c.id));
      setSelectedIds(newSet);
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds());
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const clearSelection = () => {
    setSelectedIds(new Set<string>());
  };

  const handleEdit = (cage: Cage) => {
    setEditingCage(cage);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingCage(null);
    setIsModalOpen(true);
  };

  const handleElimination = (cage: Cage) => {
    setEliminationCage(cage);
    setIsElimModalOpen(true);
  };

  const handleClear = (cage: Cage) => {
    setClearingCage(cage);
    setClearError('');
    setClearAlertOpen(true);
  };

  const confirmClear = () => {
    if (!clearingCage()) return;
    const err = clearCage(clearingCage()!.id);
    if (err) {
      setClearError(err);
    } else {
      setClearAlertOpen(false);
      setClearingCage(null);
    }
  };

  const handleDelete = (cage: Cage) => {
    setDeletingCage(cage);
    setDeleteAlertOpen(true);
  };

  const confirmDelete = () => {
    if (!deletingCage()) return;
    deleteCage(deletingCage()!.id);
    setDeleteAlertOpen(false);
    setDeletingCage(null);
  };

  const handleMarkToEliminate = (cage: Cage) => {
    updateCage(cage.id, { eliminationStatus: 'to_eliminate' });
  };

  const handleCancelToEliminate = (cage: Cage) => {
    updateCage(cage.id, { eliminationStatus: 'normal' });
  };

  const openBatchOperation = (type: BatchOperationType) => {
    if (selectedCages().length === 0) return;
    setBatchOperationType(type);
    setBatchModalOpen(true);
  };

  const performBatchOperation = (
    cageIds: string[],
    cleanStatus?: CleanStatus,
    personInCharge?: string
  ): BatchOperationResult => {
    switch (batchOperationType()) {
      case 'mark_to_eliminate':
        return batchMarkToEliminate(cageIds, personInCharge);
      case 'clear_cages':
        return batchClearCages(cageIds, personInCharge);
      case 'update_clean_status':
        if (cleanStatus) {
          return batchUpdateCleanStatus(cageIds, cleanStatus, personInCharge);
        }
        return { success: [], failed: [], total: 0 };
    }
  };

  const handleBatchConfirm = (result: BatchOperationResult) => {
    setBatchResult(result);
    setBatchModalOpen(false);
    clearSelection();
    if (result.success.length > 0 || result.failed.length > 0) {
      setBatchResultOpen(true);
    }
  };

  return (
    <Box p="$4">
      <VStack spacing="$4" align="stretch">
        <HStack justify="space-between">
          <Heading size="lg">笼位管理</Heading>
          <Button colorScheme="primary" onClick={handleAdd}>
            新增笼位
          </Button>
        </HStack>

        <HStack spacing="$3" flexWrap="wrap">
          <Input
            placeholder="搜索笼位编号、品系、架位..."
            value={searchText()}
            onInput={(e) => setSearchText(e.currentTarget.value)}
            maxW="300px"
          />
          <Box
            as="select"
            value={statusFilter()}
            onChange={(e) => setStatusFilter(e.currentTarget.value)}
            maxW="150px"
            px="$3"
            py="$2"
            border="1px solid"
            borderColor="neutral.200"
            rounded="$md"
            fontSize="$md"
            bg="white"
            _focus={{ outline: "none", borderColor: "primary.500", boxShadow: "0 0 0 3px rgba(59,130,246,0.1)" }}
          >
            <option value="all">全部状态</option>
            <option value="normal">正常</option>
            <option value="to_eliminate">待淘汰</option>
            <option value="eliminated">已淘汰</option>
            <option value="cleared">已清空</option>
          </Box>
          {selectedCages().length > 0 && (
            <HStack spacing="$2" ml="auto">
              <Badge colorScheme="primary" variant="subtle">
                已选 {selectedCages().length} 个
              </Badge>
              <Button
                size="sm"
                colorScheme="warning"
                onClick={() => openBatchOperation('mark_to_eliminate')}
              >
                批量标记待淘汰
              </Button>
              <Button
                size="sm"
                colorScheme="neutral"
                onClick={() => openBatchOperation('clear_cages')}
              >
                批量清空
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => openBatchOperation('update_clean_status')}
              >
                批量修改清洁状态
              </Button>
              <Button
                size="sm"
                variant="outline"
                colorScheme="danger"
                onClick={clearSelection}
              >
                取消选择
              </Button>
            </HStack>
          )}
        </HStack>

        {filteredCages().length === 0 ? (
          <Text color="gray.500" textAlign="center" py="$8">
            暂无笼位数据，请点击"新增笼位"添加
          </Text>
        ) : (
          <Table overflowX="auto">
            <Thead>
              <Tr>
                <Th w="50px">
                  <Checkbox
                    checked={isAllSelected()}
                    indeterminate={selectedCages().length > 0 && !isAllSelected()}
                    onChange={toggleSelectAll}
                  />
                </Th>
                <Th>笼位编号</Th>
                <Th>动物品系</Th>
                <Th>当前数量</Th>
                <Th>所在架位</Th>
                <Th>淘汰状态</Th>
                <Th>清洁状态</Th>
                <Th>操作</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredCages().map((cage) => (
                <Tr
                  key={cage.id}
                  bg={cage.eliminationStatus === 'to_eliminate' ? 'rgba(245, 158, 11, 0.1)' : selectedIds().has(cage.id) ? 'rgba(59, 130, 246, 0.05)' : undefined}
                >
                  <Td>
                    <Checkbox
                      checked={selectedIds().has(cage.id)}
                      onChange={() => toggleSelect(cage.id)}
                    />
                  </Td>
                  <Td>
                    <Badge
                      colorScheme={cage.eliminationStatus === 'to_eliminate' ? 'warning' : 'primary'}
                      variant={cage.eliminationStatus === 'to_eliminate' ? 'solid' : 'subtle'}
                    >
                      {cage.cageNumber}
                      {cage.eliminationStatus === 'to_eliminate' && ' ⚠️'}
                    </Badge>
                  </Td>
                  <Td>{cage.strain}</Td>
                  <Td>{cage.currentCount}</Td>
                  <Td>{cage.shelf || '-'}</Td>
                  <Td>
                    <Badge colorScheme={ELIMINATION_STATUS_COLORS[cage.eliminationStatus] as any}>
                      {ELIMINATION_STATUS_LABELS[cage.eliminationStatus]}
                    </Badge>
                  </Td>
                  <Td>
                    <Badge colorScheme={CLEAN_STATUS_COLORS[cage.cleanStatus] as any}>
                      {CLEAN_STATUS_LABELS[cage.cleanStatus]}
                    </Badge>
                  </Td>
                  <Td>
                    <HStack spacing="$1" flexWrap="wrap">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(cage)}>
                        编辑
                      </Button>
                      {cage.currentCount > 0 &&
                        cage.eliminationStatus !== 'eliminated' &&
                        cage.eliminationStatus !== 'cleared' && (
                          <Button size="sm" colorScheme="danger" onClick={() => handleElimination(cage)}>
                            淘汰
                          </Button>
                        )}
                      {cage.eliminationStatus === 'normal' && (
                        <Button size="sm" colorScheme="warning" onClick={() => handleMarkToEliminate(cage)}>
                          标记待淘汰
                        </Button>
                      )}
                      {cage.eliminationStatus === 'to_eliminate' && (
                        <Button size="sm" variant="outline" onClick={() => handleCancelToEliminate(cage)}>
                          取消标记
                        </Button>
                      )}
                      {cage.eliminationStatus === 'eliminated' && (
                        <Button size="sm" colorScheme="neutral" onClick={() => handleClear(cage)}>
                          清空
                        </Button>
                      )}
                      <Button size="sm" variant="outline" colorScheme="danger" onClick={() => handleDelete(cage)}>
                        删除
                      </Button>
                    </HStack>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </VStack>

      <CageModal
        isOpen={isModalOpen()}
        onClose={() => setIsModalOpen(false)}
        cage={editingCage()}
      />

      <EliminationModal
        isOpen={isElimModalOpen()}
        onClose={() => setIsElimModalOpen(false)}
        cage={eliminationCage()}
      />

      <Modal opened={clearAlertOpen()} onClose={() => setClearAlertOpen(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>确认清空</ModalHeader>
          <ModalBody>
            {clearError() ? (
              <Box p="$2" bg="rgba(248, 113, 113, 0.1)" rounded="$md" color="red.400">
                {clearError()}
              </Box>
            ) : (
              <Text>确定要清空笼位 "{clearingCage()?.cageNumber}" 吗？</Text>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" mr="$3" onClick={() => setClearAlertOpen(false)}>
              取消
            </Button>
            <Button colorScheme="primary" onClick={confirmClear}>
              确认
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal opened={deleteAlertOpen()} onClose={() => setDeleteAlertOpen(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>确认删除</ModalHeader>
          <ModalBody>
            <Text>确定要删除笼位 "{deletingCage()?.cageNumber}" 吗？此操作不可恢复。</Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" mr="$3" onClick={() => setDeleteAlertOpen(false)}>
              取消
            </Button>
            <Button colorScheme="danger" onClick={confirmDelete}>
              删除
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <BatchOperationModal
        isOpen={batchModalOpen()}
        onClose={() => setBatchModalOpen(false)}
        selectedCages={selectedCages()}
        operationType={batchOperationType()}
        onConfirm={handleBatchConfirm}
        performOperation={performBatchOperation}
      />

      <Modal opened={batchResultOpen()} onClose={() => setBatchResultOpen(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>批量操作结果</ModalHeader>
          <ModalBody>
            {batchResult() && (
              <VStack spacing="$3" align="stretch">
                <HStack spacing="$3">
                  <Badge colorScheme="success" size="lg">成功 {batchResult()!.success.length} 个</Badge>
                  <Badge colorScheme="danger" size="lg">失败 {batchResult()!.failed.length} 个</Badge>
                  <Badge colorScheme="neutral" size="lg">总计 {batchResult()!.total} 个</Badge>
                </HStack>
                {batchResult()!.success.length > 0 && (
                  <Box>
                    <Text size="sm" color="gray.600" mb="$1">成功的笼位：</Text>
                    <Box maxH="120px" overflowY="auto" p="$2" bg="success.50" rounded="$md">
                      <HStack flexWrap="wrap" spacing="$2">
                        {batchResult()!.success.map((n) => (
                          <Badge key={n} colorScheme="success">{n}</Badge>
                        ))}
                      </HStack>
                    </Box>
                  </Box>
                )}
                {batchResult()!.failed.length > 0 && (
                  <Box>
                    <Text size="sm" color="gray.600" mb="$1">失败的笼位：</Text>
                    <Box maxH="150px" overflowY="auto">
                      {batchResult()!.failed.map((f) => (
                        <Box key={f.cageId} p="$2" borderBottom="1px solid" borderColor="gray.100">
                          <Text size="sm">
                            <Badge colorScheme="danger" mr="$2">{f.cageNumber}</Badge>
                            <Text color="gray.600" as="span">{f.reason}</Text>
                          </Text>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="primary" onClick={() => setBatchResultOpen(false)}>
              确定
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

import { createMemo, createSignal } from 'solid-js';
import {
  Box,
  Heading,
  HStack,
  VStack,
  Button,
  Input,
  Select,
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
} from '@hope-ui/solid';
import type { Cage } from '../types';
import { useCageStore, useRecordStore } from '../store';
import {
  ELIMINATION_STATUS_LABELS,
  ELIMINATION_STATUS_COLORS,
  CLEAN_STATUS_LABELS,
  CLEAN_STATUS_COLORS,
} from '../constants';
import CageModal from './CageModal';
import EliminationModal from './EliminationModal';

export default function CageList() {
  const { cages, updateCage, deleteCage } = useCageStore();
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

  return (
    <Box p="$4">
      <VStack spacing="$4" align="stretch">
        <HStack justify="space-between">
          <Heading size="lg">笼位管理</Heading>
          <Button colorScheme="primary" onClick={handleAdd}>
            新增笼位
          </Button>
        </HStack>
        <HStack spacing="$3">
          <Input
            placeholder="搜索笼位编号、品系、架位..."
            value={searchText()}
            onInput={(e) => setSearchText(e.currentTarget.value)}
            maxW="300px"
          />
          <Select
            value={statusFilter()}
            onChange={(e) => setStatusFilter(e.currentTarget.value)}
            maxW="150px"
          >
            <option value="all">全部状态</option>
            <option value="normal">正常</option>
            <option value="to_eliminate">待淘汰</option>
            <option value="eliminated">已淘汰</option>
            <option value="cleared">已清空</option>
          </Select>
        </HStack>
        {filteredCages().length === 0 ? (
          <Text color="gray.500" textAlign="center" py="$8">
            暂无笼位数据，请点击"新增笼位"添加
          </Text>
        ) : (
          <Table overflowX="auto">
            <Thead>
              <Tr>
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
                  bg={cage.eliminationStatus === 'to_eliminate' ? 'rgba(245, 158, 11, 0.1)' : undefined}
                >
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
                    <HStack spacing="$1">
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
    </Box>
  );
}

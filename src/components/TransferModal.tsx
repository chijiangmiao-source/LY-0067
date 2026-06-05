import { createSignal, createEffect } from 'solid-js';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Button,
  Box,
  Text,
  HStack,
  VStack,
  Badge,
} from '@hope-ui/solid';
import type { Cage, TransferType, TransferReason } from '../types';
import { useCageStore, useTransferStore, useExperimentBatchStore } from '../store';
import {
  TRANSFER_TYPE_LABELS,
  TRANSFER_TYPE_COLORS,
  TRANSFER_REASON_LABELS,
  TRANSFER_REASON_LIST,
  ELIMINATION_STATUS_LABELS,
} from '../constants';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: TransferType;
  defaultCage?: Cage | null;
}

export default function TransferModal(props: TransferModalProps) {
  const { cages } = useCageStore();
  const { transferIn, transferOut, mergeCage, splitCage, shelfAdjust } = useTransferStore();
  const { experimentBatches } = useExperimentBatchStore();

  const [transferType, setTransferType] = createSignal<TransferType>('transfer_in');
  const [transferDate, setTransferDate] = createSignal(new Date().toISOString().split('T')[0]);
  const [transferCount, setTransferCount] = createSignal(1);
  const [fromCageId, setFromCageId] = createSignal('');
  const [toCageId, setToCageId] = createSignal('');
  const [toShelf, setToShelf] = createSignal('');
  const [externalSource, setExternalSource] = createSignal('');
  const [externalTarget, setExternalTarget] = createSignal('');
  const [reason, setReason] = createSignal<TransferReason>('experimental_arrangement');
  const [personInCharge, setPersonInCharge] = createSignal('');
  const [remarks, setRemarks] = createSignal('');
  const [experimentBatchId, setExperimentBatchId] = createSignal<string>('');
  const [error, setError] = createSignal('');

  const availableFromCages = () =>
    cages().filter((c) => c.eliminationStatus !== 'cleared');

  const availableToCages = () =>
    cages().filter((c) => c.eliminationStatus !== 'cleared');

  const fromCage = () => cages().find((c) => c.id === fromCageId());
  const toCage = () => cages().find((c) => c.id === toCageId());

  const resetForm = () => {
    setTransferType(props.defaultType || 'transfer_in');
    setTransferDate(new Date().toISOString().split('T')[0]);
    setTransferCount(1);
    setFromCageId(props.defaultCage?.id || '');
    setToCageId('');
    setToShelf('');
    setExternalSource('');
    setExternalTarget('');
    setReason('experimental_arrangement');
    setPersonInCharge('');
    setRemarks('');
    setExperimentBatchId(props.defaultCage?.experimentBatchId || '');
    setError('');
  };

  createEffect(() => {
    if (props.isOpen) {
      resetForm();
    }
  });

  const handleClose = () => {
    resetForm();
    props.onClose();
  };

  const handleSubmit = () => {
    setError('');
    let err: string | null = null;

    const baseData = {
      transferDate: transferDate(),
      transferCount: transferCount(),
      reason: reason(),
      personInCharge: personInCharge(),
      remarks: remarks(),
      experimentBatchId: experimentBatchId() || undefined,
    };

    switch (transferType()) {
      case 'transfer_in':
        if (!toCageId()) {
          err = '请选择转入笼位';
          break;
        }
        err = transferIn({ ...baseData, toCageId: toCageId(), externalSource: externalSource() });
        break;
      case 'transfer_out':
        if (!fromCageId()) {
          err = '请选择转出笼位';
          break;
        }
        err = transferOut({ ...baseData, fromCageId: fromCageId(), externalTarget: externalTarget() });
        break;
      case 'merge_cage':
        if (!fromCageId()) {
          err = '请选择转出笼位';
          break;
        }
        if (!toCageId()) {
          err = '请选择转入笼位';
          break;
        }
        err = mergeCage({
          ...baseData,
          fromCageId: fromCageId(),
          toCageId: toCageId(),
        });
        break;
      case 'split_cage':
        if (!fromCageId()) {
          err = '请选择原笼位';
          break;
        }
        if (!toCageId()) {
          err = '请选择目标笼位';
          break;
        }
        err = splitCage({
          ...baseData,
          fromCageId: fromCageId(),
          toCageId: toCageId(),
        });
        break;
      case 'shelf_adjust':
        if (!fromCageId()) {
          err = '请选择笼位';
          break;
        }
        if (!toShelf().trim()) {
          err = '请输入目标架位';
          break;
        }
        err = shelfAdjust({
          transferDate: transferDate(),
          fromCageId: fromCageId(),
          fromShelf: fromCage()?.shelf || '',
          toShelf: toShelf(),
          reason: reason(),
          personInCharge: personInCharge(),
          remarks: remarks(),
        });
        break;
    }

    if (err) {
      setError(err);
    } else {
      handleClose();
    }
  };

  const typeList: TransferType[] = [
    'transfer_in',
    'transfer_out',
    'merge_cage',
    'split_cage',
    'shelf_adjust',
  ];

  return (
    <Modal opened={props.isOpen} onClose={handleClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>笼位转移操作</ModalHeader>
        <ModalBody>
          <VStack spacing="$3" align="stretch">
            <FormControl required>
              <FormLabel>转移类型</FormLabel>
              <HStack spacing="$2" flexWrap="wrap">
                {typeList.map((t) => (
                  <Button
                    key={t}
                    size="sm"
                    variant={transferType() === t ? 'solid' : 'outline'}
                    colorScheme={TRANSFER_TYPE_COLORS[t] as any}
                    onClick={() => setTransferType(t)}
                  >
                    {TRANSFER_TYPE_LABELS[t]}
                  </Button>
                ))}
              </HStack>
            </FormControl>

            {error() && (
              <Box p="$2" bg="rgba(248, 113, 113, 0.1)" rounded="$md" color="red.400">
                {error()}
              </Box>
            )}

            <HStack spacing="$3">
              <FormControl required flex={1}>
                <FormLabel>转移日期</FormLabel>
                <Input
                  type="date"
                  value={transferDate()}
                  onInput={(e) => setTransferDate(e.currentTarget.value)}
                  max={new Date().toISOString().split('T')[0]}
                />
              </FormControl>

              {transferType() !== 'shelf_adjust' && (
                <FormControl required flex={1}>
                  <FormLabel>转移数量</FormLabel>
                  <Input
                    type="number"
                    value={transferCount()}
                    onInput={(e) =>
                      setTransferCount(
                        Math.max(
                          1,
                          Math.min(
                            fromCage()?.currentCount || 9999,
                            parseInt(e.currentTarget.value) || 1
                          )
                        )
                      )
                    }
                    min={1}
                    max={fromCage()?.currentCount || 9999}
                  />
                </FormControl>
              )}
            </HStack>

            {transferType() === 'transfer_in' && (
              <VStack spacing="$3" align="stretch">
                <FormControl required>
                  <FormLabel>转入笼位</FormLabel>
                  <Box
                    as="select"
                    value={toCageId()}
                    onChange={(e) => setToCageId(e.currentTarget.value)}
                    w="100%"
                    px="$3"
                    py="$2"
                    border="1px solid"
                    borderColor="neutral.200"
                    rounded="$md"
                    fontSize="$md"
                    bg="white"
                    _focus={{
                      outline: 'none',
                      borderColor: 'primary.500',
                      boxShadow: '0 0 0 3px rgba(59,130,246,0.1)',
                    }}
                  >
                    <option value="">请选择转入笼位</option>
                    {availableToCages().map((c) => (
                      <option value={c.id}>
                        {c.cageNumber} - {c.strain}（当前 {c.currentCount} 只）
                      </option>
                    ))}
                  </Box>
                  {toCage() && (
                    <Box mt="$2" p="$2" bg="success.50" rounded="$md">
                      <Text size="sm">
                        笼位 <Badge colorScheme="primary">{toCage()!.cageNumber}</Badge>
                        <Text as="span" ml="$2">品系：{toCage()!.strain}</Text>
                        <Text as="span" ml="$2">当前数量：{toCage()!.currentCount}</Text>
                        <Text as="span" ml="$2">
                          转移后数量：<Text weight="bold" as="span" color="success.600">
                            {toCage()!.currentCount + transferCount()}
                          </Text>
                        </Text>
                      </Text>
                    </Box>
                  )}
                </FormControl>
                <FormControl required>
                  <FormLabel>来源说明</FormLabel>
                  <Input
                    value={externalSource()}
                    onInput={(e) => setExternalSource(e.currentTarget.value)}
                    placeholder="请输入来源，如：XX实验室、XX笼位编号、供应商名称等"
                  />
                  <Text size="xs" color="gray.500" mt="$1">
                    说明这些实验鼠从哪里转入
                  </Text>
                </FormControl>
              </VStack>
            )}

            {transferType() === 'transfer_out' && (
              <VStack spacing="$3" align="stretch">
                <FormControl required>
                  <FormLabel>转出笼位</FormLabel>
                  <Box
                    as="select"
                    value={fromCageId()}
                    onChange={(e) => setFromCageId(e.currentTarget.value)}
                    w="100%"
                    px="$3"
                    py="$2"
                    border="1px solid"
                    borderColor="neutral.200"
                    rounded="$md"
                    fontSize="$md"
                    bg="white"
                    _focus={{
                      outline: 'none',
                      borderColor: 'primary.500',
                      boxShadow: '0 0 0 3px rgba(59,130,246,0.1)',
                    }}
                  >
                    <option value="">请选择转出笼位</option>
                    {availableFromCages().map((c) => (
                      <option value={c.id}>
                        {c.cageNumber} - {c.strain}（当前 {c.currentCount} 只）
                      </option>
                    ))}
                  </Box>
                  {fromCage() && (
                    <Box mt="$2" p="$2" bg="warning.50" rounded="$md">
                      <Text size="sm">
                        笼位 <Badge colorScheme="primary">{fromCage()!.cageNumber}</Badge>
                        <Text as="span" ml="$2">品系：{fromCage()!.strain}</Text>
                        <Text as="span" ml="$2">当前数量：{fromCage()!.currentCount}</Text>
                        <Text as="span" ml="$2">
                          转移后剩余：<Text weight="bold" as="span" color="warning.600">
                            {Math.max(0, fromCage()!.currentCount - transferCount())}
                          </Text>
                        </Text>
                      </Text>
                    </Box>
                  )}
                </FormControl>
                <FormControl required>
                  <FormLabel>去向说明</FormLabel>
                  <Input
                    value={externalTarget()}
                    onInput={(e) => setExternalTarget(e.currentTarget.value)}
                    placeholder="请输入去向，如：XX实验室、XX笼位编号、实验组别等"
                  />
                  <Text size="xs" color="gray.500" mt="$1">
                    说明这些实验鼠将转到哪里去
                  </Text>
                </FormControl>
              </VStack>
            )}

            {transferType() === 'merge_cage' && (
              <VStack spacing="$3" align="stretch">
                <FormControl required>
                  <FormLabel>转出笼位</FormLabel>
                  <Box
                    as="select"
                    value={fromCageId()}
                    onChange={(e) => setFromCageId(e.currentTarget.value)}
                    w="100%"
                    px="$3"
                    py="$2"
                    border="1px solid"
                    borderColor="neutral.200"
                    rounded="$md"
                    fontSize="$md"
                    bg="white"
                    _focus={{
                      outline: 'none',
                      borderColor: 'primary.500',
                      boxShadow: '0 0 0 3px rgba(59,130,246,0.1)',
                    }}
                  >
                    <option value="">请选择转出笼位</option>
                    {availableFromCages().map((c) => (
                      <option value={c.id}>
                        {c.cageNumber} - {c.strain}（当前 {c.currentCount} 只）
                      </option>
                    ))}
                  </Box>
                </FormControl>
                <FormControl required>
                  <FormLabel>转入笼位（需与转出笼位品系一致）</FormLabel>
                  <Box
                    as="select"
                    value={toCageId()}
                    onChange={(e) => setToCageId(e.currentTarget.value)}
                    w="100%"
                    px="$3"
                    py="$2"
                    border="1px solid"
                    borderColor="neutral.200"
                    rounded="$md"
                    fontSize="$md"
                    bg="white"
                    _focus={{
                      outline: 'none',
                      borderColor: 'primary.500',
                      boxShadow: '0 0 0 3px rgba(59,130,246,0.1)',
                    }}
                  >
                    <option value="">请选择转入笼位</option>
                    {availableToCages()
                      .filter((c) => !fromCageId() || c.strain === fromCage()?.strain)
                      .map((c) => (
                        <option value={c.id} disabled={!!fromCageId() && c.strain !== fromCage()?.strain}>
                          {c.cageNumber} - {c.strain}（当前 {c.currentCount} 只）
                          {fromCageId() && c.strain !== fromCage()?.strain && '（品系不同）'}
                        </option>
                      ))}
                  </Box>
                </FormControl>
                {fromCage() && toCage() && (
                  <Box p="$2" bg="primary.50" rounded="$md">
                    <HStack spacing="$4">
                      <VStack align="start" spacing="$1">
                        <Text size="sm" color="gray.600">
                          转出 <Badge colorScheme="warning">{fromCage()!.cageNumber}</Badge>
                        </Text>
                        <Text size="sm">
                          {fromCage()!.currentCount} → {fromCage()!.currentCount - transferCount()}
                        </Text>
                      </VStack>
                      <Text size="xl">→</Text>
                      <VStack align="start" spacing="$1">
                        <Text size="sm" color="gray.600">
                          转入 <Badge colorScheme="success">{toCage()!.cageNumber}</Badge>
                        </Text>
                        <Text size="sm">
                          {toCage()!.currentCount} → {toCage()!.currentCount + transferCount()}
                        </Text>
                      </VStack>
                    </HStack>
                  </Box>
                )}
              </VStack>
            )}

            {transferType() === 'split_cage' && (
              <VStack spacing="$3" align="stretch">
                <FormControl required>
                  <FormLabel>原笼位</FormLabel>
                  <Box
                    as="select"
                    value={fromCageId()}
                    onChange={(e) => setFromCageId(e.currentTarget.value)}
                    w="100%"
                    px="$3"
                    py="$2"
                    border="1px solid"
                    borderColor="neutral.200"
                    rounded="$md"
                    fontSize="$md"
                    bg="white"
                    _focus={{
                      outline: 'none',
                      borderColor: 'primary.500',
                      boxShadow: '0 0 0 3px rgba(59,130,246,0.1)',
                    }}
                  >
                    <option value="">请选择原笼位</option>
                    {availableFromCages().map((c) => (
                      <option value={c.id}>
                        {c.cageNumber} - {c.strain}（当前 {c.currentCount} 只）
                      </option>
                    ))}
                  </Box>
                </FormControl>
                <FormControl required>
                  <FormLabel>目标笼位（已有动物需品系一致）</FormLabel>
                  <Box
                    as="select"
                    value={toCageId()}
                    onChange={(e) => setToCageId(e.currentTarget.value)}
                    w="100%"
                    px="$3"
                    py="$2"
                    border="1px solid"
                    borderColor="neutral.200"
                    rounded="$md"
                    fontSize="$md"
                    bg="white"
                    _focus={{
                      outline: 'none',
                      borderColor: 'primary.500',
                      boxShadow: '0 0 0 3px rgba(59,130,246,0.1)',
                    }}
                  >
                    <option value="">请选择目标笼位</option>
                    {availableToCages().map((c) => (
                      <option value={c.id}>
                        {c.cageNumber} - {c.currentCount > 0 ? c.strain : '(空笼)'}（当前 {c.currentCount} 只）
                      </option>
                    ))}
                  </Box>
                </FormControl>
                {fromCage() && toCage() && (
                  <Box p="$2" bg="info.50" rounded="$md">
                    <HStack spacing="$4">
                      <VStack align="start" spacing="$1">
                        <Text size="sm" color="gray.600">
                          原笼位 <Badge colorScheme="primary">{fromCage()!.cageNumber}</Badge>
                        </Text>
                        <Text size="sm">
                          {fromCage()!.currentCount} → {fromCage()!.currentCount - transferCount()}
                        </Text>
                      </VStack>
                      <Text size="xl">→</Text>
                      <VStack align="start" spacing="$1">
                        <Text size="sm" color="gray.600">
                          目标笼位 <Badge colorScheme="info">{toCage()!.cageNumber}</Badge>
                        </Text>
                        <Text size="sm">
                          {toCage()!.currentCount} → {toCage()!.currentCount + transferCount()}
                          {toCage()!.currentCount === 0 && (
                            <Text as="span" ml="$1" color="info.600">
                              （品系将设为：{fromCage()!.strain}）
                            </Text>
                          )}
                        </Text>
                      </VStack>
                    </HStack>
                  </Box>
                )}
              </VStack>
            )}

            {transferType() === 'shelf_adjust' && (
              <VStack spacing="$3" align="stretch">
                <FormControl required>
                  <FormLabel>笼位</FormLabel>
                  <Box
                    as="select"
                    value={fromCageId()}
                    onChange={(e) => {
                      setFromCageId(e.currentTarget.value);
                      const c = cages().find((x) => x.id === e.currentTarget.value);
                      if (c) setToShelf(c.shelf);
                    }}
                    w="100%"
                    px="$3"
                    py="$2"
                    border="1px solid"
                    borderColor="neutral.200"
                    rounded="$md"
                    fontSize="$md"
                    bg="white"
                    _focus={{
                      outline: 'none',
                      borderColor: 'primary.500',
                      boxShadow: '0 0 0 3px rgba(59,130,246,0.1)',
                    }}
                  >
                    <option value="">请选择笼位</option>
                    {cages().map((c) => (
                      <option value={c.id}>
                        {c.cageNumber} - {c.strain}（当前架位：{c.shelf || '-'}）
                      </option>
                    ))}
                  </Box>
                </FormControl>
                {fromCage() && (
                  <Box p="$2" bg="gray.50" rounded="$md">
                    <Text size="sm">
                      当前架位：<Badge colorScheme="neutral">{fromCage()!.shelf || '未设置'}</Badge>
                    </Text>
                  </Box>
                )}
                <FormControl required>
                  <FormLabel>目标架位</FormLabel>
                  <Input
                    value={toShelf()}
                    onInput={(e) => setToShelf(e.currentTarget.value)}
                    placeholder="请输入目标架位"
                  />
                </FormControl>
              </VStack>
            )}

            <HStack spacing="$3">
              <FormControl required flex={1}>
                <FormLabel>转移原因</FormLabel>
                <Box
                  as="select"
                  value={reason()}
                  onChange={(e) => setReason(e.currentTarget.value as TransferReason)}
                  w="100%"
                  px="$3"
                  py="$2"
                  border="1px solid"
                  borderColor="neutral.200"
                  rounded="$md"
                  fontSize="$md"
                  bg="white"
                  _focus={{
                    outline: 'none',
                    borderColor: 'primary.500',
                    boxShadow: '0 0 0 3px rgba(59,130,246,0.1)',
                  }}
                >
                  {TRANSFER_REASON_LIST.map((r) => (
                    <option value={r}>{TRANSFER_REASON_LABELS[r]}</option>
                  ))}
                </Box>
              </FormControl>
              <FormControl required flex={1}>
                <FormLabel>负责人</FormLabel>
                <Input
                  value={personInCharge()}
                  onInput={(e) => setPersonInCharge(e.currentTarget.value)}
                  placeholder="请输入负责人姓名"
                />
                <Text size="xs" color="gray.500" mt="$1">
                  中文/英文/数字，2-20字符
                </Text>
              </FormControl>
            </HStack>

            <FormControl>
              <FormLabel>实验批次</FormLabel>
              <Box
                as="select"
                value={experimentBatchId()}
                onChange={(e) => setExperimentBatchId(e.currentTarget.value)}
                w="100%"
                px="$3"
                py="$2"
                border="1px solid"
                borderColor="neutral.200"
                rounded="$md"
                fontSize="$md"
                bg="white"
                _focus={{
                  outline: 'none',
                  borderColor: 'primary.500',
                  boxShadow: '0 0 0 3px rgba(59,130,246,0.1)',
                }}
              >
                <option value="">（不绑定/使用笼位默认批次）</option>
                {experimentBatches().map((b) => (
                  <option value={b.id}>
                    {b.batchNumber} - {b.projectName}（{b.personInCharge}）
                  </option>
                ))}
              </Box>
              <Text size="xs" color="gray.500" mt="$1">
                留空则使用操作笼位已绑定的批次
              </Text>
            </FormControl>
            <FormControl>
              <FormLabel>备注</FormLabel>
              <Textarea
                value={remarks()}
                onInput={(e) => setRemarks(e.currentTarget.value)}
                placeholder="请输入备注信息（可选）"
                rows={2}
              />
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" mr="$3" onClick={handleClose}>
            取消
          </Button>
          <Button colorScheme="primary" onClick={handleSubmit}>
            确认{TRANSFER_TYPE_LABELS[transferType()]}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

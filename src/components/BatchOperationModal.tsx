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
  Button,
  Box,
  Text,
  VStack,
  HStack,
  Badge,
} from '@hope-ui/solid';
import type {
  Cage,
  CleanStatus,
  BatchOperationType,
  BatchOperationResult,
} from '../types';
import { CLEAN_STATUS_LABELS } from '../constants';
import { validatePersonName } from '../store';

interface BatchOperationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCages: Cage[];
  operationType: BatchOperationType;
  onConfirm: (result: BatchOperationResult) => void;
  performOperation: (
    cageIds: string[],
    cleanStatus?: CleanStatus,
    personInCharge?: string
  ) => BatchOperationResult;
}

export default function BatchOperationModal(props: BatchOperationModalProps) {
  const [personInCharge, setPersonInCharge] = createSignal('');
  const [cleanStatus, setCleanStatus] = createSignal<CleanStatus>('clean');
  const [error, setError] = createSignal('');
  const [result, setResult] = createSignal<BatchOperationResult | null>(null);

  createEffect(() => {
    if (props.isOpen) {
      setPersonInCharge('');
      setCleanStatus('clean');
      setError('');
      setResult(null);
    }
  });

  const getOperationTitle = () => {
    switch (props.operationType) {
      case 'mark_to_eliminate':
        return '批量标记待淘汰确认';
      case 'clear_cages':
        return '批量清空确认';
      case 'update_clean_status':
        return '批量修改清洁状态确认';
    }
  };

  const getOperationDescription = () => {
    switch (props.operationType) {
      case 'mark_to_eliminate':
        return '即将将以下笼位标记为"待淘汰"状态，请确认操作：';
      case 'clear_cages':
        return '即将将以下笼位标记为"已清空"状态（仅数量为0的笼位可清空），请确认操作：';
      case 'update_clean_status':
        return '即将修改以下笼位的清洁状态，请确认操作：';
    }
  };

  const handleSubmit = () => {
    setError('');
    setResult(null);

    const nameError = validatePersonName(personInCharge());
    if (nameError) {
      setError(nameError);
      return;
    }

    const ids = props.selectedCages.map((c) => c.id);
    const opResult = props.performOperation(
      ids,
      props.operationType === 'update_clean_status' ? cleanStatus() : undefined,
      personInCharge()
    );

    setResult(opResult);

    if (opResult.failed.length === 0) {
      props.onConfirm(opResult);
    }
  };

  const handleClose = () => {
    props.onClose();
  };

  return (
    <Modal opened={props.isOpen} onClose={handleClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{getOperationTitle()}</ModalHeader>
        <ModalBody>
          <VStack spacing="$4" align="stretch">
            <Text>{getOperationDescription()}</Text>

            {props.operationType === 'update_clean_status' && !result() && (
              <FormControl required>
                <FormLabel>目标清洁状态</FormLabel>
                <Box
                  as="select"
                  value={cleanStatus()}
                  onChange={(e) => setCleanStatus(e.currentTarget.value as CleanStatus)}
                  w="100%"
                  px="$3"
                  py="$2"
                  border="1px solid"
                  borderColor="neutral.200"
                  rounded="$md"
                  fontSize="$md"
                  bg="white"
                  _focus={{ outline: 'none', borderColor: 'primary.500', boxShadow: '0 0 0 3px rgba(59,130,246,0.1)' }}
                >
                  <option value="clean">清洁</option>
                  <option value="dirty">污染</option>
                  <option value="need_clean">待清洁</option>
                </Box>
              </FormControl>
            )}

            <FormControl required>
              <FormLabel>操作负责人</FormLabel>
              <Input
                value={personInCharge()}
                onInput={(e) => setPersonInCharge(e.currentTarget.value)}
                placeholder="请输入负责人姓名（中文/英文/数字，2-20字符）"
                disabled={!!result()}
              />
              <Text size="xs" color="gray.500" mt="$1">
                只能包含中文、英文字母、数字、空格和中间点
              </Text>
            </FormControl>

            {error() && (
              <Box p="$2" bg="rgba(248, 113, 113, 0.1)" rounded="$md" color="red.400">
                {error()}
              </Box>
            )}

            {result() ? (
              <Box>
                <HStack mb="$2" spacing="$3">
                  <Badge colorScheme="success">成功 {result()!.success.length} 个</Badge>
                  <Badge colorScheme="danger">失败 {result()!.failed.length} 个</Badge>
                  <Badge colorScheme="neutral">总计 {result()!.total} 个</Badge>
                </HStack>
                {result()!.failed.length > 0 && (
                  <Box maxH="200px" overflowY="auto">
                    {result()!.failed.map((f) => (
                      <Box key={f.cageId} p="$2" borderBottom="1px solid" borderColor="gray.100">
                        <Text size="sm">
                          <Badge colorScheme="danger" mr="$2">{f.cageNumber}</Badge>
                          <Text color="gray.600" as="span">{f.reason}</Text>
                        </Text>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            ) : (
              <Box>
                <Text size="sm" color="gray.600" mb="$2">
                  已选择 {props.selectedCages.length} 个笼位：
                </Text>
                <Box
                  maxH="150px"
                  overflowY="auto"
                  p="$2"
                  bg="gray.50"
                  rounded="$md"
                >
                  <HStack flexWrap="wrap" spacing="$2">
                    {props.selectedCages.map((c) => (
                      <Badge key={c.id} colorScheme="primary" variant="subtle">
                        {c.cageNumber}
                      </Badge>
                    ))}
                  </HStack>
                </Box>
              </Box>
            )}

            <Box
              p="$3"
              bg="rgba(245, 158, 11, 0.1)"
              rounded="$md"
            >
              <Text size="sm" color="warning.700">
                ⚠️ 此操作将永久记录在变更历史中，不可撤销。请确认已勾选正确的笼位。
              </Text>
            </Box>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" mr="$3" onClick={handleClose}>
            {result() ? '关闭' : '取消'}
          </Button>
          {!result() && (
            <Button
              colorScheme={props.operationType === 'clear_cages' ? 'neutral' : 'warning'}
              onClick={handleSubmit}
            >
              确认执行
            </Button>
          )}
          {result() && result()!.success.length > 0 && (
            <Button colorScheme="primary" onClick={handleClose}>
              完成
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

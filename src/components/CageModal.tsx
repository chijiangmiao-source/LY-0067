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
} from '@hope-ui/solid';
import type { Cage } from '../types';
import { useCageStore, useExperimentBatchStore } from '../store';

interface CageModalProps {
  isOpen: boolean;
  onClose: () => void;
  cage?: Cage | null;
}

export default function CageModal(props: CageModalProps) {
  const { addCage, updateCage } = useCageStore();
  const { experimentBatches } = useExperimentBatchStore();
  const [cageNumber, setCageNumber] = createSignal('');
  const [strain, setStrain] = createSignal('');
  const [currentCount, setCurrentCount] = createSignal(0);
  const [shelf, setShelf] = createSignal('');
  const [eliminationStatus, setEliminationStatus] = createSignal<Cage['eliminationStatus']>('normal');
  const [cleanStatus, setCleanStatus] = createSignal<Cage['cleanStatus']>('clean');
  const [experimentBatchId, setExperimentBatchId] = createSignal<string | undefined>(undefined);
  const [error, setError] = createSignal('');

  createEffect(() => {
    if (props.cage) {
      setCageNumber(props.cage.cageNumber);
      setStrain(props.cage.strain);
      setCurrentCount(props.cage.currentCount);
      setShelf(props.cage.shelf);
      setEliminationStatus(props.cage.eliminationStatus);
      setCleanStatus(props.cage.cleanStatus);
      setExperimentBatchId(props.cage.experimentBatchId);
    } else {
      resetForm();
    }
  });

  const resetForm = () => {
    setCageNumber('');
    setStrain('');
    setCurrentCount(0);
    setShelf('');
    setEliminationStatus('normal');
    setCleanStatus('clean');
    setExperimentBatchId(undefined);
    setError('');
  };

  const handleSubmit = () => {
    const cageData = {
      cageNumber: cageNumber(),
      strain: strain(),
      currentCount: currentCount(),
      shelf: shelf(),
      eliminationStatus: eliminationStatus(),
      cleanStatus: cleanStatus(),
      experimentBatchId: experimentBatchId(),
    };

    let err: string | null;
    if (props.cage) {
      err = updateCage(props.cage.id, cageData);
    } else {
      err = addCage(cageData);
    }

    if (err) {
      setError(err);
    } else {
      props.onClose();
      resetForm();
    }
  };

  const handleClose = () => {
    resetForm();
    props.onClose();
  };

  return (
    <Modal opened={props.isOpen} onClose={handleClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{props.cage ? '编辑笼位' : '新增笼位'}</ModalHeader>
        <ModalBody>
          {error() && (
            <Box mb="$3" p="$2" bg="rgba(248, 113, 113, 0.1)" rounded="$md" color="red.400">
              {error()}
            </Box>
          )}
          <FormControl mb="$3" required>
            <FormLabel>笼位编号</FormLabel>
            <Input
              value={cageNumber()}
              onInput={(e) => setCageNumber(e.currentTarget.value)}
              placeholder="请输入笼位编号"
            />
          </FormControl>
          <FormControl mb="$3" required>
            <FormLabel>动物品系</FormLabel>
            <Input
              value={strain()}
              onInput={(e) => setStrain(e.currentTarget.value)}
              placeholder="请输入动物品系"
            />
          </FormControl>
          <FormControl mb="$3" required>
            <FormLabel>当前数量</FormLabel>
            <Input
              type="number"
              value={currentCount()}
              onInput={(e) => setCurrentCount(Math.max(0, parseInt(e.currentTarget.value) || 0))}
              min={0}
            />
          </FormControl>
          <FormControl mb="$3">
            <FormLabel>所在架位</FormLabel>
            <Input
              value={shelf()}
              onInput={(e) => setShelf(e.currentTarget.value)}
              placeholder="请输入所在架位"
            />
          </FormControl>
          <FormControl mb="$3">
            <FormLabel>淘汰状态</FormLabel>
            <Box
              as="select"
              value={eliminationStatus()}
              onChange={(e) => setEliminationStatus(e.currentTarget.value as any)}
              w="100%"
              px="$3"
              py="$2"
              border="1px solid"
              borderColor="neutral.200"
              rounded="$md"
              fontSize="$md"
              bg="white"
              _focus={{ outline: "none", borderColor: "primary.500", boxShadow: "0 0 0 3px rgba(59,130,246,0.1)" }}
            >
              <option value="normal">正常</option>
              <option value="to_eliminate">待淘汰</option>
              <option value="eliminated">已淘汰</option>
              <option value="cleared">已清空</option>
            </Box>
          </FormControl>
          <FormControl mb="$3">
            <FormLabel>清洁状态</FormLabel>
            <Box
              as="select"
              value={cleanStatus()}
              onChange={(e) => setCleanStatus(e.currentTarget.value as any)}
              w="100%"
              px="$3"
              py="$2"
              border="1px solid"
              borderColor="neutral.200"
              rounded="$md"
              fontSize="$md"
              bg="white"
              _focus={{ outline: "none", borderColor: "primary.500", boxShadow: "0 0 0 3px rgba(59,130,246,0.1)" }}
            >
              <option value="clean">清洁</option>
              <option value="dirty">污染</option>
              <option value="need_clean">待清洁</option>
            </Box>
          </FormControl>
          <FormControl mb="$3">
            <FormLabel>实验批次</FormLabel>
            <Box
              as="select"
              value={experimentBatchId() || ''}
              onChange={(e) => setExperimentBatchId(e.currentTarget.value || undefined)}
              w="100%"
              px="$3"
              py="$2"
              border="1px solid"
              borderColor="neutral.200"
              rounded="$md"
              fontSize="$md"
              bg="white"
              _focus={{ outline: "none", borderColor: "primary.500", boxShadow: "0 0 0 3px rgba(59,130,246,0.1)" }}
            >
              <option value="">（不绑定）</option>
              {experimentBatches().map((b) => (
                <option value={b.id}>
                  {b.batchNumber} - {b.projectName}（{b.personInCharge}）
                </option>
              ))}
            </Box>
          </FormControl>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" mr="$3" onClick={handleClose}>
            取消
          </Button>
          <Button colorScheme="primary" onClick={handleSubmit}>
            {props.cage ? '保存' : '新增'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

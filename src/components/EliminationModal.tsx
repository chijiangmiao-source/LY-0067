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
} from '@hope-ui/solid';
import type { Cage } from '../types';
import { useRecordStore } from '../store';

interface EliminationModalProps {
  isOpen: boolean;
  onClose: () => void;
  cage: Cage | null;
}

export default function EliminationModal(props: EliminationModalProps) {
  const { addRecord } = useRecordStore();
  const [eliminationDate, setEliminationDate] = createSignal(
    new Date().toISOString().split('T')[0]
  );
  const [eliminationCount, setEliminationCount] = createSignal(1);
  const [personInCharge, setPersonInCharge] = createSignal('');
  const [remarks, setRemarks] = createSignal('');
  const [error, setError] = createSignal('');

  createEffect(() => {
    if (props.cage) {
      setEliminationDate(new Date().toISOString().split('T')[0]);
      setEliminationCount(Math.min(1, props.cage.currentCount));
      setPersonInCharge('');
      setRemarks('');
      setError('');
    }
  });

  const resetForm = () => {
    setEliminationDate(new Date().toISOString().split('T')[0]);
    setEliminationCount(1);
    setPersonInCharge('');
    setRemarks('');
    setError('');
  };

  const handleSubmit = () => {
    if (!props.cage) return;

    const err = addRecord({
      cageId: props.cage.id,
      eliminationDate: eliminationDate(),
      eliminationCount: eliminationCount(),
      personInCharge: personInCharge(),
      remarks: remarks(),
    });

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
        <ModalHeader>淘汰登记</ModalHeader>
        <ModalBody>
          {props.cage && (
            <Box mb="$3" p="$3" bg="gray.50" rounded="$md">
              <Text size="sm" color="gray.600">
                笼位编号：<Text color="gray.800" weight="medium" as="span">{props.cage.cageNumber}</Text>
              </Text>
              <Text size="sm" color="gray.600">
                当前数量：<Text color="gray.800" weight="medium" as="span">{props.cage.currentCount}</Text>
              </Text>
            </Box>
          )}
          {error() && (
            <Box mb="$3" p="$2" bg="rgba(248, 113, 113, 0.1)" rounded="$md" color="red.400">
              {error()}
            </Box>
          )}
          <FormControl mb="$3" required>
            <FormLabel>淘汰日期</FormLabel>
            <Input
              type="date"
              value={eliminationDate()}
              onInput={(e) => setEliminationDate(e.currentTarget.value)}
              max={new Date().toISOString().split('T')[0]}
            />
          </FormControl>
          <FormControl mb="$3" required>
            <FormLabel>淘汰数量</FormLabel>
            <Input
              type="number"
              value={eliminationCount()}
              onInput={(e) => setEliminationCount(Math.max(1, Math.min(props.cage?.currentCount || 1, parseInt(e.currentTarget.value) || 1)))}
              min={1}
              max={props.cage?.currentCount || 1}
            />
          </FormControl>
          <FormControl mb="$3" required>
            <FormLabel>负责人</FormLabel>
            <Input
              value={personInCharge()}
              onInput={(e) => setPersonInCharge(e.currentTarget.value)}
              placeholder="请输入负责人姓名"
            />
          </FormControl>
          <FormControl mb="$3">
            <FormLabel>备注</FormLabel>
            <Textarea
              value={remarks()}
              onInput={(e) => setRemarks(e.currentTarget.value)}
              placeholder="请输入备注信息（可选）"
              rows={3}
            />
          </FormControl>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" mr="$3" onClick={handleClose}>
            取消
          </Button>
          <Button colorScheme="danger" onClick={handleSubmit}>
            确认淘汰
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

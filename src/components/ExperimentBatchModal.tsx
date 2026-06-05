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
  VStack,
} from '@hope-ui/solid';
import type { ExperimentBatch, ExperimentStage, BatchUsageStatus } from '../types';
import { useExperimentBatchStore } from '../store';
import { EXPERIMENT_STAGE_LABELS, BATCH_USAGE_STATUS_LABELS } from '../constants';

interface ExperimentBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  batch?: ExperimentBatch | null;
}

export default function ExperimentBatchModal(props: ExperimentBatchModalProps) {
  const { addBatch, updateBatch } = useExperimentBatchStore();

  const [batchNumber, setBatchNumber] = createSignal('');
  const [projectName, setProjectName] = createSignal('');
  const [experimentStage, setExperimentStage] = createSignal<ExperimentStage>('preparation');
  const [usageStatus, setUsageStatus] = createSignal<BatchUsageStatus>('idle');
  const [personInCharge, setPersonInCharge] = createSignal('');
  const [startDate, setStartDate] = createSignal(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = createSignal('');
  const [remarks, setRemarks] = createSignal('');
  const [error, setError] = createSignal('');

  createEffect(() => {
    if (props.batch) {
      setBatchNumber(props.batch.batchNumber);
      setProjectName(props.batch.projectName);
      setExperimentStage(props.batch.experimentStage);
      setUsageStatus(props.batch.usageStatus);
      setPersonInCharge(props.batch.personInCharge);
      setStartDate(props.batch.startDate);
      setEndDate(props.batch.endDate || '');
      setRemarks(props.batch.remarks || '');
    } else {
      resetForm();
    }
  });

  const resetForm = () => {
    setBatchNumber('');
    setProjectName('');
    setExperimentStage('preparation');
    setUsageStatus('idle');
    setPersonInCharge('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate('');
    setRemarks('');
    setError('');
  };

  const handleSubmit = () => {
    if (!batchNumber().trim()) {
      setError('请输入实验批次编号');
      return;
    }
    if (!projectName().trim()) {
      setError('请输入课题名称');
      return;
    }
    if (!personInCharge().trim()) {
      setError('请输入负责人');
      return;
    }
    if (!startDate().trim()) {
      setError('请输入开始日期');
      return;
    }

    const data = {
      batchNumber: batchNumber().trim(),
      projectName: projectName().trim(),
      experimentStage: experimentStage(),
      usageStatus: usageStatus(),
      personInCharge: personInCharge().trim(),
      startDate: startDate(),
      endDate: endDate() || undefined,
      remarks: remarks() || undefined,
    };

    let err: string | null;
    if (props.batch) {
      err = updateBatch(props.batch.id, data);
    } else {
      err = addBatch(data);
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
        <ModalHeader>{props.batch ? '编辑实验批次' : '新增实验批次'}</ModalHeader>
        <ModalBody>
          {error() && (
            <Box mb="$3" p="$2" bg="rgba(248, 113, 113, 0.1)" rounded="$md" color="red.400">
              {error()}
            </Box>
          )}
          <VStack spacing="$3" align="stretch">
            <FormControl required>
              <FormLabel>批次编号</FormLabel>
              <Input
                value={batchNumber()}
                onInput={(e) => setBatchNumber(e.currentTarget.value)}
                placeholder="请输入实验批次编号"
              />
            </FormControl>
            <FormControl required>
              <FormLabel>课题名称</FormLabel>
              <Input
                value={projectName()}
                onInput={(e) => setProjectName(e.currentTarget.value)}
                placeholder="请输入课题名称"
              />
            </FormControl>
            <FormControl required>
              <FormLabel>负责人</FormLabel>
              <Input
                value={personInCharge()}
                onInput={(e) => setPersonInCharge(e.currentTarget.value)}
                placeholder="请输入负责人姓名"
              />
            </FormControl>
            <Box display="grid" gridTemplateColumns="1fr 1fr" gap="$3">
              <FormControl required>
                <FormLabel>开始日期</FormLabel>
                <Input
                  type="date"
                  value={startDate()}
                  onInput={(e) => setStartDate(e.currentTarget.value)}
                />
              </FormControl>
              <FormControl>
                <FormLabel>结束日期</FormLabel>
                <Input
                  type="date"
                  value={endDate()}
                  onInput={(e) => setEndDate(e.currentTarget.value)}
                />
              </FormControl>
            </Box>
            <Box display="grid" gridTemplateColumns="1fr 1fr" gap="$3">
              <FormControl required>
                <FormLabel>实验阶段</FormLabel>
                <Box
                  as="select"
                  value={experimentStage()}
                  onChange={(e) => setExperimentStage(e.currentTarget.value as any)}
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
                  {(Object.keys(EXPERIMENT_STAGE_LABELS) as ExperimentStage[]).map((key) => (
                    <option value={key}>{EXPERIMENT_STAGE_LABELS[key]}</option>
                  ))}
                </Box>
              </FormControl>
              <FormControl required>
                <FormLabel>使用状态</FormLabel>
                <Box
                  as="select"
                  value={usageStatus()}
                  onChange={(e) => setUsageStatus(e.currentTarget.value as any)}
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
                  {(Object.keys(BATCH_USAGE_STATUS_LABELS) as BatchUsageStatus[]).map((key) => (
                    <option value={key}>{BATCH_USAGE_STATUS_LABELS[key]}</option>
                  ))}
                </Box>
              </FormControl>
            </Box>
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
            {props.batch ? '保存' : '新增'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

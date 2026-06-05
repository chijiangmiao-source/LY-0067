import { createMemo, createSignal } from 'solid-js';
import {
  Box,
  Heading,
  HStack,
  VStack,
  Text,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Input,
  FormControl,
  FormLabel,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Grid,
  GridItem,
} from '@hope-ui/solid';
import Chart from 'solid-echarts';
import type { EChartsOption } from 'echarts';
import ExperimentBatchModal from './ExperimentBatchModal';
import type {
  ExperimentBatch,
  ExperimentStage,
  BatchUsageStatus,
  ExperimentBatchCageAssociation,
  ExperimentBatchOperationAssociation,
} from '../types';
import {
  useExperimentBatchStore,
  useCageStore,
} from '../store';
import {
  EXPERIMENT_STAGE_LABELS,
  EXPERIMENT_STAGE_COLORS,
  BATCH_USAGE_STATUS_LABELS,
  BATCH_USAGE_STATUS_COLORS,
  CHANGE_LOG_TYPE_LABELS,
} from '../constants';

const OPERATION_TYPE_LABELS: Record<string, string> = {
  transfer_in: '转入',
  transfer_out: '转出',
  merge_cage: '合笼',
  split_cage: '拆笼',
  elimination: '淘汰',
  cage_created: '入笼',
};

export default function ExperimentBatchManagement() {
  const {
    experimentBatches,
    addBatch,
    updateBatch,
    deleteBatch,
    getBatchById,
    getActiveBatchCageAssociations,
    getBatchCageAssociations,
    getBatchOperationAssociations,
    getBatchStats,
    getAllBatchStats,
    getProjectCageDistribution,
    get30DayBatchTrend,
  } = useExperimentBatchStore();
  const { cages } = useCageStore();

  const [batchModalOpen, setBatchModalOpen] = createSignal(false);
  const [editingBatch, setEditingBatch] = createSignal<ExperimentBatch | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = createSignal(false);
  const [deletingBatch, setDeletingBatch] = createSignal<ExperimentBatch | null>(null);
  const [detailModalOpen, setDetailModalOpen] = createSignal(false);
  const [viewingBatch, setViewingBatch] = createSignal<ExperimentBatch | null>(null);

  const [batchNumberFilter, setBatchNumberFilter] = createSignal('');
  const [projectNameFilter, setProjectNameFilter] = createSignal('');
  const [stageFilter, setStageFilter] = createSignal<ExperimentStage | ''>('');
  const [statusFilter, setStatusFilter] = createSignal<BatchUsageStatus | ''>('');
  const [personInChargeFilter, setPersonInChargeFilter] = createSignal('');
  const [startDateFilter, setStartDateFilter] = createSignal('');
  const [endDateFilter, setEndDateFilter] = createSignal('');
  const [cageNumberFilter, setCageNumberFilter] = createSignal('');
  const [strainFilter, setStrainFilter] = createSignal('');

  const filteredBatches = createMemo(() => {
    let result = experimentBatches();

    if (batchNumberFilter()) {
      result = result.filter((b) =>
        b.batchNumber.toLowerCase().includes(batchNumberFilter().toLowerCase())
      );
    }
    if (projectNameFilter()) {
      result = result.filter((b) =>
        b.projectName.toLowerCase().includes(projectNameFilter().toLowerCase())
      );
    }
    if (stageFilter()) {
      result = result.filter((b) => b.experimentStage === stageFilter());
    }
    if (statusFilter()) {
      result = result.filter((b) => b.usageStatus === statusFilter());
    }
    if (personInChargeFilter()) {
      result = result.filter((b) =>
        b.personInCharge.toLowerCase().includes(personInChargeFilter().toLowerCase())
      );
    }
    if (startDateFilter()) {
      result = result.filter((b) => b.startDate >= startDateFilter());
    }
    if (endDateFilter()) {
      result = result.filter((b) => (b.endDate || b.startDate) <= endDateFilter());
    }
    if (cageNumberFilter() || strainFilter()) {
      const cageBatchIds = new Set<string>();
      cages()
        .filter((c) => {
          const matchCage = cageNumberFilter()
            ? c.cageNumber.toLowerCase().includes(cageNumberFilter().toLowerCase())
            : true;
          const matchStrain = strainFilter()
            ? c.strain.toLowerCase().includes(strainFilter().toLowerCase())
            : true;
          return matchCage && matchStrain && c.experimentBatchId;
        })
        .forEach((c) => c.experimentBatchId && cageBatchIds.add(c.experimentBatchId));
      result = result.filter((b) => cageBatchIds.has(b.id));
    }

    return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });

  const resetFilters = () => {
    setBatchNumberFilter('');
    setProjectNameFilter('');
    setStageFilter('');
    setStatusFilter('');
    setPersonInChargeFilter('');
    setStartDateFilter('');
    setEndDateFilter('');
    setCageNumberFilter('');
    setStrainFilter('');
  };

  const handleAdd = () => {
    setEditingBatch(null);
    setBatchModalOpen(true);
  };

  const handleEdit = (batch: ExperimentBatch) => {
    setEditingBatch(batch);
    setBatchModalOpen(true);
  };

  const handleView = (batch: ExperimentBatch) => {
    setViewingBatch(batch);
    setDetailModalOpen(true);
  };

  const handleDelete = (batch: ExperimentBatch) => {
    setDeletingBatch(batch);
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (deletingBatch()) {
      deleteBatch(deletingBatch()!.id);
      setDeleteModalOpen(false);
      setDeletingBatch(null);
    }
  };

  const viewingCageAssociations = createMemo<ExperimentBatchCageAssociation[]>(() =>
    viewingBatch() ? getBatchCageAssociations(viewingBatch()!.id) : []
  );

  const viewingOperationAssociations = createMemo<ExperimentBatchOperationAssociation[]>(() =>
    viewingBatch() ? getBatchOperationAssociations(viewingBatch()!.id) : []
  );

  const allStats = createMemo(() => getAllBatchStats());
  const projectDistribution = createMemo(() => getProjectCageDistribution());
  const batchTrend30 = createMemo(() => get30DayBatchTrend());

  const usageChartOption = createMemo<EChartsOption>(() => {
    const stats = allStats();
    return {
      title: {
        text: '批次使用情况统计',
        left: 'center',
        textStyle: { fontSize: 14 },
      },
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { orient: 'horizontal', bottom: 0 },
      series: [
        {
          name: '批次数量',
          type: 'pie',
          radius: ['35%', '60%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 6,
            borderColor: '#fff',
            borderWidth: 2,
          },
          label: { show: false, position: 'center' },
          emphasis: {
            label: { show: true, fontSize: 18, fontWeight: 'bold' },
          },
          labelLine: { show: false },
          data: [
            {
              value: stats.activeBatches,
              name: BATCH_USAGE_STATUS_LABELS.active,
              itemStyle: { color: BATCH_USAGE_STATUS_COLORS.active },
            },
            {
              value: stats.idleBatches,
              name: BATCH_USAGE_STATUS_LABELS.idle,
              itemStyle: { color: BATCH_USAGE_STATUS_COLORS.idle },
            },
            {
              value: stats.completedBatches,
              name: BATCH_USAGE_STATUS_LABELS.completed,
              itemStyle: { color: BATCH_USAGE_STATUS_COLORS.completed },
            },
            {
              value: stats.archivedBatches,
              name: BATCH_USAGE_STATUS_LABELS.archived,
              itemStyle: { color: BATCH_USAGE_STATUS_COLORS.archived },
            },
          ],
        },
      ],
    };
  });

  const trendChartOption = createMemo<EChartsOption>(() => {
    const trend = batchTrend30();
    return {
      title: {
        text: '近30天批次流转趋势',
        left: 'center',
        textStyle: { fontSize: 14 },
      },
      tooltip: { trigger: 'axis' },
      legend: {
        orient: 'horizontal',
        bottom: 0,
        data: ['绑定笼位数', '解绑笼位数', '操作次数'],
      },
      grid: { top: 50, bottom: 60, left: 50, right: 20 },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: trend.map((d) => d.date.slice(5)),
        axisLabel: { rotate: 45, fontSize: 10 },
      },
      yAxis: { type: 'value', minInterval: 1 },
      series: [
        {
          name: '绑定笼位数',
          type: 'line',
          smooth: true,
          data: trend.map((d) => d.bindCount),
          itemStyle: { color: '#22c55e' },
        },
        {
          name: '解绑笼位数',
          type: 'line',
          smooth: true,
          data: trend.map((d) => d.unbindCount),
          itemStyle: { color: '#ef4444' },
        },
        {
          name: '操作次数',
          type: 'line',
          smooth: true,
          data: trend.map((d) => d.operationCount),
          itemStyle: { color: '#3b82f6' },
        },
      ],
    };
  });

  const projectChartOption = createMemo<EChartsOption>(() => {
    const dist = projectDistribution();
    const data = dist.map((d) => ({
      value: d.cageCount,
      name: d.projectName,
    }));
    return {
      title: {
        text: '各课题占用笼位分布',
        left: 'center',
        textStyle: { fontSize: 14 },
      },
      tooltip: { trigger: 'item', formatter: '{b}: {c}笼 ({d}%)' },
      legend: { orient: 'vertical', left: 'left', top: 'center' },
      series: [
        {
          name: '笼位数',
          type: 'pie',
          radius: '55%',
          center: ['60%', '50%'],
          label: {
            formatter: '{b}\n{d}%',
            fontSize: 11,
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
          data,
        },
      ],
    };
  });

  return (
    <Box>
      <VStack spacing="$4" align="stretch">
        <HStack justifyContent="space-between">
          <Heading size="xl">实验批次关联管理</Heading>
          <Button colorScheme="primary" onClick={handleAdd}>
            新增批次
          </Button>
        </HStack>

        <Box p="$4" bg="white" rounded="$lg" shadow="sm" border="1px solid" borderColor="gray.100">
          <Text mb="$3" weight="medium" size="lg">
            筛选条件
          </Text>
          <Grid templateColumns="repeat(4, 1fr)" gap="$3" mb="$3">
            <FormControl>
              <FormLabel size="sm">批次编号</FormLabel>
              <Input
                size="sm"
                value={batchNumberFilter()}
                onInput={(e) => setBatchNumberFilter(e.currentTarget.value)}
                placeholder="输入批次编号"
              />
            </FormControl>
            <FormControl>
              <FormLabel size="sm">课题名称</FormLabel>
              <Input
                size="sm"
                value={projectNameFilter()}
                onInput={(e) => setProjectNameFilter(e.currentTarget.value)}
                placeholder="输入课题名称"
              />
            </FormControl>
            <FormControl>
              <FormLabel size="sm">笼位编号</FormLabel>
              <Input
                size="sm"
                value={cageNumberFilter()}
                onInput={(e) => setCageNumberFilter(e.currentTarget.value)}
                placeholder="输入笼位编号"
              />
            </FormControl>
            <FormControl>
              <FormLabel size="sm">品系</FormLabel>
              <Input
                size="sm"
                value={strainFilter()}
                onInput={(e) => setStrainFilter(e.currentTarget.value)}
                placeholder="输入动物品系"
              />
            </FormControl>
            <FormControl>
              <FormLabel size="sm">实验阶段</FormLabel>
              <Box
                as="select"
                value={stageFilter()}
                onChange={(e) => setStageFilter(e.currentTarget.value as any)}
                w="100%"
                px="$3"
                py="$1.5"
                border="1px solid"
                borderColor="neutral.200"
                rounded="$md"
                fontSize="$sm"
                bg="white"
              >
                <option value="">全部</option>
                {(Object.keys(EXPERIMENT_STAGE_LABELS) as ExperimentStage[]).map((key) => (
                  <option value={key}>{EXPERIMENT_STAGE_LABELS[key]}</option>
                ))}
              </Box>
            </FormControl>
            <FormControl>
              <FormLabel size="sm">使用状态</FormLabel>
              <Box
                as="select"
                value={statusFilter()}
                onChange={(e) => setStatusFilter(e.currentTarget.value as any)}
                w="100%"
                px="$3"
                py="$1.5"
                border="1px solid"
                borderColor="neutral.200"
                rounded="$md"
                fontSize="$sm"
                bg="white"
              >
                <option value="">全部</option>
                {(Object.keys(BATCH_USAGE_STATUS_LABELS) as BatchUsageStatus[]).map((key) => (
                  <option value={key}>{BATCH_USAGE_STATUS_LABELS[key]}</option>
                ))}
              </Box>
            </FormControl>
            <FormControl>
              <FormLabel size="sm">负责人</FormLabel>
              <Input
                size="sm"
                value={personInChargeFilter()}
                onInput={(e) => setPersonInChargeFilter(e.currentTarget.value)}
                placeholder="输入负责人"
              />
            </FormControl>
            <FormControl>
              <FormLabel size="sm">开始日期</FormLabel>
              <Input
                size="sm"
                type="date"
                value={startDateFilter()}
                onInput={(e) => setStartDateFilter(e.currentTarget.value)}
              />
            </FormControl>
          </Grid>
          <HStack>
            <FormControl>
              <FormLabel size="sm">结束日期</FormLabel>
              <Input
                size="sm"
                type="date"
                value={endDateFilter()}
                onInput={(e) => setEndDateFilter(e.currentTarget.value)}
              />
            </FormControl>
            <Box flex="1" />
            <Button size="sm" variant="outline" onClick={resetFilters}>
              重置筛选
            </Button>
          </HStack>
        </Box>

        <Grid templateColumns="repeat(4, 1fr)" gap="$3">
          <GridItem>
            <Box p="$4" bg="white" rounded="$lg" shadow="sm" border="1px solid" borderColor="gray.100">
              <Text size="sm" color="gray.500">
                批次总数
              </Text>
              <Text size="2xl" weight="bold" mt="$1">
                {allStats().totalBatches}
              </Text>
            </Box>
          </GridItem>
          <GridItem>
            <Box p="$4" bg="white" rounded="$lg" shadow="sm" border="1px solid" borderColor="gray.100">
              <Text size="sm" color="gray.500">
                进行中批次
              </Text>
              <Text size="2xl" weight="bold" mt="$1" color="#3b82f6">
                {allStats().activeBatches}
              </Text>
            </Box>
          </GridItem>
          <GridItem>
            <Box p="$4" bg="white" rounded="$lg" shadow="sm" border="1px solid" borderColor="gray.100">
              <Text size="sm" color="gray.500">
                绑定笼位数
              </Text>
              <Text size="2xl" weight="bold" mt="$1" color="#22c55e">
                {allStats().activeCages}
              </Text>
            </Box>
          </GridItem>
          <GridItem>
            <Box p="$4" bg="white" rounded="$lg" shadow="sm" border="1px solid" borderColor="gray.100">
              <Text size="sm" color="gray.500">
                实验动物总数
              </Text>
              <Text size="2xl" weight="bold" mt="$1" color="#f59e0b">
                {allStats().totalAnimals}
              </Text>
            </Box>
          </GridItem>
        </Grid>

        <Box p="$4" bg="white" rounded="$lg" shadow="sm" border="1px solid" borderColor="gray.100">
          <Text mb="$3" weight="medium">
            批次列表（{filteredBatches().length}）
          </Text>
          {filteredBatches().length === 0 ? (
            <Text py="$8" textAlign="center" color="gray.400">
              暂无实验批次数据，请点击"新增批次"添加
            </Text>
          ) : (
            <Table overflowX="auto">
              <Thead>
                <Tr>
                  <Th>批次编号</Th>
                  <Th>课题名称</Th>
                  <Th>负责人</Th>
                  <Th>实验阶段</Th>
                  <Th>使用状态</Th>
                  <Th>开始日期</Th>
                  <Th>结束日期</Th>
                  <Th>绑定笼位</Th>
                  <Th>操作</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredBatches().map((batch) => {
                  const stats = getBatchStats(batch.id);
                  return (
                    <Tr key={batch.id}>
                      <Td>
                        <Text weight="medium">{batch.batchNumber}</Text>
                      </Td>
                      <Td>{batch.projectName}</Td>
                      <Td>{batch.personInCharge}</Td>
                      <Td>
                        <Badge colorScheme={EXPERIMENT_STAGE_COLORS[batch.experimentStage] as any}>
                          {EXPERIMENT_STAGE_LABELS[batch.experimentStage]}
                        </Badge>
                      </Td>
                      <Td>
                        <Badge colorScheme={BATCH_USAGE_STATUS_COLORS[batch.usageStatus] as any}>
                          {BATCH_USAGE_STATUS_LABELS[batch.usageStatus]}
                        </Badge>
                      </Td>
                      <Td>{batch.startDate}</Td>
                      <Td>{batch.endDate || '-'}</Td>
                      <Td>
                        <Badge colorScheme="primary" variant="subtle">
                          {stats.cageCount} 笼 / {stats.animalCount} 只
                        </Badge>
                      </Td>
                      <Td>
                        <HStack spacing="$1">
                          <Button size="sm" variant="ghost" colorScheme="primary" onClick={() => handleView(batch)}>
                            详情
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(batch)}>
                            编辑
                          </Button>
                          <Button size="sm" variant="ghost" colorScheme="danger" onClick={() => handleDelete(batch)}>
                            删除
                          </Button>
                        </HStack>
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          )}
        </Box>

        <Grid templateColumns="repeat(3, 1fr)" gap="$3">
          <GridItem>
            <Box p="$4" bg="white" rounded="$lg" shadow="sm" border="1px solid" borderColor="gray.100" h="380px">
              <Chart option={usageChartOption()} style={{ height: '100%', width: '100%' }} />
            </Box>
          </GridItem>
          <GridItem colSpan={2}>
            <Box p="$4" bg="white" rounded="$lg" shadow="sm" border="1px solid" borderColor="gray.100" h="380px">
              <Chart option={trendChartOption()} style={{ height: '100%', width: '100%' }} />
            </Box>
          </GridItem>
          <GridItem colSpan={3}>
            <Box p="$4" bg="white" rounded="$lg" shadow="sm" border="1px solid" borderColor="gray.100" h="380px">
              <Chart option={projectChartOption()} style={{ height: '100%', width: '100%' }} />
            </Box>
          </GridItem>
        </Grid>
      </VStack>

      <ExperimentBatchModal
        isOpen={batchModalOpen()}
        onClose={() => setBatchModalOpen(false)}
        batch={editingBatch()}
      />

      <Modal opened={deleteModalOpen()} onClose={() => setDeleteModalOpen(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>确认删除</ModalHeader>
          <ModalBody>
            <Text>
              确定要删除实验批次 "{deletingBatch()?.batchNumber}" 吗？
              与此批次相关的笼位绑定关系和操作记录将被清除，笼位的批次绑定也将解除。此操作不可恢复。
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" mr="$3" onClick={() => setDeleteModalOpen(false)}>
              取消
            </Button>
            <Button colorScheme="danger" onClick={confirmDelete}>
              删除
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal opened={detailModalOpen()} onClose={() => setDetailModalOpen(false)} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>批次详情 - {viewingBatch()?.batchNumber}</ModalHeader>
          <ModalBody>
            {viewingBatch() && (
              <VStack spacing="$4" align="stretch">
                <Box p="$3" bg="gray.50" rounded="$md">
                  <Grid templateColumns="repeat(2, 1fr)" gap="$2">
                    <HStack>
                      <Text size="sm" color="gray.500" w="$20">
                        课题名称：
                      </Text>
                      <Text size="sm" weight="medium">
                        {viewingBatch()!.projectName}
                      </Text>
                    </HStack>
                    <HStack>
                      <Text size="sm" color="gray.500" w="$20">
                        负责人：
                      </Text>
                      <Text size="sm" weight="medium">
                        {viewingBatch()!.personInCharge}
                      </Text>
                    </HStack>
                    <HStack>
                      <Text size="sm" color="gray.500" w="$20">
                        实验阶段：
                      </Text>
                      <Badge colorScheme={EXPERIMENT_STAGE_COLORS[viewingBatch()!.experimentStage] as any}>
                        {EXPERIMENT_STAGE_LABELS[viewingBatch()!.experimentStage]}
                      </Badge>
                    </HStack>
                    <HStack>
                      <Text size="sm" color="gray.500" w="$20">
                        使用状态：
                      </Text>
                      <Badge colorScheme={BATCH_USAGE_STATUS_COLORS[viewingBatch()!.usageStatus] as any}>
                        {BATCH_USAGE_STATUS_LABELS[viewingBatch()!.usageStatus]}
                      </Badge>
                    </HStack>
                    <HStack>
                      <Text size="sm" color="gray.500" w="$20">
                        开始日期：
                      </Text>
                      <Text size="sm">{viewingBatch()!.startDate}</Text>
                    </HStack>
                    <HStack>
                      <Text size="sm" color="gray.500" w="$20">
                        结束日期：
                      </Text>
                      <Text size="sm">{viewingBatch()!.endDate || '-'}</Text>
                    </HStack>
                  </Grid>
                  {viewingBatch()!.remarks && (
                    <Text size="sm" color="gray.600" mt="$2">
                      备注：{viewingBatch()!.remarks}
                    </Text>
                  )}
                </Box>

                <Box>
                  <Text mb="$2" weight="medium">
                    绑定笼位列表（{viewingCageAssociations().length}）
                  </Text>
                  {viewingCageAssociations().length === 0 ? (
                    <Text py="$4" textAlign="center" color="gray.400" bg="gray.50" rounded="$md">
                      暂无绑定笼位
                    </Text>
                  ) : (
                    <Box maxH="180px" overflowY="auto">
                      <Table size="sm">
                        <Thead>
                          <Tr>
                            <Th>笼位编号</Th>
                            <Th>品系</Th>
                            <Th>数量</Th>
                            <Th>绑定日期</Th>
                            <Th>解绑日期</Th>
                            <Th>状态</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {viewingCageAssociations().map((a) => (
                            <Tr key={a.id}>
                              <Td>{a.cageNumber}</Td>
                              <Td>{a.strain}</Td>
                              <Td>{a.animalCount}</Td>
                              <Td>{a.bindDate}</Td>
                              <Td>{a.unbindDate || '-'}</Td>
                              <Td>
                                {a.isActive ? (
                                  <Badge colorScheme="success" size="sm">
                                    有效
                                  </Badge>
                                ) : (
                                  <Badge colorScheme="neutral" size="sm">
                                    已解绑
                                  </Badge>
                                )}
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </Box>
                  )}
                </Box>

                <Box>
                  <Text mb="$2" weight="medium">
                    关联操作记录（{viewingOperationAssociations().length}）
                  </Text>
                  {viewingOperationAssociations().length === 0 ? (
                    <Text py="$4" textAlign="center" color="gray.400" bg="gray.50" rounded="$md">
                      暂无关联操作
                    </Text>
                  ) : (
                    <Box maxH="180px" overflowY="auto">
                      <Table size="sm">
                        <Thead>
                          <Tr>
                            <Th>操作类型</Th>
                            <Th>操作日期</Th>
                            <Th>涉及笼位</Th>
                            <Th>动物数</Th>
                            <Th>负责人</Th>
                            <Th>备注</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {viewingOperationAssociations().map((a) => (
                            <Tr key={a.id}>
                              <Td>
                                <Badge
                                  colorScheme={
                                    (CHANGE_LOG_TYPE_LABELS as any)[a.operationType]
                                      ? 'primary'
                                      : 'neutral'
                                  }
                                  size="sm"
                                >
                                  {OPERATION_TYPE_LABELS[a.operationType] || a.operationType}
                                </Badge>
                              </Td>
                              <Td>{a.operationDate}</Td>
                              <Td>{a.cageIds.length} 个</Td>
                              <Td>{a.animalCount}</Td>
                              <Td>{a.personInCharge || '-'}</Td>
                              <Td>{a.remarks || '-'}</Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </Box>
                  )}
                </Box>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="primary" onClick={() => setDetailModalOpen(false)}>
              关闭
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

import { createMemo } from 'solid-js';
import {
  Box,
  Grid,
  GridItem,
  Heading,
  Text,
  VStack,
  HStack,
  Badge,
} from '@hope-ui/solid';
import Chart from 'solid-echarts';
import type { EChartsOption } from 'echarts';
import { useCageStore, useRecordStore, useChangeLogStore, useTransferStore, useExperimentBatchStore } from '../store';
import {
  ELIMINATION_STATUS_LABELS,
  CHANGE_LOG_TYPE_LABELS,
  BATCH_USAGE_STATUS_LABELS,
  BATCH_USAGE_STATUS_COLORS,
} from '../constants';

export default function StatisticsBoard() {
  const { cages } = useCageStore();
  const { records } = useRecordStore();
  const { changeLogs } = useChangeLogStore();
  const { transferRecords } = useTransferStore();
  const {
    experimentBatches,
    getAllBatchStats,
    getProjectCageDistribution,
    get30DayBatchTrend,
  } = useExperimentBatchStore();

  const totalCages = createMemo(() => cages().length);
  const totalAnimals = createMemo(() =>
    cages().reduce((sum, c) => sum + c.currentCount, 0)
  );
  const toEliminateCount = createMemo(() =>
    cages().filter((c) => c.eliminationStatus === 'to_eliminate').length
  );

  const todayEliminated = createMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return records()
      .filter((r) => r.eliminationDate === today)
      .reduce((sum, r) => sum + r.eliminationCount, 0);
  });

  const abnormalCageCount = createMemo(() => {
    return cages().filter(
      (c) =>
        c.cleanStatus === 'dirty' ||
        c.cleanStatus === 'need_clean' ||
        c.eliminationStatus === 'to_eliminate'
    ).length;
  });

  const dirtyCageCount = createMemo(() =>
    cages().filter((c) => c.cleanStatus === 'dirty').length
  );
  const needCleanCageCount = createMemo(() =>
    cages().filter((c) => c.cleanStatus === 'need_clean').length
  );

  const todayOperations = createMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return changeLogs().filter((log) => log.timestamp.startsWith(today)).length;
  });

  const totalTransfers = createMemo(() => transferRecords().length);
  const todayTransfers = createMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return transferRecords().filter((r) => r.transferDate === today).length;
  });
  const totalTransferAnimals = createMemo(() =>
    transferRecords().reduce((sum, r) => sum + r.transferCount, 0)
  );

  const batchOperationStats = createMemo(() => {
    const batchLogs = changeLogs().filter((log) => log.batchId);
    const batchIds = new Set(batchLogs.map((l) => l.batchId));
    const typeCounts: Record<string, number> = {};
    batchLogs.forEach((log) => {
      typeCounts[log.changeType] = (typeCounts[log.changeType] || 0) + 1;
    });
    return {
      totalBatches: batchIds.size,
      totalAffected: batchLogs.length,
      typeCounts,
    };
  });

  const statusChartOption = createMemo<EChartsOption>(() => {
    const statusCounts: Record<string, number> = {
      normal: 0,
      to_eliminate: 0,
      eliminated: 0,
      cleared: 0,
    };
    cages().forEach((c) => {
      statusCounts[c.eliminationStatus]++;
    });

    return {
      title: {
        text: '淘汰状态分布',
        left: 'center',
        textStyle: { fontSize: 14 },
      },
      tooltip: { trigger: 'item' },
      legend: { orient: 'horizontal', bottom: 0 },
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          label: { show: false },
          emphasis: {
            label: { show: true, fontSize: 14, fontWeight: 'bold' },
          },
          labelLine: { show: false },
          data: [
            {
              value: statusCounts.normal,
              name: ELIMINATION_STATUS_LABELS.normal,
              itemStyle: { color: '#10b981' },
            },
            {
              value: statusCounts.to_eliminate,
              name: ELIMINATION_STATUS_LABELS.to_eliminate,
              itemStyle: { color: '#f59e0b' },
            },
            {
              value: statusCounts.eliminated,
              name: ELIMINATION_STATUS_LABELS.eliminated,
              itemStyle: { color: '#ef4444' },
            },
            {
              value: statusCounts.cleared,
              name: ELIMINATION_STATUS_LABELS.cleared,
              itemStyle: { color: '#6b7280' },
            },
          ],
        },
      ],
    };
  });

  const strainChartOption = createMemo<EChartsOption>(() => {
    const strainCounts: Record<string, number> = {};
    cages().forEach((c) => {
      if (c.strain) {
        strainCounts[c.strain] = (strainCounts[c.strain] || 0) + c.currentCount;
      }
    });

    const strains = Object.keys(strainCounts).sort(
      (a, b) => strainCounts[b] - strainCounts[a]
    );

    return {
      title: {
        text: '品系数量统计',
        left: 'center',
        textStyle: { fontSize: 14 },
      },
      tooltip: { trigger: 'axis' },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: strains,
        axisLabel: { rotate: 30 },
      },
      yAxis: { type: 'value' },
      series: [
        {
          type: 'bar',
          data: strains.map((s) => strainCounts[s]),
          itemStyle: { color: '#3b82f6' },
        },
      ],
    };
  });

  const operationTrendOption = createMemo<EChartsOption>(() => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      return d.toISOString().split('T')[0];
    });

    const typeColors: Record<string, string> = {
      count: '#3b82f6',
      elimination_status: '#f59e0b',
      clean_status: '#10b981',
      strain: '#8b5cf6',
      shelf: '#6b7280',
      cage_created: '#22c55e',
      cage_deleted: '#ef4444',
      elimination: '#dc2626',
      batch_mark_to_eliminate: '#f59e0b',
      batch_clear: '#6b7280',
      batch_update_clean_status: '#10b981',
      transfer_in: '#10b981',
      transfer_out: '#f59e0b',
      merge_cage: '#3b82f6',
      split_cage: '#8b5cf6',
      shelf_adjust: '#6b7280',
    };

    const allTypes = [
      'count',
      'elimination_status',
      'clean_status',
      'elimination',
      'cage_created',
      'cage_deleted',
      'transfer_in',
      'transfer_out',
      'merge_cage',
      'split_cage',
      'shelf_adjust',
    ];

    const seriesData = allTypes.map((type) => ({
      name: CHANGE_LOG_TYPE_LABELS[type as keyof typeof CHANGE_LOG_TYPE_LABELS] || type,
      type: 'line' as const,
      stack: 'total',
      smooth: true,
      itemStyle: { color: typeColors[type] || '#6b7280' },
      areaStyle: { opacity: 0.2 },
      data: last30Days.map((date) =>
        changeLogs().filter((log) => log.timestamp.startsWith(date) && log.changeType === type).length
      ),
    }));

    return {
      title: {
        text: '近30天操作趋势',
        left: 'center',
        textStyle: { fontSize: 14 },
      },
      tooltip: { trigger: 'axis' },
      legend: { orient: 'horizontal', bottom: 0, type: 'scroll' },
      grid: { left: '3%', right: '4%', bottom: '15%', top: '15%', containLabel: true },
      xAxis: {
        type: 'category',
        data: last30Days.map((d) => d.slice(5)),
        axisLabel: { rotate: 45, fontSize: 10 },
      },
      yAxis: { type: 'value' },
      series: seriesData,
    };
  });

  const batchStatsChartOption = createMemo<EChartsOption>(() => {
    const stats = batchOperationStats();
    const types = Object.keys(stats.typeCounts);
    const labels = types.map(
      (t) => CHANGE_LOG_TYPE_LABELS[t as keyof typeof CHANGE_LOG_TYPE_LABELS] || t
    );
    const values = types.map((t) => stats.typeCounts[t]);
    const colors: Record<string, string> = {
      batch_mark_to_eliminate: '#f59e0b',
      batch_clear: '#6b7280',
      batch_update_clean_status: '#10b981',
    };

    return {
      title: {
        text: '批量处理结果统计',
        left: 'center',
        textStyle: { fontSize: 14 },
      },
      tooltip: { trigger: 'item' },
      legend: { orient: 'horizontal', bottom: 0 },
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          label: { show: true, formatter: '{b}: {c}' },
          emphasis: {
            label: { show: true, fontSize: 14, fontWeight: 'bold' },
          },
          data: types.map((t, i) => ({
            value: values[i],
            name: labels[i],
            itemStyle: { color: colors[t] || '#6b7280' },
          })),
        },
      ],
    };
  });

  const allBatchStats = createMemo(() => getAllBatchStats());
  const projectDistribution = createMemo(() => getProjectCageDistribution());
  const batchTrend30 = createMemo(() => get30DayBatchTrend());

  const batchUsageChartOption = createMemo<EChartsOption>(() => {
    const stats = allBatchStats();
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

  const batchTrendChartOption = createMemo<EChartsOption>(() => {
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

  const projectCageChartOption = createMemo<EChartsOption>(() => {
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
          center: ['65%', '50%'],
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
    <Box p="$4">
      <Heading size="lg" mb="$4">统计看板</Heading>
      <Grid templateColumns="repeat(4, 1fr)" gap="$4" mb="$6">
        <GridItem>
          <Box bg="white" shadow="sm" rounded="$md" p="$4">
            <VStack spacing="$2" textAlign="center">
              <Text color="gray.500">笼位总数</Text>
              <Text size="3xl" weight="bold" color="primary.500">
                {totalCages()}
              </Text>
            </VStack>
          </Box>
        </GridItem>
        <GridItem>
          <Box bg="white" shadow="sm" rounded="$md" p="$4">
            <VStack spacing="$2" textAlign="center">
              <Text color="gray.500">动物总数</Text>
              <Text size="3xl" weight="bold" color="success.500">
                {totalAnimals()}
              </Text>
            </VStack>
          </Box>
        </GridItem>
        <GridItem>
          <Box bg="white" shadow="sm" rounded="$md" p="$4">
            <VStack spacing="$2" textAlign="center">
              <Text color="gray.500">待淘汰</Text>
              <Text size="3xl" weight="bold" color="warning.500">
                {toEliminateCount()}
              </Text>
            </VStack>
          </Box>
        </GridItem>
        <GridItem>
          <Box bg="white" shadow="sm" rounded="$md" p="$4">
            <VStack spacing="$2" textAlign="center">
              <Text color="gray.500">今日淘汰</Text>
              <Text size="3xl" weight="bold" color="danger.500">
                {todayEliminated()}
              </Text>
            </VStack>
          </Box>
        </GridItem>
      </Grid>

      <Grid templateColumns="repeat(4, 1fr)" gap="$4" mb="$6">
        <GridItem>
          <Box bg="white" shadow="sm" rounded="$md" p="$4">
            <VStack spacing="$2" textAlign="center">
              <Text color="gray.500">异常笼位</Text>
              <Text size="3xl" weight="bold" color="danger.500">
                {abnormalCageCount()}
              </Text>
              <HStack spacing="$2" mt="$1">
                <Badge colorScheme="danger" size="sm">污染 {dirtyCageCount()}</Badge>
                <Badge colorScheme="warning" size="sm">待清洁 {needCleanCageCount()}</Badge>
                <Badge colorScheme="warning" size="sm">待淘汰 {toEliminateCount()}</Badge>
              </HStack>
            </VStack>
          </Box>
        </GridItem>
        <GridItem>
          <Box bg="white" shadow="sm" rounded="$md" p="$4">
            <VStack spacing="$2" textAlign="center">
              <Text color="gray.500">今日操作数</Text>
              <Text size="3xl" weight="bold" color="info.500">
                {todayOperations()}
              </Text>
            </VStack>
          </Box>
        </GridItem>
        <GridItem>
          <Box bg="white" shadow="sm" rounded="$md" p="$4">
            <VStack spacing="$2" textAlign="center">
              <Text color="gray.500">批量操作</Text>
              <Text size="3xl" weight="bold" color="primary.500">
                {batchOperationStats().totalBatches}
              </Text>
              <Text size="sm" color="gray.500">
                共影响 {batchOperationStats().totalAffected} 个笼位
              </Text>
            </VStack>
          </Box>
        </GridItem>
        <GridItem>
          <Box bg="white" shadow="sm" rounded="$md" p="$4">
            <VStack spacing="$2" textAlign="center">
              <Text color="gray.500">转移操作</Text>
              <Text size="3xl" weight="bold" color="success.500">
                {totalTransfers()}
              </Text>
              <Text size="sm" color="gray.500">
                今日 {todayTransfers()} 次，累计 {totalTransferAnimals()} 只
              </Text>
            </VStack>
          </Box>
        </GridItem>
      </Grid>

      <Grid templateColumns="repeat(3, 1fr)" gap="$4" mb="$4">
        <GridItem>
          <Box bg="white" shadow="sm" rounded="$md" p="$4">
            <Box h="300px">
              <Chart option={statusChartOption()} />
            </Box>
          </Box>
        </GridItem>
        <GridItem>
          <Box bg="white" shadow="sm" rounded="$md" p="$4">
            <Box h="300px">
              <Chart option={strainChartOption()} />
            </Box>
          </Box>
        </GridItem>
        <GridItem>
          <Box bg="white" shadow="sm" rounded="$md" p="$4">
            <Box h="300px">
              <Chart option={batchStatsChartOption()} />
            </Box>
          </Box>
        </GridItem>
      </Grid>

      <Heading size="md" mb="$3" mt="$6">实验批次统计</Heading>
      <Grid templateColumns="repeat(4, 1fr)" gap="$4" mb="$6">
        <GridItem>
          <Box bg="white" shadow="sm" rounded="$md" p="$4">
            <VStack spacing="$2" textAlign="center">
              <Text color="gray.500">批次总数</Text>
              <Text size="3xl" weight="bold" color="primary.500">
                {allBatchStats().totalBatches}
              </Text>
            </VStack>
          </Box>
        </GridItem>
        <GridItem>
          <Box bg="white" shadow="sm" rounded="$md" p="$4">
            <VStack spacing="$2" textAlign="center">
              <Text color="gray.500">进行中批次</Text>
              <Text size="3xl" weight="bold" color="#3b82f6">
                {allBatchStats().activeBatches}
              </Text>
            </VStack>
          </Box>
        </GridItem>
        <GridItem>
          <Box bg="white" shadow="sm" rounded="$md" p="$4">
            <VStack spacing="$2" textAlign="center">
              <Text color="gray.500">绑定笼位数</Text>
              <Text size="3xl" weight="bold" color="#22c55e">
                {allBatchStats().activeCages}
              </Text>
            </VStack>
          </Box>
        </GridItem>
        <GridItem>
          <Box bg="white" shadow="sm" rounded="$md" p="$4">
            <VStack spacing="$2" textAlign="center">
              <Text color="gray.500">实验动物总数</Text>
              <Text size="3xl" weight="bold" color="#f59e0b">
                {allBatchStats().totalAnimals}
              </Text>
            </VStack>
          </Box>
        </GridItem>
      </Grid>

      <Grid templateColumns="repeat(3, 1fr)" gap="$4" mb="$4">
        <GridItem>
          <Box bg="white" shadow="sm" rounded="$md" p="$4">
            <Box h="320px">
              <Chart option={batchUsageChartOption()} />
            </Box>
          </Box>
        </GridItem>
        <GridItem colSpan={2}>
          <Box bg="white" shadow="sm" rounded="$md" p="$4">
            <Box h="320px">
              <Chart option={batchTrendChartOption()} />
            </Box>
          </Box>
        </GridItem>
      </Grid>

      <Grid templateColumns="repeat(1, 1fr)" gap="$4">
        <GridItem>
          <Box bg="white" shadow="sm" rounded="$md" p="$4">
            <Box h="350px">
              <Chart option={operationTrendOption()} />
            </Box>
          </Box>
        </GridItem>
      </Grid>

      <Grid templateColumns="repeat(1, 1fr)" gap="$4" mt="$4">
        <GridItem>
          <Box bg="white" shadow="sm" rounded="$md" p="$4">
            <Box h="380px">
              <Chart option={projectCageChartOption()} />
            </Box>
          </Box>
        </GridItem>
      </Grid>
    </Box>
  );
}

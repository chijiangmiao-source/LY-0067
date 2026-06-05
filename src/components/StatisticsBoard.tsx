import { createMemo } from 'solid-js';
import {
  Box,
  Grid,
  GridItem,
  Heading,
  Text,
  VStack,
} from '@hope-ui/solid';
import Chart from 'solid-echarts';
import type { EChartsOption } from 'echarts';
import { useCageStore, useRecordStore } from '../store';
import { ELIMINATION_STATUS_LABELS } from '../constants';

export default function StatisticsBoard() {
  const { cages } = useCageStore();
  const { records } = useRecordStore();

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

  const eliminationTrendOption = createMemo<EChartsOption>(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    const dailyCounts = last7Days.map((date) => ({
      date,
      count: records()
        .filter((r) => r.eliminationDate === date)
        .reduce((sum, r) => sum + r.eliminationCount, 0),
    }));

    return {
      title: {
        text: '近7天淘汰趋势',
        left: 'center',
        textStyle: { fontSize: 14 },
      },
      tooltip: { trigger: 'axis' },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: dailyCounts.map((d) => d.date.slice(5)),
      },
      yAxis: { type: 'value' },
      series: [
        {
          type: 'line',
          data: dailyCounts.map((d) => d.count),
          smooth: true,
          itemStyle: { color: '#8b5cf6' },
          areaStyle: { color: 'rgba(139, 92, 246, 0.2)' },
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
      <Grid templateColumns="repeat(3, 1fr)" gap="$4">
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
              <Chart option={eliminationTrendOption()} />
            </Box>
          </Box>
        </GridItem>
      </Grid>
    </Box>
  );
}

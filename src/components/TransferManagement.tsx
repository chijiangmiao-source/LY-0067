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
  FormControl,
  FormLabel,
  Grid,
  GridItem,
} from '@hope-ui/solid';
import Chart from 'solid-echarts';
import type { EChartsOption } from 'echarts';
import type { TransferType, TransferReason } from '../types';
import { useCageStore, useTransferStore } from '../store';
import {
  TRANSFER_TYPE_LABELS,
  TRANSFER_TYPE_COLORS,
  TRANSFER_REASON_LABELS,
  TRANSFER_REASON_LIST,
} from '../constants';
import TransferModal from './TransferModal';

export default function TransferManagement() {
  const { cages } = useCageStore();
  const { transferRecords } = useTransferStore();
  const [isModalOpen, setIsModalOpen] = createSignal(false);
  const [searchText, setSearchText] = createSignal('');
  const [typeFilter, setTypeFilter] = createSignal<string>('all');
  const [strainFilter, setStrainFilter] = createSignal('');
  const [personFilter, setPersonFilter] = createSignal('');
  const [startDate, setStartDate] = createSignal('');
  const [endDate, setEndDate] = createSignal('');

  const allStrains = createMemo(() => {
    const set = new Set<string>();
    cages().forEach((c) => set.add(c.strain));
    transferRecords().forEach((r) => {
      if (r.fromStrain) set.add(r.fromStrain);
      if (r.toStrain) set.add(r.toStrain);
    });
    return Array.from(set).sort();
  });

  const filteredRecords = createMemo(() => {
    const text = searchText().toLowerCase();
    const start = startDate() ? new Date(startDate()) : null;
    const end = endDate() ? new Date(endDate() + 'T23:59:59') : null;

    return transferRecords().filter((r) => {
      if (text) {
        const matchText =
          (r.fromCageNumber && r.fromCageNumber.toLowerCase().includes(text)) ||
          (r.toCageNumber && r.toCageNumber.toLowerCase().includes(text)) ||
          (r.fromStrain && r.fromStrain.toLowerCase().includes(text)) ||
          (r.toStrain && r.toStrain.toLowerCase().includes(text)) ||
          r.personInCharge.toLowerCase().includes(text) ||
          r.remarks.toLowerCase().includes(text);
        if (!matchText) return false;
      }

      if (typeFilter() !== 'all' && r.transferType !== typeFilter()) {
        return false;
      }

      if (strainFilter()) {
        const strainMatch =
          r.fromStrain === strainFilter() || r.toStrain === strainFilter();
        if (!strainMatch) return false;
      }

      if (personFilter()) {
        const person = personFilter().toLowerCase();
        if (!r.personInCharge.toLowerCase().includes(person)) {
          return false;
        }
      }

      if (start || end) {
        const recordDate = new Date(r.transferDate);
        if (start && recordDate < start) return false;
        if (end && recordDate > end) return false;
      }

      return true;
    });
  });

  const clearFilters = () => {
    setSearchText('');
    setTypeFilter('all');
    setStrainFilter('');
    setPersonFilter('');
    setStartDate('');
    setEndDate('');
  };

  const reasonStatsChart = createMemo<EChartsOption>(() => {
    const counts: Record<string, number> = {};
    TRANSFER_REASON_LIST.forEach((r) => {
      counts[r] = 0;
    });
    transferRecords().forEach((r) => {
      counts[r.reason] = (counts[r.reason] || 0) + 1;
    });

    const reasonColors: Record<TransferReason, string> = {
      experimental_arrangement: '#3b82f6',
      population_balance: '#10b981',
      health_isolation: '#ef4444',
      cage_cleaning: '#f59e0b',
      rearing_adjustment: '#8b5cf6',
      other: '#6b7280',
    };

    const data = TRANSFER_REASON_LIST.map((r) => ({
      value: counts[r],
      name: TRANSFER_REASON_LABELS[r],
      itemStyle: { color: reasonColors[r] },
    })).filter((d) => d.value > 0);

    return {
      title: {
        text: '常见转移原因统计',
        left: 'center',
        textStyle: { fontSize: 14 },
      },
      tooltip: { trigger: 'item', formatter: '{b}: {c} 次 ({d}%)' },
      legend: { orient: 'horizontal', bottom: 0, type: 'scroll' },
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: true,
          label: { show: true, formatter: '{b}: {c}' },
          emphasis: {
            label: { show: true, fontSize: 14, fontWeight: 'bold' },
          },
          labelLine: { show: true },
          data: data.length > 0 ? data : [{ value: 1, name: '暂无数据', itemStyle: { color: '#e5e7eb' } }],
        },
      ],
    };
  });

  const trendChart = createMemo<EChartsOption>(() => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      return d.toISOString().split('T')[0];
    });

    const typeColors: Record<TransferType, string> = {
      transfer_in: '#10b981',
      transfer_out: '#f59e0b',
      merge_cage: '#3b82f6',
      split_cage: '#8b5cf6',
      shelf_adjust: '#6b7280',
    };

    const allTypes: TransferType[] = [
      'transfer_in',
      'transfer_out',
      'merge_cage',
      'split_cage',
      'shelf_adjust',
    ];

    const seriesData = allTypes.map((type) => ({
      name: TRANSFER_TYPE_LABELS[type],
      type: 'line' as const,
      smooth: true,
      itemStyle: { color: typeColors[type] },
      areaStyle: { opacity: 0.15 },
      data: last30Days.map((date) =>
        transferRecords().filter(
          (r) => r.transferDate === date && r.transferType === type
        ).length
      ),
    }));

    return {
      title: {
        text: '近30天转移趋势',
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
      yAxis: { type: 'value', minInterval: 1 },
      series: seriesData,
    };
  });

  const totalTransfers = createMemo(() => transferRecords().length);
  const last7DaysTransfers = createMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return transferRecords().filter((r) => new Date(r.transferDate) >= sevenDaysAgo).length;
  });
  const totalAnimalsMoved = createMemo(() =>
    transferRecords().reduce((sum, r) => sum + r.transferCount, 0)
  );
  const todayTransfers = createMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return transferRecords().filter((r) => r.transferDate === today).length;
  });

  return (
    <Box p="$4">
      <VStack spacing="$4" align="stretch">
        <HStack justify="space-between">
          <Heading size="lg">笼位借调与转移管理</Heading>
          <Button colorScheme="primary" onClick={() => setIsModalOpen(true)}>
            新增转移操作
          </Button>
        </HStack>

        <Grid templateColumns="repeat(4, 1fr)" gap="$4">
          <GridItem>
            <Box bg="white" shadow="sm" rounded="$md" p="$4">
              <VStack spacing="$2" textAlign="center">
                <Text color="gray.500">转移记录总数</Text>
                <Text size="3xl" weight="bold" color="primary.500">
                  {totalTransfers()}
                </Text>
              </VStack>
            </Box>
          </GridItem>
          <GridItem>
            <Box bg="white" shadow="sm" rounded="$md" p="$4">
              <VStack spacing="$2" textAlign="center">
                <Text color="gray.500">近7天转移</Text>
                <Text size="3xl" weight="bold" color="info.500">
                  {last7DaysTransfers()}
                </Text>
              </VStack>
            </Box>
          </GridItem>
          <GridItem>
            <Box bg="white" shadow="sm" rounded="$md" p="$4">
              <VStack spacing="$2" textAlign="center">
                <Text color="gray.500">累计转移动物</Text>
                <Text size="3xl" weight="bold" color="success.500">
                  {totalAnimalsMoved()}
                </Text>
              </VStack>
            </Box>
          </GridItem>
          <GridItem>
            <Box bg="white" shadow="sm" rounded="$md" p="$4">
              <VStack spacing="$2" textAlign="center">
                <Text color="gray.500">今日转移</Text>
                <Text size="3xl" weight="bold" color="warning.500">
                  {todayTransfers()}
                </Text>
              </VStack>
            </Box>
          </GridItem>
        </Grid>

        <Grid templateColumns="repeat(2, 1fr)" gap="$4">
          <GridItem>
            <Box bg="white" shadow="sm" rounded="$md" p="$4">
              <Box h="280px">
                <Chart option={reasonStatsChart()} />
              </Box>
            </Box>
          </GridItem>
          <GridItem>
            <Box bg="white" shadow="sm" rounded="$md" p="$4">
              <Box h="280px">
                <Chart option={trendChart()} />
              </Box>
            </Box>
          </GridItem>
        </Grid>

        <Box bg="white" shadow="sm" rounded="$md" p="$4">
          <VStack spacing="$3" align="stretch">
            <HStack spacing="$3" flexWrap="wrap">
              <Input
                placeholder="搜索笼位编号、品系、负责人、备注..."
                value={searchText()}
                onInput={(e) => setSearchText(e.currentTarget.value)}
                maxW="300px"
              />
              <Box
                as="select"
                value={typeFilter()}
                onChange={(e) => setTypeFilter(e.currentTarget.value)}
                maxW="160px"
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
                <option value="all">全部类型</option>
                <option value="transfer_in">转入</option>
                <option value="transfer_out">转出</option>
                <option value="merge_cage">合笼</option>
                <option value="split_cage">拆笼</option>
                <option value="shelf_adjust">架位调整</option>
              </Box>
              <Box
                as="select"
                value={strainFilter()}
                onChange={(e) => setStrainFilter(e.currentTarget.value)}
                maxW="180px"
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
                <option value="">全部品系</option>
                {allStrains().map((s) => (
                  <option value={s}>{s}</option>
                ))}
              </Box>
              <Input
                placeholder="搜索负责人"
                value={personFilter()}
                onInput={(e) => setPersonFilter(e.currentTarget.value)}
                maxW="180px"
              />
            </HStack>
            <HStack spacing="$3" flexWrap="wrap">
              <FormControl display="flex" alignItems="center" maxW="260px">
                <FormLabel mb={0} mr="$2" whiteSpace="nowrap">开始日期</FormLabel>
                <Input
                  type="date"
                  value={startDate()}
                  onInput={(e) => setStartDate(e.currentTarget.value)}
                />
              </FormControl>
              <FormControl display="flex" alignItems="center" maxW="260px">
                <FormLabel mb={0} mr="$2" whiteSpace="nowrap">结束日期</FormLabel>
                <Input
                  type="date"
                  value={endDate()}
                  onInput={(e) => setEndDate(e.currentTarget.value)}
                  max={new Date().toISOString().split('T')[0]}
                />
              </FormControl>
              <Button variant="outline" onClick={clearFilters}>
                清除筛选
              </Button>
              <Text size="sm" color="gray.500" ml="auto">
                共 {filteredRecords().length} 条记录
              </Text>
            </HStack>
          </VStack>
        </Box>

        {filteredRecords().length === 0 ? (
          <Text color="gray.500" textAlign="center" py="$8">
            暂无转移记录，请点击"新增转移操作"添加
          </Text>
        ) : (
          <Table overflowX="auto">
            <Thead>
              <Tr>
                <Th>转移日期</Th>
                <Th>转移类型</Th>
                <Th>转出/原笼位</Th>
                <Th>转入/目标笼位</Th>
                <Th>来源/去向</Th>
                <Th>品系</Th>
                <Th>数量</Th>
                <Th>架位变更</Th>
                <Th>原因</Th>
                <Th>负责人</Th>
                <Th>备注</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredRecords().map((r) => (
                <Tr key={r.id}>
                  <Td whiteSpace="nowrap">{r.transferDate}</Td>
                  <Td>
                    <Badge colorScheme={TRANSFER_TYPE_COLORS[r.transferType] as any}>
                      {TRANSFER_TYPE_LABELS[r.transferType]}
                    </Badge>
                  </Td>
                  <Td>
                    {r.fromCageNumber ? (
                      <Badge colorScheme="warning" variant="subtle">
                        {r.fromCageNumber}
                      </Badge>
                    ) : (
                      <Text color="gray.400">-</Text>
                    )}
                  </Td>
                  <Td>
                    {r.toCageNumber ? (
                      <Badge colorScheme="success" variant="subtle">
                        {r.toCageNumber}
                      </Badge>
                    ) : (
                      <Text color="gray.400">-</Text>
                    )}
                  </Td>
                  <Td fontSize="sm">
                    {r.transferType === 'transfer_in' && r.externalSource ? (
                      <Text>
                        <Badge colorScheme="success" size="sm" mr="$1">来源</Badge>
                        {r.externalSource}
                      </Text>
                    ) : r.transferType === 'transfer_out' && r.externalTarget ? (
                      <Text>
                        <Badge colorScheme="warning" size="sm" mr="$1">去向</Badge>
                        {r.externalTarget}
                      </Text>
                    ) : (
                      <Text color="gray.400">-</Text>
                    )}
                  </Td>
                  <Td>{r.fromStrain || r.toStrain || '-'}</Td>
                  <Td>
                    {r.transferType === 'shelf_adjust' ? (
                      <Text color="gray.400">-</Text>
                    ) : (
                      r.transferCount
                    )}
                  </Td>
                  <Td>
                    {r.transferType === 'shelf_adjust' ? (
                      <Text size="sm">
                        {r.fromShelf || '-'} → <Text color="primary.600" as="span">{r.toShelf}</Text>
                      </Text>
                    ) : (
                      <Text color="gray.400">-</Text>
                    )}
                  </Td>
                  <Td>{TRANSFER_REASON_LABELS[r.reason]}</Td>
                  <Td>{r.personInCharge}</Td>
                  <Td fontSize="sm" color="gray.500" maxW="180px">
                    {r.remarks || '-'}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </VStack>

      <TransferModal isOpen={isModalOpen()} onClose={() => setIsModalOpen(false)} />
    </Box>
  );
}

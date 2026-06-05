import { createMemo, createSignal } from 'solid-js';
import {
  Box,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Input,
  HStack,
  VStack,
  Text,
  FormControl,
  FormLabel,
  Button,
} from '@hope-ui/solid';
import { useChangeLogStore, useCageStore } from '../store';
import {
  CHANGE_LOG_TYPE_LABELS,
  CHANGE_LOG_TYPE_COLORS,
} from '../constants';

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export default function ChangeLogHistory() {
  const { changeLogs } = useChangeLogStore();
  const { cages } = useCageStore();

  const [searchText, setSearchText] = createSignal('');
  const [changeTypeFilter, setChangeTypeFilter] = createSignal('all');
  const [startDate, setStartDate] = createSignal('');
  const [endDate, setEndDate] = createSignal('');
  const [strainFilter, setStrainFilter] = createSignal('');
  const [personFilter, setPersonFilter] = createSignal('');

  const allStrains = createMemo(() => {
    const set = new Set<string>();
    cages().forEach((c) => set.add(c.strain));
    changeLogs().forEach((l) => set.add(l.strain));
    return Array.from(set).sort();
  });

  const filteredLogs = createMemo(() => {
    const text = searchText().toLowerCase();
    const start = startDate() ? new Date(startDate()) : null;
    const end = endDate() ? new Date(endDate() + 'T23:59:59') : null;

    return changeLogs().filter((log) => {
      if (text) {
        const matchText =
          log.cageNumber.toLowerCase().includes(text) ||
          log.strain.toLowerCase().includes(text) ||
          (log.personInCharge && log.personInCharge.toLowerCase().includes(text)) ||
          (log.fieldName && log.fieldName.toLowerCase().includes(text)) ||
          (log.remarks && log.remarks.toLowerCase().includes(text));
        if (!matchText) return false;
      }

      if (changeTypeFilter() !== 'all' && log.changeType !== changeTypeFilter()) {
        return false;
      }

      if (strainFilter() && log.strain !== strainFilter()) {
        return false;
      }

      if (personFilter()) {
        const person = personFilter().toLowerCase();
        if (!log.personInCharge || !log.personInCharge.toLowerCase().includes(person)) {
          return false;
        }
      }

      if (start || end) {
        const logDate = new Date(log.timestamp);
        if (start && logDate < start) return false;
        if (end && logDate > end) return false;
      }

      return true;
    });
  });

  const clearFilters = () => {
    setSearchText('');
    setChangeTypeFilter('all');
    setStartDate('');
    setEndDate('');
    setStrainFilter('');
    setPersonFilter('');
  };

  return (
    <Box p="$4">
      <VStack spacing="$4" align="stretch">
        <HStack justify="space-between">
          <Heading size="lg">变更历史追踪</Heading>
          <Text size="sm" color="gray.500">
            共 {filteredLogs().length} 条记录
          </Text>
        </HStack>

        <Box bg="white" shadow="sm" rounded="$md" p="$4">
          <VStack spacing="$3" align="stretch">
            <HStack spacing="$3" flexWrap="wrap">
              <Input
                placeholder="搜索笼位编号、品系、负责人、字段..."
                value={searchText()}
                onInput={(e) => setSearchText(e.currentTarget.value)}
                maxW="300px"
              />
              <Box
                as="select"
                value={changeTypeFilter()}
                onChange={(e) => setChangeTypeFilter(e.currentTarget.value)}
                maxW="200px"
                px="$3"
                py="$2"
                border="1px solid"
                borderColor="neutral.200"
                rounded="$md"
                fontSize="$md"
                bg="white"
                _focus={{ outline: 'none', borderColor: 'primary.500', boxShadow: '0 0 0 3px rgba(59,130,246,0.1)' }}
              >
                <option value="all">全部变更类型</option>
                <option value="count">数量变更</option>
                <option value="elimination_status">淘汰状态变更</option>
                <option value="clean_status">清洁状态变更</option>
                <option value="strain">品系变更</option>
                <option value="shelf">架位变更</option>
                <option value="cage_created">笼位创建</option>
                <option value="cage_deleted">笼位删除</option>
                <option value="elimination">淘汰记录</option>
                <option value="batch_mark_to_eliminate">批量标记待淘汰</option>
                <option value="batch_clear">批量清空</option>
                <option value="batch_update_clean_status">批量修改清洁状态</option>
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
                _focus={{ outline: 'none', borderColor: 'primary.500', boxShadow: '0 0 0 3px rgba(59,130,246,0.1)' }}
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
                maxW="200px"
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
            </HStack>
          </VStack>
        </Box>

        {filteredLogs().length === 0 ? (
          <Text color="gray.500" textAlign="center" py="$8">
            暂无变更记录
          </Text>
        ) : (
          <Table overflowX="auto">
            <Thead>
              <Tr>
                <Th>时间</Th>
                <Th>笼位编号</Th>
                <Th>品系</Th>
                <Th>变更类型</Th>
                <Th>变更字段</Th>
                <Th>变更前</Th>
                <Th>变更后</Th>
                <Th>负责人</Th>
                <Th>备注</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredLogs().map((log) => (
                <Tr key={log.id} bg={log.batchId ? 'rgba(59, 130, 246, 0.03)' : undefined}>
                  <Td whiteSpace="nowrap" fontSize="sm">
                    {formatTimestamp(log.timestamp)}
                  </Td>
                  <Td>
                    <Badge colorScheme="primary" variant="subtle">
                      {log.cageNumber}
                    </Badge>
                  </Td>
                  <Td>{log.strain}</Td>
                  <Td>
                    <Badge colorScheme={CHANGE_LOG_TYPE_COLORS[log.changeType] as any}>
                      {CHANGE_LOG_TYPE_LABELS[log.changeType]}
                      {log.batchId && ' (批量)'}
                    </Badge>
                  </Td>
                  <Td>{log.fieldName || '-'}</Td>
                  <Td color="gray.600">{log.oldValue !== undefined ? String(log.oldValue) : '-'}</Td>
                  <Td color="primary.600" fontWeight="medium">
                    {log.newValue !== undefined ? String(log.newValue) : '-'}
                  </Td>
                  <Td>{log.personInCharge || '-'}</Td>
                  <Td fontSize="sm" color="gray.500" maxW="200px">
                    {log.remarks || '-'}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </VStack>
    </Box>
  );
}

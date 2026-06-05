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
  Text,
} from '@hope-ui/solid';
import { useRecordStore } from '../store';

export default function RecordList() {
  const { records } = useRecordStore();
  const [searchText, setSearchText] = createSignal('');

  const filteredRecords = createMemo(() => {
    const text = searchText().toLowerCase();
    return records()
      .filter(
        (r) =>
          r.cageNumber.toLowerCase().includes(text) ||
          r.strain.toLowerCase().includes(text) ||
          r.personInCharge.toLowerCase().includes(text) ||
          r.remarks.toLowerCase().includes(text)
      )
      .sort((a, b) => b.eliminationDate.localeCompare(a.eliminationDate));
  });

  return (
    <Box p="$4">
      <Heading size="lg" mb="$4">淘汰记录</Heading>
      <HStack mb="$4">
        <Input
          placeholder="搜索笼位编号、品系、负责人、备注..."
          value={searchText()}
          onInput={(e) => setSearchText(e.currentTarget.value)}
          maxW="400px"
        />
      </HStack>
      {filteredRecords().length === 0 ? (
        <Text color="gray.500" textAlign="center" py="$8">
          暂无淘汰记录
        </Text>
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>淘汰日期</Th>
              <Th>笼位编号</Th>
              <Th>动物品系</Th>
              <Th>淘汰数量</Th>
              <Th>负责人</Th>
              <Th>备注</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filteredRecords().map((record) => (
              <Tr key={record.id}>
                <Td>{record.eliminationDate}</Td>
                <Td>
                  <Badge colorScheme="primary">{record.cageNumber}</Badge>
                </Td>
                <Td>{record.strain}</Td>
                <Td>{record.eliminationCount}</Td>
                <Td>{record.personInCharge}</Td>
                <Td>{record.remarks || '-'}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </Box>
  );
}

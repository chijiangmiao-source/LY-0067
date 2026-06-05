import { createSignal, Switch, Match } from 'solid-js';
import {
  Box,
  Button,
  Heading,
  HStack,
  Text,
} from '@hope-ui/solid';
import CageList from './components/CageList';
import RecordList from './components/RecordList';
import StatisticsBoard from './components/StatisticsBoard';
import ChangeLogHistory from './components/ChangeLogHistory';
import TransferManagement from './components/TransferManagement';
import ExperimentBatchManagement from './components/ExperimentBatchManagement';

export default function App() {
  const [activeTab, setActiveTab] = createSignal(0);

  const tabs = [
    { label: '笼位管理' },
    { label: '笼位转移' },
    { label: '淘汰记录' },
    { label: '变更追踪' },
    { label: '统计看板' },
    { label: '实验批次' },
  ];

  return (
    <Box minH="100vh" bg="gray.50">
      <Box bg="white" shadow="sm" px="$6" py="$4">
        <HStack justify="space-between" align="center">
          <Heading size="xl" color="primary.600">
            🐁 实验鼠笼位淘汰登记器
          </Heading>
          <Text color="gray.500" size="sm">
            数据自动保存至本地
          </Text>
        </HStack>
      </Box>
      <Box maxW="1400px" mx="auto">
        <Box bg="white" shadow="sm" px="$4" py="$2">
          <HStack spacing="$2">
            {tabs.map((tab, index) => (
              <Button
                variant={activeTab() === index ? 'solid' : 'ghost'}
                colorScheme={activeTab() === index ? 'primary' : 'neutral'}
                onClick={() => setActiveTab(index)}
              >
                {tab.label}
              </Button>
            ))}
          </HStack>
        </Box>
        <Box>
          <Switch>
            <Match when={activeTab() === 0}>
              <CageList />
            </Match>
            <Match when={activeTab() === 1}>
              <TransferManagement />
            </Match>
            <Match when={activeTab() === 2}>
              <RecordList />
            </Match>
            <Match when={activeTab() === 3}>
              <ChangeLogHistory />
            </Match>
            <Match when={activeTab() === 4}>
              <StatisticsBoard />
            </Match>
            <Match when={activeTab() === 5}>
              <ExperimentBatchManagement />
            </Match>
          </Switch>
        </Box>
      </Box>
    </Box>
  );
}

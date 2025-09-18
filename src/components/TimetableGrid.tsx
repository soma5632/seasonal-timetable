import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  IconButton,
  HStack,
  Text,
  Tooltip,
  useColorModeValue,
} from "@chakra-ui/react";
import { ChevronLeftIcon, ChevronRightIcon, DeleteIcon, CopyIcon } from "@chakra-ui/icons";
import { Lesson, Timetable, timeSlots } from "../pages/TimetableManager";

type Props = {
  dates: string[]; // YYYY-MM-DD[]
  timeSlots: string[];
  timetable: Timetable;
  onEdit: (date: string, slotIndex: number) => void;
  onClearCell: (date: string, slotIndex: number) => void;
  onCopy: (fromDate: string, slotIndex: number, toDate: string) => void;
};

const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

function prettyDateLabel(dateStr: string) {
  const d = new Date(dateStr);
  const m = d.getMonth() + 1;
  const dd = d.getDate();
  const w = weekdays[d.getDay()];
  return `${m}/${dd}(${w})`;
}

function CellContent({ value }: { value: Lesson | null }) {
  if (!value) return <Text color="gray.400">—</Text>;
  return (
    <Box>
      <Text fontWeight="semibold" fontSize="sm">先生: {value.teacher || "未設定"}</Text>
      {value.students.map((s, i) => (
        <Text key={i} fontSize="sm">
          {s.name || "生徒"}（{s.subject}）
        </Text>
      ))}
    </Box>
  );
}

export default function TimetableGrid({
  dates,
  timeSlots,
  timetable,
  onEdit,
  onClearCell,
  onCopy,
}: Props) {
  const headerBg = useColorModeValue("gray.50", "gray.700");
  const stickyBg = useColorModeValue("white", "gray.800");

  return (
    <Box overflowX="auto" borderWidth="1px" borderRadius="md">
      <Table size="sm" variant="simple" minW="900px">
        <Thead position="sticky" top={0} zIndex={1} bg={headerBg}>
          <Tr>
            <Th position="sticky" left={0} zIndex={2} bg={headerBg}>コマ</Th>
            <Th position="sticky" left="64px" zIndex={2} bg={headerBg}>時間</Th>
            {dates.map((d) => (
              <Th key={d} minW="220px" textAlign="center">
                {prettyDateLabel(d)}
              </Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {timeSlots.map((slotLabel, slotIndex) => (
            <Tr key={slotIndex}>
              <Td position="sticky" left={0} zIndex={1} bg={stickyBg} fontWeight="semibold">
                {slotIndex + 1}
              </Td>
              <Td position="sticky" left="64px" zIndex={1} bg={stickyBg}>
                {slotLabel}
              </Td>
              {dates.map((date, colIndex) => {
                const value = timetable[date]?.[slotIndex] ?? null;
                const prevDate = dates[colIndex - 1];
                const nextDate = dates[colIndex + 1];
                return (
                  <Td key={date} verticalAlign="top">
                    <HStack justify="space-between" mb={1}>
                      <Text fontSize="xs" color="gray.500">編集 / 操作</Text>
                      <HStack spacing={1}>
                        {prevDate && (
                          <Tooltip label="前日にコピー">
                            <IconButton
                              aria-label="copy-from-prev"
                              icon={<ChevronLeftIcon />}
                              size="xs"
                              variant="ghost"
                              onClick={() => onCopy(prevDate, slotIndex, date)}
                            />
                          </Tooltip>
                        )}
                        {nextDate && (
                          <Tooltip label="翌日にコピー">
                            <IconButton
                              aria-label="copy-to-next"
                              icon={<ChevronRightIcon />}
                              size="xs"
                              variant="ghost"
                              onClick={() => onCopy(date, slotIndex, nextDate)}
                            />
                          </Tooltip>
                        )}
                        <Tooltip label="このセルを空にする">
                          <IconButton
                            aria-label="clear"
                            icon={<DeleteIcon />}
                            size="xs"
                            variant="ghost"
                            onClick={() => onClearCell(date, slotIndex)}
                          />
                        </Tooltip>
                      </HStack>
                    </HStack>

                    <Box
                      p={2}
                      borderWidth="1px"
                      borderRadius="md"
                      cursor="pointer"
                      _hover={{ borderColor: "teal.400" }}
                      onClick={() => onEdit(date, slotIndex)}
                    >
                      <CellContent value={value} />
                    </Box>

                    {/* 任意：同日の他コマへコピーなどの拡張ボタン例
                    <HStack mt={2} spacing={1}>
                      <IconButton
                        aria-label="copy"
                        icon={<CopyIcon />}
                        size="xs"
                        onClick={() => {/* 将来: 同日の別コマへコピー */ /*}}
                      />
                    </HStack>
                    */}
                  </Td>
                );
              })}
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}
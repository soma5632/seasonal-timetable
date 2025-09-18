import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
  Checkbox,
  Button,
  VStack,
  HStack,
  useColorModeValue,
} from "@chakra-ui/react";
import { Lesson, Timetable } from "../pages/TimetableManager";

type Props = {
  dates: string[]; // YYYY-MM-DD[]
  boothCount: number;
  timeSlots: string[];
  timetable: Timetable;
  closedDays: string[];
  closedSlots: { [date: string]: number[] };
  onToggleClosedDay: (date: string) => void;
  onToggleClosedSlot: (date: string, slot: number) => void;
  onEdit: (date: string, slot: number, booth: number) => void;
  onClear: (date: string, slot: number, booth: number) => void;
  onClearDay: (date: string) => void;
};

const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
function prettyDateLabel(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}(${weekdays[d.getDay()]})`;
}

const subjectColors: Record<string, string> = {
  数学: "blue.100",
  国語: "pink.100",
  英語: "green.100",
  社会: "yellow.100",
  理科: "purple.100",
};

export default function ThreeWeeksGrid({
  dates,
  boothCount,
  timeSlots,
  timetable,
  closedDays,
  closedSlots,
  onToggleClosedDay,
  onToggleClosedSlot,
  onEdit,
  onClear,
  onClearDay,
}: Props) {
  const headerBg = useColorModeValue("gray.50", "gray.700");
  const stickyBg = useColorModeValue("white", "gray.800");

  return (
    <Box overflowX="auto" borderWidth="1px" borderRadius="md">
      <Table size="sm" variant="simple" minW="1000px">
        <Thead position="sticky" top={0} zIndex={1} bg={headerBg}>
          <Tr>
            <Th position="sticky" left={0} zIndex={2} bg={headerBg}>コマ</Th>
            <Th position="sticky" left="64px" zIndex={2} bg={headerBg}>時間</Th>
            {dates.map((date) => {
              const isClosedDay = closedDays.includes(date);
              return (
                <Th key={date} minW="280px" textAlign="center" verticalAlign="top">
                  <VStack spacing={1}>
                    <Text fontWeight="bold">{prettyDateLabel(date)}</Text>
                    <Checkbox
                      isChecked={isClosedDay}
                      onChange={() => onToggleClosedDay(date)}
                      colorScheme="red"
                    >
                      全日休校
                    </Checkbox>
                    <Button
                      size="xs"
                      variant="outline"
                      colorScheme="gray"
                      onClick={() => onClearDay(date)}
                    >
                      この日の授業を全消去
                    </Button>
                  </VStack>
                </Th>
              );
            })}
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

              {dates.map((date) => {
                const isClosedDay = closedDays.includes(date);
                const isClosedSlot = (closedSlots[date] || []).includes(slotIndex);
                const isClosed = isClosedDay || isClosedSlot;

                const lessons = timetable[date]?.[slotIndex] || {};
                const cellBg = isClosed ? "red.200" : undefined;

                return (
                  <Td key={`${date}-${slotIndex}`} bg={cellBg} verticalAlign="top">
                    <HStack justify="space-between" align="center" mb={1}>
                      <Text fontSize="xs" color={isClosed ? "red.800" : "gray.500"}>
                        {isClosed ? "休校" : "編集 / 操作"}
                      </Text>
                      <Checkbox
                        size="sm"
                        colorScheme="red"
                        isChecked={isClosedSlot}
                        isDisabled={isClosedDay}
                        onChange={() => onToggleClosedSlot(date, slotIndex)}
                      >
                        休校
                      </Checkbox>
                    </HStack>

                    <VStack align="stretch" spacing={2}>
                      {Array.from({ length: boothCount }).map((_, boothIndex) => {
                        const lesson: Lesson | null = lessons[boothIndex] || null;
                        const bg =
                          !isClosed && lesson?.students?.[0]?.subject
                            ? subjectColors[lesson.students[0].subject] || "gray.50"
                            : isClosed
                            ? "red.200"
                            : "gray.50";

                        return (
                          <Box
                            key={boothIndex}
                            p={2}
                            borderWidth="1px"
                            borderRadius="md"
                            bg={bg}
                            cursor={isClosed ? "not-allowed" : "pointer"}
                            onClick={() => {
                              if (!isClosed) onEdit(date, slotIndex, boothIndex);
                            }}
                          >
                            <HStack justify="space-between" align="start">
                              <Text fontWeight="bold">ブース{boothIndex + 1}</Text>
                              {!isClosed && lesson && (
                                <Button
                                  size="xs"
                                  colorScheme="gray"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onClear(date, slotIndex, boothIndex);
                                  }}
                                >
                                  消去
                                </Button>
                              )}
                            </HStack>

                            {isClosed ? (
                              <Text color="red.800" mt={1} fontWeight="bold">休校</Text>
                            ) : lesson ? (
                              <Box mt={1}>
                                <Text fontWeight="semibold">先生: {lesson.teacher}</Text>
                                {lesson.students.map((s, i) => (
                                  <Text key={i} fontSize="sm">
                                    {s.name}（{s.subject}）
                                  </Text>
                                ))}
                              </Box>
                            ) : (
                              <Text color="gray.500" mt={1}>未設定</Text>
                            )}
                          </Box>
                        );
                      })}
                    </VStack>
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
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  IconButton,
  Box,
  Text,
  Tooltip,
  Checkbox,
} from "@chakra-ui/react";
import { DeleteIcon } from "@chakra-ui/icons";
import { Lesson } from "../pages/TimetableManager";

type Props = {
  timeSlots: string[];
  boothCount: number;
  lessons: { [slotIndex: number]: { [boothIndex: number]: Lesson | null } };
  onEdit: (slot: number, booth: number) => void;
  onClear: (slot: number, booth: number) => void;
  closedDay?: boolean;
  closedSlots?: number[];
  onToggleClosedSlot?: (slot: number) => void;
};

const subjectColors: Record<string, string> = {
  数学: "blue.100",
  国語: "pink.100",
  英語: "green.100",
  社会: "yellow.100",
  理科: "purple.100",
};

export default function BoothTimetableGrid({
  timeSlots,
  boothCount,
  lessons,
  onEdit,
  onClear,
  closedDay,
  closedSlots,
  onToggleClosedSlot,
}: Props) {
  return (
    <Table variant="simple" size="sm">
      <Thead>
        <Tr>
          <Th>コマ</Th>
          <Th>時間</Th>
          <Th>休校</Th>
          {Array.from({ length: boothCount }).map((_, b) => (
            <Th key={b}>ブース{b + 1}</Th>
          ))}
        </Tr>
      </Thead>
      <Tbody>
        {timeSlots.map((time, slot) => {
          const isClosedSlot = closedDay || closedSlots?.includes(slot);
          return (
            <Tr key={slot}>
              <Td>{slot + 1}</Td>
              <Td>{time}</Td>
              <Td>
                <Checkbox
                  isChecked={closedSlots?.includes(slot)}
                  onChange={() => onToggleClosedSlot && onToggleClosedSlot(slot)}
                  isDisabled={closedDay}
                />
              </Td>
              {Array.from({ length: boothCount }).map((_, booth) => {
                                const lesson = lessons?.[slot]?.[booth] || null;
                const bg = isClosedSlot
                  ? "red.200"
                  : lesson?.students[0]?.subject
                    ? subjectColors[lesson.students[0].subject] || "gray.50"
                    : "gray.50";

                return (
                  <Td key={booth} bg={bg}>
                    <Box
                      p={2}
                      borderWidth="1px"
                      borderRadius="md"
                      cursor={isClosedSlot ? "not-allowed" : "pointer"}
                      onClick={() => {
                        if (!isClosedSlot) onEdit(slot, booth);
                      }}
                    >
                      {isClosedSlot ? (
                        <Text color="red.800" fontWeight="bold">
                          休校
                        </Text>
                      ) : lesson ? (
                        <>
                          <Text fontWeight="bold">{lesson.teacher}</Text>
                          {lesson.students.map((s, i) => (
                            <Text key={i} fontSize="sm">
                              {s.name}（{s.subject}）
                            </Text>
                          ))}
                        </>
                      ) : (
                        <Text color="gray.400">未設定</Text>
                      )}
                    </Box>
                    {!isClosedSlot && lesson && (
                      <Tooltip label="このブースの授業を消去">
                        <IconButton
                          aria-label="clear"
                          icon={<DeleteIcon />}
                          size="xs"
                          mt={1}
                          onClick={() => onClear(slot, booth)}
                        />
                      </Tooltip>
                    )}
                  </Td>
                );
              })}
            </Tr>
          );
        })}
      </Tbody>
    </Table>
  );
}
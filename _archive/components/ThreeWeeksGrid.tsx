import React from "react";
import { Box, Button, VStack, Text } from "@chakra-ui/react";
import { Timetable, Lesson } from "../pages/TimetableManager";

type Props = {
  dates: string[];
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
  return (
    <Box overflowX="auto">
      <table className="timetable-table">
        <thead>
          <tr>
            {dates.map((date) => (
              <th key={date}>
                <VStack spacing={1}>
                  <Text fontWeight="bold">{date}</Text>
                  <Button
                    size="xs"
                    colorScheme={closedDays.includes(date) ? "red" : "gray"}
                    onClick={() => onToggleClosedDay(date)}
                  >
                    {closedDays.includes(date) ? "開校" : "休校"}
                  </Button>
                  <Button
                    size="xs"
                    colorScheme="yellow"
                    onClick={() => onClearDay(date)}
                  >
                    全消去
                  </Button>
                </VStack>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {timeSlots.map((slotLabel, slotIndex) => (
            <tr key={slotIndex}>
              {dates.map((date) => {
                const isClosedDay = closedDays.includes(date);
                const isClosedSlot =
                  closedSlots[date]?.includes(slotIndex) ?? false;

                return (
                  <td
                    key={date + slotIndex}
                    className={
                      isClosedDay
                        ? "closed-day"
                        : isClosedSlot
                        ? "closed-slot"
                        : ""
                    }
                  >
                    <VStack spacing={1}>
                      <Button
                        size="xs"
                        variant="outline"
                        colorScheme={isClosedSlot ? "red" : "gray"}
                        onClick={() => onToggleClosedSlot(date, slotIndex)}
                      >
                        {slotLabel}
                      </Button>
                      <div className="booth-row">
                        {Array.from({ length: boothCount }).map((_, boothIndex) => {
                          const lesson: Lesson | null =
                            timetable[date]?.[slotIndex]?.[boothIndex] || null;
                          return (
                            <div
                              key={boothIndex}
                              className="booth-cell"
                              onClick={() => onEdit(date, slotIndex, boothIndex)}
                            >
                              {lesson ? (
                                <div>
                                  <strong>{lesson.teacher}</strong>
                                  <br />
                                  {lesson.students
                                    .map((s) => `${s.name}(${s.subject})`)
                                    .join(", ")}
                                  <Button
                                    size="xs"
                                    colorScheme="red"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onClear(date, slotIndex, boothIndex);
                                    }}
                                  >
                                    ×
                                  </Button>
                                </div>
                              ) : (
                                <span className="empty">＋</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </VStack>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <style jsx>{`
        .timetable-table {
          table-layout: fixed;
          width: 100%;
          border-collapse: collapse;
        }
        th,
        td {
          border: 1px solid #ccc;
          width: calc(100% / 6); /* 月〜土の6日分 */
          vertical-align: top;
          padding: 4px;
        }
        th {
          background: #f5f5f5;
          position: sticky;
          top: 0;
          z-index: 2;
        }
        .booth-row {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .booth-cell {
          background: #f0f8ff;
          border: 1px solid #ccc;
          border-radius: 4px;
          padding: 2px;
          cursor: pointer;
          font-size: 0.8rem;
        }
        .booth-cell:hover {
          background: #e0f0ff;
        }
        .empty {
          color: #aaa;
        }
        .closed-day {
          background: #ffe5e5;
        }
        .closed-slot {
          background: #fff5e5;
        }
        @media (max-width: 768px) {
          th,
          td {
            width: 100%;
            display: block;
          }
          tr {
            display: block;
            margin-bottom: 1rem;
          }
        }
      `}</style>
    </Box>
  );
}
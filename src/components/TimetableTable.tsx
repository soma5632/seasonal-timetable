import { Table, Thead, Tbody, Tr, Th, Td, Button } from "@chakra-ui/react";
import { Timetable } from "../pages/TimetableManager";

type Props = {
  timeSlots: string[];
  timetable: Timetable;
  onEdit: (slotIndex: number) => void;
};

export default function TimetableTable({ timeSlots, timetable, onEdit }: Props) {
  return (
    <Table variant="simple">
      <Thead>
        <Tr>
          <Th>コマ</Th>
          <Th>時間</Th>
          <Th>授業内容</Th>
          <Th>操作</Th>
        </Tr>
      </Thead>
      <Tbody>
        {timeSlots.map((time, i) => (
          <Tr key={i}>
            <Td>{i + 1}</Td>
            <Td>{time}</Td>
            <Td>
              {timetable[i]
                ? <>
                    <div>先生: {timetable[i]?.teacher}</div>
                    {timetable[i]?.students.map((s, idx) => (
                      <div key={idx}>{s.name} ({s.subject})</div>
                    ))}
                  </>
                : "未設定"}
            </Td>
            <Td>
              <Button size="sm" onClick={() => onEdit(i)}>編集</Button>
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}
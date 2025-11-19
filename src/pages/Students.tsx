import React, { useEffect, useState } from "react";
import {
  Box,
  Heading,
  Text,
  Button,
  VStack,
  HStack,
  Input,
  Select,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
} from "@chakra-ui/react";

// ---- Types ----
type ScheduleItem = {
  date: [number, number]; // (month, day)
  time: string;
  tag: "×" | "slash" | "triangle" | "blank";
};

type Student = {
  id: number;
  name: string;
  grade: string;
  subjects: { name: string; count: number }[];
  schedules: { [termId: string]: { [iso: string]: { [slotIdx: number]: string } } };
  ngTeachers: string[];
};

type StudentsProps = {
  onNavigate: React.Dispatch<
    React.SetStateAction<"home" | "timetable" | "students" | "teachers" | "term">
  >;
};

const gradeOptions = ["小1","小2","小3","小4","小5","小6","中1","中2","中3","高1","高2","高3"];
const subjectOptions = ["国語","数学","英語","理科","社会"];
const timeSlots = [
  "10:00〜11:30",
  "11:10〜12:40",
  "13:20〜14:50",
  "14:30〜16:00",
  "15:40〜17:10",
  "16:05〜17:35",
  "17:10〜18:40",
  "18:15〜19:45",
  "19:20〜20:50",
  "20:30〜22:00",
];

const TAG_STYLE: Record<string, { symbol: string; color: string; bg: string }> = {
  "×": { symbol: "×", color: "red.600", bg: "gray.100" },
  "slash": { symbol: "／", color: "blue.600", bg: "gray.100" },
  "triangle": { symbol: "△", color: "orange.600", bg: "gray.100" },
  "blank": { symbol: "", color: "gray.400", bg: "white" },
};

export default function Students({ onNavigate }: StudentsProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newGrade, setNewGrade] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // 科目＋回数
  const [newSubject, setNewSubject] = useState("");
  const [newCount, setNewCount] = useState<number | "">("");

  // NG講師
  const [newNgTeacher, setNewNgTeacher] = useState("");

  // ターム選択
  const [selectedTermId, setSelectedTermId] = useState<string>("");

  // スケジュール（タームごとに保持）
  const [scheduleByDate, setScheduleByDate] = useState<{ [iso: string]: { [slotIdx: number]: string } }>({});

  // ---- Handlers ----
  const handleAddStudent = () => {
    if (!newName.trim() || !newGrade) return;
    const newStudent: Student = {
      id: Date.now(),
      name: newName.trim(),
      grade: newGrade,
      subjects: [],
      schedules: {},
      ngTeachers: [],
    };
    setStudents(prev => [...prev, newStudent]);
    setNewName("");
    setNewGrade("");
    setShowForm(false);
  };

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student);
    setSelectedTermId("");
    setScheduleByDate({});
  };

  const handleBackToList = () => {
    onNavigate("home");
    setSelectedStudent(null);
  };
  // ---- Subjects ----
  const addSubject = () => {
    if (!selectedStudent || !newSubject || newCount === "" || newCount <= 0) return;
    const updated = {
      ...selectedStudent,
      subjects: [...selectedStudent.subjects, { name: newSubject, count: Number(newCount) }],
    };
    setStudents(prev => prev.map(s => (s.id === updated.id ? updated : s)));
    setSelectedStudent(updated);
    setNewSubject("");
    setNewCount("");
  };

  const removeSubject = (idx: number) => {
    if (!selectedStudent) return;
    const updated = {
      ...selectedStudent,
      subjects: selectedStudent.subjects.filter((_, i) => i !== idx),
    };
    setStudents(prev => prev.map(s => (s.id === updated.id ? updated : s)));
    setSelectedStudent(updated);
  };

  // ---- NG Teachers ----
  const addNgTeacher = () => {
    if (!selectedStudent || !newNgTeacher.trim()) return;
    const updated = {
      ...selectedStudent,
      ngTeachers: [...selectedStudent.ngTeachers, newNgTeacher.trim()],
    };
    setStudents(prev => prev.map(s => (s.id === updated.id ? updated : s)));
    setSelectedStudent(updated);
    setNewNgTeacher("");
  };

  const removeNgTeacher = (idx: number) => {
    if (!selectedStudent) return;
    const updated = {
      ...selectedStudent,
      ngTeachers: selectedStudent.ngTeachers.filter((_, i) => i !== idx),
    };
    setStudents(prev => prev.map(s => (s.id === updated.id ? updated : s)));
    setSelectedStudent(updated);
  };

  // ---- Schedule ----
  // AI推定結果を表に埋め込む
  const applyAISchedule = (items: ScheduleItem[], termId: string) => {
    const mapped: { [iso: string]: { [slotIdx: number]: string } } = {};
    items.forEach(item => {
      const iso = `2025-${String(item.date[0]).padStart(2, "0")}-${String(item.date[1]).padStart(2, "0")}`;
      const slotIdx = timeSlots.findIndex(slot => slot === item.time);
      if (slotIdx >= 0) {
        if (!mapped[iso]) mapped[iso] = {};
        mapped[iso][slotIdx] = item.tag;
      }
    });
    setScheduleByDate(mapped);
    if (selectedStudent) {
      const updated = {
        ...selectedStudent,
        schedules: { ...selectedStudent.schedules, [termId]: mapped },
      };
      setStudents(prev => prev.map(s => (s.id === updated.id ? updated : s)));
      setSelectedStudent(updated);
    }
  };

  // セル編集ロジック（タグ切替）
  const toggleTag = (dateISO: string, slotIdx: number) => {
    setScheduleByDate(prev => {
      const current = prev[dateISO]?.[slotIdx] || "blank";
      const order = ["blank", "×", "slash", "triangle"];
      const next = order[(order.indexOf(current) + 1) % order.length];
      return {
        ...prev,
        [dateISO]: { ...(prev[dateISO] || {}), [slotIdx]: next },
      };
    });
  };
  // ---- Render ----
  if (selectedStudent) {
    return (
      <Box p={4}>
        <Heading size="md" mb={2}>
          {selectedStudent.name}（{selectedStudent.grade}）の詳細
        </Heading>

        {/* 科目＋回数 */}
        <Heading size="sm" mt={4}>科目と回数</Heading>
        <VStack align="start" spacing={2} mt={2}>
          {selectedStudent.subjects.map((sub, idx) => (
            <HStack key={idx}>
              <Text>{sub.name} ({sub.count}回)</Text>
              <Button size="xs" onClick={() => removeSubject(idx)}>削除</Button>
            </HStack>
          ))}
          <HStack>
            <Select value={newSubject} onChange={e => setNewSubject(e.target.value)} maxW="140px">
              <option value="">科目を選択</option>
              {subjectOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </Select>
            <Input
              type="number"
              placeholder="回数"
              value={newCount}
              onChange={e => setNewCount(e.target.value === "" ? "" : Number(e.target.value))}
              maxW="80px"
            />
            <Button size="sm" onClick={addSubject}>追加</Button>
          </HStack>
        </VStack>

        {/* NG講師 */}
        <Heading size="sm" mt={6}>NG講師</Heading>
        <VStack align="start" spacing={2} mt={2}>
          {selectedStudent.ngTeachers.map((t, idx) => (
            <HStack key={idx}>
              <Text>{t}</Text>
              <Button size="xs" onClick={() => removeNgTeacher(idx)}>削除</Button>
            </HStack>
          ))}
          <HStack>
            <Input
              type="text"
              placeholder="講師名"
              value={newNgTeacher}
              onChange={e => setNewNgTeacher(e.target.value)}
              maxW="160px"
            />
            <Button size="sm" onClick={addNgTeacher}>追加</Button>
          </HStack>
        </VStack>

        {/* ターム選択 */}
        <Heading size="sm" mt={6}>スケジュール（ターム別）</Heading>
        <Select
          placeholder="タームを選択"
          value={selectedTermId}
          onChange={e => setSelectedTermId(e.target.value)}
          maxW="240px"
          mt={2}
        >
          {/* 実際には TermManager で登録したターム一覧をここに渡す */}
          <option value="term1">第1ターム</option>
          <option value="term2">第2ターム</option>
        </Select>

        {/* スケジュール表 */}
        {selectedTermId && Object.keys(scheduleByDate).length > 0 && (
          <Box mt={4}>
            <Table size="sm" variant="simple">
              <Thead>
                <Tr>
                  <Th>時限</Th>
                  {Object.keys(scheduleByDate).map(dateISO => (
                    <Th key={dateISO} textAlign="center">{dateISO}</Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody>
                {timeSlots.map((slotLabel, slotIdx) => (
                  <Tr key={slotIdx}>
                    <Td fontWeight="bold">{slotIdx + 1}限<br />{slotLabel}</Td>
                    {Object.keys(scheduleByDate).map(dateISO => {
                      const tag = scheduleByDate[dateISO]?.[slotIdx] || "blank";
                      const style = TAG_STYLE[tag];
                      return (
                        <Td
                          key={dateISO + "-" + slotIdx}
                          textAlign="center"
                          cursor="pointer"
                          bg={style.bg}
                          color={style.color}
                          onClick={() => toggleTag(dateISO, slotIdx)}
                        >
                          {style.symbol || "〇"}
                        </Td>
                      );
                    })}
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}

        <Box mt={6}>
          <Button onClick={handleBackToList}>一覧に戻る</Button>
        </Box>
      </Box>
    );
  }

  // 一覧＋新規登録フォーム
  return (
    <Box p={4}>
      <Heading size="md" mb={4}>生徒管理</Heading>

      {!showForm ? (
        <Button onClick={() => setShowForm(true)}>新規登録</Button>
      ) : (
        <VStack align="start" spacing={3} mt={2} mb={4}>
          <Input
            type="text"
            placeholder="名前を入力"
            value={newName}
            onChange={e => setNewName(e.target.value)}
          />
          <Select value={newGrade} onChange={e => setNewGrade(e.target.value)}>
            <option value="">学年を選択</option>
            {gradeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </Select>
          <HStack>
            <Button onClick={handleAddStudent}>登録</Button>
            <Button onClick={() => { setShowForm(false); setNewName(""); setNewGrade(""); }}>キャンセル</Button>
          </HStack>
        </VStack>
      )}

      <HStack wrap="wrap" spacing={4} mt={4}>
        {students.map(s => (
          <Box
            key={s.id}
            borderWidth="1px"
            borderRadius="md"
            p={3}
            w="220px"
            bg="white"
            boxShadow="sm"
          >
            <Text fontWeight="bold" mb={2}>{s.name}（{s.grade}）</Text>
            <Button size="sm" onClick={() => handleSelectStudent(s)}>詳細を見る</Button>
          </Box>
        ))}
      </HStack>
    </Box>
  );
}
import { useState, useEffect } from "react";
import {
  Box, Button, FormControl, FormLabel, Input, Select,
  VStack, HStack, Heading, Text
} from "@chakra-ui/react";
import { useAiSchedule, AvailabilitySlot } from "../hooks/useAiSchedule";
import CameraCapture from "../components/CameraCapture";

type SubjectPlan = {
  subject: string;
  totalLessons: number;
  completedLessons: number;
};

type Student = {
  id: string;
  name: string;
  grade: string;
  subjects: SubjectPlan[];
  availability: AvailabilitySlot[];
};

const SUBJECT_OPTIONS = ["国語", "数学", "英語", "理科", "社会"];
const GRADE_OPTIONS = [
  "小1","小2","小3","小4","小5","小6",
  "中1","中2","中3",
  "高1","高2","高3"
];
const TIME_SLOTS = [
  "10:00〜11:00", "11:10〜12:10", "13:20〜14:20", "14:30〜15:30",
  "15:40〜16:40", "16:05〜17:05", "17:10〜18:10", "18:15〜19:15",
  "19:20〜20:20", "20:30〜21:30"
];

export default function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [name, setName] = useState("");
  const [grade, setGrade] = useState(GRADE_OPTIONS[0]);
  const [subjects, setSubjects] = useState<SubjectPlan[]>([]);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);

  const {
    candidates: aiCandidates,
    status: aiStatus,
    simulateAiPrediction, // ここに追加
    applyCandidates,
    clearCandidates,
  } = useAiSchedule(availability, setAvailability);

  useEffect(() => {
    const saved = localStorage.getItem("students");
    if (saved) {
      const parsed: Partial<Student>[] = JSON.parse(saved);
      const fixed: Student[] = parsed.map((s, idx) => ({
        id: s.id || String(Date.now() + idx),
        name: s.name || "",
        grade: s.grade || GRADE_OPTIONS[0],
        subjects: s.subjects || [],
        availability: s.availability || [],
      }));
      setStudents(fixed);
    }
  }, []);

  const saveStudents = (list: Student[]) => {
    setStudents(list);
    localStorage.setItem("students", JSON.stringify(list));
  };

  const addStudent = () => {
    if (!name.trim()) return;
    const newStudent: Student = {
      id: Date.now().toString(),
      name: name.trim(),
      grade,
      subjects,
      availability,
    };
    saveStudents([...students, newStudent]);
    setName("");
    setGrade(GRADE_OPTIONS[0]);
    setSubjects([]);
    setAvailability([]);
  };

  const addSubjectPlan = () => {
    setSubjects(prev => [
      ...prev,
      { subject: SUBJECT_OPTIONS[0], totalLessons: 0, completedLessons: 0 },
    ]);
  };

  const updateSubjectPlan = (
    index: number,
    field: keyof SubjectPlan,
    value: string | number
  ) => {
    setSubjects(prev => {
      const copy = [...prev];
      (copy[index] as any)[field] = value;
      return copy;
    });
  };

  const addAvailability = () => {
    setAvailability(prev => [
      ...prev,
      { dayOfWeek: 1, timeSlot: TIME_SLOTS[0] },
    ]);
  };

  const updateAvailability = (
    index: number,
    field: keyof AvailabilitySlot,
    value: string | number
  ) => {
    setAvailability(prev => {
      const copy = [...prev];
      (copy[index] as any)[field] = value;
      return copy;
    });
  };

  const removeAvailability = (index: number) => {
    setAvailability(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Box p={4}>
      <Heading size="lg" mb={4}>生徒情報入力</Heading>

      <VStack spacing={4} align="stretch" maxW="680px">
        <FormControl>
          <FormLabel>名前</FormLabel>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </FormControl>

        <FormControl>
          <FormLabel>学年</FormLabel>
          <Select value={grade} onChange={(e) => setGrade(e.target.value)}>
            {GRADE_OPTIONS.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </Select>
        </FormControl>

        <FormControl>
          <FormLabel>受講科目</FormLabel>
          {subjects.map((sp, idx) => (
            <HStack key={idx}>
              <Select
                value={sp.subject}
                onChange={(e) =>
                  updateSubjectPlan(idx, "subject", e.target.value)
                }
              >
                {SUBJECT_OPTIONS.map((subj) => (
                  <option key={subj} value={subj}>{subj}</option>
                ))}
              </Select>
              <Input
                type="number"
                placeholder="予定回数"
                value={sp.totalLessons}
                onChange={(e) =>
                  updateSubjectPlan(idx, "totalLessons", Number(e.target.value))
                }
                width="100px"
              />
              <Text>受講済み: {sp.completedLessons} 回</Text>
            </HStack>
          ))}
          <Button size="sm" onClick={addSubjectPlan}>＋科目追加</Button>
        </FormControl>

        <FormControl>
          <FormLabel>受講可能スケジュール</FormLabel>
          {availability.map((slot, idx) => (
            <HStack key={idx}>
              <Select
                value={slot.dayOfWeek}
                onChange={(e) =>
                  updateAvailability(idx, "dayOfWeek", Number(e.target.value))
                }
              >
                {["日", "月", "火", "水", "木", "金", "土"].map((d, i) => (
                  <option key={i} value={i}>{d}</option>
                ))}
              </Select>
              <Select
                value={slot.timeSlot}
                onChange={(e) =>
                  updateAvailability(idx, "timeSlot", e.target.value)
                }
              >
                {TIME_SLOTS.map((ts) => (
                  <option key={ts} value={ts}>{ts}</option>
                ))}
              </Select>
              <Button size="xs" colorScheme="red" onClick={() => removeAvailability(idx)}>
                削除
              </Button>
            </HStack>
          ))}
          <Button size="sm" onClick={addAvailability}>＋追加</Button>
        </FormControl>

        <FormControl>
          <FormLabel>AI補助（カメラ撮影）</FormLabel>
          <CameraCapture
            onCapture={(blob) => {
              // 将来ここでOCR処理に渡す
              simulateAiPrediction(blob); // 今はダミー
            }}
          />
          {aiStatus === "ready" && (
            <>
              <Button onClick={applyCandidates} colorScheme="green">AI推定を適用</Button>
              <Button onClick={clearCandidates} variant="outline">候補を破棄</Button>
            </>
          )}
          {aiCandidates.length > 0 && (
            <Box mt={2}>
              {aiCandidates.map((a, i) => (
                <Text key={i}>
                  {["日","月","火","水","木","金","土"][a.dayOfWeek]} {a.timeSlot}
                </Text>
              ))}
            </Box>
          )}
        </FormControl>

        <Button colorScheme="green" onClick={addStudent}>登録</Button>
      </VStack>

      <Box mt={8}>
        <Heading size="md">登録済み生徒</Heading>
        {students.map((s) => (
          <Box key={s.id} p={2} borderWidth="1px" mt={2}>
            <Text fontWeight="bold">{s.name}（{s.grade}）</Text>
            {s.subjects.map((sp, i) => (
              <Text key={i}>
                {sp.subject}：{sp.completedLessons}/{sp.totalLessons} 回
              </Text>
            ))}
            <Text>
              スケジュール: {s.availability.map(a =>
                `${["日","月","火","水","木","金","土"][a.dayOfWeek]} ${a.timeSlot}`
              ).join(" / ")}
            </Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
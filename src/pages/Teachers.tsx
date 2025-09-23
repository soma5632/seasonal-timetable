import { useState, useEffect } from "react";
import {
  Box, Button, FormControl, FormLabel, Input, Select,
  VStack, HStack, Heading, Text
} from "@chakra-ui/react";
import { useAiSchedule, AvailabilitySlot } from "../hooks/useAiSchedule";

type Teacher = {
  id: string;
  name: string;
  subjects: string[];
  availability: AvailabilitySlot[];
};

const SUBJECT_OPTIONS = ["国語", "数学", "英語", "理科", "社会"];
const TIME_SLOTS = [
  "10:00〜11:00", "11:10〜12:10", "13:20〜14:20", "14:30〜15:30",
  "15:40〜16:40", "16:05〜17:05", "17:10〜18:10", "18:15〜19:15",
  "19:20〜20:20", "20:30〜21:30"
];

export default function Teachers() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [name, setName] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);

  const {
    candidates: aiCandidates,
    status: aiStatus,
    simulateAiPrediction,
    applyCandidates,
    clearCandidates,
  } = useAiSchedule(availability, setAvailability);

  useEffect(() => {
    const saved = localStorage.getItem("teachers");
    if (saved) {
      const parsed: Partial<Teacher>[] = JSON.parse(saved);
      const fixed: Teacher[] = parsed.map((t, idx) => ({
        id: t.id || String(Date.now() + idx),
        name: t.name || "",
        subjects: t.subjects || [],
        availability: t.availability || [],
      }));
      setTeachers(fixed);
    }
  }, []);

  const saveTeachers = (list: Teacher[]) => {
    setTeachers(list);
    localStorage.setItem("teachers", JSON.stringify(list));
  };

  const addTeacher = () => {
    if (!name.trim()) return;
    const newTeacher: Teacher = {
      id: Date.now().toString(),
      name: name.trim(),
      subjects,
      availability,
    };
    saveTeachers([...teachers, newTeacher]);
    setName("");
    setSubjects([]);
    setAvailability([]);
  };

  const toggleSubject = (subj: string) => {
    setSubjects((prev) =>
      prev.includes(subj) ? prev.filter((s) => s !== subj) : [...prev, subj]
    );
  };

  const addAvailability = () => {
    setAvailability((prev) => [
      ...prev,
      { dayOfWeek: 1, timeSlot: TIME_SLOTS[0] },
    ]);
  };

  const updateAvailability = (
    index: number,
    field: keyof AvailabilitySlot,
    value: string | number
  ) => {
    setAvailability((prev) => {
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
      <Heading size="lg" mb={4}>先生情報入力</Heading>

      <VStack spacing={4} align="stretch" maxW="680px">
        <FormControl>
          <FormLabel>名前</FormLabel>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </FormControl>

        <FormControl>
          <FormLabel>授業可能科目</FormLabel>
          <HStack wrap="wrap">
            {SUBJECT_OPTIONS.map((subj) => (
              <Button
                key={subj}
                size="sm"
                colorScheme={subjects.includes(subj) ? "blue" : "gray"}
                onClick={() => toggleSubject(subj)}
              >
                {subj}
              </Button>
            ))}
          </HStack>
        </FormControl>

        <FormControl>
          <FormLabel>授業可能スケジュール</FormLabel>
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
          <FormLabel>AI補助</FormLabel>
          <Button onClick={simulateAiPrediction}>画像をアップロードしてAI推定</Button>
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

        <Button colorScheme="green" onClick={addTeacher}>登録</Button>
      </VStack>

      <Box mt={8}>
        <Heading size="md">登録済み先生</Heading>
        {teachers.map((t) => (
          <Box key={t.id} p={2} borderWidth="1px" mt={2}>
            <Text fontWeight="bold">{t.name}</Text>
            <Text>科目: {t.subjects.join(", ")}</Text>
            <Text>
              スケジュール: {t.availability.map(a =>
                `${["日","月","火","水","木","金","土"][a.dayOfWeek]} ${a.timeSlot}`
              ).join(" / ")}
            </Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
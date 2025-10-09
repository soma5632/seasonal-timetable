import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Heading,
  HStack,
  Input,
  Text,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import WeeklySchedule from "../components/WeeklySchedule";
import EditLessonModal from "../components/EditLessonModal";

export type Lesson = {
  id: string;
  startTime: string;
  endTime: string;
  subject: string;
  teacherId: string; // 名前をそのまま保存
  studentId: string; // 使わない場合は空文字でもOK
  boothIndex: number;
  students: { name: string; subject: string }[];
  subjects: string[];
};

export type Schedule = {
  date: string;
  isClosed?: boolean;
  lessons: Lesson[];
};

export type Timetable = {
  [date: string]: {
    [slotIndex: number]: {
      [boothIndex: number]: Lesson | null;
    };
  };
};

const timeSlots: string[] = [
  "10:00〜11:00",
  "11:10〜12:10",
  "13:20〜14:20",
  "14:30〜15:30",
  "15:40〜16:40",
  "16:05〜17:05",
  "17:10〜18:10",
  "18:15〜19:15",
  "19:20〜20:20",
  "20:30〜21:30",
];

const BOOTH_COUNT = 5;
const STORAGE_KEY = "timetable-week-booth-closed";
const DEV_MODE = true;

function toDateString(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function parseDate(str: string) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function startOfWeekMonday(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

function generate1WeekMonToSat(startMonday: Date) {
  const dates: string[] = [];
  for (let dow = 0; dow < 6; dow++) {
    const d = new Date(startMonday);
    d.setDate(startMonday.getDate() + dow);
    dates.push(toDateString(d));
  }
  return dates;
}

export default function TimetableManager() {
  const toast = useToast();

  const [baseDate, setBaseDate] = useState<string>(() => toDateString(new Date()));
  const monday = useMemo(() => startOfWeekMonday(parseDate(baseDate)), [baseDate]);
  const dates = useMemo(() => generate1WeekMonToSat(monday), [monday]);

  const [timetable, setTimetable] = useState<Timetable>({});
  const [closedDays, setClosedDays] = useState<string[]>([]);
  const [closedSlots, setClosedSlots] = useState<{ [date: string]: number[] }>({});

  const [teacherOptions, setTeacherOptions] = useState<string[]>([]);
  const [studentOptions, setStudentOptions] = useState<string[]>([]);

  const [editing, setEditing] = useState<{ date: string; slot: number; booth: number } | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setTimetable(parsed.timetable || {});
        setClosedDays(parsed.closedDays || []);
        setClosedSlots(parsed.closedSlots || {});
      } catch {}
    }

    try {
      const tRaw = localStorage.getItem("teachers");
      if (tRaw) {
        const t = JSON.parse(tRaw);
        const names = Array.isArray(t) ? t.map((x: any) => x?.name).filter(Boolean) : [];
        setTeacherOptions([...new Set(names)]);
      }
      const sRaw = localStorage.getItem("students");
      if (sRaw) {
        const s = JSON.parse(sRaw);
        const names = Array.isArray(s) ? s.map((x: any) => x?.name).filter(Boolean) : [];
        setStudentOptions([...new Set(names)]);
      }
    } catch {}
  }, []);

  useEffect(() => {
    setTimetable((prev) => {
      const next: Timetable = { ...prev };
      dates.forEach((date) => {
        if (!next[date]) next[date] = {};
        for (let slot = 0; slot < timeSlots.length; slot++) {
          if (!next[date][slot]) next[date][slot] = {};
          for (let booth = 0; booth < BOOTH_COUNT; booth++) {
            if (!(booth in next[date][slot])) {
              if (DEV_MODE) {
                next[date][slot][booth] = {
                  id: `${date}-${slot}-${booth}`,
                  startTime: timeSlots[slot].split("〜")[0],
                  endTime: timeSlots[slot].split("〜")[1],
                  subject: "数学",
                  teacherId: "テスト先生",
                  studentId: "",
                  boothIndex: booth,
                  students: [{ name: "テスト生徒", subject: "数学" }],
                  subjects: ["数学"]
                };
              } else {
                next[date][slot][booth] = null;
              }
            }
          }
        }
      });
      return next;
    });
  }, [dates]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ baseDate, timetable, closedDays, closedSlots })
    );
  }, [baseDate, timetable, closedDays, closedSlots]);
  const openEdit = (date: string, slot: number, booth: number) => {
    setEditing({ date, slot, booth });
    onOpen();
  };

  const handleSaveLesson = (lesson: Lesson) => {
    if (!editing) return;
    setTimetable((prev) => ({
      ...prev,
      [editing.date]: {
        ...prev[editing.date],
        [editing.slot]: {
          ...prev[editing.date][editing.slot],
          [editing.booth]: {
            ...lesson,
            boothIndex: editing.booth,
            startTime: timeSlots[editing.slot].split("〜")[0],
            endTime: timeSlots[editing.slot].split("〜")[1],
            students: lesson.students ?? [],
            subjects: (lesson.students ?? []).map((s) => s.subject),
          },
        },
      },
    }));
    onClose();
    setEditing(null);
  };

  const schedules: Schedule[] = dates.map((date) => {
    const lessons: Lesson[] = [];
    for (let slot = 0; slot < timeSlots.length; slot++) {
      for (let booth = 0; booth < BOOTH_COUNT; booth++) {
        const l = timetable[date]?.[slot]?.[booth];
        if (l) lessons.push(l);
      }
    }
    return { date, lessons };
  });

  const teachers = teacherOptions.map((name, idx) => ({ id: `T${idx + 1}`, name }));
  const students = studentOptions.map((name, idx) => ({ id: `S${idx + 1}`, name }));

  return (
    <Box p={4}>
      <Heading size="lg" mb={2}>時間割管理</Heading>
      <Text fontSize="sm" color="gray.600" mb={4}>
        開始日を選ぶと、その週の月曜から1週間ぶん（6日）を横に表示します。
      </Text>

      <HStack spacing={3} mb={4}>
        <Text>開始日</Text>
        <Input
          type="date"
          value={baseDate}
          onChange={(e) => setBaseDate(e.target.value)}
          maxW="220px"
        />
      </HStack>

      <WeeklySchedule
        baseDate={baseDate}
        teachers={teachers}
        students={students}
        schedules={schedules}
        onEdit={openEdit}
      />

      <EditLessonModal
        isOpen={isOpen}
        onClose={() => { onClose(); setEditing(null); }}
        onSave={handleSaveLesson}
        teacherOptions={teacherOptions}
        studentOptions={studentOptions}
        initialData={
          editing
            ? timetable[editing.date]?.[editing.slot]?.[editing.booth] || {
                id: "",
                startTime: timeSlots[editing.slot].split("〜")[0],
                endTime: timeSlots[editing.slot].split("〜")[1],
                subject: "",
                teacherId: "",
                studentId: "",
                boothIndex: editing.booth,
                students: [],
                subjects: []
              }
            : null
        }
      />
    </Box>
  );
}
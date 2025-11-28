import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Heading,
  HStack,
  Input,
  Text,
  Button,
  useDisclosure,
  useToast,
  Select,
  VStack,
  Divider,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Checkbox,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Spinner,
} from "@chakra-ui/react";
import EditLessonModal from "../components/EditLessonModal";
import { useUserData } from "../hooks/useUserData";


export type Lesson = {
  id: string;
  startTime: string;
  endTime: string;
  subject: string;
  teacherId: string;
  studentId: string;
  boothIndex: number;
  students: { name: string; subject: string }[];
  subjects: string[];
};

export type Timetable = {
  [date: string]: {
    [slotIndex: number]: {
      [boothIndex: number]: Lesson | null;
    };
  };
};

type FinalLesson = {
  teacherId: string;
  studentIds: string[];
  date: string;
  slotIdx: number;
  boothIdx: number;
};

const timeSlots: string[] = [
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

const BOOTH_COUNT = 6;
function toDateString(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setHours(12, 0, 0, 0);
  return dt;
}
function rangeDatesMonToSat(startISO: string, endISO: string): string[] {
  const start = parseISO(startISO);
  const end = parseISO(endISO);
  const dates: string[] = [];
  const WEEKDAY_JA = ["日", "月", "火", "水", "木", "金", "土"];

  for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
    const wd = WEEKDAY_JA[dt.getDay()];
    if (["月", "火", "水", "木", "金", "土"].includes(wd)) {
      dates.push(toDateString(dt));
    }
  }
  return dates;
}

function lessonsToTimetable(finalLessons: FinalLesson[]): Timetable {
  const tt: Timetable = {};
  for (const l of finalLessons) {
    const date = l.date;
    const slot = l.slotIdx;
    const booth = l.boothIdx;

    tt[date] = tt[date] || {};
    tt[date][slot] = tt[date][slot] || {};

    tt[date][slot][booth] = {
      id: `${date}-${slot}-${booth}`,
      startTime: timeSlots[slot].split("〜")[0],
      endTime: timeSlots[slot].split("〜")[1],
      subject: "",
      teacherId: l.teacherId,
      studentId: l.studentIds[0] ?? "",
      boothIndex: booth,
      students: (l.studentIds || []).map((sid) => ({ name: sid, subject: "" })),
      subjects: [],
    };

    for (let b = 0; b < BOOTH_COUNT; b++) {
      tt[date][slot][b] = tt[date][slot][b] || null;
    }
  }
  return tt;
}
type TimetableManagerProps = {
  onNavigate: React.Dispatch<
    React.SetStateAction<
      "home" | "students" | "teachers" | "timetable" | "term" | "login" | "signup"
    >
  >;
  currentUserId: string;
};

const CELL_STYLE = {
  open: { bg: "white", color: "green.600", symbol: "〇" },
  closed: { bg: "gray.200", color: "red.600", symbol: "×" },
};

// 週ブロック表示用
type WeekBlockDate = { iso: string; label: string; weekdayJa: string };
type WeekBlock = { dates: WeekBlockDate[] };
const WEEKDAY_JA = ["日", "月", "火", "水", "木", "金", "土"];
function toMD(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
function weekdayJa(d: Date): string {
  return WEEKDAY_JA[d.getDay()];
}
function buildWeekBlocks(startISO: string, endISO: string): WeekBlock[] {
  const start = parseISO(startISO);
  const end = parseISO(endISO);
  const days: { iso: string; label: string; weekdayJa: string; date: Date }[] = [];

  for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
    const wd = weekdayJa(dt);
    if (!["月", "火", "水", "木", "金", "土"].includes(wd)) continue;
    days.push({
      iso: toDateString(dt),
      label: toMD(dt),
      weekdayJa: wd,
      date: new Date(dt),
    });
  }

  const blocks: WeekBlock[] = [];
  let current: typeof days = [];

  const flush = () => {
    if (current.length > 0) {
      current.sort((a, b) => a.date.getTime() - b.date.getTime());
      blocks.push({
        dates: current.map(({ iso, label, weekdayJa }) => ({ iso, label, weekdayJa })),
      });
      current = [];
    }
  };

  for (let i = 0; i < days.length; i++) {
    const d = days[i];
    if (d.weekdayJa === "月" && current.length > 0) flush();
    current.push(d);
    if (d.weekdayJa === "土") flush();
  }
  flush();

  return blocks;
}
export default function TimetableManager({ onNavigate, currentUserId }: TimetableManagerProps) {
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const { userData, saveUserData } = useUserData(currentUserId);

  const [selectedTermName, setSelectedTermName] = useState<string>("");
  const [termStartISO, setTermStartISO] = useState<string>("");
  const [termEndISO, setTermEndISO] = useState<string>("");

  const [allowPairLessons, setAllowPairLessons] = useState<boolean>(true);
  const [preferElementaryMorning, setPreferElementaryMorning] = useState<boolean>(true);
  const [preferJuniorLunch, setPreferJuniorLunch] = useState<boolean>(true);
  const [earlyTermWeight, setEarlyTermWeight] = useState<number>(1);
  const [balanceWeight, setBalanceWeight] = useState<number>(1);

  const [timetablePreview, setTimetablePreview] = useState<Timetable>({});
  const [loading, setLoading] = useState<boolean>(false);

  const [editing, setEditing] = useState<{ date: string; slot: number; booth: number } | null>(null);

  const termOptions = useMemo(() => {
    const terms = userData?.terms || {};
    return Object.keys(terms);
  }, [userData]);

  useEffect(() => {
    if (!userData) return;
    const last = userData.lastSelectedTermName;
    const defaultTerm = last && (userData.terms?.[last] ? last : "");
    if (defaultTerm) {
      setSelectedTermName(defaultTerm);
      const t = userData.terms![defaultTerm];
      setTermStartISO(t.startDate || "");
      setTermEndISO(t.endDate || "");
    } else {
      const first = termOptions[0];
      if (first && userData.terms?.[first]) {
        setSelectedTermName(first);
        const t = userData.terms[first];
        setTermStartISO(t.startDate || "");
        setTermEndISO(t.endDate || "");
      }
    }
  }, [userData, termOptions]);
  const weekBlocks = useMemo(() => {
    if (!termStartISO || !termEndISO) return [];
    const s = parseISO(termStartISO);
    const e = parseISO(termEndISO);
    if (e < s) return [];
    return buildWeekBlocks(termStartISO, termEndISO);
  }, [termStartISO, termEndISO]);

  const dateRangeValid = useMemo(() => {
    if (!termStartISO || !termEndISO) return false;
    const s = parseISO(termStartISO);
    const e = parseISO(termEndISO);
    return e >= s;
  }, [termStartISO, termEndISO]);

  function getInitialLesson(date: string, slot: number, booth: number): Lesson {
    const existing = timetablePreview[date]?.[slot]?.[booth] || null;
    return {
      id: `${date}-${slot}-${booth}`,
      startTime: timeSlots[slot].split("〜")[0],
      endTime: timeSlots[slot].split("〜")[1],
      subject: existing?.subject || "",
      teacherId: existing?.teacherId || "",
      studentId: existing?.studentId || "",
      boothIndex: booth,
      students: existing?.students || [],
      subjects: existing?.subjects || [],
    };
  }

  const openEdit = (date: string, slot: number, booth: number) => {
    setEditing({ date, slot, booth });
    onOpen();
  };

  const handleSaveLesson = (lesson: Lesson) => {
    if (!editing) return;
    setTimetablePreview((prev) => ({
      ...prev,
      [editing.date]: {
        ...prev[editing.date],
        [editing.slot]: {
          ...prev[editing.date]?.[editing.slot],
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
  async function generateTimetable() {
    if (!selectedTermName || !termStartISO || !termEndISO) {
      toast({
        title: "ターム未選択",
        description: "タームを選択し、期間が正しく設定されているか確認してください。",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("https://api.souma-lab.com/timetable/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUserId,
          termName: selectedTermName,
          options: {
            allowPairLessons,
            preferElementaryMorning,
            preferJuniorLunch,
            earlyTermWeight,
            balanceWeight,
          },
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const finalLessons: FinalLesson[] = Array.isArray(data.finalLessons) ? data.finalLessons : [];
      const preview = lessonsToTimetable(finalLessons);
      setTimetablePreview(preview);

      toast({ title: "生成完了", description: "時間割を生成しました。", status: "success" });
    } catch (e: any) {
      toast({ title: "生成失敗", description: e?.message || "エラーが発生しました。", status: "error" });
    } finally {
      setLoading(false);
    }
  }

  function applyAndSave() {
    try {
      const merged = mergeTimetables(userData?.timetable || {}, timetablePreview);
      saveUserData({ timetable: merged });
      toast({ title: "保存しました", description: "時間割を保存しました。", status: "success" });
    } catch {
      toast({ title: "保存失敗", description: "保存時にエラーが発生しました。", status: "error" });
    }
  }

  function renderHeaderCell(iso: string) {
    const labelDate = parseISO(iso);
    const label = `${toMD(labelDate)}(${weekdayJa(labelDate)})`;
    return <Th key={iso} textAlign="center">{label}</Th>;
  }

  // === JSXレンダリング ===
  // teacher/student の配列化を安全に処理
  const teacherList: any[] = Array.isArray(userData?.teachers)
    ? userData!.teachers
    : Object.values(userData?.teachers ?? {});
  const studentList: any[] = Array.isArray(userData?.students)
    ? userData!.students
    : Object.values(userData?.students ?? {});

  const teacherOptions = teacherList.map(t => t?.name ?? t?.id).filter(Boolean);
  const studentOptions = studentList.map(s => s?.name ?? s?.id).filter(Boolean);

  const initialData = editing ? getInitialLesson(editing.date, editing.slot, editing.booth) : null;

  return (
    <Box p={4}>
      <Heading size="lg" mb={2}>時間割管理</Heading>
      <Button onClick={() => onNavigate("home")} colorScheme="teal" mb={4}>ホームに戻る</Button>

      {/* 生成条件やプレビューUIは省略、既存の構造に合わせて配置 */}
      <EditLessonModal
        isOpen={isOpen}
        onClose={() => { onClose(); setEditing(null); }}
        onSave={handleSaveLesson}
        teacherOptions={teacherOptions}
        studentOptions={studentOptions}
        initialData={initialData}
      />
    </Box>
  );
}
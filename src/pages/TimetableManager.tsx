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
} from "@chakra-ui/react";
import WeeklySchedule from "../components/WeeklySchedule";
import EditLessonModal from "../components/EditLessonModal";
import StudentSchedule from "../components/StudentSchedule";

// ===== 既存領域 =====
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

const BOOTH_COUNT = 5;
const STORAGE_KEY = "timetable-week-booth-closed";

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

// ===== 新規：ターム管理 =====
type TermPreset = "第1ターム" | "第2ターム";
type WeekBlockDate = { iso: string; label: string; weekdayJa: string };
type WeekBlock = { dates: WeekBlockDate[] };

const WEEKDAY_JA = ["日", "月", "火", "水", "木", "金", "土"];
const OPEN_WEEKDAYS = ["月", "火", "水", "木", "金", "土"];

function toMD(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
function weekdayJa(d: Date): string {
  return WEEKDAY_JA[d.getDay()];
}
function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setHours(12, 0, 0, 0);
  return dt;
}
function buildWeekBlocks(startISO: string, endISO: string): WeekBlock[] {
  const start = parseISO(startISO);
  const end = parseISO(endISO);
  const days: { iso: string; label: string; weekdayJa: string; date: Date }[] = [];

  for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
    const wd = weekdayJa(dt);
    if (!OPEN_WEEKDAYS.includes(wd)) continue;
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
function estimateWeekCount(blocks: WeekBlock[]): number {
  return blocks.length;
}

const CELL_STYLE = {
  open: { bg: "white", color: "green.600", symbol: "〇" },
  closed: { bg: "gray.200", color: "red.600", symbol: "×" },
};

type TimetableManagerProps = {
  onNavigate: React.Dispatch<
    React.SetStateAction<
      "home" | "students" | "teachers" | "timetable" | "term" | "login"
    >
  >;
  currentUserId: string;
};

export default function TimetableManager({ onNavigate, currentUserId }: TimetableManagerProps) {  const toast = useToast();

  // 既存の週ビュー state
  const [baseDate, setBaseDate] = useState<string>(() => toDateString(new Date()));
  const monday = useMemo(() => startOfWeekMonday(parseDate(baseDate)), [baseDate]);
  const dates = useMemo(() => generate1WeekMonToSat(monday), [monday]);

  const [timetable, setTimetable] = useState<Timetable>({});
  const [closedDays, setClosedDays] = useState<string[]>([]);
  const [closedSlotsLegacy, setClosedSlotsLegacy] = useState<{ [date: string]: number[] }>({});

  const [teacherOptions, setTeacherOptions] = useState<string[]>([]);
  const [studentOptions, setStudentOptions] = useState<string[]>([]);
  const [editing, setEditing] = useState<{ date: string; slot: number; booth: number } | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setTimetable(parsed.timetable || {});
        setClosedDays(parsed.closedDays || []);
        setClosedSlotsLegacy(parsed.closedSlots || {});
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

  // 新規：タームスケジュール入力 state
  const [termName, setTermName] = useState<TermPreset>("第1ターム");
  const [startDateTerm, setStartDateTerm] = useState<string>("");
  const [endDateTerm, setEndDateTerm] = useState<string>("");
  const [closedSlotsByDate, setClosedSlotsByDate] = useState<{ [iso: string]: number[] }>({});

  const weekBlocks = useMemo(() => {
    if (!startDateTerm || !endDateTerm) return [];
    const s = parseISO(startDateTerm);
    const e = parseISO(endDateTerm);
    if (e < s) return [];
    return buildWeekBlocks(startDateTerm, endDateTerm);
  }, [startDateTerm, endDateTerm]);

  const weekCount = estimateWeekCount(weekBlocks);
  const dateRangeValid = useMemo(() => {
    if (!startDateTerm || !endDateTerm) return false;
    const s = parseISO(startDateTerm);
    const e = parseISO(endDateTerm);
    return e >= s;
  }, [startDateTerm, endDateTerm]);

  useEffect(() => {
    setClosedSlotsByDate({});
  }, [startDateTerm, endDateTerm]);

  // セル操作ロジック（〇/×切替）
  const toggleSlot = (dateISO: string, slotIndex: number) => {
    setClosedSlotsByDate((prev) => {
      const current = prev[dateISO] || [];
      const isClosed = current.includes(slotIndex);
      const updated = isClosed
        ? current.filter((s) => s !== slotIndex)
        : [...current, slotIndex];
      return { ...prev, [dateISO]: updated };
    });
  };

  // ヘッダセルタップでその日の全時限を開校⇔閉校
  const toggleDay = (dateISO: string) => {
    setClosedSlotsByDate((prev) => {
      const current = prev[dateISO] || [];
      if (current.length === timeSlots.length) {
        // 全部閉校 → 全部開校へ
        return { ...prev, [dateISO]: [] };
      } else {
        // 全部開校 → 全部閉校へ
        return { ...prev, [dateISO]: timeSlots.map((_, idx) => idx) };
      }
    });
  };

  // 既存の編集モーダル
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

  // Render
  return (
    <Box p={4}>
      <Heading size="lg" mb={2}>時間割管理</Heading>
      <Button onClick={() => onNavigate("home")} colorScheme="teal" mb={4}>
        ホームに戻る
      </Button>

      {/* 既存の週ビュー */}
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

      <Divider my={6} />

      {/* 新規：タームスケジュール入力 */}
      <Heading size="md" mb={2}>塾スケジュール入力（ターム）</Heading>
      <Text fontSize="sm" color="gray.600" mb={4}>
        タームを選び期間を指定してください。表示は月〜土のみ（日曜は非表示）。3週または4週が想定です。
      </Text>

      <VStack align="start" spacing={3} mb={4}>
        <HStack spacing={3}>
          <Text minW="80px">ターム名</Text>
          <Select value={termName} onChange={(e) => setTermName(e.target.value as TermPreset)} maxW="220px">
            <option value="第1ターム">第1ターム</option>
            <option value="第2ターム">第2ターム</option>
          </Select>
        </HStack>
        <HStack spacing={3}>
          <Text minW="80px">開始日</Text>
          <Input type="date" value={startDateTerm} onChange={(e) => setStartDateTerm(e.target.value)} maxW="220px" />
        </HStack>
        <HStack spacing={3}>
          <Text minW="80px">終了日</Text>
          <Input type="date" value={endDateTerm} onChange={(e) => setEndDateTerm(e.target.value)} maxW="220px" />
        </HStack>
      </VStack>

      <VStack align="start" spacing={2} mb={4}>
        {dateRangeValid && weekBlocks.length > 0 && (
          <Badge colorScheme={weekCount === 3 || weekCount === 4 ? "green" : "red"}>
            週数: {weekBlocks.length}（想定は3週または4週）
          </Badge>
        )}
        {!dateRangeValid && (
          <Text fontSize="sm" color="red.600">開始日と終了日を正しく入力してください。</Text>
        )}
      </VStack>

      {/* 週ごとの縦積みグリッド */}
      {dateRangeValid && weekBlocks.length > 0 && (
        <VStack align="stretch" spacing={8} mt={4}>
          {weekBlocks.map((block, blockIdx) => (
            <Box key={blockIdx} borderWidth="1px" borderRadius="md" overflowX="auto">
              <Table size="sm" variant="simple">
                <Thead>
                  <Tr>
                    <Th>時限</Th>
                    {block.dates.map((d) => {
                      const allClosed =
                        (closedSlotsByDate[d.iso] || []).length === timeSlots.length;
                      const style = allClosed ? CELL_STYLE.closed : CELL_STYLE.open;
                      return (
                        <Th
                          key={d.iso}
                          textAlign="center"
                          cursor="pointer"
                          bg={style.bg}
                          color={style.color}
                          onClick={() => toggleDay(d.iso)}
                        >
                          {d.label}({d.weekdayJa})<br />
                          {style.symbol}
                        </Th>
                      );
                    })}
                  </Tr>
                </Thead>
                <Tbody>
                  {timeSlots.map((slotLabel, slotIdx) => (
                    <Tr key={slotIdx}>
                      <Td fontWeight="bold">{slotIdx + 1}限<br />{slotLabel}</Td>
                      {block.dates.map((d) => {
                        const closed = (closedSlotsByDate[d.iso] || []).includes(slotIdx);
                        const style = closed ? CELL_STYLE.closed : CELL_STYLE.open;
                        return (
                          <Td
                            key={d.iso + "-" + slotIdx}
                            textAlign="center"
                            cursor="pointer"
                            bg={style.bg}
                            color={style.color}
                            onClick={() => toggleSlot(d.iso, slotIdx)}
                          >
                            {style.symbol}
                          </Td>
                        );
                      })}
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          ))}
        </VStack>
      )}
      {/* まとめて保存ボタン */}
      {dateRangeValid && weekBlocks.length > 0 && (
        <Box mt={6}>
          <Button
            colorScheme="blue"
            onClick={() => {
              const payload = {
                termName,
                startDate: startDateTerm,
                endDate: endDateTerm,
                closedSlots: closedSlotsByDate,
              };
              try {
                localStorage.setItem("timetable-term", JSON.stringify(payload));
                toast({
                  title: "保存しました",
                  description: "タームスケジュールを保存しました。",
                  status: "success",
                  duration: 3000,
                  isClosable: true,
                });
              } catch (e) {
                toast({
                  title: "保存失敗",
                  description: "保存時にエラーが発生しました。",
                  status: "error",
                  duration: 3000,
                  isClosable: true,
                });
              }
            }}
          >
            まとめて保存
          </Button>
        </Box>
      )}

      <Divider my={6} />

      {/* 既存の印刷ビュー */}
      <HStack spacing={3} mb={4} className="no-print">
        <Button onClick={() => window.print()} colorScheme="blue">全体を印刷</Button>
        {studentOptions.map((name) => (
          <Button key={name} onClick={() => setSelectedStudent(name)}>
            {name} さん用に印刷
          </Button>
        ))}
        {selectedStudent && (
          <Button onClick={() => setSelectedStudent(null)} colorScheme="gray">戻る</Button>
        )}
      </HStack>

      {!selectedStudent ? (
        <WeeklySchedule
          baseDate={baseDate}
          teachers={teachers}
          students={students}
          schedules={schedules}
          onEdit={openEdit}
        />
      ) : (
        <StudentSchedule
          studentName={selectedStudent}
          lessons={schedules.flatMap((s) => s.lessons)}
        />
      )}

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
                subjects: [],
              }
            : null
        }
      />
    </Box>
  );
}
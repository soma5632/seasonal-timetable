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

/**
 * 新設計のポイント
 * - ターム選択 → 生成条件 → 生成API呼び出し → プレビュー編集 → 適用して保存 → 印刷
 * - userData.teachers / students の id をそのまま利用（仮ID生成を廃止）
 * - ブース数を6に統一
 * - 週ビュー（baseDate）ではなく、選択ターム期間に限定してプレビュー
 */

// ===== 型定義 =====
export type Lesson = {
  id: string;
  startTime: string;
  endTime: string;
  subject: string;
  teacherId: string;
  studentId: string; // 1:1 の代表。1:2時は students に列挙
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
  date: string;       // YYYY-MM-DD
  slotIdx: number;    // 0..9
  boothIdx: number;   // 0..5
};

// ===== 時限・ブース定義 =====
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

// ===== 日付ユーティリティ =====
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

// ===== timetable 変換ユーティリティ =====
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
      subject: "", // 必要に応じてバックエンド拡張
      teacherId: l.teacherId,
      studentId: l.studentIds[0] ?? "",
      boothIndex: booth,
      students: (l.studentIds || []).map((sid) => ({ name: sid, subject: "" })), // 後で名前解決
      subjects: [],
    };

    // 空ブースは null で埋める（表示整形のため）
    for (let b = 0; b < BOOTH_COUNT; b++) {
      tt[date][slot][b] = tt[date][slot][b] || null;
    }
  }
  return tt;
}
function mergeTimetables(base: Timetable, add: Timetable): Timetable {
  const out: Timetable = { ...base };
  for (const date of Object.keys(add)) {
    out[date] = out[date] || {};
    for (const slotStr of Object.keys(add[date])) {
      const slot = Number(slotStr);
      out[date][slot] = out[date][slot] || {};
      for (let b = 0; b < BOOTH_COUNT; b++) {
        const val = add[date][slot][b] ?? null;
        out[date][slot][b] = val;
      }
    }
  }
  return out;
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

// 週ブロック表示用（プレビュー）
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

  // userData 読み込み
  const { userData, saveUserData } = useUserData(currentUserId);

  // ターム選択と期間
  const [selectedTermName, setSelectedTermName] = useState<string>("");
  const [termStartISO, setTermStartISO] = useState<string>("");
  const [termEndISO, setTermEndISO] = useState<string>("");

  // 生成オプション
  const [allowPairLessons, setAllowPairLessons] = useState<boolean>(true);
  const [preferElementaryMorning, setPreferElementaryMorning] = useState<boolean>(true);
  const [preferJuniorLunch, setPreferJuniorLunch] = useState<boolean>(true);
  const [earlyTermWeight, setEarlyTermWeight] = useState<number>(1); // 1..3
  const [balanceWeight, setBalanceWeight] = useState<number>(1);     // 1..3

  // プレビュー用 timetable（選択ターム範囲のみ）
  const [timetablePreview, setTimetablePreview] = useState<Timetable>({});
  const [loading, setLoading] = useState<boolean>(false);

  // 編集モーダル用
  const [editing, setEditing] = useState<{ date: string; slot: number; booth: number } | null>(null);

  // ターム一覧
  const termOptions = useMemo(() => {
    const terms = userData?.terms || {};
    return Object.keys(terms);
  }, [userData]);

  // タームの詳細をロード
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
      // 最初のタームがあれば選択
      const first = termOptions[0];
      if (first && userData.terms?.[first]) {
        setSelectedTermName(first);
        const t = userData.terms[first];
        setTermStartISO(t.startDate || "");
        setTermEndISO(t.endDate || "");
      }
    }
  }, [userData, termOptions]);
  // ターム期間の週ブロック（プレビュー用ヘッダ）
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

  // 編集モーダルの初期データ生成
  function getInitialLesson(date: string, slot: number, booth: number): Lesson {
    const existing = timetablePreview[date]?.[slot]?.[booth] || null;
    const base = {
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
    return base;
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

  // API呼び出し：生成
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

      if (data.error) {
        throw new Error(data.error);
      }
      const finalLessons: FinalLesson[] = data.finalLessons ?? [];
      const preview = lessonsToTimetable(finalLessons);
      setTimetablePreview(preview);

      toast({
        title: "生成完了",
        description: "時間割の生成が完了しました。プレビューで確認・編集できます。",
        status: "success",
        duration: 2500,
        isClosable: true,
      });
    } catch (e: any) {
      toast({
        title: "生成失敗",
        description: e?.message || "生成時にエラーが発生しました。",
        status: "error",
        duration: 3500,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }

  // 保存：プレビューを userData.timetable に適用
  function applyAndSave() {
    try {
      const merged = mergeTimetables(userData?.timetable || {}, timetablePreview);
      saveUserData({ timetable: merged });

      toast({
        title: "保存しました",
        description: "生成した時間割を適用して保存しました。",
        status: "success",
        duration: 2500,
        isClosable: true,
      });
    } catch {
      toast({
        title: "保存失敗",
        description: "保存時にエラーが発生しました。",
        status: "error",
        duration: 3500,
        isClosable: true,
      });
    }
  }
  // タームヘッダセルの表示（開校/閉校は TermManager 管理のため、ここでは情報表示のみ）
  function renderHeaderCell(iso: string) {
    const labelDate = parseISO(iso);
    const label = `${toMD(labelDate)}(${weekdayJa(labelDate)})`;
    return (
      <Th key={iso} textAlign="center">
        {label}
      </Th>
    );
  }

  return (
    <Box p={4}>
      <Heading size="lg" mb={2}>時間割管理</Heading>
      <Button onClick={() => onNavigate("home")} colorScheme="teal" mb={4}>
        ホームに戻る
      </Button>

      <Divider my={6} />

      {/* ターム選択 */}
      <Heading size="md" mb={2}>ターム選択</Heading>
      <Text fontSize="sm" color="gray.600" mb={3}>
        期間はターム管理画面で設定・保存済みの値を利用します。ここでは生成と編集を行います。
      </Text>
      <VStack align="start" spacing={3} mb={4}>
        <HStack spacing={3}>
          <Text minW="80px">ターム名</Text>
          <Select
            value={selectedTermName}
            onChange={(e) => {
              const name = e.target.value;
              setSelectedTermName(name);
              const t = userData?.terms?.[name];
              setTermStartISO(t?.startDate || "");
              setTermEndISO(t?.endDate || "");
              setTimetablePreview({});
            }}
            maxW="240px"
          >
            <option value="">選択してください</option>
            {termOptions.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </Select>
        </HStack>

        <HStack spacing={3}>
          <Text minW="80px">期間</Text>
          <Badge colorScheme={dateRangeValid ? "green" : "red"}>
            {termStartISO || "未設定"} 〜 {termEndISO || "未設定"}
          </Badge>
        </HStack>
      </VStack>

      <Divider my={6} />

      {/* 生成条件 */}
      <Heading size="md" mb={2}>生成条件</Heading>
      <VStack align="start" spacing={3} mb={4}>
        <Checkbox
          isChecked={allowPairLessons}
          onChange={(e) => setAllowPairLessons(e.target.checked)}
        >
          1:2 授業を許可する
        </Checkbox>
        <Checkbox
          isChecked={preferElementaryMorning}
          onChange={(e) => setPreferElementaryMorning(e.target.checked)}
        >
          小学生は午前（1・2限）優先
        </Checkbox>
        <Checkbox
          isChecked={preferJuniorLunch}
          onChange={(e) => setPreferJuniorLunch(e.target.checked)}
        >
          中1・中2は昼（3–5限）優先
        </Checkbox>

        <HStack spacing={3} w="100%">
          <VStack align="start" minW="220px">
            <Text>早期ターム重み（1〜3）: {earlyTermWeight}</Text>
            <Slider
              min={1}
              max={3}
              step={1}
              value={earlyTermWeight}
              onChange={(v) => setEarlyTermWeight(v)}
              maxW="300px"
            >
              <SliderTrack><SliderFilledTrack /></SliderTrack>
              <SliderThumb />
            </Slider>
          </VStack>

          <VStack align="start" minW="220px">
            <Text>進捗バランス重み（1〜3）: {balanceWeight}</Text>
            <Slider
              min={1}
              max={3}
              step={1}
              value={balanceWeight}
              onChange={(v) => setBalanceWeight(v)}
              maxW="300px"
            >
              <SliderTrack><SliderFilledTrack /></SliderTrack>
              <SliderThumb />
            </Slider>
          </VStack>
        </HStack>

        <HStack spacing={3}>
          <Button
            colorScheme="blue"
            onClick={generateTimetable}
            isDisabled={!selectedTermName || !dateRangeValid}
          >
            時間割を生成
          </Button>
          {loading && <Spinner size="sm" ml={2} />}
        </HStack>
      </VStack>

      <Divider my={6} />

      {/* プレビュー */}
      <Heading size="md" mb={2}>生成結果プレビュー（編集可）</Heading>
      {!dateRangeValid && (
        <Text fontSize="sm" color="red.600">タームの期間が正しく設定されていません。</Text>
      )}
        {dateRangeValid && weekBlocks.length > 0 && (
        <VStack align="stretch" spacing={8} mt={4}>
          {weekBlocks.map((block, blockIdx) => (
            <Box key={blockIdx} borderWidth="1px" borderRadius="md" overflowX="auto">
              <Table size="sm" variant="simple">
                <Thead>
                  <Tr>
                    <Th>時限</Th>
                    {block.dates.map((d) => renderHeaderCell(d.iso))}
                  </Tr>
                </Thead>
                <Tbody>
                  {timeSlots.map((slotLabel, slotIdx) => (
                    <Tr key={slotIdx}>
                      <Td fontWeight="bold">
                        {slotIdx + 1}限<br />{slotLabel}
                      </Td>

                      {block.dates.map((d) => {
                        // 各日・各時限のブース一覧レンダリング
                        const booths = new Array(BOOTH_COUNT)
                          .fill(null)
                          .map((_, b) => timetablePreview[d.iso]?.[slotIdx]?.[b] || null);

                        return (
                          <Td key={`${d.iso}-${slotIdx}`} p={2}>
                            <VStack align="stretch" spacing={2}>
                              {booths.map((l, boothIdx) => {
                                const isEmpty = l === null;
                                const style = isEmpty ? CELL_STYLE.open : CELL_STYLE.closed; // 色分け例
                                return (
                                  <HStack
                                    key={boothIdx}
                                    spacing={2}
                                    p={2}
                                    borderWidth="1px"
                                    borderRadius="md"
                                    bg={isEmpty ? "white" : "gray.50"}
                                  >
                                    <Badge colorScheme="purple">{boothIdx + 1}号ブース</Badge>
                                    {isEmpty ? (
                                      <Button
                                        size="xs"
                                        onClick={() => openEdit(d.iso, slotIdx, boothIdx)}
                                      >
                                        追加
                                      </Button>
                                    ) : (
                                      <>
                                        <Text fontSize="xs">
                                          先生:{l.teacherId} / 生徒:{(l.students || []).map(s => s.name).join(", ")}
                                        </Text>
                                        <Button
                                          size="xs"
                                          onClick={() => openEdit(d.iso, slotIdx, boothIdx)}
                                        >
                                          編集
                                        </Button>
                                        <Button
                                          size="xs"
                                          colorScheme="red"
                                          variant="outline"
                                          onClick={() =>
                                            setTimetablePreview((prev) => ({
                                              ...prev,
                                              [d.iso]: {
                                                ...prev[d.iso],
                                                [slotIdx]: {
                                                  ...prev[d.iso]?.[slotIdx],
                                                  [boothIdx]: null,
                                                },
                                              },
                                            }))
                                          }
                                        >
                                          クリア
                                        </Button>
                                      </>
                                    )}
                                  </HStack>
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
          ))}
        </VStack>
      )}

      {/* 適用・保存 */}
      <HStack spacing={3} mt={6}>
        <Button
          colorScheme="blue"
          onClick={applyAndSave}
          isDisabled={!dateRangeValid || Object.keys(timetablePreview).length === 0}
        >
          適用して保存
        </Button>
        <Button onClick={() => window.print()} colorScheme="gray" variant="outline">
          印刷
        </Button>
      </HStack>

      {/* 編集モーダル */}
      <EditLessonModal
        isOpen={isOpen}
        onClose={() => { onClose(); setEditing(null); }}
        onSave={handleSaveLesson}
        teacherOptions={
            (Array.isArray(userData?.teachers)
              ? (userData?.teachers as any[])
              : Object.values(userData?.teachers ?? {})
            ).map((t: any) => t?.id).filter(Boolean)
        }
        studentOptions={
            (Array.isArray(userData?.students)
              ? (userData?.students as any[])
              : Object.values(userData?.students ?? {})
            ).map((s: any) => s?.id).filter(Boolean)
        }


        initialData={
          editing
            ? getInitialLesson(editing.date, editing.slot, editing.booth)
            : null
        }
      />
    </Box>
  );
}

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Heading,
  HStack,
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
  FormLabel,
} from "@chakra-ui/react";
import EditLessonModal from "../components/EditLessonModal";
import { useUserData } from "../hooks/useUserData";

/**
 * 新設計のポイント
 * - ターム選択 → 生成条件 → 生成API呼び出し → プレビュー編集 → 適用して保存 → 印刷
 * - userData.teachers / students の id をそのまま利用
 * - ブース数を6に統一
 */

// ===== 型定義 =====
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

// ===== Props =====
type TimetableManagerProps = {
  onNavigate: React.Dispatch<
    React.SetStateAction<
      "home" | "students" | "teachers" | "timetable" | "term" | "login" | "signup" | 'progress'
    >
  >;
  currentUserId: string;
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

function buildWeekBlocks(startISO: string, endISO: string) {
  const start = parseISO(startISO);
  const end = parseISO(endISO);
  const WEEKDAY_JA = ["日", "月", "火", "水", "木", "金", "土"];

  const days: { iso: string; label: string; weekdayJa: string; date: Date }[] = [];

  for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
    const wd = WEEKDAY_JA[dt.getDay()];
    if (!["月", "火", "水", "木", "金", "土"].includes(wd)) continue;
    days.push({
      iso: toDateString(dt),
      label: `${dt.getMonth() + 1}/${dt.getDate()}`,
      weekdayJa: wd,
      date: new Date(dt),
    });
  }

  const blocks: { dates: { iso: string; label: string; weekdayJa: string }[] }[] = [];
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

export default function TimetableManager({
  onNavigate,
  currentUserId,
}: TimetableManagerProps) {
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [closedSlotsByDate, setClosedSlotsByDate] = useState<{ [iso: string]: number[] }>({});

  // ✅ userData 読み込み
  const { userData, saveUserData } = useUserData(currentUserId);

  // ✅ 生徒ID → 名前
  const studentMap = useMemo(() => {
    const map: Record<string, string> = {};
    (userData?.students ?? []).forEach((s: any) => {
      map[s.id] = s.name;
    });
    return map;
  }, [userData]);

  // ✅ 先生ID → 名前
  const teacherMap = useMemo(() => {
    const map: Record<string, string> = {};
    (userData?.teachers ?? []).forEach((t: any) => {
      map[t.id] = t.name;
    });
    return map;
  }, [userData]);

  // ✅ timetable 変換
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
      studentId: l.studentIds[0] || "",
      boothIndex: booth,
      students: (l.studentIds || []).map((sid) => ({
        name: studentMap[sid] ?? sid,
        subject: "",
      })),
      subjects: [],
    };

      // 空ブース埋め
      for (let b = 0; b < BOOTH_COUNT; b++) {
        tt[date][slot][b] = tt[date][slot][b] || null;
      }
    }

    return tt;
  }

  // ✅ timetable マージ
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

  // ===== ターム選択と期間 =====
  const [selectedTermName, setSelectedTermName] = useState<string>("");
  const [termStartISO, setTermStartISO] = useState<string>("");
  const [termEndISO, setTermEndISO] = useState<string>("");

  // ===== 生成オプション =====
  const [allowPairLessons, setAllowPairLessons] = useState<boolean>(true);
  const [preferElementaryMorning, setPreferElementaryMorning] = useState<boolean>(true);
  const [preferJuniorLunch, setPreferJuniorLunch] = useState<boolean>(true);
  const [earlyTermWeight, setEarlyTermWeight] = useState<number>(1);
  const [balanceWeight, setBalanceWeight] = useState<number>(1);

  // ===== プレビュー用 timetable =====
  const [timetablePreview, setTimetablePreview] = useState<Timetable>({});
  const [loading, setLoading] = useState<boolean>(false);

  // ===== 編集モーダル =====
  const [editing, setEditing] = useState<{ date: string; slot: number; booth: number } | null>(null);

  // ===== ターム一覧 =====
  const termOptions = useMemo(() => {
    const terms = userData?.terms || {};
    return Object.keys(terms);
  }, [userData]);

  // ===== タームの詳細をロード =====
  useEffect(() => {
    if (!userData) return;

    const last = userData.lastSelectedTermName;
    const defaultTerm = last && userData.terms?.[last] ? last : "";

    if (defaultTerm) {
      setSelectedTermName(defaultTerm);
      const t = userData.terms![defaultTerm];
      setTermStartISO(t.startDate || "");
      setTermEndISO(t.endDate || "");
      setClosedSlotsByDate(t.closedSlots || {});
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

  // ===== 週ブロック生成 =====
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

  // ===== 編集モーダルの初期データ =====
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

  // ===== API呼び出し：時間割生成 =====
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

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const finalLessons: FinalLesson[] = data.finalLessons ?? [];

      // ✅ timetablePreview に反映
      const preview = lessonsToTimetable(finalLessons);
      setTimetablePreview(preview);

      // ✅ finalLessons を userData に保存
      saveUserData({
        timetableFinalLessons: finalLessons,
      });

      toast({
        title: "生成完了",
        description: "時間割の生成が完了しました。",
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

  // ===== 保存処理 =====
  function applyAndSave() {
      try {
        const merged = mergeTimetables(userData?.timetable || {}, timetablePreview);

        saveUserData({
          timetable: merged,
          timetableFinalLessons: userData?.timetableFinalLessons ?? [],
        });

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

  // ===== ヘッダセル表示 =====
  function renderHeaderCell(iso: string) {
    const labelDate = parseISO(iso);
    const WEEKDAY_JA = ["日", "月", "火", "水", "木", "金", "土"];
    const label = `${labelDate.getMonth() + 1}/${labelDate.getDate()}(${WEEKDAY_JA[labelDate.getDay()]})`;

    return (
      <Th key={iso} textAlign="center">
        {label}
      </Th>
    );
  }

  return (
    <Box p={4}>
    　<Heading size="lg" mb={2}>管理</Heading>
      <Button onClick={() => onNavigate("home")} colorScheme="teal" mb={4}>
          ホームに戻る
      </Button>
      <Button onClick={() => onNavigate("progress")} colorScheme="purple" mb={4}>
          進捗確認
      </Button>

      {/* ===== ターム選択 UI ===== */}
      <Box mb={4}>
          <FormLabel>表示するターム</FormLabel>
          <Select
            value={selectedTermName}
            onChange={(e) => {
              const termName = e.target.value;
              setSelectedTermName(termName);
              const t = userData?.terms?.[termName];
              if (t) {
                setTermStartISO(t.startDate || "");
                setTermEndISO(t.endDate || "");
                setClosedSlotsByDate(t.closedSlots || {});
              }
            }}
          >
            {termOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>
      </Box>

      {/* ===== 時間割生成 ===== */}
      <Box mt={4}>
          <Button
            colorScheme="green"
            onClick={generateTimetable}
            isLoading={loading}
          >
            {selectedTermName} の時間割を生成する
          </Button>
      </Box>

      {/* ===== 生成オプション ===== */}
      <Box mt={6} p={4} borderWidth="1px" borderRadius="md">
          <Heading size="sm" mb={3}>生成オプション</Heading>

          <VStack align="stretch" spacing={4}>

            <Checkbox
              isChecked={allowPairLessons}
              onChange={(e) => setAllowPairLessons(e.target.checked)}
            >
              ペア授業を許可する
            </Checkbox>

            <Checkbox
              isChecked={preferElementaryMorning}
              onChange={(e) => setPreferElementaryMorning(e.target.checked)}
            >
              小学生は午前を優先
            </Checkbox>

            <Checkbox
              isChecked={preferJuniorLunch}
              onChange={(e) => setPreferJuniorLunch(e.target.checked)}
            >
              中学生は昼を優先
            </Checkbox>

            <Box>
              <Text mb={1}>前半タームの重み（1〜5）</Text>
              <Slider
                min={1}
                max={5}
                step={1}
                value={earlyTermWeight}
                onChange={(v) => setEarlyTermWeight(v)}
              >
                <SliderTrack>
                  <SliderFilledTrack />
                </SliderTrack>
                <SliderThumb />
              </Slider>
            </Box>

            <Box>
              <Text mb={1}>バランス重視（1〜5）</Text>
              <Slider
                min={1}
                max={5}
                step={1}
                value={balanceWeight}
                onChange={(v) => setBalanceWeight(v)}
              >
                <SliderTrack>
                  <SliderFilledTrack />
                </SliderTrack>
                <SliderThumb />
              </Slider>
            </Box>

          </VStack>
      </Box>

      {/* ===== プレビュー ===== */}
      <Heading size="md" mb={2}>{selectedTermName} の生成結果プレビュー</Heading>

      {!dateRangeValid && (
        <Text fontSize="sm" color="red.600">
          タームの期間が正しく設定されていません。
        </Text>
      )}

      {dateRangeValid && weekBlocks.length > 0 && (
        <VStack align="stretch" spacing={8} mt={4}>
          {weekBlocks.map((block, blockIdx) => (
            <Box
              key={blockIdx}
              borderWidth="1px"
              borderRadius="md"
              overflowX="auto"
            >
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
                        {slotIdx + 1}限<br />
                        {slotLabel}
                      </Td>

                      {block.dates.map((d) => {
                          const isClosed =
                            (closedSlotsByDate[d.iso] || []).includes(slotIdx);

                          const booths = new Array(BOOTH_COUNT)
                            .fill(null)
                            .map((_, b) => timetablePreview[d.iso]?.[slotIdx]?.[b] || null);

                          return (
                            <Td
                              key={`${d.iso}-${slotIdx}`}
                              p={2}
                              bg={isClosed ? "gray.200" : undefined}
                            >
                              {isClosed ? (
                                <Text fontSize="xs" color="red.600">
                                  閉校
                                </Text>
                              ) : (
                                <VStack align="stretch" spacing={2}>
                                  {booths.map((l, boothIdx) => {
                                    const isEmpty = l === null;

                                return (
                                  <HStack
                                    key={boothIdx}
                                    spacing={2}
                                    p={2}
                                    borderWidth="1px"
                                    borderRadius="md"
                                    bg={isEmpty ? "white" : "gray.50"}
                                  >
                                    <Badge colorScheme="purple">
                                      {boothIdx + 1}号ブース
                                    </Badge>

                                    {isEmpty ? (
                                      <Button
                                        size="xs"
                                        onClick={() =>
                                          openEdit(d.iso, slotIdx, boothIdx)
                                        }
                                      >
                                        追加
                                      </Button>
                                    ) : (
                                      <>
                                        <Text fontSize="xs">
                                          先生:
                                          {teacherMap[l.teacherId] ??
                                            l.teacherId}{" "}
                                          / 生徒:
                                          {(l.students || [])
                                            .map((s) => s.name)
                                            .join(", ")}
                                        </Text>

                                        <Button
                                          size="xs"
                                          onClick={() =>
                                            openEdit(d.iso, slotIdx, boothIdx)
                                          }
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
                            )}
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

      {/* ===== 適用・保存 ===== */}
      <HStack spacing={3} mt={6}>
        <Button
          colorScheme="blue"
          onClick={applyAndSave}
          isDisabled={!dateRangeValid || Object.keys(timetablePreview).length === 0}
        >
          適用して保存
        </Button>

        <Button
          onClick={() => window.print()}
          colorScheme="gray"
          variant="outline"
        >
          印刷
        </Button>
      </HStack>

      {/* ===== 編集モーダル ===== */}
      <EditLessonModal
          isOpen={isOpen}
          onClose={() => {
            onClose();
            setEditing(null);
          }}
          onSave={handleSaveLesson}

          teacherOptions={
            (Array.isArray(userData?.teachers)
              ? userData.teachers
              : Object.values(userData?.teachers ?? {})
            ).map((t: any) => ({
              id: t.id,
              name: t.name,
            }))
          }

          studentOptions={
            (Array.isArray(userData?.students)
              ? userData.students
              : Object.values(userData?.students ?? {})
            ).map((s: any) => ({
              id: s.id,
              name: s.name,
            }))
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
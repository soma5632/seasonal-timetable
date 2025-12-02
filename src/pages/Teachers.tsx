import React, { useEffect, useRef, useState } from "react";
import {
  Box, Heading, Text, Button, VStack, HStack, Input, Select,
  Table, Thead, Tbody, Tr, Th, Td, Modal, ModalOverlay, ModalContent,
  ModalHeader, ModalBody, ModalFooter, useDisclosure
} from "@chakra-ui/react";
import { useUserData } from "../hooks/useUserData";
import SearchableNameSelector from "../components/SearchableNameSelector";
import { Teacher, Term, Student } from "../types";


type ScheduleItem = {
  date: [number, number]; // (month, day)
  time: string;
  tag: "×" | "slash" | "triangle" | "blank";
};

type TeachersProps = {
  onNavigate: React.Dispatch<
    React.SetStateAction<"home" | "timetable" | "students" | "teachers" | "term" | "login" | "signup">
  >;
  currentUserId: string;
};

const subjectOptions = ["国語","数学","英語","理科","社会"];
const timeSlots = [
  "10:00〜11:30","11:10〜12:40","13:20〜14:50","14:30〜16:00",
  "15:40〜17:10","16:05〜17:35","17:10〜18:40","18:15〜19:45",
  "19:20〜20:50","20:30〜22:00",
];

// アイコン化用スタイル（slashは×に統一）
const TAG_STYLE: Record<string, { symbol: string; color: string; bg: string }> = {
  "×": { symbol: "×", color: "red.600", bg: "gray.100" },
  "triangle": { symbol: "△", color: "orange.600", bg: "gray.100" },
  "blank": { symbol: "〇", color: "gray.400", bg: "white" },
};

const STORAGE_KEY = "app-data";
export default function Teachers({ onNavigate, currentUserId }: TeachersProps) {
  const { userData, saveUserData } = useUserData(currentUserId);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);

  // 授業可能科目
  const [newPossibleSubject, setNewPossibleSubject] = useState("");

  // NG生徒
  const [newNgStudent, setNewNgStudent] = useState("");

  // ターム選択
  const [selectedTermId, setSelectedTermId] = useState<string>("");

  // スケジュール（タームごとに保持）
  const [scheduleByDate, setScheduleByDate] = useState<{ [iso: string]: { [slotIdx: number]: any } }>({});

  // ターム一覧
  const [terms, setTerms] = useState<Term[]>([]);

  // 撮影／アップロード画像プレビュー
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // 週ごとのブロック
  const [weekBlocks, setWeekBlocks] = useState<{ dates: { iso: string; label: string; weekdayJa: string }[] }[]>([]);
  const [dateRangeValid, setDateRangeValid] = useState(false);

  // カメラ関連
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraOn, setCameraOn] = useState(false);

  // モーダル表示制御（△セル編集）
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [applyOnlyThisDay, setApplyOnlyThisDay] = useState(false);
  const [editTarget, setEditTarget] = useState<{ iso: string; slotIdx: number } | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  // 生徒候補一覧（名前のみ）
  const studentNames = userData?.students?.map((s: Student) => s.name) ?? [];
  useEffect(() => {
    if (userData) {
      if (userData.terms) {
        const termList = Object.entries(userData.terms)
          .filter(([_, v]) => v !== null)
          .map(([id, v]: any) => ({
            id,
            name: v.termName,
            startDate: v.startDate,
            endDate: v.endDate,
            closedSlots: v.closedSlots || {},
          }));
        setTerms(termList);
      }
      if (userData.teachers) {
        setTeachers(userData.teachers);
      }
    }
  }, [userData]);

  // ---- 授業可能科目 ----
  const addPossibleSubject = () => {
    if (!selectedTeacher || !newPossibleSubject) return;

    const updated = {
      ...selectedTeacher,
      possibleSubjects: [...selectedTeacher.possibleSubjects, newPossibleSubject],
    };
    const newTeachers = teachers.map(t => (t.id === updated.id ? updated : t));
    setTeachers(newTeachers);
    setSelectedTeacher(updated);

    saveUserData({ teachers: newTeachers });

    setNewPossibleSubject("");
  };

  const removePossibleSubject = (idx: number) => {
    if (!selectedTeacher) return;
    const updated = {
      ...selectedTeacher,
      possibleSubjects: selectedTeacher.possibleSubjects.filter((_, i) => i !== idx),
    };
    const newTeachers = teachers.map(t => (t.id === updated.id ? updated : t));
    setTeachers(newTeachers);
    setSelectedTeacher(updated);

    saveUserData({ teachers: newTeachers });
  };

  // ---- NG生徒 ----
  const addNgStudent = () => {
    if (!selectedTeacher || !newNgStudent.trim()) return;
    const updated = {
      ...selectedTeacher,
      ngStudents: [...selectedTeacher.ngStudents, newNgStudent.trim()],
    };
    const newTeachers = teachers.map(t => (t.id === updated.id ? updated : t));
    setTeachers(newTeachers);
    setSelectedTeacher(updated);

    saveUserData({ teachers: newTeachers });

    setNewNgStudent("");
  };

  const removeNgStudent = (idx: number) => {
    if (!selectedTeacher) return;
    const updated = {
      ...selectedTeacher,
      ngStudents: selectedTeacher.ngStudents.filter((_, i) => i !== idx),
    };
    const newTeachers = teachers.map(t => (t.id === updated.id ? updated : t));
    setTeachers(newTeachers);
    setSelectedTeacher(updated);

    saveUserData({ teachers: newTeachers });
  };
  // ---- Camera ----
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraOn(true);
    } catch (e) {
      console.error("Camera start failed:", e);
      setCameraOn(false);
    }
  };

  const stopCamera = () => {
    const video = videoRef.current;
    if (video && video.srcObject) {
      const tracks = (video.srcObject as MediaStream).getTracks();
      tracks.forEach(t => t.stop());
      video.srcObject = null;
    }
    setCameraOn(false);
  };

  // ---- AI推定処理 ----
  const normalizeTime = (t: string) => {
    return t.replace("-", "〜");
  };

  const applyAISchedule = (items: any[]) => {
    const term = terms.find(t => t.id === selectedTermId);
    if (!term) return;

    const start = new Date(term.startDate);
    const year = start.getFullYear();

    setScheduleByDate(prev => {
      const updated = { ...prev };

      items.forEach(item => {
        const m = String(item.date[0]).padStart(2, "0");
        const d = String(item.date[1]).padStart(2, "0");
        const iso = `${year}-${m}-${d}`;

        const slotIdx = timeSlots.findIndex(slot => slot === normalizeTime(item.time));
        if (slotIdx < 0) return;

        // ★ closedセルは上書きしない
        if (updated[iso]?.[slotIdx] === "closed") return;

        // slash を × に統一
        let tag: "blank" | "×" | "triangle" = "blank";
        if (item.tag === "x" || item.tag === "×" || item.tag === "slash" || item.tag === "/") tag = "×";
        else if (item.tag === "triangle" || item.tag === "△") tag = "triangle";

        if (!updated[iso]) updated[iso] = {};
        updated[iso][slotIdx] = tag;
      });

      return updated;
    });
  };

  // ---- 画像送信処理 ----
  const captureAndSend = async () => {
    if (!videoRef.current || !canvasRef.current || !selectedTeacher || !selectedTermId) return;

    const term = terms.find(t => t.id === selectedTermId);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, "image/jpeg", 0.92)
    );
    if (!blob) return;

    const formData = new FormData();
    formData.append("file", blob, "capture.jpg");
    formData.append("teacher_id", String(selectedTeacher.id));
    formData.append("term_id", selectedTermId);
    formData.append("start_date", term?.startDate || "");
    formData.append("end_date", term?.endDate || "");

    setPreviewUrl(URL.createObjectURL(blob));

    try {
      const res = await fetch("https://api.souma-lab.com/schedule/upload", {
        method: "POST",
        body: formData
      });
      const text = await res.text();
      console.log("API raw response:", text);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ScheduleItem[] = JSON.parse(text);
      applyAISchedule(data);
    } catch (err) {
      console.error("Upload/Inference failed:", err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !selectedTeacher || !selectedTermId) return;
    const file = e.target.files[0];
    const term = terms.find(t => t.id === selectedTermId);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("teacher_id", String(selectedTeacher.id));
    formData.append("term_id", selectedTermId);
    formData.append("start_date", term?.startDate || "");
    formData.append("end_date", term?.endDate || "");

    setPreviewUrl(URL.createObjectURL(file));

    try {
      const res = await fetch("https://api.souma-lab.com/schedule/upload", {
        method: "POST",
        body: formData
      });
      const text = await res.text();
      console.log("API raw response:", text);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ScheduleItem[] = JSON.parse(text);
      applyAISchedule(data);
    } catch (err) {
      console.error("Upload/Inference failed:", err);
    }
  };

  // ---- ターム選択時に週ごとブロック生成（月〜土のみ＋閉校反映） ----
  useEffect(() => {
    if (!selectedTermId || !selectedTeacher) return;

    const term = terms.find(t => t.id === selectedTermId);
    if (!term) return;

    const start = new Date(term.startDate);
    const end = new Date(term.endDate);

    const empty: { [iso: string]: { [slotIdx: number]: any } } = {};
    const weeks: { dates: { iso: string; label: string; weekdayJa: string }[] }[] = [];

    const weekdayJa = ["日","月","火","水","木","金","土"];

    let currentWeek: { iso: string; label: string; weekdayJa: string }[] = [];
    for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
      if (dt.getDay() === 0) continue; // ★ 日曜はスキップ

      const iso = dt.toISOString().split("T")[0];
      empty[iso] = {};
      timeSlots.forEach((_, idx) => {
        empty[iso][idx] = "blank";
      });

      // ★ 閉校情報を反映
      const closed = term.closedSlots?.[iso] || [];
      closed.forEach(slotIdx => {
        empty[iso][slotIdx] = "closed"; // 特別タグ closed
      });

      currentWeek.push({
        iso,
        label: `${dt.getMonth() + 1}/${dt.getDate()}`,
        weekdayJa: weekdayJa[dt.getDay()],
      });

      if (dt.getDay() === 6) { // ★ 土曜で週区切り
        weeks.push({ dates: currentWeek });
        currentWeek = [];
      }
    }
    if (currentWeek.length > 0) weeks.push({ dates: currentWeek });

    const existing = selectedTeacher.schedules[selectedTermId];
    setScheduleByDate(existing || empty);
    setWeekBlocks(weeks);
    setDateRangeValid(true);
  }, [selectedTermId, selectedTeacher]);

  // ---- セル編集ロジック ----
  const toggleTag = (dateISO: string, slotIdx: number) => {
    setScheduleByDate(prev => {
      const current = prev[dateISO]?.[slotIdx] || "blank";
      if (current === "closed") return prev; // ★ 閉校セルは編集不可
      const order = ["blank", "×", "triangle"];
      const next = order[(order.indexOf(current) + 1) % order.length];
      return {
        ...prev,
        [dateISO]: { ...(prev[dateISO] || {}), [slotIdx]: next },
      };
    });
  };

  // ---- 長押し判定（△セル編集用） ----
  const touchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);

  const handleTouchStart = (iso: string, slotIdx: number, tag: any) => {
      longPressTriggered.current = false;
      if ((typeof tag === "string" && tag === "triangle") || (typeof tag === "object" && tag.tag === "triangle")) {
        touchTimer.current = setTimeout(() => {
          longPressTriggered.current = true;
          setEditTarget({ iso, slotIdx });
          setSelectedStudents(typeof tag === "object" && tag.students ? tag.students : []);
          onOpen();
        }, 600);
      }
  };

  const handleTouchEnd = (iso: string, slotIdx: number) => {
      if (touchTimer.current) {
        clearTimeout(touchTimer.current);
        touchTimer.current = null;
      }
      if (!longPressTriggered.current) {
        // 通常タップのみ切り替え
        toggleTag(iso, slotIdx);
      }
  };

  const handleCloseModal = () => {
      longPressTriggered.current = false;
      onClose();
  };

  // ---- 日付クリックで一括切替 ----
  const toggleDay = (dateISO: string) => {
    setScheduleByDate(prev => {
      const updatedDay = { ...(prev[dateISO] || {}) };
      const order = ["blank","×","triangle"];
      const firstTag = Object.values(updatedDay).find(t => t !== "closed") || "blank";
      const next = order[(order.indexOf(firstTag) + 1) % order.length];

      Object.keys(updatedDay).forEach(idxStr => {
        const idx = Number(idxStr);
        if (updatedDay[idx] !== "closed") {
          updatedDay[idx] = next;
        }
      });

      return { ...prev, [dateISO]: updatedDay };
    });
  };

  // ---- スケジュール保存 ----
  const saveSchedule = () => {
    if (!selectedTeacher || !selectedTermId) return;

    // scheduleByDate の中身を正規化
    const normalized: Record<string, Record<number, any>> = {};

    Object.entries(scheduleByDate).forEach(([iso, slots]) => {
      normalized[iso] = {};
      Object.entries(slots).forEach(([slotIdxStr, value]) => {
        const slotIdx = Number(slotIdxStr);
        if (typeof value === "object" && value.tag === "triangle") {
          normalized[iso][slotIdx] = {
            tag: "triangle",
            students: value.students || []
          };
        } else {
          normalized[iso][slotIdx] = value;
        }
      });
    });

    const updated: Teacher = {
      ...selectedTeacher,
      schedules: { ...selectedTeacher.schedules, [selectedTermId]: normalized }
    };

    const newTeachers = teachers.map(t => (t.id === updated.id ? updated : t));
    setTeachers(newTeachers);
    setSelectedTeacher(updated);

    saveUserData({ teachers: newTeachers });
  };
  // ---- Render ----
  if (selectedTeacher) {
    return (
      <Box p={4}>
        <Heading size="md" mb={2}>
          {selectedTeacher.name} の詳細
        </Heading>

        {/* 授業可能科目 */}
        <Box mt={4}>
          <Heading size="sm">授業可能科目</Heading>
          <HStack mt={2} spacing={2}>
            <Select
              size="sm"
              placeholder="科目を選択"
              value={newPossibleSubject}
              onChange={e => setNewPossibleSubject(e.target.value)}
            >
              {subjectOptions.map((s, idx) => (
                <option key={idx} value={s}>{s}</option>
              ))}
            </Select>
            <Button size="sm" onClick={addPossibleSubject}>追加</Button>
          </HStack>
          <VStack align="start" mt={2}>
            {selectedTeacher.possibleSubjects.map((s, idx) => (
              <HStack key={idx}>
                <Text fontSize="sm">{s}</Text>
                <Button size="xs" onClick={() => removePossibleSubject(idx)}>削除</Button>
              </HStack>
            ))}
          </VStack>
        </Box>

        {/* NG生徒 */}
        <Box mt={4}>
          <Heading size="sm">NG生徒</Heading>
          <HStack mt={2} spacing={2}>
            <Input
              size="sm"
              placeholder="生徒名"
              value={newNgStudent}
              onChange={e => setNewNgStudent(e.target.value)}
            />
            <Button size="sm" onClick={addNgStudent}>追加</Button>
          </HStack>
          <VStack align="start" mt={2}>
            {selectedTeacher.ngStudents.map((s, idx) => (
              <HStack key={idx}>
                <Text fontSize="sm">{s}</Text>
                <Button size="xs" onClick={() => removeNgStudent(idx)}>削除</Button>
              </HStack>
            ))}
          </VStack>
        </Box>

        {/* ターム選択 */}
        <Box mt={4}>
          <Heading size="sm">ターム選択</Heading>
          <Select
            size="sm"
            placeholder="タームを選択"
            value={selectedTermId}
            onChange={e => setSelectedTermId(e.target.value)}
          >
            {terms.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </Select>
        </Box>

        {/* スケジュール表 */}
        {dateRangeValid && weekBlocks.length > 0 && (
          <VStack align="stretch" spacing={4} mt={4}>
            {weekBlocks.map((block, blockIdx) => (
              <Box key={blockIdx} borderWidth="1px" borderRadius="md" overflowX="auto">
                <Table size="xs" variant="simple">
                  <Thead>
                    <Tr>
                      <Th fontSize="xx-small" p={0.5} minW="40px">時限</Th>
                      {block.dates.map(d => (
                        <Th
                          key={d.iso}
                          fontSize="xx-small"
                          p={0.5}
                          minW="40px"
                          textAlign="center"
                          cursor="pointer"
                          onClick={() => toggleDay(d.iso)}
                        >
                          {d.label}({d.weekdayJa})
                        </Th>
                      ))}
                    </Tr>
                  </Thead>
                  <Tbody>
                    {timeSlots.map((slotLabel, slotIdx) => (
                      <Tr key={slotIdx}>
                        <Td fontSize="xx-small" p={0.5} fontWeight="bold" minW="40px">
                          {slotIdx + 1}限
                        </Td>
                        {block.dates.map(d => {
                          const tag = scheduleByDate[d.iso]?.[slotIdx] || "blank";
                          if (tag === "closed") {
                            return (
                              <Td
                                key={d.iso + "-" + slotIdx}
                                fontSize="xx-small"
                                p={0.5}
                                minW="40px"
                                textAlign="center"
                                bg="gray.300"
                                color="gray.600"
                              >
                                休
                              </Td>
                            );
                          }
                          const style = typeof tag === "object" ? TAG_STYLE[tag.tag] : TAG_STYLE[tag];
                          return (
                            <Td
                              key={d.iso + "-" + slotIdx}
                              fontSize="xx-small"
                              p={0.5}
                              minW="40px"
                              textAlign="center"
                              cursor="pointer"
                              bg={style.bg}
                              color={style.color}
                              onTouchStart={() => handleTouchStart(d.iso, slotIdx, tag)}
                              onTouchEnd={() => handleTouchEnd(d.iso, slotIdx)}
                              onTouchMove={handleTouchMove}
                              style={{
                                userSelect: "none",
                                WebkitUserSelect: "none",
                                WebkitTouchCallout: "none",
                                touchAction: "manipulation"
                              }}
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

        <Button mt={4} colorScheme="blue" size="sm" onClick={saveSchedule}>
          このタームのスケジュールを保存
        </Button>

        <Box mt={6}>
          <Button size="sm" onClick={() => { setSelectedTeacher(null); onNavigate("teachers"); }}>
            一覧に戻る
          </Button>
        </Box>
        {/* △セル編集モーダル */}
        <Modal isOpen={isOpen} onClose={onClose} size="sm" blockScrollOnMount={false}>
            <ModalOverlay />
            <ModalContent>
              <ModalHeader>通常授業の生徒を選択</ModalHeader>
              <ModalBody>
                <VStack align="stretch" spacing={3}>
                  <SearchableNameSelector
                    label="生徒を検索して選択"
                    candidates={studentNames}
                    onSelect={(name) => {
                      if (selectedStudents.includes(name)) return;
                      if (selectedStudents.length >= 2) return; // 最大2人まで
                      setSelectedStudents([...selectedStudents, name]);
                    }}
                  />
                  <VStack align="start" spacing={1}>
                    {selectedStudents.map((s, idx) => (
                      <HStack key={idx}>
                        <Text fontSize="sm">{s}</Text>
                        <Button
                          size="xs"
                          onClick={() =>
                            setSelectedStudents(selectedStudents.filter((_, i) => i !== idx))
                          }
                        >
                          削除
                        </Button>
                      </HStack>
                    ))}
                  </VStack>
                  <Text fontSize="sm" fontWeight="bold">適用範囲</Text>
                  <HStack>
                    <input
                      type="radio"
                      name="applyScope"
                      checked={!applyOnlyThisDay}
                      onChange={() => setApplyOnlyThisDay(false)}
                    />
                    <Text fontSize="sm">同じ曜日の同じ時間すべて（デフォルト）</Text>
                  </HStack>
                  <HStack>
                    <input
                      type="radio"
                      name="applyScope"
                      checked={applyOnlyThisDay}
                      onChange={() => setApplyOnlyThisDay(true)}
                    />
                    <Text fontSize="sm">この日だけ適用する</Text>
                  </HStack>
                </VStack>
              </ModalBody>
              <ModalFooter>
                <HStack spacing={3}>
                  <Button
                      size="sm"
                      colorScheme="blue"
                      onClick={() => {
                        if (!editTarget) return;
                        const { iso, slotIdx } = editTarget;

                        setScheduleByDate((prev) => {
                          const updated = { ...prev };

                          if (applyOnlyThisDay) {
                            // この日だけ更新
                            updated[iso] = {
                              ...(prev[iso] || {}),
                              [slotIdx]: { tag: "triangle", students: selectedStudents }
                            };
                          } else {
                            // 同じ曜日すべて更新
                            const targetWeekday = new Date(iso).getDay();
                            Object.keys(prev).forEach(dateISO => {
                              const d = new Date(dateISO);
                              if (d.getDay() === targetWeekday) {
                                updated[dateISO] = {
                                  ...(prev[dateISO] || {}),
                                  [slotIdx]: { tag: "triangle", students: selectedStudents }
                                };
                              }
                            });
                          }

                          return updated;
                        });

                        onClose();
                      }}
                    >
                      保存
                  </Button>
                  <Button size="sm" onClick={onClose}>
                    キャンセル
                  </Button>
                </HStack>
              </ModalFooter>
            </ModalContent>
        </Modal>
      </Box>
    );
  }

  // ---- 一覧＋新規登録フォーム ----
  return (
    <Box p={4}>
      <Heading size="md" mb={4}>先生管理</Heading>

      <VStack align="start" spacing={2} mb={4}>
        <Button onClick={() => onNavigate("home")} colorScheme="teal" size="sm">
          ホームに戻る
        </Button>

        {!showForm ? (
          <Button size="sm" onClick={() => setShowForm(true)}>新規登録</Button>
        ) : (
          <VStack align="start" spacing={3} mt={2}>
            <Input
              type="text"
              placeholder="名前を入力"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              size="sm"
            />
            <HStack>
              <Button size="sm" onClick={() => {
                if (!newName.trim()) return;
                const newTeacher: Teacher = {
                  id: Date.now(),
                  name: newName.trim(),
                  possibleSubjects: [],
                  schedules: {},
                  ngStudents: [],
                };
                const updated = [...teachers, newTeacher];
                setTeachers(updated);
                saveUserData({ teachers: updated });
                setNewName("");
                setShowForm(false);
              }}>登録</Button>
              <Button size="sm" onClick={() => {
                setShowForm(false);
                setNewName("");
              }}>
                キャンセル
              </Button>
            </HStack>
          </VStack>
        )}
      </VStack>

      <Box mt={6}>
        <Heading size="sm" mb={2}>先生一覧</Heading>
        <HStack wrap="wrap" spacing={4}>
          {teachers.map(t => (
            <Box
              key={t.id}
              borderWidth="1px"
              borderRadius="md"
              p={2}
              w="200px"
              bg="white"
              boxShadow="sm"
            >
              <Text fontWeight="bold" mb={2} fontSize="sm">{t.name}</Text>
              <HStack spacing={2}>
                <Button size="xs" onClick={() => setSelectedTeacher(t)}>詳細を見る</Button>
                <Button size="xs" colorScheme="red" onClick={() => {
                  if (!window.confirm("本当に削除しますか？")) return;
                  const updated = teachers.filter(x => x.id !== t.id);
                  setTeachers(updated);
                  saveUserData({ teachers: updated });
                }}>削除</Button>
              </HStack>
            </Box>
          ))}
        </HStack>
      </Box>
    </Box>
  );
}
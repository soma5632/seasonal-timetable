import React, { useEffect, useRef, useState } from "react";
import {
  Box, Heading, Text, Button, VStack, HStack, Input, Select,
  Table, Thead, Tbody, Tr, Th, Td
} from "@chakra-ui/react";
import { useUserData } from "../hooks/useUserData";

type ScheduleItem = {
  date: [number, number]; // (month, day)
  time: string;
  tag: "×" | "slash" | "triangle" | "blank";
};

type Teacher = {
  id: number;
  name: string;
  possibleSubjects: string[]; // 授業可能科目
  schedules: { [termId: string]: { [iso: string]: { [slotIdx: number]: string } } };
  ngStudents: string[]; // NG生徒
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
  const [scheduleByDate, setScheduleByDate] = useState<{ [iso: string]: { [slotIdx: number]: string } }>({});

  // ターム一覧（localStorageから読み込む）
  const [terms, setTerms] = useState<{ id: string; name: string; startDate: string; endDate: string; closedSlots?: { [iso: string]: number[] } }[]>([]);

  // 撮影／アップロード画像プレビュー
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // 週ごとのブロック
  const [weekBlocks, setWeekBlocks] = useState<{ dates: { iso: string; label: string; weekdayJa: string }[] }[]>([]);
  const [dateRangeValid, setDateRangeValid] = useState(false);

  // カメラ関連
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraOn, setCameraOn] = useState(false);
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

      // 先生データを更新
      const updated = {
        ...selectedTeacher,
        possibleSubjects: [...selectedTeacher.possibleSubjects, newPossibleSubject],
      };
      const newTeachers = teachers.map(t => (t.id === updated.id ? updated : t));
      setTeachers(newTeachers);
      setSelectedTeacher(updated);

      // ★ localStorageではなく saveUserData() を呼ぶ
      saveUserData({ teachers: newTeachers });

      // 入力欄をクリア
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

      // ★ localStorageではなく saveUserData()
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

      // ★ localStorageではなく saveUserData()
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

      // ★ localStorageではなく saveUserData()
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

    const empty: { [iso: string]: { [slotIdx: number]: string } } = {};
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
    const updated = {
      ...selectedTeacher,
      schedules: { ...selectedTeacher.schedules, [selectedTermId]: scheduleByDate }
    };
    const newTeachers = teachers.map(t => (t.id === updated.id ? updated : t));
    setTeachers(newTeachers);
    setSelectedTeacher(updated);

    saveUserData({ teachers: newTeachers });
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  // ---- Render ----
  if (selectedTeacher) {
    return (
      <Box p={4}>
        <Heading size="md" mb={2}>
          {selectedTeacher.name} の詳細
        </Heading>

        {/* 授業可能科目 */}
        <Heading size="sm" mt={4}>授業可能科目</Heading>
        <VStack align="start" spacing={2} mt={2}>
          {selectedTeacher.possibleSubjects.map((sub, idx) => (
            <HStack key={idx}>
              <Text fontSize="sm">{sub}</Text>
              <Button size="xs" onClick={() => removePossibleSubject(idx)}>削除</Button>
            </HStack>
          ))}
          <HStack>
            <Select value={newPossibleSubject} onChange={e => setNewPossibleSubject(e.target.value)} maxW="140px" size="sm">
              <option value="">科目を選択</option>
              {subjectOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </Select>
            <Button size="sm" onClick={addPossibleSubject}>追加</Button>
          </HStack>
        </VStack>

        {/* NG生徒 */}
        <Heading size="sm" mt={6}>NG生徒</Heading>
        <VStack align="start" spacing={2} mt={2}>
          {selectedTeacher.ngStudents.map((s, idx) => (
            <HStack key={idx}>
              <Text fontSize="sm">{s}</Text>
              <Button size="xs" onClick={() => removeNgStudent(idx)}>削除</Button>
            </HStack>
          ))}
          <HStack>
            <Input
              type="text"
              placeholder="生徒名"
              value={newNgStudent}
              onChange={e => setNewNgStudent(e.target.value)}
              maxW="160px"
              size="sm"
            />
            <Button size="sm" onClick={addNgStudent}>追加</Button>
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
          size="sm"
        >
          {terms.map(term => (
            <option key={term.id} value={term.id}>
              {term.name} ({term.startDate}〜{term.endDate})
            </option>
          ))}
        </Select>

        {/* AIスケジュール推定 */}
        {selectedTermId && (
          <Box mt={4}>
            <Heading size="sm" mb={2}>AIでスケジュール推定</Heading>
            <HStack spacing={3}>
              {!cameraOn ? (
                <Button size="sm" onClick={startCamera}>カメラ起動</Button>
              ) : (
                <Button size="sm" onClick={stopCamera}>カメラ停止</Button>
              )}
              <Button size="sm" onClick={captureAndSend} disabled={!cameraOn}>撮影して推定</Button>
              <label>
                <span style={{ padding: "4px 8px", border: "1px solid #ccc", fontSize: "smaller" }}>写真から選択</span>
                <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: "none" }} />
              </label>
            </HStack>
            <video ref={videoRef} autoPlay playsInline style={{ width: 240, background: "#000", marginTop: 8 }} />
            <canvas ref={canvasRef} style={{ display: "none" }} />

            {/* プレビュー画像 */}
            {previewUrl && (
              <Box mt={4}>
                <Heading size="sm" mb={2}>プレビュー</Heading>
                <img src={previewUrl} alt="preview" style={{ width: 200, border: "1px solid #ccc" }} />
              </Box>
            )}
          </Box>
        )}
            {/* 週ごとの縦積みグリッド（月〜土のみ、閉校セル灰色＆編集不可、日付クリックで一括切替） */}
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
                          const style = TAG_STYLE[tag];
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
                              onClick={() => toggleTag(d.iso, slotIdx)}
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
          {/* ★ 一覧に戻るボタンを先生一覧画面へ */}
          <Button size="sm" onClick={() => { setSelectedTeacher(null); onNavigate("teachers"); }}>
            一覧に戻る
          </Button>
        </Box>
      </Box>
    );
  }

  // ---- 一覧＋新規登録フォーム ----
  return (
      <Box p={4}>
        <Heading size="md" mb={4}>先生管理</Heading>

        {/* ホームに戻る＋新規登録ボタンを縦並びに */}
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

        {/* 一覧表示 */}
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
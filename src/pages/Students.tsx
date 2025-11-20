import React, { useEffect, useRef, useState } from "react";
import {
  Box, Heading, Text, Button, VStack, HStack, Input, Select,
  Table, Thead, Tbody, Tr, Th, Td
} from "@chakra-ui/react";

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

  // ターム一覧（localStorageから読み込む）
  const [terms, setTerms] = useState<{ id: string; name: string; startDate: string; endDate: string; closedSlots?: { [iso: string]: number[] } }[]>([]);

  // 撮影／アップロード画像プレビュー
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // 週ごとのブロック
  const [weekBlocks, setWeekBlocks] = useState<{ dates: { iso: string; label: string; weekdayJa: string }[] }[]>([]);
  const [dateRangeValid, setDateRangeValid] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const userData = parsed["user1"];
        if (userData && userData.terms) {
          const termList = Object.entries(userData.terms)
            .filter(([_, v]) => v !== null)
            .map(([id, v]: any) => ({
              id,
              name: v.termName,
              startDate: v.startDate,
              endDate: v.endDate,
              closedSlots: v.closedSlots || {}, // ★ 閉校情報も読み込む
            }));
          setTerms(termList);
        }
        if (userData && userData.students) {
          setStudents(userData.students);
        }
      } catch (e) {
        console.error("データ読み込み失敗:", e);
      }
    }
  }, []);
  // ---- Subjects ----
  const addSubject = () => {
    if (!selectedStudent || !newSubject || newCount === "" || newCount <= 0) return;
    const updated = {
      ...selectedStudent,
      subjects: [...selectedStudent.subjects, { name: newSubject, count: Number(newCount) }],
    };
    const newStudents = students.map(s => (s.id === updated.id ? updated : s));
    setStudents(newStudents);
    setSelectedStudent(updated);

    // 保存
    const raw = localStorage.getItem(STORAGE_KEY);
    const appData = raw ? JSON.parse(raw) : {};
    if (!appData["user1"]) appData["user1"] = { students: [] };
    appData["user1"].students = newStudents;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));

    setNewSubject("");
    setNewCount("");
  };

  const removeSubject = (idx: number) => {
    if (!selectedStudent) return;
    const updated = {
      ...selectedStudent,
      subjects: selectedStudent.subjects.filter((_, i) => i !== idx),
    };
    const newStudents = students.map(s => (s.id === updated.id ? updated : s));
    setStudents(newStudents);
    setSelectedStudent(updated);

    const raw = localStorage.getItem(STORAGE_KEY);
    const appData = raw ? JSON.parse(raw) : {};
    if (!appData["user1"]) appData["user1"] = { students: [] };
    appData["user1"].students = newStudents;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
  };

  // ---- NG Teachers ----
  const addNgTeacher = () => {
    if (!selectedStudent || !newNgTeacher.trim()) return;
    const updated = {
      ...selectedStudent,
      ngTeachers: [...selectedStudent.ngTeachers, newNgTeacher.trim()],
    };
    const newStudents = students.map(s => (s.id === updated.id ? updated : s));
    setStudents(newStudents);
    setSelectedStudent(updated);

    const raw = localStorage.getItem(STORAGE_KEY);
    const appData = raw ? JSON.parse(raw) : {};
    if (!appData["user1"]) appData["user1"] = { students: [] };
    appData["user1"].students = newStudents;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));

    setNewNgTeacher("");
  };

  const removeNgTeacher = (idx: number) => {
    if (!selectedStudent) return;
    const updated = {
      ...selectedStudent,
      ngTeachers: selectedStudent.ngTeachers.filter((_, i) => i !== idx),
    };
    const newStudents = students.map(s => (s.id === updated.id ? updated : s));
    setStudents(newStudents);
    setSelectedStudent(updated);

    const raw = localStorage.getItem(STORAGE_KEY);
    const appData = raw ? JSON.parse(raw) : {};
    if (!appData["user1"]) appData["user1"] = { students: [] };
    appData["user1"].students = newStudents;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
  };

  // ---- Camera ----
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraOn, setCameraOn] = useState(false);

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

  // ---- 生徒削除処理 ----
  const handleDeleteStudent = (id: number) => {
    if (!window.confirm("本当に削除しますか？")) return;
    const updated = students.filter(s => s.id !== id);
    setStudents(updated);

    const raw = localStorage.getItem(STORAGE_KEY);
    const appData = raw ? JSON.parse(raw) : {};
    if (!appData["user1"]) appData["user1"] = { students: [] };
    appData["user1"].students = updated;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
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
    if (!videoRef.current || !canvasRef.current || !selectedStudent || !selectedTermId) return;

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
    formData.append("student_id", String(selectedStudent.id));
    formData.append("term_id", selectedTermId);

    setPreviewUrl(URL.createObjectURL(blob));

    try {
      const res = await fetch("https://api.souma-lab.com/schedule/upload", {
        method: "POST",
        body: formData
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ScheduleItem[] = await res.json();
      applyAISchedule(data);
    } catch (err) {
      console.error("Upload/Inference failed:", err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !selectedStudent || !selectedTermId) return;
    const file = e.target.files[0];

    const formData = new FormData();
    formData.append("file", file);
    formData.append("student_id", String(selectedStudent.id));
    formData.append("term_id", selectedTermId);

    setPreviewUrl(URL.createObjectURL(file));

    try {
      const res = await fetch("https://api.souma-lab.com/schedule/upload", {
        method: "POST",
        body: formData
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ScheduleItem[] = await res.json();
      applyAISchedule(data);
    } catch (err) {
      console.error("Upload/Inference failed:", err);
    }
  };

  // ---- ターム選択時に週ごとブロック生成（月〜土のみ） ----
  useEffect(() => {
    if (!selectedTermId || !selectedStudent) return;

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
        empty[iso][slotIdx] = "×";
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

    const existing = selectedStudent.schedules[selectedTermId];
    setScheduleByDate(existing || empty);
    setWeekBlocks(weeks);
    setDateRangeValid(true);
  }, [selectedTermId, selectedStudent]);

  // ---- セル編集ロジック ----
  const toggleTag = (dateISO: string, slotIdx: number) => {
    setScheduleByDate(prev => {
      const current = prev[dateISO]?.[slotIdx] || "blank";
      const order = ["blank", "×", "triangle"];
      const next = order[(order.indexOf(current) + 1) % order.length];
      return {
        ...prev,
        [dateISO]: { ...(prev[dateISO] || {}), [slotIdx]: next },
      };
    });
  };

  // ---- スケジュール保存 ----
  const saveSchedule = () => {
    if (!selectedStudent || !selectedTermId) return;
    const updated = {
      ...selectedStudent,
      schedules: { ...selectedStudent.schedules, [selectedTermId]: scheduleByDate }
    };
    const newStudents = students.map(s => (s.id === updated.id ? updated : s));
    setStudents(newStudents);
    setSelectedStudent(updated);

    const raw = localStorage.getItem(STORAGE_KEY);
    const appData = raw ? JSON.parse(raw) : {};
    if (!appData["user1"]) appData["user1"] = { students: [] };
    appData["user1"].students = newStudents;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);
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
              <Text fontSize="sm">{sub.name} ({sub.count}回)</Text>
              <Button size="xs" onClick={() => removeSubject(idx)}>削除</Button>
            </HStack>
          ))}
          <HStack>
            <Select value={newSubject} onChange={e => setNewSubject(e.target.value)} maxW="140px" size="sm">
              <option value="">科目を選択</option>
              {subjectOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </Select>
            <Input
              type="number"
              placeholder="回数"
              value={newCount}
              onChange={e => setNewCount(e.target.value === "" ? "" : Number(e.target.value))}
              maxW="80px"
              size="sm"
            />
            <Button size="sm" onClick={addSubject}>追加</Button>
          </HStack>
        </VStack>

        {/* NG講師 */}
        <Heading size="sm" mt={6}>NG講師</Heading>
        <VStack align="start" spacing={2} mt={2}>
          {selectedStudent.ngTeachers.map((t, idx) => (
            <HStack key={idx}>
              <Text fontSize="sm">{t}</Text>
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
              size="sm"
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

        {/* 週ごとの縦積みグリッド（月〜土のみ） */}
        {dateRangeValid && weekBlocks.length > 0 && (
          <VStack align="stretch" spacing={4} mt={4}>
            {weekBlocks.map((block, blockIdx) => (
              <Box key={blockIdx} borderWidth="1px" borderRadius="md" overflowX="auto">
                <Table size="xs" variant="simple">
                  <Thead>
                    <Tr>
                      <Th fontSize="xs" p={1}>時限</Th>
                      {block.dates.map(d => (
                        <Th key={d.iso} fontSize="xs" p={1} textAlign="center">
                          {d.label}({d.weekdayJa})
                        </Th>
                      ))}
                    </Tr>
                  </Thead>
                  <Tbody>
                    {timeSlots.map((slotLabel, slotIdx) => (
                      <Tr key={slotIdx}>
                        <Td fontSize="xs" p={1} fontWeight="bold">
                          {slotIdx + 1}限
                        </Td>
                        {block.dates.map(d => {
                          const tag = scheduleByDate[d.iso]?.[slotIdx] || "blank";
                          const style = TAG_STYLE[tag];
                          return (
                            <Td
                              key={d.iso + "-" + slotIdx}
                              fontSize="xs"
                              p={1}
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

        <Button mt={4} colorScheme="blue" size="sm" onClick={saveSchedule}>このタームのスケジュールを保存</Button>

        <Box mt={6}>
          <Button size="sm" onClick={() => { setSelectedStudent(null); onNavigate("home"); }}>一覧に戻る</Button>
        </Box>
      </Box>
    );
  }
  // 一覧＋新規登録フォーム
  return (
    <Box p={4}>
      <Heading size="md" mb={4}>生徒管理</Heading>

      {!showForm ? (
        <Button size="sm" onClick={() => setShowForm(true)}>新規登録</Button>
      ) : (
        <VStack align="start" spacing={3} mt={2} mb={4}>
          <Input
            type="text"
            placeholder="名前を入力"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            size="sm"
          />
          <Select value={newGrade} onChange={e => setNewGrade(e.target.value)} size="sm">
            <option value="">学年を選択</option>
            {gradeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </Select>
          <HStack>
            <Button size="sm" onClick={() => {
              if (!newName.trim() || !newGrade) return;
              const newStudent: Student = {
                id: Date.now(),
                name: newName.trim(),
                grade: newGrade,
                subjects: [],
                schedules: {},
                ngTeachers: [],
              };
              const updated = [...students, newStudent];
              setStudents(updated);

              const raw = localStorage.getItem(STORAGE_KEY);
              const appData = raw ? JSON.parse(raw) : {};
              if (!appData["user1"]) appData["user1"] = { students: [] };
              appData["user1"].students = updated;
              localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));

              setNewName("");
              setNewGrade("");
              setShowForm(false);
            }}>登録</Button>
            <Button size="sm" onClick={() => { setShowForm(false); setNewName(""); setNewGrade(""); }}>キャンセル</Button>
          </HStack>
        </VStack>
      )}

      {/* 学年ごとの一覧表示 */}
      {gradeOptions.map(grade => (
        <Box key={grade} mt={6}>
          <Heading size="sm" mb={2}>{grade}</Heading>
          <HStack wrap="wrap" spacing={4}>
            {students.filter(s => s.grade === grade).map(s => (
              <Box
                key={s.id}
                borderWidth="1px"
                borderRadius="md"
                p={2}
                w="200px"
                bg="white"
                boxShadow="sm"
              >
                <Text fontWeight="bold" mb={2} fontSize="sm">{s.name}（{s.grade}）</Text>
                <HStack spacing={2}>
                  <Button size="xs" onClick={() => setSelectedStudent(s)}>詳細を見る</Button>
                  <Button size="xs" colorScheme="red" onClick={() => handleDeleteStudent(s.id)}>削除</Button>
                </HStack>
              </Box>
            ))}
          </HStack>
        </Box>
      ))}
    </Box>
  );
}
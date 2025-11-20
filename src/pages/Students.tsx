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

const TAG_STYLE: Record<string, { symbol: string; color: string; bg: string }> = {
  "×": { symbol: "×", color: "red.600", bg: "gray.100" },
  "slash": { symbol: "／", color: "blue.600", bg: "gray.100" },
  "triangle": { symbol: "△", color: "orange.600", bg: "gray.100" },
  "blank": { symbol: "", color: "gray.400", bg: "white" },
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
  // ---- AI推定処理 ----
  const normalizeTime = (t: string) => {
    // ハイフンを波ダッシュに統一
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

        let tag: "blank" | "×" | "slash" | "triangle" = "blank";
        if (item.tag === "x" || item.tag === "×") tag = "×";
        else if (item.tag === "slash" || item.tag === "/") tag = "slash";
        else if (item.tag === "triangle" || item.tag === "△") tag = "triangle";

        if (!updated[iso]) updated[iso] = {};
        updated[iso][slotIdx] = tag;
      });

      return updated;
    });
  };

  // ---- ターム選択時に表を生成＆既存データ＋閉校情報を反映 ----
  useEffect(() => {
    if (!selectedTermId || !selectedStudent) return;

    const term = terms.find(t => t.id === selectedTermId);
    if (!term) return;

    const empty: { [iso: string]: { [slotIdx: number]: string } } = {};
    const start = new Date(term.startDate);
    const end = new Date(term.endDate);

    for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
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
    }

    // 既存スケジュールがあればそれを優先
    const existing = selectedStudent.schedules[selectedTermId];
    setScheduleByDate(existing || empty);
  }, [selectedTermId, selectedStudent]);

  // ---- セル編集ロジック ----
  const toggleTag = (dateISO: string, slotIdx: number) => {
    setScheduleByDate(prev => {
      const current = prev[dateISO]?.[slotIdx] || "blank";
      const order = ["blank", "×", "slash", "triangle"];
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

  // コンポーネントがアンマウントされたらカメラ停止
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
              <Text>{sub.name} ({sub.count}回)</Text>
              <Button size="xs" onClick={() => removeSubject(idx)}>削除</Button>
            </HStack>
          ))}
          <HStack>
            <Select value={newSubject} onChange={e => setNewSubject(e.target.value)} maxW="140px">
              <option value="">科目を選択</option>
              {subjectOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </Select>
            <Input
              type="number"
              placeholder="回数"
              value={newCount}
              onChange={e => setNewCount(e.target.value === "" ? "" : Number(e.target.value))}
              maxW="80px"
            />
            <Button size="sm" onClick={addSubject}>追加</Button>
          </HStack>
        </VStack>

        {/* NG講師 */}
        <Heading size="sm" mt={6}>NG講師</Heading>
        <VStack align="start" spacing={2} mt={2}>
          {selectedStudent.ngTeachers.map((t, idx) => (
            <HStack key={idx}>
              <Text>{t}</Text>
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
                <Button onClick={startCamera}>カメラ起動</Button>
              ) : (
                <Button onClick={stopCamera}>カメラ停止</Button>
              )}
              <Button onClick={captureAndSend} disabled={!cameraOn}>撮影して推定</Button>
              <label>
                <span style={{ padding: "6px 12px", border: "1px solid #ccc" }}>写真から選択</span>
                <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: "none" }} />
              </label>
            </HStack>
            <video ref={videoRef} autoPlay playsInline style={{ width: 320, background: "#000", marginTop: 8 }} />
            <canvas ref={canvasRef} style={{ display: "none" }} />
          </Box>
        )}

        {/* スケジュール表 */}
        {selectedTermId && Object.keys(scheduleByDate).length > 0 && (
          <Box mt={6}>
            <Table size="sm" variant="simple">
              <Thead>
                <Tr>
                  <Th>時限</Th>
                  {Object.keys(scheduleByDate).map(dateISO => (
                    <Th key={dateISO} textAlign="center">{dateISO}</Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody>
                {timeSlots.map((slotLabel, slotIdx) => (
                  <Tr key={slotIdx}>
                    <Td fontWeight="bold">{slotIdx + 1}限<br />{slotLabel}</Td>
                    {Object.keys(scheduleByDate).map(dateISO => {
                      const tag = scheduleByDate[dateISO]?.[slotIdx] || "blank";
                      const style = TAG_STYLE[tag];
                      return (
                        <Td
                          key={dateISO + "-" + slotIdx}
                          textAlign="center"
                          cursor="pointer"
                          bg={style.bg}
                          color={style.color}
                          onClick={() => toggleTag(dateISO, slotIdx)}
                        >
                          {style.symbol || "〇"}
                        </Td>
                      );
                    })}
                  </Tr>
                ))}
              </Tbody>
            </Table>
            <Button mt={4} colorScheme="blue" onClick={saveSchedule}>このタームのスケジュールを保存</Button>
          </Box>
        )}

        <Box mt={6}>
          <Button onClick={() => { setSelectedStudent(null); onNavigate("home"); }}>一覧に戻る</Button>
        </Box>
      </Box>
    );
  }

  // 一覧＋新規登録フォーム
  return (
    <Box p={4}>
      <Heading size="md" mb={4}>生徒管理</Heading>

      {!showForm ? (
        <Button onClick={() => setShowForm(true)}>新規登録</Button>
      ) : (
        <VStack align="start" spacing={3} mt={2} mb={4}>
          <Input
            type="text"
            placeholder="名前を入力"
            value={newName}
            onChange={e => setNewName(e.target.value)}
          />
          <Select value={newGrade} onChange={e => setNewGrade(e.target.value)}>
            <option value="">学年を選択</option>
            {gradeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </Select>
          <HStack>
            <Button onClick={() => {
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
            <Button onClick={() => { setShowForm(false); setNewName(""); setNewGrade(""); }}>キャンセル</Button>
          </HStack>
        </VStack>
      )}

      <HStack wrap="wrap" spacing={4} mt={4}>
        {students.map(s => (
          <Box
            key={s.id}
            borderWidth="1px"
            borderRadius="md"
            p={3}
            w="220px"
            bg="white"
            boxShadow="sm"
          >
            <Text fontWeight="bold" mb={2}>{s.name}（{s.grade}）</Text>
            <Button size="sm" onClick={() => setSelectedStudent(s)}>詳細を見る</Button>
          </Box>
        ))}
      </HStack>
    </Box>
  );
}
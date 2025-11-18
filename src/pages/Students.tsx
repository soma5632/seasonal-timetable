import React, { useEffect, useRef, useState } from "react";

// ---- Types ----
type Student = {
  id: number;
  name: string;
  grade: string; // 学年
  subjects: { name: string; count: number }[];
  schedule: ScheduleItem[];
  ngTeachers: string[];
};

type ScheduleItem = {
  date: [number, number]; // 例: [7, 21] → 7月21日
  time: string;           // 例: "10:00-11:30"
  tag: string;            // 例: "x" | "blank" | "triangle"
};

type StudentsProps = {
  onNavigate: React.Dispatch<React.SetStateAction<"home" | "students" | "teachers" | "timetable">>;
};

// ---- Component ----
export default function Students({ onNavigate }: StudentsProps) {
  // 生徒一覧（暫定的にローカルで管理）
  const [students, setStudents] = useState<Student[]>([]);

  // 新規登録フォーム
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newGrade, setNewGrade] = useState("");

  // 詳細表示する生徒
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // 科目＋回数入力用
  const [newSubject, setNewSubject] = useState("");
  const [newCount, setNewCount] = useState(0);

  // NG講師入力用
  const [newNgTeacher, setNewNgTeacher] = useState("");

  // 撮影未or失敗状態
  const [inferenceTried, setInferenceTried] = useState(false);

  // 推定されたスケジュール（バックエンドから取得）
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);

  // カメラ関連
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraOn, setCameraOn] = useState(false);

  // ---- Handlers ----
  const handleAddStudent = () => {
    if (!newName.trim()) return;
    const newStudent: Student = {
      id: Date.now(),
      name: newName.trim(),
      grade: newGrade.trim(),
      subjects: [],
      schedule: [],
      ngTeachers: []
    };
    setStudents(prev => [...prev, newStudent]);
    setNewName("");
    setNewGrade("");
    setShowForm(false);
  };

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student);
    setSchedule(student.schedule || []);
  };

  const handleBackToList = () => {
    onNavigate("home");
    setSelectedStudent(null);
  };

  const addSubject = () => {
    if (!selectedStudent || !newSubject.trim() || newCount <= 0) return;
    const updated = {
      ...selectedStudent,
      subjects: [...selectedStudent.subjects, { name: newSubject.trim(), count: newCount }]
    };
    setStudents(prev => prev.map(s => (s.id === updated.id ? updated : s)));
    setSelectedStudent(updated);
    setNewSubject("");
    setNewCount(0);
  };

  const addNgTeacher = () => {
    if (!selectedStudent || !newNgTeacher.trim()) return;
    const updated = {
      ...selectedStudent,
      ngTeachers: [...selectedStudent.ngTeachers, newNgTeacher.trim()]
    };
    setStudents(prev => prev.map(s => (s.id === updated.id ? updated : s)));
    setSelectedStudent(updated);
    setNewNgTeacher("");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !selectedStudent) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);
    formData.append("student_id", String(selectedStudent.id));

    try {
      const res = await fetch("https://api.souma-lab.com/schedule/upload", {
        method: "POST",
        body: formData
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSchedule(data);
      setInferenceTried(true);
    } catch (err) {
      console.error("Upload/Inference failed:", err);
    }
  };
  // ---- Camera ----
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) videoRef.current.srcObject = stream;
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

  const captureAndSend = async () => {
    if (!videoRef.current || !canvasRef.current || !selectedStudent) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) return;

    const formData = new FormData();
    formData.append("file", blob, "capture.jpg");
    formData.append("student_id", String(selectedStudent.id));

    try {
      const res = await fetch("https://api.souma-lab.com/schedule/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSchedule(data);
      setInferenceTried(true);
    } catch (err) {
      console.error("Upload/Inference failed:", err);
    }
  };

  useEffect(() => () => stopCamera(), []);

  // ---- Render ----
  if (selectedStudent) {
    return (
      <div style={{ padding: 20 }}>
        <h2>{selectedStudent.name}（{selectedStudent.grade}）の詳細</h2>

        {/* 科目＋回数 */}
        <section style={{ marginTop: 16 }}>
          <h3>科目と回数</h3>
          <ul>
            {selectedStudent.subjects.map((sub, idx) => (
              <li key={idx}>{sub.name} ({sub.count}回)</li>
            ))}
          </ul>
          <input type="text" placeholder="科目" value={newSubject} onChange={e => setNewSubject(e.target.value)} />
          <input type="number" placeholder="回数" value={newCount} onChange={e => setNewCount(Number(e.target.value))} />
          <button onClick={addSubject}>追加</button>
        </section>

        {/* NG講師 */}
        <section style={{ marginTop: 16 }}>
          <h3>NG講師</h3>
          <ul>
            {selectedStudent.ngTeachers.map((t, idx) => <li key={idx}>{t}</li>)}
          </ul>
          <input type="text" placeholder="講師名" value={newNgTeacher} onChange={e => setNewNgTeacher(e.target.value)} />
          <button onClick={addNgTeacher}>追加</button>
        </section>

        {/* AIスケジュール推定 */}
        <section style={{ marginTop: 24 }}>
          <h3>AIでスケジュール推定</h3>
          <div style={{ display: "flex", gap: 16 }}>
            <video ref={videoRef} autoPlay playsInline style={{ width: 320, background: "#000" }} />
            <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
              {!cameraOn ? <button onClick={startCamera}>カメラ起動</button> : <button onClick={stopCamera}>カメラ停止</button>}
              <button onClick={captureAndSend} disabled={!cameraOn}>撮影して推定</button>
              <label>
                <span style={{ padding: "6px 12px", border: "1px solid #ccc" }}>写真から選択</span>
                <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: "none" }} />
              </label>
            </div>
          </div>
        </section>

        <section style={{ marginTop: 24 }}>
          <h3>推定スケジュール</h3>
          {!inferenceTried ? (
            <p style={{ color: "#666" }}>まだ推定していません。カメラで撮影するか写真を選択してください。</p>
          ) : schedule.length === 0 ? (
            <p style={{ color: "#c00" }}>推定結果が空でした。もう１度撮影してください。</p>
          ) : (
            <ul style={{ lineHeight: 1.8 }}>
              {schedule.map((item, idx) => (
                <li key={idx}>
                  {item.date[0]}月{item.date[1]}日 {item.time} → {item.tag}
                </li>
              ))}
            </ul>
          )}
        </section>

        <div style={{ marginTop: 24 }}>
          <button onClick={handleBackToList}>一覧に戻る</button>
        </div>
      </div>
    );
  }

  // 一覧＋新規登録フォーム
  return (
    <div style={{ padding: 20 }}>
      <h2>生徒管理</h2>

      {!showForm ? (
        <button onClick={() => setShowForm(true)}>新規登録</button>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8, marginBottom: 16 }}>
          <input
            type="text"
            placeholder="名前を入力"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
          />
          <input
            type="text"
            placeholder="学年を入力"
            value={newGrade}
            onChange={e => setNewGrade(e.target.value)}
            style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleAddStudent}>登録</button>
            <button onClick={() => { setShowForm(false); setNewName(""); setNewGrade(""); }}>キャンセル</button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 16 }}>
        {students.map(s => (
          <div
            key={s.id}
            style={{
              width: 220,
              border: "1px solid #ddd",
              borderRadius: 10,
              padding: 12,
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              background: "#fff"
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 8 }}>
              {s.name}（{s.grade}）
            </div>
            <button onClick={() => handleSelectStudent(s)}>詳細を見る</button>
          </div>
        ))}
      </div>
    </div>
  );
}
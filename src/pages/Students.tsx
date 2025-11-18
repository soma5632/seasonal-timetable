import React, { useEffect, useRef, useState } from "react";

// ---- Types ----
type Student = {
  id: number;
  name: string;
  grade: string;
  subjects: { name: string; count: number }[];
  schedule: ScheduleItem[];
  ngTeachers: string[];
};

type ScheduleItem = {
  date: [number, number];
  time: string;
  tag: string;
};

type StudentsProps = {
  onNavigate: React.Dispatch<React.SetStateAction<"home" | "students" | "teachers" | "timetable">>;
};

const gradeOptions = ["小1","小2","小3","小4","小5","小6","中1","中2","中3","高1","高2","高3"];
const subjectOptions = ["国語","数学","英語","理科","社会"];

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

  const [inferenceTried, setInferenceTried] = useState(false);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraOn, setCameraOn] = useState(false);

  // ---- Handlers ----
  const handleAddStudent = () => {
    if (!newName.trim() || !newGrade) return;
    const newStudent: Student = {
      id: Date.now(),
      name: newName.trim(),
      grade: newGrade,
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
    if (!selectedStudent || !newSubject || newCount === "" || newCount <= 0) return;
    const updated = {
      ...selectedStudent,
      subjects: [...selectedStudent.subjects, { name: newSubject, count: Number(newCount) }]
    };
    setStudents(prev => prev.map(s => (s.id === updated.id ? updated : s)));
    setSelectedStudent(updated);
    setNewSubject("");
    setNewCount("");
  };

  const removeSubject = (idx: number) => {
    if (!selectedStudent) return;
    const updated = {
      ...selectedStudent,
      subjects: selectedStudent.subjects.filter((_, i) => i !== idx)
    };
    setStudents(prev => prev.map(s => (s.id === updated.id ? updated : s)));
    setSelectedStudent(updated);
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

  const removeNgTeacher = (idx: number) => {
    if (!selectedStudent) return;
    const updated = {
      ...selectedStudent,
      ngTeachers: selectedStudent.ngTeachers.filter((_, i) => i !== idx)
    };
    setStudents(prev => prev.map(s => (s.id === updated.id ? updated : s)));
    setSelectedStudent(updated);
  };
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
              <li key={idx}>
                {sub.name} ({sub.count}回)
                <button onClick={() => removeSubject(idx)} style={{ marginLeft: 8 }}>削除</button>
              </li>
            ))}
          </ul>
          <select value={newSubject} onChange={e => setNewSubject(e.target.value)}>
            <option value="">科目を選択</option>
            {subjectOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
          <input
            type="number"
            placeholder="回数"
            value={newCount}
            onChange={e => setNewCount(e.target.value === "" ? "" : Number(e.target.value))}
          />
          <button onClick={addSubject}>追加</button>
        </section>

        {/* NG講師 */}
        <section style={{ marginTop: 16 }}>
          <h3>NG講師</h3>
          <ul>
            {selectedStudent.ngTeachers.map((t, idx) => (
              <li key={idx}>
                {t}
                <button onClick={() => removeNgTeacher(idx)} style={{ marginLeft: 8 }}>削除</button>
              </li>
            ))}
          </ul>
          <input
            type="text"
            placeholder="講師名"
            value={newNgTeacher}
            onChange={e => setNewNgTeacher(e.target.value)}
          />
          <button onClick={addNgTeacher}>追加</button>
        </section>

        {/* AIスケジュール推定（前回のまま） */}
        <section style={{ marginTop: 24 }}>
          <h3>AIでスケジュール推定</h3>
          <div style={{ display: "flex", gap: 16 }}>
            <video ref={videoRef} autoPlay playsInline style={{ width: 320, background: "#000" }} />
            <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
              {!cameraOn ? (
                <button onClick={startCamera}>カメラ起動</button>
              ) : (
                <button onClick={stopCamera}>カメラ停止</button>
              )}
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
          />
          <select value={newGrade} onChange={e => setNewGrade(e.target.value)}>
            <option value="">学年を選択</option>
            {gradeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
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
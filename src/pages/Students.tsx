import React, { useEffect, useRef, useState } from "react";

// ---- Types ----
type Student = { id: number; name: string };

type ScheduleItem = {
  // 例: [7, 21] → 7月21日
  date: [number, number];
  // 例: "10:00-11:30"
  time: string;
  // 例: "x" | "blank" | "triangle" など
  tag: string;
};

type StudentsProps = {
  onNavigate: React.Dispatch<React.SetStateAction<"home" | "students" | "teachers" | "timetable">>;
};


// ---- Component ----
export default function Students({ onNavigate }: StudentsProps) {
  // 生徒一覧（暫定的にローカルで管理、将来はAPIで取得）
  const [students, setStudents] = useState<Student[]>([
    { id: 1, name: "山田太郎" },
    { id: 2, name: "佐藤花子" }
  ]);

  // 新規登録フォームの表示切替と入力値
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");

  // 詳細表示する生徒
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

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
    const newStudent: Student = { id: Date.now(), name: newName.trim() };
    setStudents(prev => [...prev, newStudent]);
    setNewName("");
    setShowForm(false);
  };

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student);
    setSchedule([]); // 詳細に入るたびにクリア
  };

  const handleBackToList = () => {
    // 一覧に戻るだけなら setSelectedStudent(null) でもいいけど、
    // ページ遷移を App.tsx 側で管理しているなら onNavigate を呼ぶ
    onNavigate("home");
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
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        setSchedule(data);
        setInferenceTried(true);   // ← ここで更新
      } catch (err) {
        console.error("Upload/Inference failed:", err);
      }
  };

  // ---- Camera ----
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
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

  const captureAndSend = async () => {
    if (!videoRef.current || !canvasRef.current || !selectedStudent) return;

    // Canvasに現在のビデオフレームを描画
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Canvasサイズを動画に合わせる（固定サイズでもOK）
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) return;

    const formData = new FormData();
    formData.append("file", blob, "capture.jpg");
    formData.append("student_id", String(selectedStudent.id));

    try {
      const res = await fetch("https://api.souma-lab.com/schedule/upload", {
          method: "POST",
          body: formData
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      // 期待するJSON構造に合わせて型を調整（ここでは ScheduleItem[] を想定）
      setSchedule(data);
      setInferenceTried(true);
    } catch (err) {
      console.error("Upload/Inference failed:", err);
    }
  };

  // 詳細画面でアンマウント時にカメラ停止
  useEffect(() => {
    return () => stopCamera();
  }, []);

  // ---- Render ----
  if (selectedStudent) {
    return (
      <div style={{ padding: 20 }}>
        <h2>{selectedStudent.name} の詳細</h2>

        <section style={{ marginTop: 16 }}>
          <h3>AIでスケジュール推定</h3>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginTop: 8 }}>
            <div>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                style={{
                  width: 320,
                  aspectRatio: "1 / 1.4142",
                  background: "#000",
                  borderRadius: 8,
                  objectFit: "cover"
                }}
              />,
              <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                  {!cameraOn ? (
                    <button onClick={startCamera}>カメラ起動</button>
                  ) : (
                    <button onClick={stopCamera}>カメラ停止</button>
                  )}
                  <button onClick={captureAndSend} disabled={!cameraOn}>
                    撮影して推定
                  </button>

                  {/* 写真から選択ボタン */}
                  <label style={{ cursor: "pointer" }}>
                    <span style={{ padding: "6px 12px", border: "1px solid #ccc", borderRadius: 6 }}>
                      写真から選択
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      style={{ display: "none" }}
                    />
                  </label>
              </div>
            </div>

            {/* Canvasは非表示でもOK（デバッグ時は表示） */}
            <canvas
              ref={canvasRef}
              style={{ display: "none" }}
              width={320}
              height={453} // 320 × √2 ≈ 453
            />

          </div>
        </section>

        <section style={{ marginTop: 24 }}>
          <h3>推定スケジュール</h3>
          {!inferenceTried ? (
            <p style={{ color: "#666" }}>
              まだ推定していません。カメラで撮影するか写真を選択してください。
            </p>
          ) : schedule.length === 0 ? (
            <p style={{ color: "#c00" }}>
              推定結果が空でした。もう１度撮影してください。
            </p>
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

  // 一覧＋新規登録フォーム（同一ページ）
  return (
    <div style={{ padding: 20 }}>
      <h2>生徒管理</h2>

      {/* 新規登録トグル */}
      {!showForm ? (
        <button onClick={() => setShowForm(true)}>新規登録</button>
      ) : (
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, marginBottom: 16 }}>
          <input
            type="text"
            placeholder="名前を入力"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
          />
          <button onClick={handleAddStudent}>登録</button>
          <button onClick={() => { setShowForm(false); setNewName(""); }}>キャンセル</button>
        </div>
      )}

      {/* 生徒一覧（カード形式） */}
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
            <div style={{ fontWeight: 600, marginBottom: 8 }}>{s.name}</div>
            <button onClick={() => handleSelectStudent(s)}>詳細を見る</button>
          </div>
        ))}
      </div>
    </div>
  );
}
import React from "react";
import { Lesson } from "../pages/TimetableManager";

type Props = {
  studentName: string;
  lessons: Lesson[];
};

export default function StudentSchedule({ studentName, lessons }: Props) {
  // この生徒の授業だけを抽出
  const myLessons = lessons.filter((l) =>
    l.students.some((s) => s.name === studentName)
  );

  return (
    <div>
      <h2>{studentName} さんの時間割</h2>
      <table className="schedule-table">
        <thead>
          <tr>
            <th>日付</th>
            <th>時間</th>
            <th>科目</th>
            <th>先生</th>
          </tr>
        </thead>
        <tbody>
          {myLessons.map((l) => (
            <tr key={l.id}>
              <td>{l.id.split("-")[0]}</td>
              <td>{l.startTime}〜{l.endTime}</td>
              <td>{l.students.find((s) => s.name === studentName)?.subject}</td>
              <td>{l.teacherId}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <button onClick={() => window.print()}>印刷</button>

      <style>{`
        @media print {
          button { display: none; }
        }
        .schedule-table {
          border-collapse: collapse;
          width: 100%;
        }
        th, td {
          border: 1px solid #ccc;
          padding: 4px;
          font-size: 0.9rem;
        }
        th {
          background: #f5f5f5;
        }
      `}</style>
    </div>
  );
}
import React from "react";
import dayjs from "dayjs";
import "dayjs/locale/ja";

dayjs.locale("ja");

type Lesson = {
  id: string;
  startTime: string;
  endTime: string;
  subject: string;
  teacherId: string; // 名前をそのまま保存してもOK
  studentId: string; // 使わないなら空文字でもOK
  boothIndex: number;
  students?: { name: string; subject: string }[];
};

type Schedule = {
  date: string;
  isClosed?: boolean;
  lessons: Lesson[];
};

type Props = {
  baseDate: string;
  teachers: { id: string; name: string }[];
  students: { id: string; name: string }[];
  schedules: Schedule[];
  onEdit?: (date: string, slotIndex: number, boothIndex: number) => void;
};

const WeeklySchedule: React.FC<Props> = ({ baseDate, schedules, onEdit }) => {
  const startOfWeek = dayjs(baseDate).startOf("week").add(1, "day");
  const daysToShow = Array.from({ length: 6 }, (_, i) => startOfWeek.add(i, "day"));

  const slotStarts = [
    "10:00",
    "11:10",
    "13:20",
    "14:30",
    "15:40",
    "16:05",
    "17:10",
    "18:15",
    "19:20",
    "20:30",
  ];

  if (!schedules || schedules.length === 0) {
    return <p>データがありません</p>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table className="schedule-table">
        <thead>
          <tr>
            {daysToShow.map((day) => (
              <th key={day.format("YYYY-MM-DD")}>{day.format("MM/DD（dd）")}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slotStarts.map((slotStart, slotIndex) => (
            <tr key={`row-${slotStart}`}>
              {daysToShow.map((day) => {
                const dateStr = day.format("YYYY-MM-DD");
                const schedule = schedules.find((s) => s.date === dateStr);

                if (!schedule || schedule.isClosed) {
                  return (
                    <td key={`${dateStr}-${slotStart}`} className="closed-cell">
                      休校
                    </td>
                  );
                }

                const lessonsAtSlot = schedule.lessons.filter((l) => l.startTime === slotStart);

                return (
                  <td key={`${dateStr}-${slotStart}`}>
                    {lessonsAtSlot.map((lesson, idx) => {
                      const studentNames =
                        lesson.students && lesson.students.length > 0
                          ? lesson.students.map((s) => s.name).join("・")
                          : "";

                      const subjects =
                        lesson.students && lesson.students.length > 0
                          ? lesson.students.map((s) => s.subject).join("・")
                          : lesson.subject;

                      return (
                        <div
                          key={`${lesson.id}-${slotIndex}-${lesson.boothIndex}-${idx}`}
                          className="lesson-cell"
                          style={{ cursor: "pointer" }}
                          onClick={() => {
                            if (onEdit) onEdit(dateStr, slotIndex, lesson.boothIndex);
                          }}
                        >
                          <strong>{lesson.startTime}</strong>{" "}
                          {studentNames}（{lesson.teacherId}）
                          <br />
                          <span className="subject">{subjects}</span>
                        </div>
                      );
                    })}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <style>{`
        .schedule-table {
          table-layout: fixed;
          width: 100%;
          border-collapse: collapse;
        }
        th, td {
          border: 1px solid #ccc;
          width: calc(100% / 6);
          vertical-align: top;
          padding: 4px;
          font-size: 0.85rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        th {
          background: #f5f5f5;
          position: sticky;
          top: 0;
          z-index: 1;
        }
        .lesson-cell {
          background: #e8f4ff;
          margin-bottom: 2px;
          padding: 2px 4px;
          border-radius: 4px;
        }
        .subject {
          font-size: 0.75rem;
          color: #555;
        }
        .closed-cell {
          background: #fce4e4;
          color: #a33;
          text-align: center;
        }
      `}</style>
    </div>
  );
};

export default WeeklySchedule;
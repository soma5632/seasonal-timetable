import React from "react";
import dayjs from "dayjs";
import "dayjs/locale/ja";

dayjs.locale("ja");

type Lesson = {
  id: string;
  startTime: string;
  endTime: string;
  subject: string;
  teacherId: string;
  studentId: string;
  boothIndex: number;
};

type Schedule = {
  date: string;
  isClosed?: boolean;
  lessons: Lesson[];
};

type Teacher = { id: string; name: string };
type Student = { id: string; name: string };

type Props = {
  baseDate: string;
  teachers: Teacher[];
  students: Student[];
  schedules: Schedule[];
  onEdit?: (date: string, slotIndex: number, boothIndex: number) => void;
};

const WeeklySchedule: React.FC<Props> = ({ baseDate, teachers, students, schedules, onEdit }) => {
  const startOfWeek = dayjs(baseDate).startOf("week").add(1, "day");
  const daysToShow = Array.from({ length: 6 }, (_, i) => startOfWeek.add(i, "day"));

  const hours = Array.from({ length: 11 }, (_, i) => 10 + i);

  const getTeacherName = (id: string) => teachers.find((t) => t.id === id)?.name || "不明";
  const getStudentName = (id: string) => students.find((s) => s.id === id)?.name || "不明";

  if (!schedules || schedules.length === 0) {
    return <p>データがありません</p>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table className="schedule-table">
        <thead>
          <tr>
            {daysToShow.map((day) => (
              <th key={day.format("YYYY-MM-DD")}>
                {day.format("MM/DD（dd）")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hours.map((hour, slotIndex) => (
            <tr key={hour}>
              {daysToShow.map((day) => {
                const schedule = schedules.find(
                  (s) => s.date === day.format("YYYY-MM-DD")
                );

                if (!schedule || schedule.isClosed) {
                  return (
                    <td
                      key={day.format("YYYY-MM-DD") + hour}
                      className="closed-cell"
                    >
                      休校
                    </td>
                  );
                }

                const lessonsAtHour = schedule.lessons.filter((l) =>
                  l.startTime.startsWith(hour.toString().padStart(2, "0"))
                );

                return (
                  <td key={day.format("YYYY-MM-DD") + hour}>
                    {lessonsAtHour.map((lesson) => (
                      <div
                        key={lesson.id}
                        className="lesson-cell"
                        style={{ cursor: "pointer" }}
                        onClick={() => {
                          if (onEdit) onEdit(day.format("YYYY-MM-DD"), slotIndex, lesson.boothIndex);
                        }}
                      >
                        <strong>{lesson.startTime}</strong>{" "}
                        {getStudentName(lesson.studentId)}（
                        {getTeacherName(lesson.teacherId)}）<br />
                        <span className="subject">{lesson.subject}</span>
                      </div>
                    ))}
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
        th,
        td {
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
        @media (max-width: 768px) {
          th,
          td {
            width: 100%;
            display: block;
          }
          tr {
            display: block;
            margin-bottom: 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default WeeklySchedule;
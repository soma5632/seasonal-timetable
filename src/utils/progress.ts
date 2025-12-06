// =========================
// 型定義
// =========================

export type Student = {
  id: string | number;
  name: string;
  subjects: { name: string; count: number }[];
};

export type FinalLesson = {
  teacherId: string;
  studentIds: string[];
  subject?: string;
  termName?: string;
};

export type Teacher = {
  id: string;
  name: string;
};

// 生徒進捗
export type StudentProgress = {
  [studentId: string]: {
    name: string;
    subjects: {
      [subject: string]: {
        total: number;
        doneTotal: number;
        doneInTerm: number;
        remaining: number;
      };
    };
  };
};

// 先生負荷
export type TeacherLoad = {
  [teacherId: string]: {
    name: string;
    doneTotal: number;
    doneInTerm: number;
  };
};

// =========================
// 生徒の進捗集計
// =========================

export function computeStudentProgress(
  students: Student[],
  finalLessons: FinalLesson[],
  currentTermName: string
): StudentProgress {
  const progress: StudentProgress = {};

  // 初期化
  for (const s of students) {
    progress[String(s.id)] = {
      name: s.name,
      subjects: {},
    };

    for (const subj of s.subjects ?? []) {
      progress[String(s.id)].subjects[subj.name] = {
        total: subj.count,
        doneTotal: 0,
        doneInTerm: 0,
        remaining: subj.count,
      };
    }
  }

  // 授業を集計
  for (const lesson of finalLessons) {
    const sid = lesson.studentIds?.[0];
    if (!sid) continue;

    const subject = lesson.subject ?? "";
    if (!progress[sid]) continue;
    if (!progress[sid].subjects[subject]) continue;

    progress[sid].subjects[subject].doneTotal += 1;

    if (lesson.termName === currentTermName) {
      progress[sid].subjects[subject].doneInTerm += 1;
    }
  }

  // 残り回数
  for (const sid of Object.keys(progress)) {
    for (const subject of Object.keys(progress[sid].subjects)) {
      const p = progress[sid].subjects[subject];
      p.remaining = p.total - p.doneTotal;
    }
  }

  return progress;
}

// =========================
// 先生の負荷集計
// =========================

export function computeTeacherLoad(
  teachers: Teacher[],
  finalLessons: FinalLesson[],
  currentTermName: string
): TeacherLoad {
  const load: TeacherLoad = {};

  // 初期化
  for (const t of teachers) {
    load[t.id] = {
      name: t.name,
      doneTotal: 0,
      doneInTerm: 0,
    };
  }

  // 授業を集計
  for (const lesson of finalLessons) {
    const tid = lesson.teacherId;
    if (!load[tid]) continue;

    load[tid].doneTotal += 1;

    if (lesson.termName === currentTermName) {
      load[tid].doneInTerm += 1;
    }
  }

  return load;
}
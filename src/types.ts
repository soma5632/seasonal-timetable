export type Student = {
  id: number;
  name: string;
  grade: string;
  subjects: { name: string; count: number }[];
  schedules: { [termId: string]: { [iso: string]: { [slotIdx: number]: string } } };
  ngTeachers: string[];
};

export type Teacher = {
  id: number;
  name: string;
  possibleSubjects: string[];
  schedules: { [termId: string]: { [iso: string]: { [slotIdx: number]: any } } };
  ngStudents: string[];
};

export type Term = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  closedSlots?: { [iso: string]: number[] };
};
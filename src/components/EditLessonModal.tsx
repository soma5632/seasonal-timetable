import { useState, useEffect } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Input,
  Select,
  VStack,
  HStack,
  Text,
  IconButton,
  Tooltip,
} from "@chakra-ui/react";
import { Lesson, StudentSubject } from "../pages/TimetableManager";
import { EditIcon } from "@chakra-ui/icons";

const subjects = ["数学", "国語", "英語", "社会", "理科"];

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (lesson: Lesson) => void;
  initialData: Lesson | null;
  teacherOptions?: string[];
  studentOptions?: string[];
};

export default function EditLessonModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  teacherOptions = [],
  studentOptions = [],
}: Props) {
  const [teacherMode, setTeacherMode] = useState<"select" | "input">("select");
  const [teacher, setTeacher] = useState("");
  const [students, setStudents] = useState<
    { name: string; subject: string; mode: "select" | "input" }[]
  >([{ name: "", subject: subjects[0], mode: "select" }]);

  useEffect(() => {
    if (initialData) {
      setTeacher(initialData.teacher || "");
      setTeacherMode(
        teacherOptions.includes(initialData.teacher) ? "select" : "input"
      );
      const mapped = (initialData.students.length > 0
        ? initialData.students
        : [{ name: "", subject: subjects[0] }]
      ).map((s) => ({
        name: s.name,
        subject: s.subject,
        mode: (studentOptions.includes(s.name) ? "select" : "input") as
          | "select"
          | "input",
      }));
      setStudents(mapped);
    } else {
      setTeacher("");
      setTeacherMode("select");
      setStudents([{ name: "", subject: subjects[0], mode: "select" }]);
    }
  }, [initialData, isOpen, teacherOptions, studentOptions]);

  const setStudentField = (
    index: number,
    field: "name" | "subject" | "mode",
    value: string
  ) => {
    const updated = [...students];
    if (field === "mode") {
      updated[index][field] = value as "select" | "input";
    } else {
      updated[index][field] = value;
    }
    setStudents(updated);
  };

  const addStudent = () => {
    if (students.length < 2) {
      setStudents([
        ...students,
        { name: "", subject: subjects[0], mode: "select" },
      ]);
    }
  };

  const removeStudent = (index: number) => {
    const updated = [...students];
    updated.splice(index, 1);
    setStudents(updated);
  };

  const handleSave = () => {
    const payload: Lesson = {
      teacher,
      students: students.map(({ name, subject }) => ({ name, subject })),
    };
    onSave(payload);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>授業編集</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Text fontWeight="bold">先生</Text>
            <HStack>
              {teacherMode === "select" ? (
                <Select
                  placeholder="先生を選択"
                  value={teacherOptions.includes(teacher) ? teacher : ""}
                  onChange={(e) => setTeacher(e.target.value)}
                >
                  {teacherOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  placeholder="先生の名前を入力"
                  value={teacher}
                  onChange={(e) => setTeacher(e.target.value)}
                />
              )}
              <Tooltip
                label={
                  teacherMode === "select" ? "手入力に切替" : "プルダウンに切替"
                }
              >
                <IconButton
                  aria-label="toggle-teacher-mode"
                  icon={<EditIcon />}
                  onClick={() =>
                    setTeacherMode(
                      teacherMode === "select" ? "input" : "select"
                    )
                  }
                />
              </Tooltip>
            </HStack>

            <Text fontWeight="bold">生徒</Text>
            {students.map((s, idx) => (
              <VStack key={idx} spacing={2} align="stretch">
                <HStack>
                  {s.mode === "select" ? (
                    <Select
                      placeholder="生徒を選択"
                      value={studentOptions.includes(s.name) ? s.name : ""}
                      onChange={(e) =>
                        setStudentField(idx, "name", e.target.value)
                      }
                    >
                      {studentOptions.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      placeholder={`生徒${idx + 1}の名前`}
                      value={s.name}
                      onChange={(e) =>
                        setStudentField(idx, "name", e.target.value)
                      }
                    />
                  )}
                  <Tooltip
                    label={
                      s.mode === "select" ? "手入力に切替" : "プルダウンに切替"
                    }
                  >
                    <IconButton
                      aria-label={`toggle-student-${idx}-mode`}
                      icon={<EditIcon />}
                      onClick={() =>
                        setStudentField(
                          idx,
                          "mode",
                          s.mode === "select" ? "input" : "select"
                        )
                      }
                    />
                  </Tooltip>
                </HStack>
                <Select
                  value={s.subject}
                  onChange={(e) =>
                    setStudentField(idx, "subject", e.target.value)
                  }
                >
                  {subjects.map((subj) => (
                    <option key={subj} value={subj}>
                      {subj}
                    </option>
                  ))}
                </Select>
                {students.length > 1 && (
                  <Button
                    size="sm"
                    colorScheme="red"
                    variant="outline"
                    onClick={() => removeStudent(idx)}
                  >
                    生徒{idx + 1}を削除
                  </Button>
                )}
              </VStack>
            ))}
            {students.length < 2 && (
              <Button size="sm" onClick={addStudent}>
                生徒を追加
              </Button>
            )}
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button colorScheme="blue" mr={3} onClick={handleSave}>
            保存
          </Button>
          <Button variant="ghost" onClick={onClose}>
            キャンセル
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
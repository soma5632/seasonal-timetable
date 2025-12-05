import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  VStack,
  HStack,
} from "@chakra-ui/react";
import { useState } from "react";
import { Lesson } from "../pages/TimetableManager";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (lesson: Lesson) => void;

  teacherOptions?: { id: string; name: string }[];
  studentOptions?: { id: string; name: string }[];

  initialData?: Lesson | null;
};

export default function EditLessonModal({
  isOpen,
  onClose,
  onSave,
  teacherOptions = [],
  studentOptions = [],
  initialData,
}: Props) {
  const [teacherId, setTeacherId] = useState(initialData?.teacherId ?? "");
  const [studentId, setStudentId] = useState(initialData?.studentId ?? "");
  const [subject, setSubject] = useState(initialData?.subject ?? "");

  // 生徒複数（students[]）は TimetableManager 側で扱うので
  // モーダルでは単一 studentId のみ編集
  const handleSave = () => {
    if (!initialData) return;

    const updated: Lesson = {
      ...initialData,
      teacherId,
      studentId,
      subject,
      students: [
        {
          name: studentId, // ✅ 名前は TimetableManager 側で map される
          subject,
        },
      ],
      subjects: [subject],
    };

    onSave(updated);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>授業を編集</ModalHeader>
        <ModalBody>
          <VStack spacing={4} align="stretch">

                      {/* 先生 */}
            <FormControl>
              <FormLabel>先生</FormLabel>
              <Select value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
                  <option value="">未選択</option>
                  {teacherOptions.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
              </Select>
            </FormControl>

            {/* 生徒 */}
            <FormControl>
              <FormLabel>生徒</FormLabel>
              <Select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                  <option value="">未選択</option>
                  {studentOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </Select>
            </FormControl>

            {/* 科目 */}
            <FormControl>
              <FormLabel>科目</FormLabel>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="例: 数学"
              />
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={3}>
            <Button onClick={onClose}>キャンセル</Button>
            <Button colorScheme="blue" onClick={handleSave}>
              保存
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
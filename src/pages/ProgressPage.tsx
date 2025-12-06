import { Box, Heading, VStack, Text, Button, Divider } from "@chakra-ui/react";
import { computeStudentProgress, computeTeacherLoad } from "../utils/progress";
import { useUserData } from "../hooks/useUserData";

type ProgressPageProps = {
  onNavigate: React.Dispatch<
    React.SetStateAction<
      "home" | "students" | "teachers" | "timetable" | "term" | "login" | "signup" | "progress"
    >
  >;
  currentUserId: string;
};

export default function ProgressPage({ onNavigate, currentUserId }: ProgressPageProps) {
  // ✅ userData をここで取得
  const { userData } = useUserData(currentUserId);

  // ✅ 現在のターム名（Home や TimetableManager と同じロジック）
  const currentTermName = userData?.lastSelectedTermName || "";

  // ✅ finalLessons は timetable に保存されているものを使う
  const finalLessons = userData?.timetableFinalLessons ?? [];

  // ✅ 進捗集計
  const studentProgress = computeStudentProgress(
    userData?.students ?? [],
    finalLessons,
    currentTermName
  );

  const teacherLoad = computeTeacherLoad(
    userData?.teachers ?? [],
    finalLessons,
    currentTermName
  );

  return (
    <Box p={4}>
      <Heading size="lg" mb={4}>進捗一覧</Heading>

      <Button size="sm" onClick={() => onNavigate("timetable")} mb={4}>
        時間割に戻る
      </Button>

      {/* 生徒の進捗 */}
      <Heading size="md" mt={4}>生徒の進捗</Heading>
      <Divider my={2} />

      <VStack align="stretch" spacing={4}>
        {Object.entries(studentProgress).map(([sid, data]: any) => (
          <Box key={sid} p={3} borderWidth="1px" borderRadius="md">
            <Text fontWeight="bold">{data.name}</Text>

            {Object.entries(data.subjects).map(([subject, p]: any) => (
              <Text key={subject} fontSize="sm" ml={2}>
                {subject}：{p.total}回中 {p.doneTotal}回消化（残り {p.remaining}）
              </Text>
            ))}
          </Box>
        ))}
      </VStack>

      {/* 先生の負荷 */}
      <Heading size="md" mt={6}>先生の負荷</Heading>
      <Divider my={2} />

      <VStack align="stretch" spacing={4}>
        {Object.entries(teacherLoad).map(([tid, data]: any) => (
          <Box key={tid} p={3} borderWidth="1px" borderRadius="md">
            <Text fontWeight="bold">{data.name}</Text>
            <Text fontSize="sm" ml={2}>
              今ターム：{data.doneInTerm}コマ / 累積：{data.doneTotal}コマ
            </Text>
          </Box>
        ))}
      </VStack>
    </Box>
  );
}
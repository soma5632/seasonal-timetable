import {
  Box,
  Heading,
  Text,
  VStack,
  Button,
  useBreakpointValue,
} from '@chakra-ui/react';

type Props = {
  onNavigate: (page: 'home' | 'students' | 'teachers' | 'timetable') => void;
};

export default function Home({ onNavigate }: Props) {
  const buttonSize = useBreakpointValue({ base: 'md', md: 'lg' });

  return (
    <Box maxW="480px" mx="auto" px={4} py={8} textAlign="center">
      <Heading size="lg" mb={4}>季節講習スケジューラー</Heading>
      <Text fontSize="md" mb={6}>
        情報を入力→自動で時間割の候補を出力します。
      </Text>

      <VStack spacing={4}>
        <Button
          size={buttonSize}
          colorScheme="orange"
          width="100%"
          onClick={() => onNavigate('timetable')}
        >
          ① 時間割管理
        </Button>
        <Button
          size={buttonSize}
          colorScheme="blue"
          width="100%"
          onClick={() => onNavigate('students')}
        >
          ② 生徒情報入力
        </Button>
        <Button
          size={buttonSize}
          colorScheme="purple"
          width="100%"
          onClick={() => onNavigate('teachers')}
        >
          ③ 先生情報入力
        </Button>
      </VStack>
    </Box>
  );
}
import {
  Box,
  Heading,
  Text,
  VStack,
  Button,
  useBreakpointValue,
  SimpleGrid,
  Card,
  CardHeader,
  CardBody,
} from '@chakra-ui/react';

type Props = {
  onNavigate: (
    page: 'home' | 'students' | 'teachers' | 'timetable' | 'term' | "login"
  ) => void;
};

export default function Home({ onNavigate }: Props) {
  const buttonSize = useBreakpointValue({ base: 'md', md: 'lg' });

  return (
    <Box maxW="640px" mx="auto" px={4} py={8} textAlign="center">
      <Heading size="lg" mb={4}>
        季節講習スケジューラー
      </Heading>
      <Text fontSize="md" mb={6}>
        ①タームを登録 → ②生徒・先生情報を入力 → ③時間割を自動生成 → ④修正・印刷
      </Text>

      {/* カード形式で各機能を表示 */}
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
        <Card
          cursor="pointer"
          onClick={() => onNavigate('term')}
          _hover={{ shadow: 'md' }}
        >
          <CardHeader>
            <Heading size="md">① ターム管理</Heading>
          </CardHeader>
          <CardBody>
            <Text fontSize="sm" color="gray.600">
              タームの期間や開校/閉校を登録します。カード形式で一覧表示されます。
            </Text>
          </CardBody>
        </Card>

        <Card
          cursor="pointer"
          onClick={() => onNavigate('students')}
          _hover={{ shadow: 'md' }}
        >
          <CardHeader>
            <Heading size="md">② 生徒情報入力</Heading>
          </CardHeader>
          <CardBody>
            <Text fontSize="sm" color="gray.600">
              生徒のプロフィールや希望科目、空き時間を登録します。
            </Text>
          </CardBody>
        </Card>

        <Card
          cursor="pointer"
          onClick={() => onNavigate('teachers')}
          _hover={{ shadow: 'md' }}
        >
          <CardHeader>
            <Heading size="md">③ 先生情報入力</Heading>
          </CardHeader>
          <CardBody>
            <Text fontSize="sm" color="gray.600">
              先生の担当科目やスケジュールを登録します。
            </Text>
          </CardBody>
        </Card>

        <Card
          cursor="pointer"
          onClick={() => onNavigate('timetable')}
          _hover={{ shadow: 'md' }}
        >
          <CardHeader>
            <Heading size="md">④ 時間割管理</Heading>
          </CardHeader>
          <CardBody>
            <Text fontSize="sm" color="gray.600">
              タームと生徒・先生情報を基に時間割を生成し、修正や印刷を行います。
            </Text>
          </CardBody>
        </Card>
      </SimpleGrid>
    </Box>
  );
}
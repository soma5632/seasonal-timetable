import { useState } from "react";
import { Box, Heading, Input, Button, Text } from "@chakra-ui/react";

type SignUpProps = {
  onNavigate: React.Dispatch<
    React.SetStateAction<
      "login" | "signup" | "home" | "students" | "teachers" | "timetable" | "term"
    >
  >;
};

export default function SignUp({ onNavigate }: SignUpProps) {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSignUp = () => {
    const trimmedId = userId.trim();
    if (!trimmedId || !password) {
      setError("ユーザIDとパスワードを入力してください");
      return;
    }

    if (localStorage.getItem(`user_${trimmedId}_auth`)) {
      setError("このユーザIDは既に登録されています");
      return;
    }

    localStorage.setItem(`user_${trimmedId}_auth`, JSON.stringify({ password }));
    localStorage.setItem(`user_${trimmedId}`, JSON.stringify({ students: [], teachers: [], terms: {}, timetable: {} }));

    onNavigate("login");
  };

  return (
    <Box p={4}>
      <Heading size="md" mb={4}>サインアップ</Heading>
      <Input placeholder="ユーザID" value={userId} onChange={e => setUserId(e.target.value)} mb={2} />
      <Input type="password" placeholder="パスワード" value={password} onChange={e => setPassword(e.target.value)} mb={2} />
      {error && <Text color="red.500" fontSize="sm">{error}</Text>}
      <Button colorScheme="teal" onClick={handleSignUp}>登録</Button>
      <Button variant="link" mt={2} onClick={() => onNavigate("login")}>ログインへ戻る</Button>
    </Box>
  );
}
import { useState } from "react";
import { Box, Heading, Input, Button, Text } from "@chakra-ui/react";
import { useUserData } from "../hooks/useUserData";

type LoginProps = {
  onLogin: (id: string) => void;
  onNavigate: React.Dispatch<
    React.SetStateAction<
      "login" | "signup" | "home" | "students" | "teachers" | "timetable" | "term" | "progress"
    >
  >;
};

export default function Login({ onLogin, onNavigate }: LoginProps) {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // ★ userId をキーにして userData を取得
  const { userData } = useUserData(userId);

  const handleLogin = () => {
    const trimmedId = userId.trim();
    if (!trimmedId || !password) {
      setError("ユーザIDとパスワードを入力してください");
      return;
    }

    // ★ userData.auth を利用して認証
    if (!userData || !userData.auth) {
      setError("ユーザが存在しません。サインアップしてください。");
      return;
    }

    if (userData.auth.password !== password) {
      setError("パスワードが違います");
      return;
    }

    // ★ 認証成功時 → localStorage に保存
    localStorage.setItem("userId", trimmedId);
    onLogin(trimmedId);
    onNavigate("home");
  };

  return (
    <Box p={4}>
      <Heading size="md" mb={4}>ログイン</Heading>
      <Input
        placeholder="ユーザID"
        value={userId}
        onChange={e => setUserId(e.target.value)}
        mb={2}
      />
      <Input
        type="password"
        placeholder="パスワード"
        value={password}
        onChange={e => setPassword(e.target.value)}
        mb={2}
      />
      {error && <Text color="red.500" fontSize="sm">{error}</Text>}
      <Button colorScheme="teal" onClick={handleLogin}>ログイン</Button>
      <Button variant="link" mt={2} onClick={() => onNavigate("signup")}>
        新規登録はこちら
      </Button>
    </Box>
  );
}
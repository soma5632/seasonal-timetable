import { useState } from "react";
import { Box, Heading, Input, Button, Text } from "@chakra-ui/react";
import { useUserData } from "../hooks/useUserData";

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

  // ★ userId をキーにして保存用フックを利用
  const { userData, saveUserData } = useUserData(userId);

  const handleSignUp = () => {
    const trimmedId = userId.trim();
    if (!trimmedId || !password) {
      setError("ユーザIDとパスワードを入力してください");
      return;
    }

    // ★ 簡易的な重複チェック（本来はバックエンドで判定）
    if (userData && userData.auth) {
      setError("このユーザIDは既に登録されています");
      return;
    }

    // ★ 初期データを保存
    saveUserData({
      auth: { password },
      students: [],
      teachers: [],
      terms: {},
      timetable: {},
    });

    onNavigate("login");
  };

  return (
    <Box p={4}>
      <Heading size="md" mb={4}>サインアップ</Heading>
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
      <Button colorScheme="teal" onClick={handleSignUp}>登録</Button>
      <Button variant="link" mt={2} onClick={() => onNavigate("login")}>
        ログインへ戻る
      </Button>
    </Box>
  );
}
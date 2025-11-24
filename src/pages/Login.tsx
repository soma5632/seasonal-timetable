import { useState } from "react";
import { Box, Heading, Input, Button } from "@chakra-ui/react";

type LoginProps = {
  onLogin: (id: string) => void;
  onNavigate: React.Dispatch<
    React.SetStateAction<
      "home" | "students" | "teachers" | "timetable" | "term" | "login"
    >
  >;
};

export default function Login({ onLogin, onNavigate }: LoginProps) {
  const [userId, setUserId] = useState("");

  const handleLogin = () => {
    const trimmed = userId.trim();
    if (!trimmed) return;
    localStorage.setItem("currentUserId", trimmed);
    onLogin(trimmed);
    onNavigate("home");
  };

  return (
    <Box p={4}>
      <Heading size="md" mb={4}>ログイン</Heading>
      <Input
        placeholder="ユーザIDを入力"
        value={userId}
        onChange={e => setUserId(e.target.value)}
        size="sm"
        maxW="240px"
        mb={2}
      />
      <Button size="sm" colorScheme="teal" onClick={handleLogin}>
        サインイン
      </Button>
    </Box>
  );
}
import React from "react";
import {
  Box, Input, List, ListItem, Text, VStack
} from "@chakra-ui/react";

type Props = {
  label?: string;
  candidates: string[];
  value: string;                          // ← 追加
  onChange: (text: string) => void;       // ← 追加
  onSelect: (name: string) => void;
};

export default function SearchableNameSelector({
  label,
  candidates,
  value,
  onChange,
  onSelect
}: Props) {
  // 入力値は外部から受け取るので内部 state は不要
  const filtered = candidates.filter(name =>
    name.toLowerCase().includes(value.toLowerCase())
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleSelect = (name: string) => {
    onSelect(name);
    onChange(""); // ← 選択後に入力欄をクリア
  };

  return (
    <VStack align="start" spacing={2}>
      {label && <Text fontSize="sm">{label}</Text>}
      <Input
        placeholder="名前を検索"
        value={value}
        onChange={handleChange}
        size="sm"
      />
      {filtered.length > 0 && (
        <Box borderWidth="1px" borderRadius="md" w="100%" maxH="160px" overflowY="auto">
          <List spacing={1}>
            {filtered.map((name, idx) => (
              <ListItem
                key={idx}
                px={2}
                py={1}
                cursor="pointer"
                _hover={{ bg: "gray.100" }}
                onClick={() => handleSelect(name)}
              >
                {name}
              </ListItem>
            ))}
          </List>
        </Box>
      )}
    </VStack>
  );
}
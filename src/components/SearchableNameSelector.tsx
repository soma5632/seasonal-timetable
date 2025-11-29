import React, { useState } from "react";
import {
  Box, Input, List, ListItem, Text, VStack
} from "@chakra-ui/react";

type Props = {
  label?: string;
  candidates: string[];
  onSelect: (name: string) => void;
};

export default function SearchableNameSelector({ label, candidates, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [filtered, setFiltered] = useState<string[]>(candidates);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    const f = candidates.filter(name => name.toLowerCase().includes(q.toLowerCase()));
    setFiltered(f);
  };

  const handleSelect = (name: string) => {
    setQuery(name);
    setFiltered([]);
    onSelect(name);
  };

  return (
    <VStack align="start" spacing={2}>
      {label && <Text fontSize="sm">{label}</Text>}
      <Input
        placeholder="名前を検索"
        value={query}
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
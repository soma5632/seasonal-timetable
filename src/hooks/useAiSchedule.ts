import { useState } from "react";
import { useToast } from "@chakra-ui/react";

export type AvailabilitySlot = {
  dayOfWeek: number;
  timeSlot: string;
};

export function useAiSchedule(
  existing: AvailabilitySlot[],
  set: (slots: AvailabilitySlot[]) => void
) {
  const toast = useToast();
  const [candidates, setCandidates] = useState<AvailabilitySlot[]>([]);
  const [status, setStatus] = useState<"idle" | "processing" | "ready" | "error">("idle");

  const simulateAiPrediction = async () => {
    setStatus("processing");
    try {
      await new Promise((res) => setTimeout(res, 1000));
      const dummy: AvailabilitySlot[] = [
        { dayOfWeek: 1, timeSlot: "17:10〜18:10" },
        { dayOfWeek: 3, timeSlot: "19:20〜20:20" },
      ];
      setCandidates(dummy);
      setStatus("ready");
      toast({ status: "info", title: "AI推定候補を用意しました" });
    } catch {
      setStatus("error");
      toast({ status: "error", title: "AI推定に失敗しました" });
    }
  };

  const applyCandidates = () => {
    const key = (a: AvailabilitySlot) => `${a.dayOfWeek}-${a.timeSlot}`;
    const existingKeys = new Set(existing.map(key));
    const merged = [...existing, ...candidates.filter((a) => !existingKeys.has(key(a)))];
    set(merged);
    setCandidates([]);
    setStatus("idle");
    toast({ status: "success", title: "AI候補を適用しました" });
  };

  const clearCandidates = () => {
    setCandidates([]);
    setStatus("idle");
  };

  return {
    candidates,
    status,
    simulateAiPrediction,
    applyCandidates,
    clearCandidates,
  };
}
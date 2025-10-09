import { useState } from "react";

export type AvailabilitySlot = {
  dayOfWeek: number;
  timeSlot: string;
};

export function useAiSchedule(
  availability: AvailabilitySlot[],
  setAvailability: React.Dispatch<React.SetStateAction<AvailabilitySlot[]>>
) {
  const [candidates, setCandidates] = useState<AvailabilitySlot[]>([]);
  const [status, setStatus] = useState<"idle" | "ready">("idle");

  // ✅ 引数ありに修正
  const simulateAiPrediction = (blob?: Blob) => {
    console.log("simulateAiPrediction called", blob);

    // 将来的には blob を OCR に渡して解析する処理をここに書く
    // 今はダミーで候補を生成
    const dummy: AvailabilitySlot[] = [
      { dayOfWeek: 1, timeSlot: "10:00〜11:00" },
      { dayOfWeek: 3, timeSlot: "15:40〜16:40" },
    ];
    setCandidates(dummy);
    setStatus("ready");
  };

  const applyCandidates = () => {
    if (candidates.length > 0) {
      setAvailability([...availability, ...candidates]);
      setCandidates([]);
      setStatus("idle");
    }
  };

  const clearCandidates = () => {
    setCandidates([]);
    setStatus("idle");
  };

  return {
    candidates,
    status,
    simulateAiPrediction, // ← blob を受け取れるようになった
    applyCandidates,
    clearCandidates,
  };
}
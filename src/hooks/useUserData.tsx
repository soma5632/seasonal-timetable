import { useEffect, useRef, useState } from "react";

export function useUserData(currentUserId: string) {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  // ユーザデータの取得（userId が空なら呼ばない）
  const loadUserData = async () => {
    // 空の userId の場合は何もしない
    if (!currentUserId || currentUserId.trim() === "") {
      setUserData(null);
      setLoading(false);
      return;
    }

    // 直前のリクエストがあれば中断
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setLoading(true);
      const res = await fetch(
        `https://api.souma-lab.com/userdata/load?userId=${encodeURIComponent(currentUserId)}`,
        { signal: controller.signal }
      );
      const data = await res.json();
      setUserData(data);
    } catch (e: any) {
      if (e.name !== "AbortError") {
        console.error("ユーザデータ取得失敗:", e);
      }
    } finally {
      setLoading(false);
    }
  };

  // ユーザデータの保存（userId が空なら何もしない）
  const saveUserData = async (partialData: any) => {
    if (!currentUserId || currentUserId.trim() === "") {
      console.warn("saveUserData: userId が空のため保存をスキップしました");
      return;
    }
    try {
      const merged = {
        userId: currentUserId,
        ...userData,
        ...partialData,
      };
      await fetch("https://api.souma-lab.com/userdata/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(merged),
      });
      setUserData(merged); // ローカルにも反映
    } catch (e) {
      console.error("ユーザデータ保存失敗:", e);
    }
  };

  useEffect(() => {
    loadUserData();
    // クリーンアップで中断
    return () => abortRef.current?.abort();
  }, [currentUserId]);

  return { userData, loading, saveUserData };
}
import { useEffect, useState } from "react";

export function useUserData(currentUserId: string) {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // ユーザデータの取得
  const loadUserData = async () => {
    try {
      const res = await fetch(`https://api.souma-lab.com/userdata/load?userId=${currentUserId}`);
      const data = await res.json();
      setUserData(data);
    } catch (e) {
      console.error("ユーザデータ取得失敗:", e);
    } finally {
      setLoading(false);
    }
  };

  // ユーザデータの保存
  const saveUserData = async (partialData: any) => {
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
  }, [currentUserId]);

  return { userData, loading, saveUserData };
}
// 资料存取层：localStorage 持久化，数据只保存在本机浏览器。
// 不涉及任何网络请求；所有标本 / 合组 / 待确认申请 / 台账事件均在此读写。

import type { Database } from "../types";
import { seedDatabase } from "../data/seed";

const STORAGE_KEY = "herbarium-ledger-v1";

export function loadDatabase(): Database {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = seedDatabase();
      saveDatabase(seeded);
      return seeded;
    }
    const parsed = JSON.parse(raw) as Database;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.specimens)) {
      throw new Error("数据版本不兼容");
    }
    return parsed;
  } catch {
    const seeded = seedDatabase();
    saveDatabase(seeded);
    return seeded;
  }
}

export function saveDatabase(db: Database): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

export function clearDatabase(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}

export function exportDatabase(db: Database): void {
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `采集号分合台账-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

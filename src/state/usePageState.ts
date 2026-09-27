// 页面状态层：只描述"当前看到什么"，不持久化、不碰标本资料。
// 资料存取见 storage/，分合数据见 state/useLedger，本文件只管视图。

import { useCallback, useMemo, useState } from "react";
import type { MergeEvaluation } from "../types";

export type View =
  | { kind: "home" }
  | { kind: "specimen"; id: string }
  | { kind: "group"; id: string };

export type ToastTone = "ok" | "warn" | "error";
export interface Toast {
  id: number;
  tone: ToastTone;
  text: string;
}

export const IDENTIFY_FILTERS = ["全部", "待压制", "待鉴定", "已鉴定", "存疑", "已入库"] as const;
export type IdentifyFilter = (typeof IDENTIFY_FILTERS)[number];

export function usePageState() {
  const [view, setView] = useState<View>({ kind: "home" });
  const [filter, setFilter] = useState<IdentifyFilter>("全部");
  const [keyword, setKeyword] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // 合并工作区的即时评估结果（仅视图）
  const [evaluation, setEvaluation] = useState<MergeEvaluation | null>(null);
  const [showMergePanel, setShowMergePanel] = useState(false);

  const pushToast = useCallback((text: string, tone: ToastTone = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, tone, text }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const clearSelection = useCallback(() => setSelected([]), []);

  const openSpecimen = useCallback((id: string) => setView({ kind: "specimen", id }), []);
  const openGroup = useCallback((id: string) => setView({ kind: "group", id }), []);
  const goHome = useCallback(() => setView({ kind: "home" }), []);

  const selectionKey = useMemo(() => [...selected].sort().join(","), [selected]);

  return {
    view, setView,
    filter, setFilter,
    keyword, setKeyword,
    selected, setSelected, toggleSelect, clearSelection, selectionKey,
    toasts, pushToast,
    evaluation, setEvaluation,
    showMergePanel, setShowMergePanel,
    openSpecimen, openGroup, goHome,
  };
}

export type PageState = ReturnType<typeof usePageState>;

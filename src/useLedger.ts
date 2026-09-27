// 页面状态层：视图/筛选/选中态归 reducer，标本数据动作归 hook；
// 规则判定委托 rules.ts，持久化委托 storage.ts。
import { useEffect, useMemo, useReducer, useState } from "react";
import type {
  CompareField,
  GroupStatus,
  LedgerData,
  LedgerEntry,
  MergeGroup,
  Specimen,
} from "./types";
import { decideMerge, describeDiff, groupOf, pickCandidates } from "./rules";
import { buildSeed, loadData, saveData, uid } from "./storage";

export type View = "queue" | "merge" | "ledger";
export type StatusFilter = "全部" | "待鉴定" | "已鉴定" | "存疑" | "已上柜";

export interface UiState {
  view: View;
  detailGuid: string | null;
  /** 记录进入详情前的视图，返回时还原 */
  returnView: View;
  statusFilter: StatusFilter;
  localityFilter: string | null;
  pick: { species: string; locality: string; date: string };
  selected: string[];
  primaryId: string;
  notice: string | null;
}

type UiAction =
  | { type: "view"; view: View }
  | { type: "open-detail"; guid: string }
  | { type: "close-detail" }
  | { type: "filter"; filter: StatusFilter }
  | { type: "locality"; locality: string | null }
  | { type: "pick"; field: CompareField; value: string }
  | { type: "toggle"; guid: string }
  | { type: "select"; guids: string[] }
  | { type: "primary"; guid: string }
  | { type: "notice"; text: string | null }
  | { type: "reset-selection" };

const initialUi: UiState = {
  view: "queue",
  detailGuid: null,
  returnView: "queue",
  statusFilter: "全部",
  localityFilter: null,
  pick: { species: "", locality: "", date: "" },
  selected: [],
  primaryId: "",
  notice: null,
};

function uiReducer(state: UiState, action: UiAction): UiState {
  switch (action.type) {
    case "view":
      return { ...state, view: action.view, detailGuid: null, notice: null };
    case "open-detail":
      return {
        ...state,
        detailGuid: action.guid,
        returnView: state.detailGuid ? state.returnView : state.view,
        notice: null,
      };
    case "close-detail":
      return { ...state, detailGuid: null, view: state.returnView };
    case "filter":
      return { ...state, statusFilter: action.filter };
    case "locality":
      return { ...state, localityFilter: action.locality };
    case "pick":
      return { ...state, pick: { ...state.pick, [action.field]: action.value } };
    case "toggle": {
      const has = state.selected.includes(action.guid);
      const selected = has
        ? state.selected.filter((g) => g !== action.guid)
        : [...state.selected, action.guid];
      const primaryId =
        state.primaryId && selected.includes(state.primaryId)
          ? state.primaryId
          : selected[0] ?? "";
      return { ...state, selected, primaryId };
    }
    case "select": {
      const primaryId =
        state.primaryId && action.guids.includes(state.primaryId)
          ? state.primaryId
          : action.guids[0] ?? "";
      return { ...state, selected: action.guids, primaryId };
    }
    case "primary":
      return { ...state, primaryId: action.guid };
    case "notice":
      return { ...state, notice: action.text };
    case "reset-selection":
      return { ...state, selected: [], primaryId: "", pick: { species: "", locality: "", date: "" } };
    default:
      return state;
  }
}

const now = () =>
  new Date().toLocaleString("zh-CN", { hour12: false }).replace(/\//g, "-");

export interface LedgerActions {
  attemptMerge: () => void;
  confirmPending: (groupId: string) => void;
  cancelPending: (groupId: string) => void;
  splitGroup: (groupId: string) => void;
  setPrimary: (groupId: string, guid: string) => void;
  updateSpecimen: (guid: string, patch: Partial<Specimen>) => void;
  addNote: (guid: string, text: string) => void;
  addSpecimen: (draft: Omit<Specimen, "guid" | "shelfRecords" | "notes" | "shelved">) => void;
  resetAll: () => void;
}

export function useLedger() {
  const [data, setData] = useState<LedgerData>(() => loadData() ?? buildSeed());
  const [ui, dispatch] = useReducer(uiReducer, initialUi);

  // 数据留本机：任何变更即写回 localStorage，重开仍有分合记录
  useEffect(() => {
    saveData(data);
  }, [data]);

  const byGuid = useMemo(
    () => new Map(data.specimens.map((s) => [s.guid, s])),
    [data.specimens]
  );

  const candidates = useMemo(
    () => pickCandidates(data.specimens, data.groups, ui.pick),
    [data.specimens, data.groups, ui.pick]
  );

  const appendLedger = (entry: Omit<LedgerEntry, "id" | "at">): LedgerEntry => ({
    ...entry,
    id: uid("led"),
    at: now(),
  });

  const actions: LedgerActions = {
    /** 合并检查：三项一致直接合并；日期或地点（含物种）不符停在待确认 */
    attemptMerge() {
      const members = ui.selected
        .map((g) => byGuid.get(g))
        .filter((s): s is Specimen => Boolean(s));
      if (members.length < 2) {
        dispatch({ type: "notice", text: "请至少勾选两份未入组的标本再做合并检查。" });
        return;
      }
      const nos = new Set(members.map((m) => m.collectorNo));
      if (nos.size > 1) {
        dispatch({ type: "notice", text: "所选标本采集号不同，不能并入同一组。" });
        return;
      }
      const primaryId = ui.primaryId && ui.selected.includes(ui.primaryId)
        ? ui.primaryId
        : members[0].guid;
      const collectorNo = members[0].collectorNo;
      const groupId = uid("grp");
      const decision = decideMerge(members);

      if (decision.kind === "auto-merge") {
        const group: MergeGroup = {
          id: groupId,
          collectorNo,
          members: members.map((m) => m.guid),
          primaryId,
          status: "merged",
          diffs: [],
          createdAt: now(),
          mergedAt: now(),
        };
        setData((d) => ({
          ...d,
          groups: [...d.groups, group],
          ledger: [
            ...d.ledger,
            appendLedger({
              action: "merge-confirmed",
              collectorNo,
              groupId,
              members: group.members,
              primaryId,
              detail: `物种、采集地、日期三项一致，直接合并；主档 ${primaryId}，各份馆档号保留。`,
            }),
          ],
        }));
        dispatch({ type: "reset-selection" });
        dispatch({ type: "notice", text: `已合并 ${members.length} 份（${collectorNo}），主档 ${primaryId}。` });
      } else {
        const group: MergeGroup = {
          id: groupId,
          collectorNo,
          members: members.map((m) => m.guid),
          primaryId,
          status: "pending",
          diffs: decision.diffs,
          createdAt: now(),
        };
        const diffText = decision.diffs.map((df) => describeDiff(df, byGuid)).join("；");
        setData((d) => ({
          ...d,
          groups: [...d.groups, group],
          ledger: [
            ...d.ledger,
            appendLedger({
              action: "merge-pending",
              collectorNo,
              groupId,
              members: group.members,
              primaryId,
              diffs: decision.diffs,
              detail: `停在待确认：${diffText}`,
            }),
          ],
        }));
        dispatch({ type: "reset-selection" });
        dispatch({ type: "notice", text: `日期或地点不一致，已停在待确认（${collectorNo}），请逐条核对差异。` });
      }
    },

    /** 待确认 → 人工确认合并 */
    confirmPending(groupId) {
      setData((d) => {
        const group = d.groups.find((g) => g.id === groupId);
        if (!group || group.status !== "pending") return d;
        const merged: MergeGroup = { ...group, status: "merged", mergedAt: now() };
        return {
          ...d,
          groups: d.groups.map((g) => (g.id === groupId ? merged : g)),
          ledger: [
            ...d.ledger,
            appendLedger({
              action: "merge-confirmed",
              collectorNo: group.collectorNo,
              groupId,
              members: group.members,
              primaryId: group.primaryId,
              diffs: group.diffs,
              detail: "差异经人工核对，确认合并；各份馆档号保留。",
            }),
          ],
        };
      });
      dispatch({ type: "notice", text: "待确认组已人工确认合并。" });
    },

    /** 待确认 → 取消合并，各份恢复独立 */
    cancelPending(groupId) {
      setData((d) => {
        const group = d.groups.find((g) => g.id === groupId);
        if (!group) return d;
        return {
          ...d,
          groups: d.groups.filter((g) => g.id !== groupId),
          ledger: [
            ...d.ledger,
            appendLedger({
              action: "merge-canceled",
              collectorNo: group.collectorNo,
              groupId,
              members: group.members,
              diffs: group.diffs,
              detail: "取消合并，各份恢复独立。",
            }),
          ],
        };
      });
      dispatch({ type: "notice", text: "已取消合并，各份恢复独立。" });
    },

    /** 拆开：各份恢复独立；柜位与注记本就在标本上，已上柜记录保留 */
    splitGroup(groupId) {
      setData((d) => {
        const group = d.groups.find((g) => g.id === groupId);
        if (!group || group.status !== "merged") return d;
        return {
          ...d,
          groups: d.groups.filter((g) => g.id !== groupId),
          ledger: [
            ...d.ledger,
            appendLedger({
              action: "split",
              collectorNo: group.collectorNo,
              groupId,
              members: group.members,
              primaryId: group.primaryId,
              detail: "拆开恢复独立；柜位与历史注记跟随原标本，已上柜记录保留。",
            }),
          ],
        };
      });
      dispatch({ type: "notice", text: "已拆开，各份恢复独立，柜位与注记仍随原标本。" });
    },

    /** 更换主档：只改展示主档，不动成员编号 */
    setPrimary(groupId, guid) {
      setData((d) => {
        const group = d.groups.find((g) => g.id === groupId);
        if (!group || !group.members.includes(guid) || group.primaryId === guid) return d;
        return {
          ...d,
          groups: d.groups.map((g) => (g.id === groupId ? { ...g, primaryId: guid } : g)),
          ledger: [
            ...d.ledger,
            appendLedger({
              action: "primary-changed",
              collectorNo: group.collectorNo,
              groupId,
              members: group.members,
              primaryId: guid,
              detail: `主档由 ${group.primaryId} 调整为 ${guid}。`,
            }),
          ],
        };
      });
      dispatch({ type: "notice", text: `主档已调整为 ${guid}。` });
    },

    /** 单份修改：只写这一份，不再覆盖同号整组 */
    updateSpecimen(guid, patch) {
      setData((d) => ({
        ...d,
        specimens: d.specimens.map((s) => {
          if (s.guid !== guid) return s;
          const next = { ...s, ...patch, guid: s.guid };
          // 柜位变化时追加一条已上柜记录，历史记录不丢
          if (patch.cabinet !== undefined && patch.cabinet !== s.cabinet) {
            const wasShelved = s.shelved;
            next.shelved = Boolean(patch.cabinet);
            if (patch.cabinet) {
              const last = s.shelfRecords[s.shelfRecords.length - 1];
              // 同一柜位不重复记，已上柜记录只追加不覆盖
              next.shelfRecords =
                last && last.cabinet === patch.cabinet
                  ? s.shelfRecords
                  : [...s.shelfRecords, { at: now(), cabinet: patch.cabinet }];
            }
            if (wasShelved && !patch.cabinet) {
              next.notes = [
                ...s.notes,
                { at: now(), text: `撤下柜位 ${s.cabinet}，标本转为未上柜。` },
              ];
            }
          }
          return next;
        }),
      }));
    },

    addNote(guid, text) {
      const trimmed = text.trim();
      if (!trimmed) return;
      setData((d) => ({
        ...d,
        specimens: d.specimens.map((s) =>
          s.guid === guid ? { ...s, notes: [...s.notes, { at: now(), text: trimmed }] } : s
        ),
      }));
    },

    addSpecimen(draft) {
      const guid = uid("G");
      const specimen: Specimen = {
        ...draft,
        guid,
        shelved: Boolean(draft.cabinet),
        shelfRecords: draft.cabinet ? [{ at: now(), cabinet: draft.cabinet }] : [],
        notes: [],
      };
      setData((d) => ({ ...d, specimens: [...d.specimens, specimen] }));
      dispatch({ type: "notice", text: `新标本 ${guid}（${draft.collectorNo}）已入库。` });
    },

    resetAll() {
      setData(buildSeed());
      dispatch({ type: "reset-selection" });
      dispatch({ type: "notice", text: "已恢复初始样例数据。" });
    },
  };

  const pendingGroups = data.groups.filter((g) => g.status === "pending");
  const mergedGroups = data.groups.filter((g) => g.status === "merged");

  return {
    data,
    ui,
    dispatch,
    actions,
    byGuid,
    candidates,
    pendingGroups,
    mergedGroups,
    groupOf: (guid: string) => groupOf(data.groups, guid),
  };
}

export type Ledger = ReturnType<typeof useLedger>;
export type { GroupStatus };

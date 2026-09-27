// 整理规则层：分合判定全部集中在这里，纯函数，不碰页面状态与数据存取。
import type {
  CompareField,
  FieldDiff,
  LedgerAction,
  MergeGroup,
  Specimen,
} from "./types";

export const COMPARE_FIELDS: { field: CompareField; label: string }[] = [
  { field: "species", label: "物种名称" },
  { field: "locality", label: "采集地点" },
  { field: "date", label: "采集日期" },
];

export const ACTION_LABELS: Record<LedgerAction, string> = {
  "merge-confirmed": "合并确认",
  "merge-pending": "转入待确认",
  "merge-canceled": "取消合并",
  split: "拆开恢复",
  "primary-changed": "更换主档",
};

export const RULE_NOTES: string[] = [
  "同一采集号下多份标本共用资料时，改一份会覆盖整组，须先按规则分合。",
  "按物种、采集地点、采集日期三项挑选候选；三项一致方可直接合并。",
  "日期或地点（含物种）不一致时停在待确认，逐条列出差异，人工确认后才可合并。",
  "合并保留各份馆档号，指定一份主档对外展示详情，其余作为成员档。",
  "拆开后各份恢复独立；柜位与历史注记跟随原标本，已上柜记录不因合并消失。",
  "已入组的标本不参与新的合并，须先拆开原组。",
];

const norm = (v: string) => v.trim();

/**
 * 按物种 / 采集地 / 日期挑选候选。
 * 任一条件留空表示不限制；只从未入组的标本中挑。
 */
export function pickCandidates(
  specimens: Specimen[],
  groups: MergeGroup[],
  sel: { species: string; locality: string; date: string }
): Specimen[] {
  const inGroup = new Set(groups.flatMap((g) => g.members));
  const species = norm(sel.species);
  const locality = norm(sel.locality);
  const date = norm(sel.date);
  return specimens.filter((s) => {
    if (inGroup.has(s.guid)) return false;
    if (species && norm(s.species) !== species) return false;
    if (locality && norm(s.locality) !== locality) return false;
    if (date && norm(s.date) !== date) return false;
    return true;
  });
}

/** 逐字段列出所选标本的差异；全部一致时返回空数组 */
export function diffMembers(members: Specimen[]): FieldDiff[] {
  const diffs: FieldDiff[] = [];
  for (const { field, label } of COMPARE_FIELDS) {
    const values = members.map((m) => ({ guid: m.guid, value: m[field] }));
    const distinct = new Set(values.map((v) => norm(v.value)));
    if (distinct.size > 1) diffs.push({ field, label, values });
  }
  return diffs;
}

export type MergeDecision =
  | { kind: "auto-merge" }
  | { kind: "pending"; diffs: FieldDiff[] };

/** 合并判定：三项一致直接合并；任一不一致停在待确认 */
export function decideMerge(members: Specimen[]): MergeDecision {
  const diffs = diffMembers(members);
  return diffs.length === 0 ? { kind: "auto-merge" } : { kind: "pending", diffs };
}

/** 差异说明文案：逐条列出每份的取值 */
export function describeDiff(diff: FieldDiff, byGuid: Map<string, Specimen>): string {
  const parts = diff.values.map((v) => {
    const s = byGuid.get(v.guid);
    const name = s ? `${s.guid}（${s.collectorNo}）` : v.guid;
    return `${name}：${v.value || "（空）"}`;
  });
  return `${diff.label}不一致 — ${parts.join("；")}`;
}

/** 主档默认取所选第一份 */
export function defaultPrimary(members: Specimen[]): string {
  return members[0]?.guid ?? "";
}

export function groupOf(groups: MergeGroup[], guid: string): MergeGroup | undefined {
  return groups.find((g) => g.members.includes(guid));
}

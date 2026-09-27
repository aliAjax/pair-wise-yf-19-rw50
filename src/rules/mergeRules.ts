// 整理规则（纯逻辑层）：只依赖 types，不碰存储与页面状态。
// 规则一览：
//  1. 采集号不同 —— 阻断，不能合并
//  2. 已在其他合组中 —— 阻断，先拆开再合并
//  3. 物种不同 —— 阻断，视为不同物种误并
//  4. 采集日期 / 采集地点不同 —— 停在待确认，逐条列出差异，人工确认后才可合并
//  5. 海拔 / 生境 / 采集人不同 —— 仅提示，不阻断

import type {
  FieldDiff,
  MergeEvaluation,
  MergeGroup,
  Specimen,
} from "../types";

export const STATUS_TEXT: Record<string, string> = {
  blocked: "不可合并",
  pending: "待确认",
  ready: "可合并",
};

interface FieldRule {
  field: string;
  label: string;
  severity: FieldDiff["severity"];
  pick: (s: Specimen) => string;
}

const FIELD_RULES: FieldRule[] = [
  { field: "species", label: "物种名称", severity: "block", pick: (s) => s.species },
  { field: "location", label: "采集地点", severity: "warn", pick: (s) => s.location },
  { field: "date", label: "采集日期", severity: "warn", pick: (s) => s.date },
  { field: "altitude", label: "海拔", severity: "info", pick: (s) => s.altitude },
  { field: "habitat", label: "生境描述", severity: "info", pick: (s) => s.habitat },
  { field: "collectors", label: "采集人", severity: "info", pick: (s) => s.collectors },
];

export function normalize(value: string): string {
  return value.trim().replace(/\s+/g, "").toLowerCase();
}

export function sameValue(a: string, b: string): boolean {
  return normalize(a) === normalize(b);
}

/** 求某份标本所在的合组（未合组返回 undefined） */
export function groupOf(specimenId: string, groups: MergeGroup[]): MergeGroup | undefined {
  return groups.find((g) => g.memberIds.includes(specimenId));
}

/** 主档详情：合组对外展示以主档为准 */
export function primaryOf(group: MergeGroup, specimens: Specimen[]): Specimen | undefined {
  return specimens.find((s) => s.id === group.primaryId);
}

/** 候选标本相对主档的逐条字段差异 */
export function diffAgainstPrimary(primary: Specimen, others: Specimen[]): FieldDiff[] {
  const diffs: FieldDiff[] = [];
  for (const other of others) {
    for (const rule of FIELD_RULES) {
      const pv = rule.pick(primary);
      const ov = rule.pick(other);
      if (!sameValue(pv, ov)) {
        diffs.push({
          specimenId: other.id,
          field: rule.field,
          label: rule.label,
          primaryValue: pv || "（空）",
          otherValue: ov || "（空）",
          severity: rule.severity,
        });
      }
    }
  }
  return diffs;
}

/**
 * 评估一批标本能否合并为一组。
 * 返回 blocked（不可合并）/ pending（待确认）/ ready（可合并）及逐条差异。
 */
export function evaluateMerge(
  all: Specimen[],
  memberIds: string[],
  primaryId: string,
  groups: MergeGroup[]
): MergeEvaluation {
  const uniqueIds = Array.from(new Set(memberIds));
  const members = uniqueIds
    .map((id) => all.find((s) => s.id === id))
    .filter((s): s is Specimen => Boolean(s));

  const blockers: string[] = [];

  if (members.length < 2) {
    blockers.push("至少需要勾选 2 份标本才能合并");
    return { status: "blocked", memberIds: uniqueIds, primaryId, diffs: [], blockers };
  }

  const primary = members.find((s) => s.id === primaryId) ?? members[0];
  const effectivePrimaryId = primary.id;

  // 规则 1：采集号必须一致
  const noSet = new Set(members.map((s) => normalize(s.collectionNo)));
  if (noSet.size > 1) {
    blockers.push("采集号不一致，不能合并到同一组");
  }

  // 规则 2：已在其他合组中的标本须先拆开
  for (const m of members) {
    const g = groupOf(m.id, groups);
    if (g) {
      blockers.push(`「${m.collectionNo} · ${m.id}」已在合组 ${g.id} 中，请先拆开`);
    }
  }

  const others = members.filter((s) => s.id !== effectivePrimaryId);
  const diffs = diffAgainstPrimary(primary, others);

  if (blockers.length > 0 || diffs.some((d) => d.severity === "block")) {
    return { status: "blocked", memberIds: uniqueIds, primaryId: effectivePrimaryId, diffs, blockers };
  }
  if (diffs.some((d) => d.severity === "warn")) {
    return { status: "pending", memberIds: uniqueIds, primaryId: effectivePrimaryId, diffs, blockers };
  }
  return { status: "ready", memberIds: uniqueIds, primaryId: effectivePrimaryId, diffs, blockers };
}

// 台账状态层：标本 / 合组 / 待确认申请 / 事件的全部写操作。
// 关键不变量：
//  - 合组只保存各份档号（memberIds），不复制、不覆盖任何字段；
//  - 柜位记录与历史注记挂在各份标本名下，合并不动、拆开即随原标本恢复；
//  - 已上柜记录只增不减；
//  - 每次写入后交给 storage 层落本机。

import { useEffect, useState } from "react";
import type {
  Database,
  FieldDiff,
  LedgerEvent,
  MergeEvaluation,
  Specimen,
  SpecimenInput,
} from "../types";
import { clearDatabase, loadDatabase, saveDatabase } from "../storage/localStorage";
import { evaluateMerge, groupOf } from "../rules/mergeRules";
import { nowIso, today, uid } from "../lib/util";

export interface MergeRequestResult {
  ok: boolean;
  status: MergeEvaluation["status"] | "none";
  message: string;
  proposalId?: string;
  groupId?: string;
  evaluation?: MergeEvaluation;
}

function newEvent(partial: Omit<LedgerEvent, "id" | "at">): LedgerEvent {
  return { id: uid("EV"), at: nowIso(), ...partial };
}

function diffSnapshot(db: Database, memberIds: string[], primaryId: string): MergeEvaluation {
  return evaluateMerge(db.specimens, memberIds, primaryId, db.groups);
}

export function useLedger() {
  const [db, setDb] = useState<Database>(() => loadDatabase());

  useEffect(() => {
    saveDatabase(db);
  }, [db]);

  const mutate = (fn: (draft: Database) => void) => {
    setDb((prev) => {
      const draft: Database = {
        ...prev,
        specimens: prev.specimens.map((s) => ({ ...s, notes: [...s.notes], shelfHistory: [...s.shelfHistory] })),
        groups: prev.groups.map((g) => ({ ...g, memberIds: [...g.memberIds] })),
        proposals: prev.proposals.map((p) => ({ ...p, memberIds: [...p.memberIds] })),
        events: [...prev.events],
      };
      fn(draft);
      return draft;
    });
  };

  // ---------- 标本 ----------

  const addSpecimen = (input: SpecimenInput): string => {
    const id = uid("HB");
    const ts = nowIso();
    const shelfHistory = input.shelfPosition.trim()
      ? [{ id: uid("SH"), position: input.shelfPosition.trim(), at: today(), note: "录入时已填写柜位" }]
      : [];
    const specimen: Specimen = {
      id,
      collectionNo: input.collectionNo.trim(),
      species: input.species.trim(),
      location: input.location.trim(),
      date: input.date.trim(),
      altitude: input.altitude.trim(),
      habitat: input.habitat.trim(),
      collectors: input.collectors.trim(),
      pressStatus: input.pressStatus,
      identifyStatus: input.identifyStatus,
      shelfPosition: input.shelfPosition.trim(),
      shelfHistory,
      notes: [],
      createdAt: ts,
      updatedAt: ts,
    };
    mutate((d) => {
      d.specimens.unshift(specimen);
      d.events.push(
        newEvent({
          type: "create",
          collectionNo: specimen.collectionNo,
          specimenIds: [id],
          detail: `新录入标本 ${id}（${specimen.species}）`,
        })
      );
    });
    return id;
  };

  const editSpecimen = (id: string, input: SpecimenInput): void => {
    mutate((d) => {
      const s = d.specimens.find((x) => x.id === id);
      if (!s) return;
      const changes: string[] = [];
      const keys: (keyof SpecimenInput)[] = [
        "collectionNo", "species", "location", "date", "altitude",
        "habitat", "collectors", "pressStatus", "identifyStatus", "shelfPosition",
      ];
      for (const k of keys) {
        if (String(s[k]).trim() !== String(input[k]).trim()) {
          changes.push(k);
        }
        (s[k] as string) = typeof input[k] === "string" ? input[k].trim() : input[k];
      }
      s.updatedAt = nowIso();
      if (changes.length > 0) {
        const group = groupOf(id, d.groups);
        d.events.push(
          newEvent({
            type: "edit",
            collectionNo: s.collectionNo,
            specimenIds: [id],
            groupId: group?.id,
            detail: `编辑标本 ${id}，改动字段：${changes.join("、")}（仅本份，不影响同号其他份）`,
          })
        );
      }
    });
  };

  const addNote = (specimenId: string, text: string): void => {
    const trimmed = text.trim();
    if (!trimmed) return;
    mutate((d) => {
      const s = d.specimens.find((x) => x.id === specimenId);
      if (!s) return;
      s.notes.push({ id: uid("N"), at: nowIso(), text: trimmed });
      s.updatedAt = nowIso();
    });
  };

  const addShelfRecord = (specimenId: string, position: string, note: string): void => {
    const pos = position.trim();
    if (!pos) return;
    mutate((d) => {
      const s = d.specimens.find((x) => x.id === specimenId);
      if (!s) return;
      s.shelfHistory.push({ id: uid("SH"), position: pos, at: today(), note: note.trim() || undefined });
      s.shelfPosition = pos;
      s.updatedAt = nowIso();
      const group = groupOf(specimenId, d.groups);
      d.events.push(
        newEvent({
          type: "shelf",
          collectionNo: s.collectionNo,
          specimenIds: [specimenId],
          groupId: group?.id,
          detail: `${specimenId} 上柜 ${pos}${note.trim() ? `（${note.trim()}）` : ""}`,
        })
      );
    });
  };

  // ---------- 合并 ----------

  /**
   * 发起合并：
   *  - ready   直接成组
   *  - pending 生成待确认申请并记录差异
   *  - blocked 原样返回阻断原因
   */
  const requestMerge = (memberIds: string[], primaryId: string): MergeRequestResult => {
    let result: MergeRequestResult = { ok: false, status: "none", message: "" };
    mutate((d) => {
      const ev = diffSnapshot(d, memberIds, primaryId);
      const no = d.specimens.find((s) => s.id === ev.primaryId)?.collectionNo ?? "";
      if (ev.status === "blocked") {
        const parts = [...ev.blockers];
        const speciesDiff = ev.diffs.filter((x) => x.severity === "block");
        for (const x of speciesDiff) {
          parts.push(`物种不一致：${x.specimenId} 为「${x.otherValue}」，主档为「${x.primaryValue}」`);
        }
        result = { ok: false, status: "blocked", message: parts.join("；"), evaluation: ev };
        return;
      }
      if (ev.status === "pending") {
        const proposalId = uid("PP");
        d.proposals.push({
          id: proposalId,
          collectionNo: no,
          memberIds: ev.memberIds,
          primaryId: ev.primaryId,
          createdAt: nowIso(),
        });
        d.events.push(
          newEvent({
            type: "merge-pending",
            collectionNo: no,
            specimenIds: ev.memberIds,
            primaryId: ev.primaryId,
            detail: "采集地点或采集日期与主档不一致，停在待确认，逐条核对后由人工决定",
            diffs: ev.diffs,
          })
        );
        result = {
          ok: true,
          status: "pending",
          message: "已停在待确认：地点或日期存在差异，请在待确认区逐条核对",
          proposalId,
          evaluation: ev,
        };
        return;
      }
      const groupId = uid("MG");
      d.groups.push({
        id: groupId,
        collectionNo: no,
        memberIds: ev.memberIds,
        primaryId: ev.primaryId,
        createdAt: nowIso(),
      });
      d.events.push(
        newEvent({
          type: "merge-confirmed",
          collectionNo: no,
          specimenIds: ev.memberIds,
          primaryId: ev.primaryId,
          groupId,
          detail: `确认合组 ${groupId}，主档 ${ev.primaryId} 展示详情，各份档号保留`,
          diffs: ev.diffs.length ? ev.diffs : undefined,
        })
      );
      result = {
        ok: true,
        status: "ready",
        message: "已合并：各份档号保留，主档展示详情，柜位与注记各归各份",
        groupId,
        evaluation: ev,
      };
    });
    return result;
  };

  /** 确认待确认申请：重新核对一遍规则后再成组 */
  const confirmProposal = (proposalId: string): MergeRequestResult => {
    let result: MergeRequestResult = { ok: false, status: "none", message: "" };
    mutate((d) => {
      const p = d.proposals.find((x) => x.id === proposalId);
      if (!p) {
        result = { ok: false, status: "none", message: "待确认申请不存在" };
        return;
      }
      const ev = diffSnapshot(d, p.memberIds, p.primaryId);
      if (ev.status === "blocked") {
        result = { ok: false, status: "blocked", message: ev.blockers.join("；") || "出现新的阻断差异", evaluation: ev };
        return;
      }
      const groupId = uid("MG");
      d.groups.push({
        id: groupId,
        collectionNo: p.collectionNo,
        memberIds: ev.memberIds,
        primaryId: ev.primaryId,
        createdAt: nowIso(),
      });
      d.proposals = d.proposals.filter((x) => x.id !== proposalId);
      d.events.push(
        newEvent({
          type: "merge-confirmed",
          collectionNo: p.collectionNo,
          specimenIds: ev.memberIds,
          primaryId: ev.primaryId,
          groupId,
          detail: `人工核对差异后确认合组 ${groupId}，主档 ${ev.primaryId} 展示详情`,
          diffs: ev.diffs,
        })
      );
      result = { ok: true, status: "ready", message: "已确认合并", groupId, evaluation: ev };
    });
    return result;
  };

  const rejectProposal = (proposalId: string, reason: string): void => {
    mutate((d) => {
      const p = d.proposals.find((x) => x.id === proposalId);
      if (!p) return;
      d.proposals = d.proposals.filter((x) => x.id !== proposalId);
      d.events.push(
        newEvent({
          type: "merge-rejected",
          collectionNo: p.collectionNo,
          specimenIds: p.memberIds,
          primaryId: p.primaryId,
          detail: `驳回待确认申请 ${p.id}${reason.trim() ? `：${reason.trim()}` : ""}，各份保持独立`,
        })
      );
    });
  };

  // ---------- 拆开 ----------

  /** 把若干份从合组中拆出；柜位与注记本就挂在各份身上，自然随之恢复独立 */
  const splitMembers = (groupId: string, memberIds: string[]): void => {
    mutate((d) => {
      const g = d.groups.find((x) => x.id === groupId);
      if (!g || memberIds.length === 0) return;
      const removed = memberIds.filter((id) => g.memberIds.includes(id));
      const remaining = g.memberIds.filter((id) => !removed.includes(id));
      const collectionNo = g.collectionNo;

      if (remaining.length === 0) {
        d.groups = d.groups.filter((x) => x.id !== groupId);
        d.events.push(
          newEvent({
            type: "group-closed",
            collectionNo,
            specimenIds: removed,
            groupId,
            detail: `合组 ${groupId} 全部拆出，组关闭；各份恢复独立，柜位与历史注记随原标本`,
          })
        );
        return;
      }

      g.memberIds = remaining;
      if (removed.includes(g.primaryId)) {
        g.primaryId = remaining[0];
      }
      d.events.push(
        newEvent({
          type: "split",
          collectionNo,
          specimenIds: removed,
          primaryId: g.primaryId,
          groupId,
          detail:
            `从合组 ${groupId} 拆出 ${removed.join("、")}，恢复独立；` +
            `组内剩余 ${remaining.join("、")}，主档 ${g.primaryId}；已上柜记录均保留`,
        })
      );
    });
  };

  // ---------- 数据维护 ----------

  const resetToDemo = () => {
    clearDatabase();
    setDb(loadDatabase());
  };

  const clearAll = () => {
    clearDatabase();
    setDb({ version: 1, specimens: [], groups: [], proposals: [], events: [] });
  };

  return {
    db,
    addSpecimen,
    editSpecimen,
    addNote,
    addShelfRecord,
    requestMerge,
    confirmProposal,
    rejectProposal,
    splitMembers,
    resetToDemo,
    clearAll,
  };
}

export type LedgerApi = ReturnType<typeof useLedger>;
export type { FieldDiff };

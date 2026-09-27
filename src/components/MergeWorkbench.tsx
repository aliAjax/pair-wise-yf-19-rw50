import { useMemo } from "react";
import type { FieldDiff } from "../types";
import type { LedgerApi } from "../state/useLedger";
import type { PageState } from "../state/usePageState";
import { evaluateMerge, STATUS_TEXT } from "../rules/mergeRules";
import { Badge } from "./Badge";

interface Props {
  ledger: LedgerApi;
  page: PageState;
}

const toneOf = { blocked: "error", pending: "warn", ready: "ok" } as const;

export function MergeWorkbench({ ledger, page }: Props) {
  const { db } = ledger;
  const members = page.selected
    .map((id) => db.specimens.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  const primaryId = page.evaluation?.primaryId && page.selected.includes(page.evaluation.primaryId)
    ? page.evaluation.primaryId
    : page.selected[0] ?? "";

  const evaluation = useMemo(
    () => (page.selected.length >= 2 ? evaluateMerge(db.specimens, page.selected, primaryId, db.groups) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [db.specimens, db.groups, page.selectionKey, primaryId]
  );

  const setPrimary = (id: string) => {
    if (evaluation) page.setEvaluation(evaluateMerge(db.specimens, page.selected, id, db.groups));
  };

  const close = () => {
    page.setShowMergePanel(false);
    page.setEvaluation(null);
  };

  const submit = () => {
    if (!evaluation) return;
    const r = ledger.requestMerge(evaluation.memberIds, evaluation.primaryId);
    page.pushToast(r.message, r.status === "blocked" ? "error" : r.status === "pending" ? "warn" : "ok");
    if (r.ok) {
      close();
      page.clearSelection();
      if (r.groupId) page.openGroup(r.groupId);
    }
  };

  const diffsBySpecimen = (evaluation?.diffs ?? []).reduce<Record<string, FieldDiff[]>>((acc, d) => {
    (acc[d.specimenId] ??= []).push(d);
    return acc;
  }, {});

  return (
    <div className="modal-mask" onClick={close}>
      <div className="modal merge-modal" onClick={(e) => e.stopPropagation()}>
        <div className="heading">
          <div>
            <p>整理规则 · 自动核对</p>
            <h2>按采集号分合核对</h2>
          </div>
          <button onClick={close}>关闭</button>
        </div>

        {members.length < 2 ? (
          <p className="form-error">请至少勾选 2 份标本。</p>
        ) : (
          <>
            <div className="merge-status">
              {evaluation && (
                <Badge tone={toneOf[evaluation.status]}>{STATUS_TEXT[evaluation.status]}</Badge>
              )}
              <span className="muted">
                规则：采集号或物种不同 → 不可合并；采集地点/日期不同 → 停在待确认逐条说明；海拔、生境、采集人不同仅提示。
              </span>
            </div>

            {evaluation?.blockers.map((b) => (
              <div key={b} className="diff-line diff-block">⛔ {b}</div>
            ))}

            <div className="primary-pick">
              <span>指定主档（合组详情按主档展示）：</span>
              <div className="primary-options">
                {members.map((m) => (
                  <label key={m.id} className={evaluation?.primaryId === m.id ? "primary-on" : ""}>
                    <input
                      type="radio"
                      name="primary"
                      checked={evaluation?.primaryId === m.id}
                      onChange={() => setPrimary(m.id)}
                    />
                    <span className="mono">{m.id}</span>
                    <span>{m.species}</span>
                    <small>{m.location} · {m.date}</small>
                  </label>
                ))}
              </div>
            </div>

            <div className="member-diffs">
              {members.filter((m) => m.id !== evaluation?.primaryId).map((m) => (
                <div key={m.id} className="member-card">
                  <h4>
                    <span className="mono">{m.id}</span> {m.species}
                  </h4>
                  {(!diffsBySpecimen[m.id] || diffsBySpecimen[m.id].length === 0) ? (
                    <p className="muted">与主档关键字段一致，仅采集号与海拔等非阻断字段可能不同。</p>
                  ) : (
                    <ul className="diff-list">
                      {diffsBySpecimen[m.id].map((d, i) => (
                        <li key={`${d.field}-${i}`} className={`diff-line diff-${d.severity}`}>
                          <b>{d.label}</b>
                          <span>主档：{d.primaryValue}</span>
                          <span>本份：{d.otherValue}</span>
                          <em>
                            {d.severity === "block" ? "不可合并" : d.severity === "warn" ? "待确认" : "仅提示"}
                          </em>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>

            <div className="form-actions">
              <button
                className="primary"
                disabled={!evaluation || evaluation.status === "blocked"}
                onClick={submit}
              >
                {evaluation?.status === "pending" ? "提交为待确认申请" : "确认合并（保留各自档号）"}
              </button>
              <button onClick={close}>取消</button>
            </div>
            <p className="queue-hint">
              合并不会复制或覆盖字段：合组仅记录各份档号与主档；柜位记录、历史注记仍挂在原标本名下。
            </p>
          </>
        )}
      </div>
    </div>
  );
}

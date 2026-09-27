import { useState } from "react";
import type { Database, PendingProposal } from "../types";
import type { LedgerApi } from "../state/useLedger";
import type { PageState } from "../state/usePageState";
import { diffAgainstPrimary } from "../rules/mergeRules";
import { Badge } from "./Badge";

function ProposalCard({ proposal, ledger, page }: { proposal: PendingProposal; ledger: LedgerApi; page: PageState }) {
  const { db } = ledger;
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const primary = db.specimens.find((s) => s.id === proposal.primaryId);
  const others = proposal.memberIds
    .filter((id) => id !== proposal.primaryId)
    .map((id) => db.specimens.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  if (!primary) return null;
  const diffs = diffAgainstPrimary(primary, others);

  const confirm = () => {
    const r = ledger.confirmProposal(proposal.id);
    if (!r.ok) {
      page.pushToast(r.message, "error");
    } else {
      page.pushToast("差异已人工核对，确认合并", "ok");
      if (r.groupId) page.openGroup(r.groupId);
    }
  };

  return (
    <article className="proposal-card">
      <header>
        <div>
          <h3><span className="mono">{proposal.collectionNo}</span></h3>
          <p>
            主档 <button className="link-btn" onClick={() => page.openSpecimen(primary.id)}>{primary.id}</button>
            {" · "}候选 {proposal.memberIds.join("、")}
          </p>
        </div>
        <Badge tone="warn">待确认</Badge>
      </header>

      <div className="member-diffs">
        {others.map((m) => {
          const mine = diffs.filter((d) => d.specimenId === m.id);
          return (
            <div key={m.id} className="member-card">
              <h4>
                <button className="link-btn" onClick={() => page.openSpecimen(m.id)}>{m.id}</button> {m.species}
              </h4>
              {mine.length === 0 ? (
                <p className="muted">与主档无字段差异</p>
              ) : (
                <ul className="diff-list">
                  {mine.map((d, i) => (
                    <li key={`${d.field}-${i}`} className={`diff-line diff-${d.severity}`}>
                      <b>{d.label}</b>
                      <span>主档：{d.primaryValue}</span>
                      <span>本份：{d.otherValue}</span>
                      <em>{d.severity === "warn" ? "日期或地点不一致" : "仅提示"}</em>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {rejecting ? (
        <div className="reject-row">
          <input
            placeholder="驳回原因（可留空），各份保持独立"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <button onClick={() => { ledger.rejectProposal(proposal.id, reason); setRejecting(false); setReason(""); page.pushToast("已驳回，各份保持独立"); }}>
            确认驳回
          </button>
          <button onClick={() => { setRejecting(false); setReason(""); }}>收回</button>
        </div>
      ) : (
        <div className="form-actions">
          <button className="primary" onClick={confirm}>逐条核对无误，确认合并</button>
          <button onClick={() => setRejecting(true)}>驳回，保持独立</button>
        </div>
      )}
    </article>
  );
}

export function PendingProposals({ db, ledger, page }: { db: Database; ledger: LedgerApi; page: PageState }) {
  if (db.proposals.length === 0) return null;
  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>停在待确认</p>
          <h2>地点 / 日期差异核对（{db.proposals.length}）</h2>
        </div>
        <Badge tone="warn">需人工逐条确认</Badge>
      </div>
      <div className="proposal-grid">
        {db.proposals.map((p) => (
          <ProposalCard key={p.id} proposal={p} ledger={ledger} page={page} />
        ))}
      </div>
    </section>
  );
}

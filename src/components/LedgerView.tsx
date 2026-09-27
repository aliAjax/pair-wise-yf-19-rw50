import type { Ledger } from "../useLedger";
import { ACTION_LABELS, describeDiff } from "../rules";

export function LedgerView({ ledger }: { ledger: Ledger }) {
  const { data, byGuid } = ledger;
  const entries = [...data.ledger].reverse();

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>分合台账</p>
          <h2>合并 / 拆开 / 待确认流水</h2>
        </div>
        <span className="hint">共 {entries.length} 条 · 只追加，长期保存于本机</span>
      </div>
      {entries.length === 0 && <p className="empty">暂无分合记录。</p>}
      <div className="ledger-list">
        {entries.map((e) => (
          <article key={e.id} className={`ledger-entry a-${e.action}`}>
            <header>
              <span className="badge">{ACTION_LABELS[e.action]}</span>
              <strong>采集号 {e.collectorNo}</strong>
              <span className="hint">{e.at}</span>
            </header>
            <p>
              涉及馆档号：
              {e.members.map((m) => (
                <button
                  key={m}
                  className="link"
                  onClick={() => ledger.dispatch({ type: "open-detail", guid: m })}
                >
                  {m}
                </button>
              ))}
              {e.primaryId && ` · 主档 ${e.primaryId}`}
            </p>
            {e.diffs && e.diffs.length > 0 && (
              <ul className="diff-list">
                {e.diffs.map((d) => (
                  <li key={d.field}>{describeDiff(d, byGuid)}</li>
                ))}
              </ul>
            )}
            {e.detail && <p className="hint">{e.detail}</p>}
          </article>
        ))}
      </div>
    </section>
  );
}

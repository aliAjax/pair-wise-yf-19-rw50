import type { Database, LedgerEventType } from "../types";

const LABEL: Record<LedgerEventType, string> = {
  create: "录入",
  edit: "编辑",
  shelf: "上柜",
  "merge-pending": "待确认",
  "merge-confirmed": "合并",
  "merge-rejected": "驳回",
  split: "拆开",
  "group-closed": "关组",
};

const TONE: Record<LedgerEventType, string> = {
  create: "info",
  edit: "neutral",
  shelf: "ok",
  "merge-pending": "warn",
  "merge-confirmed": "primary",
  "merge-rejected": "error",
  split: "info",
  "group-closed": "warn",
};

export function LedgerLog({ db }: { db: Database }) {
  const events = [...db.events].sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 30);
  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>分合台账</p>
          <h2>操作流水（本机持久化，共 {db.events.length} 条）</h2>
        </div>
      </div>
      <ul className="event-log">
        {events.map((e) => (
          <li key={e.id}>
            <time>{e.at.replace("T", " ").slice(0, 16)}</time>
            <span className={`event-tag tag-${TONE[e.type]}`}>{LABEL[e.type]}</span>
            <span className="mono">{e.collectionNo}</span>
            <span>{e.detail}</span>
          </li>
        ))}
        {events.length === 0 && <li className="muted">暂无台账记录</li>}
      </ul>
    </section>
  );
}

import { useState } from "react";
import type { LedgerApi } from "../state/useLedger";
import type { PageState } from "../state/usePageState";
import { primaryOf } from "../rules/mergeRules";
import { Badge } from "./Badge";

interface Props {
  groupId: string;
  ledger: LedgerApi;
  page: PageState;
}

export function GroupDetail({ groupId, ledger, page }: Props) {
  const { db } = ledger;
  const group = db.groups.find((g) => g.id === groupId);
  const [picked, setPicked] = useState<string[]>([]);

  if (!group) {
    return (
      <section className="panel">
        <p className="form-error">合组已不存在（可能已被完全拆开）。</p>
        <button className="primary" onClick={page.goHome}>返回台账首页</button>
      </section>
    );
  }

  const primary = primaryOf(group, db.specimens);
  const members = group.memberIds
    .map((id) => db.specimens.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));
  const events = db.events.filter((e) => e.groupId === group.id || e.specimenIds.some((id) => group.memberIds.includes(id)));

  const toggle = (id: string) =>
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const doSplit = () => {
    if (picked.length === 0) return;
    ledger.splitMembers(group.id, picked);
    page.pushToast(picked.length === group.memberIds.length ? "已全部拆出，合组关闭，各份恢复独立" : "已拆出所选标本，柜位与历史注记随原标本", "ok");
    setPicked([]);
  };

  return (
    <section className="panel detail-panel">
      <button className="back-btn" onClick={page.goHome}>← 返回台账</button>
      <div className="detail-head">
        <div>
          <p>合组详情</p>
          <h2><span className="mono">{group.collectionNo}</span> <Badge tone="primary">{group.id}</Badge></h2>
          {group.note && <p className="muted">{group.note}</p>}
        </div>
      </div>

      <div className="primary-box">
        <h3>主档展示详情 <Badge tone="primary">{group.primaryId}</Badge></h3>
        {primary ? (
          <div className="primary-grid">
            <div><small>物种名称</small><b>{primary.species}</b></div>
            <div><small>采集地点</small><b>{primary.location || "—"}</b></div>
            <div><small>采集日期</small><b>{primary.date || "—"}</b></div>
            <div><small>海拔</small><b>{primary.altitude || "—"}</b></div>
            <div className="full"><small>生境描述</small><b>{primary.habitat || "—"}</b></div>
            <div><small>采集人</small><b>{primary.collectors || "—"}</b></div>
            <div><small>压制 / 鉴定</small><b>{primary.pressStatus} · {primary.identifyStatus}</b></div>
          </div>
        ) : (
          <p className="form-error">主档标本缺失</p>
        )}
      </div>

      <div className="heading split-head">
        <div>
          <p>组内各份（独立档号）</p>
          <h3>柜位与历史注记各归各份</h3>
        </div>
        <div className="split-actions">
          <span className="selection-count">已勾选拆出 {picked.length} 份</span>
          <button className="primary" disabled={picked.length === 0} onClick={doSplit}>拆出所选，恢复独立</button>
        </div>
      </div>

      <div className="member-grid">
        {members.map((m) => {
          const isPrimary = m.id === group.primaryId;
          return (
            <article key={m.id} className={`member-full ${picked.includes(m.id) ? "picked" : ""}`}>
              <header>
                <label className="check">
                  <input type="checkbox" checked={picked.includes(m.id)} onChange={() => toggle(m.id)} />
                  <button className="link-btn" onClick={() => page.openSpecimen(m.id)}>{m.id}</button>
                  {isPrimary && <Badge tone="primary">主档</Badge>}
                </label>
                <b>{m.species}</b>
              </header>
              <p className="muted">{m.location} · {m.date} · {m.altitude}</p>
              <div className="shelf-box">
                <small>柜位：{m.shelfPosition || "未上柜"}</small>
                {m.shelfHistory.length > 0 ? (
                  <ul className="timeline">
                    {m.shelfHistory.map((h) => (
                      <li key={h.id}>
                        <span className="nowrap">{h.at}</span>
                        <b className="mono">{h.position}</b>
                        {h.note && <span className="muted">{h.note}</span>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">暂无上柜记录</p>
                )}
              </div>
              {m.notes.length > 0 && (
                <div className="note-box">
                  <small>历史注记（跟随本份）</small>
                  <ul className="timeline">
                    {m.notes.map((n) => (
                      <li key={n.id}>
                        <span className="nowrap">{n.at.slice(0, 10)}</span>
                        <span>{n.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          );
        })}
      </div>

      <LedgerTimeline events={events} onOpenSpecimen={page.openSpecimen} />
    </section>
  );
}

export function LedgerTimeline({
  events,
  onOpenSpecimen,
}: {
  events: LedgerApi["db"]["events"];
  onOpenSpecimen: (id: string) => void;
}) {
  const sorted = [...events].sort((a, b) => (a.at < b.at ? 1 : -1));
  return (
    <div className="ledger-timeline">
      <h3>分合记录</h3>
      {sorted.length === 0 && <p className="muted">暂无记录</p>}
      <ul>
        {sorted.map((e) => (
          <li key={e.id}>
            <time>{e.at.replace("T", " ").slice(0, 16)}</time>
            <Badge tone={e.type.includes("reject") || e.type === "group-closed" ? "warn" : e.type === "merge-pending" ? "warn" : "info"}>
              {labelOf(e.type)}
            </Badge>
            <div>
              <span className="mono">{e.collectionNo}</span> {e.detail}
              <span className="event-ids">
                {e.specimenIds.map((id) => (
                  <button key={id} className="link-btn" onClick={() => onOpenSpecimen(id)}>{id}</button>
                ))}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function labelOf(t: string): string {
  return {
    create: "录入",
    edit: "编辑",
    shelf: "上柜",
    "merge-pending": "待确认",
    "merge-confirmed": "合并",
    "merge-rejected": "驳回",
    split: "拆开",
    "group-closed": "关组",
  }[t] ?? t;
}

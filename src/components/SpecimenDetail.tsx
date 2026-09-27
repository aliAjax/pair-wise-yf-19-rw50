import { useState } from "react";
import type { LedgerApi } from "../state/useLedger";
import type { PageState } from "../state/usePageState";
import { groupOf } from "../rules/mergeRules";
import { SpecimenForm } from "./SpecimenForm";
import { Badge } from "./Badge";

interface Props {
  specimenId: string;
  ledger: LedgerApi;
  page: PageState;
}

export function SpecimenDetail({ specimenId, ledger, page }: Props) {
  const { db } = ledger;
  const specimen = db.specimens.find((s) => s.id === specimenId);
  const [editing, setEditing] = useState(false);
  const [shelfPos, setShelfPos] = useState("");
  const [shelfNote, setShelfNote] = useState("");
  const [note, setNote] = useState("");

  if (!specimen) {
    return (
      <section className="panel">
        <p className="form-error">找不到该份标本。</p>
        <button className="primary" onClick={page.goHome}>返回台账首页</button>
      </section>
    );
  }

  const group = groupOf(specimen.id, db.groups);
  const events = db.events.filter((e) => e.specimenIds.includes(specimen.id));

  const rows: [string, string][] = [
    ["采集号", specimen.collectionNo],
    ["物种名称", specimen.species],
    ["采集地点", specimen.location || "—"],
    ["采集日期", specimen.date || "—"],
    ["海拔", specimen.altitude || "—"],
    ["生境描述", specimen.habitat || "—"],
    ["采集人", specimen.collectors || "—"],
    ["压制状态", specimen.pressStatus],
    ["鉴定状态", specimen.identifyStatus],
  ];

  return (
    <section className="panel detail-panel">
      <button className="back-btn" onClick={page.goHome}>← 返回台账</button>
      <div className="detail-head">
        <div>
          <p>单份标本详情</p>
          <h2>
            <span className="mono">{specimen.id}</span> {specimen.species}
            {group && <Badge tone={group.primaryId === specimen.id ? "primary" : "info"}>
              {group.primaryId === specimen.id ? `合组主档 · ${group.id}` : `合组成员 · ${group.id}`}
            </Badge>}
          </h2>
          <p className="muted">本页所有修改只写入该档号，不会覆盖同采集号的其他份。</p>
        </div>
        {group && <button onClick={() => page.openGroup(group.id)}>打开合组 {group.id}</button>}
      </div>

      {editing ? (
        <SpecimenForm
          initial={specimen}
          submitLabel="保存本份修改"
          onCancel={() => setEditing(false)}
          onSubmit={(input) => {
            ledger.editSpecimen(specimen.id, input);
            setEditing(false);
            page.pushToast("已保存本份；同号其他份的资料未受影响");
          }}
        />
      ) : (
        <>
          <dl className="detail-grid">
            {rows.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <div className="form-actions">
            <button className="primary" onClick={() => setEditing(true)}>编辑本份</button>
          </div>
        </>
      )}

      <div className="detail-cols">
        <div className="shelf-box detail-box">
          <h3>馆藏柜位记录（只增不改）</h3>
          <p>当前柜位：<b className="mono">{specimen.shelfPosition || "未上柜"}</b></p>
          {specimen.shelfHistory.length > 0 ? (
            <ul className="timeline">
              {[...specimen.shelfHistory].reverse().map((h) => (
                <li key={h.id}>
                  <span className="nowrap">{h.at}</span>
                  <b className="mono">{h.position}</b>
                  {h.note && <span className="muted">{h.note}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">尚未上柜</p>
          )}
          <div className="inline-form">
            <input placeholder="新柜位，如 C-03-18" value={shelfPos} onChange={(e) => setShelfPos(e.target.value)} />
            <input placeholder="说明（可选）" value={shelfNote} onChange={(e) => setShelfNote(e.target.value)} />
            <button
              className="primary"
              onClick={() => {
                if (!shelfPos.trim()) {
                  page.pushToast("请填写柜位", "warn");
                  return;
                }
                ledger.addShelfRecord(specimen.id, shelfPos, shelfNote);
                setShelfPos("");
                setShelfNote("");
                page.pushToast("已追加上柜记录；历史记录不会被覆盖");
              }}
            >
              追加上柜
            </button>
          </div>
        </div>

        <div className="note-box detail-box">
          <h3>历史注记（跟随原标本）</h3>
          {specimen.notes.length > 0 ? (
            <ul className="timeline">
              {[...specimen.notes].reverse().map((n) => (
                <li key={n.id}>
                  <span className="nowrap">{n.at.replace("T", " ").slice(0, 10)}</span>
                  <span>{n.text}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">暂无注记</p>
          )}
          <div className="inline-form">
            <input placeholder="新增一条注记" value={note} onChange={(e) => setNote(e.target.value)} />
            <button
              onClick={() => {
                if (!note.trim()) return;
                ledger.addNote(specimen.id, note);
                setNote("");
              }}
            >
              追加注记
            </button>
          </div>
        </div>
      </div>

      <div className="ledger-timeline">
        <h3>本份分合记录</h3>
        {events.length === 0 ? (
          <p className="muted">暂无记录</p>
        ) : (
          <ul>
            {[...events].sort((a, b) => (a.at < b.at ? 1 : -1)).map((e) => (
              <li key={e.id}>
                <time>{e.at.replace("T", " ").slice(0, 16)}</time>
                <span>{e.detail}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

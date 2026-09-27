import { useState } from "react";
import type { Ledger } from "../useLedger";
import type { IdStatus, PressStatus } from "../types";
import { describeDiff } from "../rules";

/** 柜位在失焦时一次性提交，避免逐字符输入产生多条上柜记录 */
function CabinetField({ value, onCommit }: { value: string; onCommit: (v: string) => void }) {
  const [v, setV] = useState(value);
  return (
    <label>
      <span>馆藏位置（柜位，留空表示未上柜，失焦生效）</span>
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => {
          const next = v.trim();
          if (next !== value) onCommit(next);
        }}
      />
    </label>
  );
}

export function DetailView({ ledger }: { ledger: Ledger }) {
  const { ui, dispatch, byGuid, groupOf, actions } = ledger;
  const guid = ui.detailGuid;
  const specimen = guid ? byGuid.get(guid) : undefined;
  const [note, setNote] = useState("");

  if (!specimen) {
    return (
      <section className="panel">
        <p className="empty">未找到该标本。</p>
        <button onClick={() => dispatch({ type: "close-detail" })}>返回</button>
      </section>
    );
  }

  const group = groupOf(specimen.guid);
  const isPrimary = group?.primaryId === specimen.guid;

  const patch = (p: Parameters<typeof actions.updateSpecimen>[1]) =>
    actions.updateSpecimen(specimen.guid, p);

  return (
    <section className="panel detail">
      <div className="heading">
        <div>
          <p>单份标本详情</p>
          <h2>
            {specimen.guid}
            <span className="sub">采集号 {specimen.collectorNo}</span>
          </h2>
        </div>
        <button onClick={() => dispatch({ type: "close-detail" })}>← 返回列表</button>
      </div>

      {group && (
        <div className={group.status === "merged" ? "group-banner merged" : "group-banner pending"}>
          {group.status === "merged" ? (
            <>
              已并入采集号 {group.collectorNo} 合并组（{group.members.length} 份），
              {isPrimary ? "本份为主档，对外展示详情。" : `主档为 ${group.primaryId}，本份为成员档。`}
              各份馆档号均保留。
            </>
          ) : (
            <>
              本份处于待确认组（采集号 {group.collectorNo}），差异待核对：
              <ul className="diff-list">
                {group.diffs.map((d) => (
                  <li key={d.field}>{describeDiff(d, byGuid)}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <div className="detail-grid">
        <div className="block">
          <h3 className="block-title">基本资料（改这一份不影响同号其他标本）</h3>
          <div className="field-grid">
            <label>
              <span>物种名称</span>
              <input
                value={specimen.species}
                onChange={(e) => patch({ species: e.target.value })}
              />
            </label>
            <label>
              <span>采集地点</span>
              <input
                value={specimen.locality}
                onChange={(e) => patch({ locality: e.target.value })}
              />
            </label>
            <label>
              <span>采集日期</span>
              <input
                type="date"
                value={specimen.date}
                onChange={(e) => patch({ date: e.target.value })}
              />
            </label>
            <label>
              <span>海拔</span>
              <input
                value={specimen.altitude}
                onChange={(e) => patch({ altitude: e.target.value })}
              />
            </label>
            <label>
              <span>生境描述</span>
              <input
                value={specimen.habitat}
                onChange={(e) => patch({ habitat: e.target.value })}
              />
            </label>
            <label>
              <span>采集人</span>
              <input
                value={specimen.collector}
                onChange={(e) => patch({ collector: e.target.value })}
              />
            </label>
            <label>
              <span>压制状态</span>
              <select
                value={specimen.pressStatus}
                onChange={(e) => patch({ pressStatus: e.target.value as PressStatus })}
              >
                <option>待压制</option>
                <option>已压制</option>
              </select>
            </label>
            <label>
              <span>鉴定状态</span>
              <select
                value={specimen.idStatus}
                onChange={(e) => patch({ idStatus: e.target.value as IdStatus })}
              >
                <option>待鉴定</option>
                <option>已鉴定</option>
                <option>存疑</option>
              </select>
            </label>
            <CabinetField
              key={`${specimen.guid}:${specimen.cabinet}`}
              value={specimen.cabinet}
              onCommit={(v) => patch({ cabinet: v })}
            />
          </div>
        </div>

        <div className="block">
          <h3 className="block-title">柜位与已上柜记录（跟随本份，合并不消失）</h3>
          {specimen.shelfRecords.length === 0 ? (
            <p className="empty">暂无已上柜记录。</p>
          ) : (
            <ul className="record-list">
              {specimen.shelfRecords.map((r, i) => (
                <li key={i}>
                  <span className="tag shelved">上柜</span> {r.at} · 柜位 {r.cabinet}
                </li>
              ))}
            </ul>
          )}

          <h3 className="block-title">历史注记（跟随本份）</h3>
          {specimen.notes.length === 0 ? (
            <p className="empty">暂无注记。</p>
          ) : (
            <ul className="record-list">
              {specimen.notes.map((n, i) => (
                <li key={i}>
                  <span className="tag">注记</span> {n.at} · {n.text}
                </li>
              ))}
            </ul>
          )}
          <div className="note-add">
            <input
              value={note}
              placeholder="为本份追加一条注记"
              onChange={(e) => setNote(e.target.value)}
            />
            <button
              onClick={() => {
                actions.addNote(specimen.guid, note);
                setNote("");
              }}
            >
              追加注记
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

import { useMemo } from "react";
import type { Ledger } from "../useLedger";
import type { Specimen } from "../types";
import { COMPARE_FIELDS, describeDiff, diffMembers } from "../rules";

export function MergeBench({ ledger }: { ledger: Ledger }) {
  const { ui, dispatch, candidates, byGuid, actions } = ledger;

  const selectedSpecimens = useMemo(
    () =>
      ui.selected
        .map((g) => byGuid.get(g))
        .filter((s): s is Specimen => Boolean(s)),
    [ui.selected, byGuid]
  );

  const previewDiffs = useMemo(
    () => (selectedSpecimens.length >= 2 ? diffMembers(selectedSpecimens) : []),
    [selectedSpecimens]
  );

  const collectorNos = useMemo(
    () => new Set(selectedSpecimens.map((s) => s.collectorNo)),
    [selectedSpecimens]
  );

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>合并工作台</p>
          <h2>按物种、采集地、日期挑选</h2>
        </div>
        <button onClick={() => dispatch({ type: "reset-selection" })}>清空条件与勾选</button>
      </div>

      <div className="pick-grid">
        {COMPARE_FIELDS.map(({ field, label }) => (
          <label key={field}>
            <span>{label}（留空不限）</span>
            <input
              value={ui.pick[field]}
              placeholder={`按${label}筛选`}
              onChange={(e) => dispatch({ type: "pick", field, value: e.target.value })}
            />
          </label>
        ))}
      </div>

      <div className="block">
        <div className="heading slim">
          <h3 className="block-title">候选标本（未入组，{candidates.length} 份）</h3>
          <div className="actions">
            <button onClick={() => dispatch({ type: "select", guids: candidates.map((c) => c.guid) })}>
              全选候选
            </button>
            <button onClick={() => dispatch({ type: "select", guids: [] })}>取消全选</button>
          </div>
        </div>
        {candidates.length === 0 && <p className="empty">没有符合挑选条件的未入组标本。</p>}
        <div className="candidate-list">
          {candidates.map((c) => {
            const checked = ui.selected.includes(c.guid);
            return (
              <label key={c.guid} className={checked ? "candidate checked" : "candidate"}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => dispatch({ type: "toggle", guid: c.guid })}
                />
                <div>
                  <strong>
                    {c.guid} · {c.species}
                  </strong>
                  <p>
                    采集号 {c.collectorNo} · {c.locality} · {c.date} · {c.altitude} ·{" "}
                    {c.shelved ? `柜位 ${c.cabinet}` : "未上柜"}
                  </p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {selectedSpecimens.length >= 2 && (
        <div className="block">
          <h3 className="block-title">已选 {selectedSpecimens.length} 份 · 指定主档</h3>
          {collectorNos.size > 1 && (
            <p className="warn-text">所选标本采集号不同，无法并入同一组，请重新勾选。</p>
          )}
          <div className="primary-pick">
            {selectedSpecimens.map((s) => (
              <label key={s.guid} className="radio">
                <input
                  type="radio"
                  name="primary"
                  checked={ui.primaryId === s.guid}
                  onChange={() => dispatch({ type: "primary", guid: s.guid })}
                />
                {s.guid}（{s.species}）
              </label>
            ))}
          </div>
          {previewDiffs.length === 0 ? (
            <p className="ok-text">三项一致，可直接合并；合并后各份馆档号保留，主档对外展示详情。</p>
          ) : (
            <div>
              <p className="warn-text">存在差异，提交后将停在待确认：</p>
              <ul className="diff-list">
                {previewDiffs.map((d) => (
                  <li key={d.field}>{describeDiff(d, byGuid)}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="actions">
            <button className="primary" onClick={actions.attemptMerge}>
              合并检查（{selectedSpecimens.length} 份）
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

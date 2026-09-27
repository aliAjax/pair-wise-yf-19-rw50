import { useMemo } from "react";
import type { Ledger } from "../useLedger";
import type { MergeGroup, Specimen } from "../types";
import { describeDiff } from "../rules";

export function QueueView({ ledger }: { ledger: Ledger }) {
  const { data, ui, byGuid, pendingGroups, mergedGroups } = ledger;

  const visible = useMemo(() => {
    return data.specimens.filter((s) => {
      if (ui.statusFilter === "已上柜") {
        if (!s.shelved) return false;
      } else if (ui.statusFilter !== "全部" && s.idStatus !== ui.statusFilter) {
        return false;
      }
      if (ui.localityFilter && s.locality !== ui.localityFilter) return false;
      return true;
    });
  }, [data.specimens, ui.statusFilter, ui.localityFilter]);

  const visibleIds = useMemo(() => new Set(visible.map((s) => s.guid)), [visible]);

  const looseByNo = useMemo(() => {
    const map = new Map<string, Specimen[]>();
    for (const s of visible) {
      if (data.groups.some((g) => g.members.includes(s.guid))) continue;
      const list = map.get(s.collectorNo) ?? [];
      list.push(s);
      map.set(s.collectorNo, list);
    }
    return [...map.entries()];
  }, [visible, data.groups]);

  const shownPending = pendingGroups.filter((g) => g.members.some((m) => visibleIds.has(m)));
  const shownMerged = mergedGroups.filter((g) => g.members.some((m) => visibleIds.has(m)));

  return (
    <section className="panel queue">
      <div className="heading">
        <div>
          <p>入库队列 · 按采集号分组</p>
          <h2>标本清单</h2>
        </div>
        <span className="hint">
          {ui.statusFilter !== "全部" && `筛选：${ui.statusFilter} `}
          {ui.localityFilter && `· ${ui.localityFilter}`}
        </span>
      </div>

      {shownPending.length > 0 && (
        <div className="block">
          <h3 className="block-title warn">待确认（{shownPending.length}）</h3>
          {shownPending.map((g) => (
            <PendingCard key={g.id} group={g} ledger={ledger} />
          ))}
        </div>
      )}

      {shownMerged.length > 0 && (
        <div className="block">
          <h3 className="block-title ok">已合并组（{shownMerged.length}）</h3>
          {shownMerged.map((g) => (
            <MergedCard key={g.id} group={g} ledger={ledger} />
          ))}
        </div>
      )}

      <div className="block">
        <h3 className="block-title">未入组标本（{visible.filter((s) => !data.groups.some((g) => g.members.includes(s.guid))).length}）</h3>
        {looseByNo.length === 0 && <p className="empty">当前筛选下没有未入组标本。</p>}
        {looseByNo.map(([no, list]) => (
          <div key={no} className="no-group">
            <header>
              <strong>采集号 {no}</strong>
              <span>{list.length} 份{list.length > 1 ? "（共用采集号，可去合并工作台检查）" : ""}</span>
            </header>
            {list.map((s) => (
              <SpecimenRow key={s.guid} specimen={s} ledger={ledger} />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function SpecimenRow({ specimen: s, ledger }: { specimen: Specimen; ledger: Ledger }) {
  return (
    <article className="specimen-row">
      <button className="link" onClick={() => ledger.dispatch({ type: "open-detail", guid: s.guid })}>
        {s.guid}
      </button>
      <div>
        <strong>{s.species}</strong>
        <p>
          {s.locality} · {s.date} · {s.altitude} · {s.collector}
        </p>
      </div>
      <div className="tags">
        <span className="tag">{s.pressStatus}</span>
        <span className={`tag id-${s.idStatus}`}>{s.idStatus}</span>
        <span className={s.shelved ? "tag shelved" : "tag"}>
          {s.shelved ? `柜位 ${s.cabinet}` : "未上柜"}
        </span>
      </div>
    </article>
  );
}

function PendingCard({ group, ledger }: { group: MergeGroup; ledger: Ledger }) {
  const { byGuid, actions } = ledger;
  return (
    <div className="group-card pending">
      <header>
        <strong>采集号 {group.collectorNo}</strong>
        <span>待确认 · {group.members.length} 份 · 建于 {group.createdAt}</span>
      </header>
      <p className="warn-text">日期或地点不一致，已停在待确认。逐条差异如下：</p>
      <ul className="diff-list">
        {group.diffs.map((d) => (
          <li key={d.field}>{describeDiff(d, byGuid)}</li>
        ))}
      </ul>
      <div className="member-line">
        {group.members.map((m) => (
          <button key={m} className="link" onClick={() => ledger.dispatch({ type: "open-detail", guid: m })}>
            {m}
          </button>
        ))}
      </div>
      <div className="actions">
        <button
          className="primary"
          onClick={() => {
            if (window.confirm("差异已逐条核对，确认仍要合并为一组？")) actions.confirmPending(group.id);
          }}
        >
          确认无误，仍合并
        </button>
        <button
          onClick={() => {
            if (window.confirm("取消合并后各份恢复独立，确定取消？")) actions.cancelPending(group.id);
          }}
        >
          取消合并
        </button>
      </div>
    </div>
  );
}

function MergedCard({ group, ledger }: { group: MergeGroup; ledger: Ledger }) {
  const { byGuid, actions } = ledger;
  const primary = byGuid.get(group.primaryId);
  return (
    <div className="group-card merged">
      <header>
        <strong>采集号 {group.collectorNo}</strong>
        <span>
          已合并 · {group.members.length} 份 · 主档 {group.primaryId}
          {group.mergedAt ? ` · ${group.mergedAt}` : ""}
        </span>
      </header>
      {primary && (
        <div className="primary-box">
          <span className="badge">主档展示</span>
          <div>
            <button className="link" onClick={() => ledger.dispatch({ type: "open-detail", guid: primary.guid })}>
              {primary.guid}
            </button>
            <strong>{primary.species}</strong>
            <p>
              {primary.locality} · {primary.date} · {primary.altitude} · 柜位 {primary.cabinet || "未上柜"}
            </p>
          </div>
        </div>
      )}
      <div className="member-line">
        <span>成员档（各自编号保留）：</span>
        {group.members
          .filter((m) => m !== group.primaryId)
          .map((m) => (
            <button key={m} className="link" onClick={() => ledger.dispatch({ type: "open-detail", guid: m })}>
              {m}
            </button>
          ))}
        {group.members.length <= 1 && <span>无</span>}
      </div>
      <div className="actions">
        <label className="inline">
          主档
          <select
            value={group.primaryId}
            onChange={(e) => actions.setPrimary(group.id, e.target.value)}
          >
            {group.members.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <button
          className="danger"
          onClick={() => {
            if (
              window.confirm(
                "拆开后各份恢复独立；柜位与历史注记跟随原标本，已上柜记录保留。确定拆开？"
              )
            ) {
              actions.splitGroup(group.id);
            }
          }}
        >
          拆开此组
        </button>
      </div>
    </div>
  );
}

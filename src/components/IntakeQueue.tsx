import type { Database, Specimen } from "../types";
import type { IdentifyFilter, PageState } from "../state/usePageState";
import { groupOf } from "../rules/mergeRules";
import { Badge } from "./Badge";

interface Props {
  db: Database;
  page: PageState;
}

export function matchFilter(s: Specimen, filter: IdentifyFilter): boolean {
  switch (filter) {
    case "待压制":
      return s.pressStatus === "待压制";
    case "待鉴定":
      return s.identifyStatus === "待鉴定";
    case "已鉴定":
      return s.identifyStatus === "已鉴定";
    case "存疑":
      return s.identifyStatus === "存疑";
    case "已入库":
      return s.shelfPosition.trim() !== "";
    default:
      return true;
  }
}

export function IntakeQueue({ db, page }: Props) {
  const kw = page.keyword.trim().toLowerCase();
  const list = db.specimens.filter((s) => {
    if (!matchFilter(s, page.filter)) return false;
    if (!kw) return true;
    return [s.id, s.collectionNo, s.species, s.location, s.collectors]
      .join(" ")
      .toLowerCase()
      .includes(kw);
  });

  const visibleIds = new Set(list.map((s) => s.id));
  const selectedVisible = page.selected.filter((id) => visibleIds.has(id));

  const toggleAll = () => {
    if (selectedVisible.length === list.length && list.length > 0) {
      page.clearSelection();
    } else {
      page.setSelected(Array.from(new Set([...page.selected, ...list.map((s) => s.id)])));
    }
  };

  return (
    <section className="panel queue-panel">
      <div className="heading">
        <div>
          <p>入库队列</p>
          <h2>单份标本台账</h2>
        </div>
        <div className="queue-tools">
          <input
            className="search"
            placeholder="搜索档号 / 采集号 / 物种 / 地点"
            value={page.keyword}
            onChange={(e) => page.setKeyword(e.target.value)}
          />
          <div className="chips">
            {(["全部", "待压制", "待鉴定", "已鉴定", "存疑", "已入库"] as const).map((f) => (
              <button
                key={f}
                className={page.filter === f ? "chip-on" : ""}
                onClick={() => page.setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="selection-bar">
        <label className="check">
          <input type="checkbox" checked={list.length > 0 && selectedVisible.length === list.length} onChange={toggleAll} />
          全选当前筛选（{list.length} 份）
        </label>
        <span className="selection-count">已勾选 {page.selected.length} 份</span>
        <button className="primary merge-btn" disabled={page.selected.length < 2} onClick={() => page.setShowMergePanel(true)}>
          按采集号核对合并
        </button>
        {page.selected.length > 0 && <button onClick={page.clearSelection}>清除勾选</button>}
      </div>

      <div className="table-wrap">
        <table className="queue-table">
          <thead>
            <tr>
              <th className="col-check" />
              <th>档号</th>
              <th>采集号</th>
              <th>物种名称</th>
              <th>采集地点</th>
              <th>日期</th>
              <th>压制</th>
              <th>鉴定</th>
              <th>柜位</th>
              <th>分合状态</th>
            </tr>
          </thead>
          <tbody>
            {list.map((s) => {
              const g = groupOf(s.id, db.groups);
              const isPrimary = g?.primaryId === s.id;
              return (
                <tr key={s.id} className={page.selected.includes(s.id) ? "row-on" : ""}>
                  <td className="col-check">
                    <input
                      type="checkbox"
                      checked={page.selected.includes(s.id)}
                      onChange={() => page.toggleSelect(s.id)}
                      aria-label={`勾选 ${s.id}`}
                    />
                  </td>
                  <td>
                    <button className="link-btn" onClick={() => page.openSpecimen(s.id)}>{s.id}</button>
                  </td>
                  <td className="mono">{s.collectionNo}</td>
                  <td>{s.species}</td>
                  <td>{s.location || "—"}</td>
                  <td className="nowrap">{s.date || "—"}</td>
                  <td>
                    <Badge tone={s.pressStatus === "已压制" ? "ok" : "warn"}>{s.pressStatus}</Badge>
                  </td>
                  <td>
                    <Badge tone={s.identifyStatus === "已鉴定" ? "ok" : s.identifyStatus === "存疑" ? "error" : "neutral"}>
                      {s.identifyStatus}
                    </Badge>
                  </td>
                  <td className="mono">{s.shelfPosition || <span className="muted">未上柜</span>}</td>
                  <td>
                    {g ? (
                      <button className="group-link" onClick={() => page.openGroup(g.id)}>
                        <Badge tone={isPrimary ? "primary" : "info"}>
                          {isPrimary ? `主档 · ${g.id}` : `成员 · ${g.id}`}
                        </Badge>
                      </button>
                    ) : (
                      <span className="muted">独立</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {list.length === 0 && (
              <tr>
                <td colSpan={10} className="empty">当前筛选下没有标本</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="queue-hint">提示：在队列里改任何一份，只写入该档号；同采集号的其他份不会被覆盖。</p>
    </section>
  );
}

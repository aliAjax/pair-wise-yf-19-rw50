import type { Database } from "../types";
import type { PageState } from "../state/usePageState";
import { primaryOf } from "../rules/mergeRules";
import { Badge } from "./Badge";

export function MergeGroups({ db, page }: { db: Database; page: PageState }) {
  if (db.groups.length === 0) {
    return (
      <section className="panel">
        <div className="heading">
          <div>
            <p>现有合组</p>
            <h2>采集号合组台账</h2>
          </div>
        </div>
        <p className="muted">暂无合组。在入库队列勾选同采集号标本后使用“按采集号核对合并”。</p>
      </section>
    );
  }
  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>现有合组</p>
          <h2>采集号合组台账（{db.groups.length}）</h2>
        </div>
      </div>
      <div className="group-grid">
        {db.groups.map((g) => {
          const primary = primaryOf(g, db.specimens);
          const shelfCount = g.memberIds.reduce(
            (n, id) => n + (db.specimens.find((s) => s.id === id)?.shelfHistory.length ?? 0),
            0
          );
          return (
            <article key={g.id} className="group-card">
              <header>
                <h3><span className="mono">{g.collectionNo}</span></h3>
                <Badge tone="primary">{g.id}</Badge>
              </header>
              <dl className="kv">
                <dt>主档</dt>
                <dd>
                  <button className="link-btn" onClick={() => primary && page.openSpecimen(primary.id)}>
                    {g.primaryId}
                  </button>
                  {primary ? ` · ${primary.species}` : ""}
                </dd>
                <dt>成员</dt>
                <dd>{g.memberIds.length} 份（各自档号保留）</dd>
                <dt>上柜记录</dt>
                <dd>{shelfCount} 条（跟各份，合并不消失）</dd>
              </dl>
              <button className="primary block-btn" onClick={() => page.openGroup(g.id)}>
                查看合组详情 / 拆开
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

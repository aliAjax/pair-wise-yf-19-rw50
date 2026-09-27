import "./styles.css";
import { useLedger, type View } from "./useLedger";
import { RULE_NOTES } from "./rules";
import { Sidebar } from "./components/Sidebar";
import { QueueView } from "./components/QueueView";
import { MergeBench } from "./components/MergeBench";
import { LedgerView } from "./components/LedgerView";
import { DetailView } from "./components/DetailView";

const TABS: { key: View; label: string }[] = [
  { key: "queue", label: "入库队列" },
  { key: "merge", label: "合并工作台" },
  { key: "ledger", label: "分合台账" },
];

function App() {
  const ledger = useLedger();
  const { data, ui, dispatch, pendingGroups, mergedGroups } = ledger;

  const shelvedCount = data.specimens.filter((s) => s.shelved).length;
  const sharedNos = new Set(
    data.specimens.map((s) => s.collectorNo).filter((no, _, arr) => arr.indexOf(no) !== arr.lastIndexOf(no))
  );

  const metrics = [
    { label: "在册标本", value: data.specimens.length },
    { label: "共用采集号", value: sharedNos.size },
    { label: "已合并组", value: mergedGroups.length },
    { label: "待确认", value: pendingGroups.length },
    { label: "已上柜", value: shelvedCount },
  ];

  return (
    <main className="app">
      <section className="hero">
        <p>hxyfront-62007 · 植物标本馆 · 数据仅存本机</p>
        <h1>采集号分合台账</h1>
        <span>
          旧藏整理时多份标本共用一个采集号，改一份会覆盖整组资料。本页按物种、采集地和日期挑选候选，
          三项一致方可合并；合并保留各份馆档号并指定主档展示详情；日期或地点不符即停在待确认并逐条说明差异；
          拆开后各份恢复独立，柜位与历史注记跟随原标本，已上柜记录不因合并消失。
        </span>
      </section>

      <section className="metrics">
        {metrics.map((m) => (
          <article key={m.label}>
            <small>{m.label}</small>
            <strong>{m.value}</strong>
          </article>
        ))}
      </section>

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={ui.view === t.key && !ui.detailGuid ? "tab active" : "tab"}
            onClick={() => dispatch({ type: "view", view: t.key })}
          >
            {t.label}
            {t.key === "merge" && pendingGroups.length > 0 && (
              <em className="dot">{pendingGroups.length}</em>
            )}
          </button>
        ))}
      </nav>

      {ui.notice && (
        <div className="notice" onClick={() => dispatch({ type: "notice", text: null })}>
          {ui.notice}
          <span className="hint">（点击关闭）</span>
        </div>
      )}

      {ui.detailGuid ? (
        <DetailView ledger={ledger} />
      ) : (
        <div className="workspace">
          <Sidebar ledger={ledger} />
          <div className="main-col">
            {ui.view === "queue" && <QueueView ledger={ledger} />}
            {ui.view === "merge" && <MergeBench ledger={ledger} />}
            {ui.view === "ledger" && <LedgerView ledger={ledger} />}
          </div>
        </div>
      )}

      <section className="panel rules">
        <div className="heading">
          <div>
            <p>整理规则</p>
            <h2>分合口径（规则层独立维护）</h2>
          </div>
          <button
            onClick={() => {
              if (window.confirm("恢复初始样例数据？本机现有分合记录将被覆盖。")) {
                ledger.actions.resetAll();
              }
            }}
          >
            恢复样例数据
          </button>
        </div>
        <ol className="rule-list">
          {RULE_NOTES.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ol>
      </section>
    </main>
  );
}

export default App;

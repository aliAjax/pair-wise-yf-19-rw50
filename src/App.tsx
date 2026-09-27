import "./styles.css";
import { useMemo } from "react";
import { useLedger } from "./state/useLedger";
import { usePageState } from "./state/usePageState";
import { clearDatabase, exportDatabase } from "./storage/localStorage";
import { ToastHost } from "./components/ToastHost";
import { Metrics } from "./components/Metrics";
import { RulesPanel } from "./components/RulesPanel";
import { NewRecordPanel } from "./components/NewRecordPanel";
import { IntakeQueue } from "./components/IntakeQueue";
import { MergeWorkbench } from "./components/MergeWorkbench";
import { PendingProposals } from "./components/PendingProposals";
import { MergeGroups } from "./components/MergeGroups";
import { LocationCards } from "./components/LocationCards";
import { LedgerLog } from "./components/LedgerLog";
import { SpecimenDetail } from "./components/SpecimenDetail";
import { GroupDetail } from "./components/GroupDetail";

function App() {
  const ledger = useLedger();
  const page = usePageState();
  const { db } = ledger;

  const metrics = useMemo(() => {
    const shelved = new Set(
      db.specimens.filter((s) => s.shelfPosition.trim()).map((s) => s.id)
    ).size;
    return [
      { label: "标本份数", value: db.specimens.length, hint: "每份独立档号" },
      { label: "待鉴定", value: db.specimens.filter((s) => s.identifyStatus === "待鉴定").length, hint: "含同号多份" },
      { label: "已上柜", value: shelved, hint: "柜位记录跟原标本" },
      { label: "现有合组", value: db.groups.length, hint: "主档展示详情" },
      { label: "待确认", value: db.proposals.length, hint: "地点/日期差异核对" },
    ];
  }, [db]);

  const onPickLocation = (location: string) => {
    page.setKeyword(location);
    page.goHome();
  };

  return (
    <main className="app">
      <section className="hero">
        <p>hxyfront-62007 · 植物标本馆 · 数据仅存本机浏览器</p>
        <h1>采集号分合台账</h1>
        <span>
          几份标本共用一个采集号时，按物种、采集地和日期核对后再合并：合并保留各自档号并指定主档展示详情；
          日期或地点不同停在待确认逐条说明；拆开后各份恢复独立，柜位与历史注记跟随原标本，已上柜记录不因合并消失。
        </span>
        <div className="hero-actions">
          <button onClick={() => exportDatabase(db)}>导出本机数据 (JSON)</button>
          <button onClick={() => { ledger.resetToDemo(); page.goHome(); page.pushToast("已恢复演示数据"); }}>
            重置为演示数据
          </button>
          <button
            className="danger-btn"
            onClick={() => {
              if (window.confirm("确定清空本机全部标本与分合记录？此操作不可撤销。")) {
                ledger.clearAll();
                clearDatabase();
                page.goHome();
                page.pushToast("本机数据已清空", "warn");
              }
            }}
          >
            清空本机数据
          </button>
        </div>
      </section>

      <Metrics metrics={metrics} />

      {page.view.kind === "specimen" ? (
        <SpecimenDetail specimenId={page.view.id} ledger={ledger} page={page} />
      ) : page.view.kind === "group" ? (
        <GroupDetail groupId={page.view.id} ledger={ledger} page={page} />
      ) : (
        <>
          <div className="workspace">
            <RulesPanel />
            <NewRecordPanel ledger={ledger} page={page} />
          </div>

          <PendingProposals db={db} ledger={ledger} page={page} />

          <IntakeQueue db={db} page={page} />

          <MergeGroups db={db} page={page} />

          <LocationCards db={db} onPick={onPickLocation} />

          <LedgerLog db={db} />
        </>
      )}

      <footer className="app-footer">
        整理规则 · 资料存取 · 页面状态三层分离 ｜ 数据仅写入本机 localStorage，重开页面分合记录仍在
      </footer>

      {page.showMergePanel && <MergeWorkbench ledger={ledger} page={page} />}
      <ToastHost toasts={page.toasts} />
    </main>
  );
}

export default App;

export function RulesPanel() {
  const rules = [
    { k: "可直接合并", tone: "ok", text: "采集号相同，物种、采集地点、采集日期一致；海拔/生境/采集人不同仅提示。" },
    { k: "停在待确认", tone: "warn", text: "采集地点或采集日期与主档不一致：不自动合并，逐条列出差异，核对后人工确认或驳回。" },
    { k: "不可合并", tone: "error", text: "采集号不同、物种不同，或成员已在其他合组中。" },
    { k: "合并后", tone: "primary", text: "保留各自档号并指定主档展示详情；合组只记档号引用，字段互不复制。" },
    { k: "拆开后", tone: "info", text: "各份恢复独立；柜位与历史注记跟随原标本；已上柜记录只增不减、不消失。" },
  ];
  return (
    <section className="panel rules-panel">
      <div className="heading">
        <div>
          <p>整理规则</p>
          <h2>采集号分合规则</h2>
        </div>
      </div>
      <ul className="rules-list">
        {rules.map((r) => (
          <li key={r.k}>
            <span className={`rule-key rule-${r.tone}`}>{r.k}</span>
            <span>{r.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

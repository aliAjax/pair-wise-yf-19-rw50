import { useMemo, useState } from "react";
import type { Ledger, StatusFilter } from "../useLedger";
import type { IdStatus, PressStatus } from "../types";

const STATUS_FILTERS: StatusFilter[] = ["全部", "待鉴定", "已鉴定", "存疑", "已上柜"];

export function Sidebar({ ledger }: { ledger: Ledger }) {
  const { data, ui, dispatch, actions } = ledger;

  const localities = useMemo(() => {
    const map = new Map<string, { count: number; species: Set<string> }>();
    for (const s of data.specimens) {
      const item = map.get(s.locality) ?? { count: 0, species: new Set<string>() };
      item.count += 1;
      item.species.add(s.species);
      map.set(s.locality, item);
    }
    return [...map.entries()].map(([locality, v]) => ({
      locality,
      count: v.count,
      speciesCount: v.species.size,
    }));
  }, [data.specimens]);

  return (
    <aside className="panel sidebar">
      <h2>鉴定状态筛选</h2>
      <div className="chips">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f}
            className={ui.statusFilter === f ? "chip active" : "chip"}
            onClick={() => dispatch({ type: "filter", filter: f })}
          >
            {f}
          </button>
        ))}
      </div>

      <h2>采集地点信息卡</h2>
      <div className="locality-list">
        {localities.map((l) => (
          <button
            key={l.locality}
            className={ui.localityFilter === l.locality ? "locality active" : "locality"}
            onClick={() =>
              dispatch({
                type: "locality",
                locality: ui.localityFilter === l.locality ? null : l.locality,
              })
            }
          >
            <strong>{l.locality}</strong>
            <span>
              {l.count} 份 · {l.speciesCount} 种
            </span>
          </button>
        ))}
      </div>

      <AddSpecimenForm ledger={ledger} onAdd={actions.addSpecimen} />
    </aside>
  );
}

function AddSpecimenForm({
  ledger,
  onAdd,
}: {
  ledger: Ledger;
  onAdd: Ledger["actions"]["addSpecimen"];
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    collectorNo: "",
    species: "",
    locality: "",
    date: "",
    altitude: "",
    habitat: "",
    collector: "",
    cabinet: "",
    pressStatus: "待压制" as PressStatus,
    idStatus: "待鉴定" as IdStatus,
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = () => {
    if (!form.collectorNo.trim() || !form.species.trim()) {
      ledger.dispatch({ type: "notice", text: "采集号与物种名称为必填。" });
      return;
    }
    onAdd({ ...form });
    setForm({
      collectorNo: "",
      species: "",
      locality: "",
      date: "",
      altitude: "",
      habitat: "",
      collector: "",
      cabinet: "",
      pressStatus: "待压制",
      idStatus: "待鉴定",
    });
    setOpen(false);
  };

  return (
    <div className="add-form">
      <div className="heading slim">
        <h2>新标本录入</h2>
        <button onClick={() => setOpen((o) => !o)}>{open ? "收起" : "展开"}</button>
      </div>
      {open && (
        <div className="field-grid one">
          <label>
            <span>采集号 *</span>
            <input value={form.collectorNo} onChange={set("collectorNo")} placeholder="如 HX-240618-01" />
          </label>
          <label>
            <span>物种名称 *</span>
            <input value={form.species} onChange={set("species")} placeholder="中文名 + 拉丁名" />
          </label>
          <label>
            <span>采集地点</span>
            <input value={form.locality} onChange={set("locality")} />
          </label>
          <label>
            <span>采集日期</span>
            <input type="date" value={form.date} onChange={set("date")} />
          </label>
          <label>
            <span>海拔</span>
            <input value={form.altitude} onChange={set("altitude")} placeholder="如 1420m" />
          </label>
          <label>
            <span>生境描述</span>
            <input value={form.habitat} onChange={set("habitat")} />
          </label>
          <label>
            <span>采集人</span>
            <input value={form.collector} onChange={set("collector")} />
          </label>
          <label>
            <span>馆藏位置（柜位）</span>
            <input value={form.cabinet} onChange={set("cabinet")} placeholder="留空表示未上柜" />
          </label>
          <label>
            <span>压制状态</span>
            <select value={form.pressStatus} onChange={set("pressStatus")}>
              <option>待压制</option>
              <option>已压制</option>
            </select>
          </label>
          <label>
            <span>鉴定状态</span>
            <select value={form.idStatus} onChange={set("idStatus")}>
              <option>待鉴定</option>
              <option>已鉴定</option>
              <option>存疑</option>
            </select>
          </label>
          <button className="primary" onClick={submit}>
            保存入库
          </button>
        </div>
      )}
    </div>
  );
}

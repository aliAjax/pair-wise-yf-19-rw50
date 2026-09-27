import { useState } from "react";
import type { Specimen, SpecimenInput } from "../types";
import { today } from "../lib/util";

const EMPTY: SpecimenInput = {
  collectionNo: "",
  species: "",
  location: "",
  date: today(),
  altitude: "",
  habitat: "",
  collectors: "",
  pressStatus: "待压制",
  identifyStatus: "待鉴定",
  shelfPosition: "",
};

interface Props {
  initial?: Specimen;
  submitLabel: string;
  onSubmit: (input: SpecimenInput) => void;
  onCancel?: () => void;
  compact?: boolean;
}

export function SpecimenForm({ initial, submitLabel, onSubmit, onCancel, compact }: Props) {
  const [form, setForm] = useState<SpecimenInput>(() =>
    initial
      ? {
          collectionNo: initial.collectionNo,
          species: initial.species,
          location: initial.location,
          date: initial.date,
          altitude: initial.altitude,
          habitat: initial.habitat,
          collectors: initial.collectors,
          pressStatus: initial.pressStatus,
          identifyStatus: initial.identifyStatus,
          shelfPosition: initial.shelfPosition,
        }
      : EMPTY
  );
  const [error, setError] = useState("");

  const set = <K extends keyof SpecimenInput>(key: K, value: SpecimenInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const submit = () => {
    if (!form.collectionNo.trim() || !form.species.trim()) {
      setError("采集号与物种名称为必填");
      return;
    }
    setError("");
    onSubmit(form);
    if (!initial) setForm({ ...EMPTY });
  };

  return (
    <div className={compact ? "spec-form compact" : "spec-form"}>
      <div className="field-grid">
        <label>
          <span>采集号 *</span>
          <input value={form.collectionNo} onChange={(e) => set("collectionNo", e.target.value)} placeholder="如 HX-240615-A02" />
        </label>
        <label>
          <span>物种名称 *</span>
          <input value={form.species} onChange={(e) => set("species", e.target.value)} placeholder="中文/学名" />
        </label>
        <label>
          <span>采集地点</span>
          <input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="省/山/沟谷" />
        </label>
        <label>
          <span>采集日期</span>
          <input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
        </label>
        <label>
          <span>海拔</span>
          <input value={form.altitude} onChange={(e) => set("altitude", e.target.value)} placeholder="如 1420m" />
        </label>
        <label>
          <span>采集人</span>
          <input value={form.collectors} onChange={(e) => set("collectors", e.target.value)} />
        </label>
        <label className="full">
          <span>生境描述</span>
          <input value={form.habitat} onChange={(e) => set("habitat", e.target.value)} placeholder="林缘、溪边、土壤等" />
        </label>
        <label>
          <span>压制状态</span>
          <select value={form.pressStatus} onChange={(e) => set("pressStatus", e.target.value as SpecimenInput["pressStatus"])}>
            <option>待压制</option>
            <option>已压制</option>
          </select>
        </label>
        <label>
          <span>鉴定状态</span>
          <select value={form.identifyStatus} onChange={(e) => set("identifyStatus", e.target.value as SpecimenInput["identifyStatus"])}>
            <option>待鉴定</option>
            <option>已鉴定</option>
            <option>存疑</option>
          </select>
        </label>
        <label>
          <span>馆藏柜位</span>
          <input value={form.shelfPosition} onChange={(e) => set("shelfPosition", e.target.value)} placeholder="如 B-12-04（留空表示未上柜）" />
        </label>
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="form-actions">
        <button className="primary" onClick={submit}>{submitLabel}</button>
        {onCancel && <button onClick={onCancel}>取消</button>}
      </div>
    </div>
  );
}

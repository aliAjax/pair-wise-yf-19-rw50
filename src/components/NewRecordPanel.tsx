import { useState } from "react";
import type { LedgerApi } from "../state/useLedger";
import type { PageState } from "../state/usePageState";
import { SpecimenForm } from "./SpecimenForm";

export function NewRecordPanel({ ledger, page }: { ledger: LedgerApi; page: PageState }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="panel form-panel">
      <div className="heading">
        <div>
          <p>新增记录</p>
          <h2>录入新标本</h2>
        </div>
        <button className="primary" onClick={() => setOpen((v) => !v)}>
          {open ? "收起表单" : "展开录入"}
        </button>
      </div>
      {open && (
        <SpecimenForm
          submitLabel="保存为本份新档号"
          onSubmit={(input) => {
            const id = ledger.addSpecimen(input);
            page.pushToast("已录入新档号，与同采集号标本各自独立");
            setOpen(false);
            page.openSpecimen(id);
          }}
        />
      )}
      {!open && <p className="muted">每份标本分配独立档号；即使共用采集号，也不会互相覆盖。</p>}
    </section>
  );
}

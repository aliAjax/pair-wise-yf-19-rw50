import type { Database } from "../types";

interface LocationStat {
  location: string;
  count: number;
  collectionNos: string[];
  altitudes: string[];
  shelved: number;
}

export function LocationCards({ db, onPick }: { db: Database; onPick: (location: string) => void }) {
  const map = new Map<string, LocationStat>();
  for (const s of db.specimens) {
    const key = s.location.trim() || "（未填写地点）";
    const cur = map.get(key) ?? { location: key, count: 0, collectionNos: [], altitudes: [], shelved: 0 };
    cur.count += 1;
    if (!cur.collectionNos.includes(s.collectionNo)) cur.collectionNos.push(s.collectionNo);
    if (s.altitude && !cur.altitudes.includes(s.altitude)) cur.altitudes.push(s.altitude);
    if (s.shelfPosition) cur.shelved += 1;
    map.set(key, cur);
  }
  const stats = Array.from(map.values()).sort((a, b) => b.count - a.count);

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>采集地点信息卡</p>
          <h2>按采集地汇总（{stats.length} 个点）</h2>
        </div>
      </div>
      <div className="location-grid">
        {stats.map((st) => (
          <button key={st.location} className="location-card" onClick={() => onPick(st.location === "（未填写地点）" ? "" : st.location)}>
            <h3>{st.location}</h3>
            <p>{st.count} 份 · {st.collectionNos.length} 个采集号</p>
            <p className="muted">海拔：{st.altitudes.join("、") || "—"}</p>
            <p className="muted">已上柜 {st.shelved} 份</p>
          </button>
        ))}
      </div>
    </section>
  );
}

// 数据存取层：只负责读写本机 localStorage 与初始样例数据，不含整理规则与页面状态。
import type { LedgerData, Specimen } from "./types";

const STORAGE_KEY = "hxyfront-62007:collection-ledger:v1";

export function uid(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${rand}`;
}

export function loadData(): LedgerData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LedgerData;
    if (!Array.isArray(parsed.specimens) || !Array.isArray(parsed.groups) || !Array.isArray(parsed.ledger)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveData(data: LedgerData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // 本机存储不可用时静默降级为内存态
  }
}

export function clearData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

const sp = (partial: Omit<Specimen, "shelfRecords" | "notes"> & Partial<Pick<Specimen, "shelfRecords" | "notes">>): Specimen => ({
  shelfRecords: [],
  notes: [],
  ...partial,
});

/** 初始样例：覆盖“同号可合并 / 日期不符待确认 / 已合并组 / 独立标本”四类情形 */
export function buildSeed(): LedgerData {
  const specimens: Specimen[] = [
    // 同号 HX-240615-01：三项一致，可直接合并
    sp({
      guid: "G-0001",
      collectorNo: "HX-240615-01",
      species: "五裂槭 Acer oliverianum",
      locality: "湖北神农架 阴峪河沟谷",
      date: "2024-06-15",
      altitude: "1420m",
      habitat: "常绿落叶阔叶混交林林缘，半阴坡",
      collector: "陈立",
      pressStatus: "已压制",
      idStatus: "待鉴定",
      cabinet: "B-12-04",
      shelved: true,
      shelfRecords: [{ at: "2024-06-28 10:20", cabinet: "B-12-04" }],
      notes: [{ at: "2024-06-16 09:00", text: "花已落，仅存果序，注意与毛花槭区分。" }],
    }),
    sp({
      guid: "G-0002",
      collectorNo: "HX-240615-01",
      species: "五裂槭 Acer oliverianum",
      locality: "湖北神农架 阴峪河沟谷",
      date: "2024-06-15",
      altitude: "1420m",
      habitat: "同沟谷溪边，湿润石缝",
      collector: "陈立",
      pressStatus: "已压制",
      idStatus: "待鉴定",
      cabinet: "",
      shelved: false,
      notes: [{ at: "2024-06-16 09:05", text: "同号复份，叶形略小。" }],
    }),
    sp({
      guid: "G-0003",
      collectorNo: "HX-240615-01",
      species: "五裂槭 Acer oliverianum",
      locality: "湖北神农架 阴峪河沟谷",
      date: "2024-06-15",
      altitude: "1435m",
      habitat: "沟谷上部疏林",
      collector: "王蔷",
      pressStatus: "待压制",
      idStatus: "待鉴定",
      cabinet: "",
      shelved: false,
    }),
    // 同号 HX-240615-08：采集日期不符，应停在待确认
    sp({
      guid: "G-0004",
      collectorNo: "HX-240615-08",
      species: "荚果蕨 Matteuccia struthiopteris",
      locality: "湖北神农架 大九湖湿地边缘",
      date: "2024-06-15",
      altitude: "1730m",
      habitat: "阴湿沟谷，苔藓层厚",
      collector: "刘一舟",
      pressStatus: "已压制",
      idStatus: "已鉴定",
      cabinet: "C-03-01",
      shelved: true,
      shelfRecords: [{ at: "2024-07-02 14:10", cabinet: "C-03-01" }],
      notes: [{ at: "2024-07-02 14:30", text: "孢子叶与营养叶分采，已合订。" }],
    }),
    sp({
      guid: "G-0005",
      collectorNo: "HX-240615-08",
      species: "荚果蕨 Matteuccia struthiopteris",
      locality: "湖北神农架 大九湖湿地边缘",
      date: "2024-06-16",
      altitude: "1730m",
      habitat: "阴湿沟谷，近水",
      collector: "刘一舟",
      pressStatus: "已压制",
      idStatus: "待鉴定",
      cabinet: "",
      shelved: false,
      notes: [{ at: "2024-06-17 08:40", text: "标签日期疑为笔误，待与采集人核对。" }],
    }),
    // 同号 HX-240616-03：已合并组（G-0006 主档，G-0007 成员）
    sp({
      guid: "G-0006",
      collectorNo: "HX-240616-03",
      species: "华蟹甲 Sinacalia tangutica",
      locality: "重庆巫溪 红池坝",
      date: "2024-06-16",
      altitude: "2100m",
      habitat: "亚高山草甸，向阳坡",
      collector: "赵衡",
      pressStatus: "已压制",
      idStatus: "已鉴定",
      cabinet: "B-12-04",
      shelved: true,
      shelfRecords: [{ at: "2024-07-05 11:00", cabinet: "B-12-04" }],
      notes: [{ at: "2024-07-05 11:20", text: "主档：花序完整，作展示详情。" }],
    }),
    sp({
      guid: "G-0007",
      collectorNo: "HX-240616-03",
      species: "华蟹甲 Sinacalia tangutica",
      locality: "重庆巫溪 红池坝",
      date: "2024-06-16",
      altitude: "2100m",
      habitat: "亚高山草甸边缘",
      collector: "赵衡",
      pressStatus: "已压制",
      idStatus: "已鉴定",
      cabinet: "B-12-05",
      shelved: true,
      shelfRecords: [{ at: "2024-07-05 11:05", cabinet: "B-12-05" }],
      notes: [{ at: "2024-07-05 11:25", text: "复份，果期稍晚。" }],
    }),
    // 独立标本：未入组
    sp({
      guid: "G-0008",
      collectorNo: "HX-240617-02",
      species: "延龄草 Trillium tschonoskii",
      locality: "湖北神农架 千家坪",
      date: "2024-06-17",
      altitude: "2350m",
      habitat: "针阔混交林下，腐殖质厚",
      collector: "陈立",
      pressStatus: "待压制",
      idStatus: "存疑",
      cabinet: "",
      shelved: false,
      notes: [{ at: "2024-06-18 10:00", text: "仅见单株，需补照生境。" }],
    }),
  ];

  return {
    specimens,
    groups: [
      {
        id: "grp-demo-01",
        collectorNo: "HX-240616-03",
        members: ["G-0006", "G-0007"],
        primaryId: "G-0006",
        status: "merged",
        diffs: [],
        createdAt: "2024-07-05 15:00",
        mergedAt: "2024-07-05 15:00",
      },
    ],
    ledger: [
      {
        id: "led-demo-01",
        at: "2024-07-05 15:00",
        action: "merge-confirmed",
        collectorNo: "HX-240616-03",
        groupId: "grp-demo-01",
        members: ["G-0006", "G-0007"],
        primaryId: "G-0006",
        detail: "三项一致直接合并，主档 G-0006。",
      },
    ],
  };
}

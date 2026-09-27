// 领域模型：标本、合并组、分合台账
// 关键约束：每份标本有永不变更的馆档号 guid；采集号 collectorNo 可被多份共用。

export type IdStatus = "待鉴定" | "已鉴定" | "存疑";
export type PressStatus = "待压制" | "已压制";

/** 已上柜记录：只追加，不因合并/拆开而消失 */
export interface ShelfRecord {
  at: string;
  cabinet: string;
}

/** 历史注记：始终归属原标本 */
export interface Note {
  at: string;
  text: string;
}

export interface Specimen {
  /** 馆档号（各自编号，合并后仍保留） */
  guid: string;
  /** 采集号（可能多份共用） */
  collectorNo: string;
  species: string;
  locality: string;
  /** YYYY-MM-DD */
  date: string;
  altitude: string;
  habitat: string;
  collector: string;
  pressStatus: PressStatus;
  idStatus: IdStatus;
  /** 当前柜位，空串表示未上柜 */
  cabinet: string;
  shelved: boolean;
  shelfRecords: ShelfRecord[];
  notes: Note[];
}

export type CompareField = "species" | "locality" | "date";

/** 逐字段、逐份列出的差异说明 */
export interface FieldDiff {
  field: CompareField;
  label: string;
  values: { guid: string; value: string }[];
}

export type GroupStatus = "merged" | "pending";

export interface MergeGroup {
  id: string;
  collectorNo: string;
  /** 成员馆档号列表，各自编号不被覆盖 */
  members: string[];
  /** 主档馆档号：台账以该份展示详情 */
  primaryId: string;
  status: GroupStatus;
  /** 挂起为待确认时逐条保存的差异 */
  diffs: FieldDiff[];
  createdAt: string;
  mergedAt?: string;
}

export type LedgerAction =
  | "merge-confirmed"
  | "merge-pending"
  | "merge-canceled"
  | "split"
  | "primary-changed";

/** 分合台账流水：只追加，长期保存 */
export interface LedgerEntry {
  id: string;
  at: string;
  action: LedgerAction;
  collectorNo: string;
  groupId: string;
  members: string[];
  primaryId?: string;
  diffs?: FieldDiff[];
  detail?: string;
}

export interface LedgerData {
  specimens: Specimen[];
  groups: MergeGroup[];
  ledger: LedgerEntry[];
}

// 标本与分合台账的核心数据模型

export type PressStatus = "待压制" | "已压制";
export type IdentifyStatus = "待鉴定" | "已鉴定" | "存疑";

/** 上柜记录：只增不改，合并不影响任何一份的历史 */
export interface ShelfRecord {
  id: string;
  position: string;
  at: string; // YYYY-MM-DD
  note?: string;
}

/** 历史注记：跟随原标本 */
export interface HistoryNote {
  id: string;
  at: string; // ISO
  text: string;
}

export interface Specimen {
  /** 档号：每份标本的唯一身份，合并后依然保留 */
  id: string;
  /** 采集号：可能多份共用 */
  collectionNo: string;
  species: string;
  location: string;
  date: string; // YYYY-MM-DD
  altitude: string;
  habitat: string;
  collectors: string;
  pressStatus: PressStatus;
  identifyStatus: IdentifyStatus;
  shelfPosition: string;
  shelfHistory: ShelfRecord[];
  notes: HistoryNote[];
  createdAt: string;
  updatedAt: string;
}

/** 表单录入/编辑用的扁平字段 */
export interface SpecimenInput {
  collectionNo: string;
  species: string;
  location: string;
  date: string;
  altitude: string;
  habitat: string;
  collectors: string;
  pressStatus: PressStatus;
  identifyStatus: IdentifyStatus;
  shelfPosition: string;
}

export type DiffSeverity = "block" | "warn" | "info";

/** 一条字段级差异：候选标本相对于主档 */
export interface FieldDiff {
  specimenId: string;
  field: string;
  label: string;
  primaryValue: string;
  otherValue: string;
  severity: DiffSeverity;
}

export type MergeStatus = "blocked" | "pending" | "ready";

export interface MergeEvaluation {
  status: MergeStatus;
  memberIds: string[];
  primaryId: string;
  /** 字段差异（逐条） */
  diffs: FieldDiff[];
  /** 非字段类阻断原因，如已在其他合组中 */
  blockers: string[];
}

/** 已确认的合组：只保存档号引用，各份数据仍在各自名下 */
export interface MergeGroup {
  id: string;
  collectionNo: string;
  memberIds: string[];
  primaryId: string;
  createdAt: string;
  note?: string;
}

/** 停在待确认的合并申请 */
export interface PendingProposal {
  id: string;
  collectionNo: string;
  memberIds: string[];
  primaryId: string;
  createdAt: string;
}

export type LedgerEventType =
  | "create"
  | "edit"
  | "shelf"
  | "merge-pending"
  | "merge-confirmed"
  | "merge-rejected"
  | "split"
  | "group-closed";

export interface LedgerEvent {
  id: string;
  at: string; // ISO
  type: LedgerEventType;
  collectionNo: string;
  specimenIds: string[];
  primaryId?: string;
  groupId?: string;
  detail: string;
  /** 差异快照：提交/确认时的逐条核对结果 */
  diffs?: FieldDiff[];
}

export interface Database {
  version: number;
  specimens: Specimen[];
  groups: MergeGroup[];
  proposals: PendingProposal[];
  events: LedgerEvent[];
}

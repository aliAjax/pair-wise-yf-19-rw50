// 小徽标：状态 / 主档 / 成员 / 差异等级
export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "ok" | "warn" | "error" | "info" | "primary"; children: React.ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

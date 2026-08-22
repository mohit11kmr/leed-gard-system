import { ReactNode } from "react"

type SummaryStatProps = {
  label: string
  value: string | number
  icon?: ReactNode
  color?: string
}

export default function SummaryStat({ label, value, icon, color = "slate" }: SummaryStatProps) {
  const colorMap: Record<string, string> = {
    emerald: "text-emerald-600 dark:text-emerald-400",
    red: "text-red-600 dark:text-red-400",
    slate: "text-slate-400 dark:text-slate-400",
  }

  const resolvedColor = colorMap[color] ?? color

  return (
    <div className="flex flex-col items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900/50">
      {icon && <span className="mb-1">{icon}</span>}
      <span className={`text-2xl font-extrabold ${resolvedColor}`}>{value}</span>
      <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</span>
    </div>
  )
}
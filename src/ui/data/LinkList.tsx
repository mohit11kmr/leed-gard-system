import { ReactNode } from "react"
import { FiCheckCircle, FiAlertTriangle } from "react-icons/fi"

type LinkRowProps = {
  key: string
  url: string
  display: string
  status: string
  sub?: string
  platform?: string
}

type LinkCategory = {
  title: string
  icon: ReactNode
  links: {
    url: string
    display: string
    status: string
    sub?: string
    platform?: string
  }[]
}

type LinkListProps = {
  categories: LinkCategory[]
}

export default function LinkList({ categories }: LinkListProps) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {categories.map((cat) => (
        <details key={cat.title} className="group">
          <summary className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900/50">
            <span className="flex items-center gap-2 text-sm font-medium">
              <span>{cat.icon}</span> {cat.title} ({cat.links.length})
            </span>
            <span className="text-xs text-slate-400 transition-transform group-open:rotate-180">▼</span>
          </summary>
          <div className="mt-2 space-y-1.5">
            {cat.links.map((l) => (
              <div key={l.url} className="flex items-center gap-2 py-1">
                <span className={cn(
                  "flex-1",
                  l.status === "WORKING" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                )}>
                  {l.status === "WORKING" ? <FiCheckCircle className="h-3.5 w-3.5" /> : <FiAlertTriangle className="h-3.5 w-3.5" />}
                </span>
                <span className="truncate">{l.display}</span>
                {l.sub && <span className="text-xs ml-2 text-slate-400 dark:text-slate-300">{l.sub}</span>}
              </div>
            ))}
          </div>
        </details>
      ))}
    </div>
  )
}

function cn(...a: (false | null | undefined | string)[]) {
  return a.filter(Boolean).join(" ")
}
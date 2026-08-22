import { ReactNode } from "react"

type StatusBadgeProps = {
  platform: string
}

export default function StatusBadge({ platform }: StatusBadgeProps) {
  const colors: Record<string, string> = {
    facebook: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    instagram: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    twitter: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
    linkedin: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
    youtube: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    review: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    social: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
        colors[platform] ?? "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
      )}
    >
      {platform}
    </span>
  )
}

function cn(...a: (false | null | undefined | string)[]) {
  return a.filter(Boolean).join(" ")
}
import { ReactNode } from "react"

type ScoreRingProps = {
  score: number | null
  size?: number
  className?: string
}

export default function ScoreRing({ score, size = 100, className }: ScoreRingProps) {
  const radius = size / 2 - 6
  const circumference = 2 * Math.PI * radius
  const progress = score !== null ? (score / 100) * circumference : circumference
  const color =
    score !== null
      ? score >= 70 ? "#10b981"
      : score >= 40 ? "#f59e0b"
      : "#ef4444"
      : "#6b7280"

  return (
    <svg
      width={size}
      height={size}
      className={className}
      viewBox="0 0 100 100"
    >
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke="rgba(0,0,0,0.1)"
        strokeWidth={8}
        style={{ transform: "rotate(-90deg)" }}
      />
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={8}
        style={{ transform: "rotate(-90deg)", strokeDasharray: circumference, strokeDashoffset: progress, transition: "strokeDashoffset 1.2s ease-out" }}
      />
      {score !== null && (
        <text
          x="50"
          y="50"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={size * 0.3}
          fontWeight="bold"
          fill="currentColor"
          className="text-slate-800 dark:text-white"
        >
          {score}
        </text>
      )}
    </svg>
  )
}
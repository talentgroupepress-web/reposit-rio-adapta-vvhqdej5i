import React from 'react'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'

interface GaMetricCardProps {
  title: string
  value: string | number
  changePercent?: number
  changeLabel?: string
  comparisonText?: string
  sparklineData?: number[]
  sparklineColor?: string
  sparklineType?: 'area' | 'bars'
  icon?: React.ReactNode
  helpText?: string
}

export function GaMetricCard({
  title,
  value,
  changePercent,
  changeLabel = 'vs. período anterior',
  comparisonText,
  sparklineData = [12, 19, 15, 25, 22, 30, 28, 35, 42],
  sparklineColor = '#1a73e8',
  sparklineType = 'area',
  icon,
  helpText,
}: GaMetricCardProps) {
  const isPositive = typeof changePercent === 'number' && changePercent > 0
  const isNegative = typeof changePercent === 'number' && changePercent < 0
  const isNeutral = typeof changePercent === 'number' && changePercent === 0

  // Generate SVG path for sparkline
  const max = Math.max(...sparklineData, 1)
  const min = Math.min(...sparklineData, 0)
  const range = max - min || 1
  const width = 120
  const height = 36
  const padding = 2

  const points = sparklineData.map((val, idx) => {
    const x = padding + (idx / (sparklineData.length - 1)) * (width - padding * 2)
    const y = height - padding - ((val - min) / range) * (height - padding * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  const linePath = `M ${points.join(' L ')}`
  const areaPath = `${linePath} L ${width - padding},${height} L ${padding},${height} Z`

  return (
    <div className="flex flex-col justify-between rounded-xl border border-[#e0e2e6] bg-white p-5 transition hover:border-[#dadce0]">
      {/* Top: Title */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-[#5f6368]">{title}</span>
        {icon && <div className="text-[#5f6368] shrink-0 opacity-70">{icon}</div>}
      </div>

      {/* Center: Big Value & Sparkline */}
      <div className="mt-3 flex items-baseline justify-between gap-3">
        <div className="text-2xl sm:text-3xl font-normal tracking-tight text-[#202124]">
          {value}
        </div>

        {/* Sparkline visualization */}
        {sparklineType === 'bars' ? (
          <div className="flex items-end gap-[3px] h-7 shrink-0">
            {sparklineData.map((v, i) => {
              const hPct = Math.max(15, Math.round((v / max) * 100))
              return (
                <span
                  key={i}
                  className="w-1.5 rounded-xs transition-all"
                  style={{
                    height: `${hPct}%`,
                    backgroundColor: sparklineColor,
                    opacity: 0.35 + (i / sparklineData.length) * 0.65,
                  }}
                />
              )
            })}
          </div>
        ) : (
          <svg
            className="w-20 h-7 overflow-visible shrink-0"
            viewBox={`0 0 ${width} ${height}`}
            fill="none"
          >
            <path
              d={linePath}
              stroke={sparklineColor}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>

      {/* Bottom: Trend and comparison info */}
      <div className="mt-3 flex items-center gap-1.5 text-xs">
        {typeof changePercent === 'number' && (
          <span
            className={`inline-flex items-center gap-0.5 font-medium px-1.5 py-0.5 rounded text-[11px] ${
              isPositive
                ? 'bg-[#e6f4ea] text-[#137333]'
                : isNegative
                  ? 'bg-[#fce8e6] text-[#c5221f]'
                  : 'bg-[#f1f3f4] text-[#5f6368]'
            }`}
          >
            {isPositive && <ArrowUpRight className="h-3 w-3" />}
            {isNegative && <ArrowDownRight className="h-3 w-3" />}
            {isNeutral && <Minus className="h-3 w-3" />}
            {Math.abs(changePercent)}%
          </span>
        )}
        <span className="text-[#5f6368] text-[11px] truncate">{comparisonText || changeLabel}</span>
      </div>
    </div>
  )
}

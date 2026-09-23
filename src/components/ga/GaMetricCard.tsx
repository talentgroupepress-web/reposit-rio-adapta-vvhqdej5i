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
    <div className="relative flex flex-col justify-between rounded-xl border border-[#dadce0] bg-white p-4 shadow-none hover:shadow-xs transition-all duration-150">
      {/* Top: Title & optional icon */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-xs font-medium text-[#5f6368] flex items-center gap-1.5">
            {title}
            {helpText && (
              <span className="text-[10px] text-[#5f6368] cursor-help" title={helpText}>
                ⓘ
              </span>
            )}
          </span>
        </div>
        {icon && <div className="text-[#5f6368] shrink-0">{icon}</div>}
      </div>

      {/* Center: Big Value & Sparkline */}
      <div className="mt-2 flex items-baseline justify-between gap-3">
        <div className="text-2xl sm:text-3xl font-normal tracking-tight text-[#202124]">
          {value}
        </div>

        {/* Sparkline visualization */}
        {sparklineType === 'bars' ? (
          <div className="flex items-end gap-[3px] h-8 shrink-0">
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
                  title={`Ponto ${i + 1}: ${v}`}
                />
              )
            })}
          </div>
        ) : (
          <svg
            className="w-24 h-9 overflow-visible shrink-0"
            viewBox={`0 0 ${width} ${height}`}
            fill="none"
          >
            <defs>
              <linearGradient id={`grad-${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={sparklineColor} stopOpacity="0.25" />
                <stop offset="100%" stopColor={sparklineColor} stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path d={areaPath} fill={`url(#grad-${title})`} />
            <path
              d={linePath}
              stroke={sparklineColor}
              strokeWidth="1.75"
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
            className={`inline-flex items-center gap-0.5 font-medium px-1.5 py-0.5 rounded ${
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
        <span className="text-[#5f6368] truncate">{comparisonText || changeLabel}</span>
      </div>
    </div>
  )
}

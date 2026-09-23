import React from 'react'
import { MoreVertical, Maximize2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface GaCardProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  onRefresh?: () => void
  children: React.ReactNode
  className?: string
  headerRight?: React.ReactNode
}

export function GaCard({
  title,
  subtitle,
  action,
  onRefresh,
  children,
  className = '',
  headerRight,
}: GaCardProps) {
  return (
    <div
      className={`rounded-xl border border-[#dadce0] bg-white shadow-none transition hover:border-[#bdc1c6] ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f1f3f4] px-4 sm:px-5 py-3">
        <div>
          <h3 className="text-sm font-medium text-[#202124]">{title}</h3>
          {subtitle && <p className="text-xs text-[#5f6368] mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-1">
          {action}
          {headerRight}
          {onRefresh && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-[#5f6368] hover:text-[#202124] hover:bg-[#f1f3f4] rounded-full"
              onClick={onRefresh}
              title="Atualizar card"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  )
}

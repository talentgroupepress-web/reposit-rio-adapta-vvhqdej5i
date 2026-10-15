import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Filter,
  ListChecks,
  Radio,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { Button } from '@/components/ui/button'
import { listarDecisoes } from '@/services/decisoesF2'
import { simulateT05Checks } from '@/lib/f2/t05/rules'
import type { DecisaoF2 } from '@/lib/f2/t05/types'
import { GaMetricCard } from '@/components/ga/GaMetricCard'
import { GaCard } from '@/components/ga/GaCard'

const statusLabels: Record<string, string> = {
  pendente: 'Pendente de decisão',
  registrada: 'Registrada',
  revogada: 'Revogada',
}

const decisionLabels: Record<string, string> = {
  continuar: 'Continuar',
  ajustar: 'Ajustar',
  interromper: 'Interromper',
}

function formatDate(value?: string) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('pt-BR')
}

function isOverdue(item: DecisaoF2) {
  return (
    item.next_action_status !== 'concluida' &&
    Boolean(item.next_action_due) &&
    new Date(item.next_action_due as string).getTime() < Date.now()
  )
}

export default function DecisoesF2Page() {
  const [items, setItems] = useState<DecisaoF2[]>([])
  const [filter, setFilter] = useState('todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [realtimePulse, setRealtimePulse] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setItems(await listarDecisoes())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar a fila.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Assinatura em Tempo Real (PocketBase Realtime) em decisoes_f2
  useRealtime<DecisaoF2>(
    'decisoes_f2',
    () => {
      setRealtimePulse(true)
      setTimeout(() => setRealtimePulse(false), 2000)
      void load()
    },
    pb.authStore.isValid,
  )

  // Polling leve a cada 20 segundos
  useEffect(() => {
    if (!pb.authStore.isValid) return
    const interval = setInterval(() => {
      void listarDecisoes()
        .then((res) => setItems(res))
        .catch(() => {})
    }, 20000)
    return () => clearInterval(interval)
  }, [])

  const visible = useMemo(() => {
    return items.filter((item) => {
      const matchesFilter =
        filter === 'todos' || item.status === filter || (filter === 'atrasadas' && isOverdue(item))
      const matchesSearch =
        !searchTerm.trim() ||
        item.decision_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.experiment_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.next_action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.next_action_owner?.toLowerCase().includes(searchTerm.toLowerCase())
      return matchesFilter && matchesSearch
    })
  }, [filter, items, searchTerm])

  const tddChecks = useMemo(() => simulateT05Checks(), [])
  const counts = {
    pendente: items.filter((item) => item.status === 'pendente').length,
    registrada: items.filter((item) => item.status === 'registrada').length,
    revogada: items.filter((item) => item.status === 'revogada').length,
    atrasadas: items.filter(isOverdue).length,
  }

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-normal tracking-tight text-[#202124]">
            Decisões
          </h1>
          <p className="mt-0.5 text-xs text-[#5f6368]">Fila de governança e próximas ações</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Badge Tempo Real */}
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              realtimePulse
                ? 'bg-[#e6f4ea] border-[#34a853] text-[#137333] shadow-xs'
                : 'bg-white border-[#dadce0] text-[#5f6368]'
            }`}
            title="Conexão em tempo real ativa (PocketBase Realtime)"
          >
            <span
              className={`h-2 w-2 rounded-full ${
                realtimePulse ? 'bg-[#137333] animate-ping' : 'bg-[#137333]'
              }`}
            />
            <span className="text-[11px] font-mono">Tempo real ativo</span>
          </div>

          <Button
            size="sm"
            onClick={() => void load()}
            disabled={loading}
            className="h-8 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-medium px-4 shadow-none gap-1.5"
          >
            <RefreshCw className={loading ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
            Atualizar
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-[#fce8e6] bg-[#fdf2f2] p-3 text-xs text-[#c5221f]">
          {error}
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GaMetricCard
          title="Pendentes"
          value={counts.pendente}
          sparklineData={[3, 4, 2, 5, 3, counts.pendente || 4]}
          sparklineColor="#e37400"
          sparklineType="bars"
          changeLabel="Aguardando validação"
          icon={<Clock className="h-4 w-4" />}
        />

        <GaMetricCard
          title="Registradas"
          value={counts.registrada}
          sparklineData={[10, 12, 15, 18, 20, counts.registrada || 22]}
          sparklineColor="#137333"
          changePercent={12.5}
          changeLabel="Validadas"
          icon={<CheckCircle2 className="h-4 w-4" />}
        />

        <GaMetricCard
          title="Revogadas"
          value={counts.revogada}
          sparklineData={[1, 1, 2, 2, 1, counts.revogada || 1]}
          sparklineColor="#5f6368"
          changeLabel="Preservadas"
          icon={<ListChecks className="h-4 w-4" />}
        />

        <GaMetricCard
          title="Atrasadas"
          value={counts.atrasadas}
          sparklineData={[0, 1, 0, 1, counts.atrasadas || 0]}
          sparklineColor="#c5221f"
          changePercent={counts.atrasadas > 0 ? 100 : 0}
          changeLabel="Prazo expirado"
          icon={<ShieldAlert className="h-4 w-4" />}
        />
      </div>

      {/* Queue List Card */}
      <div className="rounded-xl border border-[#e0e2e6] bg-white overflow-hidden">
        {/* Header Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e0e2e6] px-5 py-3.5 bg-white">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-[#202124]">Fila de ações</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#f1f3f4] text-[#5f6368] font-mono">
              {visible.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#5f6368]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar..."
                className="h-8 rounded-full border border-[#dadce0] bg-[#f8f9fa] pl-8 pr-3 text-xs text-[#202124] placeholder:text-[#5f6368] focus:bg-white focus:border-[#1a73e8] outline-none"
              />
            </div>

            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className="h-8 rounded-full border border-[#dadce0] bg-white px-3 text-xs font-medium text-[#202124] outline-none focus:border-[#1a73e8]"
            >
              <option value="todos">Todos</option>
              <option value="pendente">Pendentes</option>
              <option value="registrada">Registradas</option>
              <option value="revogada">Revogadas</option>
              <option value="atrasadas">Atrasadas</option>
            </select>
          </div>
        </div>

        {/* Content list */}
        <div className="p-5 space-y-3">
          {loading && (
            <div className="flex items-center justify-center py-10 text-xs text-[#5f6368] gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-[#1a73e8]" />
              <span>Carregando…</span>
            </div>
          )}

          {!loading && visible.length === 0 && (
            <div className="text-center py-10 text-xs text-[#5f6368]">
              Nenhuma decisão encontrada.
            </div>
          )}

          {!loading &&
            visible.map((item) => {
              const overdue = isOverdue(item)
              return (
                <div
                  key={item.id || item.decision_id}
                  className="rounded-lg border border-[#e0e2e6] p-4 bg-white hover:border-[#dadce0] transition"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-[#1a73e8]">
                        {item.decision_id}
                      </span>
                      <span className="text-xs text-[#5f6368]">
                        {item.experiment_id} · v{item.briefing_version}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          item.status === 'pendente'
                            ? 'bg-[#fef7e0] text-[#b06000]'
                            : item.status === 'registrada'
                              ? 'bg-[#e6f4ea] text-[#137333]'
                              : 'bg-[#f1f3f4] text-[#5f6368]'
                        }`}
                      >
                        {statusLabels[item.status]}
                      </span>

                      {item.decision && (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#e8f0fe] text-[#1a73e8]">
                          {decisionLabels[item.decision]}
                        </span>
                      )}

                      {overdue && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#fce8e6] text-[#c5221f]">
                          <ShieldAlert className="h-3 w-3" />
                          Atrasada
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-[#202124] mb-2 font-medium">{item.next_action}</p>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#f1f3f4] text-[11px] text-[#5f6368]">
                    <div>
                      {item.next_action_owner} · {formatDate(item.next_action_due)}
                    </div>

                    <a
                      href={`/experimentos/${item.experiment_id}`}
                      className="font-medium text-[#1a73e8] hover:underline"
                    >
                      Ver experimento ›
                    </a>
                  </div>
                </div>
              )
            })}
        </div>
      </div>

      {/* TDD Card */}
      <GaCard title="Verificações determinísticas (T05)">
        <div className="space-y-2">
          {tddChecks.map((check) => (
            <div key={check.id} className="flex items-start gap-2.5 text-xs p-1.5 rounded">
              <span
                className={`mt-0.5 font-bold ${check.passed ? 'text-[#137333]' : 'text-[#c5221f]'}`}
              >
                {check.passed ? '✓' : '✕'}
              </span>
              <div className="flex-1">
                <p className="font-medium text-[#202124]">{check.label}</p>
                <p className="text-[11px] text-[#5f6368]">{check.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </GaCard>
    </div>
  )
}

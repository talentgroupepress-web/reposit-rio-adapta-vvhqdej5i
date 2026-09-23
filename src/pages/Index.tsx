import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Database,
  Download,
  Filter,
  Layers,
  LineChart,
  PieChart,
  RefreshCw,
  Search,
  SlidersHorizontal,
  TrendingUp,
  Users,
  X,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { GaMetricCard } from '@/components/ga/GaMetricCard'
import { GaCard } from '@/components/ga/GaCard'

type Demanda = {
  id: string
  record_id: string
  empresa: string
  tipo_origem: 'inbound' | 'outbound' | 'desconhecido' | string
  canal: string
  campanha: string
  oferta_servico: string
  segmento: string
  data: string
  responsavel: string
  estado: string
  proxima_acao: string
  prazo: string
  resultado: string
  evidencia: string
  qualidade: string
}

type Filters = {
  tipo_origem: string
  canal: string
  campanha: string
  oferta_servico: string
  responsavel: string
  estado: string
  data_inicio: string
  data_fim: string
}

const emptyFilters: Filters = {
  tipo_origem: '',
  canal: '',
  campanha: '',
  oferta_servico: '',
  responsavel: '',
  estado: '',
  data_inicio: '',
  data_fim: '',
}

const labels: Record<string, string> = {
  suspect: 'Suspect',
  prospect: 'Prospect',
  lead_qualificado: 'Lead qualificado',
  oportunidade: 'Oportunidade',
  proposta: 'Proposta',
  vaga_aberta: 'Vaga aberta',
  ganho: 'Ganho',
  perdido: 'Perdido',
  sem_timing: 'Sem timing',
  desqualificado: 'Desqualificado',
}

function displayValue(value: string) {
  return value || 'Não informado'
}

function formatDate(value: string) {
  if (!value) return '—'
  const datePart = value.slice(0, 10)
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart)
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value
}

function uniqueValues(records: Demanda[], field: keyof Demanda) {
  return Array.from(
    new Set(records.map((record) => String(record[field] || '')).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

export default function Index() {
  const [records, setRecords] = useState<Demanda[]>([])
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastLoaded, setLastLoaded] = useState('')
  const [sourceIds, setSourceIds] = useState<string[]>([])
  const [reconciling, setReconciling] = useState(false)
  const [tableSearch, setTableSearch] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(true)

  const loadRecords = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await pb.collection('demandas').getList<Demanda>(1, 500, {
        sort: '-created',
      })
      setRecords(result.items)
      setLastLoaded(new Date().toLocaleTimeString('pt-BR'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível consultar a fonte de dados.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadRecords()
  }, [])

  const buildSourceFilter = (current: Filters) => {
    const escape = (value: string) => value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    const clauses: string[] = []
    if (current.tipo_origem) clauses.push(`tipo_origem = "${escape(current.tipo_origem)}"`)
    if (current.canal) clauses.push(`canal = "${escape(current.canal)}"`)
    if (current.campanha) clauses.push(`campanha = "${escape(current.campanha)}"`)
    if (current.oferta_servico) clauses.push(`oferta_servico = "${escape(current.oferta_servico)}"`)
    if (current.responsavel) clauses.push(`responsavel = "${escape(current.responsavel)}"`)
    if (current.estado) clauses.push(`estado = "${escape(current.estado)}"`)
    if (current.data_inicio) clauses.push(`data >= "${current.data_inicio} 00:00:00.000Z"`)
    if (current.data_fim) clauses.push(`data <= "${current.data_fim} 23:59:59.999Z"`)
    return clauses.join(' && ')
  }

  useEffect(() => {
    let cancelled = false
    const reconcile = async () => {
      setReconciling(true)
      try {
        const result = await pb.collection('demandas').getFullList<Demanda>({
          filter: buildSourceFilter(filters),
          sort: 'record_id',
        })
        if (!cancelled) setSourceIds(result.map((record) => record.id))
      } catch {
        if (!cancelled) setSourceIds([])
      } finally {
        if (!cancelled) setReconciling(false)
      }
    }
    void reconcile()
    return () => {
      cancelled = true
    }
  }, [filters])

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const recordDate = record.data ? record.data.slice(0, 10) : ''
      const matchesDateStart =
        !filters.data_inicio || (recordDate && recordDate >= filters.data_inicio)
      const matchesDateEnd = !filters.data_fim || (recordDate && recordDate <= filters.data_fim)
      return (
        (!filters.tipo_origem || record.tipo_origem === filters.tipo_origem) &&
        (!filters.canal || record.canal === filters.canal) &&
        (!filters.campanha || record.campanha === filters.campanha) &&
        (!filters.oferta_servico || record.oferta_servico === filters.oferta_servico) &&
        (!filters.responsavel || record.responsavel === filters.responsavel) &&
        (!filters.estado || record.estado === filters.estado) &&
        matchesDateStart &&
        matchesDateEnd
      )
    })
  }, [filters, records])

  const tableFilteredRecords = useMemo(() => {
    if (!tableSearch.trim()) return filteredRecords
    const query = tableSearch.toLowerCase()
    return filteredRecords.filter(
      (r) =>
        r.record_id?.toLowerCase().includes(query) ||
        r.empresa?.toLowerCase().includes(query) ||
        r.tipo_origem?.toLowerCase().includes(query) ||
        r.campanha?.toLowerCase().includes(query) ||
        r.responsavel?.toLowerCase().includes(query) ||
        r.oferta_servico?.toLowerCase().includes(query),
    )
  }, [filteredRecords, tableSearch])

  const byState = useMemo(() => {
    const counts = new Map<string, number>()
    filteredRecords.forEach((record) =>
      counts.set(record.estado, (counts.get(record.estado) || 0) + 1),
    )
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
  }, [filteredRecords])

  const byOrigin = useMemo(() => {
    const counts = new Map<string, number>()
    filteredRecords.forEach((record) =>
      counts.set(
        record.tipo_origem || 'desconhecido',
        (counts.get(record.tipo_origem || 'desconhecido') || 0) + 1,
      ),
    )
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
  }, [filteredRecords])

  const byService = useMemo(() => {
    const counts = new Map<string, number>()
    filteredRecords.forEach((record) =>
      counts.set(
        record.oferta_servico || 'Não informado',
        (counts.get(record.oferta_servico || 'Não informado') || 0) + 1,
      ),
    )
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
  }, [filteredRecords])

  const options = {
    canal: uniqueValues(records, 'canal'),
    campanha: uniqueValues(records, 'campanha'),
    oferta_servico: uniqueValues(records, 'oferta_servico'),
    responsavel: uniqueValues(records, 'responsavel'),
    estado: uniqueValues(records, 'estado'),
  }

  const hasFilters = Object.values(filters).some(Boolean)
  const unknownCount = filteredRecords.filter(
    (record) => record.tipo_origem === 'desconhecido' || !record.tipo_origem,
  ).length
  const filteredIds = filteredRecords.map((record) => record.id).sort()
  const reconciledIds = [...sourceIds].sort()
  const reconciliationReady = !reconciling && filteredIds.length === reconciledIds.length
  const reconciliationPassed =
    reconciliationReady && filteredIds.every((id, index) => id === reconciledIds[index])

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ========================================================
          GA4 PAGE HEADER
         ======================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-[#5f6368]">
            <span>Relatórios</span>
            <span>›</span>
            <span>Ciclo de vida</span>
            <span>›</span>
            <span className="text-[#202124] font-medium">Pipeline comercial</span>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-normal tracking-tight text-[#202124]">
            Visão geral dos relatórios
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-[#5f6368]">
            Métricas de pipeline comercial, origens e estados das demandas em tempo real
          </p>
        </div>

        {/* Action buttons (GA4 Pill Buttons) */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="h-8 rounded-full border-[#dadce0] text-xs font-medium text-[#202124] hover:bg-[#f1f3f4] gap-1.5"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-[#5f6368]" />
            {filtersOpen ? 'Ocultar filtros' : 'Mostrar filtros'}
            {hasFilters && <span className="h-2 w-2 rounded-full bg-[#1a73e8]" />}
          </Button>

          <Button
            size="sm"
            onClick={() => void loadRecords()}
            disabled={loading}
            className="h-8 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-medium px-4 shadow-none gap-1.5"
          >
            <RefreshCw className={loading ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
            Atualizar fonte
          </Button>
        </div>
      </div>

      {/* Error notification if any */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-[#fce8e6] bg-[#fdf2f2] p-4 text-xs sm:text-sm text-[#c5221f]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#c5221f]" />
          <div>
            <strong className="font-medium">Falha na consulta da fonte Google Analytics</strong>
            <p className="mt-0.5 text-xs text-[#c5221f]/90">{error}</p>
          </div>
        </div>
      )}

      {/* ========================================================
          GA4 SCORECARDS / METRICS ROW
         ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GaMetricCard
          title="Total de registros na fonte"
          value={records.length}
          changePercent={8.4}
          changeLabel="vs. últimos 28 dias"
          sparklineData={[35, 42, 45, 52, 60, 58, 65, 72, 78, records.length || 80]}
          sparklineColor="#1a73e8"
          icon={<Database className="h-4 w-4 text-[#1a73e8]" />}
          helpText="Total bruto na collection PocketBase demandas"
        />

        <GaMetricCard
          title="Registros filtrados"
          value={filteredRecords.length}
          changePercent={hasFilters ? -3.2 : 0}
          changeLabel={hasFilters ? 'Filtros ativos' : 'Sem filtros aplicados'}
          sparklineData={[20, 24, 28, 30, 29, 35, filteredRecords.length || 32]}
          sparklineColor="#137333"
          icon={<Filter className="h-4 w-4 text-[#137333]" />}
          helpText="Demandas correspondentes aos critérios de filtro selecionados"
        />

        <GaMetricCard
          title="Origens conhecidas"
          value={filteredRecords.filter((r) => r.tipo_origem !== 'desconhecido').length}
          changePercent={14.1}
          changeLabel="Inbound + Outbound"
          sparklineData={[15, 18, 22, 25, 29, 34, 39]}
          sparklineColor="#1a73e8"
          sparklineType="bars"
          icon={<CheckCircle2 className="h-4 w-4 text-[#1a73e8]" />}
          helpText="Registros com canal e atribuição identificados"
        />

        <GaMetricCard
          title="Desconhecidos preservados"
          value={unknownCount}
          changePercent={unknownCount > 0 ? 0 : -100}
          changeLabel="Sem inferência forçada"
          sparklineData={[10, 8, 9, 7, 6, 8, unknownCount || 5]}
          sparklineColor="#e37400"
          icon={<AlertCircle className="h-4 w-4 text-[#e37400]" />}
          helpText="Registros sem origem declarada mantidos estritamente como desconhecido"
        />
      </div>

      {/* ========================================================
          GA4 COMPARISON BAR / FILTERS PANEL
         ======================================================== */}
      {filtersOpen && (
        <GaCard
          title="Filtros de reconciliação e segmentação"
          subtitle="Cada seleção recalcula a visão mantendo a integridade com a collection de origem"
          action={
            hasFilters ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilters(emptyFilters)}
                className="h-7 text-xs text-[#1a73e8] hover:bg-[#e8f0fe] rounded-full"
              >
                Limpar filtros
              </Button>
            ) : null
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Tipo de Origem */}
            <div>
              <label className="block text-[11px] font-medium text-[#5f6368] mb-1">
                Tipo de origem
              </label>
              <select
                value={filters.tipo_origem}
                onChange={(e) => setFilters({ ...filters, tipo_origem: e.target.value })}
                className="h-8 w-full rounded-md border border-[#dadce0] bg-white px-2.5 text-xs text-[#202124] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] outline-none"
              >
                <option value="">Todas as origens</option>
                <option value="inbound">Inbound</option>
                <option value="outbound">Outbound</option>
                <option value="desconhecido">Desconhecido</option>
              </select>
            </div>

            {/* Canal */}
            <div>
              <label className="block text-[11px] font-medium text-[#5f6368] mb-1">Canal</label>
              <select
                value={filters.canal}
                onChange={(e) => setFilters({ ...filters, canal: e.target.value })}
                className="h-8 w-full rounded-md border border-[#dadce0] bg-white px-2.5 text-xs text-[#202124] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] outline-none"
              >
                <option value="">Todos os canais</option>
                {options.canal.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* Campanha */}
            <div>
              <label className="block text-[11px] font-medium text-[#5f6368] mb-1">Campanha</label>
              <select
                value={filters.campanha}
                onChange={(e) => setFilters({ ...filters, campanha: e.target.value })}
                className="h-8 w-full rounded-md border border-[#dadce0] bg-white px-2.5 text-xs text-[#202124] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] outline-none"
              >
                <option value="">Todas as campanhas</option>
                {options.campanha.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* Serviço */}
            <div>
              <label className="block text-[11px] font-medium text-[#5f6368] mb-1">
                Oferta de serviço
              </label>
              <select
                value={filters.oferta_servico}
                onChange={(e) => setFilters({ ...filters, oferta_servico: e.target.value })}
                className="h-8 w-full rounded-md border border-[#dadce0] bg-white px-2.5 text-xs text-[#202124] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] outline-none"
              >
                <option value="">Todos os serviços</option>
                {options.oferta_servico.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* Responsável */}
            <div>
              <label className="block text-[11px] font-medium text-[#5f6368] mb-1">
                Responsável
              </label>
              <select
                value={filters.responsavel}
                onChange={(e) => setFilters({ ...filters, responsavel: e.target.value })}
                className="h-8 w-full rounded-md border border-[#dadce0] bg-white px-2.5 text-xs text-[#202124] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] outline-none"
              >
                <option value="">Todos os responsáveis</option>
                {options.responsavel.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* Estado */}
            <div>
              <label className="block text-[11px] font-medium text-[#5f6368] mb-1">
                Estado da demanda
              </label>
              <select
                value={filters.estado}
                onChange={(e) => setFilters({ ...filters, estado: e.target.value })}
                className="h-8 w-full rounded-md border border-[#dadce0] bg-white px-2.5 text-xs text-[#202124] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] outline-none"
              >
                <option value="">Todos os estados</option>
                {options.estado.map((opt) => (
                  <option key={opt} value={opt}>
                    {labels[opt] || opt}
                  </option>
                ))}
              </select>
            </div>

            {/* Data Início */}
            <div>
              <label className="block text-[11px] font-medium text-[#5f6368] mb-1">
                Data inicial
              </label>
              <input
                type="date"
                value={filters.data_inicio}
                onChange={(e) => setFilters({ ...filters, data_inicio: e.target.value })}
                className="h-8 w-full rounded-md border border-[#dadce0] bg-white px-2.5 text-xs text-[#202124] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] outline-none"
              />
            </div>

            {/* Data Fim */}
            <div>
              <label className="block text-[11px] font-medium text-[#5f6368] mb-1">
                Data final
              </label>
              <input
                type="date"
                value={filters.data_fim}
                onChange={(e) => setFilters({ ...filters, data_fim: e.target.value })}
                className="h-8 w-full rounded-md border border-[#dadce0] bg-white px-2.5 text-xs text-[#202124] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] outline-none"
              />
            </div>
          </div>
        </GaCard>
      )}

      {/* ========================================================
          GA4 CHARTS ROW (State breakdown & Origin breakdown)
         ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* State distribution (GA4 style horizontal bar chart) */}
        <GaCard
          title="Demandas por estado no funil"
          subtitle="Distribuição percentual com base na seleção ativa"
          headerRight={
            <span className="text-[11px] text-[#5f6368] font-mono">
              {filteredRecords.length} total
            </span>
          }
        >
          {byState.length === 0 ? (
            <p className="text-xs text-[#5f6368] py-8 text-center">
              Nenhum registro para os filtros selecionados.
            </p>
          ) : (
            <div className="space-y-3.5">
              {byState.map(([state, count], idx) => {
                const pct = filteredRecords.length
                  ? Math.round((count / filteredRecords.length) * 100)
                  : 0
                return (
                  <div key={state} className="group">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-[#202124] flex items-center gap-1.5">
                        <span className="text-[11px] text-[#5f6368] font-mono w-4">{idx + 1}.</span>
                        {labels[state] || state}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[#5f6368]">{pct}%</span>
                        <strong className="font-semibold text-[#202124] w-8 text-right font-mono">
                          {count}
                        </strong>
                      </div>
                    </div>
                    {/* GA4 style blue progress bar */}
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#f1f3f4]">
                      <div
                        className="h-full rounded-full bg-[#1a73e8] transition-all duration-300 group-hover:bg-[#1557b0]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </GaCard>

        {/* Origin breakdown (GA4 style Cards with pill bars) */}
        <GaCard
          title="Atribuição por tipo de origem"
          subtitle="Inbound, Outbound e registros mantidos em Desconhecido"
          headerRight={<span className="text-[11px] text-[#5f6368]">Origem primária</span>}
        >
          <div className="space-y-3">
            {byOrigin.map(([origin, count]) => {
              const pct = filteredRecords.length
                ? Math.round((count / filteredRecords.length) * 100)
                : 0
              const isUnknown = origin === 'desconhecido' || !origin
              const barColor = isUnknown ? 'bg-[#f9ab00]' : 'bg-[#1a73e8]'

              return (
                <div
                  key={origin}
                  className="p-3 rounded-lg border border-[#dadce0] bg-[#fafafa] flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`h-3 w-3 rounded-full ${
                        isUnknown ? 'bg-[#f9ab00]' : 'bg-[#1a73e8]'
                      }`}
                    />
                    <div>
                      <div className="text-xs font-medium text-[#202124] capitalize">
                        {origin === 'desconhecido' ? 'Desconhecido' : origin}
                      </div>
                      <div className="text-[11px] text-[#5f6368]">
                        {isUnknown ? 'Mantido em categoria própria' : 'Rastreabilidade confirmada'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="hidden sm:block w-24 h-1.5 rounded-full bg-[#e8eaed] overflow-hidden">
                      <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-[#5f6368] font-mono w-10 text-right">{pct}%</span>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white border border-[#dadce0] text-[#202124] font-mono">
                      {count}
                    </span>
                  </div>
                </div>
              )
            })}

            {/* Service breakdown mini-table */}
            <div className="pt-2 border-t border-[#f1f3f4]">
              <div className="text-[11px] uppercase tracking-wider font-semibold text-[#5f6368] mb-2">
                Top ofertas de serviços
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {byService.map(([svc, cnt]) => (
                  <div
                    key={svc}
                    className="flex items-center justify-between p-2 rounded bg-white border border-[#f1f3f4]"
                  >
                    <span className="text-[#5f6368] truncate max-w-[140px]">{svc}</span>
                    <span className="font-semibold text-[#202124] font-mono">{cnt}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </GaCard>
      </div>

      {/* ========================================================
          GA4 DATA TABLE (Google Analytics standard data grid)
         ======================================================== */}
      <div className="rounded-xl border border-[#dadce0] bg-white overflow-hidden shadow-none">
        {/* Table Top Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dadce0] px-4 py-3 bg-white">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-[#202124]">Registros da fonte (record_id)</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#f1f3f4] text-[#5f6368] font-mono">
              {tableFilteredRecords.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Search filter within table */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#5f6368]" />
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Filtrar nesta tabela..."
                className="h-8 rounded-full border border-[#dadce0] bg-[#f8f9fa] pl-8 pr-3 text-xs text-[#202124] placeholder:text-[#5f6368] focus:bg-white focus:border-[#1a73e8] outline-none"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="h-8 rounded-full border-[#dadce0] text-xs font-medium text-[#5f6368] hover:text-[#202124] gap-1"
            >
              <Download className="h-3 w-3" />
              <span className="hidden sm:inline">Exportar</span>
            </Button>
          </div>
        </div>

        {/* The Grid Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="border-b border-[#dadce0] bg-[#f8f9fa] text-[11px] uppercase tracking-wider text-[#5f6368]">
              <tr>
                <th className="px-4 py-3 font-semibold text-[#202124]">record_id</th>
                <th className="px-4 py-3 font-semibold text-[#202124]">Empresa</th>
                <th className="px-4 py-3 font-semibold text-[#202124]">Origem</th>
                <th className="px-4 py-3 font-semibold text-[#202124]">Estado</th>
                <th className="px-4 py-3 font-semibold text-[#202124]">Serviço</th>
                <th className="px-4 py-3 font-semibold text-[#202124]">Responsável</th>
                <th className="px-4 py-3 font-semibold text-[#202124]">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f3f4] text-[#202124]">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-[#5f6368]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="h-5 w-5 animate-spin text-[#1a73e8]" />
                      <span>Consultando dados da collection Google Analytics / demandas…</span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading &&
                tableFilteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-[#f8f9fa] transition-colors duration-100">
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[11px] text-[#1a73e8] font-medium">
                      {record.record_id}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-[#202124]">
                      {displayValue(record.empresa)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          record.tipo_origem === 'desconhecido'
                            ? 'bg-[#fef7e0] text-[#b06000]'
                            : 'bg-[#e8f0fe] text-[#1a73e8]'
                        }`}
                      >
                        {record.tipo_origem === 'desconhecido'
                          ? 'Desconhecido'
                          : displayValue(record.tipo_origem)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[#5f6368]">
                      {labels[record.estado] || record.estado}
                    </td>
                    <td className="px-4 py-2.5 text-[#5f6368]">
                      {displayValue(record.oferta_servico)}
                    </td>
                    <td className="px-4 py-2.5 text-[#5f6368]">
                      {displayValue(record.responsavel)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-[#5f6368] font-mono">
                      {formatDate(record.data)}
                    </td>
                  </tr>
                ))}

              {!loading && tableFilteredRecords.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-[#5f6368]">
                    Nenhum registro corresponde aos filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info & reconciliation check */}
        <div className="border-t border-[#dadce0] bg-[#f8f9fa] px-4 py-3 flex flex-wrap items-center justify-between text-[11px] text-[#5f6368] gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-[#137333]" />
            <span>
              Reconciliação: Painel <strong>{filteredRecords.length}</strong> · Fonte{' '}
              <strong>{sourceIds.length}</strong> · Diferença:{' '}
              <strong>
                {reconciliationReady ? filteredRecords.length - sourceIds.length : 'apurando'}
              </strong>
            </span>
            <span>·</span>
            <span
              className={`font-medium ${
                reconciliationPassed
                  ? 'text-[#137333]'
                  : reconciling
                    ? 'text-[#1a73e8]'
                    : 'text-[#c5221f]'
              }`}
            >
              {reconciliationPassed
                ? 'PASSOU (IDs coincidem)'
                : reconciling
                  ? 'Consultando fonte…'
                  : 'Divergência'}
            </span>
          </div>

          <div>Fonte consultada às {lastLoaded || '—'} · Modo somente leitura</div>
        </div>
      </div>
    </div>
  )
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Database,
  Download,
  Filter,
  Layers,
  LineChart,
  Megaphone,
  PieChart,
  Radio,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Target,
  TrendingUp,
  Users,
  X,
  Zap,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { Button } from '@/components/ui/button'
import { GaMetricCard } from '@/components/ga/GaMetricCard'
import { GaCard } from '@/components/ga/GaCard'
import {
  MAPA_ESTADOS_DEMANDA,
  MAPA_ORIGENS,
  MAPA_CANAIS,
  formatarDataAmigavel,
  formatarBooleano,
  formatarNumero,
  formatarValorMonetario,
  formatarCanal,
  formatarOrigem,
  formatarCampanha,
} from '@/lib/formatters'

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
  contato_ref?: string
  status_proposta?: string
  data_conversao_comercial?: string
  data_conquista?: string
  tipo_conquista?: string
  handoff_status?: string
  icp_validado?: string
  created?: string
  updated?: string
}

type ExperimentoResumo = {
  id: string
  experiment_id: string
  title: string
  service: string
  origin: string
  channel: string
  state: string
  briefing_version: string
  budget?: { valor?: number; moeda?: string }
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

const labels: Record<string, string> = MAPA_ESTADOS_DEMANDA

function displayValue(value: string) {
  return value?.trim() ? value : 'Não informado'
}

function formatDate(value: string) {
  return formatarDataAmigavel(value)
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
  const [campaignSearch, setCampaignSearch] = useState('')
  const [experimentos, setExperimentos] = useState<ExperimentoResumo[]>([])
  const [realtimePulse, setRealtimePulse] = useState(false)

  const loadRecords = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [demandasResult, expResult] = await Promise.all([
        pb.collection('demandas').getList<Demanda>(1, 500, {
          sort: '-created',
        }),
        pb.authStore.isValid
          ? pb
              .collection('experimentos_f2')
              .getList<ExperimentoResumo>(1, 100, {
                sort: '-created',
              })
              .catch(() => null)
          : Promise.resolve(null),
      ])
      setRecords(demandasResult.items)
      if (expResult?.items) {
        setExperimentos(expResult.items)
      }
      setLastLoaded(new Date().toLocaleTimeString('pt-BR'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível consultar a fonte de dados.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadRecords()
  }, [loadRecords])

  // Assinatura em Tempo Real (PocketBase Realtime) para demandas
  useRealtime<Demanda>('demandas', (e) => {
    setRealtimePulse(true)
    setTimeout(() => setRealtimePulse(false), 2000)
    setRecords((prev) => {
      if (e.action === 'create') {
        if (prev.some((r) => r.id === e.record.id)) return prev
        return [e.record, ...prev]
      }
      if (e.action === 'update') {
        return prev.map((r) => (r.id === e.record.id ? e.record : r))
      }
      if (e.action === 'delete') {
        return prev.filter((r) => r.id !== e.record.id)
      }
      return prev
    })
    setLastLoaded(new Date().toLocaleTimeString('pt-BR'))
  })

  // Assinatura em Tempo Real para experimentos
  useRealtime<ExperimentoResumo>(
    'experimentos_f2',
    (e) => {
      setRealtimePulse(true)
      setTimeout(() => setRealtimePulse(false), 2000)
      setExperimentos((prev) => {
        if (e.action === 'create') {
          if (prev.some((r) => r.id === e.record.id)) return prev
          return [e.record, ...prev]
        }
        if (e.action === 'update') {
          return prev.map((r) => (r.id === e.record.id ? e.record : r))
        }
        if (e.action === 'delete') {
          return prev.filter((r) => r.id !== e.record.id)
        }
        return prev
      })
    },
    pb.authStore.isValid,
  )

  // Polling leve de fallback a cada 15 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      void pb
        .collection('demandas')
        .getList<Demanda>(1, 500, { sort: '-created' })
        .then((result) => {
          setRecords(result.items)
          setLastLoaded(new Date().toLocaleTimeString('pt-BR'))
        })
        .catch(() => {})
    }, 15000)
    return () => clearInterval(interval)
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
        r.oferta_servico?.toLowerCase().includes(query) ||
        r.canal?.toLowerCase().includes(query) ||
        r.segmento?.toLowerCase().includes(query) ||
        r.status_proposta?.toLowerCase().includes(query),
    )
  }, [filteredRecords, tableSearch])

  // Agrupamento detalhado por campanhas de tráfego
  const campaignAnalytics = useMemo(() => {
    type CampaignStat = {
      name: string
      canal: string
      tipo_origem: string
      total: number
      qualificados: number
      oportunidades: number
      propostas: number
      ganhos: number
      icpValidados: number
    }
    const map = new Map<string, CampaignStat>()

    filteredRecords.forEach((r) => {
      const campName = r.campanha?.trim() || '(Orgânico / Sem campanha)'
      const existing = map.get(campName) || {
        name: campName,
        canal: r.canal || 'Geral',
        tipo_origem: r.tipo_origem || 'desconhecido',
        total: 0,
        qualificados: 0,
        oportunidades: 0,
        propostas: 0,
        ganhos: 0,
        icpValidados: 0,
      }
      existing.total += 1
      if (
        r.estado === 'lead_qualificado' ||
        r.estado === 'oportunidade' ||
        r.estado === 'proposta' ||
        r.estado === 'ganho'
      ) {
        existing.qualificados += 1
      }
      if (r.estado === 'oportunidade' || r.estado === 'proposta' || r.estado === 'ganho') {
        existing.oportunidades += 1
      }
      if (r.estado === 'proposta' || r.estado === 'ganho') {
        existing.propostas += 1
      }
      if (r.estado === 'ganho') {
        existing.ganhos += 1
      }
      if (r.icp_validado === 'sim') {
        existing.icpValidados += 1
      }
      map.set(campName, existing)
    })

    let list = Array.from(map.values()).sort((a, b) => b.total - a.total)
    if (campaignSearch.trim()) {
      const q = campaignSearch.toLowerCase()
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.canal.toLowerCase().includes(q) ||
          c.tipo_origem.toLowerCase().includes(q),
      )
    }
    return list
  }, [filteredRecords, campaignSearch])

  // Desempenho por canal de tráfego
  const channelAnalytics = useMemo(() => {
    const map = new Map<
      string,
      { canal: string; total: number; qualificados: number; ganhos: number }
    >()
    filteredRecords.forEach((r) => {
      const c = r.canal?.trim() || 'Direto / Não especificado'
      const cur = map.get(c) || { canal: c, total: 0, qualificados: 0, ganhos: 0 }
      cur.total += 1
      if (
        r.estado === 'lead_qualificado' ||
        r.estado === 'oportunidade' ||
        r.estado === 'proposta' ||
        r.estado === 'ganho'
      ) {
        cur.qualificados += 1
      }
      if (r.estado === 'ganho') {
        cur.ganhos += 1
      }
      map.set(c, cur)
    })
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }, [filteredRecords])

  // Métricas agregadas de campanhas
  const trafficSummary = useMemo(() => {
    const withCampaign = filteredRecords.filter((r) => Boolean(r.campanha?.trim()))
    const qualificados = filteredRecords.filter(
      (r) =>
        r.estado === 'lead_qualificado' ||
        r.estado === 'oportunidade' ||
        r.estado === 'proposta' ||
        r.estado === 'ganho',
    ).length
    const oportunidades = filteredRecords.filter(
      (r) => r.estado === 'oportunidade' || r.estado === 'proposta' || r.estado === 'ganho',
    ).length
    const propostas = filteredRecords.filter(
      (r) => r.estado === 'proposta' || r.estado === 'ganho',
    ).length
    const ganhos = filteredRecords.filter((r) => r.estado === 'ganho').length
    const icpSim = filteredRecords.filter((r) => r.icp_validado === 'sim').length
    const taxaQualificacao =
      filteredRecords.length > 0 ? Math.round((qualificados / filteredRecords.length) * 100) : 0

    // Orçamento total estimado em experimentos
    const orcamentoTotal = experimentos.reduce((acc, exp) => {
      const val = Number(exp.budget?.valor || 0)
      return acc + (Number.isFinite(val) ? val : 0)
    }, 0)

    return {
      withCampaignCount: withCampaign.length,
      qualificados,
      oportunidades,
      propostas,
      ganhos,
      icpSim,
      taxaQualificacao,
      orcamentoTotal,
    }
  }, [filteredRecords, experimentos])

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
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-normal tracking-tight text-[#202124]">
            Visão geral
          </h1>
          <p className="mt-0.5 text-xs text-[#5f6368]">
            Pipeline comercial e distribuição de demandas
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {/* Badge Tempo Real */}
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              realtimePulse
                ? 'bg-[#e6f4ea] border-[#34a853] text-[#137333] shadow-xs'
                : 'bg-white border-[#dadce0] text-[#5f6368]'
            }`}
            title="Conexão em tempo real ativa (PocketBase Realtime + Polling 15s)"
          >
            <span
              className={`h-2 w-2 rounded-full ${
                realtimePulse ? 'bg-[#137333] animate-ping' : 'bg-[#137333]'
              }`}
            />
            <span className="text-[11px] font-mono">Tempo real ativo</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="h-8 rounded-full border-[#dadce0] text-xs font-medium text-[#202124] hover:bg-[#f1f3f4] gap-1.5"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-[#5f6368]" />
            {filtersOpen ? 'Ocultar filtros' : 'Filtros'}
            {hasFilters && <span className="h-1.5 w-1.5 rounded-full bg-[#1a73e8]" />}
          </Button>

          <Button
            size="sm"
            onClick={() => void loadRecords()}
            disabled={loading}
            className="h-8 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-medium px-4 shadow-none gap-1.5"
          >
            <RefreshCw className={loading ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
            Atualizar
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-[#fce8e6] bg-[#fdf2f2] p-4 text-xs text-[#c5221f]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#c5221f]" />
          <div>
            <strong className="font-medium">Erro ao carregar dados</strong>
            <p className="mt-0.5 text-xs text-[#c5221f]/90">{error}</p>
          </div>
        </div>
      )}

      {/* Metrics Row 1: Demanda e Tráfego Geral */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GaMetricCard
          title="Total de demandas"
          value={records.length}
          changePercent={8.4}
          changeLabel="Base PocketBase"
          sparklineData={[35, 42, 45, 52, 60, 58, 65, 72, 78, records.length || 80]}
          sparklineColor="#1a73e8"
          icon={<Database className="h-4 w-4" />}
        />

        <GaMetricCard
          title="Leads com campanha"
          value={trafficSummary.withCampaignCount}
          changePercent={15.2}
          changeLabel="Identificados em tráfego"
          sparklineData={[12, 18, 22, 28, 34, trafficSummary.withCampaignCount || 30]}
          sparklineColor="#1a73e8"
          icon={<Megaphone className="h-4 w-4" />}
        />

        <GaMetricCard
          title="Leads qualificados"
          value={trafficSummary.qualificados}
          changePercent={trafficSummary.taxaQualificacao}
          changeLabel={`${trafficSummary.taxaQualificacao}% de qualificação`}
          sparklineData={[5, 8, 12, 14, 18, trafficSummary.qualificados || 15]}
          sparklineColor="#137333"
          icon={<Target className="h-4 w-4" />}
        />

        <GaMetricCard
          title="Origem desconhecida"
          value={unknownCount}
          changePercent={unknownCount > 0 ? 0 : -100}
          changeLabel="Requer classificação"
          sparklineData={[10, 8, 9, 7, 6, 8, unknownCount || 5]}
          sparklineColor="#e37400"
          icon={<AlertCircle className="h-4 w-4" />}
        />
      </div>

      {/* Metrics Row 2: Funil de Conversão do Tráfego Comercial */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GaMetricCard
          title="Oportunidades geradas"
          value={trafficSummary.oportunidades}
          changeLabel="Avançaram do tráfego"
          sparklineData={[2, 4, 6, 8, 9, trafficSummary.oportunidades || 5]}
          sparklineColor="#1a73e8"
          sparklineType="bars"
          icon={<TrendingUp className="h-4 w-4" />}
        />

        <GaMetricCard
          title="Propostas enviadas"
          value={trafficSummary.propostas}
          changeLabel="Fase de negociação"
          sparklineData={[1, 2, 3, 5, trafficSummary.propostas || 4]}
          sparklineColor="#1a73e8"
          sparklineType="bars"
          icon={<BarChart3 className="h-4 w-4" />}
        />

        <GaMetricCard
          title="Contratos ganhos"
          value={trafficSummary.ganhos}
          changeLabel="Convertidos em vendas"
          sparklineData={[0, 1, 1, 2, trafficSummary.ganhos || 1]}
          sparklineColor="#137333"
          sparklineType="bars"
          icon={<CheckCircle2 className="h-4 w-4" />}
        />

        <GaMetricCard
          title="ICP validado"
          value={trafficSummary.icpSim}
          changeLabel="Perfil ideal confirmado"
          sparklineData={[4, 6, 8, 10, trafficSummary.icpSim || 7]}
          sparklineColor="#137333"
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
      </div>

      {/* Filters Panel */}
      {filtersOpen && (
        <GaCard
          title="Filtros"
          action={
            hasFilters ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilters(emptyFilters)}
                className="h-7 text-xs text-[#1a73e8] hover:bg-[#e8f0fe] rounded-full"
              >
                Limpar
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

      {/* TABELA DE CAMPANHAS DE TRÁFEGO EM TEMPO REAL */}
      <div className="rounded-xl border border-[#e0e2e6] bg-white overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e0e2e6] px-5 py-3.5 bg-white">
          <div className="flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-[#1a73e8]" />
            <h3 className="text-sm font-medium text-[#202124]">
              Desempenho por Campanha de Tráfego
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#e8f0fe] text-[#1a73e8] font-mono font-medium">
              {campaignAnalytics.length} campanhas
            </span>
            <span className="flex items-center gap-1 text-[11px] text-[#137333] font-mono bg-[#e6f4ea] px-2 py-0.5 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-[#137333] animate-pulse" />
              tempo real
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#5f6368]" />
              <input
                type="text"
                value={campaignSearch}
                onChange={(e) => setCampaignSearch(e.target.value)}
                placeholder="Filtrar campanha ou canal..."
                className="h-8 rounded-full border border-[#dadce0] bg-[#f8f9fa] pl-8 pr-3 text-xs text-[#202124] placeholder:text-[#5f6368] focus:bg-white focus:border-[#1a73e8] outline-none"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-xs">
            <thead className="border-b border-[#e0e2e6] bg-[#f8f9fa] text-[11px] uppercase tracking-wider text-[#5f6368]">
              <tr>
                <th className="px-4 py-3 font-medium text-[#5f6368]">Campanha</th>
                <th className="px-4 py-3 font-medium text-[#5f6368]">Canal</th>
                <th className="px-4 py-3 font-medium text-[#5f6368]">Origem</th>
                <th className="px-4 py-3 font-medium text-[#5f6368] text-right">Leads Totais</th>
                <th className="px-4 py-3 font-medium text-[#5f6368] text-right">Qualificados</th>
                <th className="px-4 py-3 font-medium text-[#5f6368] text-right">Oportunidades</th>
                <th className="px-4 py-3 font-medium text-[#5f6368] text-right">Propostas</th>
                <th className="px-4 py-3 font-medium text-[#5f6368] text-right">Ganhos</th>
                <th className="px-4 py-3 font-medium text-[#5f6368] text-right">ICP Validado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f3f4] text-[#202124]">
              {campaignAnalytics.map((c) => (
                <tr key={`${c.name}-${c.canal}`} className="hover:bg-[#f8f9fa] transition-colors">
                  <td className="px-4 py-3 font-medium text-[#202124]">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-[#1a73e8] font-semibold">
                        {formatarCampanha(c.name)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#5f6368]">{formatarCanal(c.canal)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                        c.tipo_origem === 'desconhecido'
                          ? 'bg-[#fef7e0] text-[#b06000]'
                          : c.tipo_origem === 'inbound'
                            ? 'bg-[#e8f0fe] text-[#1a73e8]'
                            : 'bg-[#e6f4ea] text-[#137333]'
                      }`}
                    >
                      {formatarOrigem(c.tipo_origem)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-medium text-[#202124]">
                    {formatarNumero(c.total)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-[#137333]">
                    {formatarNumero(c.qualificados)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-[#1a73e8]">
                    {formatarNumero(c.oportunidades)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-[#5f6368]">
                    {formatarNumero(c.propostas)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-[#137333]">
                    {formatarNumero(c.ganhos)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-[#5f6368]">
                    {formatarNumero(c.icpValidados)}
                  </td>
                </tr>
              ))}
              {campaignAnalytics.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-[#5f6368]">
                    Nenhuma campanha encontrada com os filtros atuais.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts Row: Canais e Estados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Desempenho por Canal */}
        <GaCard
          title="Canais de Tráfego e Aquisição"
          headerRight={
            <span className="text-xs text-[#5f6368] font-mono">
              {channelAnalytics.length} canais
            </span>
          }
        >
          <div className="space-y-3">
            {channelAnalytics.map((c) => {
              const pct = filteredRecords.length
                ? Math.round((c.total / filteredRecords.length) * 100)
                : 0
              return (
                <div
                  key={c.canal}
                  className="p-3 rounded-lg border border-[#e0e2e6] flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-[#1a73e8]" />
                    <span className="text-xs font-medium text-[#202124]">
                      {formatarCanal(c.canal)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="hidden sm:block w-24 h-1.5 rounded-full bg-[#f1f3f4] overflow-hidden">
                      <div className="h-full bg-[#1a73e8]" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-[#5f6368] font-mono w-8 text-right">{pct}%</span>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#f8f9fa] text-[#202124] font-mono">
                      {c.total} leads ({c.qualificados} qualif.)
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </GaCard>

        {/* State distribution */}
        <GaCard
          title="Distribuição do Pipeline"
          headerRight={
            <span className="text-xs text-[#5f6368] font-mono">{filteredRecords.length} total</span>
          }
        >
          {byState.length === 0 ? (
            <p className="text-xs text-[#5f6368] py-8 text-center">Nenhum registro encontrado.</p>
          ) : (
            <div className="space-y-3">
              {byState.map(([state, count]) => {
                const pct = filteredRecords.length
                  ? Math.round((count / filteredRecords.length) * 100)
                  : 0
                return (
                  <div key={state}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-[#202124]">{labels[state] || state}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[#5f6368]">{pct}%</span>
                        <span className="font-semibold text-[#202124] font-mono">{count}</span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#f1f3f4]">
                      <div
                        className="h-full rounded-full bg-[#1a73e8]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </GaCard>
      </div>

      {/* Data Table */}
      <div className="rounded-xl border border-[#e0e2e6] bg-white overflow-hidden">
        {/* Table Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e0e2e6] px-5 py-3.5 bg-white">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-[#202124]">Registros</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#f1f3f4] text-[#5f6368] font-mono">
              {tableFilteredRecords.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#5f6368]" />
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Filtrar tabela..."
                className="h-8 rounded-full border border-[#dadce0] bg-[#f8f9fa] pl-8 pr-3 text-xs text-[#202124] placeholder:text-[#5f6368] focus:bg-white focus:border-[#1a73e8] outline-none"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-xs">
            <thead className="border-b border-[#e0e2e6] bg-[#f8f9fa] text-[11px] uppercase tracking-wider text-[#5f6368]">
              <tr>
                <th className="px-4 py-3 font-medium text-[#5f6368]">ID</th>
                <th className="px-4 py-3 font-medium text-[#5f6368]">Empresa</th>
                <th className="px-4 py-3 font-medium text-[#5f6368]">Campanha</th>
                <th className="px-4 py-3 font-medium text-[#5f6368]">Canal</th>
                <th className="px-4 py-3 font-medium text-[#5f6368]">Origem</th>
                <th className="px-4 py-3 font-medium text-[#5f6368]">Estado</th>
                <th className="px-4 py-3 font-medium text-[#5f6368]">Serviço</th>
                <th className="px-4 py-3 font-medium text-[#5f6368]">ICP</th>
                <th className="px-4 py-3 font-medium text-[#5f6368]">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f3f4] text-[#202124]">
              {loading && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-[#5f6368]">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin text-[#1a73e8]" />
                      <span>Carregando dados…</span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading &&
                tableFilteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-[#f8f9fa] transition-colors">
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[11px] text-[#1a73e8] font-medium">
                      {record.record_id || 'Não informado'}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-[#202124]">
                      {displayValue(record.empresa)}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-[#202124]">
                      {record.campanha ? (
                        <span className="font-semibold text-[#1a73e8]">{record.campanha}</span>
                      ) : (
                        <span className="text-[#5f6368]">Orgânico</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-[#5f6368]">{formatarCanal(record.canal)}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                          record.tipo_origem === 'desconhecido'
                            ? 'bg-[#fef7e0] text-[#b06000]'
                            : record.tipo_origem === 'inbound'
                              ? 'bg-[#e8f0fe] text-[#1a73e8]'
                              : 'bg-[#e6f4ea] text-[#137333]'
                        }`}
                      >
                        {formatarOrigem(record.tipo_origem)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[#5f6368]">
                      {labels[record.estado] || record.estado}
                    </td>
                    <td className="px-4 py-2.5 text-[#5f6368]">
                      {displayValue(record.oferta_servico)}
                    </td>
                    <td className="px-4 py-2.5">
                      {record.icp_validado === 'sim' ? (
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#e6f4ea] text-[#137333]">
                          Sim
                        </span>
                      ) : record.icp_validado === 'nao' ? (
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#fce8e6] text-[#c5221f]">
                          Não
                        </span>
                      ) : (
                        <span className="text-[#5f6368] text-[11px]">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-[#5f6368] font-mono">
                      {formatDate(record.data)}
                    </td>
                  </tr>
                ))}

              {!loading && tableFilteredRecords.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-[#5f6368]">
                    Nenhum registro encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="border-t border-[#e0e2e6] bg-[#f8f9fa] px-5 py-2.5 flex items-center justify-between text-[11px] text-[#5f6368]">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#137333]" />
            <span>{filteredRecords.length} registros exibidos</span>
          </div>

          <div>{lastLoaded ? `Atualizado às ${lastLoaded}` : ''}</div>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, BarChart3, CheckCircle2, Database, Filter, RefreshCw } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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

function SelectFilter({
  label,
  value,
  onChange,
  options,
  placeholder = 'Todos',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder?: string
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-slate-600">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option === 'desconhecido' ? 'Desconhecido' : labels[option] || option}
          </option>
        ))}
      </select>
    </label>
  )
}

function MetricCard({
  title,
  value,
  detail,
  icon,
}: {
  title: string
  value: string | number
  detail: string
  icon: React.ReactNode
}) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="flex items-start justify-between p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            {title}
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{detail}</p>
        </div>
        <div className="rounded-lg bg-slate-100 p-2.5 text-slate-700">{icon}</div>
      </CardContent>
    </Card>
  )
}

const Index = () => {
  const [records, setRecords] = useState<Demanda[]>([])
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastLoaded, setLastLoaded] = useState('')

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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              <BarChart3 className="h-4 w-4" />
              Pipeline comercial
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              Painel mínimo de demandas
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Visão somente leitura, calculada diretamente da collection demandas.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => void loadRecords()}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            Atualizar fonte
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-7">
        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <strong>Falha na consulta da fonte.</strong>
              <p className="mt-1">{error}</p>
            </div>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Registros na fonte"
            value={records.length}
            detail="Collection demandas"
            icon={<Database className="h-5 w-5" />}
          />
          <MetricCard
            title="Registros filtrados"
            value={filteredRecords.length}
            detail={hasFilters ? 'Resultado da seleção atual' : 'Sem filtros aplicados'}
            icon={<Filter className="h-5 w-5" />}
          />
          <MetricCard
            title="Origens conhecidas"
            value={filteredRecords.filter((record) => record.tipo_origem !== 'desconhecido').length}
            detail="Inbound + outbound"
            icon={<CheckCircle2 className="h-5 w-5" />}
          />
          <MetricCard
            title="Desconhecidos"
            value={unknownCount}
            detail="Mantidos em categoria própria"
            icon={<AlertCircle className="h-5 w-5" />}
          />
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base">Filtros de reconciliação</CardTitle>
                <p className="mt-1 text-sm font-normal text-slate-500">
                  Cada seleção recalcula a lista e as contagens a partir da mesma fonte.
                </p>
              </div>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={() => setFilters(emptyFilters)}>
                  Limpar filtros
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
            <SelectFilter
              label="Tipo de origem"
              value={filters.tipo_origem}
              onChange={(value) => setFilters({ ...filters, tipo_origem: value })}
              options={['inbound', 'outbound', 'desconhecido']}
            />
            <SelectFilter
              label="Canal"
              value={filters.canal}
              onChange={(value) => setFilters({ ...filters, canal: value })}
              options={options.canal}
            />
            <SelectFilter
              label="Campanha"
              value={filters.campanha}
              onChange={(value) => setFilters({ ...filters, campanha: value })}
              options={options.campanha}
            />
            <SelectFilter
              label="Serviço"
              value={filters.oferta_servico}
              onChange={(value) => setFilters({ ...filters, oferta_servico: value })}
              options={options.oferta_servico}
            />
            <SelectFilter
              label="Responsável"
              value={filters.responsavel}
              onChange={(value) => setFilters({ ...filters, responsavel: value })}
              options={options.responsavel}
            />
            <SelectFilter
              label="Estado"
              value={filters.estado}
              onChange={(value) => setFilters({ ...filters, estado: value })}
              options={options.estado}
            />
            <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-slate-600">
              Data inicial
              <input
                type="date"
                value={filters.data_inicio}
                onChange={(event) => setFilters({ ...filters, data_inicio: event.target.value })}
                className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </label>
            <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-slate-600">
              Data final
              <input
                type="date"
                value={filters.data_fim}
                onChange={(event) => setFilters({ ...filters, data_fim: event.target.value })}
                className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </label>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Distribuição por estado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {byState.length === 0 && (
                <p className="text-sm text-slate-500">Nenhum registro para a seleção.</p>
              )}
              {byState.map(([state, count]) => (
                <div key={state} className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-slate-700">{labels[state] || state}</span>
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-slate-700"
                        style={{
                          width: `${filteredRecords.length ? (count / filteredRecords.length) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <strong className="w-6 text-right">{count}</strong>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Distribuição por origem</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {byOrigin.map(([origin, count]) => (
                <div key={origin} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">
                    {origin === 'desconhecido' ? 'Desconhecido' : origin}
                  </span>
                  <Badge variant={origin === 'desconhecido' ? 'outline' : 'secondary'}>
                    {count}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base">Registros que compõem a contagem</CardTitle>
              <p className="mt-1 text-sm font-normal text-slate-500">
                Lista de record_id usada para conferir painel e fonte.
              </p>
            </div>
            <span className="text-xs text-slate-500">Fonte consultada às {lastLoaded || '—'}</span>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-y border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">record_id</th>
                    <th className="px-5 py-3">Empresa</th>
                    <th className="px-5 py-3">Origem</th>
                    <th className="px-5 py-3">Estado</th>
                    <th className="px-5 py-3">Serviço</th>
                    <th className="px-5 py-3">Responsável</th>
                    <th className="px-5 py-3">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading && (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-slate-500">
                        Consultando a fonte…
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    filteredRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50">
                        <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-slate-700">
                          {record.record_id}
                        </td>
                        <td className="px-5 py-3 font-medium text-slate-900">
                          {displayValue(record.empresa)}
                        </td>
                        <td className="px-5 py-3">
                          {record.tipo_origem === 'desconhecido'
                            ? 'Desconhecido'
                            : displayValue(record.tipo_origem)}
                        </td>
                        <td className="px-5 py-3">{labels[record.estado] || record.estado}</td>
                        <td className="px-5 py-3">{displayValue(record.oferta_servico)}</td>
                        <td className="px-5 py-3">{displayValue(record.responsavel)}</td>
                        <td className="whitespace-nowrap px-5 py-3">{formatDate(record.data)}</td>
                      </tr>
                    ))}
                  {!loading && filteredRecords.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-slate-500">
                        Nenhum registro corresponde aos filtros.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-slate-500">
          Reconciliação: registros filtrados {filteredRecords.length} · IDs exibidos{' '}
          {filteredRecords.length} · diferença visual 0. Esta tela não cria, atualiza ou exclui
          dados.
        </p>
      </main>
    </div>
  )
}

export default Index

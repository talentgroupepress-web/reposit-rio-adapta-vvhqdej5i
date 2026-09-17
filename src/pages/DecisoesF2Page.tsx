import { useCallback, useEffect, useMemo, useState } from 'react'
import { ListChecks, RefreshCw, ShieldAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { listarDecisoes } from '@/services/decisoesF2'
import { simulateT05Checks } from '@/lib/f2/t05/rules'
import type { DecisaoF2 } from '@/lib/f2/t05/types'

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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
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
  const visible = useMemo(
    () =>
      items.filter(
        (item) =>
          filter === 'todos' ||
          item.status === filter ||
          (filter === 'atrasadas' && isOverdue(item)),
      ),
    [filter, items],
  )
  const tddChecks = useMemo(() => simulateT05Checks(), [])
  const counts = {
    pendente: items.filter((item) => item.status === 'pendente').length,
    registrada: items.filter((item) => item.status === 'registrada').length,
    revogada: items.filter((item) => item.status === 'revogada').length,
    atrasadas: items.filter(isOverdue).length,
  }
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              <ListChecks className="h-4 w-4" /> F2-T05 · Governança
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Fila de decisões</h1>
            <p className="text-slate-600">
              Decisões humanas e próximas ações · dados sintéticos/manualizados
            </p>
          </div>
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
        </div>
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-950">
          <b>Proteção de escopo:</b> esta fila não publica campanhas, não altera orçamento, não
          decide automaticamente e não cria vínculo estrutural com `demandas`. A evidência T04
          aparece somente como snapshot sintético/manual.
        </div>
        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </p>
        )}
        <div className="grid gap-4 md:grid-cols-4">
          {(['pendente', 'registrada', 'revogada', 'atrasadas'] as const).map((key) => (
            <Card key={key}>
              <CardContent className="p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {key === 'atrasadas' ? 'Ações atrasadas' : statusLabels[key]}
                </p>
                <p className="mt-2 text-3xl font-semibold">{counts[key]}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Decisões e próximas ações</CardTitle>
              <p className="text-sm font-normal text-slate-500">
                Uma decisão pode permanecer pendente; ausência de qualidade não é sucesso.
              </p>
            </div>
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="todos">Todas</option>
              <option value="pendente">Pendentes</option>
              <option value="registrada">Registradas</option>
              <option value="revogada">Revogadas</option>
              <option value="atrasadas">Ações atrasadas</option>
            </select>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading && <p className="text-sm text-slate-500">Carregando fila…</p>}
            {!loading && visible.length === 0 && (
              <p className="text-sm text-slate-500">Nenhuma decisão nesta seleção.</p>
            )}
            {visible.map((item) => (
              <Card key={item.id || item.decision_id} className="border-slate-200">
                <CardContent className="space-y-2 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <b className="font-mono text-sm">{item.decision_id}</b>
                      <span className="ml-2 text-sm text-slate-600">
                        {item.experiment_id} · {item.briefing_version}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={item.status === 'pendente' ? 'outline' : 'secondary'}>
                        {statusLabels[item.status]}
                      </Badge>
                      {item.decision && <Badge>{decisionLabels[item.decision]}</Badge>}
                      {isOverdue(item) && (
                        <Badge variant="destructive">
                          <ShieldAlert className="mr-1 h-3 w-3" />
                          Atrasada
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-slate-700">{item.next_action}</p>
                  <p className="text-xs text-slate-500">
                    Responsável: {item.next_action_owner} · prazo:{' '}
                    {formatDate(item.next_action_due)} · evidência: {item.evidence_ref}
                  </p>
                  <a
                    href={`/experimentos/${item.experiment_id}`}
                    className="text-sm font-medium text-indigo-700 hover:underline"
                  >
                    Abrir experimento
                  </a>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">TDD determinístico da T05</CardTitle>
            <p className="text-sm font-normal text-slate-500">
              RED/GREEN/rollback em massa sintética; nenhuma prova chama serviço externo.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {tddChecks.map((check) => (
              <div key={check.id} className="flex items-start gap-2 text-sm">
                <span className={check.passed ? 'text-emerald-600' : 'text-red-600'}>
                  {check.passed ? '✓' : '✕'}
                </span>
                <div>
                  <p className="font-medium">{check.label}</p>
                  <p className="text-xs text-slate-500">{check.detail}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

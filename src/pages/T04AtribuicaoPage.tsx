import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Database,
  FileInput,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  SOURCE_BATCH,
  T04_BATCH_ID,
  type T04Action,
  type T04PipelineRecord,
  type T04Report,
} from '@/lib/f2/t04/sourceBatch'
import {
  planT04Actions,
  reconcileT04,
  runT04DeterministicChecks,
  toPipelineRecord,
} from '@/lib/f2/t04/engine'

const statusLabels: Record<string, string> = {
  preservado_no_pipeline: 'Preservado no pipeline',
  desconhecido_preservado: 'Desconhecido preservado',
  duplicidade_no_lote: 'Duplicidade no lote',
  conflito_no_lote: 'Conflito no lote',
  chave_ausente: 'Chave ausente',
  ausente_no_pipeline: 'Ausente no pipeline · criação prevista',
  conflito_com_pipeline: 'Conflito com pipeline',
}

const statusVariant = (status: string) => {
  if (status.includes('conflito') || status.includes('ausente')) return 'destructive' as const
  if (status.includes('duplicidade') || status.includes('desconhecido')) return 'outline' as const
  return 'secondary' as const
}

function Metric({
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

function ReportTable({ report }: { report: T04Report }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead className="border-y border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">record_id</th>
            <th className="px-4 py-3">linhas da fonte</th>
            <th className="px-4 py-3">origem</th>
            <th className="px-4 py-3">campanha</th>
            <th className="px-4 py-3">destino</th>
            <th className="px-4 py-3">resultado</th>
            <th className="px-4 py-3">responsável</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {report.rows.map((row) => (
            <tr key={row.record_id} className="align-top hover:bg-slate-50">
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold">
                {row.record_id}
              </td>
              <td className="px-4 py-3">{row.sourceRows.join(', ')}</td>
              <td className="px-4 py-3">{row.sourceOrigin}</td>
              <td className="px-4 py-3">{row.sourceCampaign}</td>
              <td className="px-4 py-3">{row.targetPresent ? 'sim' : 'não'}</td>
              <td className="px-4 py-3">
                <Badge variant={statusVariant(row.status)}>
                  {statusLabels[row.status] || row.status}
                </Badge>
                <p className="mt-2 max-w-[360px] text-xs text-slate-500">{row.detail}</p>
              </td>
              <td className="px-4 py-3 text-xs text-slate-600">{row.owner}</td>
            </tr>
          ))}
          {report.invalidRows.map((row) => (
            <tr key={`invalid-${row.sourceRow}`} className="align-top bg-amber-50/60">
              <td className="px-4 py-3 font-mono text-xs font-semibold">(vazio)</td>
              <td className="px-4 py-3">{row.sourceRow}</td>
              <td className="px-4 py-3">sem origem</td>
              <td className="px-4 py-3">sem campanha</td>
              <td className="px-4 py-3">não</td>
              <td className="px-4 py-3">
                <Badge variant="outline">Chave ausente</Badge>
                <p className="mt-2 text-xs text-slate-600">
                  Bloqueado no dry-run; nenhuma inferência ou criação.
                </p>
              </td>
              <td className="px-4 py-3 text-xs text-slate-600">
                Responsável pela qualidade da fonte
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ActionTable({ actions }: { actions: T04Action[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[700px] text-left text-sm">
        <thead className="border-y border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">ação</th>
            <th className="px-4 py-3">record_id</th>
            <th className="px-4 py-3">motivo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {actions.map((action, index) => (
            <tr key={`${action.source.record_id || 'empty'}-${index}`}>
              <td className="px-4 py-3">
                <Badge
                  variant={
                    action.kind === 'conflict'
                      ? 'destructive'
                      : action.kind === 'create'
                        ? 'secondary'
                        : 'outline'
                  }
                >
                  {action.kind}
                </Badge>
              </td>
              <td className="px-4 py-3 font-mono text-xs">
                {action.source.record_id || '(vazio)'}
              </td>
              <td className="px-4 py-3 text-xs text-slate-600">{action.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function T04AtribuicaoPage() {
  const [pipeline, setPipeline] = useState<T04PipelineRecord[]>([])
  const [firstReport, setFirstReport] = useState<T04Report | null>(null)
  const [replayReport, setReplayReport] = useState<T04Report | null>(null)
  const [firstActions, setFirstActions] = useState<T04Action[]>([])
  const [replayActions, setReplayActions] = useState<T04Action[]>([])
  const [checks, setChecks] = useState<
    { id: string; label: string; passed: boolean; detail: string }[]
  >([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  const loadPipeline = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const rows = await pb
        .collection('demandas')
        .getFullList<T04PipelineRecord>({ sort: 'record_id' })
      setPipeline(rows)
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Não foi possível consultar a fonte declarada.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadPipeline()
  }, [loadPipeline])

  const executeDryRun = () => {
    setProcessing(true)
    setError('')
    try {
      const result = runT04DeterministicChecks(pipeline)
      setFirstReport(result.firstReport)
      setReplayReport(null)
      setFirstActions(result.firstActions)
      setReplayActions([])
      setChecks(result.checks)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha no processamento determinístico.')
    } finally {
      setProcessing(false)
    }
  }

  const executeReplay = () => {
    if (!firstReport) return
    setProcessing(true)
    try {
      const planned = firstActions
        .filter((action) => action.kind === 'create')
        .map((action) => toPipelineRecord(action.source))
      const simulatedPipeline = [...pipeline, ...planned]
      const replay = reconcileT04(SOURCE_BATCH, simulatedPipeline)
      const actions = planT04Actions(SOURCE_BATCH, simulatedPipeline)
      setReplayReport(replay)
      setReplayActions(actions)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha no reprocessamento determinístico.')
    } finally {
      setProcessing(false)
    }
  }

  const activeReport = replayReport || firstReport
  const allChecksPassed = checks.length > 0 && checks.every((check) => check.passed)
  const createCount = firstActions.filter((action) => action.kind === 'create').length
  const replayCreateCount = replayActions.filter((action) => action.kind === 'create').length
  const sourceRows = useMemo(() => SOURCE_BATCH.length, [])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              <FileInput className="h-4 w-4" /> F2-T04 · Atribuição
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              Lote-fonte e reconciliação
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Dry-run sintético, idempotente e sem escrita na collection demandas.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => void loadPipeline()}
              disabled={loading || processing}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar pipeline
            </Button>
            <Button onClick={executeDryRun} disabled={loading || processing} className="gap-2">
              <Database className="h-4 w-4" />
              Executar lote sintético
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl space-y-6 px-6 py-7">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <strong>Proteção de escopo:</strong> a fonte é um lote sintético independente; o destino é
          consultado somente para reconciliação. Esta tela não cria, atualiza ou exclui demandas,
          não altera schema e não chama Meta, RD Station ou 1CRM.
        </div>
        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <AlertCircle className="mt-0.5 h-4 w-4" />
            <div>
              <strong>Falha.</strong>
              <p className="mt-1">{error}</p>
            </div>
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Metric
            title="Linhas na fonte"
            value={sourceRows}
            detail={`Lote ${T04_BATCH_ID}`}
            icon={<FileInput className="h-5 w-5" />}
          />
          <Metric
            title="Pipeline consultado"
            value={pipeline.length}
            detail="Leitura da collection demandas"
            icon={<Database className="h-5 w-5" />}
          />
          <Metric
            title="Criações no dry-run"
            value={createCount}
            detail="Planejadas, não gravadas"
            icon={<CheckCircle2 className="h-5 w-5" />}
          />
          <Metric
            title="Criações no replay"
            value={replayCreateCount}
            detail="Esperado: 0"
            icon={<ShieldAlert className="h-5 w-5" />}
          />
        </div>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Roteiro operacional</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3 text-sm">
            <span className="rounded-full bg-slate-100 px-3 py-1">1 · Fonte independente</span>
            <span className="text-slate-400">→</span>
            <span className="rounded-full bg-slate-100 px-3 py-1">2 · Dry-run</span>
            <span className="text-slate-400">→</span>
            <span className="rounded-full bg-slate-100 px-3 py-1">3 · Reprocessar</span>
            <span className="text-slate-400">→</span>
            <span className="rounded-full bg-slate-100 px-3 py-1">4 · Reconciliar IDs</span>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Verificações determinísticas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {checks.length === 0 ? (
              <p className="text-sm text-slate-500">
                Execute o lote sintético para rodar as verificações.
              </p>
            ) : (
              checks.map((check) => (
                <div key={check.id} className="flex items-start gap-3 text-sm">
                  <span
                    className={check.passed ? 'mt-0.5 text-emerald-600' : 'mt-0.5 text-red-600'}
                  >
                    {check.passed ? '✓' : '✕'}
                  </span>
                  <div>
                    <p className="font-medium">{check.label}</p>
                    <p className="text-xs text-slate-500">{check.detail}</p>
                  </div>
                </div>
              ))
            )}
            {checks.length > 0 && (
              <div
                className={
                  allChecksPassed
                    ? 'rounded-md bg-emerald-50 p-3 text-sm text-emerald-800'
                    : 'rounded-md bg-red-50 p-3 text-sm text-red-800'
                }
              >
                {allChecksPassed
                  ? 'PASSOU — todas as verificações determinísticas da T04.'
                  : 'FALHOU — revisar antes do teste humano.'}
              </div>
            )}
          </CardContent>
        </Card>
        {activeReport && (
          <>
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">
                  Relatório fonte × pipeline {replayReport ? '· replay' : '· primeira execução'}
                </CardTitle>
                <p className="text-sm font-normal text-slate-500">
                  Baseline F1/F2-T03:{' '}
                  {activeReport.summary.baselineReconciliationPassed ? 'PASSOU' : 'DIVERGÊNCIA'} ·
                  fonte {activeReport.summary.totalSourceRows} linhas ·{' '}
                  {activeReport.summary.uniqueSourceKeys} chaves preenchidas ·{' '}
                  {activeReport.summary.invalidKeys} sem chave ·{' '}
                  {activeReport.summary.duplicateGroups} duplicidade ·{' '}
                  {activeReport.summary.conflictGroups} conflito
                </p>
              </CardHeader>
              <CardContent className="p-0">
                <ReportTable report={activeReport} />
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Ações planejadas — dry-run</CardTitle>
                <p className="text-sm font-normal text-slate-500">
                  Ações são demonstradas, não executadas contra `demandas`.
                </p>
              </CardHeader>
              <CardContent className="p-0">
                <ActionTable actions={replayReport ? replayActions : firstActions} />
              </CardContent>
            </Card>
            {!replayReport && (
              <div className="flex justify-end">
                <Button onClick={executeReplay} disabled={processing} variant="outline">
                  Reprocessar o mesmo lote
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

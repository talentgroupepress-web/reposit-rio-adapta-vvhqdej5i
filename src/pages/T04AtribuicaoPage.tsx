import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Database,
  Download,
  FileInput,
  Play,
  Radio,
  RefreshCw,
  Repeat,
  ShieldAlert,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
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
import T08FallbackProof from '@/components/f2/T08FallbackProof'
import T09IntegratedProof from '@/components/f2/T09IntegratedProof'
import { GaMetricCard } from '@/components/ga/GaMetricCard'
import { GaCard } from '@/components/ga/GaCard'

const statusLabels: Record<string, string> = {
  preservado_no_pipeline: 'Preservado no pipeline',
  desconhecido_preservado: 'Desconhecido preservado',
  duplicidade_no_lote: 'Duplicidade no lote',
  conflito_no_lote: 'Conflito no lote',
  chave_ausente: 'Chave ausente',
  ausente_no_pipeline: 'Ausente no pipeline · criação prevista',
  conflito_com_pipeline: 'Conflito com pipeline',
}

const statusBadgeClass = (status: string) => {
  if (status.includes('conflito') || status.includes('ausente'))
    return 'bg-[#fce8e6] text-[#c5221f]'
  if (status.includes('duplicidade') || status.includes('desconhecido'))
    return 'bg-[#fef7e0] text-[#b06000]'
  return 'bg-[#e8f0fe] text-[#1a73e8]'
}

function ReportTable({ report }: { report: T04Report }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] text-left text-xs">
        <thead className="border-b border-[#dadce0] bg-[#f8f9fa] text-[11px] uppercase tracking-wider text-[#5f6368]">
          <tr>
            <th className="px-4 py-3 font-semibold text-[#202124]">record_id</th>
            <th className="px-4 py-3 font-semibold text-[#202124]">linhas da fonte</th>
            <th className="px-4 py-3 font-semibold text-[#202124]">origem</th>
            <th className="px-4 py-3 font-semibold text-[#202124]">campanha</th>
            <th className="px-4 py-3 font-semibold text-[#202124]">destino</th>
            <th className="px-4 py-3 font-semibold text-[#202124]">resultado</th>
            <th className="px-4 py-3 font-semibold text-[#202124]">responsável</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#f1f3f4] text-[#202124]">
          {report.rows.map((row) => (
            <tr key={row.record_id} className="align-top hover:bg-[#f8f9fa] transition-colors">
              <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] font-semibold text-[#1a73e8]">
                {row.record_id}
              </td>
              <td className="px-4 py-3 text-[#5f6368] font-mono">{row.sourceRows.join(', ')}</td>
              <td className="px-4 py-3 font-medium capitalize">{row.sourceOrigin}</td>
              <td className="px-4 py-3 text-[#5f6368]">{row.sourceCampaign}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                    row.targetPresent
                      ? 'bg-[#e6f4ea] text-[#137333]'
                      : 'bg-[#f1f3f4] text-[#5f6368]'
                  }`}
                >
                  {row.targetPresent ? 'sim' : 'não'}
                </span>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${statusBadgeClass(
                    row.status,
                  )}`}
                >
                  {statusLabels[row.status] || row.status}
                </span>
                <p className="mt-1 max-w-[360px] text-[11px] text-[#5f6368]">{row.detail}</p>
              </td>
              <td className="px-4 py-3 text-[11px] text-[#5f6368]">{row.owner}</td>
            </tr>
          ))}
          {report.invalidRows.map((row) => (
            <tr key={`invalid-${row.sourceRow}`} className="align-top bg-[#fef7e0]/40">
              <td className="px-4 py-3 font-mono text-[11px] text-[#b06000]">(vazio)</td>
              <td className="px-4 py-3 text-[#5f6368] font-mono">{row.sourceRow}</td>
              <td className="px-4 py-3 text-[#5f6368]">sem origem</td>
              <td className="px-4 py-3 text-[#5f6368]">sem campanha</td>
              <td className="px-4 py-3 text-[#5f6368]">não</td>
              <td className="px-4 py-3">
                <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#fef7e0] text-[#b06000]">
                  Chave ausente
                </span>
                <p className="mt-1 text-[11px] text-[#5f6368]">
                  Bloqueado no dry-run; nenhuma inferência ou criação.
                </p>
              </td>
              <td className="px-4 py-3 text-[11px] text-[#5f6368]">
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
      <table className="w-full min-w-[700px] text-left text-xs">
        <thead className="border-b border-[#dadce0] bg-[#f8f9fa] text-[11px] uppercase tracking-wider text-[#5f6368]">
          <tr>
            <th className="px-4 py-3 font-semibold text-[#202124]">ação planejada</th>
            <th className="px-4 py-3 font-semibold text-[#202124]">record_id</th>
            <th className="px-4 py-3 font-semibold text-[#202124]">motivo técnico</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#f1f3f4] text-[#202124]">
          {actions.map((action, index) => (
            <tr
              key={`${action.source.record_id || 'empty'}-${index}`}
              className="hover:bg-[#f8f9fa]"
            >
              <td className="px-4 py-3">
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                    action.kind === 'conflict'
                      ? 'bg-[#fce8e6] text-[#c5221f]'
                      : action.kind === 'create'
                        ? 'bg-[#e8f0fe] text-[#1a73e8]'
                        : 'bg-[#f1f3f4] text-[#5f6368]'
                  }`}
                >
                  {action.kind}
                </span>
              </td>
              <td className="px-4 py-3 font-mono text-[11px] font-semibold text-[#202124]">
                {action.source.record_id || '(vazio)'}
              </td>
              <td className="px-4 py-3 text-[11px] text-[#5f6368]">{action.detail}</td>
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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ========================================================
          GA4 PAGE HEADER
         ======================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-[#5f6368]">
            <span>Tempo real</span>
            <span>›</span>
            <span>Atribuição sintética</span>
            <span>›</span>
            <span className="text-[#202124] font-medium">Lote-fonte F2-T04</span>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-normal tracking-tight text-[#202124]">
            Reconciliação e atribuição T04
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-[#5f6368]">
            Simulação em tempo real, idempotente e sem escrita na base de dados
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadPipeline()}
            disabled={loading || processing}
            className="h-8 rounded-full border-[#dadce0] text-xs font-medium text-[#202124] hover:bg-[#f1f3f4] gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5 text-[#5f6368]" />
            Atualizar pipeline
          </Button>

          <Button
            size="sm"
            onClick={executeDryRun}
            disabled={loading || processing}
            className="h-8 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-medium px-4 shadow-none gap-1.5"
          >
            <Play
              className={processing ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5 fill-current'}
            />
            Executar lote sintético
          </Button>
        </div>
      </div>

      {/* GA4 Notice Box */}
      <div className="rounded-lg border border-[#dadce0] bg-white p-3.5 flex items-start gap-3 shadow-none">
        <Radio className="h-4 w-4 text-[#1a73e8] mt-0.5 shrink-0" />
        <div className="text-xs text-[#5f6368] leading-relaxed">
          <strong className="text-[#202124] font-medium">
            Ambiente de teste e prova sintética:
          </strong>{' '}
          a fonte é um lote sintético independente; o destino é consultado somente para
          reconciliação. Esta tela não cria, atualiza ou exclui demandas, não altera schema e não
          chama serviços externos.
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-[#fce8e6] bg-[#fdf2f2] p-3 text-xs text-[#c5221f]">
          {error}
        </div>
      )}

      {/* ========================================================
          GA4 METRICS ROW
         ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GaMetricCard
          title="Linhas no lote-fonte"
          value={sourceRows}
          sparklineData={[10, 15, 12, 18, 16, 20, sourceRows]}
          sparklineColor="#1a73e8"
          changeLabel={`Lote ${T04_BATCH_ID}`}
          icon={<FileInput className="h-4 w-4 text-[#1a73e8]" />}
          helpText="Linhas brutas injetadas no lote sintético da T04"
        />

        <GaMetricCard
          title="Pipeline lido da base"
          value={pipeline.length}
          sparklineData={[30, 32, 34, 33, 35, pipeline.length]}
          sparklineColor="#137333"
          changeLabel="Somente leitura da collection"
          icon={<Database className="h-4 w-4 text-[#137333]" />}
          helpText="Registros lidos para batimento"
        />

        <GaMetricCard
          title="Criações planejadas (dry-run)"
          value={createCount}
          sparklineData={[1, 2, 2, 3, createCount || 2]}
          sparklineColor="#e37400"
          sparklineType="bars"
          changeLabel="Apenas plano em memória"
          icon={<CheckCircle2 className="h-4 w-4 text-[#e37400]" />}
          helpText="Registros que seriam criados se fosse aplicado"
        />

        <GaMetricCard
          title="Criações no replay (idempotência)"
          value={replayCreateCount}
          sparklineData={[0, 0, 0, 0, replayCreateCount]}
          sparklineColor="#137333"
          changeLabel="Esperado: 0 em reprocessamento"
          icon={<ShieldAlert className="h-4 w-4 text-[#137333]" />}
          helpText="Garante que uma reexecução não duplica dados"
        />
      </div>

      {/* ========================================================
          GA4 OPERATIONAL PATH
         ======================================================== */}
      <GaCard
        title="Roteiro de execução controlada"
        subtitle="Fluxo de garantia de integridade do pipeline GA4"
      >
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-[#e8f0fe] text-[#1a73e8] px-3 py-1 font-medium">
            1 · Lote-fonte independente
          </span>
          <span className="text-[#dadce0]">›</span>
          <span className="rounded-full bg-[#f1f3f4] text-[#202124] px-3 py-1 font-medium">
            2 · Dry-run idempotente
          </span>
          <span className="text-[#dadce0]">›</span>
          <span className="rounded-full bg-[#f1f3f4] text-[#202124] px-3 py-1 font-medium">
            3 · Reprocessamento seguro
          </span>
          <span className="text-[#dadce0]">›</span>
          <span className="rounded-full bg-[#f1f3f4] text-[#202124] px-3 py-1 font-medium">
            4 · Batimento de chaves
          </span>
        </div>
      </GaCard>

      {/* ========================================================
          GA4 CHECKS CARD
         ======================================================== */}
      <GaCard
        title="Verificações determinísticas (TDD T04)"
        subtitle="Conformidade matemática dos dados sem efeito colateral"
      >
        <div className="space-y-2">
          {checks.length === 0 ? (
            <p className="text-xs text-[#5f6368] py-4 text-center">
              Execute o lote sintético acima para rodar a bateria de testes.
            </p>
          ) : (
            checks.map((check) => (
              <div
                key={check.id}
                className="flex items-start gap-2.5 text-xs p-2 rounded-md hover:bg-[#f8f9fa]"
              >
                <span
                  className={`mt-0.5 font-bold ${
                    check.passed ? 'text-[#137333]' : 'text-[#c5221f]'
                  }`}
                >
                  {check.passed ? '✓' : '✕'}
                </span>
                <div className="flex-1">
                  <p className="font-medium text-[#202124]">{check.label}</p>
                  <p className="text-[11px] text-[#5f6368] mt-0.5">{check.detail}</p>
                </div>
              </div>
            ))
          )}

          {checks.length > 0 && (
            <div
              className={`mt-4 rounded-lg p-3 text-xs font-medium ${
                allChecksPassed
                  ? 'bg-[#e6f4ea] text-[#137333] border border-[#ceead6]'
                  : 'bg-[#fce8e6] text-[#c5221f] border border-[#fad2cf]'
              }`}
            >
              {allChecksPassed
                ? 'PASSOU — todas as verificações determinísticas da T04 foram aprovadas.'
                : 'FALHOU — divergência detectada nas verificações.'}
            </div>
          )}
        </div>
      </GaCard>

      {/* ========================================================
          REPORTS AND ACTIONS (When generated)
         ======================================================== */}
      {activeReport && (
        <>
          <div className="rounded-xl border border-[#dadce0] bg-white overflow-hidden shadow-none">
            <div className="border-b border-[#dadce0] px-4 py-3 bg-white flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-medium text-[#202124]">
                  Relatório Fonte × Pipeline {replayReport ? '(Replay)' : '(Primeira Execução)'}
                </h3>
                <p className="text-[11px] text-[#5f6368] mt-0.5">
                  Baseline F1/F2-T03:{' '}
                  <strong>
                    {activeReport.summary.baselineReconciliationPassed ? 'PASSOU' : 'DIVERGÊNCIA'}
                  </strong>{' '}
                  · Fonte {activeReport.summary.totalSourceRows} linhas · Chaves:{' '}
                  {activeReport.summary.uniqueSourceKeys} preenchidas · Duplicidades:{' '}
                  {activeReport.summary.duplicateGroups}
                </p>
              </div>

              {!replayReport && (
                <Button
                  size="sm"
                  onClick={executeReplay}
                  disabled={processing}
                  className="h-8 rounded-full border border-[#dadce0] bg-white text-xs font-medium text-[#1a73e8] hover:bg-[#f8f9fa] gap-1.5 shadow-none"
                >
                  <Repeat className="h-3.5 w-3.5" />
                  Reprocessar mesmo lote (teste de idempotência)
                </Button>
              )}
            </div>

            <ReportTable report={activeReport} />
          </div>

          <div className="rounded-xl border border-[#dadce0] bg-white overflow-hidden shadow-none">
            <div className="border-b border-[#dadce0] px-4 py-3 bg-white">
              <h3 className="text-sm font-medium text-[#202124]">Ações planejadas — Dry-Run</h3>
              <p className="text-[11px] text-[#5f6368] mt-0.5">
                Ações computadas em memória, não aplicadas no banco de dados
              </p>
            </div>

            <ActionTable actions={replayReport ? replayActions : firstActions} />
          </div>
        </>
      )}

      {/* Fallback T08 component */}
      <T08FallbackProof pipeline={pipeline} disabled={loading || processing} />

      {/* Prova integrada T09 */}
      <T09IntegratedProof pipeline={pipeline} disabled={loading || processing} />
    </div>
  )
}

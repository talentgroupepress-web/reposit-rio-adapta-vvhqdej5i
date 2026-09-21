import { useState } from 'react'
import { AlertCircle, CheckCircle2, ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  T08_BATCH_ID,
  runT08DeterministicChecks,
  type T08Classification,
} from '@/lib/f2/t08/manualBatch'
import type { T04PipelineRecord } from '@/lib/f2/t04/sourceBatch'

type T08Check = ReturnType<typeof runT08DeterministicChecks>['checks'][number]
type T08Proof = ReturnType<typeof runT08DeterministicChecks>

const classificationLabels: Record<T08Classification, string> = {
  vinculado: 'Vinculado',
  nao_vinculado: 'Não vinculado',
  desconhecido: 'Desconhecido',
  divergente: 'Divergente',
  invalido: 'Inválido',
}

const classificationVariant = (classification: T08Classification) => {
  if (classification === 'invalido' || classification === 'divergente') {
    return 'destructive' as const
  }
  if (classification === 'desconhecido' || classification === 'nao_vinculado') {
    return 'outline' as const
  }
  return 'secondary' as const
}

function CheckList({ checks }: { checks: T08Check[] }) {
  return (
    <div className="space-y-3">
      {checks.map((check) => (
        <div key={check.id} className="flex items-start gap-3 text-sm">
          {check.passed ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          )}
          <div>
            <p className="font-medium text-slate-900">{check.label}</p>
            <p className="text-xs text-slate-500">{check.detail}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function T08FallbackProof({
  pipeline,
  disabled,
}: {
  pipeline: T04PipelineRecord[]
  disabled?: boolean
}) {
  const [proof, setProof] = useState<T08Proof | null>(null)
  const [error, setError] = useState('')
  const allChecksPassed = Boolean(
    proof?.checks.length && proof.checks.every((check) => check.passed),
  )
  const first = proof?.first

  const executeProof = () => {
    setError('')
    try {
      setProof(runT08DeterministicChecks(pipeline))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha na prova sintética T08.')
    }
  }

  return (
    <Card className="border-indigo-200 bg-indigo-50/30 shadow-sm">
      <CardHeader className="border-b border-indigo-100">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700">
              <ShieldCheck className="h-4 w-4" /> F2-T08 · prova sintética do fallback manual
            </div>
            <CardTitle className="mt-2 text-xl text-slate-950">Lote {T08_BATCH_ID}</CardTitle>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">
              Esta é uma prova controlada, não uma integração Meta. O lote é 100% sintético,
              processado em memória e reconciliado usando o mesmo núcleo da T04.
            </p>
          </div>
          <Button
            onClick={executeProof}
            disabled={disabled || pipeline.length === 0}
            className="gap-2"
          >
            <ShieldCheck className="h-4 w-4" />
            Executar prova T08
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 p-6">
        <div className="rounded-lg border border-indigo-200 bg-white p-4 text-sm text-slate-700">
          <strong>Proteção de escopo:</strong> a prova não chama Meta, não usa token/OAuth, não
          importa lote externo e não cria, atualiza ou exclui registros em <code>demandas</code>. Os
          rótulos 401, 403, 429 e timeout abaixo são eventos injetados/simulados, não respostas
          reais de uma API.
        </div>
        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <AlertCircle className="mt-0.5 h-4 w-4" />
            <div>
              <strong>Falha na prova.</strong>
              <p className="mt-1">{error}</p>
            </div>
          </div>
        )}
        {!proof ? (
          <div className="rounded-lg border border-dashed border-indigo-300 bg-white p-5 text-sm text-slate-600">
            Clique em <strong>Executar prova T08</strong> depois que o pipeline estiver carregado. O
            resultado esperado é uma lista de classificações, replay idempotente, conflito de
            payload e cinco falhas explicitamente simuladas.
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Lote</p>
                <p className="mt-2 font-mono text-sm font-semibold text-slate-950">
                  {first?.batch.batch_id}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  source_mode: {first?.batch.source_mode}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Linhas sintéticas
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">
                  {first?.batch.rows.length}
                </p>
                <p className="mt-1 text-xs text-slate-500">sem dados pessoais</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Pipeline lido
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{pipeline.length}</p>
                <p className="mt-1 text-xs text-slate-500">somente leitura</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Ações create
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">
                  {first?.actions.filter((action) => action.kind === 'create').length}
                </p>
                <p className="mt-1 text-xs text-slate-500">planejadas, nunca executadas</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Estado seguro
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-950">{first?.safeState}</p>
                <p className="mt-1 text-xs text-slate-500">há inválido/divergente sintético</p>
              </div>
            </div>

            <Card className="border-slate-200 bg-white shadow-none">
              <CardHeader>
                <CardTitle className="text-base">TDD da prova T08</CardTitle>
                <p className="text-sm font-normal text-slate-500">
                  Cada linha é uma verificação determinística; nada aqui representa chamada real ao
                  Meta.
                </p>
              </CardHeader>
              <CardContent>
                <CheckList checks={proof.checks} />
                <div
                  className={
                    allChecksPassed
                      ? 'mt-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800'
                      : 'mt-4 rounded-md bg-red-50 p-3 text-sm text-red-800'
                  }
                >
                  {allChecksPassed
                    ? 'PASSOU — TDD sintético da F2-T08.'
                    : 'FALHOU — não avançar para o teste humano.'}
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-none">
              <CardHeader>
                <CardTitle className="text-base">Reconciliação do lote manual</CardTitle>
                <p className="text-sm font-normal text-slate-500">
                  `record_id` continua restrito ao escopo da fonte declarada; desconhecido não é
                  inferido.
                </p>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] text-left text-sm">
                    <thead className="border-y border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">linha</th>
                        <th className="px-4 py-3">record_id</th>
                        <th className="px-4 py-3">classificação</th>
                        <th className="px-4 py-3">status do núcleo</th>
                        <th className="px-4 py-3">destino</th>
                        <th className="px-4 py-3">tratamento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {first?.evaluations.map((row) => (
                        <tr key={row.sourceRow} className="align-top hover:bg-slate-50">
                          <td className="px-4 py-3">{row.sourceRow}</td>
                          <td className="px-4 py-3 font-mono text-xs">
                            {row.record_id || '(vazio)'}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={classificationVariant(row.classification)}>
                              {classificationLabels[row.classification]}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">{row.status}</td>
                          <td className="px-4 py-3">
                            {row.targetPresent ? 'vinculado' : 'sem correspondência'}
                          </td>
                          <td className="max-w-[420px] px-4 py-3 text-xs text-slate-600">
                            {row.detail}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-5 lg:grid-cols-2">
              <Card className="border-slate-200 bg-white shadow-none">
                <CardHeader>
                  <CardTitle className="text-base">Replay e conflito de batch_id</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-emerald-900">
                    <div className="flex items-center gap-2 font-semibold">
                      <CheckCircle2 className="h-4 w-4" /> Replay idêntico: {proof.replay.status}
                    </div>
                    <p className="mt-1 text-xs">{proof.replay.message}</p>
                  </div>
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-950">
                    <div className="flex items-center gap-2 font-semibold">
                      <ShieldAlert className="h-4 w-4" /> Mesmo batch_id com payload diferente
                    </div>
                    <p className="mt-1 text-xs">{proof.changedPayload.message}</p>
                    <p className="mt-1 text-xs font-semibold">
                      Estado: {proof.changedPayload.safeState}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500">
                    Não há overwrite automático. A divergência exige decisão humana e o lote
                    original é preservado.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-slate-200 bg-white shadow-none">
                <CardHeader>
                  <CardTitle className="text-base">Falhas simuladas e retorno seguro</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {proof.failures.map((failure) => (
                    <div
                      key={failure.code}
                      className="flex items-start gap-3 rounded-md border border-slate-200 p-3 text-sm"
                    >
                      <ShieldX className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 font-medium text-slate-900">
                          <span>{failure.label}</span>
                          <Badge
                            variant={failure.safeState === 'bloqueada' ? 'destructive' : 'outline'}
                          >
                            {failure.safeState}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          SIMULADO · sem chamada externa · sem retry automático
                        </p>
                        <p className="mt-1 text-xs text-slate-600">{failure.detail}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

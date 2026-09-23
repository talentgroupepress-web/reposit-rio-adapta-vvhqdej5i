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
    <div className="rounded-xl border border-[#dadce0] bg-white p-5 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#f1f3f4] pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#1a73e8]">
            <ShieldCheck className="h-4 w-4" /> Prova sintética do fallback manual (F2-T08)
          </div>
          <h3 className="mt-1 text-base font-medium text-[#202124]">Lote {T08_BATCH_ID}</h3>
          <p className="mt-0.5 max-w-3xl text-xs text-[#5f6368]">
            Esta é uma prova controlada, não uma integração Meta. O lote é 100% sintético,
            processado em memória e reconciliado usando o mesmo núcleo da T04.
          </p>
        </div>
        <Button
          size="sm"
          onClick={executeProof}
          disabled={disabled || pipeline.length === 0}
          className="h-8 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-medium px-4 shadow-none gap-1.5"
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          Executar prova T08
        </Button>
      </div>

      <div className="rounded-lg border border-[#dadce0] bg-[#f8f9fa] p-3.5 text-xs text-[#5f6368] leading-relaxed">
        <strong className="text-[#202124]">Proteção de escopo GA4:</strong> a prova não chama Meta,
        não usa token/OAuth, não importa lote externo e não cria, atualiza ou exclui registros em{' '}
        <code>demandas</code>. Os rótulos 401, 403, 429 e timeout abaixo são eventos
        injetados/simulados, não respostas reais de uma API.
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-lg border border-[#fad2cf] bg-[#fce8e6] p-3 text-xs text-[#c5221f]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <strong>Falha na prova:</strong> {error}
          </div>
        </div>
      )}

      {!proof ? (
        <div className="rounded-lg border border-dashed border-[#dadce0] bg-[#f8f9fa] p-6 text-center text-xs text-[#5f6368]">
          Clique em <strong>Executar prova T08</strong> após o carregamento do pipeline para validar
          classificações, replay idempotente e comportamento seguro em falhas simuladas.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="rounded-lg border border-[#dadce0] bg-[#fafafa] p-3 text-xs">
              <p className="text-[11px] font-medium text-[#5f6368]">Lote</p>
              <p className="mt-1 font-mono text-xs font-semibold text-[#1a73e8]">
                {first?.batch.batch_id}
              </p>
              <p className="text-[10px] text-[#5f6368] mt-0.5">modo: {first?.batch.source_mode}</p>
            </div>
            <div className="rounded-lg border border-[#dadce0] bg-[#fafafa] p-3 text-xs">
              <p className="text-[11px] font-medium text-[#5f6368]">Linhas sintéticas</p>
              <p className="mt-1 text-lg font-semibold text-[#202124]">
                {first?.batch.rows.length}
              </p>
              <p className="text-[10px] text-[#5f6368] mt-0.5">sem dados pessoais</p>
            </div>
            <div className="rounded-lg border border-[#dadce0] bg-[#fafafa] p-3 text-xs">
              <p className="text-[11px] font-medium text-[#5f6368]">Pipeline lido</p>
              <p className="mt-1 text-lg font-semibold text-[#202124]">{pipeline.length}</p>
              <p className="text-[10px] text-[#5f6368] mt-0.5">somente leitura</p>
            </div>
            <div className="rounded-lg border border-[#dadce0] bg-[#fafafa] p-3 text-xs">
              <p className="text-[11px] font-medium text-[#5f6368]">Ações create</p>
              <p className="mt-1 text-lg font-semibold text-[#202124]">
                {first?.actions.filter((action) => action.kind === 'create').length}
              </p>
              <p className="text-[10px] text-[#5f6368] mt-0.5">plano em memória</p>
            </div>
            <div className="rounded-lg border border-[#dadce0] bg-[#fafafa] p-3 text-xs col-span-2 sm:col-span-1">
              <p className="text-[11px] font-medium text-[#5f6368]">Estado seguro</p>
              <p className="mt-1 text-sm font-semibold text-[#202124]">{first?.safeState}</p>
              <p className="text-[10px] text-[#5f6368] mt-0.5">proteção confirmada</p>
            </div>
          </div>

          {/* TDD Card */}
          <div className="rounded-lg border border-[#dadce0] bg-white p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#5f6368] mb-3">
              TDD da prova T08
            </h4>
            <CheckList checks={proof.checks} />
            <div
              className={`mt-3 rounded-lg p-2.5 text-xs font-medium ${
                allChecksPassed
                  ? 'bg-[#e6f4ea] text-[#137333] border border-[#ceead6]'
                  : 'bg-[#fce8e6] text-[#c5221f] border border-[#fad2cf]'
              }`}
            >
              {allChecksPassed
                ? 'PASSOU — TDD sintético da F2-T08.'
                : 'FALHOU — revisar divergência.'}
            </div>
          </div>

          {/* Table */}
          <div className="rounded-lg border border-[#dadce0] overflow-hidden">
            <div className="bg-[#f8f9fa] px-4 py-2.5 border-b border-[#dadce0] text-xs font-medium text-[#202124]">
              Reconciliação do lote manual
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-xs">
                <thead className="border-b border-[#dadce0] bg-[#f8f9fa] text-[11px] uppercase tracking-wider text-[#5f6368]">
                  <tr>
                    <th className="px-4 py-2.5">linha</th>
                    <th className="px-4 py-2.5">record_id</th>
                    <th className="px-4 py-2.5">classificação</th>
                    <th className="px-4 py-2.5">status núcleo</th>
                    <th className="px-4 py-2.5">destino</th>
                    <th className="px-4 py-2.5">tratamento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f3f4] text-[#202124]">
                  {first?.evaluations.map((row) => (
                    <tr key={row.sourceRow} className="hover:bg-[#f8f9fa]">
                      <td className="px-4 py-2 text-[#5f6368]">{row.sourceRow}</td>
                      <td className="px-4 py-2 font-mono text-[11px] text-[#1a73e8]">
                        {row.record_id || '(vazio)'}
                      </td>
                      <td className="px-4 py-2">
                        <Badge variant={classificationVariant(row.classification)}>
                          {classificationLabels[row.classification]}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 font-mono text-[11px] text-[#5f6368]">
                        {row.status}
                      </td>
                      <td className="px-4 py-2 text-[#5f6368]">
                        {row.targetPresent ? 'vinculado' : 'sem correspondência'}
                      </td>
                      <td className="max-w-[420px] px-4 py-2 text-[11px] text-[#5f6368]">
                        {row.detail}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

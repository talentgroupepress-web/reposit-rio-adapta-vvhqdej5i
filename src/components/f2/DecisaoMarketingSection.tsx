import { useCallback, useEffect, useMemo, useState } from 'react'
import { RotateCcw, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  criarDecisaoPendente,
  listarDecisoes,
  registrarDecisao,
  revogarDecisao,
} from '@/services/decisoesF2'
import { validateDecisionInput } from '@/lib/f2/t05/rules'
import type { DecisaoF2, DecisionInput } from '@/lib/f2/t05/types'

const decisionLabels: Record<string, string> = {
  continuar: 'Continuar',
  ajustar: 'Ajustar',
  interromper: 'Interromper',
}

const statusLabels: Record<string, string> = {
  pendente: 'Pendente de decisão',
  registrada: 'Registrada',
  revogada: 'Revogada',
}

const statusClass: Record<string, string> = {
  pendente: 'border-amber-300 bg-amber-50 text-amber-900',
  registrada: 'border-emerald-300 bg-emerald-50 text-emerald-900',
  revogada: 'border-slate-300 bg-slate-100 text-slate-700',
}

function formatDate(value?: string) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('pt-BR')
}

function DecisionForm({
  decision,
  briefingVersion,
  criterionSnapshot,
  onSaved,
  onCancel,
}: {
  decision: DecisaoF2
  briefingVersion: string
  criterionSnapshot: Record<string, unknown>
  onSaved: () => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<DecisionInput>({
    decision: '',
    analysis_period: decision.analysis_period,
    criterion_snapshot: JSON.stringify(criterionSnapshot),
    evidence_ref: decision.evidence_ref || 'F2-T04-SOURCE-001 / snapshot sintético/manual',
    volume_evidence: decision.volume_evidence,
    quality_evidence: decision.quality_evidence,
    responsible_reading: decision.responsible_reading,
    decision_reason: decision.decision_reason || '',
    owner_label: decision.owner_label,
    next_action: decision.next_action,
    next_action_owner: decision.next_action_owner,
    next_action_due: decision.next_action_due?.slice(0, 10) || '',
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const update = (field: keyof DecisionInput, value: string) =>
    setForm((current) => ({ ...current, [field]: value }))
  const submit = async () => {
    const errors = validateDecisionInput(form)
    if (errors.length) {
      setError(errors.join(' '))
      return
    }
    setBusy(true)
    setError('')
    try {
      await registrarDecisao(decision, form)
      onSaved()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível registrar a decisão.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Registrar decisão humana
          </p>
          <p className="text-sm text-slate-600">
            {decision.decision_id} · briefing {briefingVersion}
          </p>
        </div>
        <Badge variant="outline">Somente Champion/Delegado</Badge>
      </div>
      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
        Clique, impressão ou abandono isolado não comprovam qualidade. A associação ao lote T04 é
        sintética/manual e não é atribuição real entre campanha e demanda.
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-xs font-medium text-slate-600">
          Decisão
          <select
            value={form.decision}
            onChange={(event) => update('decision', event.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="">Selecione</option>
            <option value="continuar">Continuar</option>
            <option value="ajustar">Ajustar</option>
            <option value="interromper">Interromper</option>
          </select>
        </label>
        <label className="text-xs font-medium text-slate-600">
          Período analisado
          <input
            value={form.analysis_period}
            onChange={(event) => update('analysis_period', event.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
          />
        </label>
      </div>
      <label className="block text-xs font-medium text-slate-600">
        Referência da evidência
        <input
          value={form.evidence_ref}
          onChange={(event) => update('evidence_ref', event.target.value)}
          className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
        />
      </label>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-xs font-medium text-slate-600">
          Evidência de volume
          <textarea
            value={form.volume_evidence}
            onChange={(event) => update('volume_evidence', event.target.value)}
            className="mt-1 min-h-20 w-full rounded-md border border-slate-200 p-2 text-sm"
          />
        </label>
        <label className="text-xs font-medium text-slate-600">
          Evidência de qualidade
          <textarea
            value={form.quality_evidence}
            onChange={(event) => update('quality_evidence', event.target.value)}
            className="mt-1 min-h-20 w-full rounded-md border border-slate-200 p-2 text-sm"
          />
        </label>
        <label className="text-xs font-medium text-slate-600">
          Leitura do responsável
          <textarea
            value={form.responsible_reading}
            onChange={(event) => update('responsible_reading', event.target.value)}
            className="mt-1 min-h-20 w-full rounded-md border border-slate-200 p-2 text-sm"
          />
        </label>
        <label className="text-xs font-medium text-slate-600">
          Justificativa
          <textarea
            value={form.decision_reason}
            onChange={(event) => update('decision_reason', event.target.value)}
            className="mt-1 min-h-20 w-full rounded-md border border-slate-200 p-2 text-sm"
          />
        </label>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-xs font-medium text-slate-600">
          Dono
          <input
            value={form.owner_label}
            onChange={(event) => update('owner_label', event.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
          />
        </label>
        <label className="text-xs font-medium text-slate-600">
          Próxima ação
          <input
            value={form.next_action}
            onChange={(event) => update('next_action', event.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
          />
        </label>
        <label className="text-xs font-medium text-slate-600">
          Responsável da ação
          <input
            value={form.next_action_owner}
            onChange={(event) => update('next_action_owner', event.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
          />
        </label>
      </div>
      <label className="block text-xs font-medium text-slate-600">
        Prazo da ação
        <input
          type="date"
          value={form.next_action_due}
          onChange={(event) => update('next_action_due', event.target.value)}
          className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
        />
      </label>
      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={() => void submit()} disabled={busy}>
          {busy ? 'Registrando…' : 'Registrar decisão'}
        </Button>
      </div>
    </div>
  )
}

export function DecisaoMarketingSection({
  experimentId,
  briefingVersion,
  analysisPeriod,
  criteria,
}: {
  experimentId: string
  briefingVersion: string
  analysisPeriod: string
  criteria: Record<string, unknown>
}) {
  const [decisions, setDecisions] = useState<DecisaoF2[]>([])
  const [error, setError] = useState('')
  const [formDecision, setFormDecision] = useState<DecisaoF2 | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [revoke, setRevoke] = useState<DecisaoF2 | null>(null)
  const [reason, setReason] = useState('')
  const load = useCallback(async () => {
    try {
      setDecisions(await listarDecisoes(experimentId))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar decisões.')
    }
  }, [experimentId])
  useEffect(() => {
    void load()
  }, [load])
  const latest = useMemo(
    () => decisions.find((item) => item.status !== 'revogada') || decisions[0],
    [decisions],
  )
  const createPending = async () => {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const created = await criarDecisaoPendente({
        experiment_id: experimentId,
        briefing_version: briefingVersion,
        analysis_period: analysisPeriod,
        criterion_snapshot: criteria,
        evidence_ref: 'F2-T04-SOURCE-001 / snapshot sintético/manual',
        evidence_mode: 'sintetico_manual',
        evidence_snapshot: {
          fonte: 'F2-T04-SOURCE-001',
          modo: 'sintetico/manual',
          observacao: 'sem atribuição real',
        },
        volume_evidence: 'Pendente — nenhuma evidência de volume registrada ainda.',
        quality_evidence: 'Pendente — nenhuma evidência de qualidade registrada ainda.',
        divergences: 'Associação sintética/manual; sem vínculo com demandas.',
        responsible_reading: 'Pendente de leitura humana.',
        decision: '',
        decision_reason: '',
        decider_label: 'João Paulo (Champion/direção)',
        owner_label: 'João Paulo (Champion/direção)',
        next_action: 'Definir critério e registrar evidência de volume e qualidade.',
        next_action_owner: 'João Paulo (Champion/direção)',
        next_action_due: '2026-10-16',
        next_action_status: 'pendente',
        synthetic_only: true,
      })
      setFormDecision(created)
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível criar pendência.')
    } finally {
      setBusy(false)
    }
  }
  const revokeDecision = async () => {
    if (!revoke) return
    setBusy(true)
    setError('')
    try {
      await revogarDecisao(revoke, reason)
      setRevoke(null)
      setReason('')
      setMessage('Decisão revogada sem exclusão do histórico.')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível revogar.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Card className="border-indigo-200 bg-indigo-50/30">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Decisão de Marketing</CardTitle>
            <p className="mt-1 text-sm font-normal text-slate-600">
              Registro humano da leitura do experimento e fila da próxima ação.
            </p>
          </div>
          <ShieldCheck className="h-5 w-5 text-indigo-700" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border border-indigo-200 bg-white p-3 text-xs text-slate-700">
          <b>Proteção:</b> decisão humana; sem publicação, orçamento, automação ou alteração em
          demandas. Evidência T04 é sintética/manual.
        </div>
        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </p>
        )}
        {message && (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            {message}
          </p>
        )}
        {decisions.map((decision) => (
          <div
            key={decision.id || decision.decision_id}
            className={`rounded-md border p-3 ${statusClass[decision.status] || 'border-slate-200 bg-white'}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <b>{decision.decision_id}</b> · {decision.experiment_id} ·{' '}
                {decision.briefing_version}
              </div>
              <div className="flex gap-2">
                <Badge variant="outline">{statusLabels[decision.status]}</Badge>
                {decision.decision && <Badge>{decisionLabels[decision.decision]}</Badge>}
              </div>
            </div>
            <p className="mt-2 text-sm">
              {decision.responsible_reading || 'Ainda sem leitura final; permanece pendente.'}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Evidência: {decision.evidence_ref} · Período: {decision.analysis_period}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Próxima ação: {decision.next_action} · responsável: {decision.next_action_owner} ·
              prazo: {formatDate(decision.next_action_due)}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {decision.status === 'pendente' && (
                <Button size="sm" onClick={() => setFormDecision(decision)}>
                  Registrar decisão
                </Button>
              )}
              {decision.status === 'registrada' && (
                <Button size="sm" variant="outline" onClick={() => setRevoke(decision)}>
                  <RotateCcw className="mr-1 h-4 w-4" />
                  Revogar
                </Button>
              )}
            </div>
          </div>
        ))}
        {decisions.length === 0 && (
          <p className="text-sm text-slate-600">
            Nenhuma decisão registrada para este experimento.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void createPending()} disabled={busy}>
            Criar pendência de decisão
          </Button>
          <a
            href="/decisoes-f2"
            className="inline-flex h-10 items-center rounded-md border border-slate-300 px-4 text-sm font-medium"
          >
            Abrir fila de decisões
          </a>
        </div>
        {formDecision && (
          <DecisionForm
            decision={formDecision}
            briefingVersion={briefingVersion}
            criterionSnapshot={criteria}
            onSaved={async () => {
              setFormDecision(null)
              setMessage('Decisão registrada.')
              await load()
            }}
            onCancel={() => setFormDecision(null)}
          />
        )}
        {revoke && (
          <div className="rounded-md border border-red-200 bg-red-50 p-4">
            <p className="font-medium text-red-900">Revogar {revoke.decision_id}</p>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Motivo obrigatório"
              className="mt-2 min-h-20 w-full rounded-md border border-red-200 p-2 text-sm"
            />
            <div className="mt-2 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setRevoke(null)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => void revokeDecision()}
                disabled={busy || !reason.trim()}
              >
                Confirmar revogação
              </Button>
            </div>
          </div>
        )}
        {latest?.status === 'revogada' && (
          <p className="text-xs text-slate-500">
            A decisão anterior foi preservada. Crie uma nova decisão pendente para o próximo ciclo.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

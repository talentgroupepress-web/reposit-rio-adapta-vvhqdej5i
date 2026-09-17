import pb from '@/lib/pocketbase/client'
import { nextDecisionId, validateDecisionInput } from '@/lib/f2/t05/rules'
import type { DecisaoF2, DecisionInput } from './types'

function usuarioAtual() {
  return pb.authStore.model as
    | (Record<string, unknown> & { id?: string; name?: string; role?: string })
    | null
}

function safe(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

export async function listarDecisoes(experimentId?: string) {
  const filter = experimentId ? `experiment_id = "${safe(experimentId)}"` : ''
  return pb.collection('decisoes_f2').getFullList<DecisaoF2>({ filter, sort: '-updated' })
}

export async function obterDecisao(id: string) {
  return pb.collection('decisoes_f2').getOne<DecisaoF2>(id)
}

export async function criarDecisaoPendente(input: Omit<DecisaoF2, 'decision_id' | 'status'>) {
  const existing = await listarDecisoes()
  const decision_id = nextDecisionId(existing)
  return pb.collection('decisoes_f2').create<DecisaoF2>({
    ...input,
    decision_id,
    status: 'pendente',
    decision: '',
    synthetic_only: true,
  })
}

export async function registrarDecisao(decisao: DecisaoF2, input: DecisionInput) {
  const errors = validateDecisionInput(input)
  if (errors.length > 0) throw new Error(errors.join(' '))
  if (decisao.status !== 'pendente')
    throw new Error('Somente uma decisão pendente pode ser registrada.')
  const user = usuarioAtual()
  if (!user?.id || !['champion', 'delegado_f2'].includes(String(user.role))) {
    throw new Error('Somente Champion ou Delegado formal pode registrar a decisão final.')
  }
  return pb.collection('decisoes_f2').update<DecisaoF2>(decisao.id!, {
    decision: input.decision,
    status: 'registrada',
    criterion_snapshot: JSON.stringify({ criterio: input.criterion_snapshot }),
    evidence_ref: input.evidence_ref,
    volume_evidence: input.volume_evidence,
    quality_evidence: input.quality_evidence,
    responsible_reading: input.responsible_reading,
    decision_reason: input.decision_reason,
    owner_label: input.owner_label,
    next_action: input.next_action,
    next_action_owner: input.next_action_owner,
    next_action_due: input.next_action_due,
    next_action_status: 'pendente',
    decider_label: user.name || 'João Paulo (Champion/direção)',
    decided_by: user.id,
    decided_at: new Date().toISOString(),
  })
}

export async function revogarDecisao(decisao: DecisaoF2, motivo: string) {
  const user = usuarioAtual()
  if (!user?.id || !['champion', 'delegado_f2'].includes(String(user.role))) {
    throw new Error('Somente Champion ou Delegado formal pode revogar a decisão.')
  }
  if (decisao.status !== 'registrada')
    throw new Error('Somente uma decisão registrada pode ser revogada.')
  if (!motivo.trim()) throw new Error('O motivo da revogação é obrigatório.')
  return pb.collection('decisoes_f2').update<DecisaoF2>(decisao.id!, {
    status: 'revogada',
    revocation_reason: motivo.trim(),
    revoked_by: user.id,
    revoked_at: new Date().toISOString(),
  })
}

export async function criarDecisaoSubsequente(decisao: DecisaoF2) {
  if (decisao.status !== 'revogada') throw new Error('A decisão anterior precisa estar revogada.')
  const user = usuarioAtual()
  if (!user?.id || !['champion', 'delegado_f2'].includes(String(user.role))) {
    throw new Error('Somente Champion ou Delegado formal pode criar a decisão subsequente.')
  }
  const existing = await listarDecisoes()
  const decision_id = nextDecisionId(existing)
  return pb.collection('decisoes_f2').create<DecisaoF2>({
    decision_id,
    experiment_id: decisao.experiment_id,
    briefing_version: decisao.briefing_version,
    analysis_period: decisao.analysis_period,
    criterion_snapshot: decisao.criterion_snapshot,
    evidence_ref: decisao.evidence_ref,
    evidence_mode: decisao.evidence_mode,
    evidence_snapshot: decisao.evidence_snapshot,
    volume_evidence: decisao.volume_evidence,
    quality_evidence: decisao.quality_evidence,
    divergences: decisao.divergences,
    responsible_reading: decisao.responsible_reading,
    decision: '',
    status: 'pendente',
    decision_reason: '',
    decider_label: 'João Paulo (Champion/direção)',
    owner_label: decisao.owner_label,
    next_action: 'Registrar nova leitura humana após revisão.',
    next_action_owner: decisao.next_action_owner,
    next_action_due: decisao.next_action_due,
    next_action_status: 'pendente',
    previous_decision_id: decisao.decision_id,
    synthetic_only: true,
  })
}

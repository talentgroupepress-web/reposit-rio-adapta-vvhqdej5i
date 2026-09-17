import type { DecisionOption } from './rules'

export type DecisionStatus = 'pendente' | 'registrada' | 'revogada'

export type DecisionInput = {
  decision: string
  analysis_period: string
  criterion_snapshot: string
  evidence_ref: string
  volume_evidence: string
  quality_evidence: string
  responsible_reading: string
  decision_reason: string
  owner_label: string
  next_action: string
  next_action_owner: string
  next_action_due: string
}

export type DecisaoF2 = {
  id?: string
  decision_id: string
  experiment_id: string
  briefing_version: string
  analysis_period: string
  criterion_snapshot: Record<string, unknown> | string
  evidence_ref: string
  evidence_mode: string
  evidence_snapshot: Record<string, unknown> | string
  volume_evidence: string
  quality_evidence: string
  divergences?: string
  responsible_reading: string
  decision: DecisionOption | ''
  status: DecisionStatus
  decision_reason?: string
  decider_label: string
  decided_by?: string
  decided_at?: string
  owner_label: string
  next_action: string
  next_action_owner: string
  next_action_due?: string
  next_action_status: 'pendente' | 'em_andamento' | 'concluida'
  next_action_evidence?: string
  previous_decision_id?: string
  revocation_reason?: string
  revoked_by?: string
  revoked_at?: string
  synthetic_only: boolean
  created?: string
  updated?: string
}

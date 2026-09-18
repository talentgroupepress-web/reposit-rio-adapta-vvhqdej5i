import type { DecisaoF2, DecisionInput, DecisionStatus } from './types'

export const DECISION_OPTIONS = ['continuar', 'ajustar', 'interromper'] as const
export type DecisionOption = (typeof DECISION_OPTIONS)[number]

export function isDecisionOption(value: unknown): value is DecisionOption {
  return typeof value === 'string' && DECISION_OPTIONS.includes(value as DecisionOption)
}

function text(value: unknown) {
  return String(value ?? '').trim()
}

export function evidenceIsClickOnly(volume: string, quality: string) {
  const all = `${volume} ${quality}`.toLocaleLowerCase('pt-BR')
  const hasActivity = /(clique|impress|abandono)/.test(all)
  const hasPositiveQuality = /(lead qual|oportun|propost|convers|cliente)/.test(all)
  return hasActivity && !hasPositiveQuality
}

export function validateDecisionInput(input: DecisionInput) {
  const errors: string[] = []
  if (!isDecisionOption(input.decision)) errors.push('Escolha continuar, ajustar ou interromper.')
  if (!text(input.analysis_period)) errors.push('O período analisado é obrigatório.')
  if (!text(input.criterion_snapshot)) errors.push('O critério definido no briefing é obrigatório.')
  if (!text(input.evidence_ref)) errors.push('A referência da evidência é obrigatória.')
  if (!text(input.volume_evidence)) errors.push('A evidência de volume é obrigatória.')
  if (!text(input.quality_evidence)) errors.push('A evidência de qualidade é obrigatória.')
  if (evidenceIsClickOnly(input.volume_evidence, input.quality_evidence)) {
    errors.push(
      'Clique/impressão/abandono isolado não prova qualidade ou sucesso; mantenha a decisão pendente.',
    )
  }
  if (!text(input.responsible_reading)) errors.push('A leitura do responsável é obrigatória.')
  if (!text(input.decision_reason)) errors.push('A justificativa da decisão é obrigatória.')
  if (!text(input.owner_label)) errors.push('O dono da próxima ação é obrigatório.')
  if (!text(input.next_action)) errors.push('A próxima ação é obrigatória.')
  if (!text(input.next_action_owner)) errors.push('O responsável pela próxima ação é obrigatório.')
  if (!text(input.next_action_due)) errors.push('O prazo da próxima ação é obrigatório.')
  if (input.decision === 'ajustar' && !/nova versão|nova versao/i.test(input.next_action)) {
    errors.push('AJUSTAR deve apontar a necessidade de nova versão do briefing.')
  }
  return errors
}

export function nextDecisionId(records: Array<Pick<DecisaoF2, 'decision_id'>>) {
  const highest = records.reduce((max, record) => {
    const match = /^DEC-F2-(\d+)$/.exec(record.decision_id)
    return match ? Math.max(max, Number(match[1])) : max
  }, 0)
  return `DEC-F2-${String(highest + 1).padStart(3, '0')}`
}

export function simulateT05Checks() {
  const red: DecisionInput = {
    decision: 'continuar',
    analysis_period: '2026-10-08 a 2026-10-15',
    criterion_snapshot: 'Critério ausente no RED',
    evidence_ref: 'F2-T04-SOURCE-001 / RED',
    volume_evidence: '12 cliques; 0 leads qualificados',
    quality_evidence: 'Somente cliques e abandono',
    responsible_reading: 'Amostra insuficiente',
    decision_reason: 'Tentativa RED',
    owner_label: 'João Paulo',
    next_action: 'Definir critério e coletar qualidade',
    next_action_owner: 'João Paulo',
    next_action_due: '2026-10-16',
  }
  const green: DecisionInput = {
    ...red,
    decision: 'ajustar',
    criterion_snapshot: 'AJUSTAR: correção antes de nova revisão',
    volume_evidence: '12 cliques; 3 capturas sintéticas',
    quality_evidence: '1 lead qualificado sintético; 0 oportunidades',
    responsible_reading: 'Há sinal inicial, mas requer ajuste',
    decision_reason: 'Abrir nova versão antes de repetir a janela',
    next_action: 'Criar nova versão do briefing e repetir a janela',
  }
  const original: DecisaoF2 = {
    decision_id: 'DEC-F2-ROLLBACK-001',
    experiment_id: 'EXP-F2-OUT-001',
    briefing_version: 'v3',
    analysis_period: '2026-10-08 a 2026-10-15',
    criterion_snapshot: {},
    evidence_ref: 'F2-T04-SOURCE-001',
    evidence_mode: 'sintetico_manual',
    evidence_snapshot: {},
    volume_evidence: '8 cliques; 2 capturas',
    quality_evidence: '1 lead qualificado sintético',
    divergences: '',
    responsible_reading: 'Fixture rollback',
    decision: 'continuar',
    status: 'registrada',
    decision_reason: 'Fixture',
    decider_label: 'João Paulo',
    owner_label: 'João Paulo',
    next_action: 'Revisar próxima janela',
    next_action_owner: 'João Paulo',
    next_action_due: '2026-10-22',
    next_action_status: 'pendente',
    synthetic_only: true,
  }
  const redErrors = validateDecisionInput(red)
  const greenErrors = validateDecisionInput(green)
  const revoked = {
    ...original,
    status: 'revogada' as DecisionStatus,
    revocation_reason: 'Rollback humano',
  }
  const successor = {
    ...original,
    decision_id: 'DEC-F2-002',
    status: 'pendente' as DecisionStatus,
    decision: '',
    previous_decision_id: original.decision_id,
  }
  return [
    {
      id: 'red-click-only',
      label: 'RED clique isolado permanece pendente',
      passed: redErrors.some((error) => error.includes('Clique/')),
      detail: redErrors.join(' '),
    },
    {
      id: 'green-quality',
      label: 'GREEN com volume e qualidade permite AJUSTAR',
      passed: greenErrors.length === 0,
      detail: greenErrors.join(' ') || 'Entrada aceita',
    },
    {
      id: 'decision-options',
      label: 'Somente continuar, ajustar e interromper são aceitas',
      passed: !isDecisionOption('inconclusivo'),
      detail: DECISION_OPTIONS.join(', '),
    },
    {
      id: 'adjust-new-version',
      label: 'AJUSTAR aponta nova versão do briefing',
      passed: greenErrors.length === 0,
      detail: green.next_action,
    },
    {
      id: 'rollback-preserves',
      label: 'Revogação preserva a decisão anterior',
      passed:
        revoked.decision_id === original.decision_id &&
        revoked.decision === original.decision &&
        revoked.status === 'revogada',
      detail: `preservado: ${revoked.decision_id}`,
    },
    {
      id: 'successor-links',
      label: 'Decisão subsequente aponta para a anterior',
      passed:
        successor.previous_decision_id === original.decision_id && successor.status === 'pendente',
      detail: `${successor.decision_id} → ${successor.previous_decision_id}`,
    },
  ]
}

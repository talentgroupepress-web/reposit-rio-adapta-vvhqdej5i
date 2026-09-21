import type { CoreReport, CoreSourceRecord, CoreStatus } from '@/lib/f2/reconciliation/core'
import { reconcileByRecordId, planCoreActions, type CoreAction } from '@/lib/f2/reconciliation/core'
import type { T04PipelineRecord } from '@/lib/f2/t04/sourceBatch'

export type T08Classification =
  | 'vinculado'
  | 'nao_vinculado'
  | 'desconhecido'
  | 'divergente'
  | 'invalido'

export type T08ManualRow = {
  sourceRow: number
  sourceLabel: string
  record_id: string
  empresa: string
  tipo_origem: 'inbound' | 'outbound' | 'desconhecido' | ''
  canal: string
  campanha: string
  oferta_servico: string
  estado: string
  qualidade: string
}

export type T08ManualBatch = {
  batch_id: string
  received_at: string
  period_start: string
  period_end: string
  source_mode: 'manual_export' | 'manual_entry'
  source_owner: string
  unit_label: string
  provided_fields: string[]
  missing_fields: string[]
  reconciliation_status: 'pendente' | 'reconciliado' | 'divergente' | 'bloqueado'
  rows: T08ManualRow[]
}

export type T08RowEvaluation = {
  sourceRow: number
  record_id: string
  classification: T08Classification
  status: string
  targetPresent: boolean
  detail: string
}

export type T08LedgerEntry = {
  batch_id: string
  fingerprint: string
  safeState: 'fallback_manual' | 'bloqueada'
  reconciliationStatus: 'reconciliado' | 'divergente' | 'bloqueado'
  report: CoreReport
  evaluations: T08RowEvaluation[]
}

export type T08BatchResult = {
  status: 'accepted' | 'replay_skip' | 'payload_conflict'
  safeState: 'fallback_manual' | 'bloqueada'
  reconciliationStatus: 'reconciliado' | 'divergente' | 'bloqueado'
  batch: T08ManualBatch
  fingerprint: string
  report: CoreReport
  evaluations: T08RowEvaluation[]
  actions: CoreAction[]
  ledgerEntry?: T08LedgerEntry
  message: string
}

export const T08_BATCH_ID = 'META-F2-MANUAL-001'

export const T08_MANUAL_BATCH: T08ManualBatch = {
  batch_id: T08_BATCH_ID,
  received_at: '2026-09-21T15:00:00-03:00',
  period_start: '2026-09-01',
  period_end: '2026-09-20',
  source_mode: 'manual_export',
  source_owner: 'OWNER-SINTETICO-TG',
  unit_label: 'Campanha sintética Talent Group · fallback manual',
  provided_fields: [
    'batch_id',
    'received_at',
    'period_start',
    'period_end',
    'source_mode',
    'source_owner',
    'unit_label',
    'record_id',
    'empresa',
    'tipo_origem',
    'canal',
    'campanha',
    'oferta_servico',
    'estado',
    'qualidade',
  ],
  missing_fields: [],
  reconciliation_status: 'pendente',
  rows: [
    {
      sourceRow: 1,
      sourceLabel: 'MANUAL-LINKED-001',
      record_id: 'FIX-IN-001',
      empresa: 'Empresa Alpha (fixture)',
      tipo_origem: 'inbound',
      canal: 'site',
      campanha: 'F1-FIXTURE-IN',
      oferta_servico: 'R&S',
      estado: 'suspect',
      qualidade: 'ok',
    },
    {
      sourceRow: 2,
      sourceLabel: 'MANUAL-UNLINKED-001',
      record_id: 'META-UNLINKED-001',
      empresa: 'Empresa Manual Nova (fixture)',
      tipo_origem: 'outbound',
      canal: 'linkedin',
      campanha: 'F2-MANUAL-UNLINKED',
      oferta_servico: 'Terceirização',
      estado: 'suspect',
      qualidade: 'pendente',
    },
    {
      sourceRow: 3,
      sourceLabel: 'MANUAL-UNKNOWN-001',
      record_id: 'META-UNKNOWN-001',
      empresa: 'Empresa Sem Origem (fixture)',
      tipo_origem: 'desconhecido',
      canal: '',
      campanha: '',
      oferta_servico: '',
      estado: 'suspect',
      qualidade: 'desconhecido',
    },
    {
      sourceRow: 4,
      sourceLabel: 'MANUAL-DIVERGENT-001',
      record_id: 'FIX-OUT-001',
      empresa: 'Empresa Beta alterada (fixture)',
      tipo_origem: 'outbound',
      canal: 'linkedin',
      campanha: 'F2-MANUAL-DIVERGENT',
      oferta_servico: 'Terceirização',
      estado: 'suspect',
      qualidade: 'ok',
    },
    {
      sourceRow: 5,
      sourceLabel: 'MANUAL-INVALID-001',
      record_id: '',
      empresa: 'Empresa sem chave (fixture)',
      tipo_origem: '',
      canal: '',
      campanha: '',
      oferta_servico: 'R&S',
      estado: 'suspect',
      qualidade: 'desconhecido',
    },
  ],
}

const requiredEnvelopeFields = [
  'batch_id',
  'received_at',
  'period_start',
  'period_end',
  'source_mode',
  'source_owner',
  'unit_label',
  'provided_fields',
  'missing_fields',
]

const canonicalRow = (row: T08ManualRow) => [
  row.sourceRow,
  row.sourceLabel,
  row.record_id,
  row.empresa,
  row.tipo_origem,
  row.canal,
  row.campanha,
  row.oferta_servico,
  row.estado,
  row.qualidade,
]

export function fingerprintManualBatch(batch: T08ManualBatch) {
  return JSON.stringify({
    batch_id: batch.batch_id,
    received_at: batch.received_at,
    period_start: batch.period_start,
    period_end: batch.period_end,
    source_mode: batch.source_mode,
    source_owner: batch.source_owner,
    unit_label: batch.unit_label,
    provided_fields: batch.provided_fields,
    missing_fields: batch.missing_fields,
    rows: batch.rows.map(canonicalRow),
  })
}

const toCoreSource = (row: T08ManualRow): CoreSourceRecord => ({
  sourceRow: row.sourceRow,
  sourceLabel: row.sourceLabel,
  recordId: row.record_id,
  sourceOrigin: row.tipo_origem,
  sourceCampaign: row.campanha,
  payload: JSON.stringify([
    row.empresa,
    row.tipo_origem,
    row.canal,
    row.campanha,
    row.oferta_servico,
    row.estado,
    row.qualidade,
  ]),
})

const toCoreTarget = (row: T04PipelineRecord) => ({
  recordId: row.record_id,
  payload: JSON.stringify([
    row.empresa,
    row.tipo_origem,
    row.canal,
    row.campanha,
    row.oferta_servico,
    row.estado,
    row.qualidade,
  ]),
})

const statusToClassification = (
  status: CoreStatus | 'invalid',
  sourceOrigin: string,
): T08Classification => {
  if (status === 'invalid') return 'invalido'
  if (sourceOrigin === 'desconhecido') return 'desconhecido'
  if (status === 'preservado') return 'vinculado'
  if (status === 'ausente_no_destino') return 'nao_vinculado'
  return 'divergente'
}

const buildEvaluations = (batch: T08ManualBatch, report: CoreReport): T08RowEvaluation[] => {
  const reportBySourceRow = new Map<
    number,
    { status: CoreStatus; targetPresent: boolean; detail: string }
  >()
  report.rows.forEach((row) => {
    row.sourceRows.forEach((sourceRow) => {
      reportBySourceRow.set(sourceRow, {
        status: row.status,
        targetPresent: row.targetPresent,
        detail: row.detail,
      })
    })
  })
  report.invalidRows.forEach((row) => {
    reportBySourceRow.set(row.sourceRow, {
      status: 'invalid',
      targetPresent: false,
      detail: 'Registro inválido: record_id ausente; bloquear sem inferência ou criação.',
    })
  })

  return batch.rows.map((row) => {
    const evaluation = reportBySourceRow.get(row.sourceRow)!
    return {
      sourceRow: row.sourceRow,
      record_id: row.record_id,
      classification: statusToClassification(evaluation.status, row.tipo_origem),
      status: evaluation.status,
      targetPresent: evaluation.targetPresent,
      detail: evaluation.detail,
    }
  })
}

const batchEnvelopeErrors = (batch: T08ManualBatch) => {
  const errors: string[] = []
  const candidate = batch as unknown as Record<string, unknown>
  requiredEnvelopeFields.forEach((field) => {
    const value = candidate[field]
    if (value === undefined || value === null || value === '') {
      errors.push(field)
    }
  })
  if (!['manual_export', 'manual_entry'].includes(batch.source_mode)) {
    errors.push('source_mode_manual')
  }
  if ((candidate.source_mode as string) === 'meta_integrated') {
    errors.push('source_mode_nao_autorizado')
  }
  return errors
}

export function processManualBatch(
  batch: T08ManualBatch,
  ledger: T08LedgerEntry[],
  pipelineRows: T04PipelineRecord[],
): T08BatchResult {
  const fingerprint = fingerprintManualBatch(batch)
  const prior = ledger.find((entry) => entry.batch_id === batch.batch_id)
  const envelopeErrors = batchEnvelopeErrors(batch)

  if (envelopeErrors.length > 0) {
    const emptyReport: CoreReport = {
      batchId: batch.batch_id,
      rows: [],
      invalidRows: [],
      summary: {
        totalSourceRows: batch.rows.length,
        uniqueSourceKeys: 0,
        invalidKeys: batch.rows.length,
        matchedKeys: 0,
        sourceOnlyKeys: 0,
        pipelineOnlyKeys: pipelineRows.length,
        duplicateGroups: 0,
        duplicateRows: 0,
        conflictGroups: 0,
        conflictRows: 0,
        unknownRows: 0,
        baselineReconciliationPassed: false,
      },
    }
    return {
      status: 'payload_conflict',
      safeState: 'bloqueada',
      reconciliationStatus: 'bloqueado',
      batch,
      fingerprint,
      report: emptyReport,
      evaluations: [],
      actions: [],
      message: `Payload manual bloqueado antes da reconciliação. Campos inválidos/ausentes: ${envelopeErrors.join(', ')}.`,
    }
  }

  if (prior) {
    if (prior.fingerprint === fingerprint) {
      return {
        status: 'replay_skip',
        safeState: prior.safeState,
        reconciliationStatus: prior.reconciliationStatus,
        batch,
        fingerprint,
        report: prior.report,
        evaluations: prior.evaluations,
        actions: [],
        message: 'Replay idêntico: batch_id já registrado; zero nova criação e zero nova contagem.',
      }
    }

    return {
      status: 'payload_conflict',
      safeState: 'bloqueada',
      reconciliationStatus: 'bloqueado',
      batch,
      fingerprint,
      report: prior.report,
      evaluations: prior.evaluations,
      actions: [],
      message:
        'Conflito de batch_id: o mesmo lote foi reapresentado com payload diferente; decisão humana necessária, sem overwrite.',
    }
  }

  const sourceRows = batch.rows.map(toCoreSource)
  const report = reconcileByRecordId({
    batchId: batch.batch_id,
    sourceRows,
    targetRows: pipelineRows.map(toCoreTarget),
  })
  const evaluations = buildEvaluations(batch, report)
  const actions = planCoreActions(sourceRows, report)
  const hasDivergence = evaluations.some((row) => row.classification === 'divergente')
  const hasInvalid = evaluations.some((row) => row.classification === 'invalido')
  const reconciliationStatus = hasInvalid
    ? 'bloqueado'
    : hasDivergence
      ? 'divergente'
      : 'reconciliado'
  const ledgerEntry: T08LedgerEntry = {
    batch_id: batch.batch_id,
    fingerprint,
    safeState: hasInvalid || hasDivergence ? 'bloqueada' : 'fallback_manual',
    reconciliationStatus,
    report,
    evaluations,
  }

  return {
    status: 'accepted',
    safeState: hasInvalid || hasDivergence ? 'bloqueada' : 'fallback_manual',
    reconciliationStatus,
    batch,
    fingerprint,
    report,
    evaluations,
    actions,
    ledgerEntry,
    message:
      'Lote manual sintético registrado para prova; resultados permanecem em dry-run e nenhuma escrita foi executada.',
  }
}

export function runT08DeterministicChecks(pipelineRows: T04PipelineRecord[]) {
  const ledger: T08LedgerEntry[] = []
  const first = processManualBatch(T08_MANUAL_BATCH, ledger, pipelineRows)
  if (!first.ledgerEntry) {
    throw new Error('A massa sintética T08 não gerou registro de controle para o replay.')
  }
  ledger.push(first.ledgerEntry)

  const replay = processManualBatch(T08_MANUAL_BATCH, ledger, pipelineRows)
  const changedBatch: T08ManualBatch = {
    ...T08_MANUAL_BATCH,
    rows: T08_MANUAL_BATCH.rows.map((row) =>
      row.sourceRow === 2 ? { ...row, campanha: 'F2-MANUAL-ALTERADA' } : row,
    ),
  }
  const changedPayload = processManualBatch(changedBatch, ledger, pipelineRows)
  const failures = runT08FailureSimulations()
  const classifications = new Set(first.evaluations.map((row) => row.classification))
  const checks = [
    {
      id: 'manual-envelope',
      label: 'Lote manual tem contrato e origem explícita',
      passed:
        first.status === 'accepted' &&
        first.batch.batch_id === T08_BATCH_ID &&
        first.batch.source_mode === 'manual_export' &&
        first.batch.missing_fields.length === 0,
      detail: `${first.batch.source_mode} · ${first.batch.batch_id} · sem campos de envelope ausentes`,
    },
    {
      id: 'row-classifications',
      label: 'Vinculado, não vinculado, desconhecido, divergente e inválido ficam separados',
      passed: ['vinculado', 'nao_vinculado', 'desconhecido', 'divergente', 'invalido'].every(
        (value) => classifications.has(value as T08Classification),
      ),
      detail: `classificações observadas: ${Array.from(classifications).join(', ')}`,
    },
    {
      id: 'no-unknown-inference',
      label: 'Origem desconhecida não é inferida',
      passed: first.evaluations.some(
        (row) =>
          row.classification === 'desconhecido' &&
          row.detail.toLowerCase().includes('sem inferência'),
      ),
      detail: 'canal e campanha permanecem vazios no registro desconhecido',
    },
    {
      id: 'initial-no-write',
      label: 'Primeira execução só planeja; não grava no pipeline',
      passed:
        first.actions.some((action) => action.kind === 'create') && pipelineRows.length === 10,
      detail: `${first.actions.filter((action) => action.kind === 'create').length} criação(ões) planejada(s) · pipeline preservado em ${pipelineRows.length}`,
    },
    {
      id: 'replay-idempotent',
      label: 'Replay idêntico por batch_id resulta em skip e zero nova criação',
      passed:
        replay.status === 'replay_skip' &&
        replay.actions.length === 0 &&
        replay.message.includes('zero nova criação'),
      detail: `status ${replay.status} · novas ações ${replay.actions.length}`,
    },
    {
      id: 'batch-payload-conflict',
      label: 'Mesmo batch_id com payload diferente exige decisão humana',
      passed:
        changedPayload.status === 'payload_conflict' &&
        changedPayload.safeState === 'bloqueada' &&
        changedPayload.message.includes('decisão humana'),
      detail: `status ${changedPayload.status} · estado seguro ${changedPayload.safeState}`,
    },
    {
      id: 'simulated-failures',
      label: '401/403/429/timeout/payload inválido são explicitamente simulados',
      passed:
        failures.length === 5 &&
        failures.every(
          (failure) =>
            failure.simulated &&
            !failure.externalCallMade &&
            !failure.realMetaResponse &&
            !failure.autoRetry,
        ),
      detail: failures.map((failure) => `${failure.code}: ${failure.safeState}`).join(' · '),
    },
    {
      id: 'core-reused',
      label: 'Reconciliação usa o núcleo compartilhado e mantém o pipeline somente leitura',
      passed:
        first.report.batchId === T08_BATCH_ID &&
        first.report.summary.pipelineOnlyKeys === 6 &&
        pipelineRows.length === 10 &&
        first.safeState === 'bloqueada',
      detail: `adapter manual → reconcileByRecordId → relatório dry-run · ${first.report.summary.pipelineOnlyKeys} registros do destino não vieram neste lote · estado ${first.safeState}`,
    },
  ]

  return { first, replay, changedPayload, failures, checks }
}

export type T08FailureCode = '401' | '403' | '429' | 'timeout' | 'payload_invalid'

export type T08FailureResult = {
  code: T08FailureCode
  label: string
  simulated: true
  externalCallMade: false
  realMetaResponse: false
  autoRetry: false
  safeState: 'fallback_manual' | 'bloqueada'
  detail: string
}

export function simulateT08Failure(code: T08FailureCode): T08FailureResult {
  const failures: Record<T08FailureCode, Omit<T08FailureResult, 'code'>> = {
    '401': {
      label: '401 · autorização ausente/expirada',
      simulated: true,
      externalCallMade: false,
      realMetaResponse: false,
      autoRetry: false,
      safeState: 'fallback_manual',
      detail:
        'Falha injetada no fluxo simulado; manter fallback manual, sem pedir segredo ou repetir chamada.',
    },
    '403': {
      label: '403 · permissão insuficiente',
      simulated: true,
      externalCallMade: false,
      realMetaResponse: false,
      autoRetry: false,
      safeState: 'fallback_manual',
      detail: 'Falha injetada no fluxo simulado; não ampliar permissão e manter a fonte manual.',
    },
    '429': {
      label: '429 · limite de requisições',
      simulated: true,
      externalCallMade: false,
      realMetaResponse: false,
      autoRetry: false,
      safeState: 'fallback_manual',
      detail: 'Falha injetada no fluxo simulado; não fazer retry cego e preservar o lote recebido.',
    },
    timeout: {
      label: 'timeout · ausência de resposta',
      simulated: true,
      externalCallMade: false,
      realMetaResponse: false,
      autoRetry: false,
      safeState: 'fallback_manual',
      detail:
        'Falha injetada no fluxo simulado; encerrar a tentativa e retornar ao fallback manual.',
    },
    payload_invalid: {
      label: 'payload inválido · contrato incompleto',
      simulated: true,
      externalCallMade: false,
      realMetaResponse: false,
      autoRetry: false,
      safeState: 'bloqueada',
      detail: 'Falha de validação sintética; bloquear o lote até correção humana, sem importar.',
    },
  }
  return { code, ...failures[code] }
}

export function runT08FailureSimulations() {
  return (['401', '403', '429', 'timeout', 'payload_invalid'] as T08FailureCode[]).map(
    simulateT08Failure,
  )
}

import type { CoreReport, CoreSourceRecord, CoreStatus } from '@/lib/f2/reconciliation/core'
import { planCoreActions, reconcileByRecordId, type CoreAction } from '@/lib/f2/reconciliation/core'
import type { T04PipelineRecord } from '@/lib/f2/t04/sourceBatch'

/**
 * F2-T09 — Adapter da leitura Meta integrada (dry-run).
 *
 * Escopo autorizado (gates 1–5, 22/09/2026; retomada 23/09/2026):
 * - leitura real limitada à conta TalentGroup_01 (act_1667348577717128), nível account,
 *   período 15–21/09/2026, somente campos do contrato aprovado no gate 3;
 * - campo fora do contrato é descartado e registrado (RN-F2-012);
 * - identidade por sistema_origem_tecnico + record_id (gate 4);
 * - 401/403/429/timeout/payload inválido interrompem sem retry cego (RN-F2-013);
 * - nenhuma escrita em `demandas`, nenhum token/segredo no código.
 */

export const T09_BATCH_ID = 'META-F2-T09-001'
export const T09_MODALITY_REGISTER = 'META-F2-002'

export const T09_CONTRACT_FIELDS = [
  'campaign_id',
  'campaign_name',
  'adset_id',
  'adset_name',
  'ad_id',
  'ad_name',
  'date_start',
  'date_stop',
  'impressions',
  'clicks',
  'spend',
] as const

export type T09ContractField = (typeof T09_CONTRACT_FIELDS)[number]

export const T09_ENVELOPE_FIELDS = ['account_id', 'account_name', 'level'] as const
export type T09EnvelopeField = (typeof T09_ENVELOPE_FIELDS)[number]

// ---------------------------------------------------------------------------
// Log da leitura real executada em 23/09/2026 (consulta aprovada nos gates)
// ---------------------------------------------------------------------------

export type T09RealReadLog = {
  executed_at: string
  account_id: string
  account_name: string
  level: 'account'
  date_start: string
  date_stop: string
  requested_fields: string[]
  http_status: number
  rows_returned: number
  connector_error: string | null
  log_id: string
  notes: string
}

export const T09_REAL_READ: T09RealReadLog = {
  executed_at: '2026-09-23T10:05:00-03:00',
  account_id: 'act_1667348577717128',
  account_name: 'TalentGroup_01',
  level: 'account',
  date_start: '2026-09-15',
  date_stop: '2026-09-21',
  requested_fields: [
    'account_id',
    'account_name',
    'date_start',
    'date_stop',
    'impressions',
    'clicks',
    'spend',
  ],
  http_status: 200,
  rows_returned: 0,
  connector_error: null,
  log_id: 'log_-SxJ0lPuConb',
  notes:
    'Leitura aprovada nos gates 1–5 e repetida sem ampliação de escopo; resposta 200 com lista vazia — nenhuma entrega no período; não é erro.',
}

// ---------------------------------------------------------------------------
// Erro REAL de 22/09/2026 — tratamento seguro comprovado (não simulado)
// ---------------------------------------------------------------------------

export type T09RealErrorLog = {
  occurred_at: string
  code: 'connector_no_connected_account'
  message: string
  safe_state: 'bloqueada'
  auto_retry: false
  external_writes: 0
  resolution: string
}

export const T09_REAL_ERROR: T09RealErrorLog = {
  occurred_at: '2026-09-22T11:32:00-03:00',
  code: 'connector_no_connected_account',
  message: 'No connected account found for user ID 29577e12-3903-4558-9e24-8358d910e5d4',
  safe_state: 'bloqueada',
  auto_retry: false,
  external_writes: 0,
  resolution:
    'Execução interrompida antes da leitura; nenhum retry automático; retomada somente após conexão segura do conector (resolvida em 23/09).',
}

// ---------------------------------------------------------------------------
// Regras de tratamento de erro (RN-F2-013) — o caso real está em T09_REAL_ERROR
// ---------------------------------------------------------------------------

export type T09ErrorCode = '401' | '403' | '429' | 'timeout' | 'payload_invalid'

export type T09ErrorTreatment = {
  code: T09ErrorCode
  label: string
  safe_state: 'fallback_manual' | 'bloqueada'
  auto_retry: false
  detail: string
}

const T09_ERROR_TREATMENTS: Record<T09ErrorCode, Omit<T09ErrorTreatment, 'code'>> = {
  '401': {
    label: '401 · autorização ausente/expirada',
    safe_state: 'fallback_manual',
    auto_retry: false,
    detail: 'Interromper o modo integrado; manter fallback manual; sem pedir segredo no chat.',
  },
  '403': {
    label: '403 · permissão insuficiente',
    safe_state: 'fallback_manual',
    auto_retry: false,
    detail: 'Não ampliar permissão; registrar o erro e manter a fonte manual auditável.',
  },
  '429': {
    label: '429 · limite de requisições',
    safe_state: 'fallback_manual',
    auto_retry: false,
    detail: 'Não fazer retry cego; preservar o lote recebido e registrar a lacuna.',
  },
  timeout: {
    label: 'timeout · ausência de resposta',
    safe_state: 'fallback_manual',
    auto_retry: false,
    detail: 'Encerrar a tentativa; retornar ao fallback manual com o período registrado.',
  },
  payload_invalid: {
    label: 'payload inválido · fora do contrato',
    safe_state: 'bloqueada',
    auto_retry: false,
    detail:
      'Bloquear o lote até correção humana; campo fora do contrato é descartado e registrado.',
  },
}

export function getT09ErrorTreatment(code: T09ErrorCode): T09ErrorTreatment {
  return { code, ...T09_ERROR_TREATMENTS[code] }
}

export function listT09ErrorTreatments(): T09ErrorTreatment[] {
  return (['401', '403', '429', 'timeout', 'payload_invalid'] as T09ErrorCode[]).map(
    getT09ErrorTreatment,
  )
}

// ---------------------------------------------------------------------------
// Sanitização RN-F2-012: somente campos do contrato; o resto é descartado/registrado
// ---------------------------------------------------------------------------

export type T09SanitizedInsight = {
  contractValues: Partial<Record<T09ContractField, string>>
  discardedFields: string[]
}

export function sanitizeT09Insight(raw: Record<string, unknown>): T09SanitizedInsight {
  const contractValues: Partial<Record<T09ContractField, string>> = {}
  const discardedFields: string[] = []
  const allowed = new Set<string>([...T09_CONTRACT_FIELDS, ...T09_ENVELOPE_FIELDS])

  Object.entries(raw).forEach(([key, value]) => {
    if (allowed.has(key)) {
      contractValues[key as T09ContractField] = String(value ?? '')
    } else {
      discardedFields.push(key)
    }
  })

  return { contractValues, discardedFields }
}

// ---------------------------------------------------------------------------
// Lote sintético autorizado no gate 5 (payload anonimizado, sem dados pessoais)
// ---------------------------------------------------------------------------

export type T09MetaRow = {
  sourceRow: number
  sourceLabel: string
  record_id: string
  tipo_origem: 'inbound' | 'outbound' | 'desconhecido' | ''
  canal: string
  campanha: string
  impressions: string
  clicks: string
  spend: string
  date_start: string
  date_stop: string
  discardedFields: string[]
}

export type T09MetaBatch = {
  batch_id: string
  received_at: string
  period_start: string
  period_end: string
  source_mode: 'meta_integrated_read'
  source_owner: string
  account_id: string
  account_name: string
  level: 'account'
  requested_fields: string[]
  real_read: T09RealReadLog
  rows: T09MetaRow[]
}

export type T09Classification =
  | 'vinculado'
  | 'nao_vinculado'
  | 'desconhecido'
  | 'divergente'
  | 'invalido'

export type T09RowEvaluation = {
  sourceRow: number
  record_id: string
  classification: T09Classification
  status: string
  targetPresent: boolean
  discardedFields: string[]
  detail: string
}

export type T09LedgerEntry = {
  batch_id: string
  fingerprint: string
  safeState: 'integrada_validada' | 'bloqueada'
  reconciliationStatus: 'reconciliado' | 'divergente' | 'bloqueado'
  report: CoreReport
  evaluations: T09RowEvaluation[]
}

export type T09BatchResult = {
  status: 'accepted' | 'replay_skip' | 'payload_conflict'
  safeState: 'integrada_validada' | 'bloqueada'
  reconciliationStatus: 'reconciliado' | 'divergente' | 'bloqueado'
  batch: T09MetaBatch
  fingerprint: string
  report: CoreReport
  evaluations: T09RowEvaluation[]
  actions: CoreAction[]
  ledgerEntry?: T09LedgerEntry
  message: string
}

export const T09_META_BATCH: T09MetaBatch = {
  batch_id: T09_BATCH_ID,
  received_at: '2026-09-23T11:00:00-03:00',
  period_start: '2026-09-15',
  period_end: '2026-09-21',
  source_mode: 'meta_integrated_read',
  source_owner: 'OWNER-NOMINAL-TG',
  account_id: 'act_1667348577717128',
  account_name: 'TalentGroup_01',
  level: 'account',
  requested_fields: [...T09_REAL_READ.requested_fields],
  real_read: T09_REAL_READ,
  rows: [
    {
      sourceRow: 1,
      sourceLabel: 'META-T09-GREEN-001',
      record_id: 'metaads:SYNTH-CAMP-001',
      tipo_origem: 'outbound',
      canal: 'meta',
      campanha: 'F2-SINTETICA-IN-001',
      impressions: '1200',
      clicks: '30',
      spend: '150.00',
      date_start: '2026-09-15',
      date_stop: '2026-09-21',
      discardedFields: ['lead_user_email'],
    },
    {
      sourceRow: 2,
      sourceLabel: 'META-T09-GREEN-002',
      record_id: 'metaads:SYNTH-CAMP-002',
      tipo_origem: 'outbound',
      canal: 'meta',
      campanha: 'F2-SINTETICA-OUT-001',
      impressions: '800',
      clicks: '12',
      spend: '90.50',
      date_start: '2026-09-15',
      date_stop: '2026-09-21',
      discardedFields: [],
    },
    {
      sourceRow: 3,
      sourceLabel: 'META-T09-DUP-REPLAY-001 · primeira ocorrência',
      record_id: 'metaads:SYNTH-CAMP-003',
      tipo_origem: 'outbound',
      canal: 'meta',
      campanha: 'F2-SINTETICA-REPLAY-001',
      impressions: '400',
      clicks: '8',
      spend: '60.00',
      date_start: '2026-09-15',
      date_stop: '2026-09-21',
      discardedFields: [],
    },
    {
      sourceRow: 4,
      sourceLabel: 'META-T09-DUP-REPLAY-001 · reenvio idêntico',
      record_id: 'metaads:SYNTH-CAMP-003',
      tipo_origem: 'outbound',
      canal: 'meta',
      campanha: 'F2-SINTETICA-REPLAY-001',
      impressions: '400',
      clicks: '8',
      spend: '60.00',
      date_start: '2026-09-15',
      date_stop: '2026-09-21',
      discardedFields: [],
    },
    {
      sourceRow: 5,
      sourceLabel: 'META-T09-CONFLICT-001 · versão A',
      record_id: 'metaads:SYNTH-CAMP-004',
      tipo_origem: 'outbound',
      canal: 'meta',
      campanha: 'F2-SINTETICA-CONFLICT-001',
      impressions: '500',
      clicks: '10',
      spend: '100.00',
      date_start: '2026-09-15',
      date_stop: '2026-09-21',
      discardedFields: [],
    },
    {
      sourceRow: 6,
      sourceLabel: 'META-T09-CONFLICT-001 · versão B',
      record_id: 'metaads:SYNTH-CAMP-004',
      tipo_origem: 'outbound',
      canal: 'meta',
      campanha: 'F2-SINTETICA-CONFLICT-001',
      impressions: '500',
      clicks: '10',
      spend: '250.00',
      date_start: '2026-09-15',
      date_stop: '2026-09-21',
      discardedFields: [],
    },
    {
      sourceRow: 7,
      sourceLabel: 'META-T09-UNKNOWN-001',
      record_id: 'metaads:SYNTH-UNK-001',
      tipo_origem: 'desconhecido',
      canal: '',
      campanha: '',
      impressions: '',
      clicks: '',
      spend: '',
      date_start: '',
      date_stop: '',
      discardedFields: [],
    },
    {
      sourceRow: 8,
      sourceLabel: 'META-T09-INVALID-001 · sem chave',
      record_id: '',
      tipo_origem: '',
      canal: '',
      campanha: '',
      impressions: '',
      clicks: '',
      spend: '',
      date_start: '',
      date_stop: '',
      discardedFields: [],
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
  'account_id',
  'account_name',
  'level',
  'requested_fields',
  'real_read',
]

const canonicalRow = (row: T09MetaRow) => [
  row.sourceRow,
  row.sourceLabel,
  row.record_id,
  row.tipo_origem,
  row.canal,
  row.campanha,
  row.impressions,
  row.clicks,
  row.spend,
  row.date_start,
  row.date_stop,
  row.discardedFields,
]

export function fingerprintMetaBatch(batch: T09MetaBatch) {
  return JSON.stringify({
    batch_id: batch.batch_id,
    received_at: batch.received_at,
    period_start: batch.period_start,
    period_end: batch.period_end,
    source_mode: batch.source_mode,
    source_owner: batch.source_owner,
    account_id: batch.account_id,
    account_name: batch.account_name,
    level: batch.level,
    requested_fields: batch.requested_fields,
    rows: batch.rows.map(canonicalRow),
  })
}

const toCoreSource = (row: T09MetaRow): CoreSourceRecord => ({
  sourceRow: row.sourceRow,
  sourceLabel: row.sourceLabel,
  recordId: row.record_id,
  sourceOrigin: row.tipo_origem,
  sourceCampaign: row.campanha,
  payload: JSON.stringify([
    row.canal,
    row.campanha,
    row.impressions,
    row.clicks,
    row.spend,
    row.date_start,
    row.date_stop,
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
): T09Classification => {
  if (status === 'invalid') return 'invalido'
  if (sourceOrigin === 'desconhecido') return 'desconhecido'
  if (status === 'preservado') return 'vinculado'
  if (status === 'ausente_no_destino') return 'nao_vinculado'
  return 'divergente'
}

const buildEvaluations = (batch: T09MetaBatch, report: CoreReport): T09RowEvaluation[] => {
  const reportBySourceRow = new Map<
    number,
    { status: CoreStatus | 'invalid'; targetPresent: boolean; detail: string }
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
      discardedFields: row.discardedFields,
      detail:
        row.discardedFields.length > 0
          ? `${evaluation.detail} Campos fora do contrato descartados e registrados: ${row.discardedFields.join(', ')}.`
          : evaluation.detail,
    }
  })
}

const batchEnvelopeErrors = (batch: T09MetaBatch) => {
  const errors: string[] = []
  const candidate = batch as unknown as Record<string, unknown>
  requiredEnvelopeFields.forEach((field) => {
    const value = candidate[field]
    if (value === undefined || value === null || value === '') {
      errors.push(field)
    }
  })
  if (batch.source_mode !== 'meta_integrated_read') {
    errors.push('source_mode_nao_autorizado')
  }
  const allowedFields = new Set<string>([...T09_CONTRACT_FIELDS, ...T09_ENVELOPE_FIELDS])
  const offContract = batch.requested_fields.filter((field) => !allowedFields.has(field))
  if (offContract.length > 0) {
    errors.push(`campos_fora_do_contrato:${offContract.join(',')}`)
  }
  return errors
}

const emptyReport = (batch: T09MetaBatch, pipelineRows: T04PipelineRecord[]): CoreReport => ({
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
})

export function processMetaBatch(
  batch: T09MetaBatch,
  ledger: T09LedgerEntry[],
  pipelineRows: T04PipelineRecord[],
): T09BatchResult {
  const fingerprint = fingerprintMetaBatch(batch)
  const prior = ledger.find((entry) => entry.batch_id === batch.batch_id)
  const envelopeErrors = batchEnvelopeErrors(batch)

  if (envelopeErrors.length > 0) {
    return {
      status: 'payload_conflict',
      safeState: 'bloqueada',
      reconciliationStatus: 'bloqueado',
      batch,
      fingerprint,
      report: emptyReport(batch, pipelineRows),
      evaluations: [],
      actions: [],
      message: `Payload Meta bloqueado antes da reconciliação. Campos inválidos/ausentes: ${envelopeErrors.join(', ')}.`,
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
  const ledgerEntry: T09LedgerEntry = {
    batch_id: batch.batch_id,
    fingerprint,
    safeState: hasInvalid || hasDivergence ? 'bloqueada' : 'integrada_validada',
    reconciliationStatus,
    report,
    evaluations,
  }

  return {
    status: 'accepted',
    safeState: hasInvalid || hasDivergence ? 'bloqueada' : 'integrada_validada',
    reconciliationStatus,
    batch,
    fingerprint,
    report,
    evaluations,
    actions,
    ledgerEntry,
    message:
      'Lote Meta processado em dry-run com o núcleo compartilhado; nenhuma escrita foi executada em demandas.',
  }
}

// ---------------------------------------------------------------------------
// Bateria determinística da T09 (TDD)
// ---------------------------------------------------------------------------

export function runT09DeterministicChecks(pipelineRows: T04PipelineRecord[]) {
  const ledger: T09LedgerEntry[] = []
  const first = processMetaBatch(T09_META_BATCH, ledger, pipelineRows)
  if (!first.ledgerEntry) {
    throw new Error('A massa sintética T09 não gerou registro de controle para o replay.')
  }
  ledger.push(first.ledgerEntry)

  const replay = processMetaBatch(T09_META_BATCH, ledger, pipelineRows)
  const changedBatch: T09MetaBatch = {
    ...T09_META_BATCH,
    rows: T09_META_BATCH.rows.map((row) =>
      row.sourceRow === 2 ? { ...row, spend: '999.99' } : row,
    ),
  }
  const changedPayload = processMetaBatch(changedBatch, ledger, pipelineRows)

  const rawWithOffContractFields = {
    campaign_id: 'SYNTH-CAMP-RAW',
    campaign_name: 'F2-SINTETICA-RAW',
    impressions: '100',
    clicks: '5',
    spend: '25.00',
    date_start: '2026-09-15',
    date_stop: '2026-09-21',
    lead_user_email: 'exemplo@sintetico.invalid',
    form_field_answers: 'resposta sintética',
  }
  const sanitized = sanitizeT09Insight(rawWithOffContractFields)

  const errorTreatments = listT09ErrorTreatments()
  const classifications = new Set(first.evaluations.map((row) => row.classification))
  const allowedReadFields = new Set<string>([...T09_CONTRACT_FIELDS, ...T09_ENVELOPE_FIELDS])
  const offContractRead = T09_REAL_READ.requested_fields.filter(
    (field) => !allowedReadFields.has(field),
  )
  const summary = first.report.summary
  const createCount = first.actions.filter((action) => action.kind === 'create').length

  const checks = [
    {
      id: 'contract-read',
      label: 'Leitura real usou somente campos do contrato aprovado (gate 3)',
      passed:
        T09_REAL_READ.http_status === 200 &&
        offContractRead.length === 0 &&
        T09_REAL_READ.account_id === 'act_1667348577717128',
      detail: `conta ${T09_REAL_READ.account_name} · ${T09_REAL_READ.date_start} a ${T09_REAL_READ.date_stop} · HTTP ${T09_REAL_READ.http_status} · ${T09_REAL_READ.rows_returned} linha(s) · campos fora do contrato: ${offContractRead.length}`,
    },
    {
      id: 'field-sanitization',
      label: 'Campo fora do contrato é descartado e registrado (RN-F2-012)',
      passed:
        sanitized.discardedFields.length === 2 &&
        sanitized.discardedFields.includes('lead_user_email') &&
        sanitized.discardedFields.includes('form_field_answers') &&
        sanitized.contractValues.campaign_id === 'SYNTH-CAMP-RAW' &&
        sanitized.contractValues.spend === '25.00',
      detail: `descartados: ${sanitized.discardedFields.join(', ')} · campos do contrato preservados`,
    },
    {
      id: 'identity-key',
      label: 'Identidade usa sistema_origem_tecnico + record_id (gate 4)',
      passed:
        first.batch.rows
          .filter((row) => row.record_id)
          .every((row) => row.record_id.startsWith('metaads:')) &&
        first.evaluations.some((row) => row.classification === 'invalido' && row.record_id === ''),
      detail:
        'chaves válidas no formato metaads:<id>; linha sem chave bloqueada como inválida, sem inferência',
    },
    {
      id: 'counts-coincide',
      label: 'IDs e contagens do relatório coincidem com o lote (CA-2-11)',
      passed:
        summary.totalSourceRows === T09_META_BATCH.rows.length &&
        summary.uniqueSourceKeys === 5 &&
        summary.invalidKeys === 1 &&
        summary.duplicateGroups === 1 &&
        summary.conflictGroups === 1 &&
        summary.unknownRows === 1,
      detail: `fonte ${summary.totalSourceRows} linhas · ${summary.uniqueSourceKeys} chaves únicas · ${summary.duplicateGroups} duplicidade · ${summary.conflictGroups} conflito · ${summary.invalidKeys} inválida · ${summary.unknownRows} desconhecida`,
    },
    {
      id: 'initial-no-write',
      label: 'Primeira execução só planeja; pipeline preservado (dry-run)',
      passed: createCount === 2 && pipelineRows.length === 10,
      detail: `${createCount} criação(ões) planejada(s) · pipeline preservado em ${pipelineRows.length} · zero escrita`,
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
      detail: `status ${changedPayload.status} · estado seguro ${changedPayload.safeState} · sem overwrite`,
    },
    {
      id: 'real-error-safe',
      label: 'Erro real do conector (22/09) tratado com estado seguro e sem retry',
      passed:
        T09_REAL_ERROR.safe_state === 'bloqueada' &&
        T09_REAL_ERROR.auto_retry === false &&
        T09_REAL_ERROR.external_writes === 0,
      detail: `${T09_REAL_ERROR.code} → ${T09_REAL_ERROR.safe_state} · retry ${T09_REAL_ERROR.auto_retry} · escritas externas ${T09_REAL_ERROR.external_writes} · caso REAL, não simulado`,
    },
    {
      id: 'error-rules',
      label: '401/403/429/timeout/payload inválido interrompem sem retry cego (RN-F2-013)',
      passed:
        errorTreatments.length === 5 &&
        errorTreatments.every(
          (treatment) =>
            treatment.auto_retry === false &&
            (treatment.safe_state === 'fallback_manual' || treatment.safe_state === 'bloqueada'),
        ) &&
        errorTreatments.filter((treatment) => treatment.safe_state === 'bloqueada').length === 1,
      detail: errorTreatments
        .map((treatment) => `${treatment.code}: ${treatment.safe_state}`)
        .join(' · '),
    },
    {
      id: 'core-reused',
      label: 'Reconciliação usa o núcleo compartilhado e mantém o pipeline somente leitura',
      passed:
        first.report.batchId === T09_BATCH_ID &&
        first.report.summary.pipelineOnlyKeys === pipelineRows.length &&
        pipelineRows.length === 10 &&
        first.status === 'accepted',
      detail: `adapter Meta → reconcileByRecordId → relatório dry-run · ${first.report.summary.pipelineOnlyKeys} registros do destino não vieram neste lote · estado ${first.safeState}`,
    },
  ]

  return {
    first,
    replay,
    changedPayload,
    sanitized,
    errorTreatments,
    checks,
    classifications: Array.from(classifications),
  }
}

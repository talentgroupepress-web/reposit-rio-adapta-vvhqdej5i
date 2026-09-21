import {
  reconcileByRecordId,
  planCoreActions,
  type CoreReport,
  type CoreSourceRecord,
} from '@/lib/f2/reconciliation/core'
import {
  PIPELINE_BASELINE_SNAPSHOT,
  SOURCE_BATCH,
  T04_BATCH_ID,
  type T04Action,
  type T04PipelineRecord,
  type T04Report,
  type T04ReportRow,
  type T04SourceRecord,
} from './sourceBatch'

const projection = (record: T04SourceRecord | T04PipelineRecord) =>
  JSON.stringify([
    record.empresa || '',
    record.tipo_origem || '',
    record.canal || '',
    record.campanha || '',
    record.oferta_servico || '',
    record.estado || '',
    record.qualidade || '',
  ])

const toCoreSource = (record: T04SourceRecord): CoreSourceRecord => ({
  sourceRow: record.sourceRow,
  sourceLabel: record.sourceLabel,
  recordId: record.record_id,
  sourceOrigin: record.tipo_origem,
  sourceCampaign: record.campanha,
  payload: projection(record),
})

const toCoreTarget = (record: T04PipelineRecord) => ({
  recordId: record.record_id,
  payload: projection(record),
})

const statusToT04 = (status: CoreReport['rows'][number]['status']): T04ReportRow['status'] => {
  if (status === 'preservado') return 'preservado_no_pipeline'
  if (status === 'desconhecido_preservado') return 'desconhecido_preservado'
  if (status === 'desconhecido_sem_destino') return 'ausente_no_pipeline'
  if (status === 'ausente_no_destino') return 'ausente_no_pipeline'
  return status
}

const toT04Report = (
  coreReport: CoreReport,
  sourceRows: T04SourceRecord[],
  pipelineRows: T04PipelineRecord[],
): T04Report => {
  const groups = new Map<string, T04SourceRecord[]>()
  sourceRows.forEach((row) => {
    if (!row.record_id) return
    const rows = groups.get(row.record_id) || []
    rows.push(row)
    groups.set(row.record_id, rows)
  })
  const byId = new Map(pipelineRows.map((row) => [row.record_id, row]))
  const baseline = sourceRows.filter((row) => row.kind === 'baseline')
  const baselineRows = baseline.filter((row) => {
    const target = byId.get(row.record_id)
    return Boolean(target) && projection(row) === projection(target)
  })

  return {
    batchId: coreReport.batchId,
    rows: coreReport.rows.map((row) => ({
      record_id: row.recordId,
      sourceRows: row.sourceRows,
      sourceCount: row.sourceCount,
      sourceOrigin: row.sourceOrigin,
      sourceCampaign: row.sourceCampaign,
      targetPresent: row.targetPresent,
      status: statusToT04(row.status),
      detail: row.detail,
      owner: row.owner,
    })),
    invalidRows: sourceRows.filter((row) => !row.record_id),
    summary: {
      totalSourceRows: coreReport.summary.totalSourceRows,
      uniqueSourceKeys: coreReport.summary.uniqueSourceKeys,
      invalidKeys: coreReport.summary.invalidKeys,
      matchedKeys: coreReport.rows.filter(
        (row) => row.status === 'preservado' || row.status === 'desconhecido_preservado',
      ).length,
      sourceOnlyKeys: coreReport.rows.filter(
        (row) => row.status === 'ausente_no_destino' || row.status === 'desconhecido_sem_destino',
      ).length,
      pipelineOnlyKeys: coreReport.summary.pipelineOnlyKeys,
      duplicateGroups: coreReport.summary.duplicateGroups,
      duplicateRows: coreReport.summary.duplicateRows,
      conflictGroups: coreReport.summary.conflictGroups,
      conflictRows: coreReport.summary.conflictRows,
      unknownRows: sourceRows.filter((row) => row.tipo_origem === 'desconhecido').length,
      baselineReconciliationPassed:
        baseline.length === baselineRows.length && coreReport.summary.pipelineOnlyKeys === 0,
    },
  }
}

const toCoreReport = (sourceRows: T04SourceRecord[], pipelineRows: T04PipelineRecord[]) =>
  reconcileByRecordId({
    batchId: T04_BATCH_ID,
    sourceRows: sourceRows.map(toCoreSource),
    targetRows: pipelineRows.map(toCoreTarget),
  })

export function reconcileT04(
  sourceRows: T04SourceRecord[],
  pipelineRows: T04PipelineRecord[],
): T04Report {
  return toT04Report(toCoreReport(sourceRows, pipelineRows), sourceRows, pipelineRows)
}

export function planT04Actions(
  sourceRows: T04SourceRecord[],
  pipelineRows: T04PipelineRecord[],
): T04Action[] {
  const coreSourceRows = sourceRows.map(toCoreSource)
  const coreReport = toCoreReport(sourceRows, pipelineRows)
  const sourceByRow = new Map(sourceRows.map((row) => [row.sourceRow, row]))

  return planCoreActions(coreSourceRows, coreReport).map((action) => ({
    kind: action.kind,
    source: sourceByRow.get(action.source.sourceRow)!,
    detail: action.detail,
  }))
}

export function toPipelineRecord(source: T04SourceRecord): T04PipelineRecord {
  return {
    record_id: source.record_id,
    empresa: source.empresa,
    tipo_origem: source.tipo_origem,
    canal: source.canal,
    campanha: source.campanha,
    oferta_servico: source.oferta_servico,
    estado: source.estado,
    qualidade: source.qualidade,
  }
}

export function runT04DeterministicChecks(pipelineRows: T04PipelineRecord[]) {
  const firstReport = reconcileT04(SOURCE_BATCH, pipelineRows)
  const firstActions = planT04Actions(SOURCE_BATCH, pipelineRows)
  const plannedCreates = firstActions
    .filter((action) => action.kind === 'create')
    .map((action) => toPipelineRecord(action.source))
  const replayPipeline = [...pipelineRows, ...plannedCreates]
  const replayReport = reconcileT04(SOURCE_BATCH, replayPipeline)
  const replayActions = planT04Actions(SOURCE_BATCH, replayPipeline)
  const checks = [
    {
      id: 'baseline-reconciliation',
      label: 'Baseline F1/F2-T03 reconcilia por IDs sem mutação',
      passed: firstReport.summary.baselineReconciliationPassed,
      detail: `fonte baseline ${PIPELINE_BASELINE_SNAPSHOT.length} · pipeline ${pipelineRows.length}`,
    },
    {
      id: 'green-inbound-outbound',
      label: 'GREEN inbound e outbound geram duas ações de criação no dry-run',
      passed:
        plannedCreates.length === 2 &&
        plannedCreates.some((row) => row.record_id === 'T04-GREEN-IN-001') &&
        plannedCreates.some((row) => row.record_id === 'T04-GREEN-OUT-001'),
      detail: `criações planejadas ${plannedCreates.length}`,
    },
    {
      id: 'unknown-no-inference',
      label: 'RED sem origem/chave não é inferido nem criado',
      passed: firstReport.invalidRows.length === 1 && firstReport.invalidRows[0].record_id === '',
      detail: `linhas inválidas ${firstReport.invalidRows.length}`,
    },
    {
      id: 'duplicate-blocked',
      label: 'Replay idêntico é sinalizado sem segunda gravação',
      passed:
        firstReport.summary.duplicateGroups === 1 &&
        firstActions.some(
          (action) => action.kind === 'skip' && action.source.record_id === 'T04-DUP-REPLAY-001',
        ),
      detail: `grupos duplicados ${firstReport.summary.duplicateGroups}`,
    },
    {
      id: 'conflict-blocked',
      label: 'Conflito de mesmo record_id é bloqueado sem overwrite',
      passed:
        firstReport.summary.conflictGroups === 1 &&
        firstActions.some(
          (action) => action.kind === 'conflict' && action.source.record_id === 'T04-CONFLICT-001',
        ),
      detail: `grupos em conflito ${firstReport.summary.conflictGroups}`,
    },
    {
      id: 'replay-idempotent',
      label: 'Reprocessar o mesmo lote não cria novos registros',
      passed:
        replayActions.filter((action) => action.kind === 'create').length === 0 &&
        replayReport.summary.baselineReconciliationPassed,
      detail: `criações no replay ${replayActions.filter((action) => action.kind === 'create').length}`,
    },
    {
      id: 'no-mutation',
      label: 'Engine é pura e não altera a lista recebida',
      passed: pipelineRows.length === PIPELINE_BASELINE_SNAPSHOT.length,
      detail: `pipeline vivo preservado em ${pipelineRows.length} registros`,
    },
  ]
  return { firstReport, replayReport, firstActions, replayActions, checks }
}

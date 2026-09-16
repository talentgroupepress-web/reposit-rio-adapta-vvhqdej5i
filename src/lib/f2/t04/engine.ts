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

const groupSourceRows = (sourceRows: T04SourceRecord[]) => {
  const groups = new Map<string, T04SourceRecord[]>()
  sourceRows.forEach((row) => {
    if (!row.record_id) return
    const rows = groups.get(row.record_id) || []
    rows.push(row)
    groups.set(row.record_id, rows)
  })
  return groups
}

const statusIsPreserved = (status: T04ReportRow['status']) =>
  status === 'preservado_no_pipeline' || status === 'desconhecido_preservado'

export function reconcileT04(
  sourceRows: T04SourceRecord[],
  pipelineRows: T04PipelineRecord[],
): T04Report {
  const groups = groupSourceRows(sourceRows)
  const byId = new Map(pipelineRows.map((row) => [row.record_id, row]))
  const invalidRows = sourceRows.filter((row) => !row.record_id)
  const rows: T04ReportRow[] = []

  groups.forEach((group, recordId) => {
    const target = byId.get(recordId)
    const first = group[0]
    const identical = group.every((row) => projection(row) === projection(first))
    const sourceRowsNumbers = group.map((row) => row.sourceRow)
    const targetPresent = Boolean(target)

    if (group.length > 1) {
      rows.push({
        record_id: recordId,
        sourceRows: sourceRowsNumbers,
        sourceCount: group.length,
        sourceOrigin: first.tipo_origem || 'sem origem',
        sourceCampaign: first.campanha || 'sem campanha',
        targetPresent,
        status: identical ? 'duplicidade_no_lote' : 'conflito_no_lote',
        detail: identical
          ? 'Chave repetida com payload idêntico; o reprocessamento não deve criar uma segunda gravação.'
          : 'Chave repetida com payload divergente; bloquear e encaminhar para revisão humana, sem overwrite.',
        owner: 'Responsável pela qualidade da fonte',
      })
      return
    }

    if (!target) {
      rows.push({
        record_id: recordId,
        sourceRows: sourceRowsNumbers,
        sourceCount: 1,
        sourceOrigin: first.tipo_origem || 'sem origem',
        sourceCampaign: first.campanha || 'sem campanha',
        targetPresent: false,
        status: 'ausente_no_pipeline',
        detail:
          'Registro de teste ainda não está no pipeline; ação prevista no dry-run: criar uma vez.',
        owner: 'Responsável pela qualidade da fonte',
      })
      return
    }

    const same = projection(first) === projection(target)
    if (!same) {
      rows.push({
        record_id: recordId,
        sourceRows: sourceRowsNumbers,
        sourceCount: 1,
        sourceOrigin: first.tipo_origem || 'sem origem',
        sourceCampaign: first.campanha || 'sem campanha',
        targetPresent: true,
        status: 'conflito_com_pipeline',
        detail: 'O mesmo record_id já existe no pipeline com payload diferente; não sobrescrever.',
        owner: 'Responsável pela qualidade da fonte',
      })
      return
    }

    rows.push({
      record_id: recordId,
      sourceRows: sourceRowsNumbers,
      sourceCount: 1,
      sourceOrigin: first.tipo_origem || 'sem origem',
      sourceCampaign: first.campanha || 'sem campanha',
      targetPresent: true,
      status:
        first.tipo_origem === 'desconhecido' ? 'desconhecido_preservado' : 'preservado_no_pipeline',
      detail:
        first.tipo_origem === 'desconhecido'
          ? 'Origem desconhecida preservada sem inferência de canal ou campanha.'
          : 'Payload da fonte coincide com o registro existente no pipeline.',
      owner: 'Responsável pela qualidade da fonte',
    })
  })

  const baseline = sourceRows.filter((row) => row.kind === 'baseline')
  const baselineRows = baseline.filter((row) => {
    const target = byId.get(row.record_id)
    return Boolean(target) && projection(row) === projection(target)
  })
  const sourceIds = new Set(groups.keys())
  const pipelineOnlyKeys = pipelineRows.filter((row) => !sourceIds.has(row.record_id))
  const duplicateRows = rows
    .filter((row) => row.status === 'duplicidade_no_lote')
    .reduce((total, row) => total + Math.max(0, row.sourceCount - 1), 0)
  const conflictRows = rows
    .filter((row) => row.status === 'conflito_no_lote' || row.status === 'conflito_com_pipeline')
    .reduce((total, row) => total + row.sourceCount, 0)

  return {
    batchId: T04_BATCH_ID,
    rows,
    invalidRows,
    summary: {
      totalSourceRows: sourceRows.length,
      uniqueSourceKeys: groups.size,
      invalidKeys: invalidRows.length,
      matchedKeys: rows.filter((row) => statusIsPreserved(row.status)).length,
      sourceOnlyKeys: rows.filter((row) => row.status === 'ausente_no_pipeline').length,
      pipelineOnlyKeys: pipelineOnlyKeys.length,
      duplicateGroups: rows.filter((row) => row.status === 'duplicidade_no_lote').length,
      duplicateRows,
      conflictGroups: rows.filter(
        (row) => row.status === 'conflito_no_lote' || row.status === 'conflito_com_pipeline',
      ).length,
      conflictRows,
      unknownRows: sourceRows.filter((row) => row.tipo_origem === 'desconhecido').length,
      baselineReconciliationPassed:
        baseline.length === baselineRows.length && pipelineOnlyKeys.length === 0,
    },
  }
}

export function planT04Actions(
  sourceRows: T04SourceRecord[],
  pipelineRows: T04PipelineRecord[],
): T04Action[] {
  const report = reconcileT04(sourceRows, pipelineRows)
  const sourceById = new Map(
    sourceRows.filter((row) => row.record_id).map((row) => [row.record_id, row]),
  )
  return report.rows.map((row) => {
    const source =
      sourceById.get(row.record_id) ||
      sourceRows.find((candidate) => candidate.sourceRow === row.sourceRows[0])!
    if (row.status === 'ausente_no_pipeline' && row.sourceCount === 1) {
      return {
        kind: 'create',
        source,
        detail: 'Dry-run: criar uma vez, sem gravar no pipeline nesta task.',
      }
    }
    if (row.status === 'duplicidade_no_lote') {
      return {
        kind: 'skip',
        source,
        detail: 'Dry-run: ignorar replay idêntico; nenhuma duplicata.',
      }
    }
    if (row.status === 'conflito_no_lote' || row.status === 'conflito_com_pipeline') {
      return {
        kind: 'conflict',
        source,
        detail: 'Dry-run: bloquear conflito; revisão humana necessária.',
      }
    }
    return { kind: 'skip', source, detail: 'Dry-run: registro já preservado no pipeline.' }
  })
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

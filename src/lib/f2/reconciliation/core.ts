export type CoreSourceRecord = {
  sourceRow: number
  sourceLabel: string
  recordId: string
  sourceOrigin: string
  sourceCampaign: string
  payload: string
}

export type CoreTargetRecord = {
  recordId: string
  payload: string
}

export type CoreStatus =
  | 'preservado'
  | 'desconhecido_preservado'
  | 'desconhecido_sem_destino'
  | 'duplicidade_no_lote'
  | 'conflito_no_lote'
  | 'ausente_no_destino'
  | 'conflito_com_destino'

export type CoreReportRow = {
  recordId: string
  sourceRows: number[]
  sourceCount: number
  sourceOrigin: string
  sourceCampaign: string
  targetPresent: boolean
  status: CoreStatus
  detail: string
  owner: string
}

export type CoreReport = {
  batchId: string
  rows: CoreReportRow[]
  invalidRows: CoreSourceRecord[]
  summary: {
    totalSourceRows: number
    uniqueSourceKeys: number
    invalidKeys: number
    matchedKeys: number
    sourceOnlyKeys: number
    pipelineOnlyKeys: number
    duplicateGroups: number
    duplicateRows: number
    conflictGroups: number
    conflictRows: number
    unknownRows: number
    baselineReconciliationPassed: boolean
  }
}

export type CoreAction = {
  kind: 'create' | 'skip' | 'conflict'
  source: CoreSourceRecord
  detail: string
}

type CoreOptions = {
  batchId: string
  sourceRows: CoreSourceRecord[]
  targetRows: CoreTargetRecord[]
}

const groupSourceRows = (sourceRows: CoreSourceRecord[]) => {
  const groups = new Map<string, CoreSourceRecord[]>()
  sourceRows.forEach((row) => {
    if (!row.recordId) return
    const rows = groups.get(row.recordId) || []
    rows.push(row)
    groups.set(row.recordId, rows)
  })
  return groups
}

const statusIsPreserved = (status: CoreStatus) =>
  status === 'preservado' || status === 'desconhecido_preservado'

export function reconcileByRecordId({ batchId, sourceRows, targetRows }: CoreOptions): CoreReport {
  const groups = groupSourceRows(sourceRows)
  const byId = new Map(targetRows.map((row) => [row.recordId, row]))
  const invalidRows = sourceRows.filter((row) => !row.recordId)
  const rows: CoreReportRow[] = []

  groups.forEach((group, recordId) => {
    const target = byId.get(recordId)
    const first = group[0]
    const sourceRowsNumbers = group.map((row) => row.sourceRow)
    const targetPresent = Boolean(target)
    const identical = group.every((row) => row.payload === first.payload)

    if (group.length > 1) {
      rows.push({
        recordId,
        sourceRows: sourceRowsNumbers,
        sourceCount: group.length,
        sourceOrigin: first.sourceOrigin || 'sem origem',
        sourceCampaign: first.sourceCampaign || 'sem campanha',
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
        recordId,
        sourceRows: sourceRowsNumbers,
        sourceCount: 1,
        sourceOrigin: first.sourceOrigin || 'sem origem',
        sourceCampaign: first.sourceCampaign || 'sem campanha',
        targetPresent: false,
        status:
          first.sourceOrigin === 'desconhecido' ? 'desconhecido_sem_destino' : 'ausente_no_destino',
        detail:
          first.sourceOrigin === 'desconhecido'
            ? 'Origem desconhecida e sem vínculo; preservar a lacuna, sem inferência ou criação.'
            : 'Registro não vinculado ao destino declarado; ação de criação seria apenas planejada, nunca executada nesta prova.',
        owner: 'Responsável pela qualidade da fonte',
      })
      return
    }

    if (first.payload !== target.payload) {
      rows.push({
        recordId,
        sourceRows: sourceRowsNumbers,
        sourceCount: 1,
        sourceOrigin: first.sourceOrigin || 'sem origem',
        sourceCampaign: first.sourceCampaign || 'sem campanha',
        targetPresent: true,
        status: 'conflito_com_destino',
        detail: 'O mesmo record_id já existe no destino com payload diferente; não sobrescrever.',
        owner: 'Responsável pela qualidade da fonte',
      })
      return
    }

    rows.push({
      recordId,
      sourceRows: sourceRowsNumbers,
      sourceCount: 1,
      sourceOrigin: first.sourceOrigin || 'sem origem',
      sourceCampaign: first.sourceCampaign || 'sem campanha',
      targetPresent: true,
      status: first.sourceOrigin === 'desconhecido' ? 'desconhecido_preservado' : 'preservado',
      detail:
        first.sourceOrigin === 'desconhecido'
          ? 'Origem desconhecida preservada sem inferência de canal ou campanha.'
          : 'Payload da fonte coincide com o registro existente no destino declarado.',
      owner: 'Responsável pela qualidade da fonte',
    })
  })

  const sourceIds = new Set(groups.keys())
  const pipelineOnlyKeys = targetRows.filter((row) => !sourceIds.has(row.recordId))
  const duplicateRows = rows
    .filter((row) => row.status === 'duplicidade_no_lote')
    .reduce((total, row) => total + Math.max(0, row.sourceCount - 1), 0)
  const conflictRows = rows
    .filter((row) => row.status === 'conflito_no_lote' || row.status === 'conflito_com_destino')
    .reduce((total, row) => total + row.sourceCount, 0)

  return {
    batchId,
    rows,
    invalidRows,
    summary: {
      totalSourceRows: sourceRows.length,
      uniqueSourceKeys: groups.size,
      invalidKeys: invalidRows.length,
      matchedKeys: rows.filter((row) => statusIsPreserved(row.status)).length,
      sourceOnlyKeys: rows.filter((row) => row.status === 'ausente_no_destino').length,
      pipelineOnlyKeys: pipelineOnlyKeys.length,
      duplicateGroups: rows.filter((row) => row.status === 'duplicidade_no_lote').length,
      duplicateRows,
      conflictGroups: rows.filter(
        (row) => row.status === 'conflito_no_lote' || row.status === 'conflito_com_destino',
      ).length,
      conflictRows,
      unknownRows: sourceRows.filter((row) => row.sourceOrigin === 'desconhecido').length,
      baselineReconciliationPassed: pipelineOnlyKeys.length === 0,
    },
  }
}

export function planCoreActions(sourceRows: CoreSourceRecord[], report: CoreReport): CoreAction[] {
  const sourceById = new Map(
    sourceRows.filter((row) => row.recordId).map((row) => [row.recordId, row]),
  )

  return report.rows.map((row) => {
    const source =
      sourceById.get(row.recordId) ||
      sourceRows.find((candidate) => candidate.sourceRow === row.sourceRows[0])!

    if (row.status === 'ausente_no_destino') {
      return {
        kind: 'create' as const,
        source,
        detail: 'Dry-run: criar uma vez, sem gravar no destino nesta task.',
      }
    }

    if (row.status === 'duplicidade_no_lote') {
      return {
        kind: 'skip' as const,
        source,
        detail: 'Dry-run: ignorar replay idêntico; nenhuma duplicata.',
      }
    }

    if (row.status === 'conflito_no_lote' || row.status === 'conflito_com_destino') {
      return {
        kind: 'conflict' as const,
        source,
        detail: 'Dry-run: bloquear conflito; revisão humana necessária.',
      }
    }

    return {
      kind: 'skip' as const,
      source,
      detail: 'Dry-run: registro já preservado ou desconhecido, sem inferência.',
    }
  })
}

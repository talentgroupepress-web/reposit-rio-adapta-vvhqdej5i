export type T04Origin = 'inbound' | 'outbound' | 'desconhecido' | ''
export type T04RowKind = 'baseline' | 'test'

export type T04SourceRecord = {
  sourceRow: number
  sourceLabel: string
  kind: T04RowKind
  record_id: string
  empresa: string
  tipo_origem: T04Origin
  canal: string
  campanha: string
  oferta_servico: string
  estado: string
  qualidade: string
}

export type T04PipelineRecord = {
  id?: string
  record_id: string
  empresa: string
  tipo_origem: string
  canal: string
  campanha: string
  oferta_servico: string
  estado: string
  qualidade: string
}

export type T04Status =
  | 'preservado_no_pipeline'
  | 'desconhecido_preservado'
  | 'duplicidade_no_lote'
  | 'conflito_no_lote'
  | 'chave_ausente'
  | 'ausente_no_pipeline'
  | 'conflito_com_destino'
  | 'conflito_com_pipeline'

export type T04ReportRow = {
  record_id: string
  sourceRows: number[]
  sourceCount: number
  sourceOrigin: string
  sourceCampaign: string
  targetPresent: boolean
  status: T04Status
  detail: string
  owner: string
}

export type T04Report = {
  batchId: string
  rows: T04ReportRow[]
  invalidRows: T04SourceRecord[]
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

export type T04Action = {
  kind: 'create' | 'skip' | 'conflict' | 'invalid'
  source: T04SourceRecord
  detail: string
}

export const T04_BATCH_ID = 'F2-T04-SOURCE-001'

export const SOURCE_BATCH: T04SourceRecord[] = [
  {
    sourceRow: 1,
    sourceLabel: 'FIX-IN-001',
    kind: 'baseline',
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
    sourceLabel: 'FIX-OUT-001',
    kind: 'baseline',
    record_id: 'FIX-OUT-001',
    empresa: 'Empresa Beta (fixture)',
    tipo_origem: 'outbound',
    canal: 'linkedin',
    campanha: 'F1-FIXTURE-OUT',
    oferta_servico: 'Terceirização',
    estado: 'prospect',
    qualidade: 'ok',
  },
  {
    sourceRow: 3,
    sourceLabel: 'FIX-UNK-001',
    kind: 'baseline',
    record_id: 'FIX-UNK-001',
    empresa: 'Empresa Gamma (fixture)',
    tipo_origem: 'desconhecido',
    canal: '',
    campanha: '',
    oferta_servico: '',
    estado: 'suspect',
    qualidade: 'desconhecido',
  },
  {
    sourceRow: 4,
    sourceLabel: 'FIX-DUP-001',
    kind: 'baseline',
    record_id: 'FIX-DUP-001',
    empresa: 'Empresa Alpha (fixture)',
    tipo_origem: 'inbound',
    canal: 'indicacao',
    campanha: '',
    oferta_servico: 'R&S',
    estado: 'suspect',
    qualidade: 'pendente',
  },
  {
    sourceRow: 5,
    sourceLabel: 'FIX-SEC-001',
    kind: 'baseline',
    record_id: 'FIX-SEC-001',
    empresa: 'Empresa Delta (fixture)',
    tipo_origem: 'outbound',
    canal: 'evento',
    campanha: 'F1-FIXTURE-OUT',
    oferta_servico: 'Testes Psicológicos',
    estado: 'suspect',
    qualidade: 'restrito',
  },
  {
    sourceRow: 6,
    sourceLabel: 'FIX-GREEN-002',
    kind: 'baseline',
    record_id: 'FIX-GREEN-002',
    empresa: 'Empresa Green 2',
    tipo_origem: 'inbound',
    canal: 'site',
    campanha: 'F1-FIXTURE-IN',
    oferta_servico: 'R&S',
    estado: 'suspect',
    qualidade: 'ok',
  },
  {
    sourceRow: 7,
    sourceLabel: 'FIX-DIAG-002',
    kind: 'baseline',
    record_id: 'FIX-DIAG-002',
    empresa: 'Diag 2',
    tipo_origem: 'inbound',
    canal: 'site',
    campanha: 'C',
    oferta_servico: 'R&S',
    estado: 'suspect',
    qualidade: 'ok',
  },
  {
    sourceRow: 8,
    sourceLabel: 'ATR-F2-IN-001',
    kind: 'baseline',
    record_id: 'ATR-F2-IN-001',
    empresa: 'Empresa Atlas (fixture ATR inbound)',
    tipo_origem: 'inbound',
    canal: 'site',
    campanha: 'F2-ATR-FONTE-UNICA-IN',
    oferta_servico: 'R&S',
    estado: 'suspect',
    qualidade: 'ok',
  },
  {
    sourceRow: 9,
    sourceLabel: 'ATR-F2-OUT-001',
    kind: 'baseline',
    record_id: 'ATR-F2-OUT-001',
    empresa: 'Empresa Boreal (fixture ATR outbound)',
    tipo_origem: 'outbound',
    canal: 'linkedin',
    campanha: 'F2-ATR-FONTE-UNICA-OUT',
    oferta_servico: 'Terceirização',
    estado: 'suspect',
    qualidade: 'ok',
  },
  {
    sourceRow: 10,
    sourceLabel: 'ATR-F2-UNK-001',
    kind: 'baseline',
    record_id: 'ATR-F2-UNK-001',
    empresa: 'Empresa Cedro (fixture ATR desconhecida)',
    tipo_origem: 'desconhecido',
    canal: '',
    campanha: '',
    oferta_servico: '',
    estado: 'suspect',
    qualidade: 'desconhecido',
  },
  {
    sourceRow: 11,
    sourceLabel: 'T04-GREEN-IN-001',
    kind: 'test',
    record_id: 'T04-GREEN-IN-001',
    empresa: 'Empresa Horizonte (fixture T04 inbound)',
    tipo_origem: 'inbound',
    canal: 'site',
    campanha: 'F2-T04-GREEN-IN',
    oferta_servico: 'R&S',
    estado: 'suspect',
    qualidade: 'ok',
  },
  {
    sourceRow: 12,
    sourceLabel: 'T04-GREEN-OUT-001',
    kind: 'test',
    record_id: 'T04-GREEN-OUT-001',
    empresa: 'Empresa Prisma (fixture T04 outbound)',
    tipo_origem: 'outbound',
    canal: 'linkedin',
    campanha: 'F2-T04-GREEN-OUT',
    oferta_servico: 'Terceirização',
    estado: 'suspect',
    qualidade: 'ok',
  },
  {
    sourceRow: 13,
    sourceLabel: 'T04-DUP-REPLAY-001 · primeira ocorrência',
    kind: 'test',
    record_id: 'T04-DUP-REPLAY-001',
    empresa: 'Empresa Replay (fixture T04)',
    tipo_origem: 'inbound',
    canal: 'site',
    campanha: 'F2-T04-REPLAY',
    oferta_servico: 'R&S',
    estado: 'suspect',
    qualidade: 'ok',
  },
  {
    sourceRow: 14,
    sourceLabel: 'T04-DUP-REPLAY-001 · reenvio idêntico',
    kind: 'test',
    record_id: 'T04-DUP-REPLAY-001',
    empresa: 'Empresa Replay (fixture T04)',
    tipo_origem: 'inbound',
    canal: 'site',
    campanha: 'F2-T04-REPLAY',
    oferta_servico: 'R&S',
    estado: 'suspect',
    qualidade: 'ok',
  },
  {
    sourceRow: 15,
    sourceLabel: 'T04-CONFLICT-001 · versão A',
    kind: 'test',
    record_id: 'T04-CONFLICT-001',
    empresa: 'Empresa Conflito (fixture T04)',
    tipo_origem: 'inbound',
    canal: 'site',
    campanha: 'F2-T04-CONFLICT-IN',
    oferta_servico: 'R&S',
    estado: 'suspect',
    qualidade: 'ok',
  },
  {
    sourceRow: 16,
    sourceLabel: 'T04-CONFLICT-001 · versão B',
    kind: 'test',
    record_id: 'T04-CONFLICT-001',
    empresa: 'Empresa Conflito (fixture T04)',
    tipo_origem: 'outbound',
    canal: 'linkedin',
    campanha: 'F2-T04-CONFLICT-OUT',
    oferta_servico: 'Terceirização',
    estado: 'suspect',
    qualidade: 'ok',
  },
  {
    sourceRow: 17,
    sourceLabel: 'T04-RED-UNKNOWN-001 · sem chave/origem',
    kind: 'test',
    record_id: '',
    empresa: 'Empresa sem chave (fixture T04)',
    tipo_origem: '',
    canal: '',
    campanha: '',
    oferta_servico: '',
    estado: 'suspect',
    qualidade: 'desconhecido',
  },
]

export const PIPELINE_BASELINE_SNAPSHOT: T04PipelineRecord[] = SOURCE_BATCH.filter(
  (row) => row.kind === 'baseline',
).map(
  ({ record_id, empresa, tipo_origem, canal, campanha, oferta_servico, estado, qualidade }) => ({
    record_id,
    empresa,
    tipo_origem,
    canal,
    campanha,
    oferta_servico,
    estado,
    qualidade,
  }),
)

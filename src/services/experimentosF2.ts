import pb from '@/lib/pocketbase/client'

export const F2_STATES = [
  'Rascunho',
  'Em revisão',
  'Aprovado para preparação',
  'Bloqueado',
  'Rejeitado',
  'Arquivado',
] as const
export type F2State = (typeof F2_STATES)[number]

export type BriefingF2 = {
  id: string
  experiment_id: string
  title: string
  service: string
  origin: string
  channel: string
  briefing_version: string
  state: F2State
  synthetic_only: boolean
  offer: Record<string, unknown>
  hypothesis: Record<string, unknown>
  audience: Record<string, unknown>
  execution_window: Record<string, unknown>
  analysis_period: string
  budget: Record<string, unknown>
  criteria: Record<string, unknown>
  owner_user: string
  briefing_responsible: string
  approver_user?: string
  created: string
  updated: string
}

export async function listBriefings() {
  return pb.collection('experimentos_f2').getFullList<BriefingF2>({ sort: '-updated' })
}

export async function getBriefing(id: string) {
  return pb.collection('experimentos_f2').getOne<BriefingF2>(id)
}

export function validateBriefing(data: Partial<BriefingF2>) {
  const errors: string[] = []
  if (!data.experiment_id) errors.push('ID do experimento é obrigatório.')
  if (!data.title) errors.push('Título é obrigatório.')
  if (!['R&S', 'TMO', 'R&S + TMO'].includes(data.service || '')) errors.push('Serviço inválido.')
  if (!['inbound', 'outbound', 'não identificado'].includes(data.origin || ''))
    errors.push('Origem inválida.')
  if (!data.channel) errors.push('Canal é obrigatório.')
  if (!data.hypothesis) errors.push('Hipótese é obrigatória.')
  if (!data.audience) errors.push('Público/ICP é obrigatório.')
  if (!data.execution_window) errors.push('Janela de execução prevista é obrigatória.')
  if (!data.analysis_period) errors.push('Período de análise previsto é obrigatório.')
  if (!data.budget) errors.push('Orçamento previsto é obrigatório.')
  if (!data.criteria) errors.push('Critérios são obrigatórios.')
  if (data.synthetic_only !== true) errors.push('F2-T01 aceita somente massa sintética.')
  return errors
}

export function allowedTransition(from: F2State, to: F2State) {
  const allowed: Record<F2State, F2State[]> = {
    Rascunho: ['Em revisão', 'Rejeitado', 'Arquivado'],
    'Em revisão': ['Aprovado para preparação', 'Bloqueado', 'Rejeitado', 'Arquivado'],
    'Aprovado para preparação': ['Arquivado'],
    Bloqueado: ['Em revisão', 'Arquivado'],
    Rejeitado: ['Arquivado'],
    Arquivado: [],
  }
  return allowed[from]?.includes(to) ?? false
}

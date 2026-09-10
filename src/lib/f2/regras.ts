export const ESTADOS_BRIEFING = [
  'Rascunho',
  'Em revisão',
  'Aprovado para preparação',
  'Bloqueado',
  'Rejeitado',
  'Arquivado',
] as const

export type EstadoBriefing = (typeof ESTADOS_BRIEFING)[number]

export const SERVICOS = ['R&S', 'TMO', 'R&S + TMO'] as const
export const ORIGENS = ['inbound', 'outbound', 'não identificado'] as const
export const CRITERIOS_PARADA = ['CONTINUAR', 'AJUSTAR', 'INTERROMPER', 'INCONCLUSIVO'] as const

export const TRANSICOES: Record<EstadoBriefing, EstadoBriefing[]> = {
  Rascunho: ['Em revisão', 'Rejeitado', 'Arquivado'],
  'Em revisão': ['Aprovado para preparação', 'Bloqueado', 'Rejeitado', 'Arquivado'],
  'Aprovado para preparação': ['Arquivado'],
  Bloqueado: ['Em revisão', 'Arquivado'],
  Rejeitado: ['Arquivado'],
  Arquivado: [],
}

const EXIGEM_MOTIVO: EstadoBriefing[] = ['Bloqueado', 'Rejeitado', 'Arquivado']

export function podeTransicionar(de: EstadoBriefing, para: EstadoBriefing) {
  return TRANSICOES[de]?.includes(para) ?? false
}

export function exigeMotivo(para: EstadoBriefing) {
  return EXIGEM_MOTIVO.includes(para)
}

export function papelPodeAprovar(papel?: string) {
  return papel === 'champion' || papel === 'delegado_f2'
}

export function rotuloPapel(papel?: string) {
  if (papel === 'champion') return 'Champion'
  if (papel === 'delegado_f2') return 'Delegado formal'
  if (papel === 'operador') return 'Operador'
  return 'Sem papel atribuído'
}

export function corDoEstado(estado: string) {
  if (estado === 'Aprovado para preparação')
    return 'bg-emerald-100 text-emerald-900 border-emerald-300'
  if (estado === 'Em revisão') return 'bg-amber-100 text-amber-900 border-amber-300'
  if (estado === 'Bloqueado') return 'bg-red-100 text-red-900 border-red-300'
  if (estado === 'Rejeitado') return 'bg-rose-100 text-rose-900 border-rose-300'
  if (estado === 'Arquivado') return 'bg-slate-200 text-slate-700 border-slate-300'
  return 'bg-sky-100 text-sky-900 border-sky-300'
}

export function formatarMoeda(valor: unknown, moeda = 'BRL') {
  const numero = Number(valor)
  if (!Number.isFinite(numero)) return 'não informado'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: moeda || 'BRL' }).format(
    numero,
  )
}

export function formatarData(valor: unknown) {
  if (!valor) return 'não informada'
  const texto = String(valor)
  const data = new Date(texto.length <= 10 ? `${texto}T00:00:00` : texto)
  if (Number.isNaN(data.getTime())) return texto
  return data.toLocaleDateString('pt-BR')
}

export function proximaVersao(versaoAtual?: string) {
  const numero = Number(String(versaoAtual || 'v1').replace(/\D/g, '')) || 1
  return `v${numero + 1}`
}

export function validarBriefing(dados: {
  experiment_id?: string
  title?: string
  service?: string
  origin?: string
  channel?: string
  hypothesis?: Record<string, unknown>
  audience?: Record<string, unknown>
  offer?: Record<string, unknown>
  execution_window?: Record<string, unknown>
  analysis_period?: string
  budget?: Record<string, unknown>
  criteria?: Record<string, unknown>
  owner_user?: string
  briefing_responsible?: string
  synthetic_only?: boolean
  publication_status?: string
  spend_status?: string
}) {
  const erros: string[] = []
  if (!dados.experiment_id?.trim()) erros.push('Identificador do experimento é obrigatório.')
  if (!dados.title?.trim()) erros.push('Título é obrigatório.')
  if (!SERVICOS.includes((dados.service || '') as (typeof SERVICOS)[number]))
    erros.push('Serviço deve ser R&S, TMO ou R&S + TMO.')
  if (!ORIGENS.includes((dados.origin || '') as (typeof ORIGENS)[number]))
    erros.push('Origem deve ser inbound, outbound ou não identificado.')
  if (!dados.channel?.trim()) erros.push('Canal é obrigatório.')

  const h = (dados.hypothesis || {}) as Record<string, unknown>
  if (!String(h.se || '').trim()) erros.push('Hipótese: campo "Se" é obrigatório.')
  if (!String(h.para || '').trim()) erros.push('Hipótese: campo "Para" é obrigatório.')
  if (!String(h.entao || '').trim()) erros.push('Hipótese: campo "Então" é obrigatório.')

  const a = (dados.audience || {}) as Record<string, unknown>
  if (!String(a.papel || '').trim()) erros.push('Público/ICP: papel do contato é obrigatório.')
  if (!String(a.empresa || '').trim())
    erros.push('Público/ICP: descrição da empresa é obrigatória.')

  if (!String((dados.offer || {}).descricao || '').trim())
    erros.push('Oferta: descrição é obrigatória.')

  const j = (dados.execution_window || {}) as Record<string, unknown>
  if (!j.inicio) erros.push('Janela de execução prevista: início é obrigatório.')
  if (!j.fim) erros.push('Janela de execução prevista: fim é obrigatório.')
  if (!dados.analysis_period?.trim()) erros.push('Período de análise previsto é obrigatório.')

  const o = (dados.budget || {}) as Record<string, unknown>
  if (!Number.isFinite(Number(o.valor))) erros.push('Orçamento previsto: valor é obrigatório.')

  if (!dados.owner_user) erros.push('Dono do experimento (humano) é obrigatório.')
  if (!dados.briefing_responsible) erros.push('Responsável pelo briefing (humano) é obrigatório.')
  if (dados.synthetic_only !== true) erros.push('A F2-T02 aceita somente massa sintética.')
  if (dados.publication_status === 'aprovado' && !dados.briefing_responsible)
    erros.push('Publicação aprovada exige responsável humano.')
  if (dados.spend_status === 'aprovado' && !dados.briefing_responsible)
    erros.push('Gasto aprovado exige responsável humano.')

  return erros
}

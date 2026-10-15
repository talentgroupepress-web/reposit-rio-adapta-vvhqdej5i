/**
 * Utilitários de mapeamento e formatação para apresentação amigável de dados.
 * Converte códigos técnicos, enums brutos, IDs e strings cruas em textos legíveis em português.
 */

export const MAPA_ESTADOS_DEMANDA: Record<string, string> = {
  suspect: 'Suspect',
  prospect: 'Prospect',
  lead_qualificado: 'Lead Qualificado',
  oportunidade: 'Oportunidade',
  proposta: 'Proposta Enviada',
  vaga_aberta: 'Vaga Aberta',
  ganho: 'Contrato Ganho',
  perdido: 'Perdido',
  sem_timing: 'Sem Timing',
  desqualificado: 'Desqualificado',
}

export const MAPA_ORIGENS: Record<string, string> = {
  inbound: 'Inbound (Ativo)',
  outbound: 'Outbound (Prospecção)',
  desconhecido: 'Não Identificada',
  'não identificado': 'Não Identificada',
}

export const MAPA_CANAIS: Record<string, string> = {
  site: 'Site Oficial',
  linkedin: 'LinkedIn Ads / Orgânico',
  evento: 'Eventos & Feiras',
  indicacao: 'Indicação / Parceiros',
  google: 'Google Ads',
  meta: 'Meta Ads (Facebook/Instagram)',
  email: 'E-mail Marketing',
  direto: 'Acesso Direto',
}

export const MAPA_STATUS_T04: Record<string, string> = {
  preservado_no_pipeline: 'Preservado no pipeline',
  desconhecido_preservado: 'Origem desconhecida · Preservado',
  duplicidade_no_lote: 'Duplicidade detectada no lote',
  conflito_no_lote: 'Conflito de dados no lote',
  chave_ausente: 'Identificador ausente',
  ausente_no_pipeline: 'Novo registro · Criação prevista',
  conflito_com_destino: 'Conflito com registro do destino',
  conflito_com_pipeline: 'Conflito com registro do pipeline',
}

export const MAPA_ACOES_T04: Record<string, string> = {
  create: 'Criar novo registro',
  skip: 'Ignorar (idempotente)',
  conflict: 'Conflito identificado',
  invalid: 'Inválido / Bloqueado',
}

export const MAPA_STATUS_NUCLEO: Record<string, string> = {
  preservado: 'Preservado no destino',
  ausente_no_destino: 'Não encontrado no destino',
  duplicidade_na_fonte: 'Duplicidade na fonte',
  conflito_na_fonte: 'Conflito interno da fonte',
  conflito_com_destino: 'Divergência com dados do destino',
  invalid: 'Chave ausente / Inválido',
}

export const MAPA_CLASSIFICACOES_T08_T09: Record<string, string> = {
  vinculado: 'Vinculado ao pipeline',
  nao_vinculado: 'Não vinculado (novo)',
  desconhecido: 'Origem desconhecida',
  divergente: 'Divergência detectada',
  invalido: 'Registro inválido',
}

export const MAPA_MODO_FONTE: Record<string, string> = {
  manual_export: 'Exportação manual',
  manual_entry: 'Entrada manual',
  meta_integrated: 'Meta API integrada',
}

export const MAPA_QUALIDADE: Record<string, string> = {
  ok: 'Aprovada (OK)',
  pendente: 'Pendente de validação',
  desconhecido: 'Não avaliada',
  restrito: 'Acesso restrito',
}

export const MAPA_DECISOES: Record<string, string> = {
  continuar: 'Continuar campanha',
  ajustar: 'Ajustar parâmetros',
  interromper: 'Interromper campanha',
}

export const MAPA_STATUS_DECISAO: Record<string, string> = {
  pendente: 'Pendente de decisão',
  registrada: 'Decisão registrada',
  revogada: 'Revogada (histórico preservado)',
}

export const MAPA_STATUS_ACAO: Record<string, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
}

export const MAPA_STATUS_AUTORIZACAO: Record<string, string> = {
  'não solicitado': 'Não solicitado',
  'aguardando aprovação': 'Aguardando aprovação',
  aprovado: 'Aprovado',
  bloqueado: 'Bloqueado',
  revogado: 'Revogado',
}

export const MAPA_STATUS_PROPOSTA: Record<string, string> = {
  em_negociacao: 'Em negociação',
  aceita: 'Aceita / Aprovada',
  recusada: 'Recusada',
  sem_retorno: 'Sem retorno',
}

export const MAPA_TIPO_CONQUISTA: Record<string, string> = {
  aquisicao_nova: 'Novo cliente',
  reativacao: 'Reativação de conta',
}

export const MAPA_HANDOFF: Record<string, string> = {
  pendente: 'Pendente de repasse',
  aceito: 'Aceito pelo comercial',
  recusado: 'Recusado pelo comercial',
}

export const MAPA_ESTADOS_BRIEFING: Record<string, string> = {
  Rascunho: 'Rascunho',
  'Em revisão': 'Em revisão técnica',
  'Aprovado para preparação': 'Aprovado para preparação',
  Bloqueado: 'Bloqueado',
  Rejeitado: 'Rejeitado',
  Arquivado: 'Arquivado',
}

/** Formata data para pt-BR amigável (DD/MM/AAAA) */
export function formatarDataAmigavel(valor?: string | null): string {
  if (!valor) return '—'
  const date = new Date(valor.length <= 10 ? `${valor}T00:00:00` : valor)
  if (Number.isNaN(date.getTime())) return valor
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/** Formata data e hora para pt-BR amigável (DD/MM/AAAA às HH:mm) */
export function formatarDataHoraAmigavel(valor?: string | null): string {
  if (!valor) return '—'
  const date = new Date(valor)
  if (Number.isNaN(date.getTime())) return valor
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Formata booleano para Sim / Não */
export function formatarBooleano(valor?: boolean | string | null): string {
  if (valor === true || valor === 'sim' || valor === 'true') return 'Sim'
  if (valor === false || valor === 'nao' || valor === 'não' || valor === 'false') return 'Não'
  return '—'
}

/** Formata moeda pt-BR */
export function formatarValorMonetario(valor?: number | string | null, moeda = 'BRL'): string {
  const num = Number(valor)
  if (!Number.isFinite(num)) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: moeda || 'BRL',
  }).format(num)
}

/** Formata número inteiro com separador de milhar brasileiro */
export function formatarNumero(valor?: number | null): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return '0'
  return new Intl.NumberFormat('pt-BR').format(valor)
}

/** Formata porcentagem pt-BR */
export function formatarPorcentagem(valor?: number | null, casasDecimais = 0): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return '0%'
  return `${valor.toLocaleString('pt-BR', {
    minimumFractionDigits: casasDecimais,
    maximumFractionDigits: casasDecimais,
  })}%`
}

/** Converte nome de canal para label legível */
export function formatarCanal(canal?: string | null): string {
  if (!canal?.trim()) return 'Direto / Geral'
  const key = canal.toLowerCase().trim()
  return MAPA_CANAIS[key] || canal
}

/** Converte nome de origem para label legível */
export function formatarOrigem(origem?: string | null): string {
  if (!origem?.trim()) return 'Não Identificada'
  const key = origem.toLowerCase().trim()
  return MAPA_ORIGENS[key] || origem
}

/** Converte nome de status da demanda */
export function formatarEstadoDemanda(estado?: string | null): string {
  if (!estado?.trim()) return 'Não Informado'
  const key = estado.toLowerCase().trim()
  return MAPA_ESTADOS_DEMANDA[key] || estado
}

/** Converte qualidade do lead */
export function formatarQualidade(qualidade?: string | null): string {
  if (!qualidade?.trim()) return 'Pendente'
  const key = qualidade.toLowerCase().trim()
  return MAPA_QUALIDADE[key] || qualidade
}

/** Formata texto de identificador (ex: FIX-IN-001) para exibição amigável sem ficar vazio */
export function formatarIdentificador(id?: string | null): string {
  if (!id?.trim()) return 'Sem identificador'
  return id
}

/** Formata texto de nome de campanha amigável */
export function formatarCampanha(campanha?: string | null): string {
  if (!campanha?.trim()) return 'Orgânico / Sem campanha'
  return campanha
}

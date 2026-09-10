import pb from '@/lib/pocketbase/client'
import { proximaVersao, type EstadoBriefing } from '@/lib/f2/regras'

export type BriefingF2 = {
  id: string
  experiment_id: string
  title: string
  service: string
  origin: string
  channel: string
  briefing_version: string
  state: EstadoBriefing
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
  owner_label?: string
  responsible_label?: string
  approver_label?: string
  created: string
  updated: string
}

export type VersaoF2 = {
  id: string
  experiment_id: string
  version: string
  previous_version?: string
  change_summary?: string
  reason: string
  approval_status: string
  actor_label?: string
  created: string
}

export type AprovacaoF2 = {
  id: string
  experiment_id: string
  briefing_version: string
  approver_label?: string
  role: string
  scope: string
  remarks?: string
  status: string
  created: string
}

export type BloqueioF2 = {
  id: string
  experiment_id: string
  briefing_version: string
  reason: string
  affected_rule: string
  identified_by: string
  correction_needed: string
  status: string
  created: string
}

export async function listarBriefings() {
  return pb.collection('experimentos_f2').getFullList<BriefingF2>({ sort: '-updated' })
}

export async function obterBriefing(id: string) {
  return pb.collection('experimentos_f2').getOne<BriefingF2>(id)
}

export async function listarVersoes(experimentId: string) {
  return pb
    .collection('experimento_versoes_f2')
    .getFullList<VersaoF2>({ filter: `experiment_id = "${experimentId}"`, sort: '-created' })
}

export async function listarAprovacoes(experimentId: string) {
  return pb
    .collection('aprovacoes_f2')
    .getFullList<AprovacaoF2>({ filter: `experiment_id = "${experimentId}"`, sort: '-created' })
}

export async function listarBloqueios(experimentId: string) {
  return pb
    .collection('bloqueios_f2')
    .getFullList<BloqueioF2>({ filter: `experiment_id = "${experimentId}"`, sort: '-created' })
}

export function usuarioAtual() {
  return pb.authStore.model as
    | (Record<string, unknown> & { id?: string; name?: string; role?: string })
    | null
}

export async function transicionarEstado(
  briefing: BriefingF2,
  novoEstado: EstadoBriefing,
  motivo: string,
) {
  if (!pb.authStore.isValid) throw new Error('É necessário estar autenticado.')
  const atualizado = await pb.collection('experimentos_f2').update<BriefingF2>(briefing.id, {
    state: novoEstado,
  })
  const usuario = usuarioAtual()
  await pb.collection('experimento_versoes_f2').create({
    experiment_id: briefing.experiment_id,
    version: briefing.briefing_version,
    previous_version: briefing.briefing_version,
    change_summary: `Transição de estado: ${briefing.state} → ${novoEstado}`,
    reason: motivo || 'Transição de estado registrada.',
    snapshot: JSON.stringify(atualizado),
    approval_status: 'não aprovada',
    actor: usuario?.id,
    actor_label: usuario?.name || 'usuário sintético',
  })
  return atualizado
}

export async function criarNovaVersao(
  briefing: BriefingF2,
  motivo: string,
  alteracoes: Partial<BriefingF2>,
) {
  if (!pb.authStore.isValid) throw new Error('É necessário estar autenticado.')
  const usuario = usuarioAtual()
  const nova = proximaVersao(briefing.briefing_version)
  const atualizado = await pb.collection('experimentos_f2').update<BriefingF2>(briefing.id, {
    ...alteracoes,
    briefing_version: nova,
    state: 'Rascunho',
  })
  await pb.collection('experimento_versoes_f2').create({
    experiment_id: briefing.experiment_id,
    version: nova,
    previous_version: briefing.briefing_version,
    change_summary: `Nova versão do briefing (${briefing.briefing_version} → ${nova}).`,
    reason: motivo || 'Alteração material registrada como nova versão.',
    snapshot: JSON.stringify(atualizado),
    approval_status: 'não aprovada',
    actor: usuario?.id,
    actor_label: usuario?.name || 'usuário sintético',
  })
  return atualizado
}

export async function registrarAprovacao(briefing: BriefingF2, escopo: string, ressalvas: string) {
  const usuario = usuarioAtual()
  if (!usuario?.id) throw new Error('É necessário estar autenticado.')
  return pb.collection('aprovacoes_f2').create({
    experiment_id: briefing.experiment_id,
    briefing_version: briefing.briefing_version,
    approver: usuario.id,
    approver_label: usuario.name || 'aprovador sintético',
    role: String(usuario.role || 'champion'),
    scope: escopo,
    remarks: ressalvas,
    status: 'válida',
  })
}

export async function registrarBloqueio(
  briefing: BriefingF2,
  dados: { motivo: string; regra: string; identificadoPor: string; correcao: string },
) {
  return pb.collection('bloqueios_f2').create({
    experiment_id: briefing.experiment_id,
    briefing_version: briefing.briefing_version,
    reason: dados.motivo,
    affected_rule: dados.regra,
    identified_by: dados.identificadoPor,
    correction_needed: dados.correcao,
    status: 'aberto',
  })
}

export async function resolverBloqueio(id: string, status: string) {
  return pb.collection('bloqueios_f2').update(id, { status })
}

export async function criarCriativo(
  briefing: BriefingF2,
  dados: { tipo: string; conteudo: string; motivo: string },
) {
  const usuario = usuarioAtual()
  return pb.collection('criativos_f2').create({
    experiment_id: briefing.experiment_id,
    version: 'v1',
    creative_type: dados.tipo,
    content: JSON.stringify({ descricao: dados.conteudo }),
    reason: dados.motivo,
    actor: usuario?.id,
    actor_label: usuario?.name || 'usuário sintético',
    synthetic_only: true,
  })
}

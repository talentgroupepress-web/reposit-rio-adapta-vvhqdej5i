import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, History, LogIn, LogOut, RefreshCw, ShieldCheck } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  corDoEstado,
  exigeMotivo,
  formatarData,
  formatarMoeda,
  papelPodeAprovar,
  proximaVersao,
  rotuloPapel,
  type EstadoBriefing,
} from '@/lib/f2/regras'
import {
  criarNovaVersao,
  listarAprovacoes,
  listarBloqueios,
  listarBriefings,
  listarVersoes,
  obterBriefing,
  registrarAprovacao,
  registrarBloqueio,
  resolverBloqueio,
  transicionarEstado,
  usuarioAtual,
  type AprovacaoF2,
  type BloqueioF2,
  type BriefingF2,
  type VersaoF2,
} from '@/services/experimentosF2'

const USUARIO_SINTETICO = {
  email: 'humano-sintetico-briefing-01@f2.invalid',
  password: 'F2-Sintetico-2026!',
}

function LoginCard({ onLogin }: { onLogin: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const login = async () => {
    setBusy(true)
    setError('')
    try {
      await pb
        .collection('users')
        .authWithPassword(USUARIO_SINTETICO.email, USUARIO_SINTETICO.password)
      onLogin()
    } catch (e: any) {
      setError(e?.message || 'Login sintético falhou.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Acesso de validação</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-slate-600">
          Use somente o usuário sintético preparado para testar a F2-T01. Nenhum usuário real é
          usado nesta prova.
        </p>
        <Button onClick={login} disabled={busy}>
          <LogIn className="mr-2 h-4 w-4" />
          {busy ? 'Entrando…' : 'Entrar como usuário sintético'}
        </Button>
        {error && <p className="text-sm text-red-700">{error}</p>}
      </CardContent>
    </Card>
  )
}

function Linha({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{titulo}</p>
      <div className="text-sm text-slate-800">{children}</div>
    </div>
  )
}

function TextoOuVazio({ valor }: { valor: unknown }) {
  const texto = String(valor ?? '').trim()
  return <>{texto ? texto : '—'}</>
}

function ListaOuVazio({ valor }: { valor: unknown }) {
  if (Array.isArray(valor) && valor.length > 0) {
    return (
      <ul className="list-disc pl-4">
        {valor.map((item, i) => (
          <li key={i}>{String(item)}</li>
        ))}
      </ul>
    )
  }
  return <>—</>
}

function ModalMotivo({
  titulo,
  descricao,
  onConfirm,
  onCancel,
}: {
  titulo: string
  descricao: string
  onConfirm: (motivo: string) => void
  onCancel: () => void
}) {
  const [motivo, setMotivo] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md space-y-3 rounded-lg bg-white p-5 shadow-lg">
        <h3 className="text-lg font-semibold">{titulo}</h3>
        <p className="text-sm text-slate-600">{descricao}</p>
        <textarea
          className="min-h-24 w-full rounded-md border p-2 text-sm"
          placeholder="Descreva o motivo (obrigatório)"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            onClick={() => motivo.trim() && onConfirm(motivo.trim())}
            disabled={!motivo.trim()}
          >
            Confirmar
          </Button>
        </div>
        <p className="text-xs text-slate-500">O registro fica no histórico da versão atual.</p>
      </div>
    </div>
  )
}

const TRANSICOES: Record<EstadoBriefing, EstadoBriefing[]> = {
  Rascunho: ['Em revisão', 'Rejeitado', 'Arquivado'],
  'Em revisão': ['Aprovado para preparação', 'Bloqueado', 'Rejeitado', 'Arquivado'],
  'Aprovado para preparação': ['Arquivado'],
  Bloqueado: ['Em revisão', 'Arquivado'],
  Rejeitado: ['Arquivado'],
  Arquivado: [],
}

export function ExperimentosF2Page() {
  const [items, setItems] = useState<BriefingF2[]>([])
  const [error, setError] = useState('')
  const [, force] = useState(0)
  const load = () =>
    listarBriefings()
      .then(setItems)
      .catch((e) => setError(e?.message || 'Não foi possível carregar os briefings.'))
  useEffect(() => {
    if (pb.authStore.isValid) void load()
  }, [])
  if (!pb.authStore.isValid)
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          <h1 className="text-3xl font-bold">F2-T01 · Briefings de experimentos</h1>
          <LoginCard
            onLogin={() => {
              force((x) => x + 1)
              void load()
            }}
          />
        </div>
      </div>
    )
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-500">Talent Group · Fase 2</p>
            <h1 className="text-3xl font-bold tracking-tight">Briefings de experimentos</h1>
            <p className="text-slate-600">
              Módulo operacional F2-T01 · dados sintéticos · sem execução externa
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void load()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                pb.authStore.clear()
                force((x) => x + 1)
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
            <Link to="/">
              <Button variant="ghost">Voltar ao pipeline</Button>
            </Link>
          </div>
        </div>
        {error && (
          <Card className="border-red-300">
            <CardContent className="pt-6 text-red-700">{error}</CardContent>
          </Card>
        )}
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="flex items-start gap-3 pt-6 text-emerald-900">
            <ShieldCheck className="mt-0.5 h-5 w-5" />
            <div>
              <b>Proteção operacional</b>
              <p className="text-sm">
                Este módulo não usa a collection demandas, não publica campanhas, não gasta
                orçamento e não integra RD Station, 1CRM ou Meta.
              </p>
            </div>
          </CardContent>
        </Card>
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((item) => (
            <Link key={item.id} to={`/experimentos/${item.id}`}>
              <Card className="h-full transition hover:border-slate-500">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle>{item.experiment_id}</CardTitle>
                    <Badge className={corDoEstado(item.state)}>{item.state}</Badge>
                  </div>
                  <p className="text-sm text-slate-600">{item.title}</p>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex flex-wrap gap-2">
                    <Badge>{item.origin}</Badge>
                    <Badge variant="secondary">{item.channel}</Badge>
                    <Badge variant="secondary">{item.service}</Badge>
                  </div>
                  <p>
                    <b>Briefing:</b> {item.briefing_version} · <b>Sintético:</b>{' '}
                    {item.synthetic_only ? 'sim' : 'não'}
                  </p>
                  <p>
                    <b>Orçamento previsto:</b>{' '}
                    {formatarMoeda((item.budget as Record<string, unknown>)?.valor)}
                  </p>
                  <p>
                    <b>Responsável:</b> {item.responsible_label || '—'}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
        {!error && items.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-slate-600">
              Nenhum briefing cadastrado ainda.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export function ExperimentoF2DetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [item, setItem] = useState<BriefingF2 | null>(null)
  const [error, setError] = useState('')
  const [versoes, setVersoes] = useState<VersaoF2[]>([])
  const [aprovacoes, setAprovacoes] = useState<AprovacaoF2[]>([])
  const [bloqueios, setBloqueios] = useState<BloqueioF2[]>([])
  const [mostrarHistorico, setMostrarHistorico] = useState(false)
  const [modal, setModal] = useState<null | {
    tipo: 'transicao' | 'versao' | 'aprovacao' | 'bloqueio'
    destino?: EstadoBriefing
  }>(null)
  const [mensagem, setMensagem] = useState('')

  const carregar = async () => {
    try {
      const b = await obterBriefing(id)
      setItem(b)
      const [v, a, bl] = await Promise.all([
        listarVersoes(b.experiment_id),
        listarAprovacoes(b.experiment_id),
        listarBloqueios(b.experiment_id),
      ])
      setVersoes(v)
      setAprovacoes(a)
      setBloqueios(bl)
    } catch (e: any) {
      setError(e?.message || 'Não foi possível carregar o briefing.')
    }
  }

  useEffect(() => {
    if (pb.authStore.isValid) void carregar()
  }, [id])

  if (!pb.authStore.isValid)
    return (
      <div className="p-6">
        <LoginCard onLogin={() => window.location.reload()} />
      </div>
    )
  if (error) return <div className="p-6 text-red-700">{error}</div>
  if (!item) return <div className="p-6">Carregando briefing…</div>

  const usuario = usuarioAtual()
  const podeAprovar = papelPodeAprovar(usuario?.role)
  const hipotese = (item.hypothesis || {}) as Record<string, unknown>
  const publico = (item.audience || {}) as Record<string, unknown>
  const oferta = (item.offer || {}) as Record<string, unknown>
  const janela = (item.execution_window || {}) as Record<string, unknown>
  const orcamento = (item.budget || {}) as Record<string, unknown>
  const criterios = (item.criteria || {}) as Record<string, unknown>
  const aprovacaoValida = aprovacoes.find(
    (a) => a.status === 'válida' && a.briefing_version === item.briefing_version,
  )
  const bloqueioAberto = bloqueios.find((b) => b.status === 'aberto')

  const executar = async (motivo: string) => {
    if (!modal) return
    setMensagem('')
    try {
      if (modal.tipo === 'transicao' && modal.destino) {
        await transicionarEstado(item, modal.destino, motivo)
      } else if (modal.tipo === 'versao') {
        await criarNovaVersao(item, motivo, {})
      } else if (modal.tipo === 'aprovacao') {
        await registrarAprovacao(
          item,
          'Aprovação de preparação do briefing (F2-T01, massa sintética)',
          motivo,
        )
        if (item.state === 'Em revisão')
          await transicionarEstado(item, 'Aprovado para preparação', motivo)
      } else if (modal.tipo === 'bloqueio') {
        await registrarBloqueio(item, {
          motivo,
          regra: 'Decisão 15 — bloqueios estruturados',
          identificadoPor: usuario?.name || 'usuário sintético',
          correcao: 'A definir pelo responsável do briefing.',
        })
        if (item.state !== 'Bloqueado') await transicionarEstado(item, 'Bloqueado', motivo)
      }
      setModal(null)
      await carregar()
    } catch (e: any) {
      setMensagem(e?.message || 'A ação falhou.')
      setModal(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <Button variant="ghost" onClick={() => navigate('/experimentos')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        {mensagem && (
          <Card className="border-amber-300 bg-amber-50">
            <CardContent className="pt-6 text-amber-900">{mensagem}</CardContent>
          </Card>
        )}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">
                  {item.experiment_id} · {item.briefing_version}
                </p>
                <CardTitle>{item.title}</CardTitle>
              </div>
              <Badge className={corDoEstado(item.state)}>{item.state}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {aprovacaoValida && (
              <p className="text-sm text-emerald-800">
                Aprovação válida para {item.briefing_version}:{' '}
                {aprovacaoValida.approver_label || 'aprovador'} ({rotuloPapel(aprovacaoValida.role)}
                ) em {formatarData(aprovacaoValida.created)}.
              </p>
            )}
            {bloqueioAberto && (
              <p className="text-sm text-red-800">
                Bloqueio aberto: {bloqueioAberto.reason} · correção necessária:{' '}
                {bloqueioAberto.correction_needed}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {(TRANSICOES[item.state] || []).map((destino) => (
                <Button
                  key={destino}
                  variant={exigeMotivo(destino) ? 'destructive' : 'default'}
                  onClick={() =>
                    exigeMotivo(destino)
                      ? setModal({ tipo: 'transicao', destino })
                      : void executar(
                          `Transição registrada por ${usuario?.name || 'usuário sintético'}.`,
                        )
                  }
                >
                  {destino}
                </Button>
              ))}
              <Button variant="outline" onClick={() => setModal({ tipo: 'versao' })}>
                Nova versão ({proximaVersao(item.briefing_version)})
              </Button>
              {podeAprovar && !aprovacaoValida && (
                <Button variant="outline" onClick={() => setModal({ tipo: 'aprovacao' })}>
                  Aprovar preparação
                </Button>
              )}
              <Button variant="outline" onClick={() => setModal({ tipo: 'bloqueio' })}>
                Registrar bloqueio
              </Button>
              <Button variant="ghost" onClick={() => setMostrarHistorico((v) => !v)}>
                <History className="mr-2 h-4 w-4" />
                Histórico
              </Button>
            </div>
            <Separator />
            <div className="grid gap-3 md:grid-cols-3">
              <Linha titulo="Serviço">
                <TextoOuVazio valor={item.service} />
              </Linha>
              <Linha titulo="Origem">
                <TextoOuVazio valor={item.origin} />
              </Linha>
              <Linha titulo="Canal">
                <TextoOuVazio valor={item.channel} />
              </Linha>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Linha titulo="Dono do experimento">
                <TextoOuVazio valor={item.owner_label} />
              </Linha>
              <Linha titulo="Responsável pelo briefing">
                <TextoOuVazio valor={item.responsible_label} />
              </Linha>
              <Linha titulo="Aprovador da preparação">
                <TextoOuVazio valor={item.approver_label || 'ainda não definido'} />
              </Linha>
            </div>
            <Separator />
            <div className="grid gap-4 md:grid-cols-2">
              <Linha titulo="Hipótese — Se">
                <TextoOuVazio valor={hipotese.se} />
              </Linha>
              <Linha titulo="Hipótese — Para">
                <TextoOuVazio valor={hipotese.para} />
              </Linha>
              <Linha titulo="Hipótese — Então">
                <TextoOuVazio valor={hipotese.entao} />
              </Linha>
              <Linha titulo="Hipótese — Porque">
                <TextoOuVazio valor={hipotese.porque} />
              </Linha>
              <Linha titulo="Hipótese — Mediremos por">
                <ListaOuVazio valor={hipotese.mediremos_por} />
              </Linha>
            </div>
            <Separator />
            <div className="grid gap-4 md:grid-cols-2">
              <Linha titulo="Público — papel">
                <TextoOuVazio valor={publico.papel} />
              </Linha>
              <Linha titulo="Público — empresa">
                <TextoOuVazio valor={publico.empresa} />
              </Linha>
              <Linha titulo="Público — ICP">
                <TextoOuVazio valor={publico.icp} />
              </Linha>
              <Linha titulo="Público — separação">
                <TextoOuVazio valor={publico.separacao} />
              </Linha>
            </div>
            <Separator />
            <Linha titulo="Oferta">
              <TextoOuVazio valor={oferta.descricao} />
            </Linha>
            <div className="grid gap-4 md:grid-cols-2">
              <Linha titulo="Janela de execução prevista">
                <p>
                  {formatarData(janela.inicio)} a {formatarData(janela.fim)}
                </p>
              </Linha>
              <Linha titulo="Período de análise previsto">
                <TextoOuVazio valor={item.analysis_period} />
              </Linha>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Linha titulo="Orçamento previsto">
                <p>
                  {formatarMoeda(orcamento.valor, String(orcamento.moeda || 'BRL'))} ·{' '}
                  <TextoOuVazio valor={orcamento.origem} />
                </p>
              </Linha>
              <Linha titulo="Critérios de parada">
                <ul className="list-disc pl-4">
                  {CRITERIOS_PARADA.map((c) => (
                    <li key={c}>
                      <b>{c}:</b> <TextoOuVazio valor={criterios[c]} />
                    </li>
                  ))}
                </ul>
              </Linha>
            </div>
            {mostrarHistorico && (
              <>
                <Separator />
                <div className="space-y-4">
                  <div>
                    <h2 className="mb-2 text-lg font-semibold">Versões do briefing</h2>
                    {versoes.length === 0 && (
                      <p className="text-sm text-slate-600">Nenhuma versão registrada.</p>
                    )}
                    <ul className="space-y-2">
                      {versoes.map((v) => (
                        <li key={v.id} className="rounded-md border p-3 text-sm">
                          <b>{v.version}</b> · {v.change_summary || '—'}
                          <br />
                          <span className="text-slate-600">
                            Motivo: {v.reason} · Por: {v.actor_label || '—'} ·{' '}
                            {formatarData(v.created)} · {v.approval_status}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h2 className="mb-2 text-lg font-semibold">Aprovações</h2>
                    {aprovacoes.length === 0 && (
                      <p className="text-sm text-slate-600">Nenhuma aprovação registrada.</p>
                    )}
                    <ul className="space-y-2">
                      {aprovacoes.map((a) => (
                        <li key={a.id} className="rounded-md border p-3 text-sm">
                          <b>{a.briefing_version}</b> · {a.status} · {a.approver_label || '—'} (
                          {rotuloPapel(a.role)}) · {formatarData(a.created)}
                          <br />
                          <span className="text-slate-600">Escopo: {a.scope}</span>
                          {a.remarks && (
                            <>
                              <br />
                              <span className="text-slate-600">Ressalvas: {a.remarks}</span>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h2 className="mb-2 text-lg font-semibold">Bloqueios</h2>
                    {bloqueios.length === 0 && (
                      <p className="text-sm text-slate-600">Nenhum bloqueio registrado.</p>
                    )}
                    <ul className="space-y-2">
                      {bloqueios.map((b) => (
                        <li key={b.id} className="rounded-md border p-3 text-sm">
                          <b>{b.status}</b> · {b.reason}
                          <br />
                          <span className="text-slate-600">
                            Regra: {b.affected_rule} · Identificado por: {b.identified_by} ·
                            Correção: {b.correction_needed} · {formatarData(b.created)}
                          </span>
                          {b.status === 'aberto' && (
                            <>
                              <br />
                              <Button
                                className="mt-2"
                                variant="outline"
                                onClick={async () => {
                                  await resolverBloqueio(b.id, 'resolvido')
                                  await carregar()
                                }}
                              >
                                Marcar como resolvido
                              </Button>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      {modal && (
        <ModalMotivo
          titulo={
            modal.tipo === 'transicao'
              ? `Transição para ${modal.destino}`
              : modal.tipo === 'versao'
                ? 'Criar nova versão do briefing'
                : modal.tipo === 'aprovacao'
                  ? 'Aprovar preparação'
                  : 'Registrar bloqueio'
          }
          descricao={
            modal.tipo === 'transicao'
              ? 'A transição exige motivo registrado no histórico.'
              : modal.tipo === 'versao'
                ? `O briefing ${item.briefing_version} será preservado e uma nova versão (${proximaVersao(item.briefing_version)}) começará como Rascunho.`
                : modal.tipo === 'aprovacao'
                  ? 'A aprovação fica vinculada à versão exata do briefing.'
                  : 'O bloqueio fica registrado e o briefing passa ao estado Bloqueado.'
          }
          onConfirm={executar}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, History, LogIn, LogOut, RefreshCw, ShieldCheck } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  CRITERIOS_PARADA,
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
  email: 'humano-sintetico-aprovador-01@f2.invalid',
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
          Use somente o usuário sintético preparado para testar a F2-T02. Nenhum usuário real é
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
  if (Array.isArray(valor) && valor.length > 0)
    return (
      <ul className="list-disc pl-4">
        {valor.map((item, i) => (
          <li key={i}>{String(item)}</li>
        ))}
      </ul>
    )
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
          <h1 className="text-3xl font-bold">F2-T02 · Controles de experimentos</h1>
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
              F2-T02 · validação, duplicidade e aprovações sintéticas
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
              <b>Sem execução externa</b>
              <p className="text-sm">
                Publicação e gasto são apenas controles internos sintéticos. Nenhuma campanha,
                integração ou gasto real é executado.
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
                    <b>Versão:</b> {item.briefing_version} · <b>Sintético:</b>{' '}
                    {item.synthetic_only ? 'sim' : 'não'}
                  </p>
                  <p>
                    <b>Publicação:</b> {item.publication_status || 'não solicitado'} · <b>Gasto:</b>{' '}
                    {item.spend_status || 'não solicitado'}
                  </p>
                  <p>
                    <b>Responsável:</b> {item.responsible_label || '—'}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
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
  const historicoRef = useRef<HTMLDivElement | null>(null)
  const [modal, setModal] = useState<null | {
    tipo: 'transicao' | 'versao' | 'aprovacao' | 'bloqueio' | 'publicacao' | 'gasto' | 'duplicidade'
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
  const bloqueioAberto = bloqueios.find((b) => b.status === 'aberto')
  const aprovacaoValida = aprovacoes.find(
    (a) => a.status === 'válida' && a.briefing_version === item.briefing_version,
  )
  const hipotese = (item.hypothesis || {}) as Record<string, unknown>
  const publico = (item.audience || {}) as Record<string, unknown>
  const oferta = (item.offer || {}) as Record<string, unknown>
  const janela = (item.execution_window || {}) as Record<string, unknown>
  const orcamento = (item.budget || {}) as Record<string, unknown>
  const criterios = (item.criteria || {}) as Record<string, unknown>
  const executarTransicao = async (destino: EstadoBriefing, motivo: string) => {
    try {
      await transicionarEstado(item, destino, motivo)
      await carregar()
    } catch (e: any) {
      setMensagem(e?.message || 'A ação falhou.')
    }
  }
  const executar = async (motivo: string) => {
    if (!modal) return
    try {
      if (modal.tipo === 'transicao' && modal.destino) {
        await executarTransicao(modal.destino, motivo)
        if (modal.destino === 'Bloqueado')
          await registrarBloqueio(item, {
            motivo,
            regra: 'Decisão 15 — bloqueios estruturados',
            identificadoPor: usuario?.name || 'usuário sintético',
            correcao: 'A definir pelo responsável do briefing.',
          })
      } else if (modal.tipo === 'versao') await criarNovaVersao(item, motivo, {})
      else if (modal.tipo === 'aprovacao') {
        await registrarAprovacao(item, 'preparação', motivo)
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
      } else if (modal.tipo === 'duplicidade') {
        await tentativaDuplicidade(item)
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
              <Linha titulo="Publicação">
                <Badge>{item.publication_status || 'não solicitado'}</Badge>
              </Linha>
              <Linha titulo="Gasto">
                <Badge>{item.spend_status || 'não solicitado'}</Badge>
              </Linha>
              <Linha titulo="Responsável">
                <TextoOuVazio valor={item.responsible_label} />
              </Linha>
            </div>
            <div className="flex flex-wrap gap-2">
              {(TRANSICOES[item.state] || []).map((destino) => (
                <Button
                  key={destino}
                  variant={exigeMotivo(destino) ? 'destructive' : 'default'}
                  onClick={() =>
                    exigeMotivo(destino)
                      ? setModal({ tipo: 'transicao', destino })
                      : void executarTransicao(
                          destino,
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
              <Button variant="outline" onClick={() => setModal({ tipo: 'duplicidade' })}>
                Testar duplicidade
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    await pb
                      .collection('experimentos_f2')
                      .update(item.id, { publication_status: 'aguardando aprovação' })
                    await carregar()
                  } catch (e: any) {
                    setMensagem(e?.message || 'Solicitação bloqueada.')
                  }
                }}
              >
                Solicitar publicação
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    await pb
                      .collection('experimentos_f2')
                      .update(item.id, { spend_status: 'aguardando aprovação' })
                    await carregar()
                  } catch (e: any) {
                    setMensagem(e?.message || 'Solicitação bloqueada.')
                  }
                }}
              >
                Solicitar gasto
              </Button>
              {podeAprovar && item.publication_status === 'aguardando aprovação' && (
                <Button variant="outline" onClick={() => setModal({ tipo: 'aprovacao' })}>
                  Aprovar preparação
                </Button>
              )}
              <Button variant="outline" onClick={() => setModal({ tipo: 'bloqueio' })}>
                Registrar bloqueio
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  const abrir = !mostrarHistorico
                  setMostrarHistorico(abrir)
                  if (abrir)
                    setTimeout(
                      () =>
                        historicoRef.current?.scrollIntoView({
                          behavior: 'smooth',
                          block: 'start',
                        }),
                      100,
                    )
                }}
              >
                <History className="mr-2 h-4 w-4" />
                Histórico
              </Button>
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
              <Linha titulo="Público — papel">
                <TextoOuVazio valor={publico.papel} />
              </Linha>
              <Linha titulo="Público — empresa">
                <TextoOuVazio valor={publico.empresa} />
              </Linha>
              <Linha titulo="Público — ICP">
                <TextoOuVazio valor={publico.icp} />
              </Linha>
            </div>
            <Separator />
            <Linha titulo="Oferta">
              <TextoOuVazio valor={oferta.descricao} />
            </Linha>
            <div className="grid gap-4 md:grid-cols-2">
              <Linha titulo="Janela">
                <p>
                  {formatarData(janela.inicio)} a {formatarData(janela.fim)}
                </p>
              </Linha>
              <Linha titulo="Período de análise">
                <TextoOuVazio valor={item.analysis_period} />
              </Linha>
              <Linha titulo="Orçamento">
                <p>{formatarMoeda(orcamento.valor, String(orcamento.moeda || 'BRL'))}</p>
              </Linha>
              <Linha titulo="Critérios">
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
              <div className="space-y-4" ref={historicoRef}>
                <Separator />
                <div>
                  <h2 className="mb-2 text-lg font-semibold">Versões do briefing</h2>
                  {versoes.map((v) => (
                    <div key={v.id} className="rounded-md border p-3 text-sm">
                      <b>{v.version}</b> · {v.change_summary || '—'}
                      <br />
                      <span className="text-slate-600">
                        Motivo: {v.reason} · Por: {v.actor_label || '—'} · {formatarData(v.created)}{' '}
                        · {v.approval_status}
                      </span>
                    </div>
                  ))}
                </div>
                <div>
                  <h2 className="mb-2 text-lg font-semibold">Aprovações</h2>
                  {aprovacoes.length === 0 && <p>Nenhuma aprovação registrada.</p>}
                  {aprovacoes.map((a) => (
                    <div key={a.id} className="rounded-md border p-3 text-sm">
                      <b>{a.briefing_version}</b> · {a.status} · {a.approver_label || '—'} (
                      {rotuloPapel(a.role)})<br />
                      <span>
                        Escopo: {a.scope} · {a.remarks || '—'}
                      </span>
                    </div>
                  ))}
                </div>
                <div>
                  <h2 className="mb-2 text-lg font-semibold">Bloqueios</h2>
                  {bloqueios.length === 0 && <p>Nenhum bloqueio registrado.</p>}
                  {bloqueios.map((b) => (
                    <div key={b.id} className="rounded-md border p-3 text-sm">
                      <b>{b.status}</b> · {b.reason}
                      <br />
                      <span>
                        Regra: {b.affected_rule} · Correção: {b.correction_needed}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      {modal && (
        <ModalMotivo
          titulo={
            modal.tipo === 'versao'
              ? 'Criar nova versão do briefing'
              : modal.tipo === 'aprovacao'
                ? 'Aprovação de publicação/gasto'
                : modal.tipo === 'duplicidade'
                  ? 'Testar duplicidade'
                  : modal.tipo === 'bloqueio'
                    ? 'Registrar bloqueio'
                    : `Transição para ${modal.destino}`
          }
          descricao="A ação exige motivo registrado no histórico."
          onConfirm={executar}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  )
}

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
  solicitarAutorizacao,
  tentativaDuplicidade,
  transicionarEstado,
  usuarioAtual,
  type AprovacaoF2,
  type BloqueioF2,
  type BriefingF2,
  type VersaoF2,
} from '@/services/experimentosF2'

const SYNTHETIC = {
  email: 'humano-sintetico-aprovador-01@f2.invalid',
  password: 'F2-Sintetico-2026!',
}
const TRANSITIONS: Record<EstadoBriefing, EstadoBriefing[]> = {
  Rascunho: ['Em revisão', 'Rejeitado', 'Arquivado'],
  'Em revisão': ['Aprovado para preparação', 'Bloqueado', 'Rejeitado', 'Arquivado'],
  'Aprovado para preparação': ['Arquivado'],
  Bloqueado: ['Em revisão', 'Arquivado'],
  Rejeitado: ['Arquivado'],
  Arquivado: [],
}
function LoginCard({ onLogin }: { onLogin: () => void }) {
  const [error, setError] = useState('')
  const login = async () => {
    try {
      await pb.collection('users').authWithPassword(SYNTHETIC.email, SYNTHETIC.password)
      onLogin()
    } catch (e: any) {
      setError(e?.message || 'Login sintético falhou.')
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Acesso de validação</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-slate-600">
          Use somente o usuário sintético. Nenhum usuário real é usado.
        </p>
        <Button onClick={login}>
          <LogIn className="mr-2 h-4 w-4" />
          Entrar como usuário sintético
        </Button>
        {error && <p className="text-sm text-red-700">{error}</p>}
      </CardContent>
    </Card>
  )
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="text-sm text-slate-800">{children}</div>
    </div>
  )
}
function TextValue({ value }: { value: unknown }) {
  const text = String(value ?? '').trim()
  return <>{text || '—'}</>
}
function JsonList({ value }: { value: unknown }) {
  return Array.isArray(value) && value.length ? (
    <ul className="list-disc pl-4">
      {value.map((v, i) => (
        <li key={i}>{String(v)}</li>
      ))}
    </ul>
  ) : (
    <>—</>
  )
}
function ReasonModal({
  title,
  description,
  onConfirm,
  onCancel,
}: {
  title: string
  description: string
  onConfirm: (reason: string) => void
  onCancel: () => void
}) {
  const [reason, setReason] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md space-y-3 rounded-lg bg-white p-5 shadow-lg">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-slate-600">{description}</p>
        <textarea
          className="min-h-24 w-full rounded-md border p-2 text-sm"
          placeholder="Descreva o motivo (obrigatório)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button disabled={!reason.trim()} onClick={() => onConfirm(reason.trim())}>
            Confirmar
          </Button>
        </div>
      </div>
    </div>
  )
}
export function ExperimentosF2Page() {
  const [items, setItems] = useState<BriefingF2[]>([])
  const [error, setError] = useState('')
  const [, refresh] = useState(0)
  const load = () =>
    listarBriefings()
      .then(setItems)
      .catch((e) => setError(e?.message || 'Não foi possível carregar.'))
  useEffect(() => {
    if (pb.authStore.isValid) void load()
  }, [])
  if (!pb.authStore.isValid)
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          <h1 className="text-3xl font-bold">F2-T02 · Briefings de experimentos</h1>
          <LoginCard
            onLogin={() => {
              refresh((v) => v + 1)
              void load()
            }}
          />
        </div>
      </div>
    )
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Talent Group · Fase 2</p>
            <h1 className="text-3xl font-bold">Briefings de experimentos</h1>
            <p className="text-slate-600">Validação, duplicidade e aprovações sintéticas</p>
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
                refresh((v) => v + 1)
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="pt-6 text-emerald-900">
            <b>Sem execução externa</b>
            <p className="text-sm">Publicação e gasto são apenas controles sintéticos.</p>
          </CardContent>
        </Card>
        {error && <p className="text-red-700">{error}</p>}
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((item) => (
            <Link key={item.id} to={`/experimentos/${item.id}`}>
              <Card>
                <CardHeader>
                  <div className="flex justify-between">
                    <CardTitle>{item.experiment_id}</CardTitle>
                    <Badge className={corDoEstado(item.state)}>{item.state}</Badge>
                  </div>
                  <p>{item.title}</p>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>
                    {item.origin} · {item.channel} · {item.service}
                  </p>
                  <p>
                    <b>Versão:</b> {item.briefing_version} · <b>Sintético:</b> sim
                  </p>
                  <p>
                    <b>Publicação:</b> {item.publication_status || 'não solicitado'} · <b>Gasto:</b>{' '}
                    {item.spend_status || 'não solicitado'}
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
  const [versions, setVersions] = useState<VersaoF2[]>([])
  const [approvals, setApprovals] = useState<AprovacaoF2[]>([])
  const [blocks, setBlocks] = useState<BloqueioF2[]>([])
  const [history, setHistory] = useState(false)
  const historyRef = useRef<HTMLDivElement>(null)
  const [modal, setModal] = useState<null | {
    type: 'transition' | 'version' | 'approval_publication' | 'approval_spend' | 'block' | 'duplicate'
    destination?: EstadoBriefing
  }>(null)
  const [message, setMessage] = useState('')
  const load = async () => {
    try {
      const briefing = await obterBriefing(id)
      setItem(briefing)
      const [v, a, b] = await Promise.all([
        listarVersoes(briefing.experiment_id),
        listarAprovacoes(briefing.experiment_id),
        listarBloqueios(briefing.experiment_id),
      ])
      setVersions(v)
      setApprovals(a)
      setBlocks(b)
    } catch (e: any) {
      setError(e?.message || 'Não foi possível carregar.')
    }
  }
  useEffect(() => {
    if (pb.authStore.isValid) void load()
  }, [id])
  if (!pb.authStore.isValid)
    return (
      <div className="p-6">
        <LoginCard onLogin={() => window.location.reload()} />
      </div>
    )
  if (error) return <p className="p-6 text-red-700">{error}</p>
  if (!item) return <p className="p-6">Carregando…</p>
  const user = usuarioAtual()
  const canApprove = papelPodeAprovar(user?.role)
  const h = item.hypothesis as any
  const a = item.audience as any
  const offer = item.offer as any
  const windowData = item.execution_window as any
  const budget = item.budget as any
  const criteria = item.criteria as any
  const transition = async (destination: EstadoBriefing, reason: string) => {
    try {
      await transicionarEstado(item, destination, reason)
      if (destination === 'Bloqueado')
        await registrarBloqueio(item, {
          motivo: reason,
          regra: 'Decisão 15',
          identificadoPor: user?.name || 'usuário sintético',
          correcao: 'A definir.',
        })
      await load()
    } catch (e: any) {
      setMessage(e?.message || 'Ação falhou.')
    }
  }
  const execute = async (reason: string) => {
    if (!modal) return
    try {
      if (modal.type === 'transition' && modal.destination)
        await transition(modal.destination, reason)
      if (modal.type === 'version') await criarNovaVersao(item, reason, {})
      if (modal.type === 'duplicate') await tentativaDuplicidade(item)
      if (modal.type === 'approval_publication') {
        await registrarAprovacao(item, 'publicação', reason)
        await load()
      }
      if (modal.type === 'approval_spend') {
        await registrarAprovacao(item, 'gasto', reason)
        await load()
      }
      if (modal.type === 'block') {
        await registrarBloqueio(item, {
          motivo: reason,
          regra: 'Decisão 15',
          identificadoPor: user?.name || 'usuário sintético',
          correcao: 'A definir.',
        })
        await load()
      }
      setModal(null)
      await load()
    } catch (e: any) {
      setMessage(e?.message || 'Ação falhou.')
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
        {message && (
          <p className="rounded border border-amber-300 bg-amber-50 p-3 text-amber-900">
            {message}
          </p>
        )}
        <Card>
          <CardHeader>
            <div className="flex justify-between">
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
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Publicação">
                <Badge>{item.publication_status || 'não solicitado'}</Badge>
              </Field>
              <Field label="Gasto">
                <Badge>{item.spend_status || 'não solicitado'}</Badge>
              </Field>
              <Field label="Papel atual">
                <TextValue value={user?.role} />
              </Field>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    await solicitarAutorizacao(item, 'publicação')
                    await load()
                  } catch (e: any) {
                    setMessage(e?.message || 'Solicitação bloqueada.')
                  }
                }}
              >
                Solicitar publicação
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    await solicitarAutorizacao(item, 'gasto')
                    await load()
                  } catch (e: any) {
                    setMessage(e?.message || 'Solicitação bloqueada.')
                  }
                }}
              >
                Solicitar gasto
              </Button>
              <Button variant="outline" onClick={() => setModal({ type: 'duplicate' })}>
                Testar duplicidade
              </Button>
              {canApprove && (
                <Button variant="outline" onClick={() => setModal({ type: 'approval_publication' })}>
                  Aprovar publicação
                </Button>
                <Button variant="outline" onClick={() => setModal({ type: 'approval_spend' })}>
                  Aprovar gasto
                </Button>
              )}
              {(TRANSITIONS[item.state] || []).map((destination) => (
                <Button
                  key={destination}
                  variant={exigeMotivo(destination) ? 'destructive' : 'default'}
                  onClick={() =>
                    exigeMotivo(destination)
                      ? setModal({ type: 'transition', destination })
                      : void transition(
                          destination,
                          `Transição por ${user?.name || 'usuário sintético'}`,
                        )
                  }
                >
                  {destination}
                </Button>
              ))}
              <Button variant="outline" onClick={() => setModal({ type: 'version' })}>
                Nova versão ({proximaVersao(item.briefing_version)})
              </Button>
              <Button variant="outline" onClick={() => setModal({ type: 'block' })}>
                Registrar bloqueio
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  const open = !history
                  setHistory(open)
                  if (open)
                    setTimeout(
                      () => historyRef.current?.scrollIntoView({ behavior: 'smooth' }),
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
              <Field label="Serviço">
                <TextValue value={item.service} />
              </Field>
              <Field label="Origem">
                <TextValue value={item.origin} />
              </Field>
              <Field label="Canal">
                <TextValue value={item.channel} />
              </Field>
              <Field label="Hipótese — Se">
                <TextValue value={h.se} />
              </Field>
              <Field label="Hipótese — Para">
                <TextValue value={h.para} />
              </Field>
              <Field label="Hipótese — Então">
                <TextValue value={h.entao} />
              </Field>
              <Field label="Público — papel">
                <TextValue value={a.papel} />
              </Field>
              <Field label="Público — empresa">
                <TextValue value={a.empresa} />
              </Field>
              <Field label="Público — ICP">
                <TextValue value={a.icp} />
              </Field>
            </div>
            <Separator />
            <Field label="Oferta">
              <TextValue value={offer.descricao} />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Janela">
                <p>
                  {formatarData(windowData.inicio)} a {formatarData(windowData.fim)}
                </p>
              </Field>
              <Field label="Período de análise">
                <TextValue value={item.analysis_period} />
              </Field>
              <Field label="Orçamento">
                <p>{formatarMoeda(budget.valor, String(budget.moeda || 'BRL'))}</p>
              </Field>
              <Field label="Critérios">
                <ul>
                  {CRITERIOS_PARADA.map((c) => (
                    <li key={c}>
                      <b>{c}:</b> <TextValue value={criteria[c]} />
                    </li>
                  ))}
                </ul>
              </Field>
            </div>
            {history && (
              <div ref={historyRef} className="space-y-4">
                <Separator />
                <div>
                  <h2 className="font-semibold">Versões</h2>
                  {versions.map((v) => (
                    <p key={v.id} className="rounded border p-2 text-sm">
                      <b>{v.version}</b> · {v.change_summary} · {v.reason}
                    </p>
                  ))}
                </div>
                <div>
                  <h2 className="font-semibold">Aprovações</h2>
                  {approvals.map((approval) => (
                    <p key={approval.id} className="rounded border p-2 text-sm">
                      <b>{approval.briefing_version}</b> · {approval.status} · {approval.scope} ·{' '}
                      {approval.remarks}
                    </p>
                  ))}
                </div>
                <div>
                  <h2 className="font-semibold">Bloqueios</h2>
                  {blocks.map((block) => (
                    <p key={block.id} className="rounded border p-2 text-sm">
                      <b>{block.status}</b> · {block.reason} · {block.affected_rule}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      {modal && (
        <ReasonModal
          title={
            modal.type === 'version'
              ? 'Criar nova versão do briefing'
              : modal.type === 'approval_publication'
  ? 'Aprovar publicação'
  : modal.type === 'approval_spend'
    ? 'Aprovar gasto'
                : modal.type === 'block'
                  ? 'Registrar bloqueio'
                  : modal.type === 'duplicate'
                    ? 'Testar duplicidade'
                    : `Transição para ${modal.destination}`
          }
          description="A ação exige motivo registrado no histórico."
          onConfirm={execute}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  )
}

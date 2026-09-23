import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Compass,
  History,
  LogIn,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  TrendingUp,
  X,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
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
import { DecisaoMarketingSection } from '@/components/f2/DecisaoMarketingSection'
import { GaMetricCard } from '@/components/ga/GaMetricCard'
import { GaCard } from '@/components/ga/GaCard'

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
    <div className="rounded-xl border border-[#dadce0] bg-white p-6 shadow-none max-w-md mx-auto">
      <div className="flex items-center gap-2 mb-2">
        <div className="h-2 w-2 rounded-full bg-[#1a73e8]" />
        <h2 className="text-base font-medium text-[#202124]">
          Acesso de validação Google Analytics
        </h2>
      </div>
      <p className="text-xs text-[#5f6368] mb-4 leading-relaxed">
        Use o usuário de validação para gerenciar os briefings de experimentos. Nenhum dado do mundo
        real é consumido.
      </p>
      <Button
        onClick={login}
        disabled={busy}
        className="w-full h-9 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-medium shadow-none gap-2"
      >
        <LogIn className="h-4 w-4" />
        {busy ? 'Autenticando…' : 'Entrar como usuário sintético'}
      </Button>
      {error && <p className="mt-3 text-xs text-[#c5221f]">{error}</p>}
    </div>
  )
}

function Linha({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5f6368]">{titulo}</p>
      <div className="text-xs text-[#202124]">{children}</div>
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
      <ul className="list-disc pl-4 space-y-0.5">
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
      <div className="w-full max-w-md space-y-3 rounded-xl border border-[#dadce0] bg-white p-5 shadow-lg">
        <h3 className="text-sm font-medium text-[#202124]">{titulo}</h3>
        <p className="text-xs text-[#5f6368]">{descricao}</p>
        <textarea
          className="min-h-24 w-full rounded-lg border border-[#dadce0] p-2.5 text-xs text-[#202124] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] outline-none"
          placeholder="Descreva o motivo (obrigatório)"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-8 rounded-full text-xs text-[#5f6368]"
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={() => motivo.trim() && onConfirm(motivo.trim())}
            disabled={!motivo.trim()}
            className="h-8 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-medium shadow-none"
          >
            Confirmar
          </Button>
        </div>
        <p className="text-[11px] text-[#5f6368]">
          O registro fica arquivado no histórico da versão atual.
        </p>
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
  const [searchTerm, setSearchTerm] = useState('')
  const [, force] = useState(0)

  const load = async () => {
    setError('')
    for (let tentativa = 0; tentativa < 2; tentativa += 1) {
      try {
        const briefings = await listarBriefings()
        setItems(briefings)
        return
      } catch (e: any) {
        const status = e?.status ?? e?.response?.status
        if (status === 401) {
          pb.authStore.clear()
          setError('Sua sessão expirou. Entre novamente para carregar os briefings.')
          force((x) => x + 1)
          return
        }
        if (tentativa === 0) continue
        setError('Falha temporária de comunicação. Tente atualizar novamente.')
      }
    }
  }

  useEffect(() => {
    if (pb.authStore.isValid) void load()
  }, [])

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items
    const q = searchTerm.toLowerCase()
    return items.filter(
      (it) =>
        it.experiment_id?.toLowerCase().includes(q) ||
        it.title?.toLowerCase().includes(q) ||
        it.channel?.toLowerCase().includes(q) ||
        it.service?.toLowerCase().includes(q) ||
        it.origin?.toLowerCase().includes(q),
    )
  }, [items, searchTerm])

  if (!pb.authStore.isValid)
    return (
      <div className="p-6 sm:p-12">
        <LoginCard
          onLogin={() => {
            force((x) => x + 1)
            void load()
          }}
        />
      </div>
    )

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ========================================================
          GA4 PAGE HEADER
         ======================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-[#5f6368]">
            <span>Explorar</span>
            <span>›</span>
            <span>Fase 2 Marketing</span>
            <span>›</span>
            <span className="text-[#202124] font-medium">Briefings de experimentos</span>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-normal tracking-tight text-[#202124]">
            Exploração de experimentos (F2-T01)
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-[#5f6368]">
            Definição de hipóteses, públicos e critérios de validação controlados
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => void load()}
            className="h-8 rounded-full border border-[#dadce0] bg-white text-xs font-medium text-[#202124] hover:bg-[#f1f3f4] gap-1.5 shadow-none"
          >
            <RefreshCw className="h-3.5 w-3.5 text-[#5f6368]" />
            Atualizar
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              pb.authStore.clear()
              force((x) => x + 1)
            }}
            className="h-8 rounded-full text-xs text-[#5f6368] hover:text-[#202124] hover:bg-[#f1f3f4] gap-1.5"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair
          </Button>
        </div>
      </div>

      {/* GA4 Notice Box */}
      <div className="rounded-lg border border-[#dadce0] bg-white p-3.5 flex items-start gap-3 shadow-none">
        <ShieldCheck className="h-4 w-4 text-[#137333] mt-0.5 shrink-0" />
        <div className="text-xs text-[#5f6368] leading-relaxed">
          <strong className="text-[#202124] font-medium">Proteção operacional GA4:</strong> este
          módulo não usa a collection <code>demandas</code>, não publica campanhas reais, não gasta
          orçamento e não realiza chamadas a RD Station, 1CRM ou Meta.
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-[#fce8e6] bg-[#fdf2f2] p-3 text-xs text-[#c5221f]">
          {error}
        </div>
      )}

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GaMetricCard
          title="Total de briefings"
          value={items.length}
          sparklineData={[1, 2, 2, 3, 3, items.length || 3]}
          sparklineColor="#1a73e8"
          changeLabel="Versões gerenciadas"
          icon={<Compass className="h-4 w-4 text-[#1a73e8]" />}
          helpText="Total de briefings cadastrados no experimento"
        />

        <GaMetricCard
          title="Em preparação/revisão"
          value={items.filter((i) => i.state !== 'Arquivado').length}
          sparklineData={[2, 2, 3, 2, 3]}
          sparklineColor="#137333"
          changeLabel="Ativos no fluxo"
          icon={<ShieldCheck className="h-4 w-4 text-[#137333]" />}
        />

        <GaMetricCard
          title="Sintéticos controlados"
          value={items.filter((i) => i.synthetic_only).length}
          sparklineData={[1, 2, 2, 3]}
          sparklineColor="#e37400"
          sparklineType="bars"
          changeLabel="Sem risco externo"
          icon={<RefreshCw className="h-4 w-4 text-[#e37400]" />}
        />
      </div>

      {/* ========================================================
          GA4 BRIEFINGS GRID
         ======================================================== */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium text-[#202124]">Briefings cadastrados</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#f1f3f4] text-[#5f6368] font-mono">
              {filteredItems.length}
            </span>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#5f6368]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar por título, canal ou serviço..."
              className="h-8 rounded-full border border-[#dadce0] bg-white pl-8 pr-3 text-xs text-[#202124] placeholder:text-[#5f6368] focus:border-[#1a73e8] outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((item) => (
            <Link
              key={item.id}
              to={`/experimentos/${item.id}`}
              className="block rounded-xl border border-[#dadce0] bg-white p-5 hover:border-[#1a73e8] hover:shadow-sm transition"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <span className="font-mono text-xs font-semibold text-[#1a73e8]">
                    {item.experiment_id}
                  </span>
                  <h3 className="text-sm font-medium text-[#202124] mt-0.5">{item.title}</h3>
                </div>

                <span
                  className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${corDoEstado(
                    item.state,
                  )}`}
                >
                  {item.state}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#f1f3f4] text-[#202124] font-medium">
                  {item.origin}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#f1f3f4] text-[#5f6368]">
                  {item.channel}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#f1f3f4] text-[#5f6368]">
                  {item.service}
                </span>
              </div>

              <div className="space-y-1 text-xs text-[#5f6368] border-t border-[#f1f3f4] pt-3">
                <div className="flex justify-between">
                  <span>Versão do briefing:</span>
                  <strong className="text-[#202124] font-mono">{item.briefing_version}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Orçamento previsto:</span>
                  <strong className="text-[#202124]">
                    {formatarMoeda((item.budget as Record<string, unknown>)?.valor)}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Responsável:</span>
                  <span className="text-[#202124]">{item.responsible_label || '—'}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {!error && filteredItems.length === 0 && (
          <div className="rounded-xl border border-[#dadce0] bg-white p-12 text-center text-xs text-[#5f6368]">
            Nenhum briefing cadastrado ou correspondente à busca.
          </div>
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
  const historicoRef = useRef<HTMLDivElement | null>(null)
  const [modal, setModal] = useState<null | {
    tipo:
      | 'transicao'
      | 'versao'
      | 'aprovacao'
      | 'bloqueio'
      | 'duplicidade'
      | 'aprovar_publicacao'
      | 'aprovar_gasto'
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

  if (error) return <div className="p-6 text-xs text-[#c5221f]">{error}</div>
  if (!item)
    return (
      <div className="p-6 flex items-center gap-2 text-xs text-[#5f6368]">
        <RefreshCw className="h-4 w-4 animate-spin text-[#1a73e8]" />
        <span>Carregando detalhes do briefing…</span>
      </div>
    )

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

  const executarTransicao = async (destino: EstadoBriefing, motivo: string) => {
    if (!item) return
    setMensagem('')
    try {
      await transicionarEstado(item, destino, motivo)
      await carregar()
    } catch (e: any) {
      setMensagem(e?.message || 'A ação falhou.')
    }
  }

  const executar = async (motivo: string) => {
    if (!modal) return
    setMensagem('')
    try {
      if (modal.tipo === 'transicao' && modal.destino) {
        await executarTransicao(modal.destino, motivo)
        if (modal.destino === 'Bloqueado') {
          await registrarBloqueio(item, {
            motivo,
            regra: 'Decisão 15 — bloqueios estruturados',
            identificadoPor: usuario?.name || 'usuário sintético',
            correcao: 'A definir pelo responsável do briefing.',
          })
        }
      } else if (modal.tipo === 'versao') {
        await criarNovaVersao(item, motivo, {})
      } else if (modal.tipo === 'aprovacao') {
        await registrarAprovacao(item, 'preparação', motivo)
        if (item.state === 'Em revisão')
          await transicionarEstado(item, 'Aprovado para preparação', motivo)
      } else if (modal.tipo === 'duplicidade') {
        const resultado = await tentativaDuplicidade(item)
        if (resultado.bloqueada) {
          setMensagem(
            'Duplicidade bloqueada. O experiment_id já existe e o registro original foi preservado.',
          )
        }
      } else if (modal.tipo === 'aprovar_publicacao') {
        await registrarAprovacao(item, 'publicação', motivo)
      } else if (modal.tipo === 'aprovar_gasto') {
        await registrarAprovacao(item, 'gasto', motivo)
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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl">
      {/* Back button */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/experimentos')}
          className="h-8 rounded-full text-xs font-medium text-[#5f6368] hover:text-[#202124] hover:bg-[#f1f3f4] gap-1.5"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar para a lista de briefings
        </Button>
      </div>

      {mensagem && (
        <div className="rounded-lg border border-[#fef7e0] bg-[#fef7e0] p-3 text-xs text-[#b06000]">
          {mensagem}
        </div>
      )}

      {/* Main Detail Card */}
      <div className="rounded-xl border border-[#dadce0] bg-white p-5 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#f1f3f4] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-[#1a73e8]">
                {item.experiment_id}
              </span>
              <span className="text-xs text-[#5f6368]">· Versão {item.briefing_version}</span>
            </div>
            <h1 className="text-xl font-medium text-[#202124] mt-1">{item.title}</h1>
          </div>

          <span
            className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${corDoEstado(
              item.state,
            )}`}
          >
            {item.state}
          </span>
        </div>

        {/* Status Alerts */}
        {aprovacaoValida && (
          <div className="rounded-lg border border-[#ceead6] bg-[#e6f4ea] p-3 text-xs text-[#137333]">
            Aprovação válida para {item.briefing_version}:{' '}
            <strong>{aprovacaoValida.approver_label || 'aprovador'}</strong> (
            {rotuloPapel(aprovacaoValida.role)}) em {formatarData(aprovacaoValida.created)}.
          </div>
        )}

        {bloqueioAberto && (
          <div className="rounded-lg border border-[#fad2cf] bg-[#fce8e6] p-3 text-xs text-[#c5221f]">
            <strong>Bloqueio em aberto:</strong> {bloqueioAberto.reason} · Correção:{' '}
            {bloqueioAberto.correction_needed}
          </div>
        )}

        {/* Autorizações de Execução Box */}
        <div className="rounded-xl border border-[#dadce0] bg-[#f8f9fa] p-4 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5f6368]">
            Autorizações de execução
          </h3>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 rounded-lg bg-white border border-[#dadce0]">
              <span className="text-[11px] text-[#5f6368] block">Publicação:</span>
              <strong className="text-[#202124] capitalize">
                {item.publication_status || 'não solicitado'}
              </strong>
            </div>
            <div className="p-2.5 rounded-lg bg-white border border-[#dadce0]">
              <span className="text-[11px] text-[#5f6368] block">Gasto de orçamento:</span>
              <strong className="text-[#202124] capitalize">
                {item.spend_status || 'não solicitado'}
              </strong>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-full border-[#dadce0] text-xs font-medium text-[#202124] hover:bg-white"
              onClick={async () => {
                try {
                  await solicitarAutorizacao(item, 'publicação')
                  await carregar()
                } catch (e: any) {
                  setMensagem(e?.message || 'Solicitação de publicação bloqueada.')
                }
              }}
            >
              Solicitar publicação
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-full border-[#dadce0] text-xs font-medium text-[#202124] hover:bg-white"
              onClick={async () => {
                try {
                  await solicitarAutorizacao(item, 'gasto')
                  await carregar()
                } catch (e: any) {
                  setMensagem(e?.message || 'Solicitação de gasto bloqueada.')
                }
              }}
            >
              Solicitar gasto
            </Button>

            {podeAprovar && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-full border-[#dadce0] text-xs font-medium text-[#137333] hover:bg-[#e6f4ea]"
                  onClick={() => setModal({ tipo: 'aprovar_publicacao' })}
                >
                  Aprovar publicação
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-full border-[#dadce0] text-xs font-medium text-[#137333] hover:bg-[#e6f4ea]"
                  onClick={() => setModal({ tipo: 'aprovar_gasto' })}
                >
                  Aprovar gasto
                </Button>
              </>
            )}

            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-full border-[#dadce0] text-xs font-medium text-[#5f6368] hover:bg-white"
              onClick={() => setModal({ tipo: 'duplicidade' })}
            >
              Testar duplicidade
            </Button>
          </div>
        </div>

        {/* Embedded Section: Marketing Decision */}
        <DecisaoMarketingSection
          experimentId={item.experiment_id}
          briefingVersion={item.briefing_version}
          analysisPeriod={item.analysis_period}
          criteria={criterios}
        />

        {/* Workflow actions */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-[#f1f3f4]">
          {(TRANSICOES[item.state] || []).map((destino) => (
            <Button
              key={destino}
              size="sm"
              className={`h-8 rounded-full text-xs font-medium shadow-none ${
                exigeMotivo(destino)
                  ? 'bg-[#c5221f] hover:bg-[#a51d1a] text-white'
                  : 'bg-[#1a73e8] hover:bg-[#1557b0] text-white'
              }`}
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

          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-full border-[#dadce0] text-xs font-medium text-[#202124] hover:bg-[#f1f3f4]"
            onClick={() => setModal({ tipo: 'versao' })}
          >
            Nova versão ({proximaVersao(item.briefing_version)})
          </Button>

          {podeAprovar && !aprovacaoValida && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-full border-[#dadce0] text-xs font-medium text-[#137333] hover:bg-[#e6f4ea]"
              onClick={() => setModal({ tipo: 'aprovacao' })}
            >
              Aprovar preparação
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-full border-[#dadce0] text-xs font-medium text-[#c5221f] hover:bg-[#fce8e6]"
            onClick={() => setModal({ tipo: 'bloqueio' })}
          >
            Registrar bloqueio
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 rounded-full text-xs text-[#5f6368] hover:text-[#202124]"
            onClick={() => {
              const abrir = !mostrarHistorico
              setMostrarHistorico(abrir)
              if (abrir) {
                setTimeout(
                  () =>
                    historicoRef.current?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'start',
                    }),
                  100,
                )
              }
            }}
          >
            <History className="mr-1.5 h-3.5 w-3.5" />
            Histórico
          </Button>
        </div>

        {/* Detailed Briefing Fields */}
        <div className="space-y-4 pt-4 border-t border-[#f1f3f4]">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[#f1f3f4]">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#f1f3f4]">
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
            <div className="sm:col-span-2">
              <Linha titulo="Hipótese — Mediremos por">
                <ListaOuVazio valor={hipotese.mediremos_por} />
              </Linha>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#f1f3f4]">
            <Linha titulo="Público — Papel">
              <TextoOuVazio valor={publico.papel} />
            </Linha>
            <Linha titulo="Público — Empresa">
              <TextoOuVazio valor={publico.empresa} />
            </Linha>
            <Linha titulo="Público — ICP">
              <TextoOuVazio valor={publico.icp} />
            </Linha>
            <Linha titulo="Público — Separação">
              <TextoOuVazio valor={publico.separacao} />
            </Linha>
          </div>

          <div className="pt-3 border-t border-[#f1f3f4]">
            <Linha titulo="Descrição da oferta">
              <TextoOuVazio valor={oferta.descricao} />
            </Linha>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#f1f3f4]">
            <Linha titulo="Janela de execução prevista">
              <p>
                {formatarData(janela.inicio)} a {formatarData(janela.fim)}
              </p>
            </Linha>
            <Linha titulo="Período de análise previsto">
              <TextoOuVazio valor={item.analysis_period} />
            </Linha>
            <Linha titulo="Orçamento previsto">
              <p>
                {formatarMoeda(orcamento.valor, String(orcamento.moeda || 'BRL'))} ·{' '}
                <TextoOuVazio valor={orcamento.origem} />
              </p>
            </Linha>
            <Linha titulo="Critérios de parada">
              <ul className="list-disc pl-4 space-y-0.5">
                {CRITERIOS_PARADA.map((c) => (
                  <li key={c}>
                    <strong>{c}:</strong> <TextoOuVazio valor={criterios[c]} />
                  </li>
                ))}
              </ul>
            </Linha>
          </div>

          {/* History Accordion Section */}
          {mostrarHistorico && (
            <div className="space-y-4 pt-4 border-t border-[#f1f3f4]" ref={historicoRef}>
              <h2 className="text-sm font-medium text-[#202124]">Histórico e auditoria</h2>

              <div>
                <h3 className="text-xs font-semibold text-[#5f6368] mb-2 uppercase tracking-wider">
                  Versões do briefing
                </h3>
                {versoes.length === 0 && (
                  <p className="text-xs text-[#5f6368]">Nenhuma versão registrada.</p>
                )}
                <div className="space-y-2">
                  {versoes.map((v) => (
                    <div
                      key={v.id}
                      className="rounded-lg border border-[#dadce0] p-3 text-xs bg-[#fafafa]"
                    >
                      <strong className="text-[#202124]">{v.version}</strong> ·{' '}
                      {v.change_summary || '—'}
                      <div className="text-[11px] text-[#5f6368] mt-1">
                        Motivo: {v.reason} · Por: {v.actor_label || '—'} · {formatarData(v.created)}{' '}
                        · Status: {v.approval_status}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-[#5f6368] mb-2 uppercase tracking-wider">
                  Aprovações
                </h3>
                {aprovacoes.length === 0 && (
                  <p className="text-xs text-[#5f6368]">Nenhuma aprovação registrada.</p>
                )}
                <div className="space-y-2">
                  {aprovacoes.map((a) => (
                    <div
                      key={a.id}
                      className="rounded-lg border border-[#dadce0] p-3 text-xs bg-[#fafafa]"
                    >
                      <strong className="text-[#202124]">{a.briefing_version}</strong> · {a.status}{' '}
                      · {a.approver_label || '—'} ({rotuloPapel(a.role)}) ·{' '}
                      {formatarData(a.created)}
                      <div className="text-[11px] text-[#5f6368] mt-1">Escopo: {a.scope}</div>
                      {a.remarks && (
                        <div className="text-[11px] text-[#5f6368]">Ressalvas: {a.remarks}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-[#5f6368] mb-2 uppercase tracking-wider">
                  Bloqueios
                </h3>
                {bloqueios.length === 0 && (
                  <p className="text-xs text-[#5f6368]">Nenhum bloqueio registrado.</p>
                )}
                <div className="space-y-2">
                  {bloqueios.map((b) => (
                    <div
                      key={b.id}
                      className="rounded-lg border border-[#dadce0] p-3 text-xs bg-[#fafafa]"
                    >
                      <strong className="text-[#c5221f]">{b.status}</strong> · {b.reason}
                      <div className="text-[11px] text-[#5f6368] mt-1">
                        Regra: {b.affected_rule} · Identificado por: {b.identified_by} · Correção:{' '}
                        {b.correction_needed} · {formatarData(b.created)}
                      </div>
                      {b.status === 'aberto' && podeAprovar && (
                        <Button
                          className="mt-2 h-7 rounded-full text-xs"
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              await resolverBloqueio(b.id, 'resolvido')
                              await carregar()
                            } catch (e: any) {
                              setMensagem(e?.message || 'Não foi possível resolver o bloqueio.')
                            }
                          }}
                        >
                          Marcar como resolvido
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
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
                  : modal.tipo === 'aprovar_publicacao'
                    ? 'Aprovar publicação'
                    : modal.tipo === 'aprovar_gasto'
                      ? 'Aprovar gasto'
                      : modal.tipo === 'duplicidade'
                        ? 'Testar duplicidade'
                        : 'Registrar bloqueio'
          }
          descricao={
            modal.tipo === 'transicao'
              ? 'A transição exige motivo registrado no histórico.'
              : modal.tipo === 'versao'
                ? `O briefing ${item.briefing_version} será preservado e uma nova versão (${proximaVersao(
                    item.briefing_version,
                  )}) começará como Rascunho.`
                : modal.tipo === 'aprovacao'
                  ? 'A aprovação fica vinculada à versão exata do briefing.'
                  : modal.tipo === 'aprovar_publicacao'
                    ? 'A aprovação de publicação fica vinculada à versão exata e não aprova gasto.'
                    : modal.tipo === 'aprovar_gasto'
                      ? 'A aprovação de gasto fica vinculada à versão exata e não aprova publicação.'
                      : modal.tipo === 'duplicidade'
                        ? 'A tentativa usa o experiment_id existente e deve ser bloqueada sem alterar o original.'
                        : 'O bloqueio fica registrado e o briefing passa ao estado Bloqueado.'
          }
          onConfirm={executar}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  )
}

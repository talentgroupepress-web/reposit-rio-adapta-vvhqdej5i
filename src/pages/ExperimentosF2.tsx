import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, LogIn, LogOut, RefreshCw, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { getBriefing, listBriefings, type BriefingF2 } from '@/services/experimentosF2'
import pb from '@/lib/pocketbase/client'

function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="max-h-52 overflow-auto rounded-md bg-muted p-3 text-xs">
      {JSON.stringify(value, null, 2)}
    </pre>
  )
}

const SYNTHETIC_LOGIN = {
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
      await pb.collection('users').authWithPassword(SYNTHETIC_LOGIN.email, SYNTHETIC_LOGIN.password)
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

export function ExperimentosF2Page() {
  const [items, setItems] = useState<BriefingF2[]>([])
  const [error, setError] = useState('')
  const [, force] = useState(0)
  const load = () =>
    listBriefings()
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
                    <Badge variant="outline">{item.state}</Badge>
                  </div>
                  <p className="text-sm text-slate-600">{item.title}</p>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
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
                    <b>Orçamento previsto:</b> {JSON.stringify(item.budget)}
                  </p>
                  <p>
                    <b>Responsável:</b> {item.briefing_responsible}
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
  useEffect(() => {
    if (pb.authStore.isValid)
      getBriefing(id)
        .then(setItem)
        .catch((e) => setError(e?.message || 'Não foi possível carregar o briefing.'))
  }, [id])
  if (!pb.authStore.isValid)
    return (
      <div className="p-6">
        <LoginCard onLogin={() => window.location.reload()} />
      </div>
    )
  if (error) return <div className="p-6 text-red-700">{error}</div>
  if (!item) return <div className="p-6">Carregando briefing…</div>
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <Button variant="ghost" onClick={() => navigate('/experimentos')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">
                  {item.experiment_id} · {item.briefing_version}
                </p>
                <CardTitle>{item.title}</CardTitle>
              </div>
              <Badge>{item.state}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <b>Serviço</b>
                <p>{item.service}</p>
              </div>
              <div>
                <b>Origem</b>
                <p>{item.origin}</p>
              </div>
              <div>
                <b>Canal</b>
                <p>{item.channel}</p>
              </div>
            </div>
            <Separator />
            <div>
              <h2 className="mb-2 text-lg font-semibold">Hipótese</h2>
              <JsonBlock value={item.hypothesis} />
            </div>
            <div>
              <h2 className="mb-2 text-lg font-semibold">Público / ICP</h2>
              <JsonBlock value={item.audience} />
            </div>
            <div>
              <h2 className="mb-2 text-lg font-semibold">Oferta</h2>
              <JsonBlock value={item.offer} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h2 className="mb-2 text-lg font-semibold">Janela e análise</h2>
                <JsonBlock
                  value={{
                    execution_window: item.execution_window,
                    analysis_period: item.analysis_period,
                  }}
                />
              </div>
              <div>
                <h2 className="mb-2 text-lg font-semibold">Orçamento e critérios</h2>
                <JsonBlock value={{ budget: item.budget, criteria: item.criteria }} />
              </div>
            </div>
            <div>
              <h2 className="mb-2 text-lg font-semibold">Responsabilidades</h2>
              <JsonBlock
                value={{
                  owner_user: item.owner_user,
                  briefing_responsible: item.briefing_responsible,
                  approver_user: item.approver_user || 'não definido',
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

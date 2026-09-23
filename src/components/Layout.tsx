import React, { useState, useEffect } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  ChevronDown,
  Compass,
  FileSpreadsheet,
  FolderGit2,
  HelpCircle,
  Layers,
  LineChart,
  Megaphone,
  Menu,
  MessageSquare,
  Radio,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  User,
  X,
  Bell,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function GoogleAnalyticsLogo() {
  return (
    <div className="flex items-center gap-2 select-none">
      {/* GA4 Icon: orange/amber rounded square with stylized bar chart */}
      <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#f9ab00] via-[#f29900] to-[#e37400] shadow-sm">
        <div className="flex items-end gap-[3px] h-4">
          <span className="w-1 rounded-sm bg-white/70 h-2" />
          <span className="w-1 rounded-sm bg-white/90 h-3" />
          <span className="w-1 rounded-sm bg-white h-4 shadow-[0_0_2px_rgba(0,0,0,0.15)]" />
        </div>
        <div className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[#ea4335] ring-1 ring-white" />
      </div>
      <div className="flex flex-col leading-none">
        <span className="font-medium text-[16px] tracking-tight text-[#202124]">
          <span className="font-normal text-[#5f6368]">Google </span>
          <span className="font-medium">Analytics</span>
        </span>
        <span className="text-[10px] text-[#5f6368] font-medium tracking-wide">
          ADAPTA · GA4 REPO
        </span>
      </div>
    </div>
  )
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [property, setProperty] = useState('Adapta · Produção (GA4-BR)')
  const [dateRange, setDateRange] = useState('Últimos 28 dias')
  const location = useLocation()
  const navigate = useNavigate()

  // Fecha o menu móvel ao mudar de rota
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  const properties = [
    { id: '1', name: 'Adapta · Produção (GA4-BR)', account: 'Talent Group Holding' },
    { id: '2', name: 'Adapta · Experimentos F2', account: 'Talent Group Marketing' },
    { id: '3', name: 'Adapta · Pipeline Staging', account: 'Talent Group QA' },
  ]

  const navItems = [
    {
      label: 'Relatórios',
      icon: BarChart3,
      to: '/',
      badge: 'Principal',
      subtext: 'Pipeline comercial & fontes',
    },
    {
      label: 'Tempo real',
      icon: Radio,
      to: '/atribuicao-t04',
      badge: 'T04',
      subtext: 'Lote-fonte & reconciliação',
    },
    {
      label: 'Explorar',
      icon: Compass,
      to: '/experimentos',
      badge: 'F2-T01',
      subtext: 'Briefings & hipóteses',
    },
    {
      label: 'Publicidade & Decisões',
      icon: Megaphone,
      to: '/decisoes-f2',
      badge: 'F2-T05',
      subtext: 'Governança & ações',
    },
  ]

  // Abas da barra de contexto GA4 mapeadas para rotas e seções
  const contextTabs = [
    {
      id: 'visao-geral',
      label: 'Visão geral',
      to: '/',
      description: 'Métricas gerais e pipeline comercial',
    },
    {
      id: 'aquisicao',
      label: 'Aquisição',
      to: '/atribuicao-t04',
      description: 'Atribuição e canais de entrada',
    },
    {
      id: 'engajamento',
      label: 'Engajamento',
      to: '/experimentos',
      description: 'Testes, hipóteses e briefings F2',
    },
    {
      id: 'monetizacao',
      label: 'Monetização',
      to: '/decisoes-f2',
      description: 'Fila de governança e decisões comerciais',
    },
  ]

  const datePresets = [
    'Hoje',
    'Ontem',
    'Últimos 7 dias',
    'Últimos 28 dias',
    'Últimos 90 dias',
    'Ano atual',
    'Personalizado...',
  ]

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#202124] flex flex-col font-sans">
      {/* ========================================================
          TOP BAR (Fixed Google Analytics 4 Header)
         ======================================================== */}
      <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-[#dadce0] bg-white px-3 sm:px-4 shadow-[0_1px_2px_rgba(60,64,67,0.08)]">
        {/* Left: Hamburger + GA Logo */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full text-[#5f6368] hover:bg-[#f1f3f4] hover:text-[#202124]"
            onClick={() => {
              if (window.innerWidth < 1024) {
                setMobileMenuOpen(!mobileMenuOpen)
              } else {
                setSidebarOpen(!sidebarOpen)
              }
            }}
            title="Alternar menu"
            aria-label="Alternar menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <NavLink to="/" title="Ir para a página inicial" className="focus:outline-none">
            <GoogleAnalyticsLogo />
          </NavLink>
        </div>

        {/* Center: Property Dropdown + GA Search Box */}
        <div className="hidden md:flex items-center gap-3 flex-1 max-w-2xl mx-4">
          {/* Property Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 h-9 px-3 text-xs sm:text-sm font-medium text-[#202124] bg-white border border-[#dadce0] rounded-full hover:bg-[#f8f9fa] hover:border-[#bdc1c6] transition shrink-0 max-w-[260px] shadow-sm"
              >
                <div className="h-2 w-2 rounded-full bg-[#137333]" />
                <span className="truncate">{property}</span>
                <ChevronDown className="h-3.5 w-3.5 text-[#5f6368] shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-80 p-2 shadow-lg border-[#dadce0]">
              <DropdownMenuLabel className="text-xs uppercase tracking-wider text-[#5f6368] font-semibold">
                Contas e propriedades do Analytics
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {properties.map((p) => (
                <DropdownMenuItem
                  key={p.id}
                  onClick={() => setProperty(p.name)}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-[#f1f3f4] cursor-pointer"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-[#202124]">{p.name}</span>
                    <span className="text-xs text-[#5f6368]">{p.account}</span>
                  </div>
                  {property === p.name && <Check className="h-4 w-4 text-[#1a73e8]" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* GA Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5f6368]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Pesquisar no Google Analytics (ex.: "conversões", "relatórios", "reconciliação")'
              className="h-9 w-full rounded-full border border-[#dadce0] bg-[#f1f3f4] pl-9 pr-8 text-xs text-[#202124] placeholder:text-[#5f6368] outline-none transition focus:bg-white focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20 shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#5f6368] hover:text-[#202124]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right: Help, Notifications, User Avatar */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full text-[#5f6368] hover:bg-[#f1f3f4] hover:text-[#202124]"
                title="Ajuda e suporte GA4"
              >
                <HelpCircle className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-3 border-[#dadce0]">
              <div className="text-sm font-medium text-[#202124] mb-1">Central de Ajuda GA4</div>
              <p className="text-xs text-[#5f6368] mb-3 leading-relaxed">
                Repositório Adapta estilizado com o design system do Google Analytics 4.
              </p>
              <div className="text-xs space-y-1.5 text-[#1a73e8]">
                <div className="hover:underline cursor-pointer">
                  Documentação do Google Analytics
                </div>
                <div className="hover:underline cursor-pointer">Guia de reconciliação F2</div>
                <div className="hover:underline cursor-pointer">Atalhos do teclado</div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            className="relative h-9 w-9 rounded-full text-[#5f6368] hover:bg-[#f1f3f4] hover:text-[#202124]"
            title="Notificações"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#1a73e8]" />
          </Button>

          {/* User Profile avatar */}
          <div className="flex items-center gap-2 pl-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1a73e8] text-white text-xs font-semibold shadow-sm ring-2 ring-white">
              A
            </div>
          </div>
        </div>
      </header>

      {/* ========================================================
          SUB-HEADER / SELECTOR BAR (Breadcrumbs, tabs, date filter)
         ======================================================== */}
      <div className="sticky top-14 z-30 flex flex-wrap items-center justify-between border-b border-[#dadce0] bg-white px-4 sm:px-6 py-2 gap-3 shadow-[0_1px_1px_rgba(0,0,0,0.03)]">
        {/* Left: Section tabs like GA4 (Visão geral, Aquisição, Engajamento, Monetização) */}
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto text-xs sm:text-sm py-0.5">
          {contextTabs.map((tab) => {
            const isTabActive =
              tab.to === '/' ? location.pathname === '/' : location.pathname.startsWith(tab.to)
            return (
              <NavLink
                key={tab.id}
                to={tab.to}
                title={tab.description}
                className={`px-3 py-1.5 rounded-full font-medium transition whitespace-nowrap inline-flex items-center ${
                  isTabActive
                    ? 'bg-[#e8f0fe] text-[#1a73e8] font-semibold'
                    : 'text-[#5f6368] hover:bg-[#f1f3f4] hover:text-[#202124]'
                }`}
              >
                {tab.label}
              </NavLink>
            )
          })}
        </div>

        {/* Right: Date Range Selector pill (Classic Google Analytics pill) */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 h-8 px-3.5 text-xs font-medium text-[#202124] bg-white border border-[#dadce0] rounded-full hover:bg-[#f8f9fa] hover:border-[#bdc1c6] transition shadow-sm"
              >
                <span className="text-[#5f6368]">Período:</span>
                <span className="font-semibold text-[#1a73e8]">{dateRange}</span>
                <ChevronDown className="h-3.5 w-3.5 text-[#5f6368]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-1 border-[#dadce0]">
              <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-[#5f6368]">
                Intervalo de datas
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {datePresets.map((preset) => (
                <DropdownMenuItem
                  key={preset}
                  onClick={() => setDateRange(preset)}
                  className="flex items-center justify-between text-xs py-2 px-3 rounded hover:bg-[#f1f3f4] cursor-pointer"
                >
                  <span className={dateRange === preset ? 'font-semibold text-[#1a73e8]' : ''}>
                    {preset}
                  </span>
                  {dateRange === preset && <Check className="h-3.5 w-3.5 text-[#1a73e8]" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-full border-[#dadce0] text-xs font-medium text-[#5f6368] hover:text-[#202124] hover:bg-[#f1f3f4]"
            onClick={() => window.print()}
            title="Compartilhar ou exportar este relatório"
          >
            Exportar
          </Button>
        </div>
      </div>

      {/* ========================================================
          BODY: SIDEBAR + MAIN CONTENT
         ======================================================== */}
      <div className="flex flex-1">
        {/* Desktop Sidebar (approx 240px or icon-only 64px) */}
        <aside
          className={`hidden lg:flex flex-col shrink-0 border-r border-[#dadce0] bg-white transition-all duration-200 select-none ${
            sidebarOpen ? 'w-60' : 'w-16'
          }`}
        >
          <div className="p-3 space-y-1 flex-1">
            <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#5f6368]">
              {sidebarOpen ? 'Ciclo de vida' : '•'}
            </div>

            {navItems.map((item) => {
              const isActive =
                item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  title={item.label}
                  className={`group flex items-center gap-3 px-3 py-2.5 rounded-full text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-[#e8f0fe] text-[#1a73e8] font-semibold shadow-xs'
                      : 'text-[#5f6368] hover:bg-[#f1f3f4] hover:text-[#202124]'
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 transition-colors ${
                      isActive ? 'text-[#1a73e8]' : 'text-[#5f6368] group-hover:text-[#202124]'
                    }`}
                  />
                  {sidebarOpen && (
                    <div className="flex items-center justify-between flex-1 min-w-0">
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-medium ${
                            isActive
                              ? 'bg-[#1a73e8] text-white'
                              : 'bg-[#f1f3f4] text-[#5f6368] group-hover:bg-[#e8eaed]'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}
                </NavLink>
              )
            })}

            <div className="pt-4 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#5f6368]">
              {sidebarOpen ? 'Configuração' : '•'}
            </div>

            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate('/decisoes-f2')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  navigate('/decisoes-f2')
                }
              }}
              className={`flex items-center gap-3 px-3 py-2 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                location.pathname.startsWith('/decisoes-f2')
                  ? 'bg-[#e8f0fe] text-[#1a73e8] font-semibold'
                  : 'text-[#5f6368] hover:bg-[#f1f3f4] hover:text-[#202124]'
              }`}
              title="Administração e Governança F2"
            >
              <Settings className="h-4 w-4 shrink-0" />
              {sidebarOpen && <span>Administrador</span>}
            </div>
          </div>

          {/* Sidebar footer status card */}
          {sidebarOpen && (
            <div className="m-3 p-3 rounded-lg bg-[#f8f9fa] border border-[#dadce0] text-[11px] text-[#5f6368]">
              <div className="flex items-center gap-1.5 font-medium text-[#202124]">
                <ShieldCheck className="h-3.5 w-3.5 text-[#137333]" />
                Modo Somente Leitura
              </div>
              <p className="mt-1 leading-snug">
                Sem alterações de banco de dados. Métricas calculadas em tempo real.
              </p>
            </div>
          )}
        </aside>

        {/* Mobile Sidebar overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/40 lg:hidden backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div
              className="h-full w-72 bg-white p-4 shadow-xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-4 border-b border-[#dadce0]">
                <NavLink
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                  title="Ir para a página inicial"
                  className="focus:outline-none"
                >
                  <GoogleAnalyticsLogo />
                </NavLink>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="py-4 space-y-1 flex-1">
                <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#5f6368]">
                  Módulos do Analytics
                </div>
                {navItems.map((item) => {
                  const isActive =
                    item.to === '/'
                      ? location.pathname === '/'
                      : location.pathname.startsWith(item.to)
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-full text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-[#e8f0fe] text-[#1a73e8] font-semibold'
                          : 'text-[#5f6368] hover:bg-[#f1f3f4] hover:text-[#202124]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium ${
                          isActive ? 'bg-[#1a73e8] text-white' : 'bg-[#f1f3f4] text-[#5f6368]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    </NavLink>
                  )
                })}

                <div className="pt-4 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#5f6368]">
                  Configuração
                </div>

                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setMobileMenuOpen(false)
                    navigate('/decisoes-f2')
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setMobileMenuOpen(false)
                      navigate('/decisoes-f2')
                    }
                  }}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                    location.pathname.startsWith('/decisoes-f2')
                      ? 'bg-[#e8f0fe] text-[#1a73e8] font-semibold'
                      : 'text-[#5f6368] hover:bg-[#f1f3f4] hover:text-[#202124]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Settings className="h-4 w-4" />
                    <span>Administrador</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#f1f3f4] text-[#5f6368]">
                    F2
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-[#dadce0] text-xs text-[#5f6368]">
                Talent Group · Adapta GA4
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 bg-[#f8f9fa] overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

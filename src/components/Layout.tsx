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
    <div className="flex items-center gap-2.5 select-none">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#f9ab00] to-[#e37400]">
        <div className="flex items-end gap-[3px] h-4">
          <span className="w-1 rounded-sm bg-white/70 h-2" />
          <span className="w-1 rounded-sm bg-white/90 h-3" />
          <span className="w-1 rounded-sm bg-white h-4" />
        </div>
      </div>
      <span className="font-medium text-[15px] tracking-tight text-[#202124]">Analytics</span>
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
    },
    {
      label: 'Tempo real',
      icon: Radio,
      to: '/atribuicao-t04',
    },
    {
      label: 'Explorar',
      icon: Compass,
      to: '/experimentos',
    },
    {
      label: 'Publicidade',
      icon: Megaphone,
      to: '/decisoes-f2',
    },
  ]

  const contextTabs = [
    {
      id: 'visao-geral',
      label: 'Visão geral',
      to: '/',
    },
    {
      id: 'aquisicao',
      label: 'Aquisição',
      to: '/atribuicao-t04',
    },
    {
      id: 'engajamento',
      label: 'Engajamento',
      to: '/experimentos',
    },
    {
      id: 'monetizacao',
      label: 'Monetização',
      to: '/decisoes-f2',
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
      {/* Top Bar */}
      <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-[#e0e2e6] bg-white px-4">
        {/* Left: Hamburger + Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full text-[#5f6368] hover:bg-[#f1f3f4] hover:text-[#202124]"
            onClick={() => {
              if (window.innerWidth < 1024) {
                setMobileMenuOpen(!mobileMenuOpen)
              } else {
                setSidebarOpen(!sidebarOpen)
              }
            }}
            title="Menu"
            aria-label="Menu"
          >
            <Menu className="h-4 w-4" />
          </Button>

          <NavLink to="/" title="Início" className="focus:outline-none">
            <GoogleAnalyticsLogo />
          </NavLink>
        </div>

        {/* Center: Search Box */}
        <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#5f6368]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar..."
              className="h-8 w-full rounded-full border border-[#dadce0] bg-[#f8f9fa] pl-8 pr-7 text-xs text-[#202124] placeholder:text-[#5f6368] outline-none transition focus:bg-white focus:border-[#1a73e8]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5f6368] hover:text-[#202124]"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Right: Property & User */}
        <div className="flex items-center gap-2 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 h-8 px-2.5 text-xs font-medium text-[#202124] bg-white border border-[#dadce0] rounded-full hover:bg-[#f8f9fa] transition shrink-0 max-w-[200px]"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-[#137333]" />
                <span className="truncate">{property}</span>
                <ChevronDown className="h-3 w-3 text-[#5f6368] shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 p-1.5 border-[#dadce0]">
              {properties.map((p) => (
                <DropdownMenuItem
                  key={p.id}
                  onClick={() => setProperty(p.name)}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-[#f1f3f4] cursor-pointer text-xs"
                >
                  <span className="font-medium text-[#202124]">{p.name}</span>
                  {property === p.name && <Check className="h-3.5 w-3.5 text-[#1a73e8]" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1a73e8] text-white text-xs font-semibold">
            A
          </div>
        </div>
      </header>

      {/* Selector Bar */}
      <div className="sticky top-14 z-30 flex flex-wrap items-center justify-between border-b border-[#e0e2e6] bg-white px-4 sm:px-6 py-1.5 gap-2">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto text-xs py-0.5">
          {contextTabs.map((tab) => {
            const isTabActive =
              tab.to === '/' ? location.pathname === '/' : location.pathname.startsWith(tab.to)
            return (
              <NavLink
                key={tab.id}
                to={tab.to}
                className={`px-3 py-1 rounded-full font-medium transition whitespace-nowrap inline-flex items-center ${
                  isTabActive
                    ? 'bg-[#e8f0fe] text-[#1a73e8]'
                    : 'text-[#5f6368] hover:bg-[#f1f3f4] hover:text-[#202124]'
                }`}
              >
                {tab.label}
              </NavLink>
            )
          })}
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 h-7 px-3 text-xs font-medium text-[#202124] bg-white border border-[#dadce0] rounded-full hover:bg-[#f8f9fa] transition"
              >
                <span className="text-[#1a73e8] font-medium">{dateRange}</span>
                <ChevronDown className="h-3 w-3 text-[#5f6368]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 p-1 border-[#dadce0]">
              {datePresets.map((preset) => (
                <DropdownMenuItem
                  key={preset}
                  onClick={() => setDateRange(preset)}
                  className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded hover:bg-[#f1f3f4] cursor-pointer"
                >
                  <span className={dateRange === preset ? 'font-medium text-[#1a73e8]' : ''}>
                    {preset}
                  </span>
                  {dateRange === preset && <Check className="h-3.5 w-3.5 text-[#1a73e8]" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ========================================================
          BODY: SIDEBAR + MAIN CONTENT
         ======================================================== */}
      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <aside
          className={`hidden lg:flex flex-col shrink-0 border-r border-[#e0e2e6] bg-white transition-all duration-200 select-none ${
            sidebarOpen ? 'w-56' : 'w-16'
          }`}
        >
          <div className="p-2 space-y-0.5 flex-1">
            {navItems.map((item) => {
              const isActive =
                item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  title={item.label}
                  className={`group flex items-center gap-3 px-3 py-2 rounded-full text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-[#e8f0fe] text-[#1a73e8]'
                      : 'text-[#5f6368] hover:bg-[#f1f3f4] hover:text-[#202124]'
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 transition-colors ${
                      isActive ? 'text-[#1a73e8]' : 'text-[#5f6368] group-hover:text-[#202124]'
                    }`}
                  />
                  {sidebarOpen && <span className="truncate">{item.label}</span>}
                </NavLink>
              )
            })}
          </div>

          {/* Clean minimal sidebar footer */}
          {sidebarOpen && (
            <div className="p-3 border-t border-[#f1f3f4] text-[11px] text-[#5f6368] flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-[#137333] shrink-0" />
              <span>Somente leitura</span>
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
                      className={`flex items-center gap-3 px-3 py-2 rounded-full text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-[#e8f0fe] text-[#1a73e8]'
                          : 'text-[#5f6368] hover:bg-[#f1f3f4] hover:text-[#202124]'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </NavLink>
                  )
                })}
              </div>

              <div className="pt-3 border-t border-[#dadce0] text-xs text-[#5f6368] flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-[#137333]" />
                <span>Modo somente leitura</span>
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

/* Layout Component - A component that wraps the main content of the app
   - Use this file to add a header, footer, or other elements that should be present on every page
   - This component is used in the App.tsx file to wrap the main content of the app */

import { Outlet } from 'react-router-dom'

export default function Layout() {
  return (
    <main className="flex min-h-screen flex-col">
      <header className="border-b bg-white px-6 py-3">
        <nav className="mx-auto flex max-w-7xl items-center justify-between text-sm">
          <span className="font-semibold">Talent Group · Adapta</span>
          <div className="flex gap-4">
            <a className="text-slate-600 hover:text-slate-950" href="/">
              Pipeline
            </a>
            <a className="text-slate-600 hover:text-slate-950" href="/experimentos">
              Experimentos
            </a>
            <a className="text-slate-600 hover:text-slate-950" href="/atribuicao-t04">
              Atribuição T04
            </a>
            <a className="text-slate-600 hover:text-slate-950" href="/decisoes-f2">
              Decisões F2
            </a>
          </div>
        </nav>
      </header>
      <Outlet />
    </main>
  )
}

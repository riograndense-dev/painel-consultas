import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/auth-context'
import { getApiBaseUrl } from '../lib/config'
import { formatDataHora } from '../lib/format'

function initials(name) {
  return String(name ?? '?')
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-200/20 bg-gradient-to-br from-emerald-900 to-slate-900 text-sm font-bold text-amber-200 shadow-lg shadow-black/25">
        RG
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-semibold text-slate-900">Riograndense</span>
        <span className="block text-xs text-slate-500">Carteira WinThor</span>
      </span>
    </div>
  )
}

export function AppShell() {
  const { displayName, role, claims, expiresAt, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await signOut()
    } finally {
      setSigningOut(false)
      setMenuOpen(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-6">
            <Brand />
            <nav className="hidden items-center gap-1 sm:flex">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? 'bg-emerald-950 text-amber-200'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                Carteira de clientes
              </NavLink>
              <NavLink
                to="/atualizacoes"
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? 'bg-emerald-950 text-amber-200'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                Atualizações
              </NavLink>
            </nav>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-2 py-1.5 pr-4 text-left shadow-sm transition hover:border-slate-300 hover:shadow"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                {initials(displayName)}
              </span>
              <span className="hidden leading-tight sm:block">
                <span className="block max-w-[12rem] truncate text-sm font-semibold text-slate-800">
                  {displayName}
                </span>
                <span className="block text-xs text-slate-500">{role ?? 'autenticado'}</span>
              </span>
              <svg
                className={`h-4 w-4 text-slate-400 transition ${menuOpen ? 'rotate-180' : ''}`}
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M5.2 7.4 4 8.6l6 6 6-6-1.2-1.2L10 12.2 5.2 7.4Z" />
              </svg>
            </button>

            {menuOpen ? (
              <div className="absolute right-0 mt-2 w-72 origin-top-right animate-fade-in rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
                  Sessão
                </p>
                <dl className="mt-3 space-y-2 text-sm">
                  {claims.length === 0 ? (
                    <p className="text-slate-500">Token opaco: sem claims legíveis.</p>
                  ) : (
                    claims.map(([label, value]) => (
                      <div key={label} className="flex items-start justify-between gap-3">
                        <dt className="text-slate-500">{label}</dt>
                        <dd className="text-right font-medium break-all text-slate-800">
                          {String(value)}
                        </dd>
                      </div>
                    ))
                  )}
                  <div className="flex items-start justify-between gap-3 border-t border-slate-100 pt-2">
                    <dt className="text-slate-500">API</dt>
                    <dd className="text-right font-mono text-xs break-all text-slate-700">
                      {getApiBaseUrl()}
                    </dd>
                  </div>
                </dl>
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="mt-4 w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {signingOut ? 'Saindo…' : 'Sair da conta'}
                </button>
              </div>
            ) : null}
          </div>
        </div>
        <nav className="mx-auto flex w-full max-w-6xl gap-1 border-t border-slate-100 px-4 py-2 sm:hidden" aria-label="Navegação principal">
          <NavLink to="/" end className={({ isActive }) => `flex-1 rounded-lg px-3 py-2 text-center text-sm font-medium ${isActive ? 'bg-emerald-950 text-amber-200' : 'text-slate-600'}`}>Carteira</NavLink>
          <NavLink to="/atualizacoes" className={({ isActive }) => `flex-1 rounded-lg px-3 py-2 text-center text-sm font-medium ${isActive ? 'bg-emerald-950 text-amber-200' : 'text-slate-600'}`}>Atualizações</NavLink>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200/80 bg-white/60 py-5">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>Carteira de clientes · situação cadastral WinThor</p>
          <p>
            {expiresAt
              ? `Sessão válida até ${formatDataHora(new Date(expiresAt))}`
              : 'Sessão sem expiração informada pelo token'}
          </p>
        </div>
      </footer>
    </div>
  )
}

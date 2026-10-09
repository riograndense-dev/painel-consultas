import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import * as authApi from '../api/auth'
import { Alert } from '../components/Alert'
import { Spinner } from '../components/Spinner'
import { useAuth } from '../context/auth-context'
import { DEFAULT_API_URL, getApiBaseUrl, resetApiBaseUrl, setApiBaseUrl } from '../lib/config'

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 focus:outline-none disabled:bg-slate-50'
const labelClass = 'mb-1.5 block text-sm font-medium text-slate-700'
const secondaryButton =
  'rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 disabled:opacity-60'

const BULLETS = [
  'Autenticação OAuth2 password no endpoint /auth/login',
  'Token JWT persistido e decodificado com jwt-decode',
  'Consulta de situação cadastral em /clients/situacao',
]

function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden rounded-3xl border border-emerald-800/60 bg-gradient-to-br from-emerald-950 via-green-950 to-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, rgba(255,255,255,.5) 0, transparent 45%), radial-gradient(circle at 80% 70%, rgba(255,255,255,.35) 0, transparent 40%)',
        }}
        aria-hidden="true"
      />
      <div className="relative">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-lg font-bold backdrop-blur">
          RG
        </span>
        <h2 className="mt-8 text-3xl leading-tight font-semibold">
          Winthor + iSA API
          <span className="block text-amber-200">Riograndense</span>
        </h2>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-emerald-100">
          Portal para consulta da situação cadastral dos clientes na base do ERP WinThor.
        </p>
      </div>

      <ul className="relative mt-10 space-y-3 text-sm text-emerald-50">
        {BULLETS.map((item) => (
          <li key={item} className="flex items-start gap-3">
            <svg
              className="mt-0.5 h-5 w-5 shrink-0 text-amber-200"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.6-9.9a1 1 0 0 0-1.4-1.4L9 9.9 7.8 8.7a1 1 0 1 0-1.4 1.4l1.9 1.9a1 1 0 0 0 1.4 0l4-4Z"
                clipRule="evenodd"
              />
            </svg>
            {item}
          </li>
        ))}
      </ul>
    </aside>
  )
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { signIn, isAuthenticated, notice, dismissNotice } = useAuth()

  const [usuario, setUsuario] = useState('')
  const [senha, setSenha] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [apiUrl, setApiUrl] = useState(getApiBaseUrl)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)

  const redirectTo = location.state?.from || '/'

  useEffect(() => {
    if (isAuthenticated) navigate(redirectTo, { replace: true })
  }, [isAuthenticated, navigate, redirectTo])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (submitting) return

    setError(null)
    dismissNotice()

    if (!usuario.trim() || !senha) {
      setError('Informe usuário e senha para continuar.')
      return
    }

    setSubmitting(true)
    setApiBaseUrl(apiUrl)
    try {
      await signIn({ usuario: usuario.trim(), senha })
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setError(err?.message ?? 'Não foi possível autenticar.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleTestConnection = async () => {
    setTesting(true)
    setTestResult(null)
    setApiUrl(setApiBaseUrl(apiUrl))
    try {
      await authApi.ping()
      setTestResult({ variant: 'success', message: `API respondeu em ${getApiBaseUrl()}.` })
    } catch (err) {
      setTestResult({ variant: 'error', message: err?.message ?? 'Falha ao conectar com a API.' })
    } finally {
      setTesting(false)
    }
  }

  const handleResetApiUrl = () => {
    setApiUrl(resetApiBaseUrl())
    setTestResult({ variant: 'info', message: `URL base restaurada para ${DEFAULT_API_URL}.` })
  }

  return (
    <div className="mx-auto grid min-h-screen w-full max-w-6xl items-stretch gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:py-12">
      <BrandPanel />

      <section className="flex animate-fade-in-up items-center justify-center">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-200/20 bg-gradient-to-br from-emerald-900 to-slate-900 text-sm font-bold text-amber-200">
              RG
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-slate-900">Riograndense · API</p>
              <p className="text-xs text-slate-500">Winthor + iSA</p>
            </div>
          </div>

          <div className="card-surface animate-fade-in p-6 sm:p-8">
            <header className="mb-6">
              <h1 className="text-2xl font-semibold text-slate-900">Entrar no portal</h1>
              <p className="mt-1 text-sm text-slate-500">
                Use as credenciais fornecidas pela Riograndense para consultar clientes.
              </p>
            </header>

            {notice ? (
              <div className="mb-4">
                <Alert variant="warning" onDismiss={dismissNotice}>
                  {notice}
                </Alert>
              </div>
            ) : null}

            {error ? (
              <div className="mb-4">
                <Alert variant="error" title="Falha no login">
                  {error}
                </Alert>
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label className={labelClass} htmlFor="usuario">
                  Usuário
                </label>
                <input
                  id="usuario"
                  name="usuario"
                  type="text"
                  autoComplete="username"
                  autoFocus
                  disabled={submitting}
                  value={usuario}
                  onChange={(event) => setUsuario(event.target.value)}
                  placeholder="usuario ou numdoc"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="senha">
                  Senha
                </label>
                <div className="relative">
                  <input
                    id="senha"
                    name="senha"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    disabled={submitting}
                    value={senha}
                    onChange={(event) => setSenha(event.target.value)}
                    placeholder="••••••••"
                    className={`${inputClass} pr-20`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute inset-y-0 right-2 my-auto h-8 rounded-lg px-3 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                  >
                    {showPassword ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-700 bg-emerald-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-black/20 transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? <Spinner className="h-4 w-4" label="Autenticando" /> : null}
                {submitting ? 'Autenticando…' : 'Entrar'}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-slate-500">
            <span className="font-mono">POST /auth/login</span> ·{' '}
            <span className="font-mono">GET /clients/situacao</span>
          </p>
        </div>
      </section>
    </div>
  )
}

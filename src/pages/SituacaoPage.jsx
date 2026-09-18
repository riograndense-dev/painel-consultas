import { useState } from 'react'
import { getClientSituacao } from '../api/clients'
import { Alert } from '../components/Alert'
import { Spinner } from '../components/Spinner'
import { StatusBadge } from '../components/StatusBadge'
import { useAuth } from '../context/auth-context'
import { getApiBaseUrl } from '../lib/config'
import {
  classifyStatus,
  documentoTipo,
  formatDataHora,
  formatDias,
  maskDocumento,
  onlyDigits,
  validateDocumento,
} from '../lib/format'
import { clearHistory, pushHistory, readHistory } from '../lib/history'

const DIAS_PADRAO = 30
const DIAS_OPCOES = [7, 15, 30, 60, 90, 180, 365]
const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:bg-slate-50'
const labelClass = 'mb-1.5 block text-sm font-medium text-slate-700'

function MetaItem({ label, value, mono = false }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2">
      <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</dt>
      <dd className={`mt-0.5 text-sm font-semibold text-slate-800 ${mono ? 'font-mono text-xs' : ''}`}>
        {value}
      </dd>
    </div>
  )
}

function PageHeader() {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-semibold tracking-wider text-blue-600 uppercase">
          Clientes · WinThor
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900 sm:text-3xl">
          Consulta de situação cadastral
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Informe o CPF ou CNPJ para verificar se o cliente existe na base e se possui compras na
          janela de dias escolhida.
        </p>
      </div>
      <span className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 font-mono text-xs text-slate-600 shadow-sm">
        GET /clients/situacao
      </span>
    </header>
  )
}

export function SituacaoPage() {
  const { token, handleUnauthorized } = useAuth()

  const [documento, setDocumento] = useState('')
  const [dias, setDias] = useState(String(DIAS_PADRAO))
  const [fieldError, setFieldError] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [showRaw, setShowRaw] = useState(false)
  const [historico, setHistorico] = useState(readHistory)

  const handleConsultar = async (event) => {
    event?.preventDefault()
    if (loading) return

    const problemaDocumento = validateDocumento(documento)
    if (problemaDocumento) {
      setFieldError(problemaDocumento)
      return
    }

    const janela = Number(dias)
    if (!Number.isInteger(janela) || janela < 1 || janela > 365) {
      setFieldError('A janela de dias deve ser um número entre 1 e 365.')
      return
    }

    setFieldError(null)
    setError(null)
    setLoading(true)
    const startedAt = performance.now()

    try {
      const data = await getClientSituacao({ documento, dias: janela, token })
      const statusInfo = classifyStatus(data?.status)
      const entry = {
        documento: maskDocumento(documento),
        documentoDigits: onlyDigits(documento),
        dias: janela,
        status: data?.status ?? null,
        nome: data?.nome ?? null,
        at: new Date().toISOString(),
      }

      setResult({
        ...entry,
        statusKey: statusInfo.key,
        statusLabel: statusInfo.label,
        statusDescription: statusInfo.description,
        horario: formatDataHora(new Date()),
        elapsedMs: Math.round(performance.now() - startedAt),
        raw: data,
      })
      setHistorico(pushHistory(entry))
    } catch (err) {
      if (err?.isUnauthorized) {
        handleUnauthorized()
        return
      }
      setError(err?.message ?? 'Falha ao consultar a situação do cliente.')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  const handleLimpar = () => {
    setDocumento('')
    setDias(String(DIAS_PADRAO))
    setFieldError(null)
    setError(null)
    setResult(null)
    setShowRaw(false)
  }

  const handleRepetir = (item) => {
    setDocumento(item.documento)
    setDias(String(item.dias))
    setFieldError(null)
  }

  const handleLimparHistorico = () => setHistorico(clearHistory())
  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <form onSubmit={handleConsultar} className="card-surface p-5 sm:p-6" noValidate>
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_9rem]">
              <div>
                <label className={labelClass} htmlFor="documento">
                  CPF / CNPJ
                </label>
                <input
                  id="documento"
                  name="documento"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  disabled={loading}
                  value={documento}
                  onChange={(event) => {
                    setDocumento(maskDocumento(event.target.value))
                    setFieldError(null)
                  }}
                  placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  className={inputClass}
                />
                <p className="mt-1.5 text-xs text-slate-500">
                  {documento
                    ? `${documentoTipo(documento)} · ${onlyDigits(documento).length} dígitos`
                    : 'Pode informar com ou sem pontuação.'}
                </p>
              </div>

              <div>
                <label className={labelClass} htmlFor="dias">
                  Janela (dias)
                </label>
                <input
                  id="dias"
                  name="dias"
                  type="number"
                  min="1"
                  max="365"
                  step="1"
                  disabled={loading}
                  value={dias}
                  onChange={(event) => {
                    setDias(event.target.value)
                    setFieldError(null)
                  }}
                  className={inputClass}
                />
                <p className="mt-1.5 text-xs text-slate-500">Máx. 365 dias.</p>
              </div>
            </div>

            

            {fieldError ? (
              <div className="mt-4">
                <Alert variant="warning">{fieldError}</Alert>
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:from-blue-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? <Spinner className="h-4 w-4" label="Consultando" /> : null}
                {loading ? 'Consultando…' : 'Consultar situação'}
              </button>
              <button
                type="button"
                onClick={handleLimpar}
                disabled={loading}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 disabled:opacity-60"
              >
                Limpar
              </button>
            </div>
          </form>

{error ? (
            <Alert variant="error" title="Não foi possível concluir a consulta">
              {error}
            </Alert>
          ) : null}

          {result ? (
            <section className="card-surface animate-fade-in-up overflow-hidden">
              <div
                className={`flex flex-wrap items-start justify-between gap-4 border-b px-5 py-4 sm:px-6 ${
                  result.statusKey === 'ativo'
                    ? 'border-emerald-100 bg-emerald-50/60'
                    : 'border-amber-100 bg-amber-50/60'
                }`}
              >
                <div className="space-y-2">
                  <StatusBadge statusKey={result.statusKey} label={result.statusLabel} />
                  <p className="text-lg font-semibold text-slate-900">
                    {result.nome ?? 'Nome não informado pela API'}
                  </p>
                  <p className="text-sm text-slate-600">{result.statusDescription}</p>
                </div>
                <p className="rounded-full bg-white/70 px-3 py-1 font-mono text-xs text-slate-500">
                  {result.elapsedMs} ms
                </p>
              </div>

              <dl className="grid gap-3 px-5 py-5 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
                <MetaItem label="Documento" value={result.documento} />
                <MetaItem label="Tipo" value={documentoTipo(result.documento)} />
                <MetaItem label="Janela consultada" value={formatDias(result.dias)} />
                <MetaItem label="Status retornado" value={result.status ?? '—'} />
                <MetaItem label="Consultado em" value={result.horario} />
                <MetaItem label="API" value={getApiBaseUrl()} mono />
              </dl>

              <div className="border-t border-slate-100 px-5 py-4 sm:px-6">
                <button
                  type="button"
                  onClick={() => setShowRaw((value) => !value)}
                  aria-expanded={showRaw}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-900"
                >
                  <svg
                    className={`h-4 w-4 transition ${showRaw ? 'rotate-90' : ''}`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M7.4 5.2 6.2 6.4l3.8 3.6-3.8 3.6 1.2 1.2 5-4.8-5-4.8Z" />
                  </svg>
                  {showRaw ? 'Ocultar resposta JSON' : 'Ver resposta JSON'}
                </button>

                {showRaw ? (
                  <pre className="mt-3 max-h-72 overflow-auto rounded-xl bg-slate-900 p-4 font-mono text-xs leading-relaxed text-slate-100">
                    {JSON.stringify(result.raw, null, 2)}
                  </pre>
                ) : null}
              </div>
            </section>
          ) : (
            <section className="card-surface flex items-center gap-4 px-5 py-6 sm:px-6">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M9 3a6 6 0 1 0 3.5 10.9l3.3 3.3 1.4-1.4-3.3-3.3A6 6 0 0 0 9 3Zm-4 6a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-800">Nenhuma consulta recente</p>
                <p className="text-sm text-slate-500">
                  Digite um CPF/CNPJ e clique em <span className="font-medium">Consultar situação</span>{' '}
                  para ver o resultado aqui.
                </p>
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <section className="card-surface p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-900">Consultas recentes</h2>
              {historico.length > 0 ? (
                <button
                  type="button"
                  onClick={handleLimparHistorico}
                  className="text-xs font-semibold text-slate-500 transition hover:text-rose-600"
                >
                  Limpar
                </button>
              ) : null}
            </div>

            {historico.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                O histórico é salvo apenas neste navegador.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {historico.map((item) => (
                  <li key={`${item.documentoDigits}-${item.at}`}>
                    <button
                      type="button"
                      onClick={() => handleRepetir(item)}
                      className="w-full rounded-xl border border-slate-100 bg-white px-3 py-2 text-left transition hover:border-blue-200 hover:bg-blue-50/60"
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-semibold text-slate-700">
                          {item.documento}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            classifyStatus(item.status).key === 'ativo'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {classifyStatus(item.status).key === 'ativo' ? 'ativo' : 'inativo'}
                        </span>
                      </span>
                      <span className="mt-1 block truncate text-xs text-slate-500">
                        {item.nome ?? 'Sem nome'} · {formatDias(item.dias)} ·{' '}
                        {new Date(item.at).toLocaleString('pt-BR')}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card-surface space-y-3 p-5">
            <h2 className="text-sm font-semibold text-slate-900">Como o status é calculado</h2>
            <p className="text-sm text-slate-500">
              Retorna <span className="font-semibold text-emerald-700">Ativo</span> quando o documento
              existe na base e o cliente possui compras nos últimos N dias.
            </p>
            <p className="text-sm text-slate-500">
              Caso contrário, retorna{' '}
              <span className="font-semibold text-amber-700">inativo ou não encontrado</span>.
            </p>
            <ul className="space-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
              <li>
                · <span className="font-mono">documento</span>: 11 a 20 caracteres (0-9 . - /)
              </li>
              <li>
                · <span className="font-mono">dias</span>: 1 a 365 (padrão 30)
              </li>
              <li>
                · Requer token Bearer obtido em <span className="font-mono">/auth/login</span>
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  )
}

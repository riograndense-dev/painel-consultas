import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, BarChart3, CheckCircle2, ChevronDown, CircleOff, FileQuestion, List, MapPinned, PackageOpen, Search, ShoppingBasket, Users } from 'lucide-react'
import { getClientSituacao, listClients } from '../api/clients'
import { Alert } from '../components/Alert'
import { ClientMap } from '../components/ClientMap'
import { CopyDocumentButton } from '../components/CopyDocumentButton'
import { Spinner } from '../components/Spinner'
import { useAuth } from '../context/auth-context'
import { classifyStatus, onlyDigits } from '../lib/format'

const PAGE_SIZE = 50
const DEFAULT_DAYS = 30
const fieldClass = 'wallet-field'
const VIEWS = ['lista', 'mapa', 'graficos']
const WalletCharts = lazy(() => import('../components/WalletCharts').then((module) => ({ default: module.WalletCharts })))

function currency(value) {
  if (value === null || value === undefined || value === '') return '—'
  const amount = Number(value)
  return Number.isFinite(amount)
    ? amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : '—'
}

function date(value) {
  if (!value) return '—'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleDateString('pt-BR')
}

function Stat({ label, value, tone = '', icon: Icon }) {
  return (
    <div className="wallet-stat">
      <span className="wallet-stat-label">{Icon ? <Icon size={15} aria-hidden="true" /> : null}{label}</span>
      <strong className={tone}>{value}</strong>
    </div>
  )
}

function Pagination({ page, loading, hasNext, onPrevious, onNext, top = false }) {
  return (
    <nav className={`wallet-pagination ${top ? 'wallet-pagination-top' : ''}`} aria-label={top ? 'Paginação superior' : 'Paginação inferior'}>
      <span>Página {page} · até {PAGE_SIZE} registros</span>
      <div>
        <button type="button" onClick={onPrevious} disabled={page <= 1 || loading}><ArrowLeft size={14} /> Anterior</button>
        <button type="button" onClick={onNext} disabled={loading || !hasNext}>Próxima <ArrowRight size={14} /></button>
      </div>
    </nav>
  )
}
function ClientStatus({ status }) {
  if (status) {
    const info = classifyStatus(status.status)
    return <span className={`wallet-status ${info.key}`}>{info.label}</span>
  }
  return <span className="wallet-status unavailable">Status indisponível</span>
}

export function SituacaoPage() {
  const { token, handleUnauthorized } = useAuth()
  const [filters, setFilters] = useState({ search: '', cidade: '', codusur: '' })
  const [submittedFilters, setSubmittedFilters] = useState(filters)
  const [daysInput, setDaysInput] = useState(String(DEFAULT_DAYS))
  const [appliedDays, setAppliedDays] = useState(DEFAULT_DAYS)
  const [page, setPage] = useState(1)
  const [clients, setClients] = useState([])
  const [statusByClient, setStatusByClient] = useState({})
  const [detailsByClient, setDetailsByClient] = useState({})
  const [busyDetails, setBusyDetails] = useState({})
  const [statusFilter, setStatusFilter] = useState('todos')
  const [activeView, setActiveView] = useState('lista')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)

  const loadClients = useCallback(async (signal) => {
    setLoading(true)
    setError(null)
    try {
      const result = await listClients({
        ...submittedFilters,
        codusur: submittedFilters.codusur ? Number(submittedFilters.codusur) : undefined,
        pagina: page,
        limite: PAGE_SIZE,
        dias: appliedDays,
        token,
        signal,
      })
      const clientList = Array.isArray(result) ? result : []
      setClients(clientList)
      setStatusByClient(Object.fromEntries(clientList.map((client) => [
        String(client.CODCLI),
        { status: client.status },
      ])))
    } catch (err) {
      if (err?.name === 'AbortError') return
      if (err?.isUnauthorized) handleUnauthorized()
      else setError(err?.message ?? 'Não foi possível carregar a carteira de clientes.')
      setClients([])
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [appliedDays, handleUnauthorized, page, submittedFilters, token])

  /* oxlint-disable react/set-state-in-effect -- The effect intentionally starts a remote request. */
  useEffect(() => {
    const controller = new AbortController()
    loadClients(controller.signal)
    return () => controller.abort()
  }, [loadClients])
  /* oxlint-enable react/set-state-in-effect */

  const loadClientDetails = async (client) => {
    const id = String(client.CODCLI)
    const document = onlyDigits(client.CGCENT)
    if (!document || detailsByClient[id] || busyDetails[id]) return
    setBusyDetails((current) => ({ ...current, [id]: true }))
    try {
      const result = await getClientSituacao({ documento: document, dias: appliedDays, token })
      setDetailsByClient((current) => ({ ...current, [id]: result }))
    } catch (err) {
      if (err?.isUnauthorized) handleUnauthorized()
      else setError(`Falha ao carregar detalhes de ${client.CLIENTE ?? `cliente ${id}`}: ${err?.message}`)
    } finally {
      setBusyDetails((current) => ({ ...current, [id]: false }))
    }
  }

  const toggleClient = (client) => {
    const id = String(client.CODCLI)
    const isSelected = selected === id
    setSelected(isSelected ? null : id)
    if (!isSelected) loadClientDetails(client)
  }

  const handleViewTabKeyDown = (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const currentIndex = VIEWS.indexOf(activeView)
    const direction = event.key === 'ArrowRight' ? 1 : -1
    const nextView = VIEWS[(currentIndex + direction + VIEWS.length) % VIEWS.length]
    setActiveView(nextView)
    document.getElementById(`${nextView}-tab`)?.focus()
  }

  const visibleClients = useMemo(() => clients.filter((client) => {
    if (statusFilter === 'todos') return true
    const result = statusByClient[String(client.CODCLI)]
    return classifyStatus(result?.status).key === statusFilter
  }), [clients, statusByClient, statusFilter])

  const stats = useMemo(() => {
    const statuses = clients.map((client) => statusByClient[String(client.CODCLI)]?.status)
    return {
      total: clients.length,
      active: statuses.filter((status) => status === 'ativo').length,
      inactive: statuses.filter((status) => status === 'inativo' || status === 'naoregistrado').length,
      pending: clients.filter((client) => !onlyDigits(client.CGCENT)).length,
    }
  }, [clients, statusByClient])

  const submitSearch = (event) => {
    event.preventDefault()
    const parsedDays = Number(daysInput)
    const nextDays = Number.isInteger(parsedDays) ? Math.max(1, Math.min(365, parsedDays)) : DEFAULT_DAYS
    setDaysInput(String(nextDays))
    setAppliedDays(nextDays)
    setPage(1)
    setSelected(null)
    setDetailsByClient({})
    setSubmittedFilters({ ...filters })
  }

  return (
    <div className="wallet-page animate-fade-in">
      <header className="wallet-heading">
        <div>
          <p className="wallet-eyebrow"><span className="wallet-sun" /> RIOGRANDENSE · WINTHOR</p>
          <h1>Carteira de clientes</h1>
          <p className="wallet-subtitle">Acompanhe a situação cadastral e as últimas movimentações da sua carteira.</p>
        </div>
        <div className="wallet-period"><span className="wallet-live-dot" /> Janela de atividade: {appliedDays} {appliedDays === 1 ? 'dia' : 'dias'}</div>
      </header>

      <section className="wallet-stats" aria-label="Resumo da carteira">
        <Stat label="Clientes nesta página" value={stats.total} icon={Users} />
        <Stat label="Clientes ativos" value={stats.active} tone="text-emerald-300" icon={CheckCircle2} />
        <Stat label="Clientes inativos" value={stats.inactive} tone="text-amber-300" icon={CircleOff} />
        <Stat label="Sem documento" value={stats.pending} icon={FileQuestion} />
      </section>

      <form className="wallet-search" onSubmit={submitSearch}>
        <label className="wallet-search-main">
          <span>Busca</span>
          <input className={fieldClass} value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="Nome, código ou CPF/CNPJ" />
        </label>
        <label>
          <span>Cidade</span>
          <input className={fieldClass} value={filters.cidade} onChange={(e) => setFilters({ ...filters, cidade: e.target.value })} placeholder="Filtrar município" />
        </label>
        <label>
          <span>Código do vendedor</span>
          <input className={fieldClass} type="number" min="1" value={filters.codusur} onChange={(e) => setFilters({ ...filters, codusur: e.target.value })} placeholder="Ex.: 12" />
        </label>
        <label>
          <span>Janela (1–365 dias)</span>
          <input className={fieldClass} type="number" min="1" max="365" required value={daysInput} onChange={(e) => setDaysInput(e.target.value)} />
        </label>
        <button className="wallet-primary" type="submit" disabled={loading}>{loading ? <Spinner label="Carregando" /> : <Search size={15} />} {loading ? 'Carregando…' : 'Buscar clientes'}</button>
      </form>

      <div className="wallet-view-tabs" role="tablist" aria-label="Visualização da carteira" onKeyDown={handleViewTabKeyDown}>
        <button id="lista-tab" type="button" role="tab" aria-selected={activeView === 'lista'} aria-controls="clients-panel" className={activeView === 'lista' ? 'active' : ''} onClick={() => setActiveView('lista')}><List size={15} /> Lista de clientes</button>
        <button id="map-tab" type="button" role="tab" aria-selected={activeView === 'mapa'} aria-controls="map-panel" className={activeView === 'mapa' ? 'active' : ''} onClick={() => setActiveView('mapa')}><MapPinned size={15} /> Mapa</button>
        <button id="graficos-tab" type="button" role="tab" aria-selected={activeView === 'graficos'} aria-controls="charts-panel" className={activeView === 'graficos' ? 'active' : ''} onClick={() => setActiveView('graficos')}><BarChart3 size={15} /> Gráficos</button>
      </div>

      <div id="map-panel" role="tabpanel" aria-labelledby="map-tab" hidden={activeView !== 'mapa'}>
        {activeView === 'mapa' ? (
          <ClientMap
            key={`${submittedFilters.search}|${submittedFilters.cidade}|${submittedFilters.codusur}|${appliedDays}`}
            token={token}
            filters={submittedFilters}
            days={appliedDays}
            onUnauthorized={handleUnauthorized}
          />
        ) : null}
      </div>
      <div id="charts-panel" role="tabpanel" aria-labelledby="graficos-tab" hidden={activeView !== 'graficos'}>
        {activeView === 'graficos' ? loading ? (
          <div className="wallet-loading"><Spinner label="Carregando gráficos" /> Carregando dados dos gráficos…</div>
        ) : clients.length ? (
          <Suspense fallback={<div className="wallet-chart-loading">Carregando gráficos…</div>}>
            <WalletCharts clients={clients} statusByClient={statusByClient} />
          </Suspense>
        ) : (
          <div className="wallet-empty"><BarChart3 size={28} aria-hidden="true" /><strong>Sem dados para os gráficos</strong><p>Ajuste os filtros e tente novamente.</p></div>
        ) : null}
      </div>
      <div id="clients-panel" role="tabpanel" aria-labelledby="lista-tab" hidden={activeView !== 'lista'}>
      <div className="wallet-list-head">
        <div>
          <h2>Clientes</h2>
          <p>O status acompanha cada cliente; expanda um registro para ver mais detalhes.</p>
        </div>
        <div className="wallet-list-actions">
          <label className="wallet-status-filter"><span>Status</span>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="todos">Todos</option><option value="ativo">Ativos</option><option value="inativo">Inativos</option>
            </select>
          </label>
        </div>
      </div>

      <Pagination
        page={page}
        loading={loading}
        hasNext={clients.length === PAGE_SIZE}
        onPrevious={() => setPage((value) => Math.max(1, value - 1))}
        onNext={() => setPage((value) => value + 1)}
        top
      />

      {error ? <div className="wallet-alert"><Alert variant="error" title="Não foi possível concluir">{error}</Alert></div> : null}

      {loading ? <div className="wallet-loading"><Spinner label="Carregando clientes" /> Carregando carteira…</div> : visibleClients.length === 0 ? (
        <div className="wallet-empty"><span aria-hidden="true">⌕</span><strong>Nenhum cliente encontrado</strong><p>Ajuste os filtros e tente novamente.</p></div>
      ) : (
        <div className="wallet-client-list">
          {visibleClients.map((client) => {
            const id = String(client.CODCLI)
            const status = statusByClient[id]
            const details = detailsByClient[id]
            const isSelected = selected === id
            return (
              <article className={`wallet-client ${isSelected ? 'selected' : ''}`} key={id}>
                <div
                  className="wallet-client-main"
                  onClick={() => toggleClient(client)}
                >
                  <span className="wallet-avatar">{String(client.CLIENTE ?? 'C').trim().slice(0, 1).toUpperCase()}</span>
                  <span className="wallet-client-name"><strong>{client.CLIENTE ?? 'Cliente sem nome'}</strong><small>#{client.CODCLI} <i>·</i> {client.MUNICENT || 'Cidade não informada'}</small></span>
                  <span className="wallet-client-contact">
                    <small>CPF / CNPJ</small>
                    <span className="wallet-document-value"><strong>{client.CGCENT || 'Não informado'}</strong><CopyDocumentButton document={client.CGCENT} /></span>
                  </span>
                  <span className="wallet-client-credit"><small>Limite de crédito</small><strong>{currency(client.LIMCRED)}</strong></span>
                  <span className="wallet-client-state"><ClientStatus status={status} /></span>
                  <button
                    className={`wallet-chevron ${isSelected ? 'open' : ''}`}
                    type="button"
                    aria-label={isSelected ? `Recolher detalhes de ${client.CLIENTE ?? `cliente ${id}`}` : `Expandir detalhes de ${client.CLIENTE ?? `cliente ${id}`}`}
                    aria-expanded={isSelected}
                    aria-controls={`client-details-${id}`}
                  ><ChevronDown size={17} aria-hidden="true" /></button>
                </div>
                <div className="wallet-detail" id={`client-details-${id}`} hidden={!isSelected}>
                    <div><small>Endereço</small><strong>{client.ENDERENT || details?.endereco || 'Não informado'}{client.MUNICENT ? `, ${client.MUNICENT}` : ''}</strong></div>
                    <div><small>Telefone</small><strong>{client.TELENT || details?.telefone || 'Não informado'}</strong></div>
                    <div><small>Vendedor</small><strong>{details?.vendedor?.nome ? `${details.vendedor.nome} · #${details.vendedor.codusur}` : busyDetails[id] ? 'Carregando detalhes…' : 'Não informado'}</strong></div>
                    <div><small>Última compra</small><strong>{details?.ultima_compra ? `${date(details.ultima_compra.data)} · ${currency(details.ultima_compra.valor_total)}` : busyDetails[id] ? 'Carregando detalhes…' : 'Não informado'}</strong></div>
                    {client.OBS ? <div className="wallet-observation"><small>Observações</small><strong>{client.OBS}</strong></div> : null}
                    {details?.ultima_compra ? (
                      <div className="wallet-products">
                        <div className="wallet-products-heading">
                          <small><ShoppingBasket size={15} aria-hidden="true" /> Itens da última compra</small>
                          <span>{details.ultima_compra.itens?.length ?? 0} produto(s)</span>
                        </div>
                        {details.ultima_compra.itens?.length ? (
                          <div className="wallet-product-grid">
                            {details.ultima_compra.itens.map((item, index) => {
                              const quantity = item.quantidade === null || item.quantidade === undefined
                                ? null
                                : Number(item.quantidade).toLocaleString('pt-BR', { maximumFractionDigits: 3 })
                              return (
                                <div className="wallet-product-card" key={`${item.codigo_produto ?? item.descricao ?? 'item'}-${index}`}>
                                  <div className="wallet-product-image">
                                    {item.codigo_produto ? <span className="wallet-product-code">#{item.codigo_produto}</span> : null}
                                    {item.imagem ? <img src={item.imagem} alt={item.descricao ?? 'Produto comprado'} loading="lazy" /> : <span className="wallet-product-image-empty"><PackageOpen size={24} /><small>Sem imagem</small></span>}
                                  </div>
                                  <div className="wallet-product-info">
                                    <strong>{item.descricao ?? `Produto ${index + 1}`}</strong>
                                    <span className="wallet-product-package">{item.embalagem || item.unidade || 'Embalagem não informada'}</span>
                                    <div className="wallet-product-metrics">
                                      <span><small>Quantidade</small><strong>{quantity !== null ? `${quantity} ${item.unidade || 'un.'}` : '—'}</strong></span>
                                      <span><small>Preço unit.</small><strong>{currency(item.preco_unitario)}</strong></span>
                                      <span><small>Total</small><strong>{currency(item.valor)}</strong></span>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        ) : <p className="wallet-products-empty">A API não retornou produtos para esta compra.</p>}
                      </div>
                    ) : null}
                </div>
              </article>
            )
          })}
      </div>
      )}

      <Pagination
        page={page}
        loading={loading}
        hasNext={clients.length === PAGE_SIZE}
        onPrevious={() => setPage((value) => Math.max(1, value - 1))}
        onNext={() => setPage((value) => value + 1)}
      />
        </div>
    </div>
  )
}

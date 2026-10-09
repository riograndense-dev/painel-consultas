import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, CalendarClock, ChevronDown, Clock3, MapPin, PackageOpen, Search, ShieldAlert, ShoppingBasket, Users } from 'lucide-react'
import { getClientSituacao, listInactiveClients } from '../api/clients'
import { Alert } from '../components/Alert'
import { CopyDocumentButton } from '../components/CopyDocumentButton'
import { Spinner } from '../components/Spinner'
import { useAuth } from '../context/auth-context'

const DEFAULT_DAYS = 30
const PAGE_SIZE = 20
const fieldClass = 'wallet-field'

function parseApiDate(value) {
  if (!value) return null
  const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatDate(value) {
  const parsed = parseApiDate(value)
  return parsed ? parsed.toLocaleDateString('pt-BR') : '—'
}

function daysSince(value) {
  const parsed = parseApiDate(value)
  if (!parsed) return null
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  return Math.max(0, Math.floor((today.getTime() - parsed.getTime()) / 86400000))
}

function recencyLabel(value) {
  const elapsed = daysSince(value)
  if (elapsed === null) return 'Data não informada'
  if (elapsed === 0) return 'Inativou hoje'
  if (elapsed === 1) return 'Inativou ontem'
  return `Inativou há ${elapsed} dias`
}

function currency(value) {
  if (value === null || value === undefined || value === '') return '—'
  const amount = Number(value)
  return Number.isFinite(amount)
    ? amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : '—'
}

function embeddedSeller(client) {
  const seller = client?.vendedor
  if (!seller) return null
  if (typeof seller === 'string') return { nome: seller }
  return seller
}

function Stat({ icon: Icon, label, value, tone = '' }) {
  return (
    <div className="wallet-stat">
      <span className="wallet-stat-label"><Icon size={15} aria-hidden="true" />{label}</span>
      <strong className={tone}>{value}</strong>
    </div>
  )
}

function UpdatesPagination({ page, totalPages, total, loading, onPrevious, onNext }) {
  if (totalPages <= 1) return null
  return (
    <nav className="wallet-pagination updates-pagination" aria-label="Paginação das atualizações">
      <span>Página {page} de {totalPages} · {total} registros</span>
      <div>
        <button type="button" onClick={onPrevious} disabled={page <= 1 || loading}><ArrowLeft size={14} /> Anterior</button>
        <button type="button" onClick={onNext} disabled={page >= totalPages || loading}>Próxima <ArrowRight size={14} /></button>
      </div>
    </nav>
  )
}

export function AtualizacoesPage() {
  const { token, handleUnauthorized } = useAuth()
  const [filters, setFilters] = useState({ cnpj: '', cidade: '', codusur: '' })
  const [submittedFilters, setSubmittedFilters] = useState(filters)
  const [daysInput, setDaysInput] = useState(String(DEFAULT_DAYS))
  const [appliedDays, setAppliedDays] = useState(DEFAULT_DAYS)
  const [clients, setClients] = useState([])
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 })
  const [sellersByClient, setSellersByClient] = useState({})
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadInactiveClients = useCallback(async (signal) => {
    setLoading(true)
    setError(null)
    try {
      const result = await listInactiveClients({
        ...submittedFilters,
        codusur: submittedFilters.codusur ? Number(submittedFilters.codusur) : undefined,
        dias: appliedDays,
        pagina: page,
        limite: PAGE_SIZE,
        incluirUltimaCompra: true,
        token,
        signal,
      })
      const isLegacyResponse = Array.isArray(result)
      const allItems = isLegacyResponse ? result : (Array.isArray(result?.items) ? result.items : [])
      const list = isLegacyResponse
        ? allItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
        : allItems
      const total = isLegacyResponse ? allItems.length : Math.max(0, Number(result?.total) || 0)
      const totalPages = isLegacyResponse
        ? Math.ceil(total / PAGE_SIZE)
        : Math.max(0, Number(result?.total_paginas) || 0)

      setClients(list)
      setSellersByClient(Object.fromEntries(list.flatMap((client) => {
        const id = String(client.CODCLI)
        const seller = embeddedSeller(client)
        if (seller) return [[id, seller]]
        return client.CGCENT ? [] : [[id, null]]
      })))
      setPagination({ total, totalPages })
      setSelected(null)
    } catch (err) {
      if (err?.name === 'AbortError') return
      if (err?.isUnauthorized) handleUnauthorized()
      else setError(err?.message ?? 'Não foi possível carregar as atualizações.')
      setClients([])
      setSellersByClient({})
      setPagination({ total: 0, totalPages: 0 })
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [appliedDays, handleUnauthorized, page, submittedFilters, token])

  /* oxlint-disable react/set-state-in-effect -- The effect intentionally starts a remote request. */
  useEffect(() => {
    const controller = new AbortController()
    loadInactiveClients(controller.signal)
    return () => controller.abort()
  }, [loadInactiveClients])
  /* oxlint-enable react/set-state-in-effect */

  /* oxlint-disable react/set-state-in-effect -- Seller data is loaded from the API for the current page. */
  useEffect(() => {
    const clientsWithoutSeller = clients.filter((client) => client.CGCENT && !embeddedSeller(client))
    if (clientsWithoutSeller.length === 0) return undefined

    const controller = new AbortController()
    let unauthorized = false

    Promise.all(clientsWithoutSeller.map(async (client) => {
      try {
        const result = await getClientSituacao({
          documento: client.CGCENT,
          dias: appliedDays,
          token,
          signal: controller.signal,
        })
        return [String(client.CODCLI), result?.vendedor ?? null]
      } catch (err) {
        if (err?.name === 'AbortError') return null
        if (err?.isUnauthorized) unauthorized = true
        return [String(client.CODCLI), null]
      }
    })).then((entries) => {
      if (controller.signal.aborted) return
      setSellersByClient((current) => ({
        ...current,
        ...Object.fromEntries(entries.filter(Boolean)),
      }))
      if (unauthorized) handleUnauthorized()
    })

    return () => controller.abort()
  }, [appliedDays, clients, handleUnauthorized, token])
  /* oxlint-enable react/set-state-in-effect */

  const stats = useMemo(() => {
    const elapsed = clients.map((client) => daysSince(client.data_inativacao))
    return {
      sevenDays: elapsed.filter((days) => days !== null && days <= 7).length,
      thirtyDays: elapsed.filter((days) => days !== null && days <= 30).length,
      cities: new Set(clients.map((client) => client.MUNICENT).filter(Boolean)).size,
    }
  }, [clients])

  const togglePurchase = (client) => {
    const id = String(client.CODCLI)
    setSelected((current) => current === id ? null : id)
  }

  const submitSearch = (event) => {
    event.preventDefault()
    const parsedDays = Number(daysInput)
    const nextDays = Number.isInteger(parsedDays) ? Math.max(1, Math.min(365, parsedDays)) : DEFAULT_DAYS
    setDaysInput(String(nextDays))
    setAppliedDays(nextDays)
    setPage(1)
    setSelected(null)
    setSubmittedFilters({ ...filters })
  }

  return (
    <div className="wallet-page updates-page animate-fade-in">
      <header className="wallet-heading">
        <div>
          <p className="wallet-eyebrow"><span className="wallet-sun" /> ATUALIZAÇÕES · WINTHOR</p>
          <h1>Clientes inativados</h1>
          <p className="wallet-subtitle">Veja quem saiu da janela de atividade, começando pelas inativações mais recentes.</p>
        </div>
        <div className="wallet-period"><Clock3 size={14} aria-hidden="true" /> Janela de atividade: {appliedDays} {appliedDays === 1 ? 'dia' : 'dias'}</div>
      </header>

      <section className="wallet-stats" aria-label="Resumo das atualizações">
        <Stat label="Total de inativados" value={pagination.total} icon={Users} />
        <Stat label="Últimos 7 dias nesta página" value={stats.sevenDays} tone="text-amber-300" icon={ShieldAlert} />
        <Stat label="Últimos 30 dias nesta página" value={stats.thirtyDays} icon={CalendarClock} />
        <Stat label="Cidades nesta página" value={stats.cities} icon={MapPin} />
      </section>

      <form className="wallet-search updates-search" onSubmit={submitSearch}>
        <label className="wallet-search-main">
          <span>CPF / CNPJ</span>
          <input className={fieldClass} inputMode="numeric" value={filters.cnpj} onChange={(event) => setFilters({ ...filters, cnpj: event.target.value })} placeholder="Com ou sem pontuação" />
        </label>
        <label>
          <span>Cidade</span>
          <input className={fieldClass} value={filters.cidade} onChange={(event) => setFilters({ ...filters, cidade: event.target.value })} placeholder="Início do município" />
        </label>
        <label>
          <span>Código do vendedor</span>
          <input className={fieldClass} type="number" min="1" value={filters.codusur} onChange={(event) => setFilters({ ...filters, codusur: event.target.value })} placeholder="Ex.: 12" />
        </label>
        <label>
          <span>Janela (1–365 dias)</span>
          <input className={fieldClass} type="number" min="1" max="365" required value={daysInput} onChange={(event) => setDaysInput(event.target.value)} />
        </label>
        <button className="wallet-primary" type="submit" disabled={loading}>{loading ? <Spinner label="Carregando" /> : <Search size={15} />} {loading ? 'Carregando…' : 'Filtrar'}</button>
      </form>

      {error ? <div className="wallet-alert"><Alert variant="error" title="Não foi possível concluir">{error}</Alert></div> : null}

      <div className="updates-list-head">
        <div><h2>Linha do tempo</h2><p>A data de inativação considera a janela de {appliedDays} {appliedDays === 1 ? 'dia' : 'dias'} após a última compra válida.</p></div>
        {!loading ? <span>{pagination.total} {pagination.total === 1 ? 'cliente' : 'clientes'}</span> : null}
      </div>

      <UpdatesPagination
        page={page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        loading={loading}
        onPrevious={() => setPage((current) => Math.max(1, current - 1))}
        onNext={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
      />

      {loading ? (
        <div className="wallet-loading"><Spinner label="Carregando atualizações" /> Carregando atualizações…</div>
      ) : clients.length === 0 ? (
        <div className="wallet-empty"><CalendarClock size={28} aria-hidden="true" /><strong>Nenhuma inativação encontrada</strong><p>Ajuste os filtros e tente novamente.</p></div>
      ) : (
        <div className="updates-list">
          {clients.map((client, index) => {
            const absoluteIndex = (page - 1) * PAGE_SIZE + index
            const elapsed = daysSince(client.data_inativacao)
            const emphasis = elapsed === 0 ? 'today' : elapsed === 1 ? 'yesterday' : absoluteIndex < 4 ? 'recent' : ''
            const id = String(client.CODCLI)
            const isSelected = selected === id
            const purchase = client.ultima_compra
            const seller = embeddedSeller(client) ?? sellersByClient[id]
            const sellerName = seller?.nome ?? seller?.NOME
            const sellerLoading = client.CGCENT && !embeddedSeller(client) && sellersByClient[id] === undefined
            return (
              <article className={`update-card ${emphasis}`} key={client.CODCLI}>
                <div className="update-timeline" aria-hidden="true"><span>{absoluteIndex + 1}</span></div>
                <div className="update-card-body">
                  <header>
                    <div>
                      <span className="update-recency">{elapsed === 0 ? 'Atenção · ' : elapsed === 1 ? 'Recente · ' : ''}{recencyLabel(client.data_inativacao)}</span>
                      <h2>{client.CLIENTE || 'Cliente sem nome'}</h2>
                      <p>
                        Cliente #{client.CODCLI} · {client.MUNICENT || 'Cidade não informada'} · Vendedor:{' '}
                        {sellerLoading ? 'carregando…' : (sellerName || 'não informado')}
                      </p>
                    </div>
                    <div className="update-card-actions">
                      <time dateTime={client.data_inativacao}>Inativou em <strong>{formatDate(client.data_inativacao)}</strong></time>
                      <button type="button" onClick={() => togglePurchase(client)} aria-expanded={isSelected} aria-controls={`update-purchase-${id}`}>
                        <ShoppingBasket size={14} aria-hidden="true" />
                        Última compra
                        <ChevronDown className={isSelected ? 'open' : ''} size={14} aria-hidden="true" />
                      </button>
                    </div>
                  </header>
                  <dl>
                    <div><dt>CPF / CNPJ</dt><dd><span>{client.CGCENT || 'Não informado'}</span><CopyDocumentButton document={client.CGCENT} /></dd></div>
                    <div><dt>Última compra válida</dt><dd>{formatDate(client.data_ultima_compra)}</dd></div>
                    <div><dt>Dias sem comprar</dt><dd>{client.dias_inativo} dias</dd></div>
                    <div><dt>Telefone</dt><dd>{client.TELENT || 'Não informado'}</dd></div>
                  </dl>
                  <section className="update-purchase" id={`update-purchase-${id}`} hidden={!isSelected}>
                    {purchase ? (
                      <>
                        <div className="update-purchase-summary">
                          <div><small>Pedido</small><strong>{purchase.numped ? `#${purchase.numped}` : 'Não informado'}</strong></div>
                          <div><small>Data</small><strong>{formatDate(purchase.data)}</strong></div>
                          <div><small>Valor total</small><strong>{currency(purchase.valor_total)}</strong></div>
                          <div><small>Filial</small><strong>{purchase.filial ?? 'Não informada'}</strong></div>
                        </div>
                        <div className="wallet-products">
                          <div className="wallet-products-heading">
                            <small><ShoppingBasket size={15} aria-hidden="true" /> Itens da última compra</small>
                            <span>{purchase.itens?.length ?? 0} produto(s)</span>
                          </div>
                          {purchase.itens?.length ? (
                            <div className="wallet-product-grid">
                              {purchase.itens.map((item, itemIndex) => {
                                const quantity = item.quantidade === null || item.quantidade === undefined
                                  ? null
                                  : Number(item.quantidade).toLocaleString('pt-BR', { maximumFractionDigits: 3 })
                                return (
                                  <div className="wallet-product-card" key={`${item.codigo_produto ?? item.descricao ?? 'item'}-${itemIndex}`}>
                                    <div className="wallet-product-image">
                                      {item.codigo_produto ? <span className="wallet-product-code">#{item.codigo_produto}</span> : null}
                                      {item.imagem ? <img src={item.imagem} alt={item.descricao ?? 'Produto comprado'} loading="lazy" /> : <span className="wallet-product-image-empty"><PackageOpen size={24} /><small>Sem imagem</small></span>}
                                    </div>
                                    <div className="wallet-product-info">
                                      <strong>{item.descricao ?? `Produto ${itemIndex + 1}`}</strong>
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
                      </>
                    ) : (
                      <p className="update-purchase-empty">Não foi possível localizar uma última compra válida para este cliente.</p>
                    )}
                  </section>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <UpdatesPagination
        page={page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        loading={loading}
        onPrevious={() => setPage((current) => Math.max(1, current - 1))}
        onNext={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
      />
    </div>
  )
}

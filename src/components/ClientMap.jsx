import { useEffect, useMemo, useRef, useState } from 'react'
import { Building2, LocateFixed, MapPin, MousePointerClick, Route, Search, UsersRound, X, ZoomIn, ZoomOut } from 'lucide-react'
import { listMapCities, listMapPracas } from '../api/clients'

const HEIGHT = 500
const TILE = 256
const MIN_ZOOM = 5
const MAX_ZOOM = 14

function project({ lat, lon }, zoom) {
  const scale = TILE * 2 ** zoom
  const boundedLat = Math.max(-85.0511, Math.min(85.0511, lat))
  const sin = Math.sin((boundedLat * Math.PI) / 180)
  return {
    x: ((lon + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  }
}

function unproject({ x, y }, zoom) {
  const scale = TILE * 2 ** zoom
  const normalizedY = 0.5 - y / scale
  return {
    lon: (x / scale) * 360 - 180,
    lat: 90 - (360 * Math.atan(Math.exp(-normalizedY * 2 * Math.PI))) / Math.PI,
  }
}

function fitLocations(locations, size) {
  if (!locations.length) return { center: { lat: -30.05, lon: -53.2 }, zoom: 6 }

  const lats = locations.map(({ lat }) => lat)
  const lons = locations.map(({ lon }) => lon)
  const center = {
    lat: (Math.min(...lats) + Math.max(...lats)) / 2,
    lon: (Math.min(...lons) + Math.max(...lons)) / 2,
  }

  if (locations.length === 1) return { center, zoom: 11 }

  for (let zoom = MAX_ZOOM; zoom >= MIN_ZOOM; zoom -= 1) {
    const points = locations.map((location) => project(location, zoom))
    const width = Math.max(...points.map(({ x }) => x)) - Math.min(...points.map(({ x }) => x))
    const height = Math.max(...points.map(({ y }) => y)) - Math.min(...points.map(({ y }) => y))
    if (width <= Math.max(100, size.width - 120) && height <= Math.max(100, size.height - 120)) {
      return { center, zoom }
    }
  }

  return { center, zoom: MIN_ZOOM }
}

function routeColors(routes) {
  return new Map(routes.map((route, index) => [
    String(route),
    `hsl(${(index * 137.508 + 105) % 360} 62% 39%)`,
  ]))
}

function MapCanvas({ locations, selectedId, onSelect }) {
  const viewportRef = useRef(null)
  const canvasRef = useRef(null)
  const dragRef = useRef(null)
  const interactiveRef = useRef(false)
  const [size, setSize] = useState({ width: 760, height: HEIGHT })
  const [view, setView] = useState({ center: { lat: -30.05, lon: -53.2 }, zoom: 6 })
  const [isInteractive, setIsInteractive] = useState(false)
  const locationKey = locations.map(({ id, lat, lon }) => `${id}:${lat}:${lon}`).join('|')

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return undefined
    const resize = () => {
      const width = viewport.clientWidth
      setSize({ width, height: Math.max(340, Math.min(HEIGHT, Math.round(width * 0.58))) })
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    // O enquadramento precisa acompanhar os pontos retornados e o tamanho real do contêiner.
    // oxlint-disable-next-line react/set-state-in-effect
    setView(fitLocations(locations, size))
  }, [locationKey, locations, size])

  const { tiles, markers } = useMemo(() => {
    const center = project(view.center, view.zoom)
    const left = center.x - size.width / 2
    const top = center.y - size.height / 2
    const tileCount = 2 ** view.zoom
    const minTileX = Math.floor(left / TILE)
    const minTileY = Math.max(0, Math.floor(top / TILE))
    const maxTileX = Math.floor((left + size.width) / TILE)
    const maxTileY = Math.min(tileCount - 1, Math.floor((top + size.height) / TILE))
    const tileList = []

    for (let x = minTileX; x <= maxTileX; x += 1) {
      for (let y = minTileY; y <= maxTileY; y += 1) {
        const wrappedX = ((x % tileCount) + tileCount) % tileCount
        tileList.push({
          key: `${view.zoom}-${x}-${y}`,
          x: x * TILE - left,
          y: y * TILE - top,
          url: `https://tile.openstreetmap.org/${view.zoom}/${wrappedX}/${y}.png`,
        })
      }
    }

    return {
      tiles: tileList,
      markers: locations.map((location) => {
        const point = project(location, view.zoom)
        return { ...location, x: point.x - left, y: point.y - top }
      }),
    }
  }, [locations, size, view])

  const selected = locations.find(({ id }) => id === selectedId)

  const handlePointerDown = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    event.currentTarget.focus({ preventScroll: true })
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      moved: false,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const deltaX = event.clientX - drag.x
    const deltaY = event.clientY - drag.y
    if (Math.abs(deltaX) + Math.abs(deltaY) > 2) drag.moved = true
    drag.x = event.clientX
    drag.y = event.clientY
    setView((current) => {
      const center = project(current.center, current.zoom)
      return {
        ...current,
        center: unproject({ x: center.x - deltaX, y: center.y - deltaY }, current.zoom),
      }
    })
  }

  const stopDragging = () => {
    window.setTimeout(() => { dragRef.current = null }, 0)
  }

  const changeZoom = (delta) => {
    setView((current) => ({
      ...current,
      zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, current.zoom + delta)),
    }))
  }

  const handleKeyDown = (event) => {
    if (!event.ctrlKey && !event.metaKey) return
    if (event.key === '+' || event.key === '=' || event.code === 'NumpadAdd') {
      event.preventDefault()
      changeZoom(1)
    } else if (event.key === '-' || event.key === '_' || event.code === 'NumpadSubtract') {
      event.preventDefault()
      changeZoom(-1)
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    let lastZoomAt = 0
    const handleWheel = (event) => {
      if (!interactiveRef.current) return
      event.preventDefault()
      const now = performance.now()
      if (now - lastZoomAt < 120) return
      lastZoomAt = now
      const delta = event.deltaY < 0 ? 1 : -1
      setView((current) => ({
        ...current,
        zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, current.zoom + delta)),
      }))
    }
    canvas.addEventListener('wheel', handleWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', handleWheel)
  }, [])

  const handleCanvasClick = (event) => {
    if (dragRef.current?.moved) return
    if (!event.target.closest('.wallet-map-marker, .wallet-map-popup, .wallet-map-controls')) onSelect(null)
  }

  return (
    <div className="wallet-map-viewport" ref={viewportRef}>
      <div
        ref={canvasRef}
        className={`wallet-map-canvas ${isInteractive ? 'interactive' : ''}`}
        style={{ height: size.height }}
        onClick={handleCanvasClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          interactiveRef.current = true
          setIsInteractive(true)
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            interactiveRef.current = false
            setIsInteractive(false)
          }
        }}
        tabIndex="0"
        role="application"
        aria-label="Mapa interativo. Clique para ativar, arraste para mover e use a roda do mouse para alterar o zoom."
      >
        {tiles.map((tile) => (
          <img
            className="wallet-map-tile"
            key={tile.key}
            src={tile.url}
            alt=""
            draggable="false"
            style={{ left: tile.x, top: tile.y }}
          />
        ))}
        {markers.map((marker) => (
          <button
            className={`wallet-map-marker ${selectedId === marker.id ? 'selected' : ''}`}
            key={marker.id}
            type="button"
            style={{ left: marker.x, top: marker.y, '--marker-color': marker.color }}
            title={`${marker.name}: ${marker.count} cliente${marker.count === 1 ? '' : 's'}`}
            aria-label={`${marker.name}, ${marker.count} cliente${marker.count === 1 ? '' : 's'}${marker.route === null ? '' : `, rota ${marker.route}`}`}
            aria-pressed={selectedId === marker.id}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation()
              onSelect(selectedId === marker.id ? null : marker.id)
            }}
          >
            <span>{marker.count}</span>
            {view.zoom >= 8 || selectedId === marker.id ? <small>{marker.name}</small> : null}
          </button>
        ))}

        {selected ? (
          <aside className="wallet-map-popup" aria-live="polite" onPointerDown={(event) => event.stopPropagation()}>
            <button type="button" aria-label="Fechar detalhes" onClick={() => onSelect(null)}><X size={15} /></button>
            <span>{selected.kind === 'praca' ? 'Praça selecionada' : 'Cidade selecionada'}</span>
            <strong>{selected.name}</strong>
            <dl>
              {selected.code ? <><dt>Código</dt><dd>#{selected.code}</dd></> : null}
              {selected.kind === 'praca' ? <><dt>Rota</dt><dd>{selected.route === null ? 'Sem rota' : selected.route}</dd></> : null}
              <dt>Clientes</dt><dd>{selected.count}</dd>
              <dt>Ativos</dt><dd>{selected.active ?? 'Aguardando API'}</dd>
              <dt>Inativos</dt><dd>{selected.inactive ?? 'Aguardando API'}</dd>
            </dl>
          </aside>
        ) : null}

        {!isInteractive ? <div className="wallet-map-activation"><MousePointerClick size={17} /> Clique no mapa para interagir</div> : null}

        <div className="wallet-map-controls" aria-label="Controles do mapa" onPointerDown={(event) => event.stopPropagation()}>
          <button type="button" onClick={() => changeZoom(1)} disabled={view.zoom >= MAX_ZOOM} aria-label="Aumentar zoom" title="Aumentar zoom"><ZoomIn size={17} /></button>
          <button type="button" onClick={() => changeZoom(-1)} disabled={view.zoom <= MIN_ZOOM} aria-label="Diminuir zoom" title="Diminuir zoom"><ZoomOut size={17} /></button>
          <button type="button" className="wallet-map-fit" onClick={() => setView(fitLocations(locations, size))} aria-label="Enquadrar todos os pontos" title="Enquadrar todos os pontos"><LocateFixed size={17} /></button>
        </div>
      </div>
      <a className="wallet-map-attribution" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a>
    </div>
  )
}

function validCoordinate(latitude, longitude) {
  if (latitude === null || latitude === undefined || latitude === '') return false
  if (longitude === null || longitude === undefined || longitude === '') return false
  return Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude))
}

function readStatusCount(item, kind) {
  const keys = kind === 'active'
    ? ['quantidade_clientes_ativos', 'quantidade_ativos', 'clientes_ativos']
    : ['quantidade_clientes_inativos', 'quantidade_inativos', 'clientes_inativos']
  const value = keys.map((key) => item?.[key]).find((candidate) => candidate !== null && candidate !== undefined)
  return Number.isFinite(Number(value)) ? Number(value) : null
}

export function ClientMap({ token, filters, days, onUnauthorized }) {
  const [mode, setMode] = useState('pracas')
  const [query, setQuery] = useState('')
  const [route, setRoute] = useState('all')
  const [pracas, setPracas] = useState([])
  const [cities, setCities] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const codusur = filters?.codusur ? Number(filters.codusur) : undefined
  const cidade = filters?.cidade || undefined
  const generalSearch = filters?.search?.trim() || undefined

  useEffect(() => {
    const controller = new AbortController()
    let active = true

    Promise.allSettled([
      listMapPracas({ search: generalSearch, cidade, codusur, dias: days, token, signal: controller.signal }),
      listMapCities({ search: generalSearch || cidade, codusur, dias: days, token, signal: controller.signal }),
    ]).then(([pracasResult, citiesResult]) => {
      if (!active) return
      if (pracasResult.status === 'fulfilled') setPracas(Array.isArray(pracasResult.value) ? pracasResult.value : [])
      if (citiesResult.status === 'fulfilled') setCities(Array.isArray(citiesResult.value) ? citiesResult.value : [])

      const unauthorized = [pracasResult, citiesResult].some((result) => result.status === 'rejected' && result.reason?.isUnauthorized)
      if (unauthorized) onUnauthorized?.()
      else if (pracasResult.status === 'rejected' && citiesResult.status === 'rejected') {
        const reason = pracasResult.reason
        if (reason?.name !== 'AbortError') setError(reason?.message ?? 'Não foi possível carregar os dados do mapa.')
      } else if (pracasResult.status === 'rejected') {
        setError('A visão por praças está indisponível; a visão por cidades continua acessível.')
        setMode('cidades')
      } else if (citiesResult.status === 'rejected') {
        setError('A visão por cidades está indisponível; exibindo as praças.')
      }
    }).finally(() => {
      if (active) setLoading(false)
    })

    return () => {
      active = false
      controller.abort()
    }
  }, [cidade, codusur, days, generalSearch, onUnauthorized, token])

  const routes = useMemo(() => [...new Set(pracas
    .map((item) => item.SEQROTA)
    .filter((value) => value !== null && value !== undefined))]
    .sort((a, b) => Number(a) - Number(b)), [pracas])
  const colors = useMemo(() => routeColors(routes), [routes])

  const allLocations = useMemo(() => {
    if (mode === 'cidades') {
      return cities
        .filter((item) => validCoordinate(item.latitude, item.longitude))
        .map((item) => ({
          id: `cidade-${item.cidade}`,
          kind: 'cidade',
          name: item.cidade,
          count: Number(item.quantidade_clientes) || 0,
          lat: Number(item.latitude),
          lon: Number(item.longitude),
          route: null,
          color: '#3f6635',
          active: readStatusCount(item, 'active'),
          inactive: readStatusCount(item, 'inactive'),
        }))
    }

    return pracas
      .filter((item) => validCoordinate(item.latitude, item.longitude))
      .map((item) => ({
        id: `praca-${item.CODPRACA}`,
        kind: 'praca',
        code: item.CODPRACA,
        name: item.PRACA,
        count: Number(item.quantidade_clientes) || 0,
        lat: Number(item.latitude),
        lon: Number(item.longitude),
        route: item.SEQROTA ?? null,
        color: item.SEQROTA === null || item.SEQROTA === undefined
          ? '#6d7468'
          : colors.get(String(item.SEQROTA)),
        active: readStatusCount(item, 'active'),
        inactive: readStatusCount(item, 'inactive'),
      }))
  }, [cities, colors, mode, pracas])

  const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR')
  const locations = useMemo(() => allLocations.filter((location) => {
    const matchesQuery = !normalizedQuery
      || location.name.toLocaleLowerCase('pt-BR').includes(normalizedQuery)
      || String(location.code ?? '').includes(normalizedQuery)
    const matchesRoute = mode === 'cidades' || route === 'all' || String(location.route ?? 'none') === route
    return matchesQuery && matchesRoute
  }), [allLocations, mode, normalizedQuery, route])

  const visibleSelectedId = locations.some(({ id }) => id === selectedId) ? selectedId : null

  const mappedSource = mode === 'pracas' ? pracas : cities
  const missingCoordinates = mappedSource.length - (mode === 'pracas'
    ? pracas.filter((item) => validCoordinate(item.latitude, item.longitude)).length
    : cities.filter((item) => validCoordinate(item.latitude, item.longitude)).length)
  const totalClients = locations.reduce((sum, location) => sum + location.count, 0)
  const routeSummary = mode === 'pracas' && route !== 'all' ? {
    label: route === 'none' ? 'Praças sem rota' : `Rota ${route}`,
    total: totalClients,
    active: locations.every((location) => location.active !== null)
      ? locations.reduce((sum, location) => sum + location.active, 0)
      : null,
    inactive: locations.every((location) => location.inactive !== null)
      ? locations.reduce((sum, location) => sum + location.inactive, 0)
      : null,
  } : null

  return (
    <section className="wallet-map-section" aria-label="Mapa dos clientes">
      <div className="wallet-map-heading">
        <div>
          <h2><MapPin size={18} aria-hidden="true" /> Distribuição geográfica</h2>
          <p>Dados de praças e municípios fornecidos diretamente pela API.</p>
        </div>
        <span><UsersRound size={14} aria-hidden="true" /> {locations.length} ponto{locations.length === 1 ? '' : 's'} · {totalClients} cliente{totalClients === 1 ? '' : 's'}</span>
      </div>

      <div className="wallet-map-toolbar">
        <div className="wallet-map-mode" role="group" aria-label="Agrupamento do mapa">
          <button type="button" className={mode === 'pracas' ? 'active' : ''} onClick={() => { setMode('pracas'); setRoute('all') }}><Building2 size={14} /> Por praça</button>
          <button type="button" className={mode === 'cidades' ? 'active' : ''} onClick={() => { setMode('cidades'); setRoute('all') }}><MapPin size={14} /> Por cidade</button>
        </div>
        <label className="wallet-map-search">
          <span className="sr-only">Buscar ponto no mapa</span>
          <Search size={15} aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={mode === 'pracas' ? 'Buscar praça ou código' : 'Buscar cidade'} />
        </label>
      </div>

      {generalSearch ? <p className="wallet-map-applied-search"><Search size={13} /> Mapa filtrado pela busca geral: <strong>{generalSearch}</strong></p> : null}

      {mode === 'pracas' && routes.length ? (
        <div className="wallet-route-legend" aria-label="Filtrar por rota">
          <button type="button" className={route === 'all' ? 'active' : ''} onClick={() => setRoute('all')}>Todas as rotas</button>
          {routes.map((item) => (
            <button type="button" className={route === String(item) ? 'active' : ''} key={item} onClick={() => setRoute(String(item))}>
              <i style={{ background: colors.get(String(item)) }} /> <Route size={12} /> Rota {item}
            </button>
          ))}
          {pracas.some((item) => item.SEQROTA === null || item.SEQROTA === undefined) ? (
            <button type="button" className={route === 'none' ? 'active' : ''} onClick={() => setRoute('none')}><i className="route-none" /> Sem rota</button>
          ) : null}
        </div>
      ) : null}

      {routeSummary ? (
        <div className="wallet-map-status-summary" aria-live="polite">
          <span><Route size={16} /><strong>{routeSummary.label}</strong></span>
          <span>Total <strong>{routeSummary.total}</strong></span>
          <span>Ativos <strong>{routeSummary.active ?? 'Aguardando API'}</strong></span>
          <span>Inativos <strong>{routeSummary.inactive ?? 'Aguardando API'}</strong></span>
        </div>
      ) : null}

      {error ? <p className="wallet-map-message" role="alert">{error}</p> : null}
      {loading ? (
        <div className="wallet-map-placeholder">Carregando coordenadas da API…</div>
      ) : locations.length ? (
        <MapCanvas locations={locations} selectedId={visibleSelectedId} onSelect={setSelectedId} />
      ) : (
        <div className="wallet-map-placeholder">Nenhum ponto encontrado para os filtros atuais.</div>
      )}
      <p className="wallet-map-caption">
        Clique no mapa para ativá-lo; depois arraste ou use a roda do mouse para navegar sem rolar a página. Ctrl + e Ctrl − continuam disponíveis.
        {missingCoordinates > 0 ? ` ${missingCoordinates} registro(s) sem coordenadas não foram desenhados.` : ''}
      </p>
    </section>
  )
}

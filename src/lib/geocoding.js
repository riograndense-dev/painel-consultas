const CACHE_KEY = 'consulta.geo.cities.v1'
const memoryCache = new Map()

function readCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function writeCache(city, result) {
  memoryCache.set(city, result)
  try {
    const cache = readCache()
    cache[city] = result
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    // Geocoding still works when browser storage is unavailable.
  }
}

export function normalizeCity(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ')
}

export async function geocodeCity(city, signal) {
  const normalized = normalizeCity(city)
  if (!normalized) return null
  if (memoryCache.has(normalized)) return memoryCache.get(normalized)

  const stored = readCache()
  if (Object.hasOwn(stored, normalized)) {
    memoryCache.set(normalized, stored[normalized])
    return stored[normalized]
  }

  const params = new URLSearchParams({
    q: `${normalized}, Rio Grande do Sul, Brazil`,
    format: 'jsonv2',
    limit: '1',
  })
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { Accept: 'application/json' },
    signal,
  })
  if (!response.ok) throw new Error(`Geocodificação indisponível (HTTP ${response.status})`)
  const result = await response.json()
  const location = result[0]
    ? { lat: Number(result[0].lat), lon: Number(result[0].lon), label: result[0].display_name }
    : null
  writeCache(normalized, location)
  return location
}

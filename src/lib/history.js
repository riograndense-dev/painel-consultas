const HISTORY_KEY = 'consulta.situacao.history'
const LIMIT = 6

export function readHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function pushHistory(entry) {
  const next = [entry, ...readHistory().filter((item) => item.documento !== entry.documento)].slice(
    0,
    LIMIT,
  )
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
  } catch {
    /* noop */
  }
  return next
}

export function clearHistory() {
  try {
    localStorage.removeItem(HISTORY_KEY)
  } catch {
    /* noop */
  }
  return []
}
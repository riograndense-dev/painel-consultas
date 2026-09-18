const STORAGE_KEY = 'consulta.api.baseUrl'

/**
 * URL padrão vem do .env (VITE_API_URL). Facilita apontar para homologação
 * sem precisar recompilar, e pode ser sobrescrita em tempo de execução
 * (ver setApiBaseUrl / a tela de login).
 */
const FALLBACK_API_URL = 'http://localhost:8000'

function sanitize(url) {
  return typeof url === 'string' ? url.trim().replace(/\/+$/, '') : ''
}

export const DEFAULT_API_URL = sanitize(import.meta.env.VITE_API_URL) || FALLBACK_API_URL

export function getApiBaseUrl() {
  try {
    return sanitize(localStorage.getItem(STORAGE_KEY)) || DEFAULT_API_URL
  } catch {
    return DEFAULT_API_URL
  }
}

export function setApiBaseUrl(url) {
  const value = sanitize(url)
  try {
    if (value && value !== FALLBACK_API_URL) {
      localStorage.setItem(STORAGE_KEY, value)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    /* localStorage indisponível: segue com o valor do .env */
  }
  return value || DEFAULT_API_URL
}

export function resetApiBaseUrl() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* noop */
  }
  return DEFAULT_API_URL
}

export function isCustomApiBaseUrl() {
  return getApiBaseUrl() !== DEFAULT_API_URL
}

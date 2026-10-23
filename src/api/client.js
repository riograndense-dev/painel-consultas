import { getApiBaseUrl } from '../lib/config'
import { decodeToken } from '../lib/jwt'
import { readToken, writeToken } from '../lib/storage'

let accessTokenRefreshPromise = null

/** Erro normalizado da API (status HTTP + mensagem legível + erros por campo). */
export class ApiError extends Error {
  constructor(message, { status = 0, detail = null, fieldErrors = {}, cause } = {}) {
    super(message, { cause })
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
    this.fieldErrors = fieldErrors
  }

  get isUnauthorized() {
    return this.status === 401
  }

  get isForbidden() {
    return this.status === 403
  }

  get isValidationError() {
    return this.status === 422 || this.hasFieldErrors
  }

  get hasFieldErrors() {
    return Object.keys(this.fieldErrors).length > 0
  }

  get isConnectionError() {
    return this.status === 0
  }
}

const LOC_PREFIXES = ['body', 'query', 'path', 'header', 'cookie']

/** Converte a lista de ValidationError do FastAPI em { campo: mensagem }. */
export function fieldErrorsFromDetail(data) {
  const list = Array.isArray(data) ? data : Array.isArray(data?.detail) ? data.detail : []
  return list.reduce((acc, item) => {
    const loc = Array.isArray(item?.loc) ? item.loc : []
    const campo = [...loc]
      .reverse()
      .find((part) => typeof part === 'string' && !LOC_PREFIXES.includes(part))
    if (campo && !acc[campo]) acc[campo] = item?.msg ?? 'Valor inválido'
    return acc
  }, {})
}

function buildUrl(path, query) {
  const base = getApiBaseUrl()
  const url = new URL(`${base}${path.startsWith('/') ? path : `/${path}`}`)

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    url.searchParams.set(key, String(value))
  })

  return url.toString()
}

async function parseBody(response) {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

/** Traduz o corpo de erro do FastAPI (string ou lista de ValidationError). */
function extractMessage(data, response) {
  if (typeof data === 'string' && data.trim()) return data
  const detail = data?.detail ?? data?.message ?? data?.error

  if (typeof detail === 'string' && detail.trim()) return detail

  if (Array.isArray(detail) && detail.length > 0) {
    return detail
      .map((item) => {
        const campo = Array.isArray(item?.loc) ? item.loc.filter((p) => p !== 'body').join('.') : ''
        return campo ? `${campo}: ${item?.msg ?? 'valor inválido'}` : (item?.msg ?? 'valor inválido')
      })
      .join(' | ')
  }

  if (response.status === 401) return 'Credenciais inválidas ou sessão expirada.'
  if (response.status === 403) return 'Seu usuário não tem permissão para esta consulta.'
  if (response.status === 404) return 'Recurso não encontrado na API.'
  if (response.status === 422) return 'Dados inválidos para esta requisição.'
  if (response.status >= 500) return 'A API retornou um erro interno. Tente novamente em instantes.'
  return `Falha na requisição (HTTP ${response.status}).`
}

function shouldSkipAuthRefresh(path) {
  return path === '/auth/login' || path === '/auth/refresh' || path === '/auth/logout'
}

export function extractAccessToken(data) {
  if (!data) return null
  if (typeof data === 'string') return data.trim() || null
  return (
    data.access_token ?? data.accessToken ?? data.token ?? data.access ?? data.id_token ?? null
  )
}

/** Uma única rotação do cookie é compartilhada por todas as requisições concorrentes. */
export function refreshAccessToken() {
  if (accessTokenRefreshPromise) return accessTokenRefreshPromise

  accessTokenRefreshPromise = apiRequest('/auth/refresh', {
    method: 'POST',
    skipAuthRefresh: true,
  })
    .then((data) => {
      const token = extractAccessToken(data)

      if (!token) {
        throw new Error('A API respondeu sem novo token de acesso durante o refresh.')
      }

      writeToken(token)

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('consulta.auth.refreshed', { detail: { token } }))
      }

      return { token, payload: decodeToken(token), raw: data }
    })
    .finally(() => {
      accessTokenRefreshPromise = null
    })

  return accessTokenRefreshPromise
}

function apiErrorFromResponse(data, response) {
  return new ApiError(extractMessage(data, response), {
    status: response.status,
    detail: data,
    fieldErrors: fieldErrorsFromDetail(data),
  })
}

function notifySessionCleared() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('consulta.auth.cleared'))
  }
}

/**
 * Wrapper de fetch com JSON, query params, Authorization e erros normalizados.
 * Em 401, tenta renovar o token automaticamente quando a rota não é login/refresh/logout.
 */
export async function apiRequest(path, options = {}) {
  const {
    method = 'GET',
    query,
    body,
    token,
    headers,
    signal,
    formEncoded = false,
    skipAuthRefresh = false,
  } = options

  const finalHeaders = { Accept: 'application/json', ...headers }
  let payload

  if (body !== undefined && body !== null) {
    if (formEncoded) {
      finalHeaders['Content-Type'] = 'application/x-www-form-urlencoded'
      payload = new URLSearchParams(body).toString()
    } else {
      finalHeaders['Content-Type'] = 'application/json'
      payload = JSON.stringify(body)
    }
  }

  if (token) finalHeaders.Authorization = `Bearer ${token}`

  const sendRequest = async (requestHeaders = finalHeaders) => {
    let response
    try {
      response = await fetch(buildUrl(path, query), {
        method,
        headers: requestHeaders,
        body: payload,
        signal,
        credentials: 'include',
      })
    } catch (error) {
      if (error?.name === 'AbortError') throw error
      throw new ApiError(
        `Não foi possível falar com a API em ${getApiBaseUrl()}. Verifique a URL e sua conexão.`,
        { cause: error },
      )
    }

    return { response, data: await parseBody(response) }
  }

  const firstResult = await sendRequest()
  if (firstResult.response.ok) return firstResult.data

  const canRefresh =
    !skipAuthRefresh &&
    !shouldSkipAuthRefresh(path) &&
    firstResult.response.status === 401 &&
    Boolean(finalHeaders.Authorization)

  if (!canRefresh) throw apiErrorFromResponse(firstResult.data, firstResult.response)

  try {
    // Outra requisição pode ter renovado a sessão enquanto esta ainda estava em voo.
    // Nesse caso, repetimos com o token atual sem rotacionar o cookie novamente.
    const storedToken = readToken()
    const sentAuthorization = finalHeaders.Authorization
    const currentAuthorization = storedToken ? `Bearer ${storedToken}` : null
    const refreshedToken =
      currentAuthorization && currentAuthorization !== sentAuthorization
        ? storedToken
        : (await refreshAccessToken()).token

    const retryResult = await sendRequest({
      ...finalHeaders,
      Authorization: `Bearer ${refreshedToken}`,
    })

    if (!retryResult.response.ok) {
      if (retryResult.response.status === 401) notifySessionCleared()
      throw apiErrorFromResponse(retryResult.data, retryResult.response)
    }

    return retryResult.data
  } catch (error) {
    if (error?.status === 401) notifySessionCleared()
    throw error
  }
}

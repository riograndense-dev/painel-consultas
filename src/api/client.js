import { getApiBaseUrl } from '../lib/config'

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
    return this.status === 401 || this.status === 403
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

/**
 * Wrapper de fetch com JSON, query params, Bearer token e erros normalizados.
 */
export async function apiRequest(path, options = {}) {
  const { method = 'GET', query, body, token, headers, signal, formEncoded = false } = options

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

  let response
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers: finalHeaders,
      body: payload,
      signal,
    })
  } catch (error) {
    if (error?.name === 'AbortError') throw error
    throw new ApiError(
      `Não foi possível falar com a API em ${getApiBaseUrl()}. Verifique a URL e sua conexão.`,
      { cause: error },
    )
  }

  const data = await parseBody(response)

  if (!response.ok) {
    throw new ApiError(extractMessage(data, response), {
      status: response.status,
      detail: data,
      fieldErrors: fieldErrorsFromDetail(data),
    })
  }

  return data
}

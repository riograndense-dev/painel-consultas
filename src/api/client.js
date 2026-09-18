import { getApiBaseUrl } from '../lib/config'

/** Erro normalizado da API (status HTTP + mensagem legível). */
export class ApiError extends Error {
  constructor(message, { status = 0, detail = null, cause } = {}) {
    super(message, { cause })
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }

  get isUnauthorized() {
    return this.status === 401 || this.status === 403
  }

  get isConnectionError() {
    return this.status === 0
  }
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
    throw new ApiError(extractMessage(data, response), { status: response.status, detail: data })
  }

  return data
}

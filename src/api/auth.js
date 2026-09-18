import { decodeToken } from '../lib/jwt'
import { apiRequest } from './client'

function extractToken(data) {
  if (!data) return null
  if (typeof data === 'string') return data.trim() || null
  return (
    data.access_token ?? data.accessToken ?? data.token ?? data.access ?? data.id_token ?? null
  )
}

/**
 * POST /auth/login — fluxo OAuth2 password (form-urlencoded), conforme o
 * securityScheme OAuth2PasswordBearer (tokenUrl = /auth/login).
 * Alguns deployments aceitam JSON; fazemos fallback automaticamente.
 */
export async function login({ usuario, senha, signal }) {
  const credentials = { username: usuario, password: senha }
  let data

  try {
    data = await apiRequest('/auth/login', {
      method: 'POST',
      body: credentials,
      formEncoded: true,
      signal,
    })
  } catch (error) {
    const deveTentarJson = error?.status === 400 || error?.status === 415 || error?.status === 422
    if (!deveTentarJson) throw error

    data = await apiRequest('/auth/login', {
      method: 'POST',
      body: { ...credentials, usuario, senha },
      signal,
    })
  }

  const token = extractToken(data)
  if (!token) {
    throw new Error('A API respondeu sem token de acesso. Verifique as credenciais informadas.')
  }

  return { token, payload: decodeToken(token), raw: data }
}

/** GET /auth/me — dados do usuário autenticado. */
export function fetchMe(token, signal) {
  return apiRequest('/auth/me', { token, signal })
}

/** POST /auth/logout — encerra a sessão no servidor (best-effort). */
export function logout(token) {
  return apiRequest('/auth/logout', { method: 'POST', token })
}

/** GET / — usado para validar a URL base informada na tela de login. */
export function ping(signal) {
  return apiRequest('/', { signal })
}

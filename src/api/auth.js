import { decodeToken } from '../lib/jwt'
import { apiRequest, extractAccessToken, refreshAccessToken } from './client'

export function extractToken(data) {
  return extractAccessToken(data)
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

/**
 * POST /auth/refresh — renova o access token usando o cookie HttpOnly.
 *
 * Como o refresh token é rotativo, chamadas concorrentes compartilham a mesma
 * Promise e nunca tentam reutilizar o mesmo cookie.
 */
export function refresh() {
  return refreshAccessToken()
}

/** GET /auth/me — dados do usuário autenticado. */
export function fetchMe(token, signal) {
  return apiRequest('/auth/me', { token, signal })
}

/** POST /auth/logout — revoga a sessão identificada pelo cookie HttpOnly. */
export function logout(token) {
  return apiRequest('/auth/logout', { method: 'POST', token })
}

/** GET / — usado para validar a URL base informada na tela de login. */
export function ping(signal) {
  return apiRequest('/', { signal })
}

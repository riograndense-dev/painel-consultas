import { jwtDecode } from 'jwt-decode'

/**
 * Decodifica um JWT sem validar assinatura (a validação é responsabilidade da API).
 * Retorna null quando o token é inválido/opaco.
 */
export function decodeToken(token) {
  if (!token || typeof token !== 'string') return null
  try {
    const payload = jwtDecode(token)
    return payload && typeof payload === 'object' ? payload : null
  } catch {
    return null
  }
}

/** Momento de expiração do token, em milissegundos (null quando não há `exp`). */
export function getTokenExpiration(payload) {
  if (!payload || typeof payload.exp !== 'number') return null
  return payload.exp * 1000
}

/** Considera o token expirado com uma margem de segurança em segundos. */
export function isExpired(payload, skewSeconds = 15) {
  const expiresAt = getTokenExpiration(payload)
  if (expiresAt === null) return false
  return expiresAt - skewSeconds * 1000 <= Date.now()
}

/** Rótulos amigáveis para as claims mais comuns do token da API. */
export function describeClaims(payload) {
  if (!payload) return []
  const claims = [
    ['Usuário', payload.usuario ?? payload.username ?? payload.sub],
    ['Perfil', payload.role ?? payload.perfil],
    ['Cód. vendedor', payload.codusur],
    ['Cód. supervisor', payload.codsupervisor],
    ['Emitido em', formatClaimDate(payload.iat)],
    ['Expira em', formatClaimDate(payload.exp)],
  ]
  return claims.filter(([, value]) => value !== undefined && value !== null && value !== '')
}

function formatClaimDate(seconds) {
  if (typeof seconds !== 'number') return null
  return new Date(seconds * 1000).toLocaleString('pt-BR')
}

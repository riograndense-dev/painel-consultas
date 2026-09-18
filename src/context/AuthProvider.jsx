import { useCallback, useEffect, useMemo, useState } from 'react'
import * as authApi from '../api/auth'
import { decodeToken, describeClaims, getTokenExpiration, isExpired } from '../lib/jwt'
import { clearStoredToken, readToken, writeToken } from '../lib/storage'
import { AuthContext } from './auth-context'

const MAX_TIMEOUT = 2 ** 31 - 1

function initialSession() {
  const stored = readToken()
  const payload = decodeToken(stored)
  if (stored && !isExpired(payload)) {
    return { token: stored, payload, status: 'authenticated' }
  }
  if (stored) clearStoredToken()
  return { token: null, payload: null, status: 'anonymous' }
}

/**
 * Centraliza autenticação: token persistido, claims decodificadas com
 * jwt-decode, expiração monitorada e logout automático.
 */
export function AuthProvider({ children }) {
  const [{ token, payload, status }, setSession] = useState(initialSession)
  const [profile, setProfile] = useState(null)
  const [notice, setNotice] = useState(null)

  const clearSession = useCallback((message = null) => {
    clearStoredToken()
    setSession({ token: null, payload: null, status: 'anonymous' })
    setProfile(null)
    setNotice(message)
  }, [])

  const signIn = useCallback(async ({ usuario, senha }) => {
    setNotice(null)
    const result = await authApi.login({ usuario, senha })

    if (result.payload && isExpired(result.payload)) {
      throw new Error('O token devolvido pela API já está expirado. Confira o horário do servidor.')
    }

    writeToken(result.token)
    setSession({ token: result.token, payload: result.payload, status: 'authenticated' })
    return result.payload
  }, [])

  const signOut = useCallback(
    async ({ notifyServer = true, message = null } = {}) => {
      if (notifyServer && token) {
        try {
          await authApi.logout(token)
        } catch {
          /* logout remoto é best-effort */
        }
      }
      clearSession(message)
    },
    [token, clearSession],
  )

  /** Logout automático quando o `exp` do JWT é atingido. */
  useEffect(() => {
    if (!token) return undefined
    const expiresAt = getTokenExpiration(payload)
    if (expiresAt === null) return undefined

    const delay = Math.min(Math.max(expiresAt - Date.now(), 0), MAX_TIMEOUT)
    const timer = setTimeout(() => {
      signOut({ notifyServer: false, message: 'Sua sessão expirou. Faça login novamente.' })
    }, delay)

    return () => clearTimeout(timer)
  }, [token, payload, signOut])

  /** Carrega /auth/me em segundo plano para enriquecer o cabeçalho. */
  useEffect(() => {
    if (!token) return undefined
    const controller = new AbortController()

    authApi
      .fetchMe(token, controller.signal)
      .then((data) => setProfile(data))
      .catch((error) => {
        if (error?.name === 'AbortError') return
        if (error?.isUnauthorized) {
          clearSession('Sua sessão não é mais válida. Faça login novamente.')
        }
      })

    return () => controller.abort()
  }, [token, clearSession])

  const value = useMemo(
    () => ({
      token,
      payload,
      profile,
      status,
      notice,
      isAuthenticated: status === 'authenticated' && Boolean(token),
      expiresAt: getTokenExpiration(payload),
      claims: describeClaims(payload),
      displayName:
        profile?.usuario ??
        payload?.usuario ??
        payload?.username ??
        payload?.nome ??
        payload?.sub ??
        'Operador',
      role: profile?.role ?? payload?.role ?? payload?.perfil ?? null,
      codusur: profile?.codusur ?? payload?.codusur ?? null,
      signIn,
      signOut,
      dismissNotice: () => setNotice(null),
      /** Encerra a sessão local quando a API responde 401/403. */
      handleUnauthorized: () =>
        clearSession('Sua sessão expirou ou foi encerrada. Faça login novamente.'),
    }),
    [token, payload, profile, status, notice, signIn, signOut, clearSession],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
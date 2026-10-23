import { useCallback, useEffect, useMemo, useState } from 'react'
import * as authApi from '../api/auth'
import { decodeToken, describeClaims, getTokenExpiration, isExpired } from '../lib/jwt'
import { clearStoredToken, readToken, writeToken } from '../lib/storage'
import { AuthContext } from './auth-context'

const MAX_TIMEOUT = 2 ** 31 - 1
const REFRESH_ADVANCE_MS = 30_000
const REFRESH_RETRY_MS = 15_000

function initialSession() {
  const stored = readToken()
  const payload = decodeToken(stored)
  if (stored && !isExpired(payload)) {
    return { token: stored, payload, status: 'authenticated' }
  }
  if (stored) clearStoredToken()
  // Mesmo sem access token local, o cookie HttpOnly pode restaurar a sessão.
  return { token: null, payload: null, status: 'loading' }
}

/**
 * Centraliza autenticação: token persistido, claims decodificadas com
 * jwt-decode e renovação automática da sessão.
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
      if (notifyServer) {
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

  /** Restaura uma sessão persistida somente no cookie ao abrir/recarregar a aplicação. */
  useEffect(() => {
    if (status !== 'loading') return undefined
    let active = true

    authApi
      .refresh()
      .then(({ token: nextToken, payload: nextPayload }) => {
        if (!active) return
        setSession({ token: nextToken, payload: nextPayload, status: 'authenticated' })
      })
      .catch(() => {
        if (!active) return
        clearStoredToken()
        setSession({ token: null, payload: null, status: 'anonymous' })
      })

    return () => {
      active = false
    }
  }, [status])

  useEffect(() => {
    const handleTokenRefreshed = (event) => {
      const nextToken = event?.detail?.token ?? readToken()
      if (!nextToken) return

      const nextPayload = decodeToken(nextToken)
      setSession({ token: nextToken, payload: nextPayload, status: 'authenticated' })
    }

    const handleSessionCleared = () => {
      clearSession('Sua sessão expirou ou foi encerrada. Faça login novamente.')
    }

    window.addEventListener('consulta.auth.refreshed', handleTokenRefreshed)
    window.addEventListener('consulta.auth.cleared', handleSessionCleared)

    return () => {
      window.removeEventListener('consulta.auth.refreshed', handleTokenRefreshed)
      window.removeEventListener('consulta.auth.cleared', handleSessionCleared)
    }
  }, [clearSession])

  /** Renova o access token pouco antes do `exp`; falhas transitórias são tentadas novamente. */
  useEffect(() => {
    if (!token) return undefined
    const expiresAt = getTokenExpiration(payload)
    if (expiresAt === null) return undefined

    let active = true
    let timer

    const renew = async () => {
      try {
        await authApi.refresh()
      } catch (error) {
        if (!active) return
        if (error?.isUnauthorized) {
          clearSession('Sua sessão expirou ou foi encerrada. Faça login novamente.')
          return
        }
        timer = setTimeout(renew, REFRESH_RETRY_MS)
      }
    }

    const delay = Math.min(
      Math.max(expiresAt - Date.now() - REFRESH_ADVANCE_MS, 0),
      MAX_TIMEOUT,
    )
    timer = setTimeout(renew, delay)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [token, payload, clearSession])

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
      /** Encerra a sessão local quando a API responde 401 após tentar o refresh. */
      handleUnauthorized: () =>
        clearSession('Sua sessão expirou ou foi encerrada. Faça login novamente.'),
    }),
    [token, payload, profile, status, notice, signIn, signOut, clearSession],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}

import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/auth-context'
import { Spinner } from './Spinner'

/** Bloqueia rotas privadas: sem token válido, volta para o login. */
export function ProtectedRoute({ children }) {
  const { isAuthenticated, status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        <Spinner className="h-8 w-8" label="Verificando sessão" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    )
  }

  return children
}

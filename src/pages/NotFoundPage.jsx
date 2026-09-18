import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-6xl font-bold text-slate-300">404</p>
      <h1 className="text-2xl font-semibold text-slate-900">Página não encontrada</h1>
      <p className="max-w-md text-sm text-slate-500">
        O endereço acessado não existe neste portal. Volte para a consulta de situação cadastral.
      </p>
      <Link
        to="/"
        className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:from-blue-700 hover:to-indigo-700"
      >
        Ir para a consulta
      </Link>
    </div>
  )
}
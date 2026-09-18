import { onlyDigits } from '../lib/format'
import { apiRequest } from './client'

/**
 * GET /clients/situacao
 * @returns {Promise<{status: string, nome?: string|null}>}
 */
export function getClientSituacao({ documento, dias = 30, token, signal }) {
  return apiRequest('/clients/situacao', {
    token,
    signal,
    query: {
      documento: onlyDigits(documento) || documento,
      dias,
    },
  })
}

/** GET /clients/ — busca por nome ou código do cliente. */
export function listClients({ search, token, signal } = {}) {
  return apiRequest('/clients/', { token, signal, query: { search } })
}

/** GET /clients/{codcli}/prestacoes — cliente + contas a receber. */
export function getClientPrestacoes(codcli, token, signal) {
  return apiRequest(`/clients/${codcli}/prestacoes`, { token, signal })
}

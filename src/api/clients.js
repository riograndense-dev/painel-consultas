import { onlyDigits } from '../lib/format'
import { apiRequest } from './client'

/** GET /clients/ — carteira paginada com filtros por cliente, cidade e vendedor. */
export function listClients({ search, cidade, codusur, pagina = 1, limite = 50, dias = 30, token, signal } = {}) {
  return apiRequest('/clients/', {
    token,
    signal,
    query: { search, cidade, codusur, pagina, limite, dias },
  })
}

/** GET /clients/{codcli} — dados cadastrais de um cliente. */
export function getClient(codcli, token, signal) {
  return apiRequest(`/clients/${encodeURIComponent(codcli)}`, { token, signal })
}

/** GET /clients/situacao — status, cidade, vendedor e última compra pelo CPF/CNPJ. */
export function getClientSituacao({ documento, dias = 30, token, signal }) {
  return apiRequest('/clients/situacao', {
    token,
    signal,
    query: { documento: onlyDigits(documento) || documento, dias },
  })
}

/** GET /clients/{codcli}/prestacoes — cliente + contas a receber. */
export function getClientPrestacoes(codcli, token, signal) {
  return apiRequest(`/clients/${codcli}/prestacoes`, { token, signal })
}

/** GET /mapa/clientes/cidades — totais e coordenadas agrupados por município. */
export function listMapCities({ search, codpraca, seqrota, codusur, dias, token, signal } = {}) {
  return apiRequest('/mapa/clientes/cidades', {
    token,
    signal,
    query: { search, codpraca, seqrota, codusur, dias },
  })
}

/** GET /mapa/clientes/pracas — praças, rotas, coordenadas e totais de clientes. */
export function listMapPracas({ search, cidade, codpraca, seqrota, codusur, dias, token, signal } = {}) {
  return apiRequest('/mapa/clientes/pracas', {
    token,
    signal,
    query: { search, cidade, codpraca, seqrota, codusur, dias },
  })
}

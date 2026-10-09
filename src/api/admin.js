import { apiRequest } from './client'

/**
 * CRUD administrativo (tag "Admin CRUD" do openapi.json).
 * Todas as rotas exigem Authorization: Bearer <token>.
 *
 * Assinatura das funções:
 *   list(token, signal)            -> GET    /admin/<recurso>
 *   create(token, payload)         -> POST   /admin/<recurso>
 *   update(token, id, payload)     -> PUT    /admin/<recurso>/{id}
 *   remove(token, id)              -> DELETE /admin/<recurso>/{id}
 */

// ── Funcionários (usuários administradores) ──────────────────────────────────
export function listFuncionarios(token, signal) {
  return apiRequest('/admin/funcionarios', { token, signal })
}

export function createFuncionario(token, payload) {
  return apiRequest('/admin/funcionarios', { method: 'POST', token, body: payload })
}

export function updateFuncionario(token, funcId, payload) {
  return apiRequest(`/admin/funcionarios/${funcId}`, { method: 'PUT', token, body: payload })
}

export function removeFuncionario(token, funcId) {
  return apiRequest(`/admin/funcionarios/${funcId}`, { method: 'DELETE', token })
}

export const funcionariosApi = {
  list: listFuncionarios,
  create: createFuncionario,
  update: updateFuncionario,
  remove: removeFuncionario,
}

// ── Vendedores ───────────────────────────────────────────────────────────────
export function listVendedores(token, signal) {
  return apiRequest('/admin/vendedores', { token, signal })
}

export function createVendedor(token, payload) {
  return apiRequest('/admin/vendedores', { method: 'POST', token, body: payload })
}

export function updateVendedor(token, codusur, payload) {
  return apiRequest(`/admin/vendedores/${codusur}`, { method: 'PUT', token, body: payload })
}

export function removeVendedor(token, codusur) {
  return apiRequest(`/admin/vendedores/${codusur}`, { method: 'DELETE', token })
}

export const vendedoresApi = {
  list: listVendedores,
  create: createVendedor,
  update: updateVendedor,
  remove: removeVendedor,
}

// ── Clientes (acesso ao portal) ──────────────────────────────────────────────
export function listClientesAdmin(token, signal) {
  return apiRequest('/admin/clientes', { token, signal })
}

export function createClienteAdmin(token, payload) {
  return apiRequest('/admin/clientes', { method: 'POST', token, body: payload })
}

export function updateClienteAdmin(token, codcli, payload) {
  return apiRequest(`/admin/clientes/${codcli}`, { method: 'PUT', token, body: payload })
}

export function removeClienteAdmin(token, codcli) {
  return apiRequest(`/admin/clientes/${codcli}`, { method: 'DELETE', token })
}

export const clientesApi = {
  list: listClientesAdmin,
  create: createClienteAdmin,
  update: updateClienteAdmin,
  remove: removeClienteAdmin,
}

// ── Apoio aos formulários ────────────────────────────────────────────────────
/** GET /user/ — vendedores do WinThor (para o select de CODUSUR). */
export function listVendedoresWinthor(token, signal) {
  return apiRequest('/user/', { token, signal })
}

/** GET /manager/ — supervisores do WinThor (para o select de CODSUPERVISOR). */
export function listSupervisores(token, signal) {
  return apiRequest('/manager/', { token, signal })
}
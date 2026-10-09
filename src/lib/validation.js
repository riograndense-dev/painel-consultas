import { onlyDigits, validateDocumento } from './format'

/** Perfis sugeridos para o campo `role` de /admin/funcionarios. */
export const ROLE_OPTIONS = [
  { value: 'admin', label: 'Administrador' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'vendedor', label: 'Vendedor' },
  { value: 'financeiro', label: 'Financeiro' },
  { value: 'consulta', label: 'Consulta' },
]

const ADMIN_PATTERN = /admin/i

/** Habilita a área /admin quando o perfil (claim `role`) é administrador. */
export function isAdminRole(role) {
  return ADMIN_PATTERN.test(String(role ?? ''))
}

export function roleTone(role) {
  const valor = String(role ?? '').toLowerCase()
  if (valor.includes('admin')) return 'indigo'
  if (valor.includes('super')) return 'sky'
  if (valor.includes('vend')) return 'emerald'
  if (valor.includes('financ')) return 'amber'
  return 'slate'
}

export function maskTelefone(value) {
  const digits = onlyDigits(value).slice(0, 11)
  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/^\((\d{2})\) (\d{4})(\d)/, '($1) $2-$3')
  }
  return digits
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/^\((\d{2})\) (\d{5})(\d)/, '($1) $2-$3')
}

export function formatTelefone(value) {
  return value ? maskTelefone(value) : null
}

function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === ''
}

/** Valida código numérico opcional/obrigatório (CODCLI, CODUSUR, CODSUPERVISOR). */
export function validateCodigo(value, label, { required = false, min = 1 } = {}) {
  if (isBlank(value)) return required ? `Informe o ${label}.` : null
  if (!/^\d+$/.test(String(value).trim())) return `${label} deve conter apenas números.`
  if (Number(value) < min) return `${label} deve ser maior ou igual a ${min}.`
  return null
}

function validateSenha(value, { required }) {
  if (isBlank(value)) return required ? 'Informe a senha.' : null
  if (String(value).length < 4) return 'A senha deve ter ao menos 4 caracteres.'
  return null
}

function validateUrlOpcional(value, label) {
  if (isBlank(value)) return null
  try {
    const url = new URL(String(value).trim())
    return ['http:', 'https:'].includes(url.protocol) ? null : `${label} deve ser uma URL http(s).`
  } catch {
    return `${label} deve ser uma URL válida (ex.: https://...) .`
  }
}

/** POST/PUT /admin/funcionarios/{id} — FuncionarioCreate/FuncionarioUpdate. */
export function validateFuncionario(values, mode = 'create') {
  const errors = {}
  const usuario = String(values.usuario ?? '').trim()

  if (!usuario) errors.usuario = 'Informe o usuário de acesso.'
  else if (usuario.length < 3) errors.usuario = 'O usuário deve ter ao menos 3 caracteres.'
  else if (/\s/.test(usuario)) errors.usuario = 'O usuário não pode conter espaços.'

  const senhaError = validateSenha(values.senha, { required: mode === 'create' })
  if (senhaError) errors.senha = senhaError

  if (isBlank(values.role)) errors.role = 'Selecione o perfil (role).'

  const codusur = validateCodigo(values.codusur, 'Cód. do vendedor', { min: 0 })
  if (codusur) errors.codusur = codusur

  const supervisor = validateCodigo(values.codsupervisor, 'Cód. do supervisor', { min: 0 })
  if (supervisor) errors.codsupervisor = supervisor

  return errors
}

/** POST/PUT /admin/vendedores/{codusur} — VendedorCreate/VendedorUpdate. */
export function validateVendedor(values, mode = 'create') {
  const errors = {}
  const nome = String(values.nome ?? '').trim()

  if (mode === 'create') {
    const codusur = validateCodigo(values.codusur, 'Cód. do vendedor', { required: true, min: 1 })
    if (codusur) errors.codusur = codusur
  }

  if (!nome) errors.nome = 'Informe o nome do vendedor.'
  else if (nome.length < 3) errors.nome = 'O nome deve ter ao menos 3 caracteres.'

  const telefone = onlyDigits(values.telefone)
  if (telefone && telefone.length < 10) {
    errors.telefone = 'Telefone deve ter DDD + 8 ou 9 dígitos.'
  }

  const foto = validateUrlOpcional(values.foto, 'Foto')
  if (foto) errors.foto = foto

  return errors
}

/** POST/PUT /admin/clientes/{codcli} — ClienteCreate/ClienteUpdate. */
export function validateCliente(values, mode = 'create') {
  const errors = {}

  if (mode === 'create') {
    const codcli = validateCodigo(values.codcli, 'Cód. do cliente', { required: true, min: 1 })
    if (codcli) errors.codcli = codcli
  }

  const numdoc = validateDocumento(values.numdoc)
  if (numdoc) errors.numdoc = numdoc

  const senhaError = validateSenha(values.senha, { required: mode === 'create' })
  if (senhaError) errors.senha = senhaError

  const nome = String(values.nome ?? '').trim()
  if (!nome) errors.nome = 'Informe o nome do cliente.'
  else if (nome.length < 3) errors.nome = 'O nome deve ter ao menos 3 caracteres.'

  const codusur = validateCodigo(values.codusur, 'Cód. do vendedor', { min: 0 })
  if (codusur) errors.codusur = codusur

  return errors
}
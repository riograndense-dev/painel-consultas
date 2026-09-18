export function onlyDigits(value) {
  return String(value ?? '').replace(/\D/g, '')
}

/** Mascara CPF (11 dígitos) e CNPJ (14 dígitos) conforme a digitação. */
export function maskDocumento(value) {
  const digits = onlyDigits(value).slice(0, 14)

  if (digits.length <= 11) {
    return digits
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4')
  }

  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3/$4')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, '$1.$2.$3/$4-$5')
}

/** Valida apenas a quantidade de dígitos esperada pela API (11 a 20 chars). */
export function validateDocumento(value) {
  const digits = onlyDigits(value)
  if (!digits) return 'Informe o CPF ou CNPJ.'
  if (digits.length !== 11 && digits.length !== 14) {
    return 'O documento deve ter 11 (CPF) ou 14 (CNPJ) dígitos.'
  }
  return null
}

export function documentoTipo(value) {
  const digits = onlyDigits(value)
  if (digits.length === 11) return 'CPF'
  if (digits.length === 14) return 'CNPJ'
  return 'Documento'
}

export function formatDias(dias) {
  return `${dias} ${Number(dias) === 1 ? 'dia' : 'dias'}`
}

export function formatHorario(date = new Date()) {
  return date.toLocaleTimeString('pt-BR')
}

export function formatDataHora(date = new Date()) {
  return date.toLocaleString('pt-BR')
}

/** Classifica o status textual devolvido por /clients/situacao. */
export function classifyStatus(status) {
  const normalized = String(status ?? '').trim().toLowerCase()
  const ativo = normalized === 'ativo' || normalized.startsWith('ativo')
  if (ativo) {
    return {
      key: 'ativo',
      label: 'Ativo',
      description: 'Documento localizado e com compras na janela consultada.',
    }
  }
  return {
    key: 'inativo',
    label: 'Inativo ou não encontrado',
    description: 'Documento ausente na base ou sem compras na janela consultada.',
  }
}

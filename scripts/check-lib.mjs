// Verifica as funções puras de src/lib sem navegador: npm run check
import assert from 'node:assert/strict'
import {
  classifyStatus,
  documentoTipo,
  formatDias,
  maskDocumento,
  onlyDigits,
  validateDocumento,
} from '../src/lib/format.js'
import { decodeToken, describeClaims, getTokenExpiration, isExpired } from '../src/lib/jwt.js'

assert.equal(maskDocumento('12345678901'), '123.456.789-01')
assert.equal(maskDocumento('123.456.789-01'), '123.456.789-01')
assert.equal(maskDocumento('12345678000199'), '12.345.678/0001-99')
assert.equal(maskDocumento('12.345.678/0001-99'), '12.345.678/0001-99')
assert.equal(maskDocumento('12345678901234'), '12.345.678/9012-34')
assert.equal(onlyDigits('12.345.678/0001-99'), '12345678000199')
assert.equal(validateDocumento('123.456.789-01'), null)
assert.equal(validateDocumento('12.345.678/0001-99'), null)
assert.equal(typeof validateDocumento('123'), 'string')
assert.equal(documentoTipo('123.456.789-01'), 'CPF')
assert.equal(documentoTipo('12.345.678/0001-99'), 'CNPJ')
assert.equal(formatDias(1), '1 dia')
assert.equal(formatDias(30), '30 dias')
assert.equal(classifyStatus('Ativo').key, 'ativo')
assert.equal(classifyStatus('inativo ou não encontrado').key, 'inativo')
assert.equal(classifyStatus(undefined).key, 'inativo')

const token = [
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
  Buffer.from(
    JSON.stringify({
      sub: 'operador',
      usuario: 'operador',
      role: 'admin',
      codusur: 12,
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  ).toString('base64url'),
  'assinatura',
].join('.')

const payload = decodeToken(token)
assert.equal(payload.role, 'admin')
assert.equal(isExpired(payload), false)
assert.equal(typeof getTokenExpiration(payload), 'number')
assert.ok(describeClaims(payload).some(([label]) => label === 'Usuário'))
assert.equal(decodeToken('nao-e-jwt'), null)

console.log('OK: helpers de src/lib validados com sucesso.')
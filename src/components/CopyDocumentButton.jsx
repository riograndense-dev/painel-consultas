import { Check, Copy } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { onlyDigits } from '../lib/format'

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value)
      return
    } catch {
      // Browsers can expose the API but reject it outside a secure context.
    }
  }

  const input = window.document.createElement('textarea')
  input.value = value
  input.setAttribute('readonly', '')
  input.style.position = 'fixed'
  input.style.opacity = '0'
  window.document.body.appendChild(input)
  input.select()
  const copiedSuccessfully = window.document.execCommand('copy')
  input.remove()
  if (!copiedSuccessfully) throw new Error('Copy command failed')
}

export function CopyDocumentButton({ document, className = '' }) {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef(null)
  const digits = onlyDigits(document)

  useEffect(() => () => clearTimeout(timeoutRef.current), [])

  const handleCopy = async (event) => {
    event.stopPropagation()
    if (!digits) return

    try {
      await copyText(digits)
      setCopied(true)
      clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  if (!digits) return null

  return (
    <button
      type="button"
      className={`wallet-copy-document ${copied ? 'copied' : ''} ${className}`.trim()}
      onClick={handleCopy}
      aria-label={copied ? 'CPF/CNPJ copiado' : 'Copiar CPF/CNPJ sem pontuação'}
      title={copied ? 'Copiado!' : 'Copiar apenas os números'}
    >
      {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
      <span>{copied ? 'Copiado' : 'Copiar'}</span>
    </button>
  )
}

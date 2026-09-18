const STYLES = {
  ativo: {
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    dot: 'bg-emerald-500',
  },
  inativo: {
    badge: 'border-amber-200 bg-amber-50 text-amber-800',
    dot: 'bg-amber-500',
  },
}

export function StatusBadge({ statusKey, label }) {
  const styles = STYLES[statusKey] ?? STYLES.inativo

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold ${styles.badge}`}
    >
      <span className={`h-2 w-2 rounded-full ${styles.dot}`} aria-hidden="true" />
      {label}
    </span>
  )
}
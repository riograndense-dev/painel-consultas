export function Spinner({ className = 'h-5 w-5', label = 'Carregando' }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" role="status" aria-label={label}>
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8V0C5.4 0 0 5.4 0 12h4Zm2 5.29A8.06 8.06 0 0 1 4 12H0c0 3.04 1.14 5.82 3 7.94l3-2.65Z"
      />
    </svg>
  )
}
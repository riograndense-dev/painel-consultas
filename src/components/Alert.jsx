const VARIANTS = {
  error: {
    wrapper: 'border-rose-200 bg-rose-50 text-rose-800',
    icon: (
      <path
        fillRule="evenodd"
        d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 15a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm-1-9a1 1 0 0 1 1 1v5a1 1 0 1 1-2 0V9a1 1 0 0 1 1-1Z"
        clipRule="evenodd"
      />
    ),
  },
  success: {
    wrapper: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    icon: (
      <path
        fillRule="evenodd"
        d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.7 7.7a1 1 0 0 0-1.4-1.4L11 12.6l-2.3-2.3a1 1 0 0 0-1.4 1.4l3 3a1 1 0 0 0 1.4 0l5-5Z"
        clipRule="evenodd"
      />
    ),
  },
  warning: {
    wrapper: 'border-amber-200 bg-amber-50 text-amber-900',
    icon: (
      <path
        fillRule="evenodd"
        d="M10.3 3.6c.8-1.3 2.6-1.3 3.4 0l7.4 12.6c.8 1.4-.2 3.1-1.8 3.1H4.7c-1.6 0-2.6-1.7-1.8-3.1L10.3 3.6ZM12 8a1 1 0 0 0-1 1v4a1 1 0 1 0 2 0V9a1 1 0 0 0-1-1Zm0 8.6a1.1 1.1 0 1 0 0-2.2 1.1 1.1 0 0 0 0 2.2Z"
        clipRule="evenodd"
      />
    ),
  },
  info: {
    wrapper: 'border-sky-200 bg-sky-50 text-sky-900',
    icon: (
      <path
        fillRule="evenodd"
        d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 4a1 1 0 0 1 1 1v.5a1 1 0 1 1-2 0V7a1 1 0 0 1 1-1Zm1 12a1 1 0 1 1-2 0v-5a1 1 0 1 1 2 0v5Z"
        clipRule="evenodd"
      />
    ),
  },
}

export function Alert({ variant = 'info', title, children, onDismiss }) {
  const { wrapper, icon } = VARIANTS[variant] ?? VARIANTS.info

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-sm ${wrapper}`}
    >
      <svg className="mt-0.5 h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
        {icon}
      </svg>
      <div className="flex-1 space-y-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <p className="leading-relaxed opacity-90">{children}</p> : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Fechar aviso"
          className="rounded-md p-1 transition hover:bg-black/5"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M6.3 5 5 6.3 8.7 10 5 13.7 6.3 15 10 11.3 13.7 15 15 13.7 11.3 10 15 6.3 13.7 5 10 8.7 6.3 5Z" />
          </svg>
        </button>
      ) : null}
    </div>
  )
}
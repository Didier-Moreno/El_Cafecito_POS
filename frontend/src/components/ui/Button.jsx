const VARIANTS = {
  primary:   'bg-cafe-medio text-white hover:bg-cafe-claro shadow-sm hover:shadow-md',
  secondary: 'bg-white text-cafe-oscuro border border-cafe-beige hover:bg-cafe-crema',
  danger:    'bg-red-500 text-white hover:bg-red-600 shadow-sm',
  ghost:     'text-cafe-medio hover:bg-cafe-crema',
}

const SIZES = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  disabled = false,
  className = '',
  ...props
}) {
  return (
    <button
      disabled={disabled}
      className={`
        inline-flex items-center gap-2 font-medium rounded-lg transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-cafe-medio/40
        disabled:opacity-50 disabled:cursor-not-allowed
        ${VARIANTS[variant]} ${SIZES[size]} ${className}
      `}
      {...props}
    >
      {Icon && <Icon size={size === 'sm' ? 14 : 16} strokeWidth={2} />}
      {children}
    </button>
  )
}

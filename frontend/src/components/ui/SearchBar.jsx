import { Search, X } from 'lucide-react'

export default function SearchBar({ value, onChange, placeholder = 'Buscar...', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <Search
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-cafe-claro pointer-events-none"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="
          w-full pl-9 pr-8 py-2 text-sm
          bg-white border border-cafe-beige rounded-lg
          text-cafe-oscuro placeholder:text-cafe-beige
          focus:outline-none focus:ring-2 focus:ring-cafe-medio/30 focus:border-cafe-claro
          transition-all duration-200
        "
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-cafe-beige hover:text-cafe-claro transition-colors"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}

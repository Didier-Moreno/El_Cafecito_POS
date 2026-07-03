import { useState, useEffect } from 'react'
import { Calendar, ChevronDown } from 'lucide-react'

export default function DateRangeSelector({ onChange }) {
  const [isOpen, setIsOpen] = useState(false)

  // Generar últimos 12 meses
  const months = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const year = d.getFullYear()
    const monthIndex = d.getMonth()
    
    const value = `${year}-${String(monthIndex + 1).padStart(2, '0')}` // e.g. "2024-03"
    
    // Primer y último día
    const start = new Date(year, monthIndex, 1)
    const end = new Date(year, monthIndex + 1, 0)
    
    // Formato mes y año
    const formatter = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' })
    const monthLabel = formatter.format(d)
    const capitalizedMonth = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)
    
    // Formato día/mes/año
    const formatStr = (date) => `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`
    
    months.push({ 
      value, 
      label: capitalizedMonth,
      dateRange: `${formatStr(start)} - ${formatStr(end)}`
    })
  }

  const [selectedMonth, setSelectedMonth] = useState(months[0].value)

  const applyMonth = (monthValue) => {
    setSelectedMonth(monthValue)
    setIsOpen(false)

    const [year, month] = monthValue.split('-').map(Number)
    
    // Primer día del mes
    const start = new Date(year, month - 1, 1)
    start.setHours(0, 0, 0, 0)
    
    // Último día del mes
    const end = new Date(year, month, 0) 
    end.setHours(23, 59, 59, 999)

    onChange(start.toISOString(), end.toISOString())
  }

  // Trigger inicial al montar
  useEffect(() => {
    applyMonth(selectedMonth)
  }, [])

  const selectedData = months.find(m => m.value === selectedMonth) || months[0]

  return (
    <div className="relative inline-block w-full sm:w-auto">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full sm:w-64 flex items-center justify-between gap-3 px-4 py-2 bg-white hover:bg-cafe-crema text-cafe-oscuro font-bold rounded-xl text-sm transition-colors border border-cafe-beige shadow-sm"
      >
        <div className="flex items-center gap-3">
          <Calendar size={18} className="text-cafe-medio" />
          <div className="flex flex-col items-start">
            <span className="text-sm font-black">{selectedData.label}</span>
            <span className="text-[10px] font-semibold text-cafe-claro">{selectedData.dateRange}</span>
          </div>
        </div>
        <ChevronDown size={16} className="text-cafe-claro transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-full sm:w-64 bg-white border border-cafe-beige rounded-xl shadow-lg z-50 py-1 max-h-80 overflow-y-auto">
          {months.map((m) => (
            <button
              key={m.value}
              onClick={() => applyMonth(m.value)}
              className={`w-full flex flex-col items-start px-4 py-2.5 hover:bg-cafe-crema transition-colors ${
                selectedMonth === m.value ? 'bg-cafe-crema/50 border-l-4 border-cafe-medio' : 'border-l-4 border-transparent'
              }`}
            >
              <span className={`text-sm ${selectedMonth === m.value ? 'text-cafe-oscuro font-black' : 'text-gray-700 font-bold'}`}>
                {m.label}
              </span>
              <span className="text-[10px] text-cafe-claro font-semibold mt-0.5">
                {m.dateRange}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

import { ArrowUp, ArrowDown } from 'lucide-react'
import LoadingSpinner from './LoadingSpinner'
import EmptyState from './EmptyState'

export default function Table({ columns, data, loading, emptyMessage = 'No hay datos', actions, sortConfig, onSort }) {
  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    )
  }

  if (!data || data.length === 0) {
    return <EmptyState message={emptyMessage} />
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-cafe-beige bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-cafe-crema border-b border-cafe-beige">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-left text-xs font-semibold text-cafe-claro uppercase tracking-wider whitespace-nowrap ${col.sortable ? 'cursor-pointer hover:bg-cafe-beige/40 transition-colors select-none' : ''}`}
                onClick={() => col.sortable && onSort && onSort(col.key)}
              >
                <div className="flex items-center gap-1">
                  {col.label}
                  {col.sortable && sortConfig?.key === col.key && (
                    sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-cafe-medio" /> : <ArrowDown size={14} className="text-cafe-medio" />
                  )}
                </div>
              </th>
            ))}
            {actions && (
              <th className="px-4 py-3 text-right text-xs font-semibold text-cafe-claro uppercase tracking-wider">
                Acciones
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-cafe-beige/40">
          {data.map((row, rowIdx) => (
            <tr
              key={row.id ?? rowIdx}
              className="hover:bg-cafe-crema/50 transition-colors"
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-cafe-oscuro whitespace-nowrap">
                  {col.render ? col.render(row[col.key], row) : row[col.key] ?? '—'}
                </td>
              ))}
              {actions && (
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {actions(row)}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

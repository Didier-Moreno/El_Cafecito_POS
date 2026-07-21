import { useState, useRef, useEffect } from 'react'
import { Receipt, Pencil, Check, X, Trash2 } from 'lucide-react'
import { formatPrecio } from '../../utils/format'

/**
 * NombreEditable — muestra el nombre de la cuenta y permite editarlo inline.
 */
function NombreEditable({ nombre, onGuardar }) {
  const [editando, setEditando] = useState(false)
  const [valor, setValor] = useState(nombre)
  const inputRef = useRef(null)

  useEffect(() => { setValor(nombre) }, [nombre])
  useEffect(() => { if (editando) inputRef.current?.focus() }, [editando])

  const confirmar = () => {
    setEditando(false)
    if (valor.trim() && valor.trim() !== nombre) {
      onGuardar(valor.trim())
    } else {
      setValor(nombre)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') confirmar()
    if (e.key === 'Escape') { setValor(nombre); setEditando(false) }
  }

  if (editando) {
    return (
      <div className="flex items-center gap-1 flex-1 min-w-0">
        <input
          ref={inputRef}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onBlur={confirmar}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 min-w-0 text-xs font-semibold text-cafe-oscuro bg-transparent border-b border-cafe-medio outline-none"
        />
        <button
          onClick={(e) => { e.stopPropagation(); confirmar() }}
          className="text-cafe-medio hover:text-cafe-claro flex-shrink-0"
        >
          <Check size={12} />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 flex-1 min-w-0">
      <span className="text-xs font-bold text-cafe-oscuro truncate flex-1 leading-none">{nombre}</span>
      <button
        onClick={(e) => { e.stopPropagation(); setEditando(true) }}
        className="text-cafe-claro/70 hover:text-cafe-medio flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Renombrar cuenta"
      >
        <Pencil size={11} />
      </button>
    </div>
  )
}

/**
 * CuentasPanel — panel lateral con transición suave que lista las cuentas abiertas.
 */
export default function CuentasPanel({ cuentas, cuentaActivaId, onSeleccionar, onRenombrar, onClose, onEliminar, isVisible }) {
  const hayUna = cuentas.length > 0

  return (
    <div
      style={{
        width: isVisible ? '13rem' : '0px',
        opacity: isVisible ? 1 : 0,
        borderLeftWidth: isVisible ? '1px' : '0px',
        transition: 'width 280ms cubic-bezier(0.4, 0, 0.2, 1), opacity 220ms ease, border-width 280ms ease',
      }}
      className="bg-white border-l border-cafe-beige/40 flex flex-col flex-shrink-0 overflow-hidden select-none"
    >
      {/* Wrapper interno con min-width para evitar el encogimiento del contenido durante la transición */}
      <div className="flex flex-col h-full min-w-[13rem]">
        {/* Header */}
        <div className="px-3.5 py-4 border-b border-cafe-beige/40 bg-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt size={15} className="text-cafe-claro flex-shrink-0" />
            <span className="font-bold text-cafe-oscuro text-xs tracking-wider uppercase">Cuentas</span>
            {hayUna && (
              <span className="bg-cafe-medio text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">
                {cuentas.length}
              </span>
            )}
          </div>
          {/* Botón cerrar panel */}
          <button
            onClick={onClose}
            title="Ocultar panel de cuentas"
            className="text-cafe-claro hover:text-cafe-oscuro transition-colors flex-shrink-0 p-1 rounded-lg hover:bg-cafe-crema"
          >
            <X size={14} />
          </button>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto scrollbar-thin py-3 space-y-2 px-3">
          {!hayUna ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8 px-2 border-2 border-dashed border-cafe-beige/30 rounded-2xl bg-cafe-crema/10">
              <Receipt size={24} className="text-cafe-beige/70 mb-2" strokeWidth={1.5} />
              <p className="text-[11px] text-cafe-claro font-medium leading-snug">
                Sin cuentas abiertas
              </p>
              <p className="text-[9px] text-cafe-beige mt-1 max-w-[10rem]">
                Usa "Guardar como cuenta" para archivar pedidos temporales.
              </p>
            </div>
          ) : (
            cuentas.map((cuenta) => {
              const activa = cuenta.id === cuentaActivaId
              const totalCuenta = cuenta.items.reduce((s, i) => s + i.precio * i.cantidad, 0)
              const totalItems = cuenta.items.reduce((s, i) => s + i.cantidad, 0)

              return (
                <button
                  key={cuenta.id}
                  onClick={() => onSeleccionar(cuenta.id)}
                  className={`w-full text-left rounded-xl px-3 py-3 transition-all group border flex flex-col relative ${
                    activa
                      ? 'bg-cafe-crema border-2 border-cafe-medio shadow-md'
                      : 'bg-cafe-crema border-transparent hover:border-cafe-beige/50 hover:bg-cafe-beige/20 hover:shadow-sm'
                  }`}
                >
                  {/* Nombre editable y eliminar */}
                  <div className="flex items-center justify-between w-full gap-1">
                    <NombreEditable
                      nombre={cuenta.nombre}
                      onGuardar={(n) => onRenombrar(cuenta.id, n)}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onEliminar(cuenta)
                      }}
                      className="text-red-400 hover:text-red-600 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-cafe-beige/20"
                      title="Eliminar cuenta"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>

                  {/* Stats */}
                  <div className="mt-2 flex items-baseline justify-between w-full">
                    <span className={`text-[10px] font-medium ${activa ? 'text-cafe-medio/80' : 'text-cafe-claro'}`}>
                      {totalItems} {totalItems === 1 ? 'item' : 'items'}
                    </span>
                    <span className={`text-xs font-extrabold ${activa ? 'text-cafe-medio' : 'text-cafe-oscuro'}`}>
                      ${formatPrecio(totalCuenta)}
                    </span>
                  </div>

                  {/* Indicador activo */}
                  {activa && (
                    <div className="mt-2 pt-1.5 border-t border-cafe-medio/10 flex items-center gap-1 w-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-cafe-medio animate-pulse inline-block" />
                      <span className="text-[9px] text-cafe-medio font-semibold tracking-wider uppercase">Cargada</span>
                    </div>
                  )}
                </button>
              )
            })
          )}
        </div>

        {/* Footer informativo */}
        {hayUna && (
          <div className="px-3 py-2.5 border-t border-cafe-beige/30 bg-cafe-crema/10">
            <p className="text-[9px] text-cafe-claro/80 text-center leading-tight">
              Haz clic en una cuenta para editarla o cobrarla.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

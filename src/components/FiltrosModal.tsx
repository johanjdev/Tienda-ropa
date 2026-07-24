"use client"

import { formatCOP } from "@/lib/format"

interface FiltrosModalProps {
  open: boolean
  onClose: () => void
  categoriasDb: Array<{ id_categoria: number; nombre_categoria: string }>
  search: string
  onSearchChange: (value: string) => void
  idCategoriaFiltro: number | null
  onCategoriaChange: (id: number | null) => void
  precioMax: number
  onPrecioChange: (precio: number) => void
  resultados: number
}

export default function FiltrosModal({
  open,
  onClose,
  categoriasDb,
  search,
  onSearchChange,
  idCategoriaFiltro,
  onCategoriaChange,
  precioMax,
  onPrecioChange,
  resultados,
}: FiltrosModalProps) {
  if (!open) return null

  const hasActiveFilters = search || idCategoriaFiltro !== null || precioMax < 1000000

  const clearAll = () => {
    onSearchChange("")
    onCategoriaChange(null)
    onPrecioChange(1000000)
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-b from-zinc-900 to-zinc-950 rounded-t-3xl border-t border-white/10 p-6 z-50 max-h-[85vh] overflow-y-auto lg:hidden shadow-2xl shadow-purple-950/30">

        {/* Indicador de arrastre */}
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <i className="ri-equalizer-line text-purple-400" aria-hidden />
            Filtros
          </h2>
          <div className="flex items-center gap-3">
            <span className="bg-purple-600/30 border border-purple-500/40 text-purple-300 px-3 py-1 rounded-full text-xs font-semibold tabular-nums">
              {resultados} resultados
            </span>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-all"
            >
              <i className="ri-close-line text-lg" />
            </button>
          </div>
        </div>

        {/* Buscador premium */}
        <div className="mb-6 space-y-2">
          <p className="text-xs uppercase tracking-wider text-white/50 font-semibold">
            Buscar
          </p>
          <div className="relative group">
            <i className="ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-purple-400 transition-colors" aria-hidden />
            <input
              type="text"
              placeholder="Buscar producto..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-10 py-3 text-sm text-white placeholder:text-zinc-600 outline-none transition-all duration-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
              >
                <i className="ri-close-circle-fill text-sm" />
              </button>
            )}
          </div>
        </div>

        {/* Categorías como pills */}
        <div className="mb-6 space-y-3">
          <p className="text-xs uppercase tracking-wider text-white/50 font-semibold">
            Categoría
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                onCategoriaChange(null)
              }}
              className={`px-4 py-2.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-300 border ${
                idCategoriaFiltro === null
                  ? "bg-gradient-to-r from-purple-600 to-purple-500 text-white border-purple-400 shadow-lg shadow-purple-500/25 scale-105"
                  : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:border-white/20"
              }`}
            >
              ✦ Todas
            </button>
            {categoriasDb.map((cat) => (
              <button
                key={cat.id_categoria}
                onClick={() => {
                  onCategoriaChange(cat.id_categoria)
                }}
                className={`px-4 py-2.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-300 border ${
                  idCategoriaFiltro === cat.id_categoria
                    ? "bg-gradient-to-r from-purple-600 to-purple-500 text-white border-purple-400 shadow-lg shadow-purple-500/25 scale-105"
                    : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:border-white/20"
                }`}
              >
                {cat.nombre_categoria}
              </button>
            ))}
          </div>
        </div>

        {/* Precio premium */}
        <div className="mb-6 space-y-3">
          <p className="text-xs uppercase tracking-wider text-white/50 font-semibold">
            Precio máximo
          </p>
          <div className="bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-zinc-500">{formatCOP(10000)}</span>
              <span className="text-xs text-zinc-500">{formatCOP(1000000)}</span>
            </div>
            <input
              type="range"
              min="10000"
              max="1000000"
              step="10000"
              value={precioMax}
              onChange={(e) => onPrecioChange(Number(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer h-2"
              style={{
                background: `linear-gradient(to right, #7c3aed ${((precioMax - 10000) / (1000000 - 10000)) * 100}%, rgba(255,255,255,0.1) ${((precioMax - 10000) / (1000000 - 10000)) * 100}%)`,
                borderRadius: '9999px',
              }}
            />
            <div className="mt-4 text-center">
              <span className="inline-block bg-purple-600/20 border border-purple-500/30 text-purple-200 px-4 py-2 rounded-xl text-lg font-black tabular-nums">
                {formatCOP(precioMax)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer con acciones */}
        <div className="flex gap-3 pt-2">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAll}
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2"
            >
              <i className="ri-refresh-line" />
              Limpiar
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-purple-500/25 hover:opacity-90 transition-all flex items-center justify-center gap-2"
          >
            Ver {resultados} productos
          </button>
        </div>
      </div>
    </>
  )
}

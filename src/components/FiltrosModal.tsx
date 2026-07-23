"use client"

import { useState } from "react"
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

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed bottom-0 left-0 right-0 bg-zinc-950 rounded-t-3xl border-t border-white/10 p-6 z-50 max-h-[85vh] overflow-y-auto lg:hidden">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black text-white">Filtros</h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition"
          >
            <i className="ri-close-line text-2xl" />
          </button>
        </div>

        {/* Buscador */}
        <div className="mb-6 space-y-2">
          <p className="text-xs uppercase tracking-wider text-white/50 font-semibold">
            Buscar
          </p>
          <input
            type="text"
            placeholder="Escribe aquí..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none transition focus:border-purple-500"
          />
        </div>

        {/* Categorías */}
        <div className="mb-6 space-y-3">
          <p className="text-xs uppercase tracking-wider text-white/50 font-semibold">
            Categoría
          </p>
          <div className="space-y-2">
            <button
              onClick={() => {
                onCategoriaChange(null)
                onClose()
              }}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition ${
                idCategoriaFiltro === null
                  ? "bg-purple-600 text-white border border-purple-500"
                  : "bg-white/5 text-white/70 border border-white/10"
              }`}
            >
              Todas
            </button>
            {categoriasDb.map((cat) => (
              <button
                key={cat.id_categoria}
                onClick={() => {
                  onCategoriaChange(cat.id_categoria)
                  onClose()
                }}
                className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition ${
                  idCategoriaFiltro === cat.id_categoria
                    ? "bg-purple-600 text-white border border-purple-500"
                    : "bg-white/5 text-white/70 border border-white/10"
                }`}
              >
                {cat.nombre_categoria}
              </button>
            ))}
          </div>
        </div>

        {/* Precio */}
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wider text-white/50 font-semibold">
            Precio máximo
          </p>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <input
              type="range"
              min="10000"
              max="1000000"
              step="10000"
              value={precioMax}
              onChange={(e) => onPrecioChange(Number(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer"
            />
            <p className="mt-3 text-sm font-semibold text-white">
              {formatCOP(precioMax)}
            </p>
          </div>
        </div>

        {/* Footer con resultados */}
        <div className="mt-8 p-4 bg-purple-600/20 border border-purple-500/30 rounded-lg text-center">
          <p className="text-sm text-purple-300 font-semibold">
            {resultados} productos encontrados
          </p>
        </div>
      </div>
    </>
  )
}

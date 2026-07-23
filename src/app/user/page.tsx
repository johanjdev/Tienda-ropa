"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useAuth } from "@/components/AuthProvider"
import { fetchProductosActivos, type CategoriaCatalogo } from "@/lib/fetch-productos"
import { loadCart, saveCart, type CartItem } from "@/lib/cart-storage"
import Link from "next/link"
import { formatCOP } from "@/lib/format"
import FiltrosModal from "@/components/FiltrosModal"

interface Producto {
  id_producto: number
  nombre: string
  descripcion: string
  precio: number
  imagen_url: string
  id_categoria?: number | null
  categoria?: string
  stock?: number
}

export default function Catalogo() {
  const { user } = useAuth()
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [categoriasDb, setCategoriasDb] = useState<CategoriaCatalogo[]>([])

  const [search, setSearch] = useState("")
  /** null = ver todas las categorías */
  const [idCategoriaFiltro, setIdCategoriaFiltro] = useState<number | null>(null)
  const [precioMax, setPrecioMax] = useState(1000000)
  const [activeTab, setActiveTab] = useState<"categoria" | "precio">("categoria")
  const [filtrosOpen, setFiltrosOpen] = useState(false)

  useEffect(() => {
    const fetchProductos = async () => {
      setLoadError(null)
      const { data, categorias, error } = await fetchProductosActivos()

      if (error) {
        console.error("Error cargando productos:", error)
        setLoadError(error)
      }

      setCategoriasDb(categorias)

      if (data.length) {
        setProductos(data as Producto[])
      } else if (!error) {
        setProductos([])
      }

      setLoading(false)
    }

    fetchProductos()
  }, [])

  const filtered = useMemo(() => {
    let resultado = [...productos]

    if (search) {
      resultado = resultado.filter((p) =>
        p.nombre.toLowerCase().includes(search.toLowerCase())
      )
    }

    if (idCategoriaFiltro !== null) {
      resultado = resultado.filter(
        (p) => Number(p.id_categoria) === idCategoriaFiltro
      )
    }

    resultado = resultado.filter((p) => p.precio <= precioMax)

    return resultado
  }, [search, idCategoriaFiltro, precioMax, productos])

  const nombrePorId = useMemo(() => {
    const m = new Map<number, string>()
    for (const c of categoriasDb) {
      m.set(c.id_categoria, c.nombre_categoria)
    }
    return m
  }, [categoriasDb])

  const etiquetaCategoriaProducto = (p: Producto) => {
    if (p.id_categoria != null) {
      const n = nombrePorId.get(Number(p.id_categoria))
      if (n) return n
    }
    return p.categoria?.trim() || "Sin categoría"
  }

  const nombreFiltroActivo =
    idCategoriaFiltro !== null
      ? nombrePorId.get(idCategoriaFiltro) ?? null
      : null

  const addToCart = useCallback(
    (producto: Producto) => {
      const keyId = user?.id ?? null
      const current = loadCart(keyId)
      const existing = current.find((c) => c.id_producto === producto.id_producto)
      let next: CartItem[]
      if (existing) {
        next = current.map((c) =>
          c.id_producto === producto.id_producto
            ? { ...c, cantidad: c.cantidad + 1 }
            : c
        )
      } else {
        next = [
          ...current,
          {
            id_producto: producto.id_producto,
            nombre: producto.nombre,
            precio: producto.precio,
            imagen_url: producto.imagen_url ?? null,
            cantidad: 1,
          },
        ]
      }
      saveCart(keyId, next)
    },
    [user]
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Cargando productos...
      </div>
    )
  }

  return (
    <>
      {/* MODAL DE FILTROS MOBILE */}
      <FiltrosModal
        open={filtrosOpen}
        onClose={() => setFiltrosOpen(false)}
        categoriasDb={categoriasDb}
        search={search}
        onSearchChange={setSearch}
        idCategoriaFiltro={idCategoriaFiltro}
        onCategoriaChange={setIdCategoriaFiltro}
        precioMax={precioMax}
        onPrecioChange={setPrecioMax}
        resultados={filtered.length}
      />

      <div className="min-h-screen bg-[#0a0a0a] text-white px-4 md:px-8 py-10">

        {loadError && (
          <div className="max-w-[1600px] mx-auto mb-6 rounded-2xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-100">
            <p className="font-semibold mb-1">No se pudieron cargar los productos</p>
            <p className="text-red-200/90">{loadError}</p>
          </div>
        )}

        {/* HEADER CON BOTÓN DE FILTROS */}
        <div className="max-w-[1600px] mx-auto mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-white mb-2">
              Productos
            </h1>
            <p className="text-white/50 text-lg">
              {filtered.length} {filtered.length === 1 ? "producto" : "productos"}
            </p>
          </div>
          <button
            onClick={() => setFiltrosOpen(true)}
            className="lg:hidden flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-semibold transition"
          >
            <i className="ri-filter-line text-xl" />
            Filtros
          </button>
        </div>

        {/* CONTENEDOR GENERAL */}
        <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row gap-6">

          {/* SIDEBAR - DESKTOP ONLY */}
          <aside className="hidden lg:block w-[340px] rounded-[24px] border border-white/10 bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 p-6 shadow-xl backdrop-blur-sm h-fit sticky top-24">

            <div className="mb-6">
              <h2 className="text-xl font-bold text-white mb-2">Filtros</h2>
              <div className="flex items-center justify-between">
                <p className="text-sm text-white/60">Resultados</p>
                <span className="inline-block bg-purple-600/30 border border-purple-500/40 text-purple-300 px-3 py-1 rounded-full text-xs font-semibold">
                  {filtered.length}
                </span>
              </div>
            </div>

            {/* BUSCADOR */}
            <div className="mb-6 space-y-2">
              <p className="text-xs uppercase tracking-wider text-white/50 font-semibold">
                Buscar
              </p>
              <input
                type="text"
                placeholder="Escribe aquí..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none transition focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30"
              />
            </div>

            {/* CATEGORÍAS CON CHIPS */}
            <div className="mb-6 space-y-3">
              <p className="text-xs uppercase tracking-wider text-white/50 font-semibold">
                Categoría
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => setIdCategoriaFiltro(null)}
                  className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition ${
                    idCategoriaFiltro === null
                      ? "bg-purple-600 text-white border border-purple-500"
                      : "bg-white/5 text-white/70 border border-white/10 hover:bg-white/10"
                  }`}
                >
                  Todas
                </button>
                {categoriasDb.map((cat) => (
                  <button
                    key={cat.id_categoria}
                    onClick={() => setIdCategoriaFiltro(cat.id_categoria)}
                    className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition ${
                      idCategoriaFiltro === cat.id_categoria
                        ? "bg-purple-600 text-white border border-purple-500"
                        : "bg-white/5 text-white/70 border border-white/10 hover:bg-white/10"
                    }`}
                  >
                    {cat.nombre_categoria}
                  </button>
                ))}
              </div>
            </div>

            {/* PRECIO */}
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
                  onChange={(e) => setPrecioMax(Number(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
                <p className="mt-3 text-sm font-semibold text-white">
                  {formatCOP(precioMax)}
                </p>
              </div>
            </div>
          </aside>

          {/* CONTENIDO */}
          <main className="flex-1 min-h-screen">

            {/* GRID */}
            {filtered.length === 0 ? (
              <div className="flex items-center justify-center min-h-[400px] rounded-2xl border border-white/10 bg-white/5">
                <div className="text-center">
                  <p className="text-white/60 text-lg font-medium">No se encontraron productos</p>
                  <p className="text-white/40 text-sm mt-2">Intenta con otros filtros</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">

                {filtered.map((producto) => (
                  <div
                    key={producto.id_producto}
                    className="group overflow-hidden rounded-xl sm:rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-purple-500/50 flex flex-col h-full"
                  >
                    <Link href={`/producto/${producto.id_producto}`} className="block overflow-hidden flex-1">
                      <div className="relative aspect-[3/4] w-full overflow-hidden bg-gradient-to-br from-zinc-900 to-zinc-950">
                        {producto.imagen_url ? (
                          <img
                            src={producto.imagen_url}
                            alt={producto.nombre}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-white/5 text-zinc-600 font-medium text-xs">
                            Sin imagen
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                    </Link>

                    <div className="p-3 sm:p-4 flex flex-col flex-1 justify-between">
                      <div className="mb-2 sm:mb-3">
                        <p className="text-xs uppercase tracking-wider text-purple-400/70 font-semibold line-clamp-1 mb-1">
                          {etiquetaCategoriaProducto(producto)}
                        </p>
                        <h3 className="text-xs sm:text-sm font-bold text-white leading-snug line-clamp-2 group-hover:text-purple-300 transition">
                          {producto.nombre}
                        </h3>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2 sm:pt-3 border-t border-white/10">
                        <p className="text-sm sm:text-lg font-black text-white">
                          {formatCOP(producto.precio)}
                        </p>
                        <button
                          type="button"
                          onClick={() => addToCart(producto)}
                          className="rounded-lg bg-purple-600 hover:bg-purple-700 px-2 sm:px-3 py-1.5 sm:py-2 text-xs font-bold text-white transition-colors duration-200 active:scale-95"
                        >
                          Añadir
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

              </div>
            )}
          </main>
        </div>
      </div>
    </>
  )
}

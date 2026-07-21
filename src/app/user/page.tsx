"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useAuth } from "@/components/AuthProvider"
import { fetchProductosActivos, type CategoriaCatalogo } from "@/lib/fetch-productos"
import { loadCart, saveCart, type CartItem } from "@/lib/cart-storage"
import Link from "next/link"
import { formatCOP } from "@/lib/format"

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
    <div className="min-h-screen bg-[#0a0a0a] text-white px-4 md:px-8 py-10">

      {loadError && (
        <div className="max-w-[1600px] mx-auto mb-6 rounded-2xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-100">
          <p className="font-semibold mb-1">No se pudieron cargar los productos</p>
          <p className="text-red-200/90">{loadError}</p>
        </div>
      )}

      {/* CONTENEDOR GENERAL */}
      <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row gap-8">

        {/* SIDEBAR */}
        <aside className="w-full lg:w-[280px] bg-zinc-950 border border-white/10 rounded-3xl p-6 h-fit sticky top-28">

          <h2 className="text-xl font-bold mb-8">
            Filtros
          </h2>

          {/* BUSCADOR */}
          <div className="mb-8">
            <p className="text-sm uppercase tracking-widest text-white/40 mb-3">
              Buscar
            </p>

            <input
              type="text"
              placeholder="Buscar producto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="
                w-full
                bg-black
                border
                border-white/10
                rounded-xl
                px-4
                py-3
                outline-none
                focus:border-purple-500
                transition
              "
            />
          </div>

          {/* CATEGORÍAS */}
          <div className="mb-8">
            <p className="text-sm uppercase tracking-widest text-white/40 mb-4">
              Categorías
            </p>

            <select
              value={idCategoriaFiltro ?? ""}
              onChange={(e) =>
                setIdCategoriaFiltro(
                  e.target.value === "" ? null : Number(e.target.value)
                )
              }
              className="
                w-full
                px-4
                py-3
                rounded-xl
                bg-black
                border
                border-white/10
                text-white
                focus:outline-none
                focus:border-purple-500
              "
            >
              <option value="">Todos</option>

              {categoriasDb.map((cat) => (
                <option
                  key={cat.id_categoria}
                  value={cat.id_categoria}
                >
                  {cat.nombre_categoria}
                </option>
              ))}
            </select>
          </div>

          {/* PRECIO */}
          <div className="mb-4">
            <p className="text-sm uppercase tracking-widest text-white/40 mb-4">
              Precio máximo
            </p>

            <input
              type="range"
              min="10000"
              max="1000000"
              step="10000"
              value={precioMax}
              onChange={(e) =>
                setPrecioMax(Number(e.target.value))
              }
              className="w-full accent-purple-500"
            />

            <p className="mt-3 text-white/70">
              ${new Intl.NumberFormat("es-CO").format(precioMax)}
            </p>
          </div>
        </aside>

        {/* CONTENIDO */}
        <main className="flex-1">

          {/* HEADER */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">

            <div>
              <h1 className="text-4xl font-black mb-2">
                Catálogo
              </h1>

              <p className="text-white/50">
                {filtered.length} productos
              </p>
            </div>

            {/* TAGS ACTIVOS */}
            <div className="flex flex-wrap gap-3">

              {nombreFiltroActivo && (
                <div className="bg-purple-600/20 border border-purple-500/30 text-purple-300 px-4 py-2 rounded-full text-sm capitalize">
                  {nombreFiltroActivo}
                </div>
              )}

              {search && (
                <div className="bg-white/10 border border-white/10 px-4 py-2 rounded-full text-sm">
                  {search}
                </div>
              )}
            </div>
          </div>

          {/* GRID */}
          {filtered.length === 0 ? (
            <div className="bg-zinc-950 border border-white/10 rounded-3xl p-10 text-center text-white/50">
              No se encontraron productos
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">

              {filtered.map((producto) => (
                <div
                  key={producto.id_producto}
                  className="group overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/70 shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-purple-500/30"
                >
                  <Link href={`/producto/${producto.id_producto}`} className="block overflow-hidden">
                    <div className="relative aspect-[4/5] w-full overflow-hidden bg-zinc-900">
                      {producto.imagen_url ? (
                        <img
                          src={producto.imagen_url}
                          alt={producto.nombre}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-white/5 text-zinc-500">
                          Sin imagen
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
                      <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                        <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                          {etiquetaCategoriaProducto(producto)}
                        </p>
                        <h3 className="mt-3 text-2xl font-black leading-tight">
                          {producto.nombre}
                        </h3>
                        <p className="mt-2 text-sm text-white/70 line-clamp-2">
                          {producto.descripcion}
                        </p>
                      </div>
                    </div>
                  </Link>

                  <div className="p-5">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-2xl font-black text-white">
                        {formatCOP(producto.precio)}
                      </p>
                      <button
                        type="button"
                        onClick={() => addToCart(producto)}
                        className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90"
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
  )
}

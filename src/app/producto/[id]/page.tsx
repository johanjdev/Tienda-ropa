"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useAuth } from "@/components/AuthProvider"
import { formatCOP } from "@/lib/format"
import { loadCart, saveCart, type CartItem } from "@/lib/cart-storage"

type ProductoDetalleRaw = {
  id_producto: number
  nombre: string
  descripcion: string | null
  precio: number
  imagen_url: string | null
  stock: number | null
  estado: string | null
  tallas?: string | null
  colores?: string | null
  imagenes_adicionales?: string | null
  categorias?: { nombre_categoria?: string | null } | null
}

type ProductoDetalle = {
  id_producto: number
  nombre: string
  descripcion: string | null
  precio: number
  imagen_url: string | null
  stock: number | null
  estado: string | null
  tallas?: string[] | null
  colores?: string[] | null
  imagenes_adicionales?: string[] | null
  categorias?: { nombre_categoria?: string | null } | null
}


export default function ProductoPage() {
  const params = useParams()
  const id = typeof params?.id === "string" ? params.id : ""
  const { user } = useAuth()
  const [producto, setProducto] = useState<ProductoDetalle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [added, setAdded] = useState(false)
  
  const [selectedTalla, setSelectedTalla] = useState<string | null>(null)
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

  const [tallaError, setTallaError] = useState(false)
  const [colorError, setColorError] = useState(false)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/productos/${id}`, { cache: "no-store" })
      const body = (await res.json()) as { data?: ProductoDetalleRaw; error?: string }
      if (cancelled) return
      if (!res.ok || !body.data) {
        setError(body.error || "No se pudo obtener el producto.")
        setLoading(false)
        return
      }

      const p = body.data
      const parsed: ProductoDetalle = {
        id_producto: p.id_producto,
        nombre: p.nombre,
        descripcion: p.descripcion,
        precio: p.precio,
        imagen_url: p.imagen_url,
        stock: p.stock,
        estado: p.estado,
        tallas: p.tallas ? p.tallas.split(",").map((s) => s.trim()).filter(Boolean) : null,
        colores: p.colores ? p.colores.split(",").map((s) => s.trim()).filter(Boolean) : null,
        imagenes_adicionales: p.imagenes_adicionales
          ? p.imagenes_adicionales.split("|").map((s) => s.trim()).filter(Boolean)
          : null,
      }
      setProducto(parsed)
      setLoading(false)
    }
    if (id) void run()
    return () => {
      cancelled = true
    }
  }, [id])

  const disponible =
    producto?.estado?.toLowerCase() !== "inactivo" &&
    Number(producto?.stock ?? 1) > 0

  const todosImagenes = useMemo(() => {
    if (!producto) return []
    const imgs: string[] = []
    if (producto.imagen_url) imgs.push(producto.imagen_url)
    if (producto.imagenes_adicionales && Array.isArray(producto.imagenes_adicionales)) {
      imgs.push(...producto.imagenes_adicionales)
    }
    return imgs.filter(Boolean)
  }, [producto])

  const imagenActual = todosImagenes[selectedImageIndex] || producto?.imagen_url

  const addToCart = useCallback(() => {
    if (!producto || !disponible) return

    // Validar si requiere talla y no está seleccionada
    const necesitaTalla = producto.tallas && producto.tallas.length > 0
    if (necesitaTalla && !selectedTalla) {
      setTallaError(true)
      return
    }

    // Validar si requiere color y no está seleccionado
    const necesitaColor = producto.colores && producto.colores.length > 0
    if (necesitaColor && !selectedColor) {
      setColorError(true)
      return
    }

    const keyId = user?.id ?? null
    const current = loadCart(keyId)
    
    // Comparar por id, talla y color
    const existingIndex = current.findIndex(
      (c) =>
        c.id_producto === producto.id_producto &&
        (c.talla || null) === (selectedTalla || null) &&
        (c.color || null) === (selectedColor || null)
    )

    let next: CartItem[]
    if (existingIndex > -1) {
      next = current.map((c, idx) =>
        idx === existingIndex
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
          imagen_url: producto.imagen_url,
          cantidad: 1,
          talla: selectedTalla,
          color: selectedColor,
        },
      ]
    }
    saveCart(keyId, next)
    setAdded(true)
    window.setTimeout(() => setAdded(false), 1800)
  }, [disponible, producto, user?.id, selectedTalla, selectedColor])


  if (loading) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-white grid place-items-center">
        Cargando producto...
      </main>
    )
  }

  if (error || !producto) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-white grid place-items-center px-4">
        <div className="max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-8 text-center">
          <p className="text-red-300 mb-6">{error || "Producto no disponible."}</p>
          <Link href="/user" className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-black">
            Volver al catalogo
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white px-4 md:px-8 py-8">
      <div className="mx-auto max-w-7xl">

        {/* Breadcrumb / Volver */}
        <Link href="/user" className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors">
          <i className="ri-arrow-left-s-line text-lg" />
          Volver al catálogo
        </Link>

        <div className="grid gap-8 lg:grid-cols-[auto_1fr_1fr] mt-4">

          {/* ── MINIATURAS VERTICALES (estilo Nike) ──────────────── */}
          {todosImagenes.length > 1 && (
            <div className="hidden lg:flex flex-col gap-2 w-[76px]">
              {todosImagenes.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`w-[76px] h-[76px] rounded-lg border-2 overflow-hidden transition-all duration-200 flex-shrink-0 ${
                    selectedImageIndex === idx
                      ? "border-black ring-2 ring-black/20 opacity-100"
                      : "border-white/10 opacity-60 hover:opacity-100 hover:border-white/30"
                  }`}
                >
                  <img src={img} alt={`Vista ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* ── IMAGEN PRINCIPAL ─────────────────────────────────── */}
          <section className="relative">
            <div className="relative w-full bg-zinc-900/50 rounded-2xl border border-white/10 overflow-hidden aspect-square lg:aspect-[4/5]">
              {imagenActual ? (
                <img
                  src={imagenActual}
                  alt={producto?.nombre}
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-zinc-600">
                  <i className="ri-image-line text-6xl" />
                </div>
              )}
            </div>

            {/* Miniaturas horizontales en móvil */}
            {todosImagenes.length > 1 && (
              <div className="flex lg:hidden gap-2 mt-3 overflow-x-auto pb-2">
                {todosImagenes.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg border-2 overflow-hidden transition-all ${
                      selectedImageIndex === idx
                        ? "border-white opacity-100"
                        : "border-white/10 opacity-50 hover:opacity-100"
                    }`}
                  >
                    <img src={img} alt={`Vista ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* ── DETALLES DEL PRODUCTO (estilo Nike) ──────────────── */}
          <section className="flex flex-col lg:pl-4">

            {/* Categoría */}
            <p className="text-sm text-zinc-400 mb-1">
              {producto?.categorias?.nombre_categoria || "Lo más nuevo"}
            </p>

            {/* Nombre */}
            <h1 className="text-2xl md:text-3xl font-black text-white leading-tight mb-2">
              {producto?.nombre}
            </h1>

            {/* Precio */}
            <p className="text-xl font-bold text-white mb-6">
              {formatCOP(producto?.precio ?? 0)}
            </p>

            {/* ── COLORES ──────────────────────────────────────── */}
            {producto?.colores && Array.isArray(producto.colores) && producto.colores.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-zinc-400">
                    Color: <span className="text-white font-semibold">{selectedColor || "Selecciona uno"}</span>
                  </p>
                  {colorError && (
                    <span className="text-xs text-red-500 font-semibold animate-pulse">
                      * Por favor selecciona un color
                    </span>
                  )}
                </div>
                <div className={`flex flex-wrap gap-2 p-1 rounded-xl transition ${colorError ? "ring-2 ring-red-500/50" : ""}`}>
                  {producto.colores.map((color) => (
                    <button
                      key={color}
                      onClick={() => {
                        setSelectedColor(color)
                        setColorError(false)
                      }}
                      className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 border ${
                        selectedColor === color
                          ? "bg-white text-black border-white font-bold"
                          : "bg-transparent text-white/80 border-white/20 hover:border-white/50"
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── TALLAS (grilla estilo Nike) ──────────────────── */}
            {producto?.tallas && Array.isArray(producto.tallas) && producto.tallas.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-white">
                    Selecciona la Talla {selectedTalla && <span className="text-zinc-400 font-normal">({selectedTalla})</span>}
                  </p>
                  {tallaError ? (
                    <span className="text-xs text-red-500 font-semibold animate-pulse">
                      * Por favor selecciona una talla
                    </span>
                  ) : (
                    <button type="button" className="text-xs text-zinc-400 hover:text-white underline transition-colors">
                      Guía de tallas
                    </button>
                  )}
                </div>
                <div className={`grid grid-cols-4 sm:grid-cols-5 gap-2 p-1 rounded-xl transition ${tallaError ? "ring-2 ring-red-500/50" : ""}`}>
                  {producto.tallas.map((talla) => (
                    <button
                      key={talla}
                      onClick={() => {
                        setSelectedTalla(talla)
                        setTallaError(false)
                      }}
                      className={`py-3 rounded-lg border text-sm font-medium text-center transition-all duration-200 ${
                        selectedTalla === talla
                          ? "bg-white text-black border-white font-bold shadow-md"
                          : "bg-transparent text-white border-white/20 hover:border-white/60"
                      }`}
                    >
                      {talla}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Descripción */}
            {producto?.descripcion && (
              <div className="mb-6">
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {producto.descripcion}
                </p>
              </div>
            )}

            {/* Estado / Disponibilidad */}
            <div className="mb-6 flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${disponible ? "bg-green-500" : "bg-red-500"}`} />
              <span className={`text-sm ${disponible ? "text-green-400" : "text-red-400"}`}>
                {disponible ? "Disponible" : "Agotado"}
              </span>
              {producto?.stock != null && disponible && (
                <span className="text-xs text-zinc-500 ml-2">
                  ({producto.stock} en stock)
                </span>
              )}
            </div>

            {/* ── BOTONES (estilo Nike) ─────────────────────────── */}
            <div className="space-y-3 mt-auto">
              <button
                type="button"
                disabled={!disponible}
                onClick={addToCart}
                className={`w-full rounded-full px-6 py-4 text-base font-bold transition-all duration-300 ${
                  added
                    ? "bg-green-600 text-white border border-green-500"
                    : "bg-white text-black hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed"
                }`}
              >
                {added ? (
                  <span className="inline-flex items-center gap-2">
                    <i className="ri-check-line text-lg" />
                    Agregado al carrito
                  </span>
                ) : (
                  "Agregar a la bolsa de compras"
                )}
              </button>
              <Link
                href="/cart"
                className="inline-flex w-full items-center justify-center rounded-full border-2 border-white/20 px-6 py-4 text-base font-bold text-white transition-all duration-300 hover:border-white/50 hover:bg-white/5"
              >
                Ver carrito
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}

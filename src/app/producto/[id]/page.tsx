"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useAuth } from "@/components/AuthProvider"
import { formatCOP } from "@/lib/format"
import { loadCart, saveCart, type CartItem } from "@/lib/cart-storage"

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

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/productos/${id}`, { cache: "no-store" })
      const body = (await res.json()) as { data?: ProductoDetalle; error?: string }
      if (cancelled) return
      if (!res.ok || !body.data) {
        setError(body.error || "No se pudo cargar el producto.")
        setProducto(null)
      } else {
        setProducto(body.data)
        if (body.data.tallas?.length) setSelectedTalla(body.data.tallas[0])
        if (body.data.colores?.length) setSelectedColor(body.data.colores[0])
      }
      setLoading(false)
    }
    if (id) void run()
    return () => {
      cancelled = true
    }
  }, [id])

  const disponible = useMemo(
    () => producto?.estado !== "inactivo" && Number(producto?.stock ?? 1) > 0,
    [producto]
  )

  const todosImagenes = useMemo(() => {
    if (!producto) return []
    const imgs = [producto.imagen_url]
    if (producto.imagenes_adicionales?.length) {
      imgs.push(...producto.imagenes_adicionales)
    }
    return imgs.filter(Boolean) as string[]
  }, [producto])

  const imagenActual = todosImagenes[selectedImageIndex] || producto?.imagen_url

  const addToCart = useCallback(() => {
    if (!producto || !disponible) return
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
          imagen_url: producto.imagen_url,
          cantidad: 1,
        },
      ]
    }
    saveCart(keyId, next)
    setAdded(true)
    window.setTimeout(() => setAdded(false), 1800)
  }, [disponible, producto, user?.id])

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
    <main className="min-h-screen bg-[#0a0a0a] text-white px-4 md:px-8 py-10">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2">
        
        {/* GALERÍA IZQUIERDA */}
        <section className="space-y-4">
          {/* Imagen principal */}
          <div className="relative w-full bg-zinc-950 rounded-2xl border border-white/10 overflow-hidden aspect-[3/4]">
            {imagenActual ? (
              <img
                src={imagenActual}
                alt={producto?.nombre}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-zinc-600">
                <i className="ri-image-line text-6xl" />
              </div>
            )}
          </div>

          {/* Miniaturas */}
          {todosImagenes.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {todosImagenes.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`flex-shrink-0 w-20 h-28 rounded-lg border-2 overflow-hidden transition ${
                    selectedImageIndex === idx
                      ? "border-purple-500"
                      : "border-white/10 hover:border-white/30"
                  }`}
                >
                  <img src={img} alt={`Imagen ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* DETALLES DERECHA */}
        <section className="flex flex-col justify-start">
          <Link href="/user" className="mb-8 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white w-fit">
            <i className="ri-arrow-left-line" />
            Volver
          </Link>

          <p className="text-sm uppercase tracking-widest text-orange-500 font-bold mb-2">
            {producto?.categorias?.nombre_categoria || "Lo más nuevo"}
          </p>

          <h1 className="text-3xl md:text-4xl font-black mb-1">{producto?.nombre}</h1>
          <p className="text-3xl font-black text-white mb-6">{formatCOP(producto?.precio ?? 0)}</p>

          {/* Descripción */}
          <p className="text-sm text-zinc-400 mb-8 leading-relaxed">
            {producto?.descripcion || "Sin descripción disponible."}
          </p>

          {/* TALLAS */}
          {producto?.tallas && producto.tallas.length > 0 && (
            <div className="mb-8">
              <p className="text-sm font-semibold text-white mb-3">Selecciona la Talla</p>
              <div className="flex flex-wrap gap-2">
                {producto.tallas.map((talla) => (
                  <button
                    key={talla}
                    onClick={() => setSelectedTalla(talla)}
                    className={`px-4 py-2 rounded-lg border-2 text-sm font-semibold transition ${
                      selectedTalla === talla
                        ? "bg-white text-black border-white"
                        : "border-white/30 text-white hover:border-white/50"
                    }`}
                  >
                    {talla}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* COLORES */}
          {producto?.colores && producto.colores.length > 0 && (
            <div className="mb-8">
              <p className="text-sm font-semibold text-white mb-3">Color</p>
              <div className="flex flex-wrap gap-2">
                {producto.colores.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`px-4 py-2 rounded-lg border-2 text-sm font-semibold transition ${
                      selectedColor === color
                        ? "bg-white text-black border-white"
                        : "border-white/30 text-white hover:border-white/50"
                    }`}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* INFO STOCK */}
          <div className="mb-8 flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              <div className={`w-3 h-3 rounded-full ${disponible ? "bg-green-500" : "bg-red-500"}`} />
              <span className={disponible ? "text-green-400" : "text-red-400"}>
                {disponible ? "Disponible" : "Agotado"}
              </span>
            </div>
          </div>

          {/* BOTONES */}
          <div className="space-y-3">
            <button
              type="button"
              disabled={!disponible}
              onClick={addToCart}
              className="w-full rounded-full bg-black text-white px-6 py-3 font-bold text-lg transition hover:bg-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed border border-white/20"
            >
              {added ? "✓ Agregado al carrito" : "Agregar a la bolsa de compras"}
            </button>
            <Link
              href="/cart"
              className="inline-block w-full text-center rounded-full border border-white/20 px-6 py-3 font-bold transition hover:bg-white/5"
            >
              Ver carrito
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}

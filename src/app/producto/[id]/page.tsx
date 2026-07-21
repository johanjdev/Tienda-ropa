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
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950">
          {producto.imagen_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={producto.imagen_url}
              alt={producto.nombre}
              className="h-[420px] w-full object-cover md:h-[640px]"
            />
          ) : (
            <div className="grid h-[420px] place-items-center text-zinc-600 md:h-[640px]">
              <i className="ri-image-line text-6xl" aria-hidden />
            </div>
          )}
        </section>

        <section className="flex flex-col justify-center">
          <Link href="/user" className="mb-8 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
            <i className="ri-arrow-left-line" aria-hidden />
            Volver al catalogo
          </Link>
          <p className="mb-3 text-sm uppercase tracking-widest text-purple-300">
            {producto.categorias?.nombre_categoria || "Producto"}
          </p>
          <h1 className="text-4xl font-black tracking-tight md:text-5xl">{producto.nombre}</h1>
          <p className="mt-5 text-3xl font-black">{formatCOP(producto.precio)}</p>
          <p className="mt-6 leading-7 text-zinc-400">
            {producto.descripcion || "Sin descripcion disponible."}
          </p>

          <div className="mt-8 grid gap-3 text-sm text-zinc-400 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-zinc-950 p-4">
              <p className="text-zinc-500">Disponibilidad</p>
              <p className="mt-1 font-semibold text-white">
                {disponible ? "Disponible" : "Agotado"}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-zinc-950 p-4">
              <p className="text-zinc-500">Stock</p>
              <p className="mt-1 font-semibold text-white">{producto.stock ?? "Sin dato"}</p>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              disabled={!disponible}
              onClick={addToCart}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-semibold text-black transition hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <i className="ri-shopping-cart-2-line" aria-hidden />
              {added ? "Agregado" : "Agregar al carrito"}
            </button>
            <Link
              href="/cart"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-7 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              <i className="ri-bank-card-line" aria-hidden />
              Ir a pagar
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}

"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { formatCOP } from "@/lib/format"

type CarritoProducto = {
  id_producto: number
  cantidad: number
  productos?: { nombre: string | null; precio: number | null; imagen_url: string | null } | null
}

type Carrito = {
  id_carrito: number
  id_usuario: number
  fecha_creacion?: string | null
  usuarios?: { nombre: string | null; email: string | null; telefono: string | null } | null
  carrito_productos?: CarritoProducto[]
}

export default function AdminCarritosPage() {
  const [carritos, setCarritos] = useState<Carrito[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const res = await fetch("/api/admin/carritos", {
        cache: "no-store",
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      })
      const body = await res.json()
      if (cancelled) return
      if (!res.ok) {
        setError(body.error || "No se pudieron cargar carritos.")
        setCarritos([])
      } else {
        setCarritos(body.carritos || [])
      }
      setLoading(false)
    }

    queueMicrotask(() => void load())
    return () => {
      cancelled = true
    }
  }, [])

  const activeCarts = useMemo(
    () => carritos.filter((cart) => (cart.carrito_productos || []).length > 0).length,
    [carritos]
  )

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-widest text-zinc-500">Seguimiento</p>
        <h1 className="mt-1 text-3xl font-black text-white">Carritos de usuarios</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Carritos sincronizados desde el navegador de cada usuario autenticado.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-5">
          <p className="text-xs uppercase tracking-widest text-zinc-500">Carritos sincronizados</p>
          <p className="mt-3 text-2xl font-black text-white">{carritos.length}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-5">
          <p className="text-xs uppercase tracking-widest text-zinc-500">Con productos</p>
          <p className="mt-3 text-2xl font-black text-white">{activeCarts}</p>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 px-4 py-3 text-sm text-amber-100">
          {error}
        </div>
      )}

      {loading ? (
        <div className="h-48 rounded-2xl border border-white/10 bg-zinc-900/40 animate-pulse" />
      ) : carritos.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-zinc-950/50 p-10 text-center text-sm text-zinc-500">
          Todavia no hay carritos sincronizados.
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {carritos.map((carrito) => {
            const items = carrito.carrito_productos || []
            const total = items.reduce(
              (acc, item) => acc + Number(item.productos?.precio || 0) * Number(item.cantidad || 0),
              0
            )

            return (
              <article key={carrito.id_carrito} className="rounded-2xl border border-white/10 bg-zinc-950/60 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-black text-white">Carrito #{carrito.id_carrito}</h2>
                    <p className="mt-2 text-sm text-zinc-400">
                      {carrito.usuarios?.nombre || "Usuario"} - {carrito.usuarios?.email || "Sin email"}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">{carrito.usuarios?.telefono || "Sin telefono"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-widest text-zinc-500">Total</p>
                    <p className="mt-1 text-xl font-black text-white">{formatCOP(total)}</p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {items.length === 0 ? (
                    <p className="rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-zinc-500">
                      Carrito vacio.
                    </p>
                  ) : (
                    items.map((item) => (
                      <div key={`${carrito.id_carrito}-${item.id_producto}`} className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/30 p-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">
                            {item.productos?.nombre || `Producto ${item.id_producto}`}
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            {item.cantidad} x {formatCOP(Number(item.productos?.precio || 0))}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-bold text-zinc-100">
                          {formatCOP(Number(item.productos?.precio || 0) * Number(item.cantidad || 0))}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

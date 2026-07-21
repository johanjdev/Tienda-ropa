"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { formatCOP } from "@/lib/format"

type Usuario = {
  nombre: string | null
  email: string | null
  telefono: string | null
}

type Detalle = {
  id_detalle?: number
  id_producto: number
  cantidad: number
  precio_unitario: number
  subtotal: number
  productos?: { nombre: string | null; imagen_url: string | null } | null
}

type Pedido = {
  id_pedido: number
  id_usuario: number
  direccion_envio: string | null
  estado: string | null
  total: number
  fecha_pedido?: string | null
  numero_guia?: string | null
  transportadora?: string | null
  usuarios?: Usuario | null
  detalle_pedidos?: Detalle[]
}

export default function AdminPedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [productoMasPedido, setProductoMasPedido] = useState<{ nombre: string; cantidad: number } | null>(null)
  const [productoMenosPedido, setProductoMenosPedido] = useState<{ nombre: string; cantidad: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<number | null>(null)

  const loadPedidos = async (cancelledRef?: { current: boolean }) => {
      setLoading(true)
      setError(null)
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const res = await fetch("/api/admin/pedidos", {
        cache: "no-store",
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      })
      const body = await res.json()
      if (cancelledRef?.current) return
      if (!res.ok) {
        setError(body.error || "No se pudieron cargar pedidos.")
        setPedidos([])
      } else {
        setPedidos(body.pedidos || [])
        setProductoMasPedido(body.productoMasPedido || null)
        setProductoMenosPedido(body.productoMenosPedido || null)
      }
      setLoading(false)
    }

  useEffect(() => {
    const cancelledRef = { current: false }

    queueMicrotask(() => void loadPedidos(cancelledRef))
    return () => {
      cancelledRef.current = true
    }
  }, [])

  const totalVendido = useMemo(
    () => pedidos.reduce((acc, pedido) => acc + Number(pedido.total || 0), 0),
    [pedidos]
  )

  const updatePedido = async (pedido: Pedido, cambios: Partial<Pick<Pedido, "estado" | "numero_guia" | "transportadora">>) => {
    setSavingId(pedido.id_pedido)
    setError(null)
    const {
      data: { session },
    } = await supabase.auth.getSession()

    const res = await fetch("/api/admin/pedidos", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({
        id_pedido: pedido.id_pedido,
        estado: cambios.estado ?? pedido.estado ?? "pendiente",
        numero_guia: cambios.numero_guia ?? pedido.numero_guia ?? "",
        transportadora: cambios.transportadora ?? pedido.transportadora ?? "",
      }),
    })
    const body = await res.json()
    if (!res.ok) {
      setError(body.error || "No se pudo actualizar el pedido.")
    } else {
      setPedidos((prev) =>
        prev.map((item) =>
          item.id_pedido === pedido.id_pedido ? { ...item, ...cambios } : item
        )
      )
    }
    setSavingId(null)
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-widest text-zinc-500">Ventas</p>
        <h1 className="mt-1 text-3xl font-black text-white">Pedidos</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Revisa los pedidos creados desde la pasarela demo y sus productos.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <Stat label="Pedidos" value={String(pedidos.length)} icon="ri-shopping-bag-3-line" />
        <Stat label="Total registrado" value={formatCOP(totalVendido)} icon="ri-money-dollar-circle-line" />
        <Stat label="Mas pedido" value={productoMasPedido ? `${productoMasPedido.nombre} (${productoMasPedido.cantidad})` : "-"} icon="ri-fire-line" />
        <Stat label="Menos pedido" value={productoMenosPedido ? `${productoMenosPedido.nombre} (${productoMenosPedido.cantidad})` : "-"} icon="ri-leaf-line" />
      </section>

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 px-4 py-3 text-sm text-amber-100">
          {error}
        </div>
      )}

      {loading ? (
        <div className="h-48 rounded-2xl border border-white/10 bg-zinc-900/40 animate-pulse" />
      ) : pedidos.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-zinc-950/50 p-10 text-center text-sm text-zinc-500">
          Todavia no hay pedidos.
        </div>
      ) : (
        <div className="space-y-4">
          {pedidos.map((pedido) => (
            <article key={pedido.id_pedido} className="rounded-2xl border border-white/10 bg-zinc-950/60 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-lg font-black text-white">Pedido #{pedido.id_pedido}</h2>
                    <select
                      value={pedido.estado || "pendiente"}
                      disabled={savingId === pedido.id_pedido}
                      onChange={(e) => void updatePedido(pedido, { estado: e.target.value })}
                      className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-100 outline-none disabled:opacity-60"
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="enviado">Enviado</option>
                      <option value="entregado">Entregado</option>
                    </select>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                    <input
                      value={pedido.transportadora || ""}
                      onChange={(e) => setPedidos((prev) => prev.map((item) => item.id_pedido === pedido.id_pedido ? { ...item, transportadora: e.target.value } : item))}
                      placeholder="Transportadora"
                      className="rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-white outline-none focus:border-purple-500"
                    />
                    <input
                      value={pedido.numero_guia || ""}
                      onChange={(e) => setPedidos((prev) => prev.map((item) => item.id_pedido === pedido.id_pedido ? { ...item, numero_guia: e.target.value } : item))}
                      placeholder="Número de guía"
                      className="rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-white outline-none focus:border-purple-500"
                    />
                    <button
                      type="button"
                      disabled={savingId === pedido.id_pedido}
                      onClick={() => void updatePedido(pedido, {})}
                      className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-500 disabled:opacity-60"
                    >
                      {savingId === pedido.id_pedido ? "Guardando..." : "Guardar y notificar"}
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-zinc-400">
                    {pedido.usuarios?.nombre || "Usuario"} - {pedido.usuarios?.email || "Sin email"}
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">{pedido.usuarios?.telefono || "Sin telefono"}</p>
                  <p className="mt-3 max-w-2xl text-sm text-zinc-300">{pedido.direccion_envio || "Sin direccion"}</p>
                </div>
                <div className="text-left lg:text-right">
                  <p className="text-xs uppercase tracking-widest text-zinc-500">Total</p>
                  <p className="mt-1 text-2xl font-black text-white">{formatCOP(Number(pedido.total || 0))}</p>
                  {pedido.fecha_pedido && (
                    <p className="mt-1 text-xs text-zinc-500">
                      {new Date(pedido.fecha_pedido).toLocaleString("es-CO")}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-5 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-[10px] uppercase tracking-wider text-zinc-500">
                    <tr className="border-b border-white/10">
                      <th className="py-2 pr-3">Producto</th>
                      <th className="py-2 pr-3">Cantidad</th>
                      <th className="py-2 pr-3">Precio</th>
                      <th className="py-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(pedido.detalle_pedidos || []).map((detalle) => (
                      <tr key={`${pedido.id_pedido}-${detalle.id_producto}`} className="border-b border-white/5">
                        <td className="py-3 pr-3 text-white">{detalle.productos?.nombre || `Producto ${detalle.id_producto}`}</td>
                        <td className="py-3 pr-3 text-zinc-300">{detalle.cantidad}</td>
                        <td className="py-3 pr-3 text-zinc-300">{formatCOP(Number(detalle.precio_unitario || 0))}</td>
                        <td className="py-3 text-right font-semibold text-white">{formatCOP(Number(detalle.subtotal || 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-widest text-zinc-500">{label}</p>
        <i className={`${icon} text-xl text-purple-300`} aria-hidden />
      </div>
      <p className="mt-3 text-2xl font-black text-white">{value}</p>
    </div>
  )
}

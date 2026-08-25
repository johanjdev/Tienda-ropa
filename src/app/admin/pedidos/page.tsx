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
  novedad_detalle?: string | null
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
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null)

  const loadPedidos = async (cancelledRef?: { current: boolean }) => {
      setLoading(true)
      setError(null)
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const res = await fetch("/api/admin/pedidos", {
        method: "POST",
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

  const updatePedido = async (pedido: Pedido, cambios: Partial<Pick<Pedido, "estado" | "numero_guia" | "transportadora" | "novedad_detalle">>) => {
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
        novedad_detalle: cambios.novedad_detalle ?? pedido.novedad_detalle ?? "",
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
                    
                    <div className="relative">
                      <button
                        type="button"
                        disabled={savingId === pedido.id_pedido}
                        onClick={() => setOpenDropdownId(openDropdownId === pedido.id_pedido ? null : pedido.id_pedido)}
                        className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-black tracking-wider uppercase transition-all duration-300 ${
                          (pedido.estado || "pendiente") === "pendiente"
                            ? "border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                            : (pedido.estado || "pendiente") === "enviado"
                            ? "border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                            : (pedido.estado || "pendiente") === "entregado"
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                            : (pedido.estado || "pendiente") === "novedad"
                            ? "border-orange-500/30 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20"
                            : (pedido.estado || "pendiente") === "devuelto"
                            ? "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                            : "border-white/20 bg-white/10 text-white"
                        }`}
                      >
                        <span>
                          {pedido.estado === "pendiente" ? "Pendiente" :
                           pedido.estado === "enviado" ? "Enviado" :
                           pedido.estado === "entregado" ? "Entregado" :
                           pedido.estado === "novedad" ? "Novedad en transporte" :
                           pedido.estado === "devuelto" ? "Devuelto" :
                           pedido.estado || "Pendiente"}
                        </span>
                        <i className={`ri-arrow-down-s-line text-sm transition-transform duration-200 ${openDropdownId === pedido.id_pedido ? "rotate-180" : ""}`} />
                      </button>

                      {openDropdownId === pedido.id_pedido && (
                        <>
                          {/* Backdrop invisible para cerrar al dar clic fuera */}
                          <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => setOpenDropdownId(null)}
                          />
                          <ul className="absolute left-0 mt-2 w-56 rounded-xl border border-white/10 bg-zinc-950/95 p-1.5 shadow-2xl backdrop-blur-md z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                            {[
                              { val: "pendiente", label: "Pendiente", color: "bg-amber-400" },
                              { val: "enviado", label: "Enviado", color: "bg-blue-400" },
                              { val: "entregado", label: "Entregado", color: "bg-emerald-400" },
                              { val: "novedad", label: "Novedad en transporte", color: "bg-orange-400" },
                              { val: "devuelto", label: "Devuelto", color: "bg-red-400" },
                            ].map((opt) => (
                              <li key={opt.val}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    void updatePedido(pedido, { estado: opt.val })
                                    setOpenDropdownId(null)
                                  }}
                                  className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-left transition ${
                                    (pedido.estado || "pendiente") === opt.val
                                      ? "bg-white/10 text-white font-bold"
                                      : "text-zinc-400 hover:bg-white/5 hover:text-white"
                                  }`}
                                >
                                  <span className={`w-2 h-2 rounded-full ${opt.color}`} />
                                  <span>{opt.label}</span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-4 space-y-2 max-w-xl">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        value={pedido.transportadora || ""}
                        maxLength={80}
                        onChange={(e) => setPedidos((prev) => prev.map((item) => item.id_pedido === pedido.id_pedido ? { ...item, transportadora: e.target.value } : item))}
                        placeholder="Transportadora"
                        className="rounded-xl border border-white/10 bg-black/50 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-purple-500 transition"
                      />
                      <input
                        value={pedido.numero_guia || ""}
                        maxLength={60}
                        onChange={(e) => setPedidos((prev) => prev.map((item) => item.id_pedido === pedido.id_pedido ? { ...item, numero_guia: e.target.value } : item))}
                        placeholder="Número de guía"
                        className="rounded-xl border border-white/10 bg-black/50 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-purple-500 transition"
                      />
                    </div>
                    
                    <textarea
                      value={pedido.novedad_detalle || ""}
                      maxLength={300}
                      onChange={(e) => setPedidos((prev) => prev.map((item) => item.id_pedido === pedido.id_pedido ? { ...item, novedad_detalle: e.target.value } : item))}
                      placeholder="Detalle de novedad o transporte (visible para el cliente)..."
                      rows={2}
                      className="w-full rounded-xl border border-white/10 bg-black/50 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-purple-500 transition resize-none"
                    />

                    <button
                      type="button"
                      disabled={savingId === pedido.id_pedido}
                      onClick={() => void updatePedido(pedido, {})}
                      className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-purple-600 hover:bg-purple-700 px-6 py-2.5 text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-60 disabled:pointer-events-none"
                    >
                      {savingId === pedido.id_pedido ? (
                        <>
                          <i className="ri-loader-4-line animate-spin mr-2" />
                          Guardando...
                        </>
                      ) : (
                        "Guardar y notificar"
                      )}
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

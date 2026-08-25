"use client"

import React, { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Modal from "@/components/Modal"
import { useAuth } from "@/components/AuthProvider"
import { supabase } from "@/lib/supabase"
import { formatCOP } from "@/lib/format"

type DetalleProducto = {
  id_producto: number
  cantidad: number
  precio_unitario: number
  subtotal: number
  productos?: { nombre: string | null; imagen_url: string | null } | null
}

type PedidoDetalle = {
  id_pedido: number
  estado: string | null
  total: number
  fecha_pedido?: string | null
  detalle_pedidos?: DetalleProducto[]
}

function DevolucionContent() {
  const router = useRouter()
  const params = useSearchParams()
  const id_pedido = Number(params.get("id_pedido"))
  const id_producto = Number(params.get("id_producto"))
  const { profile } = useAuth()

  const [pedido, setPedido] = useState<PedidoDetalle | null>(null)
  const [detalle, setDetalle] = useState<DetalleProducto | null>(null)
  const [motivo, setMotivo] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorPage, setErrorPage] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [modalTitle, setModalTitle] = useState("")
  const [modalChildren, setModalChildren] = useState<React.ReactNode>(null)
  const [modalVariant, setModalVariant] = useState<"success" | "error" | "info">("success")
  const [modalOnClose, setModalOnClose] = useState<(() => void) | undefined>(undefined)

  const openModal = (title: string, msg: string, variant: "success" | "error" | "info", onClose?: () => void) => {
    setModalTitle(title)
    setModalChildren(<p className="text-zinc-300 text-sm text-center">{msg}</p>)
    setModalVariant(variant)
    setModalOnClose(() => onClose)
    setModalOpen(true)
  }

  useEffect(() => {
    if (!id_pedido || !id_producto) {
      setErrorPage("Parámetros de solicitud no válidos.")
      setLoading(false)
      return
    }
    const fetchPedido = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) { router.push("/login"); return }

      const res = await fetch(`/api/pedidos/${id_pedido}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      })
      if (!res.ok) { setErrorPage("No pudimos encontrar el pedido."); setLoading(false); return }

      const body = await res.json().catch(() => ({}))
      const pedidoData: PedidoDetalle = body.pedido
      if (!pedidoData) { setErrorPage("Pedido no encontrado."); setLoading(false); return }
      if (pedidoData.estado !== "entregado") {
        setErrorPage("Solo puedes solicitar devoluciones de pedidos entregados.")
        setLoading(false); return
      }
      const det = pedidoData.detalle_pedidos?.find((d) => d.id_producto === id_producto)
      if (!det) { setErrorPage("El producto no pertenece a este pedido."); setLoading(false); return }

      setPedido(pedidoData)
      setDetalle(det)
      setLoading(false)
    }
    void fetchPedido()
  }, [id_pedido, id_producto, router])

  const handleSubmit = async () => {
    if (!motivo.trim() || motivo.trim().length < 10) {
      openModal("Motivo requerido", "Por favor describe el motivo de la devolución (mínimo 10 caracteres).", "error")
      return
    }
    setSubmitting(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) { router.push("/login"); return }

    try {
      const res = await fetch("/api/devoluciones", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ accion: "crear", id_pedido, id_producto, motivo: motivo.trim() }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) { openModal("Error al solicitar", body.error || "Error inesperado.", "error"); setSubmitting(false); return }
      openModal("¡Solicitud registrada!", "Tu solicitud de devolución ha sido registrada. Nuestro equipo evaluará el caso y te notificará por correo en los próximos días hábiles.", "success", () => router.push("/cuenta"))
    } catch {
      openModal("Error de conexión", "No pudimos enviar tu solicitud. Intenta de nuevo.", "error")
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-400 text-sm">Cargando información del pedido...</p>
        </div>
      </div>
    )
  }

  if (errorPage) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <i className="ri-error-warning-line text-3xl text-red-400" />
          </div>
          <h1 className="text-xl font-black text-white mb-2">No disponible</h1>
          <p className="text-zinc-400 text-sm mb-6">{errorPage}</p>
          <Link href="/cuenta" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-semibold transition">
            <i className="ri-arrow-left-line" /> Volver a mi cuenta
          </Link>
        </div>
      </div>
    )
  }

  const imagenUrl = detalle?.productos?.imagen_url
  const nombreProducto = detalle?.productos?.nombre || `Producto #${id_producto}`

  return (
    <>
      <Modal open={modalOpen} title={modalTitle} variant={modalVariant} onClose={() => { setModalOpen(false); if (modalOnClose) modalOnClose() }}>
        {modalChildren}
      </Modal>

      <div className="min-h-screen bg-zinc-950 text-white">
        {/* Header sticky */}
        <header className="border-b border-white/5 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
            <Link href="/cuenta" className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition text-zinc-300">
              <i className="ri-arrow-left-line text-lg" />
            </Link>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Pedido #{id_pedido}</p>
              <h1 className="text-sm font-black text-white">Detalles de Devolución</h1>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-10">

          {/* Subtítulo */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-white mb-1">Detalles de Devolución</h2>
            <p className="text-sm text-zinc-400">Estos son los productos que has seleccionado para recogida</p>
          </div>

          {/* Layout de dos columnas */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">

            {/* ── COLUMNA IZQUIERDA ── */}
            <div className="space-y-4">

              {/* Tarjeta: Producto a devolver */}
              <div className="rounded-2xl border border-white/8 bg-zinc-900/60 overflow-hidden">
                <div className="px-5 py-3 border-b border-white/5 flex items-center gap-2">
                  <i className="ri-arrow-go-back-line text-purple-400" />
                  <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Producto a devolver</span>
                </div>
                <div className="p-5 flex items-center gap-4">
                  {/* Imagen */}
                  {imagenUrl ? (
                    <img src={imagenUrl} alt={nombreProducto} className="w-20 h-24 object-cover rounded-xl border border-white/10 flex-shrink-0" />
                  ) : (
                    <div className="w-20 h-24 rounded-xl bg-zinc-800 border border-white/10 flex items-center justify-center flex-shrink-0">
                      <i className="ri-t-shirt-2-line text-3xl text-zinc-600" />
                    </div>
                  )}
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-white text-base leading-tight mb-2">{nombreProducto}</p>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-zinc-400">
                        <i className="ri-stack-line text-zinc-500" />
                        Cantidad: <span className="text-white font-semibold">{detalle?.cantidad} unidad{(detalle?.cantidad ?? 1) > 1 ? "es" : ""}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-400">
                        <i className="ri-price-tag-3-line text-zinc-500" />
                        Precio unitario: <span className="text-white font-mono font-semibold">{formatCOP(detalle?.precio_unitario ?? 0)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-black text-white font-mono">{formatCOP(detalle?.subtotal ?? 0)}</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">subtotal</p>
                  </div>
                </div>
              </div>

              {/* Tarjeta: Motivo de devolución */}
              <div className="rounded-2xl border border-white/8 bg-zinc-900/60 overflow-hidden">
                <div className="px-5 py-3 border-b border-white/5 flex items-center gap-2">
                  <i className="ri-chat-3-line text-purple-400" />
                  <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Motivo de devolución</span>
                  <span className="text-red-400 text-xs ml-0.5">*</span>
                </div>
                <div className="p-5 space-y-3">
                  <p className="text-xs text-zinc-500">
                    Indícanos el motivo (talla incorrecta, defecto de fábrica, producto diferente al solicitado, etc.)
                  </p>
                  <textarea
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    maxLength={500}
                    rows={3}
                    placeholder="Describe aquí el motivo de la devolución..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-purple-500 transition resize-none"
                  />
                  <div className="flex justify-end">
                    <span className={`text-[10px] font-mono ${motivo.length > 450 ? "text-orange-400" : "text-zinc-600"}`}>
                      {motivo.length}/500
                    </span>
                  </div>
                </div>
              </div>

              {/* Avisos informativos */}
              <div className="space-y-3">
                {/* Dirección de recogida */}
                <div className="rounded-xl border border-purple-500/15 bg-purple-500/5 p-4 flex items-start gap-3">
                  <i className="ri-map-pin-2-line text-purple-400 text-lg mt-0.5 flex-shrink-0" />
                  <div className="text-xs space-y-1.5">
                    <p className="font-black text-purple-300 uppercase tracking-wider text-[10px]">Dirección de recogida del paquete</p>
                    <p className="text-zinc-400 leading-relaxed">
                      El equipo de logística recogerá tu paquete en la dirección registrada en tu perfil:
                    </p>
                    <p className="font-mono font-semibold text-white bg-black/30 px-3 py-2 rounded-lg border border-white/5">
                      {profile?.direccion || "Sin dirección registrada — actualiza tu perfil antes de continuar"}
                    </p>
                  </div>
                </div>

                {/* Advertencia recogida obligatoria */}
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 flex items-start gap-3">
                  <i className="ri-error-warning-fill text-red-400 text-xl mt-0.5 flex-shrink-0" />
                  <div className="text-xs space-y-1">
                    <p className="font-black text-red-400 uppercase tracking-wider text-[10px]">Importante — Recogida obligatoria</p>
                    <p className="text-zinc-300 leading-relaxed">
                      Si el mensajero se presenta en tu dirección y <strong className="text-white">el paquete con los productos no es entregado</strong>, la solicitud de devolución será inválida y el reembolso <strong className="text-red-400">no se procesará</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── COLUMNA DERECHA: Resumen de reembolso ── */}
            <div className="lg:sticky lg:top-24 space-y-4">

              {/* Card resumen */}
              <div className="rounded-2xl border border-white/8 bg-zinc-900/60 overflow-hidden">
                <div className="px-5 py-3 border-b border-white/5 flex items-center gap-2">
                  <i className="ri-refund-2-line text-emerald-400" />
                  <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Resumen de reembolso</span>
                </div>
                <div className="p-5 space-y-3">
                  {/* Fila artículos */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Artículos devueltos</span>
                    <span className="font-semibold text-white font-mono">{formatCOP(detalle?.subtotal ?? 0)}</span>
                  </div>
                  {/* Fila transporte */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Gastos de transporte</span>
                    <span className="font-black text-emerald-400 tracking-wide text-xs uppercase">FREE</span>
                  </div>
                  {/* Divider */}
                  <div className="border-t border-white/8 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">Total a reembolsar</span>
                      <span className="text-xl font-black text-emerald-400 font-mono">{formatCOP(detalle?.subtotal ?? 0)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card: Devolviendo a */}
              <div className="rounded-2xl border border-white/8 bg-zinc-900/60 overflow-hidden">
                <div className="px-5 py-3 border-b border-white/5">
                  <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Devolviendo a</span>
                </div>
                <div className="p-5 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <i className="ri-bank-card-line text-zinc-500 text-base" />
                      Reembolso original
                    </div>
                    <span className="font-semibold text-white font-mono">{formatCOP(detalle?.subtotal ?? 0)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <i className="ri-store-2-line text-zinc-500 text-base" />
                      Crédito de tienda
                    </div>
                    <span className="font-semibold text-zinc-500 font-mono">—</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <i className="ri-exchange-dollar-line text-zinc-500 text-base" />
                      Cambio
                    </div>
                    <span className="font-semibold text-zinc-500 font-mono">—</span>
                  </div>
                </div>
              </div>

              {/* Info proceso */}
              <div className="rounded-xl border border-blue-500/10 bg-blue-500/5 p-3.5 flex items-start gap-2.5">
                <i className="ri-information-line text-blue-400 text-base mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  El reembolso se procesará en <strong className="text-white">5 días hábiles</strong> tras la aprobación.
                </p>
              </div>
            </div>
          </div>

          {/* ── BOTÓN PRINCIPAL ── */}
          <div className="mt-8 space-y-3">
            <button
              type="button"
              disabled={submitting || motivo.trim().length < 10}
              onClick={() => void handleSubmit()}
              className="w-full inline-flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-purple-600 via-purple-600 to-violet-600 hover:from-purple-500 hover:via-purple-500 hover:to-violet-500 disabled:opacity-50 disabled:pointer-events-none px-6 py-4 text-base font-black text-white transition-all duration-300 active:scale-[0.99] shadow-xl shadow-purple-900/40"
            >
              {submitting ? (
                <>
                  <i className="ri-loader-4-line animate-spin text-xl" />
                  Procesando solicitud...
                </>
              ) : (
                <>
                  <i className="ri-arrow-go-back-line text-xl" />
                  Confirmar devolución
                </>
              )}
            </button>
            <p className="text-center text-xs text-zinc-600 pb-4">
              Al confirmar aceptas nuestra{" "}
              <Link href="/privacidad" className="underline underline-offset-2 hover:text-zinc-400 transition">
                política de devoluciones
              </Link>.
            </p>
          </div>
        </main>
      </div>
    </>
  )
}

export default function DevolucionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <DevolucionContent />
    </Suspense>
  )
}

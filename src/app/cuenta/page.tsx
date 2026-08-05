"use client"

import Link from "next/link"
import { useEffect, useState, type FormEvent } from "react"
import { useAuth } from "@/components/AuthProvider"
import Modal from "@/components/Modal"
import { supabase } from "@/lib/supabase"
import { formatCOP } from "@/lib/format"
import { normalizeIntValue } from "@/lib/number-fields"

type Pedido = {
  id_pedido: number
  estado: string | null
  total: number
  fecha_pedido: string | null
  numero_guia: string | null
  transportadora: string | null
  detalle_pedidos?: { id_detalle: number; cantidad: number; subtotal: number; productos?: { nombre: string | null } | null }[]
}

export default function CuentaPage() {
  const { user, profile, loading, refreshProfile } = useAuth()
  const [nombre, setNombre] = useState("")
  const [telefono, setTelefono] = useState("")
  const [direccion, setDireccion] = useState("")
  const [savingProfile, setSavingProfile] = useState(false)
  const [newPass, setNewPass] = useState("")
  const [confirmPass, setConfirmPass] = useState("")
  const [savingPass, setSavingPass] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTitle, setModalTitle] = useState("")
  const [modalMsg, setModalMsg] = useState("")
  const [modalVariant, setModalVariant] = useState<"success" | "error" | "info">("success")
  const [tipoDocumento, setTipoDocumento] = useState("")
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [pedidosError, setPedidosError] = useState<string | null>(null)

  useEffect(() => {
    if (!profile) return
    setNombre(profile.nombre ?? "")
    setTelefono(profile.telefono != null ? String(profile.telefono) : "")
    setDireccion(profile.direccion ?? "")
  }, [profile])

  useEffect(() => {
    const loadExtraData = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return
      const [tiposResponse, pedidosResponse] = await Promise.all([
        fetch("/api/tipo-documento", { method: "POST", cache: "no-store" }),
        fetch("/api/pedidos", { method: "POST", cache: "no-store", headers: { Authorization: `Bearer ${session.access_token}` } }),
      ])
      const tiposBody = await tiposResponse.json().catch(() => ({}))
      const pedidosBody = await pedidosResponse.json().catch(() => ({}))
      const tipo = (tiposBody.data || []).find((item: { id_tipo_documento: number }) => Number(item.id_tipo_documento) === Number(profile?.id_tipo_documento))
      setTipoDocumento(tipo?.descripcion || "")
      if (pedidosResponse.ok) setPedidos(pedidosBody.pedidos || [])
      else setPedidosError(pedidosBody.error || "No se pudieron cargar tus pedidos.")
    }
    void loadExtraData()
  }, [profile?.id_tipo_documento, user?.id])

  const openModal = (title: string, msg: string, variant: "success" | "error" | "info") => {
    setModalTitle(title)
    setModalMsg(msg)
    setModalVariant(variant)
    setModalOpen(true)
  }

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSavingProfile(true)
    try {
      const { error } = await supabase
        .from("usuarios")
        .update({
          nombre: nombre.trim() || null,
          telefono: normalizeIntValue(telefono),
          direccion: direccion.trim() || null,
        })
        .eq("auth_id", user.id)

      if (error) throw error

      const trimmed = nombre.trim()
      if (trimmed) {
        await supabase.auth.updateUser({ data: { full_name: trimmed } })
      }

      await refreshProfile()
      openModal("Datos actualizados", "Tu información se guardó correctamente.", "success")
    } catch (err) {
      openModal(
        "No se pudo guardar",
        err instanceof Error ? err.message : "Error al actualizar el perfil.",
        "error"
      )
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault()
    if (!newPass.trim()) {
      openModal("Contraseña", "Escribe la nueva contraseña.", "error")
      return
    }
    if (newPass.length < 6) {
      openModal("Contraseña", "La contraseña debe tener al menos 6 caracteres.", "error")
      return
    }
    if (newPass !== confirmPass) {
      openModal("Contraseña", "Las contraseñas no coinciden.", "error")
      return
    }

    setSavingPass(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPass })
      if (error) throw error
      setNewPass("")
      setConfirmPass("")
      openModal("Contraseña actualizada", "Tu nueva contraseña ya está activa.", "success")
    } catch (err) {
      openModal(
        "No se pudo cambiar la contraseña",
        err instanceof Error ? err.message : "Error desconocido.",
        "error"
      )
    } finally {
      setSavingPass(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        Cargando perfil…
      </div>
    )
  }

  if (!user) {
    return null
  }

  // Obtener iniciales del nombre
  const getInitials = (name: string) => {
    if (!name) return "U"
    return name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase()
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white px-4 md:px-8 py-12">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Cabecera */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">Mi Perfil</h1>
            <p className="text-zinc-400 text-sm mt-1">
              Gestiona tus datos personales, direcciones e historial de pedidos.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/user"
              className="rounded-full bg-white/5 border border-white/10 px-5 py-2.5 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-300 flex items-center gap-2"
            >
              <i className="ri-shopping-bag-line" />
              Catálogo
            </Link>
            <Link
              href="/cart"
              className="rounded-full bg-gradient-to-r from-purple-600 to-purple-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-500/25 hover:opacity-90 transition-all duration-300 flex items-center gap-2"
            >
              <i className="ri-shopping-cart-line" />
              Ver Carrito
            </Link>
          </div>
        </div>

        {/* Layout en grilla de 2 columnas */}
        <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
          
          {/* COLUMNA IZQUIERDA: Tarjeta de perfil y formularios de edición */}
          <aside className="space-y-6">
            
            {/* Tarjeta Visual de Perfil */}
            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900/60 to-zinc-950/60 p-6 text-center relative overflow-hidden backdrop-blur-sm">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500 to-transparent" />
              
              {/* Avatar iniciales */}
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center text-2xl font-black text-white shadow-lg shadow-purple-500/30 mb-4">
                {getInitials(profile?.nombre || user.email || "")}
              </div>

              <h3 className="text-xl font-bold text-white truncate">
                {profile?.nombre || "Usuario"}
              </h3>
              <p className="text-xs text-zinc-500 truncate mt-1">
                {profile?.email || user.email}
              </p>

              {/* Badges estáticas de cuenta */}
              <div className="flex items-center justify-center gap-2 mt-4">
                <span className="bg-purple-500/10 border border-purple-500/20 text-purple-300 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase">
                  Cliente Registrado
                </span>
                {tipoDocumento && (
                  <span className="bg-zinc-800 border border-zinc-700 text-zinc-400 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wider">
                    {tipoDocumento}
                  </span>
                )}
              </div>
            </div>

            {/* Formulario de Datos de Contacto */}
            <section className="rounded-3xl border border-white/10 bg-zinc-950 p-6 space-y-4">
              <h4 className="text-sm uppercase tracking-wider text-zinc-400 font-bold flex items-center gap-2 mb-2">
                <i className="ri-contacts-line text-purple-400" />
                Datos de contacto
              </h4>
              
              <form onSubmit={handleSaveProfile} className="space-y-4">
                {/* Tipo de Documento y Numero - No Editables en badges estilizadas */}
                {(tipoDocumento || profile?.documento_numero) && (
                  <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Documento:</span>
                      <span className="text-zinc-300 font-semibold">{tipoDocumento || "No registrado"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Número:</span>
                      <span className="text-zinc-300 font-semibold">{profile?.documento_numero || "No registrado"}</span>
                    </div>
                  </div>
                )}

                {/* Campo Nombre */}
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/60 px-4 py-2.5 text-sm text-white outline-none focus:border-purple-500 transition"
                    autoComplete="name"
                  />
                </div>

                {/* Campo Teléfono */}
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                    Número de teléfono
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/60 px-4 py-2.5 text-sm text-white outline-none focus:border-purple-500 transition font-mono"
                    autoComplete="tel"
                  />
                </div>

                {/* Campo Dirección */}
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                    Dirección de envío
                  </label>
                  <textarea
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    rows={2}
                    className="w-full resize-none rounded-xl border border-white/10 bg-black/60 px-4 py-2.5 text-sm text-white outline-none focus:border-purple-500 transition"
                    autoComplete="street-address"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingProfile}
                  className="w-full rounded-xl bg-white text-black py-2.5 text-xs font-bold hover:bg-zinc-200 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {savingProfile ? (
                    <>
                      <i className="ri-loader-4-line animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    "Guardar datos"
                  )}
                </button>
              </form>
            </section>

            {/* Formulario de Seguridad */}
            <section className="rounded-3xl border border-white/10 bg-zinc-950 p-6 space-y-4">
              <h4 className="text-sm uppercase tracking-wider text-zinc-400 font-bold flex items-center gap-2 mb-2">
                <i className="ri-shield-keyhole-line text-purple-400" />
                Seguridad
              </h4>
              
              <form onSubmit={handleChangePassword} className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                    Nueva contraseña
                  </label>
                  <input
                    type="password"
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/60 px-4 py-2.5 text-xs text-white outline-none focus:border-purple-500 transition"
                    autoComplete="new-password"
                    minLength={6}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                    Confirmar contraseña
                  </label>
                  <input
                    type="password"
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/60 px-4 py-2.5 text-xs text-white outline-none focus:border-purple-500 transition"
                    autoComplete="new-password"
                    minLength={6}
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingPass}
                  className="w-full rounded-xl border border-white/20 hover:border-white/40 bg-transparent text-white py-2.5 text-xs font-semibold hover:bg-white/5 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingPass ? "Actualizando..." : "Cambiar contraseña"}
                </button>
              </form>
            </section>
          </aside>

          {/* COLUMNA DERECHA: Mis Pedidos Historial */}
          <main className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-zinc-950 p-6 md:p-8 space-y-6">
              
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <i className="ri-truck-line text-purple-400" />
                  Mis Pedidos
                </h3>
                <span className="bg-purple-600/30 border border-purple-500/40 text-purple-300 px-3 py-1 rounded-full text-xs font-bold tabular-nums">
                  {pedidos.length} órdenes
                </span>
              </div>

              {pedidosError ? (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-center">
                  <p className="text-sm text-red-400">{pedidosError}</p>
                </div>
              ) : pedidos.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-zinc-500">
                  <i className="ri-inbox-archive-line text-4xl text-zinc-600 mb-3 block" />
                  <p className="text-sm">Aún no has realizado ningún pedido en la tienda.</p>
                  <Link
                    href="/user"
                    className="mt-4 inline-flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 font-bold"
                  >
                    Ver catálogo de productos
                    <i className="ri-arrow-right-line" />
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {pedidos.map((pedido) => {
                    const isPending = (pedido.estado || "").toLowerCase() === "pendiente"
                    const isShipped = (pedido.estado || "").toLowerCase() === "enviado"
                    const isCompleted = (pedido.estado || "").toLowerCase() === "entregado" || (pedido.estado || "").toLowerCase() === "completado"
                    
                    return (
                      <article
                        key={pedido.id_pedido}
                        className="rounded-2xl border border-white/10 bg-black/40 hover:bg-black/60 hover:border-white/20 transition-all duration-300 p-5 md:p-6"
                      >
                        {/* Cabecera del pedido */}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-4 mb-4">
                          <div className="space-y-0.5">
                            <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Orden de compra</span>
                            <h4 className="font-mono text-sm sm:text-base font-black text-white">
                              Pedido #{pedido.id_pedido}
                            </h4>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Fecha */}
                            <span className="text-xs text-zinc-500 font-medium tabular-nums mr-2">
                              {pedido.fecha_pedido
                                ? new Date(pedido.fecha_pedido).toLocaleDateString("es-CO", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric"
                                  })
                                : "Sin fecha"}
                            </span>

                            {/* Badge del estado */}
                            <span
                              className={`rounded-full px-3 py-1 text-[10px] font-black tracking-wider uppercase border ${
                                isPending
                                  ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                                  : isShipped
                                  ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                                  : isCompleted
                                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                  : "bg-purple-500/10 border-purple-500/30 text-purple-400"
                              }`}
                            >
                              {pedido.estado || "Pendiente"}
                            </span>
                          </div>
                        </div>

                        {/* Productos del pedido */}
                        <ul className="space-y-3.5 pl-1">
                          {(pedido.detalle_pedidos || []).map((detalle) => (
                            <li key={detalle.id_detalle} className="flex justify-between items-start gap-4 text-sm text-zinc-300">
                              <div className="flex items-start gap-2.5">
                                <span className="inline-block bg-white/5 px-2 py-0.5 rounded text-xs text-purple-300 font-bold font-mono">
                                  {detalle.cantidad}x
                                </span>
                                <span className="font-semibold text-white/90">
                                  {detalle.productos?.nombre || "Producto"}
                                </span>
                              </div>
                              <span className="font-mono text-xs text-zinc-400 tabular-nums">
                                {formatCOP(detalle.subtotal)}
                              </span>
                            </li>
                          ))}
                        </ul>

                        {/* Tracking de envío / Guía */}
                        {pedido.numero_guia && (
                          <div className="mt-4 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex items-center gap-3">
                            <i className="ri-truck-fill text-emerald-400 text-lg" />
                            <div className="text-xs">
                              <p className="font-bold text-emerald-300 uppercase tracking-wider text-[9px]">Información de Envío</p>
                              <p className="text-zinc-300 mt-0.5">
                                {pedido.transportadora || "Transportadora"} · Guía: <span className="font-mono font-bold text-white select-all">{pedido.numero_guia}</span>
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Total de la orden */}
                        <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                          <span className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Total pagado</span>
                          <span className="text-lg font-black text-white font-mono tracking-tight tabular-nums">
                            {formatCOP(Number(pedido.total || 0))}
                          </span>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalTitle}
        variant={modalVariant === "error" ? "error" : modalVariant === "success" ? "success" : "info"}
      >
        <p>{modalMsg}</p>
      </Modal>
    </div>
  )
}

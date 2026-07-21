"use client"

import Link from "next/link"
import { useEffect, useState, type FormEvent } from "react"
import { useAuth } from "@/components/AuthProvider"
import Modal from "@/components/Modal"
import { supabase } from "@/lib/supabase"
import { formatCOP } from "@/lib/format"

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
    setTelefono(profile.telefono ?? "")
    setDireccion(profile.direccion ?? "")
  }, [profile])

  useEffect(() => {
    const loadExtraData = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return
      const [tiposResponse, pedidosResponse] = await Promise.all([
        fetch("/api/tipo-documento", { cache: "no-store" }),
        fetch("/api/pedidos", { cache: "no-store", headers: { Authorization: `Bearer ${session.access_token}` } }),
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
          telefono: telefono.trim() || null,
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

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white px-4 md:px-8 py-12">
      <div className="max-w-xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-black mb-1">Mi cuenta</h1>
          <p className="text-white/50 text-sm">
            Actualiza tus datos de contacto o tu contraseña cuando lo necesites.
          </p>
        </div>

        <section className="rounded-3xl border border-white/10 bg-zinc-950 p-6 md:p-8">
          <h2 className="text-lg font-semibold mb-6 text-white">Datos de contacto</h2>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-white/40 mb-2">
                Email
              </label>
              <input
                type="email"
                readOnly
                value={profile?.email || user.email || ""}
                className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-white/60 cursor-not-allowed outline-none"
              />
              <p className="mt-1 text-xs text-white/35">El email no se puede cambiar desde aquí.</p>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-white/40 mb-2">
                Tipo de documento
              </label>
              <input
                type="text"
                readOnly
                value={tipoDocumento}
                placeholder="Sin documento registrado"
                className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-white/60 cursor-not-allowed outline-none"
              />
              <p className="mt-1 text-xs text-white/35">El tipo de documento no se puede modificar.</p>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-white/40 mb-2">
                Numero de documento
              </label>
              <input
                type="text"
                readOnly
                value={profile?.documento_numero || ""}
                placeholder="Sin numero registrado"
                className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-white/60 cursor-not-allowed outline-none"
              />
              <p className="mt-1 text-xs text-white/35">El numero de documento no se puede modificar.</p>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-white/40 mb-2">
                Nombre
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-purple-500 transition"
                autoComplete="name"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-white/40 mb-2">
                Teléfono
              </label>
              <input
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-purple-500 transition"
                autoComplete="tel"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-white/40 mb-2">
                Dirección
              </label>
              <textarea
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                rows={3}
                className="w-full resize-y rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-purple-500 transition"
                autoComplete="street-address"
              />
            </div>
            <button
              type="submit"
              disabled={savingProfile}
              className="w-full rounded-full bg-[#6b2ad4] py-3 text-sm font-semibold text-white hover:bg-[#580096] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingProfile ? "Guardando…" : "Guardar cambios"}
            </button>
          </form>
        </section>

        <section className="rounded-3xl border border-white/10 bg-zinc-950 p-6 md:p-8">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white">Mis pedidos</h2>
            <p className="mt-1 text-sm text-white/45">Consulta los productos, el estado y la información de envío.</p>
          </div>
          {pedidosError ? <p className="text-sm text-red-300">{pedidosError}</p> : pedidos.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-white/45">Aún no has realizado pedidos.</p>
          ) : (
            <div className="space-y-4">
              {pedidos.map((pedido) => (
                <article key={pedido.id_pedido} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-white">Pedido #{pedido.id_pedido}</h3>
                      <p className="mt-1 text-xs text-white/45">{pedido.fecha_pedido ? new Date(pedido.fecha_pedido).toLocaleString("es-CO") : "Fecha no disponible"}</p>
                    </div>
                    <span className="rounded-full bg-purple-500/15 px-3 py-1 text-xs font-semibold capitalize text-purple-200">{pedido.estado || "pendiente"}</span>
                  </div>
                  <ul className="mt-4 space-y-1 text-sm text-white/70">
                    {(pedido.detalle_pedidos || []).map((detalle) => <li key={detalle.id_detalle}>{detalle.cantidad} × {detalle.productos?.nombre || "Producto"}</li>)}
                  </ul>
                  {pedido.numero_guia && <p className="mt-4 text-sm text-emerald-200">Envío: {pedido.transportadora || "Transportadora por confirmar"} · Guía #{pedido.numero_guia}</p>}
                  <p className="mt-4 font-semibold text-white">Total: {formatCOP(Number(pedido.total || 0))}</p>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-white/10 bg-zinc-950 p-6 md:p-8">
          <h2 className="text-lg font-semibold mb-2 text-white">Seguridad</h2>
          <p className="text-sm text-white/45 mb-6">
            Elige una contraseña segura. Recuerda agregar numeros mayusculas o caracteres especiales.
          </p>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-white/40 mb-2">
                Nueva contraseña
              </label>
              <input
                type="password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-purple-500 transition"
                autoComplete="new-password"
                minLength={6}
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-white/40 mb-2">
                Confirmar contraseña
              </label>
              <input
                type="password"
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-purple-500 transition"
                autoComplete="new-password"
                minLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={savingPass}
              className="w-full rounded-full border border-white/20 py-3 text-sm font-semibold text-white hover:bg-white/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingPass ? "Actualizando…" : "Cambiar contraseña"}
            </button>
          </form>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/user"
            className="rounded-full bg-[#6b2ad4] px-6 py-3 text-sm font-semibold text-white hover:bg-[#580096] transition"
          >
            Ir al catálogo
          </Link>
          <Link
            href="/cart"
            className="rounded-full border border-white/20 px-6 py-3 text-sm hover:bg-white/10 transition"
          >
            Ver carrito
          </Link>
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

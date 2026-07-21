"use client"

import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import Modal from "@/components/Modal"

type UsuarioRow = {
  id_usuario: number
  auth_id?: string | null
  nombre: string | null
  email: string | null
  telefono?: string | null
  direccion?: string | null
  id_rol: number | null
  id_tipo_documento?: number | null
  documento_numero?: string | null
}

type RolRow = {
  id_rol: number
  tipo_rol?: string | null
}

type TipoDocumentoRow = {
  id_tipo_documento: number
  descripcion: string | null
}

export default function AdminUsuariosPage() {
  const [usuarios, setUsuarios] = useState<UsuarioRow[]>([])
  const [roles, setRoles] = useState<RolRow[]>([])
  const [tiposDocumento, setTiposDocumento] = useState<TipoDocumentoRow[]>([])
  const [form, setForm] = useState({
    nombre: "",
    email: "",
    password: "",
    telefono: "",
    direccion: "",
    id_rol: "1",
    id_tipo_documento: "",
    documento_numero: "",
  })
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({
    id_usuario: "",
    auth_id: "",
    nombre: "",
    email: "",
    password: "",
    telefono: "",
    direccion: "",
    id_rol: "1",
    id_tipo_documento: "",
    documento_numero: "",
  })
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTitle, setModalTitle] = useState("")
  const [modalMessage, setModalMessage] = useState("")
  const [modalVariant, setModalVariant] = useState<"error" | "info">("info")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmTitle, setConfirmTitle] = useState("")
  const [confirmMessage, setConfirmMessage] = useState("")
  const [confirmAction, setConfirmAction] = useState<() => Promise<void> | void>(() => async () => {})
  const [confirmLabel, setConfirmLabel] = useState("Eliminar")

  const authHeaders = async (): Promise<Record<string, string>> => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
  }

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/admin/usuarios", {
      cache: "no-store",
      headers: await authHeaders(),
    })
    const body = await res.json()
    if (res.ok) {
      setUsuarios(body.usuarios || [])
      setRoles(body.roles || [])
      setTiposDocumento(body.tiposDocumento || [])
      setMessage(body.rolesError || body.tiposDocumentoError || null)
    } else {
      setMessage(body.error || "No se pudieron cargar usuarios.")
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    queueMicrotask(() => void load())
  }, [load])

  const createUser = async () => {
    setSaving(true)
    setMessage(null)
    const res = await fetch("/api/admin/usuarios", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(await authHeaders()),
      },
      body: JSON.stringify(form),
    })
    const body = await res.json()
    if (res.ok) {
      setMessage("Usuario creado correctamente.")
      setModalTitle("Usuario creado")
      setModalMessage("El usuario se creó correctamente.")
      setModalVariant("info")
      setModalOpen(true)
      setForm({
        nombre: "",
        email: "",
        password: "",
        telefono: "",
        direccion: "",
        id_rol: "1",
        id_tipo_documento: "",
        documento_numero: "",
      })
      void load()
    } else {
      setMessage(body.error || "No se pudo crear el usuario.")
    }
    setSaving(false)
  }

  const startEdit = (usuario: UsuarioRow) => {
    setEditingId(usuario.id_usuario)
    setEditForm({
      id_usuario: String(usuario.id_usuario),
      auth_id: usuario.auth_id || "",
      nombre: usuario.nombre || "",
      email: usuario.email || "",
      password: "",
      telefono: usuario.telefono || "",
      direccion: usuario.direccion || "",
      id_rol: String(usuario.id_rol || 1),
      id_tipo_documento: usuario.id_tipo_documento ? String(usuario.id_tipo_documento) : "",
      documento_numero: usuario.documento_numero || "",
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({
      id_usuario: "",
      auth_id: "",
      nombre: "",
      email: "",
      password: "",
      telefono: "",
      direccion: "",
      id_rol: "1",
      id_tipo_documento: "",
      documento_numero: "",
    })
  }

  const updateUser = async () => {
    setSaving(true)
    setMessage(null)
    const res = await fetch("/api/admin/usuarios", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(await authHeaders()),
      },
      body: JSON.stringify(editForm),
    })
    const body = await res.json()
    if (res.ok) {
      setMessage("Usuario actualizado correctamente.")
      setModalTitle("Usuario actualizado")
      setModalMessage("Los cambios del usuario se guardaron correctamente.")
      setModalVariant("info")
      setModalOpen(true)
      cancelEdit()
      void load()
    } else {
      setMessage(body.error || "No se pudo actualizar el usuario.")
    }
    setSaving(false)
  }

  const confirmarEliminacion = (id: number) => {
    setConfirmTitle("Eliminar usuario")
    setConfirmMessage("¿Seguro que deseas eliminar este usuario?")
    setConfirmLabel("Eliminar")
    setConfirmAction(() => async () => await eliminarUsuario(id))
    setConfirmOpen(true)
  }

  const eliminarUsuario = async (id: number) => {
    setSaving(true)
    setMessage(null)
    const res = await fetch("/api/admin/usuarios", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(await authHeaders()),
      },
      body: JSON.stringify({ id_usuario: id }),
    })
    const body = await res.json()
    if (res.ok) {
      setModalTitle("Usuario eliminado")
      setModalMessage("El usuario fue eliminado correctamente.")
      setModalVariant("info")
      setModalOpen(true)
      void load()
    } else {
      setModalTitle("No se pudo eliminar")
      setModalMessage(body.error || "Error al eliminar usuario.")
      setModalVariant("error")
      setModalOpen(true)
    }
    setSaving(false)
  }

  const openInfo = (title: string, message: string, variant: "error" | "info") => {
    setModalTitle(title)
    setModalMessage(message)
    setModalVariant(variant)
    setModalOpen(true)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Usuarios y permisos</h1>
        <p className="text-sm text-zinc-500 mt-1">Crea usuarios y asigna el rol que usara el middleware.</p>
      </div>

      {message && (
        <div className="rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-zinc-200">
          {message}
        </div>
      )}

      <section className="rounded-2xl border border-white/10 bg-zinc-950/50 p-5 md:p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Crear usuario</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            ["nombre", "Nombre"],
            ["email", "Email"],
            ["password", "Contrasena"],
            ["telefono", "Telefono"],
            ["direccion", "Direccion"],
            ["documento_numero", "Numero documento"],
          ].map(([key, label]) => (
            <input
              key={key}
              type={key === "password" ? "password" : key === "email" ? "email" : "text"}
              value={form[key as keyof typeof form]}
              placeholder={label}
              onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
              className="rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none focus:border-purple-500"
            />
          ))}
          <select
            value={form.id_tipo_documento}
            onChange={(e) => setForm((prev) => ({ ...prev, id_tipo_documento: e.target.value }))}
            className="rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none focus:border-purple-500"
          >
            <option value="">Tipo documento</option>
            {tiposDocumento.map((tipo) => (
              <option key={tipo.id_tipo_documento} value={tipo.id_tipo_documento}>
                {tipo.id_tipo_documento} - {tipo.descripcion}
              </option>
            ))}
          </select>
          <select
            value={form.id_rol}
            onChange={(e) => setForm((prev) => ({ ...prev, id_rol: e.target.value }))}
            className="rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none focus:border-purple-500"
          >
            {roles.length === 0 ? (
              <option value="">Sin roles cargados</option>
            ) : (
              roles.map((rol) => (
                <option key={rol.id_rol} value={rol.id_rol}>
                  {rol.tipo_rol || `Rol ${rol.id_rol}`}
                </option>
              ))
            )}
          </select>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => void createUser()}
          className="mt-4 rounded-full bg-gradient-to-r from-[#6b2ad4] to-[#580096] px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Creando..." : "Crear usuario"}
        </button>
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/50">
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={modalTitle}
          variant={modalVariant === "error" ? "error" : "info"}
        >
          <p>{modalMessage}</p>
        </Modal>
        <Modal
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          title={confirmTitle}
          variant="info"
          footer={
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmOpen(false)
                  void confirmAction()
                }}
                className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
              >
                {confirmLabel}
              </button>
            </div>
          }
        >
          <p>{confirmMessage}</p>
        </Modal>

        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={modalTitle}
          variant={modalVariant === "error" ? "error" : "info"}
        >
          <p>{modalMessage}</p>
        </Modal>

        <div className="border-b border-white/10 p-5">
          <h2 className="text-lg font-semibold text-white">Listado</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-zinc-500">
              <tr className="border-b border-white/10">
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Tipo documento</th>
                <th className="px-4 py-3">Numero documento</th>
                <th className="px-4 py-3">Telefono</th>
                <th className="px-4 py-3">Direccion</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="px-4 py-8 text-zinc-500" colSpan={8}>Cargando...</td></tr>
              ) : usuarios.map((usuario) => (
                <tr key={usuario.id_usuario} className="border-b border-white/5">
                  {editingId === usuario.id_usuario ? (
                    <>
                      <td className="min-w-[220px] px-4 py-3">
                        <input
                          value={editForm.nombre}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, nombre: e.target.value }))}
                          className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-white outline-none focus:border-purple-500"
                        />
                      </td>
                      <td className="min-w-[240px] px-4 py-3">
                        <div className="space-y-2">
                          <input
                            type="email"
                            value={editForm.email}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                            className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-white outline-none focus:border-purple-500"
                          />
                          <input
                            type="password"
                            value={editForm.password}
                            placeholder="Nueva contrasena opcional"
                            onChange={(e) => setEditForm((prev) => ({ ...prev, password: e.target.value }))}
                            className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-white outline-none focus:border-purple-500"
                          />
                        </div>
                      </td>
                      <td className="min-w-[160px] px-4 py-3">
                        <select
                          value={editForm.id_rol}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, id_rol: e.target.value }))}
                          className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-white outline-none focus:border-purple-500"
                        >
                          {roles.map((rol) => (
                            <option key={rol.id_rol} value={rol.id_rol}>
                              {rol.tipo_rol || `Rol ${rol.id_rol}`}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="min-w-[180px] px-4 py-3">
                        <select
                          value={editForm.id_tipo_documento}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, id_tipo_documento: e.target.value }))}
                          className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-white outline-none focus:border-purple-500"
                        >
                          <option value="">Sin tipo</option>
                          {tiposDocumento.map((tipo) => (
                            <option key={tipo.id_tipo_documento} value={tipo.id_tipo_documento}>
                              {tipo.descripcion || tipo.id_tipo_documento}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="min-w-[180px] px-4 py-3">
                        <input
                          value={editForm.documento_numero}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, documento_numero: e.target.value }))}
                          className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-white outline-none focus:border-purple-500"
                        />
                      </td>
                      <td className="min-w-[160px] px-4 py-3">
                        <input
                          value={editForm.telefono}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, telefono: e.target.value }))}
                          className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-white outline-none focus:border-purple-500"
                        />
                      </td>
                      <td className="min-w-[220px] px-4 py-3">
                        <input
                          value={editForm.direccion}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, direccion: e.target.value }))}
                          className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-white outline-none focus:border-purple-500"
                        />
                      </td>
                      <td className="min-w-[180px] px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => void updateUser()}
                            className="rounded-lg bg-purple-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                          >
                            Guardar
                          </button>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={cancelEdit}
                            className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-zinc-300 disabled:opacity-50"
                          >
                            Cancelar
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-white">{usuario.nombre}</td>
                      <td className="px-4 py-3 text-zinc-400">{usuario.email}</td>
                      <td className="px-4 py-3 text-zinc-300">{roles.find((r) => Number(r.id_rol) === Number(usuario.id_rol))?.tipo_rol || usuario.id_rol}</td>
                      <td className="px-4 py-3 text-zinc-400">
                        {tiposDocumento.find((tipo) => Number(tipo.id_tipo_documento) === Number(usuario.id_tipo_documento))?.descripcion || usuario.id_tipo_documento || "-"}
                      </td>
                      <td className="px-4 py-3 text-zinc-400">{usuario.documento_numero || "-"}</td>
                      <td className="px-4 py-3 text-zinc-400">{usuario.telefono || "-"}</td>
                      <td className="max-w-[260px] break-words px-4 py-3 text-zinc-400">{usuario.direccion || "-"}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(usuario)}
                            className="rounded-lg border border-purple-400/40 px-3 py-2 text-xs font-semibold text-purple-200 hover:bg-purple-500/10"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => confirmarEliminacion(usuario.id_usuario)}
                            className="rounded-lg bg-red-600/90 px-3 py-2 text-xs text-white"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

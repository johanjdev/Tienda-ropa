"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import Modal from "@/components/Modal"

const SLUG_TO_TABLE: Record<string, string> = {
  usuarios: "usuarios",
  carrito: "carrito",
  cupones: "cupones",
  devoluciones: "devoluciones",
  roles: "roles",
  logs: "logs",
  "tipo-documento": "tipo_documento",
}

const LIMIT = 150

export default function AdminConsultaPage() {
  const params = useParams()
  const slug = typeof params?.slug === "string" ? params.slug : ""
  const table = SLUG_TO_TABLE[slug]

  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [cols, setCols] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [newRole, setNewRole] = useState("editor")
  const [savingRole, setSavingRole] = useState(false)
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null)
  const [editingRoleName, setEditingRoleName] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMessage, setModalMessage] = useState("")

  const loadRows = useCallback(async (cancelled?: () => boolean) => {
    if (!table) return
    setLoading(true)
    setError(null)
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const res = await fetch(`/api/admin/consulta/${slug}`, {
      method: "POST",
      cache: "no-store",
      headers: session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {},
    })
    const body = await res.json()
    if (cancelled?.()) return
    if (!res.ok) {
      setError(body.error || "No se pudo cargar la tabla.")
      setRows([])
      setCols([])
    } else if (body.rows && body.rows.length > 0) {
      setRows(body.rows as Record<string, unknown>[])
      setCols(Object.keys(body.rows[0] as object))
    } else {
      setRows([])
      setCols([])
    }
    setLoading(false)
  }, [slug, table])

  useEffect(() => {
    if (!table) return
    let cancelled = false
    queueMicrotask(() => void loadRows(() => cancelled))
    return () => {
      cancelled = true
    }
  }, [loadRows, table])

  const createRole = async () => {
    if (!newRole.trim()) {
      setError("Ingresa el nombre del rol.")
      return
    }
    setSavingRole(true)
    setError(null)
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const res = await fetch("/api/admin/usuarios", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ tipo_rol: newRole }),
    })
    const body = await res.json()
    if (!res.ok) {
      setError(body.error || "No se pudo crear el rol.")
    } else {
      setNewRole("")
      await loadRows()
    }
    setSavingRole(false)
  }

  const roleRequest = async (method: "PATCH" | "DELETE", payload: Record<string, unknown>) => {
    setSavingRole(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch("/api/admin/usuarios", {
      method,
      headers: { "Content-Type": "application/json", ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
      body: JSON.stringify(payload),
    })
    const body = await res.json()
    if (!res.ok) setError(body.error || "No se pudo actualizar el rol.")
    else {
      setEditingRoleId(null)
      await loadRows()
    }
    setSavingRole(false)
  }

  if (!table) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-950/30 p-8 text-red-200">
        <p className="font-semibold">Ruta no reconocida.</p>
        <Link href="/admin" className="mt-4 inline-block text-purple-300 hover:underline">
          Volver al panel
        </Link>
      </div>
    )
  }

  const title = slug.replace(/-/g, " ")

  return (
    <div className="space-y-6">
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Rol protegido" variant="info">
        <p>{modalMessage}</p>
      </Modal>
      <div>
        <p className="text-xs uppercase tracking-widest text-zinc-500">Consulta</p>
        <h1 className="text-2xl font-black text-white capitalize mt-1">{title}</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Tabla: <code className="text-purple-300">{table}</code> - hasta {LIMIT} filas
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 px-4 py-3 text-sm text-amber-100">
          <p className="font-semibold">No se pudo cargar</p>
          <p className="mt-1 text-amber-200/90">{error}</p>
        </div>
      )}

      {slug === "roles" && (
        <section className="rounded-2xl border border-white/10 bg-zinc-950/50 p-5 md:p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Crear rol</h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={newRole}
              maxLength={30}
              onChange={(e) => setNewRole(e.target.value)}
              placeholder="Nombre del rol, por ejemplo editor"
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none focus:border-purple-500"
            />
            <button
              type="button"
              disabled={savingRole}
              onClick={() => void createRole()}
              className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black disabled:opacity-60"
            >
              {savingRole ? "Creando..." : "Crear rol"}
            </button>
          </div>
        </section>
      )}

      {loading ? (
        <div className="h-40 rounded-2xl border border-white/10 bg-zinc-900/40 animate-pulse" />
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-zinc-950/50 p-10 text-center text-zinc-500 text-sm">
          Sin filas o tabla vacia.
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-zinc-950/50 overflow-x-auto">
          <table className="min-w-full table-fixed text-left text-xs md:text-sm">
            <thead>
              <tr className="border-b border-white/10 text-zinc-500 uppercase text-[10px] tracking-wider">
                {cols.map((c) => (
                  <th key={c} className="px-3 py-3 font-medium sticky top-0 bg-zinc-950">
                    {c}
                  </th>
                ))}
                {slug === "roles" && <th className="px-3 py-3 font-medium sticky top-0 bg-zinc-950">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                  {cols.map((c) => (
                    <td key={c} className="px-3 py-2 text-zinc-300 max-w-[260px] whitespace-normal break-words align-top" title={String(row[c] ?? "")}>
                      {slug === "roles" && c === "tipo_rol" && editingRoleId === Number(row.id_rol) ? (
                        <input value={editingRoleName} maxLength={30} onChange={(e) => setEditingRoleName(e.target.value)} className="w-full rounded border border-white/20 bg-black px-2 py-1 text-white" />
                      ) : formatCell(row[c])}
                    </td>
                  ))}
                  {slug === "roles" && (
                    <td className="px-3 py-2 whitespace-nowrap">
                      {editingRoleId === Number(row.id_rol) ? (
                        <>
                          <button type="button" disabled={savingRole} onClick={() => void roleRequest("PATCH", { id_rol: Number(row.id_rol), tipo_rol: editingRoleName })} className="mr-2 rounded bg-emerald-600 px-2 py-1 text-xs text-white">Guardar</button>
                          <button type="button" onClick={() => setEditingRoleId(null)} className="rounded border border-white/20 px-2 py-1 text-xs text-white">Cancelar</button>
                        </>
                      ) : (
                        <>
                          <button type="button" onClick={() => {
                            if ([1, 2, 3].includes(Number(row.id_rol))) { setModalMessage("Los roles base no se pueden editar."); setModalOpen(true); return }
                            setEditingRoleId(Number(row.id_rol)); setEditingRoleName(String(row.tipo_rol || ""))
                          }} className="mr-2 rounded bg-amber-500 px-2 py-1 text-xs text-black">Editar</button>
                          <button type="button" onClick={() => void roleRequest("DELETE", { id_rol: Number(row.id_rol) })} className="rounded bg-red-600 px-2 py-1 text-xs text-white">Eliminar</button>
                        </>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return "-"
  if (typeof v === "object") return JSON.stringify(v)
  return String(v)
}

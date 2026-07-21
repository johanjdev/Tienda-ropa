"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

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

  const loadRows = useCallback(async (cancelled?: () => boolean) => {
    if (!table) return
    setLoading(true)
    setError(null)
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const res = await fetch(`/api/admin/consulta/${slug}`, {
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
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                  {cols.map((c) => (
                    <td key={c} className="px-3 py-2 text-zinc-300 max-w-[260px] whitespace-normal break-words align-top" title={String(row[c] ?? "")}>
                      {formatCell(row[c])}
                    </td>
                  ))}
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

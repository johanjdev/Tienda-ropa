"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"

type LogRow = {
  id_log: number
  id_usuario: number | null
  accion: string | null
  fecha: string | null
  ip_usuario: string | null
}

export default function AdminLogsPage() {
  const [rows, setRows] = useState<LogRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(0)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const res = await fetch("/api/admin/consulta/logs", {
        cache: "no-store",
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {},
      })
      const body = await res.json()
      if (cancelled) return
      if (res.ok) {
        setRows(body.rows || [])
        setError(null)
      } else {
        setRows([])
        setError(body.error || "No se pudieron cargar logs.")
      }
      setNow(Date.now())
      setLoading(false)
    }
    void load()
    const timer = window.setInterval(load, 30000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [])

  const activeUsers = useMemo(() => {
    const since = now - 5 * 60_000
    const ids = new Set<number>()
    for (const row of rows) {
      const time = row.fecha ? new Date(row.fecha).getTime() : 0
      if (time >= since && row.id_usuario && row.accion?.startsWith("Activo en")) {
        ids.add(row.id_usuario)
      }
    }
    return ids.size
  }, [now, rows])

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-zinc-500">Monitoreo</p>
        <h1 className="text-2xl font-black text-white mt-1">Logs</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-5">
          <p className="text-sm text-zinc-500">Usuarios activos</p>
          <p className="mt-2 text-4xl font-black text-white">{activeUsers}</p>
          <p className="mt-1 text-xs text-zinc-500">Actividad en los ultimos 5 minutos</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-5">
          <p className="text-sm text-zinc-500">Registros cargados</p>
          <p className="mt-2 text-4xl font-black text-white">{rows.length}</p>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-500/30 bg-red-950/20 px-4 py-3 text-sm text-red-100">{error}</div>}

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/50">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-zinc-500">
              <tr className="border-b border-white/10">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Accion</th>
                <th className="px-4 py-3">IP</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="px-4 py-8 text-zinc-500" colSpan={4}>Cargando...</td></tr>
              ) : rows.map((row) => (
                <tr key={row.id_log} className="border-b border-white/5">
                  <td className="px-4 py-3 text-zinc-400">{row.fecha ? new Date(row.fecha).toLocaleString("es-CO") : "-"}</td>
                  <td className="px-4 py-3 text-zinc-300">{row.id_usuario ?? "-"}</td>
                  <td className="px-4 py-3 text-white">{row.accion ?? "-"}</td>
                  <td className="px-4 py-3 text-zinc-500">{row.ip_usuario ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

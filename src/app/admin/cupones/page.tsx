"use client"

import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import Modal from "@/components/Modal"

type Cupon = {
  id_cupon: number
  codigo: string
  porcentaje: number
  uso_maximo: number | null
  fecha_expiracion: string | null
}

export default function AdminCuponesPage() {
  const [rows, setRows] = useState<Cupon[]>([])
  const [form, setForm] = useState({
    codigo: "",
    porcentaje: "10",
    uso_maximo: "100",
    fecha_expiracion: "",
  })
  const [message, setMessage] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTitle, setModalTitle] = useState("")
  const [modalMessage, setModalMessage] = useState("")
  const [modalVariant, setModalVariant] = useState<"error" | "info">("info")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmMessage, setConfirmMessage] = useState("")
  const [confirmAction, setConfirmAction] = useState<() => Promise<void> | void>(() => async () => {})
  const [confirmLabel, setConfirmLabel] = useState("Eliminar")

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("cupones")
      .select("*")
      .order("id_cupon", { ascending: false })
    if (error) setMessage(error.message)
    else setRows((data || []) as Cupon[])
  }, [])

  useEffect(() => {
    queueMicrotask(() => void load())
  }, [load])

  const crear = async () => {
    if (!form.codigo.trim()) {
      setMessage("Ingresa un codigo.")
      return
    }
    const { error } = await supabase.from("cupones").insert([
      {
        codigo: form.codigo.trim().toUpperCase(),
        porcentaje: Number(form.porcentaje),
        uso_maximo: Number(form.uso_maximo) || null,
        fecha_expiracion: form.fecha_expiracion || null,
      },
    ])
    if (error) {
      setMessage(error.message)
      setModalTitle("Error al crear cupon")
      setModalMessage(error.message)
      setModalVariant("error")
      setModalOpen(true)
      return
    }
    setMessage("Cupon creado.")
    setModalTitle("Cupon creado")
    setModalMessage("El cupon se creó correctamente.")
    setModalVariant("info")
    setModalOpen(true)
    setForm({ codigo: "", porcentaje: "10", uso_maximo: "100", fecha_expiracion: "" })
    void load()
  }

  const eliminar = async (id: number) => {
    const { error } = await supabase.from("cupones").delete().eq("id_cupon", id)
    if (error) {
      setMessage(error.message)
      setModalTitle("No se pudo eliminar")
      setModalMessage(error.message)
      setModalVariant("error")
      setModalOpen(true)
    } else {
      setMessage("Cupón eliminado.")
      setModalTitle("Cupón eliminado")
      setModalMessage("El cupón se eliminó correctamente.")
      setModalVariant("info")
      setModalOpen(true)
      void load()
    }
  }

  const confirmEliminar = (id: number) => {
    setConfirmLabel("Eliminar")
    setConfirmMessage("¿Deseas eliminar este cupón?")
    setConfirmAction(() => async () => {
      const { error } = await supabase.from("cupones").delete().eq("id_cupon", id)
      if (error) {
        setModalTitle("No se pudo eliminar")
        setModalMessage(error.message)
        setModalVariant("error")
        setModalOpen(true)
      } else {
        setModalTitle("Cupón eliminado")
        setModalMessage("El cupón se eliminó correctamente.")
        setModalVariant("info")
        setModalOpen(true)
        void load()
      }
    })
    setConfirmOpen(true)
  }

  return (
    <div className="space-y-8">
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
        title="Eliminar cupón"
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
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Cupones</h1>
        <p className="text-sm text-zinc-500 mt-1">Crea descuentos que se aplican al total del carrito.</p>
      </div>
      {message && <div className="rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-zinc-200">{message}</div>}

      <section className="rounded-2xl border border-white/10 bg-zinc-950/50 p-5 md:p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Nuevo cupon</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <input className="rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none focus:border-purple-500" placeholder="Codigo" value={form.codigo} onChange={(e) => setForm((p) => ({ ...p, codigo: e.target.value }))} />
          <input className="rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-purple-500" type="number" min="1" max="100" placeholder="Porcentaje de descuento (%)" value={form.porcentaje} onChange={(e) => setForm((p) => ({ ...p, porcentaje: e.target.value }))} />
          <input className="rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-purple-500" type="number" min="1" placeholder="Uso maximo disponible" value={form.uso_maximo} onChange={(e) => setForm((p) => ({ ...p, uso_maximo: e.target.value }))} />
          <input className="rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none focus:border-purple-500" type="datetime-local" value={form.fecha_expiracion} onChange={(e) => setForm((p) => ({ ...p, fecha_expiracion: e.target.value }))} />
        </div>
        <button type="button" onClick={() => void crear()} className="mt-4 rounded-full bg-gradient-to-r from-[#6b2ad4] to-[#580096] px-6 py-3 text-sm font-semibold text-white">
          Crear cupon
        </button>
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/50">
        <table className="min-w-full text-left text-sm">
          <thead className="text-[11px] uppercase tracking-wider text-zinc-500">
            <tr className="border-b border-white/10">
              <th className="px-4 py-3">Codigo</th>
              <th className="px-4 py-3">Porcentaje</th>
              <th className="px-4 py-3">Uso maximo</th>
              <th className="px-4 py-3">Expira</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((cupon) => (
              <tr key={cupon.id_cupon} className="border-b border-white/5">
                <td className="px-4 py-3 font-semibold text-white">{cupon.codigo}</td>
                <td className="px-4 py-3 text-zinc-300">{cupon.porcentaje}%</td>
                <td className="px-4 py-3 text-zinc-400">{cupon.uso_maximo ?? "-"}</td>
                <td className="px-4 py-3 text-zinc-400">{cupon.fecha_expiracion ? new Date(cupon.fecha_expiracion).toLocaleString("es-CO") : "-"}</td>
                <td className="px-4 py-3 text-right">
                  <button type="button" onClick={() => confirmEliminar(cupon.id_cupon)} className="rounded-lg bg-red-600/90 px-3 py-1.5 text-xs text-white">
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}

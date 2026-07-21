"use client"

import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import Modal from "@/components/Modal"

interface Categoria {
  id_categoria: number
  nombre_categoria: string
  descripcion: string | null
}

export default function AdminCategoriasPage() {
  const [rows, setRows] = useState<Categoria[]>([])
  const [nombre, setNombre] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [editId, setEditId] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTitle, setModalTitle] = useState("")
  const [modalMessage, setModalMessage] = useState("")
  const [modalVariant, setModalVariant] = useState<"error" | "info">("info")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmTitle, setConfirmTitle] = useState("")
  const [confirmMessage, setConfirmMessage] = useState("")
  const [confirmAction, setConfirmAction] = useState<() => Promise<void> | void>(() => async () => {})
  const [confirmLabel, setConfirmLabel] = useState("Eliminar")

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("categorias")
      .select("*")
      .order("id_categoria", { ascending: true })
    if (error) {
      setModalTitle("Error")
      setModalMessage(error.message)
      setModalVariant("error")
      setModalOpen(true)
      return
    }
    setRows((data ?? []) as Categoria[])
  }, [])

  useEffect(() => {
    queueMicrotask(() => void load())
  }, [load])

  const openInfo = (title: string, msg: string, v: "error" | "info") => {
    setModalTitle(title)
    setModalMessage(msg)
    setModalVariant(v)
    setModalOpen(true)
  }

  const confirmEliminarCategoria = (id: number) => {
    setConfirmTitle("Eliminar categoría")
    setConfirmMessage("¿Seguro que quieres eliminar esta categoría?")
    setConfirmLabel("Eliminar")
    setConfirmAction(() => async () => await eliminar(id))
    setConfirmOpen(true)
  }

  const crear = async () => {
    if (!nombre.trim()) {
      openInfo("Datos", "Indica el nombre de la categoría.", "info")
      return
    }
    const { error } = await supabase.from("categorias").insert([
      {
        nombre_categoria: nombre.trim(),
        descripcion: descripcion.trim() || null,
      },
    ])
    if (error) {
      openInfo("No se pudo crear", error.message, "error")
      return
    }
    setNombre("")
    setDescripcion("")
    void load()
    openInfo("Categoría creada", "La categoría se agregó correctamente.", "info")
  }

  const guardar = async (c: Categoria) => {
    const { error } = await supabase
      .from("categorias")
      .update({
        nombre_categoria: c.nombre_categoria.trim(),
        descripcion: c.descripcion?.trim() || null,
      })
      .eq("id_categoria", c.id_categoria)
    if (error) {
      openInfo("No se pudo guardar", error.message, "error")
      return
    }
    setEditId(null)
    void load()
    openInfo("Categoría actualizada", "Los cambios se guardaron correctamente.", "info")
  }

  const eliminar = async (id: number) => {
    const { error } = await supabase.from("categorias").delete().eq("id_categoria", id)
    if (error) {
      openInfo("No se pudo eliminar", error.message, "error")
      return
    }
    void load()
    openInfo("Categoría eliminada", "La categoría se eliminó correctamente.", "info")
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

      <div>
        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Categorías</h1>
        <p className="text-sm text-zinc-500 mt-1">Administración de categorías del catálogo.</p>
      </div>
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

      <div className="rounded-2xl border border-white/10 bg-zinc-950/50 p-5 md:p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">Nueva categoría</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <input
            className="rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none focus:border-purple-500"
            placeholder="Nombre (ej. chaquetas)"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
          <input
            className="rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none focus:border-purple-500 md:col-span-2"
            placeholder="Descripción"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={() => void crear()}
          className="rounded-full bg-gradient-to-r from-[#6b2ad4] to-[#580096] px-6 py-3 text-sm font-semibold text-white"
        >
          Crear categoría
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-zinc-950/50 overflow-hidden">
        <div className="p-5 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Listado</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-zinc-500 text-[11px] uppercase tracking-wider">
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Descripción</th>
                <th className="px-4 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) =>
                editId === c.id_categoria ? (
                  <tr key={c.id_categoria} className="border-b border-white/5 bg-purple-950/20">
                    <td className="px-4 py-3 text-zinc-500">{c.id_categoria}</td>
                    <td className="px-4 py-3" colSpan={2}>
                      <div className="space-y-2 max-w-xl">
                        <input
                          className="w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-white"
                          value={c.nombre_categoria}
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((x) =>
                                x.id_categoria === c.id_categoria
                                  ? { ...x, nombre_categoria: e.target.value }
                                  : x
                              )
                            )
                          }
                        />
                        <input
                          className="w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-white"
                          value={c.descripcion ?? ""}
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((x) =>
                                x.id_categoria === c.id_categoria
                                  ? { ...x, descripcion: e.target.value }
                                  : x
                              )
                            )
                          }
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => void guardar(c)}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs text-white mr-2"
                      >
                        Guardar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditId(null)
                          void load()
                        }}
                        className="rounded-lg border border-white/20 px-3 py-1.5 text-xs text-zinc-300"
                      >
                        Cancelar
                      </button>
                    </td>
                  </tr>
                ) : (
                  <tr key={c.id_categoria} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-zinc-500 tabular-nums">{c.id_categoria}</td>
                    <td className="px-4 py-3 text-white font-medium">{c.nombre_categoria}</td>
                    <td className="px-4 py-3 text-zinc-400 hidden sm:table-cell max-w-md truncate">
                      {c.descripcion ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setEditId(c.id_categoria)}
                        className="mr-2 rounded-lg bg-amber-500/90 px-3 py-1.5 text-xs font-medium text-black"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => confirmEliminarCategoria(c.id_categoria)}
                        className="rounded-lg bg-red-600/90 px-3 py-1.5 text-xs text-white"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

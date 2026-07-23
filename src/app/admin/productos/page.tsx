"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import Modal from "@/components/Modal"
import { useAuth } from "@/components/AuthProvider"

interface Producto {
  id_producto: number
  nombre: string
  descripcion: string
  precio: number
  stock: number
  id_categoria: number
  estado: string
  imagen_url: string
  tallas?: string
  colores?: string
  imagenes_adicionales?: string
}


interface Categoria {
  id_categoria: number
  nombre_categoria: string
}

export default function AdminProductosPage() {
  const { profile } = useAuth()
  const isEditor = Number(profile?.id_rol) !== 2
  const [productos, setProductos] = useState<Producto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [editando, setEditando] = useState<number | null>(null)
  const [imagenEditando, setImagenEditando] = useState<File | null>(null)
  const [busqueda, setBusqueda] = useState("")

  const [nombre, setNombre] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [precio, setPrecio] = useState("")
  const [stockNuevo, setStockNuevo] = useState("10")
  const [categoria, setCategoria] = useState<number | "">("")
  const [estado, setEstado] = useState("activo")
  const [imagen, setImagen] = useState<File | null>(null)
  const [tallas, setTallas] = useState("")
  const [colores, setColores] = useState("")
  const [imagenesAdicionales, setImagenesAdicionales] = useState<File[]>([])

  const [modalOpen, setModalOpen] = useState(false)
  const [modalTitle, setModalTitle] = useState("")
  const [modalMessage, setModalMessage] = useState("")
  const [modalVariant, setModalVariant] = useState<"error" | "info">("info")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmTitle, setConfirmTitle] = useState("")
  const [confirmMessage, setConfirmMessage] = useState("")
  const [confirmAction, setConfirmAction] = useState<() => Promise<void> | void>(() => async () => {})
  const [confirmLabel, setConfirmLabel] = useState("Eliminar")

  const fetchProductos = useCallback(async () => {
    const { data } = await supabase.from("productos").select("*").order("id_producto", { ascending: false })
    if (data) setProductos(data as Producto[])
  }, [])

  const fetchCategorias = useCallback(async () => {
    const { data } = await supabase.from("categorias").select("*").order("id_categoria")
    if (data) setCategorias(data as Categoria[])
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      void fetchProductos()
      void fetchCategorias()
    })
  }, [fetchProductos, fetchCategorias])

  const catNombre = useMemo(() => {
    const m = new Map<number, string>()
    categorias.forEach((c) => m.set(c.id_categoria, c.nombre_categoria))
    return m
  }, [categorias])

  const subirImagen = async (file: File) => {
    const fileName = `${crypto.randomUUID()}-${file.name}`
    const { error } = await supabase.storage.from("productos").upload(fileName, file)
    if (error) {
      setModalTitle("Error al subir imagen")
      setModalMessage(error.message || "No se pudo subir el archivo.")
      setModalVariant("error")
      setModalOpen(true)
      return null
    }
    const { data } = supabase.storage.from("productos").getPublicUrl(fileName)
    return data.publicUrl
  }

  const crearProducto = async () => {
    if (!nombre || !descripcion || !precio || categoria === "") {
      setModalTitle("Faltan datos")
      setModalMessage("Completa nombre, descripción, precio y categoría.")
      setModalVariant("info")
      setModalOpen(true)
      return
    }

    let imageUrl = ""
    if (imagen) {
      const url = await subirImagen(imagen)
      if (url) imageUrl = url
    }

    // Procesar imagenes adicionales
    let imagenesAdicionalesUrls = ""
    if (imagenesAdicionales.length > 0) {
      const urls: string[] = []
      for (const file of imagenesAdicionales) {
        const url = await subirImagen(file)
        if (url) urls.push(url)
      }
      imagenesAdicionalesUrls = urls.join("|")
    }

    await supabase.from("productos").insert([
      {
        nombre,
        descripcion,
        precio: Number(precio),
        stock: Number(stockNuevo) || 0,
        id_categoria: Number(categoria),
        estado,
        imagen_url: imageUrl,
        tallas: tallas || null,
        colores: colores || null,
        imagenes_adicionales: imagenesAdicionalesUrls || null,
      },
    ])

    setNombre("")
    setDescripcion("")
    setPrecio("")
    setStockNuevo("10")
    setCategoria("")
    setEstado("activo")
    setImagen(null)
    setTallas("")
    setColores("")
    setImagenesAdicionales([])
    void fetchProductos()
    setModalTitle("Producto agregado")
    setModalMessage("El producto se agregó correctamente al catálogo.")
    setModalVariant("info")
    setModalOpen(true)
  }

  const actualizarProducto = async (producto: Producto, nuevaImagen?: File, nuevasImagenesAdicionales?: File[]) => {
    let imageUrl = producto.imagen_url
    if (nuevaImagen) {
      const url = await subirImagen(nuevaImagen)
      if (url) imageUrl = url
    }

    // Procesar imagenes adicionales
    let imagenesAdicionalesUrls = producto.imagenes_adicionales || ""
    if (nuevasImagenesAdicionales && nuevasImagenesAdicionales.length > 0) {
      const urls: string[] = []
      for (const file of nuevasImagenesAdicionales) {
        const url = await subirImagen(file)
        if (url) urls.push(url)
      }
      imagenesAdicionalesUrls = urls.join("|")
    }

    await supabase
      .from("productos")
      .update({
        nombre: producto.nombre,
        descripcion: producto.descripcion,
        precio: producto.precio,
        stock: producto.stock,
        id_categoria: producto.id_categoria,
        estado: producto.estado,
        imagen_url: imageUrl,
        tallas: producto.tallas || null,
        colores: producto.colores || null,
        imagenes_adicionales: imagenesAdicionalesUrls || null,
      })
      .eq("id_producto", producto.id_producto)

    setEditando(null)
    setImagenEditando(null)
    void fetchProductos()
    setModalTitle("Producto actualizado")
    setModalMessage("Los cambios se guardaron correctamente.")
    setModalVariant("info")
    setModalOpen(true)
  }

  const eliminarProducto = async (id: number) => {
    if (isEditor) return
    const { data: { session } } = await supabase.auth.getSession()
    const response = await fetch(`/api/admin/productos/${id}`, {
      method: "DELETE",
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
    })
    const body = await response.json()
    if (!response.ok) {
      setModalTitle("Error al eliminar")
      setModalMessage(body.error || "No se pudo eliminar el producto.")
      setModalVariant("error")
      setModalOpen(true)
      return
    }
    void fetchProductos()
    setModalTitle("Producto eliminado")
    setModalMessage("El producto se eliminó correctamente.")
    setModalVariant("info")
    setModalOpen(true)
  }

  const confirmEliminarProducto = (id: number) => {
    setConfirmTitle("Eliminar producto")
    setConfirmMessage("¿Seguro que quieres eliminar este producto?")
    setConfirmLabel("Eliminar")
    setConfirmAction(() => async () => await eliminarProducto(id))
    setConfirmOpen(true)
  }

  const actualizarEstadoProducto = async (producto: Producto, estadoNuevo: string) => {
    setProductos((prev) =>
      prev.map((p) =>
        p.id_producto === producto.id_producto ? { ...p, estado: estadoNuevo } : p
      )
    )
    await supabase
      .from("productos")
      .update({ estado: estadoNuevo })
      .eq("id_producto", producto.id_producto)
    void fetchProductos()
  }

  const productosFiltrados = productos.filter(
    (p) =>
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.descripcion.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div className="space-y-8">
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

      <div>
        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Productos</h1>
        <p className="text-sm text-zinc-500 mt-1">Insertar, editar y eliminar productos del catálogo.</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-zinc-950/50 p-5 md:p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <i className="ri-add-circle-line text-purple-400" aria-hidden />
          Agregar producto
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <input
            className="rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none focus:border-purple-500"
            placeholder="Nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
          <input
            className="rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none focus:border-purple-500 sm:col-span-2"
            placeholder="Descripción"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
          <input
            className="rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none focus:border-purple-500"
            type="number"
            step="0.01"
            placeholder="Precio"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
          />
          <input
            className="rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none focus:border-purple-500"
            type="number"
            min={0}
            placeholder="Stock"
            value={stockNuevo}
            onChange={(e) => setStockNuevo(e.target.value)}
          />
          <select
            className="rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none focus:border-purple-500"
            value={categoria === "" ? "" : String(categoria)}
            onChange={(e) => setCategoria(e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">Seleccionar categoría</option>
            {categorias.map((cat) => (
              <option key={cat.id_categoria} value={cat.id_categoria}>
                {cat.nombre_categoria}
              </option>
            ))}
          </select>
          <select
            className="rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none focus:border-purple-500"
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
          >
            <option value="activo">Disponible</option>
            <option value="inactivo">No disponible</option>
          </select>
          <input
            type="file"
            accept="image/*"
            className="text-sm text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-purple-600 file:px-3 file:py-2 file:text-white"
            onChange={(e) => setImagen(e.target.files?.[0] ?? null)}
          />
          <input
            className="rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none focus:border-purple-500 lg:col-span-2"
            placeholder="Tallas (ej: XS, S, M, L, XL)"
            value={tallas}
            onChange={(e) => setTallas(e.target.value)}
          />
          <input
            className="rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none focus:border-purple-500 lg:col-span-2"
            placeholder="Colores (ej: Negro, Blanco, Rojo)"
            value={colores}
            onChange={(e) => setColores(e.target.value)}
          />
          <input
            type="file"
            multiple
            accept="image/*"
            className="text-sm text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-purple-600 file:px-3 file:py-2 file:text-white lg:col-span-2"
            onChange={(e) => setImagenesAdicionales(Array.from(e.target.files ?? []))}
          />
          {imagenesAdicionales.length > 0 && (
            <p className="text-xs text-purple-300 lg:col-span-3">{imagenesAdicionales.length} imagen(es) seleccionada(s)</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => void crearProducto()}
          className="rounded-full bg-gradient-to-r from-[#6b2ad4] to-[#580096] px-6 py-3 text-sm font-semibold text-white hover:opacity-95 transition"
        >
          Crear producto
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-zinc-950/50 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Listado</h2>
          <div className="relative flex-1 max-w-md">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" aria-hidden />
            <input
              type="text"
              placeholder="Buscar..."
              className="w-full rounded-xl border border-white/10 bg-black/60 py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-purple-500"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-zinc-500 uppercase text-[11px] tracking-wider">
                <th className="px-4 py-3 font-medium">Producto</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Categoría</th>
                <th className="px-4 py-3 font-medium">Precio</th>
                <th className="px-4 py-3 font-medium">Stock</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productosFiltrados.map((producto) =>
                editando === producto.id_producto ? (
                  <tr key={producto.id_producto} className="border-b border-white/5 bg-purple-950/20 align-top">
                    <td className="px-4 py-4" colSpan={6}>
                      <div className="grid sm:grid-cols-2 gap-3 max-w-4xl">
                        <input
                          className="rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-white"
                          value={producto.nombre}
                          onChange={(e) =>
                            setProductos((prev) =>
                              prev.map((p) =>
                                p.id_producto === producto.id_producto
                                  ? { ...p, nombre: e.target.value }
                                  : p
                              )
                            )
                          }
                        />
                        <input
                          className="rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-white sm:col-span-2"
                          value={producto.descripcion}
                          onChange={(e) =>
                            setProductos((prev) =>
                              prev.map((p) =>
                                p.id_producto === producto.id_producto
                                  ? { ...p, descripcion: e.target.value }
                                  : p
                              )
                            )
                          }
                        />
                        <input
                          type="number"
                          step="0.01"
                          className="rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-white"
                          value={producto.precio}
                          onChange={(e) =>
                            setProductos((prev) =>
                              prev.map((p) =>
                                p.id_producto === producto.id_producto
                                  ? { ...p, precio: Number(e.target.value) }
                                  : p
                              )
                            )
                          }
                        />
                        <input
                          type="number"
                          className="rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-white"
                          value={producto.stock}
                          onChange={(e) =>
                            setProductos((prev) =>
                              prev.map((p) =>
                                p.id_producto === producto.id_producto
                                  ? { ...p, stock: Number(e.target.value) }
                                  : p
                              )
                            )
                          }
                        />
                        <select
                          className="rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-white"
                          value={producto.id_categoria}
                          onChange={(e) =>
                            setProductos((prev) =>
                              prev.map((p) =>
                                p.id_producto === producto.id_producto
                                  ? { ...p, id_categoria: Number(e.target.value) }
                                  : p
                              )
                            )
                          }
                        >
                          {categorias.map((cat) => (
                            <option key={cat.id_categoria} value={cat.id_categoria}>
                              {cat.nombre_categoria}
                            </option>
                          ))}
                        </select>
                        <select
                          className="rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-white"
                          value={producto.estado}
                          onChange={(e) =>
                            setProductos((prev) =>
                              prev.map((p) =>
                                p.id_producto === producto.id_producto
                                  ? { ...p, estado: e.target.value }
                                  : p
                              )
                            )
                          }
                        >
                          <option value="activo">Disponible</option>
                          <option value="inactivo">No disponible</option>
                        </select>
                        <input
                          className="rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-white sm:col-span-2"
                          placeholder="Tallas (ej: XS, S, M, L, XL)"
                          value={producto.tallas || ""}
                          onChange={(e) =>
                            setProductos((prev) =>
                              prev.map((p) =>
                                p.id_producto === producto.id_producto
                                  ? { ...p, tallas: e.target.value }
                                  : p
                              )
                            )
                          }
                        />
                        <input
                          className="rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-white sm:col-span-2"
                          placeholder="Colores (ej: Negro, Blanco, Rojo)"
                          value={producto.colores || ""}
                          onChange={(e) =>
                            setProductos((prev) =>
                              prev.map((p) =>
                                p.id_producto === producto.id_producto
                                  ? { ...p, colores: e.target.value }
                                  : p
                              )
                            )
                          }
                        />
                        <input
                          type="file"
                          accept="image/*"
                          className="text-xs text-zinc-400 sm:col-span-2"
                          onChange={(e) => setImagenEditando(e.target.files?.[0] ?? null)}
                        />
                        <div className="flex gap-2 sm:col-span-2">
                          <button
                            type="button"
                            onClick={() => void actualizarProducto(producto, imagenEditando ?? undefined)}
                            className="rounded-lg bg-emerald-600 px-4 py-2 text-white text-sm font-medium"
                          >
                            Guardar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditando(null)
                              void fetchProductos()
                            }}
                            className="rounded-lg border border-white/20 px-4 py-2 text-sm text-zinc-300"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={producto.id_producto} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-lg overflow-hidden bg-zinc-800 shrink-0 border border-white/10">
                          {producto.imagen_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={producto.imagen_url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-zinc-600">
                              <i className="ri-image-line" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-white truncate">{producto.nombre}</p>
                          <p className="text-xs text-zinc-500 line-clamp-1 md:hidden">
                            {catNombre.get(producto.id_categoria) ?? "—"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 hidden md:table-cell">
                      {catNombre.get(producto.id_categoria) ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-white tabular-nums">${producto.precio.toFixed(0)}</td>
                    <td className="px-4 py-3 text-zinc-300 tabular-nums">{producto.stock}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          producto.estado === "activo"
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-zinc-600/40 text-zinc-400"
                        }`}
                      >
                        {producto.estado === "activo" ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {isEditor ? (
                        <select
                          value={producto.estado}
                          onChange={(e) => void actualizarEstadoProducto(producto, e.target.value)}
                          className="rounded-lg border border-white/15 bg-black/60 px-3 py-1.5 text-xs text-white outline-none"
                        >
                          <option value="activo">Disponible</option>
                          <option value="inactivo">No disponible</option>
                        </select>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setEditando(producto.id_producto)
                              setImagenEditando(null)
                            }}
                            className="mr-2 rounded-lg bg-amber-500/90 px-3 py-1.5 text-xs font-medium text-black hover:bg-amber-400"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => confirmEliminarProducto(producto.id_producto)}
                            className="rounded-lg bg-red-600/90 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500"
                          >
                            Eliminar
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
          {productosFiltrados.length === 0 && (
            <p className="p-8 text-center text-zinc-500 text-sm">No hay productos que coincidan.</p>
          )}
        </div>
      </div>
    </div>
  )
}

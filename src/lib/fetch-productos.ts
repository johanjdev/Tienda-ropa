export type ProductoActivo = {
  id_producto: number
  nombre: string
  descripcion: string
  precio: number
  imagen_url: string | null
  /** FK hacia `categorias.id_categoria` */
  id_categoria?: number | null
  /** Texto legado si existiera en filas antiguas */
  categoria?: string | null
  stock?: number | null
  estado?: string | null
}

export type CategoriaCatalogo = {
  id_categoria: number
  nombre_categoria: string
}

export async function fetchProductosActivos(): Promise<{
  data: ProductoActivo[]
  categorias: CategoriaCatalogo[]
  error: string | null
}> {
  try {
    const res = await fetch("/api/productos", { cache: "no-store" })
    const body = (await res.json()) as {
      data?: ProductoActivo[]
      categorias?: CategoriaCatalogo[]
      error?: string
    }
    if (!res.ok) {
      return {
        data: [],
        categorias: [],
        error: body.error || `Error ${res.status}`,
      }
    }
    return {
      data: body.data ?? [],
      categorias: body.categorias ?? [],
      error: null,
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error de red"
    return { data: [], categorias: [], error: msg }
  }
}

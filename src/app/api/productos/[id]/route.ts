import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getSupabasePublicEnv } from "@/lib/supabase-public-env"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const idProducto = Number(id)

  if (!Number.isInteger(idProducto)) {
    return NextResponse.json({ error: "Producto no valido." }, { status: 400 })
  }

  const { url, anonKey, configured } = getSupabasePublicEnv()
  if (!configured) {
    return NextResponse.json(
      { error: "Configura las variables de Supabase en .env.local." },
      { status: 503 }
    )
  }

  const supabase = createClient(url, anonKey)
  const { data, error } = await supabase
    .from("productos")
    .select("*, categorias(nombre_categoria)")
    .eq("id_producto", idProducto)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  if (!data) {
    return NextResponse.json({ error: "Producto no encontrado." }, { status: 404 })
  }

  return NextResponse.json({ data })
}

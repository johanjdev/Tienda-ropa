import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getSupabasePublicEnv } from "@/lib/supabase-public-env"

/** Lista productos activos leyendo Supabase en el servidor (evita bundle cliente desactualizado con .env). */
export async function GET() {
  const { url, anonKey, configured } = getSupabasePublicEnv()

  if (!configured) {
    return NextResponse.json(
      {
        error:
          "Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local y reinicia el servidor (npm run dev).",
      },
      { status: 503 }
    )
  }

  const supabase = createClient(url, anonKey)

  const [productosRes, categoriasRes] = await Promise.all([
    supabase
      .from("productos")
      .select("*")
      .eq("estado", "activo")
      .order("id_producto", { ascending: false }),
    supabase
      .from("categorias")
      .select("id_categoria, nombre_categoria")
      .order("id_categoria", { ascending: true }),
  ])

  if (productosRes.error) {
    return NextResponse.json(
      {
        error: productosRes.error.message,
        code: productosRes.error.code,
        details: productosRes.error.details,
      },
      { status: 400 }
    )
  }

  return NextResponse.json({
    data: productosRes.data ?? [],
    categorias: categoriasRes.data ?? [],
  })
}

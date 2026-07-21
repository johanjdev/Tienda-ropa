import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { createClient } from "@supabase/supabase-js"
import { getSupabasePublicEnv } from "@/lib/supabase-public-env"

const SLUG_TO_TABLE: Record<string, string> = {
  usuarios: "usuarios",
  carrito: "carrito",
  cupones: "cupones",
  devoluciones: "devoluciones",
  roles: "roles",
  logs: "logs",
  "tipo-documento": "tipo_documento",
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const table = SLUG_TO_TABLE[slug]

  if (!table) return NextResponse.json({ error: "Tabla no permitida." }, { status: 404 })

  const admin = await requireAdmin(request)
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status })
  }

  const { url } = getSupabasePublicEnv()
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  const tableClient = serviceKey ? createClient(url, serviceKey) : admin.supabase

  const { data, error } = await tableClient.from(table).select("*").limit(150)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({
    table,
    rows: data ?? [],
  })
}

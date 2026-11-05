import { NextResponse } from "next/server"
import { requireUser } from "@/lib/admin-auth"

export async function POST(request: Request) {
  const auth = await requireUser(request)
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { supabase, profile } = auth

  const { data, error } = await supabase
    .from("pedidos")
    .select(
      `id_pedido, estado, total, fecha_pedido, numero_guia, transportadora, novedad_detalle, detalle_pedidos(id_detalle, id_producto, cantidad, precio_unitario, subtotal, productos(nombre, imagen_url))`
    )
    .eq("id_usuario", profile.id_usuario)
    .order("id_pedido", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ pedidos: data ?? [] }, { headers: { "Cache-Control": "no-store" } })
}

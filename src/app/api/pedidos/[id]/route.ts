import { NextResponse } from "next/server"
import { requireUser } from "@/lib/admin-auth"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const auth = await requireUser(request)
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { supabase, profile } = auth

  const { data, error } = await supabase
    .from("pedidos")
    .select(`
      id_pedido,
      id_usuario,
      direccion_envio,
      estado,
      total,
      fecha_pedido,
      numero_guia,
      transportadora,
      novedad_detalle,
      detalle_pedidos(
        id_producto,
        cantidad,
        precio_unitario,
        subtotal,
        productos(nombre, imagen_url)
      )
    `)
    .eq("id_pedido", Number(id))
    .eq("id_usuario", profile.id_usuario)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!data) return NextResponse.json({ error: "Pedido no encontrado." }, { status: 404 })

  return NextResponse.json({ pedido: data })
}

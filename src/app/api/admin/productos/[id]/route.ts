import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request)
  if ("error" in admin) return NextResponse.json({ error: admin.error }, { status: admin.status })
  const { id } = await params
  const idProducto = Number(id)
  if (!idProducto) return NextResponse.json({ error: "Producto inválido." }, { status: 400 })
  const { data: detalles, error: checkError } = await admin.supabase.from("detalle_pedidos").select("id_detalle, pedidos!inner(estado)").eq("id_producto", idProducto)
  if (checkError) return NextResponse.json({ error: checkError.message }, { status: 400 })
  const enProceso = (detalles ?? []).some((detalle) => {
    const pedido = Array.isArray(detalle.pedidos) ? detalle.pedidos[0] : detalle.pedidos
    return ["pendiente", "enviado"].includes(String(pedido?.estado || "pendiente").toLowerCase())
  })
  if (enProceso) return NextResponse.json({ error: "No se puede eliminar: el producto hace parte de un pedido en proceso." }, { status: 409 })
  const { error } = await admin.supabase.from("productos").delete().eq("id_producto", idProducto)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

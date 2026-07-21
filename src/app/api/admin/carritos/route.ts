import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"

export async function GET(request: Request) {
  const admin = await requireAdmin(request)
  if ("error" in admin) return NextResponse.json({ error: admin.error }, { status: admin.status })

  const { data, error } = await admin.supabase
    .from("carrito")
    .select(`
      id_carrito,
      id_usuario,
      fecha_creacion,
      usuarios(nombre, email, telefono),
      carrito_productos(
        id_producto,
        cantidad,
        productos(nombre, precio, imagen_url)
      )
    `)
    .order("id_carrito", { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ carritos: data ?? [] })
}

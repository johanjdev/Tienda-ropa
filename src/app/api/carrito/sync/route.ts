import { NextResponse } from "next/server"
import { requireUser } from "@/lib/admin-auth"

type CartItem = {
  id_producto: number
  cantidad: number
  talla?: string | null
  color?: string | null
}

type Body = {
  items?: CartItem[]
}

export async function POST(request: Request) {
  const auth = await requireUser(request)
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { supabase, profile } = auth
  const body = (await request.json().catch(() => ({}))) as Body
  const items = Array.isArray(body.items) ? body.items : []

  const { data: existing, error: existingError } = await supabase
    .from("carrito")
    .select("id_carrito")
    .eq("id_usuario", profile.id_usuario)
    .maybeSingle()

  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 400 })

  let idCarrito = existing?.id_carrito as number | undefined
  if (!idCarrito) {
    const { data: created, error: createError } = await supabase
      .from("carrito")
      .insert([{ id_usuario: profile.id_usuario }])
      .select("id_carrito")
      .single()

    if (createError) return NextResponse.json({ error: createError.message }, { status: 400 })
    idCarrito = created.id_carrito
  }

  const { error: deleteError } = await supabase
    .from("carrito_productos")
    .delete()
    .eq("id_carrito", idCarrito)

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 400 })

  const cleanItemsWithAttributes = items
    .map((item) => ({
      id_carrito: idCarrito,
      id_producto: Number(item.id_producto),
      cantidad: Number(item.cantidad),
      talla: item.talla || null,
      color: item.color || null,
    }))
    .filter((item) => item.id_producto > 0 && item.cantidad > 0)

  if (cleanItemsWithAttributes.length > 0) {
    const { error: insertError } = await supabase
      .from("carrito_productos")
      .insert(cleanItemsWithAttributes)

    if (insertError) {
      const isMissingColumns =
        insertError.code === "PGRST204" ||
        insertError.message.includes("talla") ||
        insertError.message.includes("color")

      if (isMissingColumns) {
        const cleanItemsBasic = cleanItemsWithAttributes.map(({ id_carrito, id_producto, cantidad }) => ({
          id_carrito,
          id_producto,
          cantidad,
        }))
        const { error: retryError } = await supabase
          .from("carrito_productos")
          .insert(cleanItemsBasic)
        if (retryError) return NextResponse.json({ error: retryError.message }, { status: 400 })
      } else {
        return NextResponse.json({ error: insertError.message }, { status: 400 })
      }
    }
  }

  return NextResponse.json({ ok: true, id_carrito: idCarrito })
}

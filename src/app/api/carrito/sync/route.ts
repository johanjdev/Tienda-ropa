import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getSupabasePublicEnv } from "@/lib/supabase-public-env"

type CartItem = {
  id_producto: number
  cantidad: number
}

type Body = {
  items?: CartItem[]
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") || ""
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 })
  }

  const { url, anonKey, configured } = getSupabasePublicEnv()
  if (!configured) {
    return NextResponse.json({ error: "Supabase no esta configurado." }, { status: 503 })
  }

  const body = (await request.json().catch(() => ({}))) as Body
  const items = Array.isArray(body.items) ? body.items : []

  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: "Sesion no valida." }, { status: 401 })
  }

  const { data: usuario, error: usuarioError } = await supabase
    .from("usuarios")
    .select("id_usuario")
    .eq("auth_id", user.id)
    .maybeSingle()

  if (usuarioError) return NextResponse.json({ error: usuarioError.message }, { status: 400 })
  if (!usuario?.id_usuario) {
    return NextResponse.json({ error: "No existe perfil de usuario." }, { status: 400 })
  }

  const { data: existing, error: existingError } = await supabase
    .from("carrito")
    .select("id_carrito")
    .eq("id_usuario", usuario.id_usuario)
    .maybeSingle()

  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 400 })

  let idCarrito = existing?.id_carrito as number | undefined
  if (!idCarrito) {
    const { data: created, error: createError } = await supabase
      .from("carrito")
      .insert([{ id_usuario: usuario.id_usuario }])
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

  const cleanItems = items
    .map((item) => ({
      id_carrito: idCarrito,
      id_producto: Number(item.id_producto),
      cantidad: Number(item.cantidad),
    }))
    .filter((item) => item.id_producto > 0 && item.cantidad > 0)

  if (cleanItems.length > 0) {
    const { error: insertError } = await supabase.from("carrito_productos").insert(cleanItems)
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true, id_carrito: idCarrito })
}

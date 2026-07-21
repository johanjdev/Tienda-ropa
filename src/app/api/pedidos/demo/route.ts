import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getSupabasePublicEnv } from "@/lib/supabase-public-env"

type OrderItem = {
  id_producto: number
  cantidad: number
  precio: number
}

type Body = {
  items?: OrderItem[]
  subtotal?: number
  descuento?: number
  total?: number
  cupon_codigo?: string | null
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") || ""
  const body = (await request.json().catch(() => ({}))) as Body
  const items = Array.isArray(body.items) ? body.items : []

  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return NextResponse.json({ error: "Inicia sesion para crear el pedido." }, { status: 401 })
  }

  if (items.length === 0) {
    return NextResponse.json({ error: "El carrito esta vacio." }, { status: 400 })
  }

  const { url, anonKey, configured } = getSupabasePublicEnv()
  if (!configured) {
    return NextResponse.json({ error: "Supabase no esta configurado." }, { status: 503 })
  }

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
    .select("id_usuario, direccion")
    .eq("auth_id", user.id)
    .maybeSingle()

  if (usuarioError) {
    return NextResponse.json({ error: usuarioError.message }, { status: 400 })
  }

  if (!usuario?.id_usuario) {
    return NextResponse.json({ error: "No existe perfil de usuario para el pedido." }, { status: 400 })
  }

  const direccion = String(usuario.direccion || "").trim()
  if (!direccion) {
    return NextResponse.json(
      { error: "Agrega una direccion en tu perfil antes de comprar." },
      { status: 400 }
    )
  }

  const subtotalCalculado = items.reduce(
    (acc, item) => acc + Number(item.precio) * Number(item.cantidad),
    0
  )
  const descuento = Math.max(0, Number(body.descuento ?? 0))
  const total = Math.max(0, Number(body.total ?? subtotalCalculado - descuento))
  let cuponAplicado: { id_cupon: number; codigo: string; uso_maximo: number | null } | null = null

  if (body.cupon_codigo) {
    const codigo = String(body.cupon_codigo).trim().toUpperCase()
    const { data: cupon, error: cuponError } = await supabase
      .from("cupones")
      .select("id_cupon, codigo, porcentaje, uso_maximo, fecha_expiracion")
      .ilike("codigo", codigo)
      .maybeSingle()

    if (cuponError) return NextResponse.json({ error: cuponError.message }, { status: 400 })
    if (!cupon) return NextResponse.json({ error: "Cupon no encontrado." }, { status: 404 })

    const expiresAt = cupon.fecha_expiracion ? new Date(String(cupon.fecha_expiracion)) : null
    if (expiresAt && expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: "El cupon ya expiro." }, { status: 400 })
    }

    const usos = cupon.uso_maximo === null ? null : Number(cupon.uso_maximo)
    if (usos !== null && usos <= 0) {
      return NextResponse.json({ error: "El cupon ya no tiene usos disponibles." }, { status: 400 })
    }

    cuponAplicado = {
      id_cupon: Number(cupon.id_cupon),
      codigo: String(cupon.codigo),
      uso_maximo: usos,
    }
  }

  const { data: pedido, error: pedidoError } = await supabase
    .from("pedidos")
    .insert([
      {
        id_usuario: usuario.id_usuario,
        direccion_envio: direccion,
        estado: "pendiente",
        total,
      },
    ])
    .select("id_pedido")
    .single()

  if (pedidoError) {
    return NextResponse.json({ error: pedidoError.message }, { status: 400 })
  }

  const detalles = items.map((item) => ({
    id_pedido: pedido.id_pedido,
    id_producto: Number(item.id_producto),
    cantidad: Number(item.cantidad),
    precio_unitario: Number(item.precio),
    subtotal: Number(item.precio) * Number(item.cantidad),
  }))

  const { error: detalleError } = await supabase.from("detalle_pedidos").insert(detalles)
  if (detalleError) {
    return NextResponse.json({ error: detalleError.message }, { status: 400 })
  }

  if (cuponAplicado && cuponAplicado.uso_maximo !== null) {
    const { error: cuponUpdateError } = await supabase
      .from("cupones")
      .update({ uso_maximo: Math.max(0, cuponAplicado.uso_maximo - 1) })
      .eq("id_cupon", cuponAplicado.id_cupon)

    if (cuponUpdateError) {
      return NextResponse.json({ error: cuponUpdateError.message }, { status: 400 })
    }
  }

  await supabase.from("logs").insert([
    {
      id_usuario: usuario.id_usuario,
      accion: body.cupon_codigo
        ? `Pedido demo creado #${pedido.id_pedido} con cupon ${cuponAplicado?.codigo || body.cupon_codigo}`
        : `Pedido demo creado #${pedido.id_pedido}`,
      ip_usuario: request.headers.get("x-forwarded-for") || "local",
    },
  ])

  return NextResponse.json({
    ok: true,
    id_pedido: pedido.id_pedido,
    total,
    subtotal: subtotalCalculado,
    descuento,
    cupon_uso_restante:
      cuponAplicado?.uso_maximo === null || cuponAplicado?.uso_maximo === undefined
        ? null
        : Math.max(0, cuponAplicado.uso_maximo - 1),
  })
}

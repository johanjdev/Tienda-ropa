import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getSupabasePublicEnv } from "@/lib/supabase-public-env"

/**
 * Helper: crea cliente Supabase autenticado con el token del request.
 * Retorna null si el header Authorization no está presente o el token no es válido.
 */
async function getAuthenticatedClient(request: Request) {
  const authorization = request.headers.get("authorization") || ""
  if (!authorization.toLowerCase().startsWith("bearer "))
    return { client: null, user: null, usuario: null, error: "No autorizado." }

  const { url, anonKey, configured } = getSupabasePublicEnv()
  if (!configured)
    return { client: null, user: null, usuario: null, error: "Supabase no está configurado." }

  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
  })
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user)
    return { client: null, user: null, usuario: null, error: "Sesión no válida." }

  // Resolver id_usuario desde auth_id o email (igual que en /api/pedidos)
  let { data: usuario } = await supabase
    .from("usuarios")
    .select("id_usuario")
    .eq("auth_id", user.id)
    .maybeSingle()

  if (!usuario && user.email) {
    const { data: porEmail } = await supabase
      .from("usuarios")
      .select("id_usuario")
      .eq("email", user.email)
      .maybeSingle()
    if (porEmail) {
      usuario = porEmail
      await supabase
        .from("usuarios")
        .update({ auth_id: user.id })
        .eq("id_usuario", porEmail.id_usuario)
    }
  }

  if (!usuario?.id_usuario)
    return { client: supabase, user, usuario: null, error: "Usuario no encontrado." }

  return { client: supabase, user, usuario, error: null }
}

/**
 * POST /api/devoluciones
 * Uso 1: Listar devoluciones del usuario autenticado (sin body o body vacío).
 * Uso 2: Registrar solicitud de devolución (body con accion:"crear", id_pedido, id_producto, motivo).
 *
 * Usamos POST para todo el flujo tal como lo hace el resto de la aplicación.
 */
export async function POST(request: Request) {
  const { client: supabase, usuario, error } = await getAuthenticatedClient(request)
  if (error || !supabase || !usuario)
    return NextResponse.json({ error: error ?? "No autorizado." }, { status: 401 })

  // Intentar leer el body para saber qué acción ejecutar
  let body: Record<string, unknown> = {}
  try {
    const text = await request.text()
    if (text.trim()) body = JSON.parse(text)
  } catch {
    // body vacío → listar devoluciones
  }

  const accion = body.accion as string | undefined

  /* ─────────────────────────────────────────────
     LISTAR DEVOLUCIONES DEL USUARIO
     ───────────────────────────────────────────── */
  if (!accion || accion === "listar") {
    const { data, error: dbError } = await supabase
      .from("devoluciones")
      .select("id_devolucion, id_pedido, id_producto, motivo, estado, fecha_solicitud")
      .eq("id_usuario", usuario.id_usuario)
      .order("fecha_solicitud", { ascending: false })

    if (dbError)
      return NextResponse.json({ error: dbError.message }, { status: 400 })

    return NextResponse.json({ devoluciones: data ?? [] }, { headers: { "Cache-Control": "no-store" } })
  }

  /* ─────────────────────────────────────────────
     REGISTRAR SOLICITUD DE DEVOLUCIÓN
     ───────────────────────────────────────────── */
  if (accion === "crear") {
    const id_pedido = body.id_pedido as number | undefined
    const id_producto = body.id_producto as number | undefined
    const motivo = (body.motivo as string | undefined)?.trim()

    if (!id_pedido || !id_producto)
      return NextResponse.json({ error: "id_pedido e id_producto son requeridos." }, { status: 400 })
    if (!motivo || motivo.length < 10)
      return NextResponse.json({ error: "El motivo de devolución debe tener al menos 10 caracteres." }, { status: 400 })

    // 1. Verificar que el pedido pertenezca al usuario y esté en estado "entregado"
    const { data: pedido, error: pedidoError } = await supabase
      .from("pedidos")
      .select("id_pedido, estado, detalle_pedidos(id_detalle, id_producto, cantidad, subtotal)")
      .eq("id_pedido", id_pedido)
      .eq("id_usuario", usuario.id_usuario)
      .maybeSingle()

    if (pedidoError || !pedido)
      return NextResponse.json({ error: "Pedido no encontrado o no te pertenece." }, { status: 404 })

    if (pedido.estado !== "entregado")
      return NextResponse.json(
        { error: "Solo puedes solicitar devoluciones de pedidos entregados." },
        { status: 400 }
      )

    // 2. Verificar que el producto esté en el detalle del pedido
    const detalles = pedido.detalle_pedidos as { id_detalle: number; id_producto: number; cantidad: number; subtotal: number }[]
    const detalle = detalles?.find((d) => d.id_producto === id_producto)
    if (!detalle)
      return NextResponse.json({ error: "El producto no pertenece a ese pedido." }, { status: 400 })

    // 3. Verificar que no exista ya una devolución para este producto en este pedido
    const { data: existente } = await supabase
      .from("devoluciones")
      .select("id_devolucion, estado")
      .eq("id_pedido", id_pedido)
      .eq("id_producto", id_producto)
      .eq("id_usuario", usuario.id_usuario)
      .maybeSingle()

    if (existente)
      return NextResponse.json(
        { error: `Ya existe una solicitud de devolución con estado: ${existente.estado}.` },
        { status: 409 }
      )

    // 4. Insertar la solicitud de devolución
    const { error: insertError } = await supabase.from("devoluciones").insert({
      id_pedido,
      id_producto,
      id_usuario: usuario.id_usuario,
      motivo,
      estado: "pendiente",
    })

    if (insertError)
      return NextResponse.json({ error: insertError.message }, { status: 400 })

    // 5. Registrar en logs de auditoría (sin bloquear si falla)
    await supabase.from("logs").insert({
      accion: `Solicitud de devolución: producto #${id_producto} en pedido #${id_pedido}`,
      id_usuario: usuario.id_usuario,
    }).then(() => {/* silent */})

    return NextResponse.json({ ok: true, message: "Solicitud de devolución registrada exitosamente." })
  }

  return NextResponse.json({ error: "Acción no reconocida." }, { status: 400 })
}

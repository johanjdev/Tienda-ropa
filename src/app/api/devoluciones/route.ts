import { NextResponse } from "next/server"
import { requireUser } from "@/lib/admin-auth"

export async function POST(request: Request) {
  const auth = await requireUser(request)
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { supabase, profile: usuario } = auth

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

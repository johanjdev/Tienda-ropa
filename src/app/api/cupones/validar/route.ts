import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getSupabasePublicEnv } from "@/lib/supabase-public-env"

type Body = {
  codigo?: string
  subtotal?: number
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Body
  const codigo = body.codigo?.trim().toUpperCase()
  const subtotal = Number(body.subtotal ?? 0)

  if (!codigo) {
    return NextResponse.json({ error: "Ingresa un codigo de cupon." }, { status: 400 })
  }

  if (!Number.isFinite(subtotal) || subtotal <= 0) {
    return NextResponse.json({ error: "El carrito no tiene total valido." }, { status: 400 })
  }

  const { url, anonKey, configured } = getSupabasePublicEnv()
  if (!configured) {
    return NextResponse.json({ error: "Supabase no esta configurado." }, { status: 503 })
  }

  const supabase = createClient(url, anonKey)
  const { data, error } = await supabase
    .from("cupones")
    .select("*")
    .ilike("codigo", codigo)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  if (!data) {
    return NextResponse.json({ error: "Cupon no encontrado." }, { status: 404 })
  }

  const expiresAt = data.fecha_expiracion ? new Date(String(data.fecha_expiracion)) : null
  if (expiresAt && expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "El cupon ya expiro." }, { status: 400 })
  }

  const porcentaje = Number(data.porcentaje ?? 0)
  if (!Number.isFinite(porcentaje) || porcentaje <= 0) {
    return NextResponse.json({ error: "El cupon no tiene descuento valido." }, { status: 400 })
  }

  const usoMaximo = data.uso_maximo === null ? null : Number(data.uso_maximo)
  if (usoMaximo !== null && (!Number.isFinite(usoMaximo) || usoMaximo <= 0)) {
    return NextResponse.json({ error: "El cupon ya no tiene usos disponibles." }, { status: 400 })
  }

  const descuento = Math.round(subtotal * Math.min(porcentaje, 100) / 100)
  const total = Math.max(0, subtotal - descuento)

  return NextResponse.json({
    cupon: {
      id_cupon: data.id_cupon,
      codigo: data.codigo,
      porcentaje,
      uso_maximo: usoMaximo,
    },
    descuento,
    total,
  })
}

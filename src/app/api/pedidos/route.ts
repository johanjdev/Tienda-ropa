import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getSupabasePublicEnv } from "@/lib/supabase-public-env"

export async function GET(request: Request) {
  const authorization = request.headers.get("authorization") || ""
  if (!authorization.toLowerCase().startsWith("bearer ")) return NextResponse.json({ error: "No autorizado." }, { status: 401 })
  const { url, anonKey, configured } = getSupabasePublicEnv()
  if (!configured) return NextResponse.json({ error: "Supabase no esta configurado." }, { status: 503 })
  const supabase = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } })
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Sesion no valida." }, { status: 401 })
  const { data: usuario, error: usuarioError } = await supabase.from("usuarios").select("id_usuario").eq("auth_id", user.id).maybeSingle()
  if (usuarioError) return NextResponse.json({ error: usuarioError.message }, { status: 400 })
  const { data, error } = await supabase.from("pedidos").select(`id_pedido, estado, total, fecha_pedido, numero_guia, transportadora, detalle_pedidos(id_detalle, id_producto, cantidad, precio_unitario, subtotal, productos(nombre, imagen_url))`).eq("id_usuario", usuario?.id_usuario).order("id_pedido", { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ pedidos: data ?? [] }, { headers: { "Cache-Control": "no-store" } })
}

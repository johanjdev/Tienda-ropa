/**
 * /api/pedidos/[id]/route.ts
 * ──────────────────────────────────────────────────────────────
 * Ruta del API para que un usuario autenticado consulte el detalle
 * de uno de sus pedidos específicos.
 *
 * Método: GET /api/pedidos/:id
 *
 * Seguridad:
 * - Requiere un token Bearer en el header Authorization (sesión de Supabase).
 * - Valida que el pedido pertenezca al usuario autenticado comparando
 *   id_usuario del pedido con el id_usuario derivado del auth_id de Supabase.
 * - Si el pedido existe pero no pertenece al usuario, retorna 404
 *   (no revela la existencia del pedido a otros usuarios).
 *
 * Campos retornados:
 * - id_pedido, id_usuario, direccion_envio, estado, total, fecha_pedido
 * - numero_guia, transportadora  ← columnas añadidas para seguimiento de envío
 * - detalle_pedidos → lista de productos con nombre, imagen, cantidad y precios
 */

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getSupabasePublicEnv } from "@/lib/supabase-public-env"

/**
 * GET /api/pedidos/[id]
 * ──────────────────────────────────────────────────────────────
 * Retorna el detalle completo de un pedido si pertenece al usuario autenticado.
 *
 * @param request - Request de Next.js con el header Authorization
 * @param params  - Params dinámicos de la ruta; contiene `id` (string) del pedido
 *
 * Flujo:
 * 1. Extrae el token Bearer del header Authorization.
 * 2. Crea un cliente de Supabase pasando el token para que RLS se aplique.
 * 3. Verifica la sesión llamando a supabase.auth.getUser().
 * 4. Busca el id_usuario en la tabla `usuarios` usando el auth_id de Supabase Auth.
 * 5. Consulta el pedido filtrando por id_pedido AND id_usuario (doble seguridad).
 * 6. Retorna el pedido o un error 404 si no se encuentra.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Obtener el ID del pedido desde los parámetros dinámicos de la URL
  const { id } = await params

  // Extraer el token de sesión del header Authorization
  const authHeader = request.headers.get("authorization") || ""
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 })
  }

  // Verificar que las variables de entorno de Supabase estén configuradas
  const { url, anonKey, configured } = getSupabasePublicEnv()
  if (!configured) {
    return NextResponse.json({ error: "Supabase no esta configurado." }, { status: 503 })
  }

  // Crear cliente de Supabase con el token del usuario para que RLS funcione correctamente
  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  // Verificar que el token sea válido obteniendo los datos del usuario
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: "Sesion no valida." }, { status: 401 })
  }

  // Buscar el id_usuario interno (tabla `usuarios`) usando el auth_id de Supabase Auth.
  // Necesario porque la tabla `pedidos` usa id_usuario (no el UUID de auth).
  const { data: usuario, error: usuarioError } = await supabase
    .from("usuarios")
    .select("id_usuario")
    .eq("auth_id", user.id)
    .maybeSingle()

  if (usuarioError) return NextResponse.json({ error: usuarioError.message }, { status: 400 })

  // Consultar el pedido verificando que pertenezca al usuario autenticado.
  // El doble filtro (id_pedido + id_usuario) previene que un usuario
  // acceda a pedidos de otros usuarios aunque conozca el ID.
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
      detalle_pedidos(
        id_producto,
        cantidad,
        precio_unitario,
        subtotal,
        productos(nombre, imagen_url)
      )
    `)
    .eq("id_pedido", Number(id))
    .eq("id_usuario", usuario?.id_usuario) // seguridad: solo devuelve el pedido si es del usuario
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!data) return NextResponse.json({ error: "Pedido no encontrado." }, { status: 404 })

  return NextResponse.json({ pedido: data })
}

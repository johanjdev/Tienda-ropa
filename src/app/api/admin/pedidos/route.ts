/**
 * /api/admin/pedidos/route.ts
 * ──────────────────────────────────────────────────────────────
 * Rutas del API para la gestión de pedidos desde el panel administrador.
 *
 * Métodos disponibles:
 * - GET  → lista todos los pedidos con detalles, estadísticas de productos
 *          más y menos pedidos. Solo accesible para admins/editores.
 * - PUT  → actualiza el estado de un pedido, guarda número de guía
 *          y transportadora, registra la acción en logs, y envía
 *          un correo de notificación al usuario con los nuevos datos.
 *
 * Protección: requireAdminOrEditor() valida que el token de sesión
 * pertenezca a un usuario con rol administrador o editor.
 */

import { NextResponse } from "next/server"
import { requireAdminOrEditor } from "@/lib/admin-auth"

/**
 * Estados permitidos para un pedido.
 * Solo se puede actualizar a uno de estos tres valores.
 */
const ESTADOS_PERMITIDOS = ["pendiente", "enviado", "entregado"]

/**
 * Tipo auxiliar para los detalles de un pedido usados en el correo.
 * Representa una línea de producto dentro del pedido.
 */
type DetalleCorreo = { cantidad: number; precio_unitario: number; subtotal: number; productos?: { nombre?: string | null } | null }

/**
 * enviarActualizacionPedido
 * ──────────────────────────────────────────────────────────────
 * Envía un correo electrónico al usuario cuando su pedido es actualizado.
 * Usa la API de Resend (https://resend.com) configurada con las variables
 * de entorno RESEND_API_KEY y ORDER_EMAIL_FROM.
 *
 * Si no están configuradas las variables de entorno, retorna sin enviar.
 * El correo incluye:
 * - Saludo con el nombre del usuario
 * - Nuevo estado del pedido
 * - Transportadora y número de guía (si están disponibles)
 * - Lista de productos con cantidades y subtotales
 * - Total del pedido
 *
 * @param input.email          - Correo del destinatario (el usuario)
 * @param input.nombre         - Nombre del usuario para el saludo
 * @param input.idPedido       - Número del pedido
 * @param input.estado         - Nuevo estado del pedido (pendiente/enviado/entregado)
 * @param input.numeroGuia     - Número de guía de envío (opcional)
 * @param input.transportadora - Nombre de la empresa de transporte (opcional)
 * @param input.detalles       - Lista de productos del pedido
 * @param input.total          - Valor total del pedido en pesos
 * @returns { sent: boolean, reason?: string }
 */
async function enviarActualizacionPedido(input: {
  email: string
  nombre: string
  idPedido: number
  estado: string
  numeroGuia?: string | null
  transportadora?: string | null
  detalles: DetalleCorreo[]
  total: number
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = process.env.ORDER_EMAIL_FROM?.trim()
  if (!apiKey || !from) return { sent: false, reason: "Correo no configurado" }

  // Construye la lista HTML de productos del pedido
  const items = input.detalles.map((d) => `<li>${d.cantidad} × ${d.productos?.nombre || "Producto"} — $${Number(d.subtotal || d.precio_unitario * d.cantidad).toLocaleString("es-CO")}</li>`).join("")

  // Bloque HTML con la información de envío (solo si hay número de guía)
  const envio = input.numeroGuia
    ? `<p><strong>Transportadora:</strong> ${input.transportadora || "Por confirmar"}<br /><strong>Número de guía:</strong> ${input.numeroGuia}</p>`
    : ""

  // HTML completo del correo
  const html = `<main><h1>Actualización de tu pedido #${input.idPedido}</h1><p>Hola ${input.nombre || ""}, tu pedido ahora está <strong>${input.estado}</strong>.</p>${envio}<h2>Productos</h2><ul>${items}</ul><p><strong>Total: $${Number(input.total).toLocaleString("es-CO")}</strong></p><p>Gracias por comprar con nosotros.</p></main>`

  // Llamada a la API de Resend
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [input.email], subject: `Actualización de tu pedido #${input.idPedido}`, html }),
  })
  if (!response.ok) throw new Error("No se pudo enviar el correo de actualización.")
  return { sent: true }
}

/**
 * GET /api/admin/pedidos
 * ──────────────────────────────────────────────────────────────
 * Retorna la lista completa de pedidos (máx. 100) ordenados por ID descendente.
 * Cada pedido incluye datos del usuario, dirección, estado, total, guía,
 * transportadora y el detalle de productos.
 *
 * Adicionalmente calcula:
 * - `productoMasPedido`  → el producto con más unidades totales vendidas
 * - `productoMenosPedido` → el producto con menos unidades totales vendidas
 *
 * Respuesta JSON: { pedidos, productoMasPedido, productoMenosPedido }
 */
export async function GET(request: Request) {
  // Verificar que el solicitante tenga rol administrador o editor
  const admin = await requireAdminOrEditor(request)
  if ("error" in admin) return NextResponse.json({ error: admin.error }, { status: admin.status })

  // Consulta principal: todos los pedidos con relaciones anidadas
  const { data, error } = await admin.supabase
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
      usuarios(nombre, email, telefono),
      detalle_pedidos(
        id_detalle,
        id_producto,
        cantidad,
        precio_unitario,
        subtotal,
        productos(nombre, imagen_url)
      )
    `)
    .order("id_pedido", { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Acumula las cantidades totales por producto para calcular estadísticas
  const totals = new Map<number, { id_producto: number; nombre: string; cantidad: number }>()
  for (const pedido of data ?? []) {
    for (const detalle of pedido.detalle_pedidos ?? []) {
      const id = Number(detalle.id_producto)
      const current = totals.get(id)
      // Supabase puede devolver la relación como array o como objeto según la cardinalidad
      const producto = Array.isArray(detalle.productos)
        ? detalle.productos[0]
        : detalle.productos
      totals.set(id, {
        id_producto: id,
        nombre: producto?.nombre || `Producto ${id}`,
        cantidad: (current?.cantidad ?? 0) + Number(detalle.cantidad || 0),
      })
    }
  }

  // Ordena de mayor a menor cantidad para determinar el más y el menos pedido
  const productStats = [...totals.values()].sort((a, b) => b.cantidad - a.cantidad)

  return NextResponse.json({
    pedidos: data ?? [],
    productoMasPedido: productStats[0] ?? null,
    productoMenosPedido: productStats.at(-1) ?? null,
  })
}

/**
 * PUT /api/admin/pedidos
 * ──────────────────────────────────────────────────────────────
 * Actualiza el estado de un pedido y opcionalmente su información de envío.
 *
 * Cuerpo esperado (JSON):
 * {
 *   id_pedido:     number   — ID del pedido a actualizar (requerido)
 *   estado:        string   — Nuevo estado: "pendiente" | "enviado" | "entregado"
 *   numero_guia:   string?  — Número de guía del paquete (opcional)
 *   transportadora: string? — Nombre de la transportadora (opcional)
 * }
 *
 * Flujo:
 * 1. Valida permisos (admin/editor).
 * 2. Valida que el estado sea uno de los permitidos.
 * 3. Actualiza la fila en la tabla `pedidos`.
 * 4. Registra la acción en la tabla `logs`.
 * 5. Obtiene los detalles completos del pedido para el correo.
 * 6. Envía el correo de notificación al usuario.
 *
 * Respuesta JSON: { ok: true, emailSent: boolean, emailError: string | null }
 */
export async function PUT(request: Request) {
  // Verificar que el solicitante tenga rol administrador o editor
  const admin = await requireAdminOrEditor(request)
  if ("error" in admin) return NextResponse.json({ error: admin.error }, { status: admin.status })

  // Parsear el cuerpo de la solicitud (retorna {} si falla el parse)
  const body = await request.json().catch(() => ({}))
  const idPedido = Number(body.id_pedido)
  const estado = String(body.estado || "").trim().toLowerCase()
  // Si el campo viene en el body se convierte a string; si no viene se deja null
  const numero_guia = body.numero_guia !== undefined ? String(body.numero_guia).trim() : null
  const transportadora = body.transportadora !== undefined ? String(body.transportadora).trim() : null

  // Validaciones básicas
  if (!idPedido) return NextResponse.json({ error: "Pedido invalido." }, { status: 400 })
  if (!ESTADOS_PERMITIDOS.includes(estado)) {
    return NextResponse.json({ error: "Estado no permitido." }, { status: 400 })
  }

  // Actualizar estado, número de guía y transportadora en la base de datos
  const { error } = await admin.supabase
    .from("pedidos")
    .update({
      estado,
      numero_guia: numero_guia || null,
      transportadora: transportadora || null
    })
    .eq("id_pedido", idPedido)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Construir el texto del log según qué campos se actualizaron
  let logAccion = `Estado de pedido #${idPedido} actualizado a ${estado}`
  if (numero_guia) logAccion += `, guía: ${numero_guia}`
  if (transportadora) logAccion += `, transportadora: ${transportadora}`

  // Registrar la acción en la tabla de auditoría `logs`
  await admin.supabase.from("logs").insert([
    {
      id_usuario: admin.profile?.id_usuario ?? null,
      accion: logAccion,
      ip_usuario: request.headers.get("x-forwarded-for") || "local",
    },
  ])

  // Obtener detalles completos del pedido para construir el correo de notificación
  const { data: pedido, error: fetchError } = await admin.supabase
    .from("pedidos")
    .select(`
      id_pedido,
      estado,
      total,
      numero_guia,
      transportadora,
      usuarios(nombre, email),
      detalle_pedidos(
        cantidad,
        precio_unitario,
        subtotal,
        productos(nombre)
      )
    `)
    .eq("id_pedido", idPedido)
    .maybeSingle()

  let emailSent = false
  let emailError = null

  // Supabase puede devolver `usuarios` como array o como objeto
  const usuarioInfo = pedido?.usuarios
    ? (Array.isArray(pedido.usuarios) ? pedido.usuarios[0] : pedido.usuarios) as any
    : null

  // Solo se envía el correo si se encontraron los datos del usuario y tiene email
  if (!fetchError && pedido && usuarioInfo && usuarioInfo.email) {
    try {
      // Normaliza los detalles del pedido al tipo DetalleCorreo
      const detallesMapeados: DetalleCorreo[] = (pedido.detalle_pedidos || []).map((det: any) => {
        const prod = det.productos
          ? (Array.isArray(det.productos) ? det.productos[0] : det.productos)
          : null
        return {
          cantidad: Number(det.cantidad || 0),
          precio_unitario: Number(det.precio_unitario || 0),
          subtotal: Number(det.subtotal || 0),
          productos: prod ? { nombre: prod.nombre } : null
        }
      })

      // Enviar el correo de notificación
      const emailResult = await enviarActualizacionPedido({
        email: usuarioInfo.email,
        nombre: usuarioInfo.nombre || "Usuario",
        idPedido: pedido.id_pedido,
        estado: pedido.estado || "pendiente",
        numeroGuia: pedido.numero_guia,
        transportadora: pedido.transportadora,
        detalles: detallesMapeados,
        total: Number(pedido.total || 0),
      })
      emailSent = emailResult.sent
      if (!emailResult.sent) {
        emailError = emailResult.reason
      }
    } catch (err) {
      console.error("Error al enviar correo:", err)
      emailError = err instanceof Error ? err.message : "Error desconocido al enviar correo"
    }
  }

  return NextResponse.json({ ok: true, emailSent, emailError })
}

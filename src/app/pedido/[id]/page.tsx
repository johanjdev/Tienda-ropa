/**
 * /pedido/[id]/page.tsx
 * ──────────────────────────────────────────────────────────────
 * Página de confirmación y detalle de un pedido para el usuario final.
 *
 * Se muestra después de completar una compra o cuando el usuario
 * navega a /pedido/:id desde su perfil.
 *
 * Secciones de la UI:
 * 1. Estado de carga (skeleton animado mientras obtiene los datos).
 * 2. Error (si el pedido no se encuentra o hay un fallo de red).
 * 3. Confirmación exitosa con:
 *    - Encabezado de pedido creado (icono verde de verificación)
 *    - Estado actual del pedido
 *    - Información de envío (transportadora + guía, si ya fue asignada)
 *    - Dirección de entrega
 *    - Total del pedido
 *    - Lista detallada de productos
 *    - Botones para seguir comprando o ir a la cuenta
 */

"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { useAuth } from "@/components/AuthProvider"
import { supabase } from "@/lib/supabase"
import { formatCOP } from "@/lib/format"

/**
 * Tipo que representa una línea de detalle dentro de un pedido.
 * Cada línea corresponde a un producto comprado con su cantidad y precios.
 */
type Detalle = {
  id_producto: number
  cantidad: number
  precio_unitario: number
  subtotal: number
  productos?: { nombre: string | null; imagen_url: string | null } | null
}

/**
 * Tipo que representa un pedido completo con todos sus campos.
 * Los campos numero_guia y transportadora son opcionales porque
 * el admin los agrega después de crear el pedido.
 */
type Pedido = {
  id_pedido: number
  direccion_envio: string | null
  estado: string | null
  total: number
  fecha_pedido?: string | null
  numero_guia?: string | null      // asignado por el admin cuando se envía el paquete
  transportadora?: string | null   // empresa de transporte (ej: Coordinadora, Servientrega)
  detalle_pedidos?: Detalle[]
}

/**
 * PedidoPage
 * ──────────────────────────────────────────────────────────────
 * Componente principal de la página. Obtiene el ID del pedido desde
 * la URL y carga los datos desde el API /api/pedidos/:id.
 *
 * La solicitud al API incluye el token de sesión en el header
 * Authorization para que el servidor pueda verificar que el pedido
 * pertenece al usuario autenticado.
 */
export default function PedidoPage() {
  // Obtener el ID del pedido desde los parámetros de la URL (/pedido/[id])
  const params = useParams()
  const id = typeof params?.id === "string" ? params.id : ""

  // Estado de autenticación del usuario actual
  const { user, loading: authLoading } = useAuth()

  /** Datos del pedido cargado desde el API */
  const [pedido, setPedido] = useState<Pedido | null>(null)

  /** Indica si la solicitud al API está en proceso */
  const [loading, setLoading] = useState(true)

  /** Mensaje de error si la carga falla */
  const [error, setError] = useState<string | null>(null)

  /**
   * Efecto que carga el pedido desde el API.
   * Espera a que:
   * - La autenticación haya terminado (!authLoading)
   * - El usuario esté logueado (user)
   * - El ID del pedido esté disponible (id)
   *
   * Incluye un mecanismo `cancelled` para evitar actualizaciones de estado
   * si el componente se desmonta antes de recibir la respuesta (limpieza de efectos).
   */
  useEffect(() => {
    if (authLoading || !user || !id) return
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      // Obtener el token de sesión actual para enviarlo en el header
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const res = await fetch(`/api/pedidos/${id}`, {
        cache: "no-store", // nunca usar caché; siempre pedir datos frescos
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      })
      const body = await res.json()
      if (cancelled) return // el componente ya se desmontó, no actualizar estado
      if (!res.ok) {
        setError(body.error || "No se pudo cargar el pedido.")
        setPedido(null)
      } else {
        setPedido(body.pedido)
      }
      setLoading(false)
    }

    // queueMicrotask garantiza que la función async se ejecute en el siguiente ciclo
    // evitando conflictos con el ciclo de renderizado de React
    queueMicrotask(() => void load())
    return () => {
      cancelled = true // marcar como cancelado al desmontar
    }
  }, [authLoading, id, user])

  // ── Estado de carga ──
  // Muestra un skeleton animado mientras se obtienen los datos
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] px-4 py-16 text-white">
        <div className="mx-auto h-72 max-w-3xl rounded-3xl border border-white/10 bg-zinc-950/60 animate-pulse" />
      </div>
    )
  }

  // Si no hay usuario autenticado, no renderizar nada
  // (el AuthProvider ya se encarga de redirigir)
  if (!user) return null

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-4 py-12 text-white">
      <div className="mx-auto max-w-3xl">
        {/* ── Estado de error o pedido no encontrado ── */}
        {error || !pedido ? (
          <div className="rounded-3xl border border-red-500/25 bg-red-950/20 p-8 text-center">
            <i className="ri-error-warning-line text-4xl text-red-300" aria-hidden />
            <h1 className="mt-4 text-2xl font-black">No encontramos el pedido</h1>
            <p className="mt-2 text-sm text-red-100/80">{error || "Intenta de nuevo mas tarde."}</p>
            <Link href="/user" className="mt-6 inline-flex rounded-full bg-white px-6 py-3 text-sm font-bold text-black">
              Volver a la tienda
            </Link>
          </div>
        ) : (
          <div className="space-y-6">

            {/* ── Encabezado de confirmación ──
                Aparece siempre que el pedido existe.
                Muestra un círculo verde con check y el texto de confirmación.
            ── */}
            <section className="rounded-3xl border border-emerald-400/20 bg-zinc-950 p-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-300">
                <i className="ri-check-line text-3xl" aria-hidden />
              </div>
              <p className="mt-5 text-sm uppercase tracking-[0.25em] text-emerald-300">Pedido creado</p>
              <h1 className="mt-2 text-3xl font-black">Estamos a la espera de preparar tu pedido</h1>
              <p className="mx-auto mt-3 max-w-xl text-sm text-zinc-400">
                Tu pago demo fue aprobado y el pedido #{pedido.id_pedido} quedo registrado para seguimiento.
              </p>
            </section>

            {/* ── Resumen del pedido ──
                Muestra: estado actual, información de envío (si está disponible),
                dirección de entrega y total.
                La información de envío solo aparece cuando el admin ha asignado
                transportadora y número de guía.
            ── */}
            <section className="rounded-2xl border border-white/10 bg-zinc-950/70 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  {/* Estado del pedido */}
                  <p className="text-xs uppercase tracking-widest text-zinc-500">Estado</p>
                  <p className="mt-1 font-bold text-emerald-200">{pedido.estado || "pedido_creado"}</p>

                  {/* Información de envío: solo visible si el admin asignó número de guía */}
                  {pedido.numero_guia && (
                    <>
                      <p className="mt-4 text-xs uppercase tracking-widest text-zinc-500">Envío</p>
                      <p className="mt-1 text-sm text-emerald-200">
                        {pedido.transportadora || "Transportadora por confirmar"} · Guía #{pedido.numero_guia}
                      </p>
                    </>
                  )}

                  {/* Dirección de entrega */}
                  <p className="mt-4 text-xs uppercase tracking-widest text-zinc-500">Entrega</p>
                  <p className="mt-1 text-sm text-zinc-300">{pedido.direccion_envio || "Sin direccion"}</p>
                </div>

                {/* Total del pedido alineado a la derecha en desktop */}
                <div className="sm:text-right">
                  <p className="text-xs uppercase tracking-widest text-zinc-500">Total</p>
                  <p className="mt-1 text-2xl font-black">{formatCOP(Number(pedido.total || 0))}</p>
                </div>
              </div>
            </section>

            {/* ── Lista de productos del pedido ── */}
            <section className="rounded-2xl border border-white/10 bg-zinc-950/70 p-5">
              <h2 className="mb-4 text-lg font-bold">Productos del pedido</h2>
              <div className="space-y-3">
                {(pedido.detalle_pedidos || []).map((detalle) => (
                  <div key={detalle.id_producto} className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/30 p-3">
                    <div className="min-w-0">
                      {/* Nombre del producto con truncado si es muy largo */}
                      <p className="truncate font-semibold">{detalle.productos?.nombre || `Producto ${detalle.id_producto}`}</p>
                      {/* Cantidad × precio unitario */}
                      <p className="mt-1 text-xs text-zinc-500">
                        {detalle.cantidad} x {formatCOP(Number(detalle.precio_unitario || 0))}
                      </p>
                    </div>
                    {/* Subtotal de esa línea de producto */}
                    <p className="shrink-0 font-bold">{formatCOP(Number(detalle.subtotal || 0))}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Botones de acción ── */}
            <div className="flex flex-col gap-3 sm:flex-row">
              {/* Regresa a la tienda (catálogo de productos) */}
              <Link href="/user" className="inline-flex justify-center rounded-full bg-[#6b2ad4] px-6 py-3 text-sm font-bold text-white hover:bg-[#580096]">
                Seguir comprando
              </Link>
              {/* Va al perfil del usuario donde puede ver todos sus pedidos */}
              <Link href="/cuenta" className="inline-flex justify-center rounded-full border border-white/20 px-6 py-3 text-sm font-bold hover:bg-white/10">
                Ver mi cuenta
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

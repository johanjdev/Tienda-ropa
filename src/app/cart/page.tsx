"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/AuthProvider"
import { supabase } from "@/lib/supabase"
import { loadCart, saveCart, type CartItem } from "@/lib/cart-storage"
import { formatCOP } from "@/lib/format"

export default function CartPage() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const [items, setItems] = useState<CartItem[]>([])
  const [couponCode, setCouponCode] = useState("")
  const [coupon, setCoupon] = useState<{ codigo: string; porcentaje: number } | null>(null)
  const [discount, setDiscount] = useState(0)
  const [couponMessage, setCouponMessage] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null)

  const storageKey = useMemo(() => user?.id ?? null, [user?.id])

  const syncCart = useCallback(
    async (nextItems: CartItem[]) => {
      if (!user) return
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) return

      await fetch("/api/carrito/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: nextItems.map((item) => ({
            id_producto: item.id_producto,
            cantidad: item.cantidad,
          })),
        }),
      }).catch((error) => {
        console.error("No se pudo sincronizar el carrito:", error)
      })
    },
    [user]
  )

  const refresh = useCallback(() => {
    setItems(loadCart(storageKey))
  }, [storageKey])

  useEffect(() => {
    if (authLoading) return
    refresh()
  }, [authLoading, refresh])

  useEffect(() => {
    if (authLoading || !user) return
    void syncCart(loadCart(storageKey))
  }, [authLoading, storageKey, syncCart, user])

  const updateQty = (id: number, delta: number) => {
    const next = items
      .map((it) => (it.id_producto === id ? { ...it, cantidad: it.cantidad + delta } : it))
      .filter((it) => it.cantidad > 0)
    setItems(next)
    saveCart(storageKey, next)
    void syncCart(next)
  }

  const removeLine = (id: number) => {
    const next = items.filter((it) => it.id_producto !== id)
    setItems(next)
    saveCart(storageKey, next)
    void syncCart(next)
  }

  const subtotal = items.reduce((acc, it) => acc + it.precio * it.cantidad, 0)
  const total = Math.max(0, subtotal - discount)
  const hasAddress = Boolean(profile?.direccion?.trim())

  const applyCoupon = async () => {
    setCouponMessage(null)
    setCoupon(null)
    setDiscount(0)

    const res = await fetch("/api/cupones/validar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codigo: couponCode, subtotal }),
    })
    const body = await res.json()
    if (!res.ok) {
      setCouponMessage(body.error || "No se pudo aplicar el cupon.")
      return
    }
    setCoupon(body.cupon)
    setDiscount(Number(body.descuento ?? 0))
    setCouponMessage(`Cupon ${body.cupon.codigo} aplicado.`)
  }

  const createDemoOrder = async () => {
    if (!user) {
      setCheckoutMessage("Inicia sesion para hacer el pedido.")
      return
    }
    if (!hasAddress) {
      setCheckoutMessage("Agrega una direccion en tu perfil antes de pagar.")
      return
    }

    setPaying(true)
    setCheckoutMessage("Procesando pago demo...")
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 900))
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error("Sesion no valida.")

      const res = await fetch("/api/pedidos/demo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: items.map((item) => ({
            id_producto: item.id_producto,
            cantidad: item.cantidad,
            precio: item.precio,
          })),
          subtotal,
          descuento: discount,
          total,
          cupon_codigo: coupon?.codigo ?? null,
        }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || "No se pudo crear el pedido.")

      saveCart(storageKey, [])
      void syncCart([])
      setItems([])
      setCoupon(null)
      setDiscount(0)
      setCouponCode("")
      setCheckoutMessage(`Pago demo aprobado. Pedido #${body.id_pedido} creado.`)
      router.push(`/pedido/${body.id_pedido}`)
    } catch (error) {
      setCheckoutMessage(error instanceof Error ? error.message : "No se pudo completar el pago.")
    } finally {
      setPaying(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        Cargando...
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white px-4 py-12">
        <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-zinc-950 p-8 text-center">
          <i className="ri-lock-line text-4xl text-purple-300" aria-hidden />
          <h1 className="mt-4 text-3xl font-black">Inicia sesion para comprar</h1>
          <p className="mt-3 text-sm text-zinc-400">
            Tu carrito se conserva y al iniciar sesion se une a tu cuenta para continuar el pago.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/login" className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black">
              Iniciar sesion
            </Link>
            <Link href="/register" className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10">
              Crear cuenta
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white px-4 md:px-8 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-zinc-500">Checkout</p>
            <h1 className="text-3xl font-black md:text-4xl">Finalizar compra</h1>
          </div>
          <Link href="/user" className="text-sm text-zinc-400 hover:text-white">
            Seguir comprando
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-zinc-950 p-10 text-center text-white/60">
            <p className="mb-6">{checkoutMessage || "Tu carrito esta vacio."}</p>
            <Link href="/user" className="inline-block rounded-full bg-[#6b2ad4] px-6 py-3 text-sm font-semibold text-white hover:bg-[#580096] transition">
              Ver productos
            </Link>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
            <section className="space-y-6">
              <div className="rounded-2xl border border-white/10 bg-zinc-950 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-bold">Entrega</h2>
                  <Link href="/cuenta" className="text-sm text-purple-300 hover:text-purple-200">
                    Editar perfil
                  </Link>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/50 p-4">
                  <p className="font-semibold text-white">{profile?.nombre || user.email}</p>
                  <p className="mt-1 text-sm text-zinc-400">{profile?.telefono || "Sin telefono"}</p>
                  <p className="mt-3 text-sm text-zinc-300">
                    {profile?.direccion?.trim() || "No tienes direccion registrada."}
                  </p>
                </div>
                {!hasAddress && (
                  <p className="mt-3 text-sm text-amber-300">
                    Para pagar necesitas guardar una direccion en tu perfil.
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-white/10 bg-zinc-950 p-5">
                <h2 className="mb-4 text-lg font-bold">Metodo de pago</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button type="button" className="rounded-2xl border-2 border-white bg-white p-4 text-left text-black">
                    <i className="ri-bank-card-line text-2xl" aria-hidden />
                    <p className="mt-3 font-bold">Tarjeta demo</p>
                    <p className="text-xs text-zinc-600">Aprobacion simulada</p>
                  </button>
                  <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-zinc-500">
                    <i className="ri-wallet-3-line text-2xl" aria-hidden />
                    <p className="mt-3 font-bold text-zinc-400">Otros metodos</p>
                    <p className="text-xs">Proximamente</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <input readOnly value="4242 4242 4242 4242" className="col-span-2 rounded-xl border border-white/10 bg-black px-4 py-3 text-sm text-zinc-300 outline-none" />
                  <input readOnly value="12/30" className="rounded-xl border border-white/10 bg-black px-4 py-3 text-sm text-zinc-300 outline-none" />
                  <input readOnly value="123" className="rounded-xl border border-white/10 bg-black px-4 py-3 text-sm text-zinc-300 outline-none" />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-zinc-950 p-5">
                <h2 className="mb-4 text-lg font-bold">Productos</h2>
                <ul className="space-y-4">
                  {items.map((it) => (
                    <li key={it.id_producto} className="flex gap-4 items-center">
                      {it.imagen_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.imagen_url} alt="" className="h-20 w-20 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="h-20 w-20 rounded-lg bg-white/10 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{it.nombre}</p>
                        <p className="text-white/50 text-sm">{formatCOP(it.precio)} c/u</p>
                        <div className="flex items-center gap-2 mt-2">
                          <button type="button" onClick={() => updateQty(it.id_producto, -1)} className="rounded-lg border border-white/20 px-2 py-1 text-sm hover:bg-white/10">-</button>
                          <span className="text-sm w-8 text-center">{it.cantidad}</span>
                          <button type="button" onClick={() => updateQty(it.id_producto, 1)} className="rounded-lg border border-white/20 px-2 py-1 text-sm hover:bg-white/10">+</button>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold">{formatCOP(it.precio * it.cantidad)}</p>
                        <button type="button" onClick={() => removeLine(it.id_producto)} className="text-xs text-red-400 hover:underline mt-2">
                          Quitar
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <aside className="h-fit rounded-2xl border border-white/10 bg-zinc-950 p-5 lg:sticky lg:top-8">
              <h2 className="mb-4 text-lg font-bold">Resumen del pedido</h2>
              <div className="mb-5 flex gap-2">
                <input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="Codigo promo"
                  className="min-w-0 flex-1 rounded-full border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none focus:border-purple-500"
                />
                <button type="button" onClick={() => void applyCoupon()} className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-black">
                  Aplicar
                </button>
              </div>
              {couponMessage && <p className={`mb-4 text-sm ${coupon ? "text-emerald-300" : "text-amber-300"}`}>{couponMessage}</p>}
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-zinc-400"><span>Subtotal</span><span>{formatCOP(subtotal)}</span></div>
                <div className="flex justify-between text-zinc-400"><span>Envio</span><span>Gratis</span></div>
                <div className="flex justify-between text-zinc-400"><span>Descuento</span><span>-{formatCOP(discount)}</span></div>
                <div className="flex justify-between border-t border-white/10 pt-4 text-xl font-black text-white"><span>Total</span><span>{formatCOP(total)}</span></div>
              </div>
              <button
                type="button"
                disabled={paying || !hasAddress}
                onClick={() => void createDemoOrder()}
                className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-white px-6 py-4 text-sm font-black text-black transition hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {paying ? "Procesando pago..." : "Pagar ahora"}
              </button>
              {checkoutMessage && <p className="mt-3 text-sm text-zinc-300">{checkoutMessage}</p>}
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}

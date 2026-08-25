"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/AuthProvider"
import { supabase } from "@/lib/supabase"
import { loadCart, saveCart, type CartItem } from "@/lib/cart-storage"
import { formatCOP } from "@/lib/format"
import Modal from "@/components/Modal"

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
  const [stocks, setStocks] = useState<Record<number, number>>({})
  const [stockModalOpen, setStockModalOpen] = useState(false)
  const [stockModalMsg, setStockModalMsg] = useState("")

  const storageKey = useMemo(() => user?.id ?? null, [user?.id])

  // Estados de métodos de pago simulados
  const [metodoPago, setMetodoPago] = useState<"tarjeta" | "pse" | "billetera">("tarjeta")
  
  // Tarjeta de Crédito
  const [numTarjeta, setNumTarjeta] = useState("")
  const [nombreTarj, setNombreTarj] = useState("")
  const [fechaExp, setFechaExp] = useState("")
  const [cvcTarj, setCvcTarj] = useState("")
  
  // PSE
  const [pseBanco, setPseBanco] = useState("")
  const [pseDocType, setPseDocType] = useState("CC")
  const [pseDocNum, setPseDocNum] = useState("")
  const [pseEmail, setPseEmail] = useState("")

  // Billeteras
  const [walletPhone, setWalletPhone] = useState("")
  const [walletType, setWalletType] = useState<"nequi" | "daviplata">("nequi")

  // Formateadores y Validaciones de Tarjeta
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "")
    const matches = v.match(/\d{4,16}/g)
    const match = (matches && matches[0]) || ""
    const parts = []

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }

    if (parts.length > 0) {
      return parts.join(" ")
    } else {
      return v
    }
  }

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "")
    if (v.length >= 2) {
      return `${v.substring(0, 2)}/${v.substring(2, 4)}`
    }
    return v
  }

  const detectFranchise = (num: string) => {
    const clean = num.replace(/\s/g, "")
    if (clean.startsWith("4")) return "Visa"
    if (/^5[1-5]/.test(clean)) return "Mastercard"
    if (/^3[47]/.test(clean)) return "Amex"
    return "Credit Card"
  }

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
            talla: item.talla || null,
            color: item.color || null,
          })),
        }),
      }).catch((error) => {
        console.error("No se pudo sincronizar el carrito:", error)
      })
    },
    [user]
  )

  const loadStocks = useCallback(async (cartItems: CartItem[]) => {
    if (cartItems.length === 0) return
    const ids = [...new Set(cartItems.map((it) => it.id_producto))]
    const { data, error } = await supabase
      .from("productos")
      .select("id_producto, stock")
      .in("id_producto", ids)
    if (!error && data) {
      const map: Record<number, number> = {}
      for (const p of data) {
        map[p.id_producto] = p.stock ?? 0
      }
      setStocks(map)
    }
  }, [])

  const refresh = useCallback(() => {
    const loaded = loadCart(storageKey)
    setItems(loaded)
    void loadStocks(loaded)
  }, [storageKey, loadStocks])

  useEffect(() => {
    if (authLoading) return
    refresh()
  }, [authLoading, refresh])

  useEffect(() => {
    if (authLoading || !user) return
    void syncCart(loadCart(storageKey))
  }, [authLoading, storageKey, syncCart, user])

  const updateQty = (id: number, talla: string | null | undefined, color: string | null | undefined, delta: number) => {
    const item = items.find(
      (it) =>
        it.id_producto === id &&
        (it.talla || null) === (talla || null) &&
        (it.color || null) === (color || null)
    )
    if (!item) return

    if (delta > 0) {
      const currentQty = item.cantidad
      const maxStock = stocks[id] ?? 9999
      if (currentQty + delta > maxStock) {
        setStockModalMsg(
          `Lo sentimos, no puedes agregar más unidades de este producto. El stock disponible actual es de ${maxStock} unidades y ya tienes ${currentQty} en tu carrito.`
        )
        setStockModalOpen(true)
        return
      }
    }

    const next = items
      .map((it) =>
        it.id_producto === id &&
        (it.talla || null) === (talla || null) &&
        (it.color || null) === (color || null)
          ? { ...it, cantidad: it.cantidad + delta }
          : it
      )
      .filter((it) => it.cantidad > 0)
    setItems(next)
    saveCart(storageKey, next)
    void syncCart(next)
  }

  const removeLine = (id: number, talla: string | null | undefined, color: string | null | undefined) => {
    const next = items.filter(
      (it) =>
        !(
          it.id_producto === id &&
          (it.talla || null) === (talla || null) &&
          (it.color || null) === (color || null)
        )
    )
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

    // Validar campos según método de pago
    if (metodoPago === "tarjeta") {
      const cleanNum = numTarjeta.replace(/\s/g, "")
      if (cleanNum.length < 16) {
        setCheckoutMessage("Ingresa un número de tarjeta de 16 dígitos válido.")
        return
      }
      if (!fechaExp || !fechaExp.includes("/") || fechaExp.length < 5) {
        setCheckoutMessage("Ingresa una fecha de expiración válida (MM/YY).")
        return
      }
      if (cvcTarj.length < 3) {
        setCheckoutMessage("Ingresa un código CVC de 3 o 4 dígitos válido.")
        return
      }
      if (!nombreTarj.trim()) {
        setCheckoutMessage("Ingresa el nombre impreso en la tarjeta.")
        return
      }
    } else if (metodoPago === "pse") {
      if (!pseBanco) {
        setCheckoutMessage("Por favor selecciona un banco para PSE.")
        return
      }
      if (!pseDocNum) {
        setCheckoutMessage("Por favor ingresa tu número de documento.")
        return
      }
      if (!pseEmail || !pseEmail.includes("@")) {
        setCheckoutMessage("Por favor ingresa un correo electrónico válido para PSE.")
        return
      }
    } else if (metodoPago === "billetera") {
      const cleanPhone = walletPhone.replace(/\s/g, "")
      if (cleanPhone.length < 10) {
        setCheckoutMessage("Por favor ingresa un número de celular de 10 dígitos válido.")
        return
      }
    }

    setPaying(true)
    
    // Simulación realista por pasos
    try {
      if (metodoPago === "tarjeta") {
        setCheckoutMessage(`[1/3] Validando franquicia ${detectFranchise(numTarjeta)}...`)
        await new Promise((resolve) => window.setTimeout(resolve, 800))
        setCheckoutMessage("[2/3] Verificando fondos y código de seguridad...")
        await new Promise((resolve) => window.setTimeout(resolve, 900))
        setCheckoutMessage("[3/3] Procesando y encriptando transacción...")
        await new Promise((resolve) => window.setTimeout(resolve, 700))
      } else if (metodoPago === "pse") {
        setCheckoutMessage(`[1/3] Conectando con pasarela PSE hacia ${pseBanco}...`)
        await new Promise((resolve) => window.setTimeout(resolve, 800))
        setCheckoutMessage("[2/3] Esperando débito en la cuenta bancaria...")
        await new Promise((resolve) => window.setTimeout(resolve, 1000))
        setCheckoutMessage("[3/3] Confirmación de pago recibida de ACH Colombia...")
        await new Promise((resolve) => window.setTimeout(resolve, 600))
      } else {
        const walletName = walletType === "nequi" ? "Nequi" : "Daviplata"
        setCheckoutMessage(`[1/3] Enviando solicitud de cobro push al ${walletPhone}...`)
        await new Promise((resolve) => window.setTimeout(resolve, 900))
        setCheckoutMessage(`[2/3] Esperando aprobación en tu aplicación de ${walletName}...`)
        await new Promise((resolve) => window.setTimeout(resolve, 1200))
        setCheckoutMessage(`[3/3] Pago debitado y aprobado desde ${walletName}...`)
        await new Promise((resolve) => window.setTimeout(resolve, 600))
      }

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
            talla: item.talla || null,
            color: item.color || null,
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
      
      const metodoLabel = 
        metodoPago === "tarjeta" 
          ? "Tarjeta" 
          : metodoPago === "pse" 
            ? `PSE (${pseBanco})` 
            : walletType === "nequi" 
              ? "Nequi" 
              : "Daviplata"

      setCheckoutMessage(`¡Pago simulado con éxito vía ${metodoLabel}! Pedido #${body.id_pedido} creado.`)
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
                  {user && (
                    <Link href="/cuenta" className="text-sm text-purple-300 hover:text-purple-200">
                      Editar perfil
                    </Link>
                  )}
                </div>
                {user ? (
                  <div className="rounded-xl border border-white/10 bg-black/50 p-4">
                    <p className="font-semibold text-white">{profile?.nombre || user.email}</p>
                    <p className="mt-1 text-sm text-zinc-400">{profile?.telefono || "Sin telefono"}</p>
                    <p className="mt-3 text-sm text-zinc-300">
                      {profile?.direccion?.trim() || "No tienes direccion registrada."}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-white/15 bg-black/20 p-5 text-center">
                    <p className="text-sm text-zinc-400 mb-4">
                      Inicia sesión para ingresar tus datos de entrega y finalizar la compra.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-3">
                      <Link href="/login?redirect=/cart" className="rounded-full bg-white px-5 py-2.5 text-xs font-semibold text-black hover:opacity-90 transition">
                        Iniciar sesión
                      </Link>
                      <Link href="/register?redirect=/cart" className="rounded-full border border-white/25 px-5 py-2.5 text-xs font-semibold text-white hover:bg-white/5 transition">
                        Crear cuenta
                      </Link>
                    </div>
                  </div>
                )}
                {user && !hasAddress && (
                  <p className="mt-3 text-sm text-amber-300">
                    Para pagar necesitas guardar una direccion en tu perfil.
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-xl">
                <h2 className="mb-5 text-xl font-bold text-white flex items-center gap-2">
                  <i className="ri-secure-payment-line text-purple-400" />
                  Método de pago seguro
                </h2>

                {/* Tabs de selección de método */}
                <div className="grid grid-cols-3 gap-2 mb-6 bg-black/40 p-1.5 rounded-2xl border border-white/5">
                  <button
                    type="button"
                    onClick={() => setMetodoPago("tarjeta")}
                    className={`flex flex-col items-center justify-center py-3 px-1 rounded-xl transition-all duration-300 ${
                      metodoPago === "tarjeta"
                        ? "bg-white text-black font-bold shadow-lg"
                        : "bg-transparent text-zinc-400 hover:text-white"
                    }`}
                  >
                    <i className="ri-bank-card-fill text-xl mb-1" />
                    <span className="text-[10px] sm:text-xs">Tarjeta</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMetodoPago("pse")}
                    className={`flex flex-col items-center justify-center py-3 px-1 rounded-xl transition-all duration-300 ${
                      metodoPago === "pse"
                        ? "bg-white text-black font-bold shadow-lg"
                        : "bg-transparent text-zinc-400 hover:text-white"
                    }`}
                  >
                    <i className="ri-bank-fill text-xl mb-1" />
                    <span className="text-[10px] sm:text-xs">PSE</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMetodoPago("billetera")}
                    className={`flex flex-col items-center justify-center py-3 px-1 rounded-xl transition-all duration-300 ${
                      metodoPago === "billetera"
                        ? "bg-white text-black font-bold shadow-lg"
                        : "bg-transparent text-zinc-400 hover:text-white"
                    }`}
                  >
                    <i className="ri-smartphone-fill text-xl mb-1" />
                    <span className="text-[10px] sm:text-xs">Billetera</span>
                  </button>
                </div>

                {/* ── CONTENIDO METODO: TARJETA ─────────────────── */}
                {metodoPago === "tarjeta" && (
                  <div className="space-y-6">
                    {/* Tarjeta Física Simulación */}
                    <div className="relative w-full aspect-[1.586/1] rounded-2xl bg-gradient-to-br from-purple-800 via-indigo-900 to-black p-6 text-white border border-white/10 shadow-2xl overflow-hidden flex flex-col justify-between">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl" />
                      <div className="flex justify-between items-start">
                        {/* Chip e icono NFC */}
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-7 rounded bg-gradient-to-r from-yellow-300 to-amber-500 opacity-80" />
                          <i className="ri-wifi-line text-lg text-white/40 rotate-90" />
                        </div>
                        <span className="text-sm font-black italic tracking-wider text-white/80">
                          {detectFranchise(numTarjeta)}
                        </span>
                      </div>
                      
                      {/* Número de tarjeta */}
                      <div className="text-lg sm:text-xl md:text-2xl font-mono tracking-widest text-center text-white/90 drop-shadow">
                        {numTarjeta || "•••• •••• •••• ••••"}
                      </div>

                      <div className="flex justify-between items-end">
                        <div className="space-y-1">
                          <p className="text-[9px] uppercase tracking-wider text-white/40">Titular</p>
                          <p className="text-xs sm:text-sm font-bold tracking-wide truncate max-w-[180px]">
                            {nombreTarj.toUpperCase() || "NOMBRE TITULAR"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] uppercase tracking-wider text-white/40">Expira</p>
                          <p className="text-xs sm:text-sm font-bold font-mono">
                            {fechaExp || "MM/YY"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Inputs de la tarjeta */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2 space-y-1">
                        <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Número de tarjeta</label>
                        <input
                          type="text"
                          maxLength={19}
                          placeholder="4242 4242 4242 4242"
                          value={numTarjeta}
                          onChange={(e) => setNumTarjeta(formatCardNumber(e.target.value))}
                          className="w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white placeholder:text-zinc-700 outline-none focus:border-purple-500 transition"
                        />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Nombre en la tarjeta</label>
                        <input
                          type="text"
                          placeholder="JUAN PEREZ"
                          value={nombreTarj}
                          onChange={(e) => setNombreTarj(e.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white placeholder:text-zinc-700 outline-none focus:border-purple-500 transition"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Expiración</label>
                        <input
                          type="text"
                          maxLength={5}
                          placeholder="MM/YY"
                          value={fechaExp}
                          onChange={(e) => setFechaExp(formatExpiry(e.target.value))}
                          className="w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white placeholder:text-zinc-700 outline-none focus:border-purple-500 transition text-center"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">CVC</label>
                        <input
                          type="password"
                          maxLength={4}
                          placeholder="•••"
                          value={cvcTarj}
                          onChange={(e) => setCvcTarj(e.target.value.replace(/[^0-9]/g, ""))}
                          className="w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white placeholder:text-zinc-700 outline-none focus:border-purple-500 transition text-center"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── CONTENIDO METODO: PSE ─────────────────────── */}
                {metodoPago === "pse" && (
                  <div className="space-y-4">
                    <div className="bg-blue-600/10 border border-blue-500/20 rounded-xl p-4 flex items-center gap-3">
                      <div className="bg-blue-600 px-3 py-1 rounded font-black italic text-xs tracking-wider text-white">PSE</div>
                      <p className="text-xs text-zinc-300">Pago seguro con débito directo desde tu cuenta bancaria.</p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Banco</label>
                      <select
                        value={pseBanco}
                        onChange={(e) => setPseBanco(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm text-zinc-300 outline-none focus:border-purple-500 transition cursor-pointer"
                      >
                        <option value="">Selecciona tu entidad financiera</option>
                        <option value="Bancolombia">Bancolombia</option>
                        <option value="Nequi">Nequi (PSE)</option>
                        <option value="Daviplata">Daviplata (PSE)</option>
                        <option value="Davivienda">Davivienda</option>
                        <option value="Banco de Bogota">Banco de Bogotá</option>
                        <option value="Lulo Bank">Lulo Bank</option>
                        <option value="RappiPay">RappiPay</option>
                        <option value="Scotiabank Colpatria">Scotiabank Colpatria</option>
                        <option value="Banco BBVA">BBVA Colombia</option>
                        <option value="Banco Falabella">Banco Falabella</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Tipo Doc</label>
                        <select
                          value={pseDocType}
                          onChange={(e) => setPseDocType(e.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-black px-3 py-3 text-sm text-zinc-300 outline-none focus:border-purple-500 transition cursor-pointer"
                        >
                          <option value="CC">C.C.</option>
                          <option value="CE">C.E.</option>
                          <option value="NIT">NIT</option>
                          <option value="PEP">PEP</option>
                        </select>
                      </div>
                      <div className="col-span-2 space-y-1">
                        <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Número de documento</label>
                        <input
                          type="text"
                          placeholder="123456789"
                          value={pseDocNum}
                          onChange={(e) => setPseDocNum(e.target.value.replace(/[^0-9]/g, ""))}
                          className="w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white placeholder:text-zinc-700 outline-none focus:border-purple-500 transition"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Correo registrado en PSE</label>
                      <input
                        type="email"
                        placeholder="ejemplo@email.com"
                        value={pseEmail}
                        onChange={(e) => setPseEmail(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white placeholder:text-zinc-700 outline-none focus:border-purple-500 transition"
                      />
                    </div>
                  </div>
                )}

                {/* ── CONTENIDO METODO: BILLETERA (Nequi / Daviplata) ── */}
                {metodoPago === "billetera" && (
                  <div className="space-y-4">
                    {/* Selector de billetera */}
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setWalletType("nequi")}
                        className={`rounded-xl border p-4 text-center transition-all ${
                          walletType === "nequi"
                            ? "bg-purple-950/40 border-purple-500 text-purple-300 font-bold"
                            : "bg-black/30 border-white/10 text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        <div className="w-4 h-4 rounded-full border border-white/20 inline-flex items-center justify-center mr-2">
                          {walletType === "nequi" && <div className="w-2.5 h-2.5 bg-purple-500 rounded-full" />}
                        </div>
                        Nequi
                      </button>
                      <button
                        type="button"
                        onClick={() => setWalletType("daviplata")}
                        className={`rounded-xl border p-4 text-center transition-all ${
                          walletType === "daviplata"
                            ? "bg-red-950/40 border-red-500 text-red-400 font-bold"
                            : "bg-black/30 border-white/10 text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        <div className="w-4 h-4 rounded-full border border-white/20 inline-flex items-center justify-center mr-2">
                          {walletType === "daviplata" && <div className="w-2.5 h-2.5 bg-red-500 rounded-full" />}
                        </div>
                        Daviplata
                      </button>
                    </div>

                    <div className="bg-zinc-900 border border-white/5 rounded-xl p-4 text-xs text-zinc-400 space-y-1">
                      <p className="font-semibold text-zinc-300">¿Cómo funciona?</p>
                      <p>1. Ingresa tu número de celular registrado.</p>
                      <p>2. Haz clic en "Pagar ahora".</p>
                      <p>3. Recibirás una notificación en tu app celular para confirmar la transacción.</p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Número de celular</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-zinc-500 font-semibold font-mono">+57</span>
                        <input
                          type="text"
                          maxLength={10}
                          placeholder="300 123 4567"
                          value={walletPhone}
                          onChange={(e) => setWalletPhone(e.target.value.replace(/[^0-9]/g, ""))}
                          className="w-full rounded-xl border border-white/10 bg-black/60 pl-14 pr-4 py-3 text-sm text-white placeholder:text-zinc-700 outline-none focus:border-purple-500 transition font-mono tracking-wider"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-white/10 bg-zinc-950 p-5">
                <h2 className="mb-4 text-lg font-bold">Productos</h2>
                <ul className="space-y-4">
                  {items.map((it) => {
                    const uniqueKey = `${it.id_producto}_${it.talla || ""}_${it.color || ""}`
                    return (
                      <li key={uniqueKey} className="flex gap-4 items-center">
                        {it.imagen_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={it.imagen_url} alt="" className="h-20 w-20 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="h-20 w-20 rounded-lg bg-white/10 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{it.nombre}</p>
                          
                          {/* Especificaciones talla / color */}
                          {(it.talla || it.color) && (
                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-zinc-400">
                              {it.talla && (
                                <span>
                                  Talla: <span className="text-purple-300 font-semibold">{it.talla}</span>
                                </span>
                              )}
                              {it.color && (
                                <span>
                                  Color: <span className="text-purple-300 font-semibold">{it.color}</span>
                                </span>
                              )}
                            </div>
                          )}

                          <p className="text-white/50 text-sm mt-1">{formatCOP(it.precio)} c/u</p>
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              type="button"
                              onClick={() => updateQty(it.id_producto, it.talla, it.color, -1)}
                              className="rounded-lg border border-white/20 px-2 py-1 text-sm hover:bg-white/10"
                            >
                              -
                            </button>
                            <span className="text-sm w-8 text-center">{it.cantidad}</span>
                            <button
                              type="button"
                              onClick={() => updateQty(it.id_producto, it.talla, it.color, 1)}
                              className="rounded-lg border border-white/20 px-2 py-1 text-sm hover:bg-white/10"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold">{formatCOP(it.precio * it.cantidad)}</p>
                          <button
                            type="button"
                            onClick={() => removeLine(it.id_producto, it.talla, it.color)}
                            className="text-xs text-red-400 hover:underline mt-2"
                          >
                            Quitar
                          </button>
                        </div>
                      </li>
                    )
                  })}
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
              {user ? (
                <button
                  type="button"
                  disabled={paying || !hasAddress}
                  onClick={() => void createDemoOrder()}
                  className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-white px-6 py-4 text-sm font-black text-black transition hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {paying ? "Procesando pago..." : "Pagar ahora"}
                </button>
              ) : (
                <Link
                  href="/login?redirect=/cart"
                  className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-[#6b2ad4] to-[#580096] px-6 py-4 text-sm font-black text-white transition hover:opacity-90"
                >
                  Iniciar sesión para pagar
                </Link>
              )}
              {checkoutMessage && <p className="mt-3 text-sm text-zinc-300">{checkoutMessage}</p>}
            </aside>
          </div>
        )}
      </div>

      <Modal
        open={stockModalOpen}
        onClose={() => setStockModalOpen(false)}
        title="Límite de stock alcanzado"
        variant="error"
      >
        <p>{stockModalMsg}</p>
      </Modal>
    </div>
  )
}

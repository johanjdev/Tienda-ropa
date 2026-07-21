export type CartItem = {
  id_producto: number
  nombre: string
  precio: number
  imagen_url: string | null
  cantidad: number
}

export const CART_CHANGED_EVENT = "cart:changed"

function emitCartChanged() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(CART_CHANGED_EVENT))
}

const GUEST_KEY = "cart:guest"

export function cartStorageKey(authUserId: string | null) {
  return authUserId ? `cart:${authUserId}` : GUEST_KEY
}

export function loadCart(authUserId: string | null): CartItem[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(cartStorageKey(authUserId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as CartItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveCart(authUserId: string | null, items: CartItem[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(cartStorageKey(authUserId), JSON.stringify(items))
  emitCartChanged()
}

/** Suma de cantidades de todas las líneas del carrito (mismo criterio que el badge). */
export function getCartTotalQuantity(authUserId: string | null): number {
  return loadCart(authUserId).reduce((acc, it) => acc + it.cantidad, 0)
}

/** Une el carrito invitado al del usuario y borra el invitado. */
export function mergeGuestCartIntoUser(userId: string) {
  if (typeof window === "undefined") return
  const guest = loadCart(null)
  if (guest.length === 0) return
  const userCart = loadCart(userId)
  const byId = new Map<number, CartItem>()
  for (const it of userCart) byId.set(it.id_producto, { ...it })
  for (const it of guest) {
    const prev = byId.get(it.id_producto)
    if (prev) {
      byId.set(it.id_producto, {
        ...prev,
        cantidad: prev.cantidad + it.cantidad,
      })
    } else {
      byId.set(it.id_producto, { ...it })
    }
  }
  saveCart(userId, [...byId.values()])
  localStorage.removeItem(GUEST_KEY)
}

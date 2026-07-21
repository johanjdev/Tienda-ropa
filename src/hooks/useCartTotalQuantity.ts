"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/AuthProvider"
import {
  CART_CHANGED_EVENT,
  getCartTotalQuantity,
} from "@/lib/cart-storage"

export function useCartTotalQuantity(): number {
  const { user } = useAuth()
  const uid = user?.id ?? null
  const [count, setCount] = useState(0)

  useEffect(() => {
    const sync = () => setCount(getCartTotalQuantity(uid))
    sync()
    window.addEventListener(CART_CHANGED_EVENT, sync)
    return () => window.removeEventListener(CART_CHANGED_EVENT, sync)
  }, [uid])

  return count
}

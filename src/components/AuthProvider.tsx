"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { usePathname } from "next/navigation"
import { mergeGuestCartIntoUser } from "@/lib/cart-storage"

export type UsuarioPerfil = {
  id_usuario?: number
  nombre: string | null
  email: string | null
  telefono: number | null
  direccion: string | null
  auth_id?: string | null
  id_rol?: number | null
  id_tipo_documento?: number | null
  documento_numero?: number | null
  activo?: boolean
  roleName?: string
}

export type AuthUser = {
  id: string
  email: string | null
  user_metadata?: {
    full_name?: string | null
    [key: string]: any
  }
}

type AuthContextValue = {
  user: AuthUser | null
  profile: UsuarioPerfil | null
  loading: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider")
  return ctx
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [profile, setProfile] = useState<UsuarioPerfil | null>(null)
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", {
        method: "GET",
        headers: { "Cache-Control": "no-store" },
        cache: "no-store",
      })

      if (res.ok) {
        const data = await res.json()
        if (data?.user) {
          const u = data.user
          const authUserObj: AuthUser = {
            id: String(u.id_usuario),
            email: u.email,
            user_metadata: {
              full_name: u.nombre,
            },
          }
          setUser(authUserObj)
          setProfile(u)
          mergeGuestCartIntoUser(String(u.id_usuario))
          return
        }
      }

      setUser(null)
      setProfile(null)
    } catch (e) {
      console.error("Error al obtener sesión de usuario:", e)
      setUser(null)
      setProfile(null)
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    await fetchSession()
  }, [fetchSession])

  useEffect(() => {
    let cancelled = false
    const init = async () => {
      await fetchSession()
      if (!cancelled) setLoading(false)
    }
    void init()

    return () => {
      cancelled = true
    }
  }, [fetchSession])

  const signOut = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } catch (e) {
      console.error("Error en logout:", e)
    }
    setUser(null)
    setProfile(null)
    localStorage.removeItem("sb-auth-token")
    Object.keys(localStorage)
      .filter((key) => key.startsWith("sb-") && key.includes("-auth-token"))
      .forEach((key) => localStorage.removeItem(key))
  }, [])

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      refreshProfile,
      signOut,
    }),
    [user, profile, loading, refreshProfile, signOut]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import type { User } from "@supabase/supabase-js"
import { usePathname } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { mergeGuestCartIntoUser } from "@/lib/cart-storage"

export type UsuarioPerfil = {
  id_usuario?: number
  nombre: string | null
  email: string | null
  telefono: number | null
  direccion: string | null
  auth_id: string | null
  id_rol?: number | null
  id_tipo_documento?: number | null
  documento_numero?: number | null
}

type AuthContextValue = {
  user: User | null
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
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UsuarioPerfil | null>(null)
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()

  const loadProfile = useCallback(async (authUser: User | null) => {
    if (!authUser) {
      setProfile(null)
      return
    }
    const { data, error } = await supabase
      .from("usuarios")
      .select("*")
      .eq("auth_id", authUser.id)
      .maybeSingle()

    if (error) {
      console.error("Error cargando perfil:", error)
      setProfile({
        nombre: authUser.user_metadata?.full_name ?? null,
        email: authUser.email ?? null,
        telefono: null,
        direccion: null,
        auth_id: authUser.id,
      })
      return
    }

    if (data) setProfile(data as unknown as UsuarioPerfil)
    else
      setProfile({
        nombre: authUser.user_metadata?.full_name ?? null,
        email: authUser.email ?? null,
        telefono: null,
        direccion: null,
        auth_id: authUser.id,
      })
  }, [])

  const refreshProfile = useCallback(async () => {
    const { data: { user: u } } = await supabase.auth.getUser()
    setUser(u ?? null)
    await loadProfile(u ?? null)
  }, [loadProfile])

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (cancelled) return
      setUser(u ?? null)
      await loadProfile(u ?? null)
      if (u) mergeGuestCartIntoUser(u.id)
      if (!cancelled) setLoading(false)
    }

    void init()

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      const next = session?.user ?? null
      setUser(next)
      await loadProfile(next)
      if (event === "SIGNED_IN" && next) {
        mergeGuestCartIntoUser(next.id)
      }
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [loadProfile])

  const signOut = useCallback(async () => {
    await Promise.race([
      supabase.auth.signOut({ scope: "global" }),
      new Promise((resolve) => window.setTimeout(resolve, 1500)),
    ])
    localStorage.removeItem("sb-auth-token")
    Object.keys(localStorage)
      .filter((key) => key.startsWith("sb-") && key.includes("-auth-token"))
      .forEach((key) => localStorage.removeItem(key))
    setUser(null)
    setProfile(null)
  }, [])

  useEffect(() => {
    if (!user || !profile?.id_usuario || !pathname) return
    const key = `last-log:${user.id}:${pathname}`
    const last = Number(sessionStorage.getItem(key) || 0)
    if (Date.now() - last < 60_000) return
    sessionStorage.setItem(key, String(Date.now()))
    void supabase.from("logs").insert([
      {
        id_usuario: profile.id_usuario,
        accion: `Activo en ${pathname}`,
        ip_usuario: "browser",
      },
    ])
  }, [pathname, profile?.id_usuario, user])

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

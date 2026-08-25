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
  activo?: boolean
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

    let profileData = null

    // 1. Intentar buscar por auth_id
    const { data: dataById, error: errorById } = await supabase
      .from("usuarios")
      .select("*")
      .eq("auth_id", authUser.id)
      .maybeSingle()

    if (!errorById && dataById) {
      profileData = dataById
    } else if (authUser.email) {
      // 2. Si no se encontró por auth_id, intentar por email
      const { data: dataByEmail, error: errorByEmail } = await supabase
        .from("usuarios")
        .select("*")
        .eq("email", authUser.email)
        .maybeSingle()

      if (!errorByEmail && dataByEmail) {
        // Encontrado por email pero sin auth_id, lo asociamos
        const { data: updated, error: updateError } = await supabase
          .from("usuarios")
          .update({ auth_id: authUser.id })
          .eq("id_usuario", dataByEmail.id_usuario)
          .select("*")
          .maybeSingle()

        if (!updateError && updated) {
          profileData = updated
        } else {
          profileData = dataByEmail
        }
      }
    }

    if (profileData) {
      if (profileData.activo === false) {
        console.warn("Usuario inactivo detectado. Cerrando sesión.")
        await supabase.auth.signOut({ scope: "global" })
        localStorage.removeItem("sb-auth-token")
        Object.keys(localStorage)
          .filter((key) => key.startsWith("sb-") && key.includes("-auth-token"))
          .forEach((key) => localStorage.removeItem(key))
        setUser(null)
        setProfile(null)
        if (typeof window !== "undefined") {
          window.location.href = "/login?error=inactive"
        }
        return
      }
      // Si el registro de usuario existe pero tiene campos nulos que están en la metadata de Auth,
      // los sincronizamos automáticamente en la base de datos de forma autocurativa.
      const meta = authUser.user_metadata || {}
      const updates: Record<string, any> = {}

      if (profileData.nombre === null && meta.full_name) updates.nombre = meta.full_name
      if (profileData.telefono === null && meta.telefono != null) updates.telefono = Number(meta.telefono)
      if (profileData.direccion === null && meta.direccion) updates.direccion = meta.direccion
      if (profileData.id_tipo_documento === null && meta.id_tipo_documento != null) updates.id_tipo_documento = Number(meta.id_tipo_documento)
      if (profileData.documento_numero === null && meta.documento_numero != null) updates.documento_numero = Number(meta.documento_numero)

      // Adicional: si el perfil de usuarios no tiene dirección, intentamos recuperarla de su último pedido
      if (profileData.direccion === null && profileData.id_usuario) {
        try {
          const { data: ultimoPedido } = await supabase
            .from("pedidos")
            .select("direccion_envio")
            .eq("id_usuario", profileData.id_usuario)
            .order("id_pedido", { ascending: false })
            .limit(1)
            .maybeSingle()
          
          if (ultimoPedido && ultimoPedido.direccion_envio) {
            updates.direccion = ultimoPedido.direccion_envio
          }
        } catch (e) {
          console.error("No se pudo cargar la dirección del último pedido:", e)
        }
      }

      if (Object.keys(updates).length > 0) {
        try {
          const { data: updated, error: updateError } = await supabase
            .from("usuarios")
            .update(updates)
            .eq("id_usuario", profileData.id_usuario)
            .select("*")
            .maybeSingle()

          if (!updateError && updated) {
            setProfile(updated as unknown as UsuarioPerfil)
            return
          }
        } catch (e) {
          console.error("Error al auto-actualizar campos faltantes de usuario:", e)
        }
      }

      setProfile(profileData as unknown as UsuarioPerfil)
    } else {
      // Intentar auto-crear la fila de usuario con los datos de metadata si no existe
      try {
        const nuevoUsuario = {
          nombre: authUser.user_metadata?.full_name ?? null,
          email: authUser.email ?? null,
          telefono: authUser.user_metadata?.telefono != null ? Number(authUser.user_metadata.telefono) : null,
          direccion: authUser.user_metadata?.direccion ?? null,
          auth_id: authUser.id,
          id_rol: 1,
          id_tipo_documento: authUser.user_metadata?.id_tipo_documento != null ? Number(authUser.user_metadata.id_tipo_documento) : null,
          documento_numero: authUser.user_metadata?.documento_numero != null ? Number(authUser.user_metadata.documento_numero) : null,
        }

        const { data: created, error: createError } = await supabase
          .from("usuarios")
          .insert([nuevoUsuario])
          .select("*")
          .maybeSingle()

        if (!createError && created) {
          setProfile(created as unknown as UsuarioPerfil)
        } else {
          console.error("No se pudo auto-crear perfil en BD:", createError)
          setProfile({
            nombre: authUser.user_metadata?.full_name ?? null,
            email: authUser.email ?? null,
            telefono: authUser.user_metadata?.telefono != null ? Number(authUser.user_metadata.telefono) : null,
            direccion: authUser.user_metadata?.direccion ?? null,
            auth_id: authUser.id,
            id_tipo_documento: authUser.user_metadata?.id_tipo_documento != null ? Number(authUser.user_metadata.id_tipo_documento) : null,
            documento_numero: authUser.user_metadata?.documento_numero != null ? Number(authUser.user_metadata.documento_numero) : null,
          })
        }
      } catch (e) {
        console.error("Fallo autocreación perfil:", e)
        setProfile({
          nombre: authUser.user_metadata?.full_name ?? null,
          email: authUser.email ?? null,
          telefono: authUser.user_metadata?.telefono != null ? Number(authUser.user_metadata.telefono) : null,
          direccion: authUser.user_metadata?.direccion ?? null,
          auth_id: authUser.id,
        })
      }
    }
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

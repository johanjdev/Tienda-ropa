import { createClient } from "@supabase/supabase-js"
import { getSupabasePublicEnv } from "./supabase-public-env"

export async function requireAdmin(request: Request) {
  return requireRole(request, ["administrador", "admin"])
}

export async function requireAdminOrEditor(request: Request) {
  return requireRole(request, ["administrador", "admin", "editor"])
}

export async function requireRole(request: Request, allowedRoles: string[]) {
  const authHeader = request.headers.get("authorization") || ""
  const { url, anonKey, configured } = getSupabasePublicEnv()

  if (!configured) return { error: "Supabase no esta configurado.", status: 503 as const }
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return { error: "No autorizado.", status: 401 as const }
  }

  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) return { error: "Sesion no valida.", status: 401 as const }

  const { data: profile, error: profileError } = await supabase
    .from("usuarios")
    .select("id_usuario, id_rol")
    .eq("auth_id", user.id)
    .maybeSingle()

  if (profileError) return { error: profileError.message, status: 400 as const }
  const { data: role } = await supabase
    .from("roles")
    .select("tipo_rol")
    .eq("id_rol", Number(profile?.id_rol))
    .maybeSingle()

  const roleName = String(role?.tipo_rol || "").trim().toLowerCase()
  const isLegacyAdmin = Number(profile?.id_rol) === 2
  const allowedByLegacyId =
    isLegacyAdmin && allowedRoles.some((allowed) => allowed === "admin" || allowed === "administrador")

  if (!allowedRoles.includes(roleName) && !allowedByLegacyId) {
    return { error: "Permisos insuficientes.", status: 403 as const }
  }

  return { supabase, user, profile, roleName }
}

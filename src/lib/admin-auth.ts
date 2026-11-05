import { getAuthUser } from "./jwt"
import { getDbClient } from "./db"

export async function requireUser(request: Request) {
  const authUser = await getAuthUser(request)
  if (!authUser || !authUser.id_usuario) {
    return { error: "No autorizado. Sesión no válida.", status: 401 as const }
  }

  const db = getDbClient()
  const { data: profile, error: profileError } = await db
    .from("usuarios")
    .select("*")
    .eq("id_usuario", authUser.id_usuario)
    .maybeSingle()

  if (profileError || !profile) {
    return { error: "Usuario no encontrado.", status: 401 as const }
  }

  if (profile.activo === false) {
    return { error: "Cuenta desactivada.", status: 403 as const }
  }

  return { supabase: db, db, user: authUser, profile }
}

export async function requireAdmin(request: Request) {
  return requireRole(request, ["administrador", "admin"])
}

export async function requireAdminOrEditor(request: Request) {
  return requireRole(request, ["administrador", "admin", "editor"])
}

/** Roles that may enter the back-office, but do not necessarily modify data. */
export async function requireAdminPanelReader(request: Request) {
  return requireRole(request, ["administrador", "admin", "editor", "produccion", "producción"], [3])
}

export async function requireRole(request: Request, allowedRoles: string[], allowedRoleIds: number[] = []) {
  const authUser = await getAuthUser(request)
  if (!authUser || !authUser.id_usuario) {
    return { error: "No autorizado. Sesión no válida.", status: 401 as const }
  }

  const db = getDbClient()
  const { data: profile, error: profileError } = await db
    .from("usuarios")
    .select("*")
    .eq("id_usuario", authUser.id_usuario)
    .maybeSingle()

  if (profileError || !profile) {
    return { error: "Usuario no encontrado.", status: 401 as const }
  }

  if (profile.activo === false) {
    return { error: "Cuenta desactivada.", status: 403 as const }
  }

  const { data: role } = await db
    .from("roles")
    .select("tipo_rol")
    .eq("id_rol", Number(profile.id_rol))
    .maybeSingle()

  const roleName = String(role?.tipo_rol || authUser.rol || "").trim().toLowerCase()
  const isLegacyAdmin = Number(profile.id_rol) === 2
  const allowedByLegacyId =
    isLegacyAdmin && allowedRoles.some((allowed) => allowed === "admin" || allowed === "administrador")

  if (!allowedRoles.includes(roleName) && !allowedRoleIds.includes(Number(profile.id_rol)) && !allowedByLegacyId) {
    return { error: "Permisos insuficientes.", status: 403 as const }
  }

  return { supabase: db, db, user: authUser, profile, roleName }
}

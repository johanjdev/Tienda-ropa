import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { requireAdmin, requireAdminPanelReader } from "@/lib/admin-auth"
import { normalizeIntValue } from "@/lib/number-fields"
import { getDbClient } from "@/lib/db"

export async function GET(request: Request) {
  const admin = await requireAdminPanelReader(request)
  if ("error" in admin) return NextResponse.json({ error: admin.error }, { status: admin.status })

  const db = getDbClient()
  const [usersRes, rolesRes, docTypesRes] = await Promise.all([
    db.from("usuarios").select("*").order("id_usuario", { ascending: false }),
    db.from("roles").select("*").order("id_rol", { ascending: true }),
    db.from("tipo_documento").select("*").order("id_tipo_documento", { ascending: true }),
  ])

  if (usersRes.error) return NextResponse.json({ error: usersRes.error.message }, { status: 400 })
  if (rolesRes.error) return NextResponse.json({ error: rolesRes.error.message }, { status: 400 })

  // Ocultar password_hash de la respuesta
  const safeUsers = (usersRes.data || []).map((u) => {
    const { password_hash: _, ...rest } = u
    return rest
  })

  return NextResponse.json({
    usuarios: safeUsers,
    roles: rolesRes.data || [],
    tiposDocumento: docTypesRes.data || [],
  })
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request)
  if ("error" in admin) return NextResponse.json({ error: admin.error }, { status: admin.status })

  const body = await request.json().catch(() => ({}))
  const email = String(body.email || "").trim().toLowerCase()
  const password = String(body.password || "").trim()
  const nombre = String(body.nombre || "").trim()
  const idRol = Number(body.id_rol || 1)
  const telefono = normalizeIntValue(body.telefono)
  const documentoNumero = normalizeIntValue(body.documento_numero)

  if (!email || !password || !nombre) {
    return NextResponse.json({ error: "Nombre, email y contraseña son obligatorios." }, { status: 400 })
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres." }, { status: 400 })
  }

  const db = getDbClient()

  // Verificar si el email ya existe
  const { data: existing } = await db
    .from("usuarios")
    .select("id_usuario")
    .eq("email", email)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: "Este correo electrónico ya está registrado." }, { status: 400 })
  }

  // Cifrar contraseña con bcrypt
  const passwordHash = await bcrypt.hash(password, 10)

  const { data: newUser, error: insertError } = await db
    .from("usuarios")
    .insert([
      {
        nombre,
        email,
        password_hash: passwordHash,
        telefono,
        direccion: body.direccion || null,
        id_rol: idRol,
        id_tipo_documento: body.id_tipo_documento ? Number(body.id_tipo_documento) : null,
        documento_numero: documentoNumero,
        activo: true,
      },
    ])
    .select("id_usuario, nombre, email")
    .single()

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 })

  await db.from("logs").insert([
    {
      id_usuario: admin.profile?.id_usuario ?? null,
      accion: `Usuario creado #${newUser.id_usuario} (${email})`,
      ip_usuario: request.headers.get("x-forwarded-for") || "local",
    },
  ])

  return NextResponse.json({ ok: true, userId: newUser.id_usuario })
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin(request)
  if ("error" in admin) return NextResponse.json({ error: admin.error }, { status: admin.status })

  const body = await request.json().catch(() => ({}))
  const db = getDbClient()

  // Caso 1: Cambio del estado `activo` (reactivar/inactivar)
  if (typeof body.activo === "boolean" && body.id_usuario) {
    const idUsuario = Number(body.id_usuario)

    const { error: updateError } = await db
      .from("usuarios")
      .update({ activo: body.activo })
      .eq("id_usuario", idUsuario)

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 })

    await db.from("logs").insert([
      {
        id_usuario: admin.profile?.id_usuario ?? null,
        accion: `Usuario ${body.activo ? "reactivado" : "inactivado"} #${idUsuario}`,
        ip_usuario: request.headers.get("x-forwarded-for") || "local",
      },
    ])

    return NextResponse.json({ ok: true })
  }

  // Caso 2: Renombrar o crear un rol
  const tipoRol = String(body.tipo_rol || "").trim().toLowerCase()
  if (!tipoRol) return NextResponse.json({ error: "Ingresa el nombre del rol." }, { status: 400 })

  if (!/^[a-z0-9 _-]{3,30}$/.test(tipoRol)) {
    return NextResponse.json({ error: "Usa entre 3 y 30 caracteres para el rol." }, { status: 400 })
  }

  const idRol = Number(body.id_rol)
  const { data: existing } = await db
    .from("roles")
    .select("id_rol")
    .ilike("tipo_rol", tipoRol)
    .maybeSingle()

  if (existing && Number(existing.id_rol) !== idRol) {
    return NextResponse.json({ error: "Ese rol ya existe." }, { status: 409 })
  }

  if (idRol) {
    if ([1, 2, 3].includes(idRol)) {
      return NextResponse.json(
        { error: "Los roles base (usuario, administrador y producción) no se pueden renombrar." },
        { status: 400 }
      )
    }
    const { data, error } = await db
      .from("roles")
      .update({ tipo_rol: tipoRol })
      .eq("id_rol", idRol)
      .select("*")
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true, rol: data })
  }

  const { data, error } = await db
    .from("roles")
    .insert([{ tipo_rol: tipoRol }])
    .select("*")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, rol: data })
}

export async function PUT(request: Request) {
  const admin = await requireAdmin(request)
  if ("error" in admin) return NextResponse.json({ error: admin.error }, { status: admin.status })

  const body = await request.json().catch(() => ({}))
  const idUsuario = Number(body.id_usuario)
  const nombre = String(body.nombre || "").trim()
  const email = String(body.email || "").trim().toLowerCase()
  const password = String(body.password || "").trim()
  const idRol = Number(body.id_rol || 1)
  const idTipoDocumento = body.id_tipo_documento ? Number(body.id_tipo_documento) : null

  if (!idUsuario || !nombre || !email) {
    return NextResponse.json({ error: "Id, nombre y email son obligatorios." }, { status: 400 })
  }

  if (password && password.length < 6) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres." }, { status: 400 })
  }

  const telefono = normalizeIntValue(body.telefono)
  const documentoNumero = normalizeIntValue(body.documento_numero)

  const db = getDbClient()

  const { data: currentUser, error: currentError } = await db
    .from("usuarios")
    .select("id_usuario, nombre, email")
    .eq("id_usuario", idUsuario)
    .maybeSingle()

  if (currentError) return NextResponse.json({ error: currentError.message }, { status: 400 })
  if (!currentUser) return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 })

  const updateFields: Record<string, unknown> = {
    nombre,
    email,
    telefono,
    direccion: body.direccion || null,
    id_rol: idRol,
    id_tipo_documento: idTipoDocumento,
    documento_numero: documentoNumero,
  }

  // Si se envió una nueva contraseña, la ciframos con bcrypt
  if (password) {
    updateFields.password_hash = await bcrypt.hash(password, 10)
  }

  const { error: updateError } = await db
    .from("usuarios")
    .update(updateFields)
    .eq("id_usuario", idUsuario)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 })

  await db.from("logs").insert([
    {
      id_usuario: admin.profile?.id_usuario ?? null,
      accion: `Usuario actualizado #${idUsuario}`,
      ip_usuario: request.headers.get("x-forwarded-for") || "local",
    },
  ])

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const admin = await requireAdmin(request)
  if ("error" in admin) return NextResponse.json({ error: admin.error }, { status: admin.status })

  const body = await request.json().catch(() => ({}))
  const db = getDbClient()

  // Caso rol
  const idRol = Number(body.id_rol)
  if (idRol) {
    if ([1, 2, 3].includes(idRol)) {
      return NextResponse.json({ error: "Los roles base no se pueden eliminar." }, { status: 400 })
    }
    const { count, error: usageError } = await db
      .from("usuarios")
      .select("id_usuario", { count: "exact", head: true })
      .eq("id_rol", idRol)
    if (usageError) return NextResponse.json({ error: usageError.message }, { status: 400 })
    if (count) return NextResponse.json({ error: "No puedes eliminar un rol que está asignado a usuarios." }, { status: 409 })
    const { error } = await db.from("roles").delete().eq("id_rol", idRol)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  }

  // Caso usuario
  const idUsuario = Number(body.id_usuario)
  if (!idUsuario) return NextResponse.json({ error: "Id de usuario requerido." }, { status: 400 })

  // Soft Delete: marcar activo = false
  const { error: inactivateError } = await db
    .from("usuarios")
    .update({ activo: false })
    .eq("id_usuario", idUsuario)

  if (inactivateError) return NextResponse.json({ error: inactivateError.message }, { status: 400 })

  await db.from("logs").insert([
    {
      id_usuario: admin.profile?.id_usuario ?? null,
      accion: `Usuario inactivado #${idUsuario}`,
      ip_usuario: request.headers.get("x-forwarded-for") || "local",
    },
  ])

  return NextResponse.json({ ok: true })
}

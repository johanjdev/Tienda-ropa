import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { requireAdmin, requireAdminPanelReader } from "@/lib/admin-auth"
import { getSupabasePublicEnv } from "@/lib/supabase-public-env"
import { normalizeIntValue } from "@/lib/number-fields"

export async function POST(request: Request) {
  const admin = await requireAdminPanelReader(request)
  if ("error" in admin) return NextResponse.json({ error: admin.error }, { status: admin.status })

  // Leer el body de forma segura
  let body: any = null
  try {
    const text = await request.text()
    if (text) {
      body = JSON.parse(text)
    }
  } catch (e) {
    // Si no es un JSON válido o está vacío, continúa como null
  }

  // CASO 1: Listado de usuarios (Equivalente al antiguo GET)
  if (!body || !body.email) {
    const { url } = getSupabasePublicEnv()
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    const tableClient = serviceKey ? createClient(url, serviceKey) : admin.supabase

    const [usuarios, roles, documentos] = await Promise.all([
      tableClient.from("usuarios").select("*").order("id_usuario", { ascending: false }),
      tableClient.from("roles").select("*").order("id_rol", { ascending: true }),
      tableClient.from("tipo_documento").select("*").order("id_tipo_documento", { ascending: true }),
    ])

    if (usuarios.error) return NextResponse.json({ error: usuarios.error.message }, { status: 400 })

    return NextResponse.json({
      usuarios: usuarios.data ?? [],
      roles: roles.data ?? [],
      tiposDocumento: documentos.data ?? [],
      rolesError: roles.error?.message ?? null,
      tiposDocumentoError: documentos.error?.message ?? null,
    })
  }

  // CASO 2: Creación de usuario (Equivalente al antiguo POST)
  if (admin.roleName !== "administrador" && admin.roleName !== "admin" && Number(admin.profile?.id_rol) !== 2) {
    return NextResponse.json({ error: "Permisos insuficientes." }, { status: 403 })
  }
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!serviceKey) {
    return NextResponse.json(
      { error: "Configura SUPABASE_SERVICE_ROLE_KEY para crear usuarios desde el panel." },
      { status: 503 }
    )
  }

  const email = String(body.email || "").trim()
  const password = String(body.password || "").trim()
  const nombre = String(body.nombre || "").trim()
  const idRol = Number(body.id_rol || 1)
  const telefono = normalizeIntValue(body.telefono)
  const documentoNumero = normalizeIntValue(body.documento_numero)

  if (!email || !password || !nombre) {
    return NextResponse.json({ error: "Nombre, email y contrasena son obligatorios." }, { status: 400 })
  }

  const { url } = getSupabasePublicEnv()
  const service = createClient(url, serviceKey)
  const { data: created, error: createError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: nombre },
  })

  if (createError || !created.user) {
    return NextResponse.json({ error: createError?.message || "No se pudo crear Auth user." }, { status: 400 })
  }

  const { error: insertError } = await admin.supabase.from("usuarios").insert([
    {
      nombre,
      email,
      telefono,
      direccion: body.direccion || null,
      auth_id: created.user.id,
      id_rol: idRol,
      id_tipo_documento: body.id_tipo_documento ? Number(body.id_tipo_documento) : null,
      documento_numero: documentoNumero,
    },
  ])

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 })

  return NextResponse.json({ ok: true, userId: created.user.id })
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin(request)
  if ("error" in admin) return NextResponse.json({ error: admin.error }, { status: admin.status })

  const body = await request.json().catch(() => ({}))

  // ── Caso 1: Cambio del campo `activo` en un usuario (reactivar/inactivar) ──
  if (typeof body.activo === "boolean" && body.id_usuario) {
    const idUsuario = Number(body.id_usuario)
    const { url } = getSupabasePublicEnv()
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    const serviceClient = serviceKey ? createClient(url, serviceKey) : admin.supabase

    const { error: updateError } = await serviceClient
      .from("usuarios")
      .update({ activo: body.activo })
      .eq("id_usuario", idUsuario)

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 })

    // Si se reactiva, levantar el ban en Supabase Auth
    if (body.activo && serviceKey) {
      const { data: userData } = await serviceClient
        .from("usuarios")
        .select("auth_id")
        .eq("id_usuario", idUsuario)
        .maybeSingle()

      if (userData?.auth_id) {
        try {
          const service = createClient(url, serviceKey)
          // @ts-ignore
          if (service?.auth?.admin?.updateUserById) {
            // @ts-ignore
            await service.auth.admin.updateUserById(String(userData.auth_id), {
              ban_duration: "none",
            })
          }
        } catch (_e) {
          // Ignorar errores en Auth
        }
      }
    }

    await admin.supabase.from("logs").insert([{
      id_usuario: admin.profile?.id_usuario ?? null,
      accion: `Usuario ${body.activo ? "reactivado" : "inactivado"} #${idUsuario}`,
      ip_usuario: request.headers.get("x-forwarded-for") || "local",
    }])

    return NextResponse.json({ ok: true })
  }

  // ── Caso 2: Renombrar un rol (lógica existente) ──
  const tipoRol = String(body.tipo_rol || "").trim().toLowerCase()

  if (!tipoRol) return NextResponse.json({ error: "Ingresa el nombre del rol." }, { status: 400 })

  if (!/^[a-z0-9 _-]{3,30}$/.test(tipoRol)) {
    return NextResponse.json({ error: "Usa entre 3 y 30 caracteres para el rol." }, { status: 400 })
  }

  const { url } = getSupabasePublicEnv()
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  const tableClient = serviceKey ? createClient(url, serviceKey) : admin.supabase

  const idRol = Number(body.id_rol)
  const { data: existing } = await tableClient
    .from("roles")
    .select("id_rol")
    .ilike("tipo_rol", tipoRol)
    .maybeSingle()

  if (existing && Number(existing.id_rol) !== idRol) return NextResponse.json({ error: "Ese rol ya existe." }, { status: 409 })

  if (idRol) {
    if ([1, 2, 3].includes(idRol)) {
      return NextResponse.json({ error: "Los roles base (usuario, administrador y producción) no se pueden renombrar." }, { status: 400 })
    }
    const { data, error } = await tableClient
      .from("roles")
      .update({ tipo_rol: tipoRol })
      .eq("id_rol", idRol)
      .select("*")
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true, rol: data })
  }

  const { data, error } = await tableClient
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

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  const body = await request.json()
  const idUsuario = Number(body.id_usuario)
  const authId = String(body.auth_id || "").trim()
  const nombre = String(body.nombre || "").trim()
  const email = String(body.email || "").trim()
  const password = String(body.password || "").trim()
  const idRol = Number(body.id_rol || 1)
  const idTipoDocumento = body.id_tipo_documento ? Number(body.id_tipo_documento) : null

  if (!idUsuario || !nombre || !email) {
    return NextResponse.json({ error: "Id, nombre y email son obligatorios." }, { status: 400 })
  }

  if (password && password.length < 6) {
    return NextResponse.json({ error: "La contrasena debe tener al menos 6 caracteres." }, { status: 400 })
  }

  const { url, configured } = getSupabasePublicEnv()
  if (!configured) {
    return NextResponse.json({ error: "Supabase no esta configurado." }, { status: 503 })
  }

  const telefono = normalizeIntValue(body.telefono)
  const documentoNumero = normalizeIntValue(body.documento_numero)

  const { data: currentUser, error: currentError } = await admin.supabase
    .from("usuarios")
    .select("id_usuario, auth_id, nombre, email")
    .eq("id_usuario", idUsuario)
    .maybeSingle()

  if (currentError) return NextResponse.json({ error: currentError.message }, { status: 400 })
  if (!currentUser) return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 })

  const effectiveAuthId = authId || String(currentUser.auth_id || "")
  const changesAuth =
    Boolean(password) ||
    (effectiveAuthId && email.toLowerCase() !== String(currentUser.email || "").toLowerCase())

  if (changesAuth && !serviceKey) {
    return NextResponse.json(
      {
        error:
          "Para cambiar correo o contrasena configura SUPABASE_SERVICE_ROLE_KEY. Los demas datos se pueden editar sin esa llave.",
      },
      { status: 503 }
    )
  }

  if (effectiveAuthId && serviceKey) {
    const service = createClient(url, serviceKey)
    const authUpdate: {
      email: string
      email_confirm: boolean
      user_metadata: { full_name: string }
      password?: string
    } = {
      email,
      email_confirm: true,
      user_metadata: { full_name: nombre },
    }

    if (password) authUpdate.password = password

    const { error: authError } = await service.auth.admin.updateUserById(effectiveAuthId, authUpdate)
    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  const tableClient = serviceKey ? createClient(url, serviceKey) : admin.supabase
  const { error: updateError } = await tableClient
    .from("usuarios")
    .update({
      nombre,
      email,
      telefono,
      direccion: body.direccion || null,
      id_rol: idRol,
      id_tipo_documento: idTipoDocumento,
      documento_numero: documentoNumero,
    })
    .eq("id_usuario", idUsuario)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 })

  await admin.supabase.from("logs").insert([
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
  const idRol = Number(body.id_rol)
  if (idRol) {
    if ([1, 2, 3].includes(idRol)) {
      return NextResponse.json({ error: "Los roles base no se pueden eliminar." }, { status: 400 })
    }
    const { url } = getSupabasePublicEnv()
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    const tableClient = serviceKey ? createClient(url, serviceKey) : admin.supabase
    const { count, error: usageError } = await tableClient
      .from("usuarios")
      .select("id_usuario", { count: "exact", head: true })
      .eq("id_rol", idRol)
    if (usageError) return NextResponse.json({ error: usageError.message }, { status: 400 })
    if (count) return NextResponse.json({ error: "No puedes eliminar un rol que está asignado a usuarios." }, { status: 409 })
    const { error } = await tableClient.from("roles").delete().eq("id_rol", idRol)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  }
  const idUsuario = Number(body.id_usuario)
  if (!idUsuario) return NextResponse.json({ error: "Id de usuario requerido." }, { status: 400 })

  const { data: usuario, error: usuarioError } = await admin.supabase
    .from("usuarios")
    .select("id_usuario, auth_id")
    .eq("id_usuario", idUsuario)
    .maybeSingle()

  if (usuarioError) return NextResponse.json({ error: usuarioError.message }, { status: 400 })
  if (!usuario) return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 })

  const { url } = getSupabasePublicEnv()
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  const serviceClient = serviceKey ? createClient(url, serviceKey) : admin.supabase

  // ── Soft Delete: marcar como inactivo en lugar de borrar físicamente ──
  // Borrar físicamente causaría errores de integridad referencial con pedidos y logs.
  const { error: inactivateError } = await serviceClient
    .from("usuarios")
    .update({ activo: false })
    .eq("id_usuario", idUsuario)

  if (inactivateError) return NextResponse.json({ error: inactivateError.message }, { status: 400 })

  // Intentar también revocar acceso en Supabase Auth (deshabilitar cuenta)
  if (serviceKey && usuario.auth_id) {
    try {
      const service = createClient(url, serviceKey)
      // @ts-ignore
      if (service?.auth?.admin?.updateUserById) {
        // @ts-ignore
        await service.auth.admin.updateUserById(String(usuario.auth_id), {
          ban_duration: "876600h", // 100 años ≈ permanente
        })
      }
    } catch (_e) {
      // Ignorar errores en Auth y continuar — el soft delete en DB es suficiente
    }
  }

  await admin.supabase.from("logs").insert([
    {
      id_usuario: admin.profile?.id_usuario ?? null,
      accion: `Usuario inactivado #${idUsuario}`,
      ip_usuario: request.headers.get("x-forwarded-for") || "local",
    },
  ])

  return NextResponse.json({ ok: true })
}

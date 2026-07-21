import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { requireAdmin } from "@/lib/admin-auth"
import { getSupabasePublicEnv } from "@/lib/supabase-public-env"

export async function GET(request: Request) {
  const admin = await requireAdmin(request)
  if ("error" in admin) return NextResponse.json({ error: admin.error }, { status: admin.status })

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

export async function POST(request: Request) {
  const admin = await requireAdmin(request)
  if ("error" in admin) return NextResponse.json({ error: admin.error }, { status: admin.status })

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!serviceKey) {
    return NextResponse.json(
      { error: "Configura SUPABASE_SERVICE_ROLE_KEY para crear usuarios desde el panel." },
      { status: 503 }
    )
  }

  const body = await request.json()
  const email = String(body.email || "").trim()
  const password = String(body.password || "").trim()
  const nombre = String(body.nombre || "").trim()
  const idRol = Number(body.id_rol || 1)

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
      telefono: body.telefono || null,
      direccion: body.direccion || null,
      auth_id: created.user.id,
      id_rol: idRol,
      id_tipo_documento: body.id_tipo_documento ? Number(body.id_tipo_documento) : null,
      documento_numero: body.documento_numero || null,
    },
  ])

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 })

  return NextResponse.json({ ok: true, userId: created.user.id })
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin(request)
  if ("error" in admin) return NextResponse.json({ error: admin.error }, { status: admin.status })

  const body = await request.json().catch(() => ({}))
  const tipoRol = String(body.tipo_rol || "").trim().toLowerCase()

  if (!tipoRol) return NextResponse.json({ error: "Ingresa el nombre del rol." }, { status: 400 })
  if (!/^[a-z0-9 _-]{3,30}$/.test(tipoRol)) {
    return NextResponse.json({ error: "Usa entre 3 y 30 caracteres para el rol." }, { status: 400 })
  }

  const { url } = getSupabasePublicEnv()
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  const tableClient = serviceKey ? createClient(url, serviceKey) : admin.supabase

  const { data: existing } = await tableClient
    .from("roles")
    .select("id_rol")
    .ilike("tipo_rol", tipoRol)
    .maybeSingle()

  if (existing) return NextResponse.json({ error: "Ese rol ya existe." }, { status: 409 })

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
      telefono: body.telefono || null,
      direccion: body.direccion || null,
      id_rol: idRol,
      id_tipo_documento: idTipoDocumento,
      documento_numero: body.documento_numero || null,
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

  if (serviceKey && usuario.auth_id) {
    try {
      const service = createClient(url, serviceKey)
      // Attempt to delete the auth user (best-effort)
      // Use deleteUserById to match other admin methods (may vary by SDK)
      // If this fails we will continue and try to remove the DB row below.
      // @ts-ignore
      if (service?.auth?.admin?.deleteUserById) {
        // @ts-ignore
        await service.auth.admin.deleteUserById(String(usuario.auth_id))
      } else if (service?.auth?.admin?.deleteUser) {
        // @ts-ignore
        await service.auth.admin.deleteUser(String(usuario.auth_id))
      }
    } catch (e) {
      // ignore auth deletion errors and continue with DB cleanup
    }
  }

  const { error: delError } = await admin.supabase.from("usuarios").delete().eq("id_usuario", idUsuario)
  if (delError) return NextResponse.json({ error: delError.message }, { status: 400 })

  await admin.supabase.from("logs").insert([
    {
      id_usuario: admin.profile?.id_usuario ?? null,
      accion: `Usuario eliminado #${idUsuario}`,
      ip_usuario: request.headers.get("x-forwarded-for") || "local",
    },
  ])

  return NextResponse.json({ ok: true })
}

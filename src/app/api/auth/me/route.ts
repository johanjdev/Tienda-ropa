import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { getAuthUser, signAuthToken, AUTH_COOKIE_NAME } from "@/lib/jwt"
import { getDbClient } from "@/lib/db"
import { normalizeIntValue } from "@/lib/number-fields"

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request)
    if (!authUser || !authUser.id_usuario) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 })
    }

    const db = getDbClient()

    // Consultar datos actualizados del usuario en la base de datos
    const { data: usuario, error: userError } = await db
      .from("usuarios")
      .select("id_usuario, nombre, email, telefono, direccion, id_rol, id_tipo_documento, documento_numero, activo")
      .eq("id_usuario", authUser.id_usuario)
      .maybeSingle()

    if (userError || !usuario) {
      return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 })
    }

    if (usuario.activo === false) {
      return NextResponse.json({ error: "Cuenta desactivada." }, { status: 403 })
    }

    // Obtener el rol actualizado
    let roleName = authUser.rol || "cliente"
    if (usuario.id_rol) {
      const { data: rolData } = await db
        .from("roles")
        .select("tipo_rol")
        .eq("id_rol", Number(usuario.id_rol))
        .maybeSingle()

      if (rolData?.tipo_rol) {
        roleName = String(rolData.tipo_rol).trim().toLowerCase()
      }
    }

    if (Number(usuario.id_rol) === 2) {
      roleName = "administrador"
    }

    return NextResponse.json({
      ok: true,
      user: {
        ...usuario,
        roleName,
      },
      role: roleName,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error interno del servidor."
    console.error("Error en GET /api/auth/me:", err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const authUser = await getAuthUser(request)
    if (!authUser || !authUser.id_usuario) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: "Cuerpo de solicitud inválido." }, { status: 400 })
    }

    const db = getDbClient()
    const updateData: Record<string, unknown> = {}

    if (body.nombre !== undefined) {
      const cleanNombre = String(body.nombre).trim()
      if (!cleanNombre) {
        return NextResponse.json({ error: "El nombre no puede estar vacío." }, { status: 400 })
      }
      updateData.nombre = cleanNombre
    }

    if (body.telefono !== undefined) {
      updateData.telefono = normalizeIntValue(body.telefono)
    }

    if (body.direccion !== undefined) {
      updateData.direccion = body.direccion ? String(body.direccion).trim() : null
    }

    // Cambio de contraseña
    if (body.newPassword) {
      const newPassword = String(body.newPassword)
      if (newPassword.length < 8) {
        return NextResponse.json({ error: "La nueva contraseña debe tener al menos 8 caracteres." }, { status: 400 })
      }

      // Si el usuario ya tiene contraseña anterior, podemos verificarla si se proporcionó
      if (body.currentPassword) {
        const { data: currentUser } = await db
          .from("usuarios")
          .select("password_hash")
          .eq("id_usuario", authUser.id_usuario)
          .maybeSingle()

        if (currentUser?.password_hash) {
          const match = await bcrypt.compare(String(body.currentPassword), currentUser.password_hash)
          if (!match) {
            return NextResponse.json({ error: "La contraseña actual no es correcta." }, { status: 400 })
          }
        }
      }

      updateData.password_hash = await bcrypt.hash(newPassword, 10)
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No hay campos para actualizar." }, { status: 400 })
    }

    const { data: updated, error: updateError } = await db
      .from("usuarios")
      .update(updateData)
      .eq("id_usuario", authUser.id_usuario)
      .select("id_usuario, nombre, email, telefono, direccion, id_rol, id_tipo_documento, documento_numero, activo")
      .single()

    if (updateError || !updated) {
      return NextResponse.json({ error: updateError?.message || "Error al actualizar perfil." }, { status: 400 })
    }

    // Si cambió el nombre, refrescar JWT
    const token = await signAuthToken({
      id_usuario: updated.id_usuario,
      email: updated.email,
      nombre: updated.nombre,
      id_rol: updated.id_rol,
      rol: authUser.rol || "cliente",
      documento_numero: updated.documento_numero,
      id_tipo_documento: updated.id_tipo_documento,
      telefono: updated.telefono,
      direccion: updated.direccion,
    })

    const response = NextResponse.json({
      ok: true,
      message: "Perfil actualizado correctamente.",
      user: updated,
    })

    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    })

    return response
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error interno del servidor."
    console.error("Error en PUT /api/auth/me:", err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

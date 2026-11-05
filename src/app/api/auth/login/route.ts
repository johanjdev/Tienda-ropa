import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { getDbClient } from "@/lib/db"
import { signAuthToken, AUTH_COOKIE_NAME } from "@/lib/jwt"

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: "Cuerpo de solicitud inválido." }, { status: 400 })
    }

    const email = String(body.email || "").trim().toLowerCase()
    const password = String(body.password || "")

    if (!email || !password) {
      return NextResponse.json({ error: "Correo y contraseña son obligatorios." }, { status: 400 })
    }

    const db = getDbClient()

    // 1. Buscar usuario en la base de datos por email
    const { data: usuario, error: userError } = await db
      .from("usuarios")
      .select("*")
      .eq("email", email)
      .maybeSingle()

    if (userError) {
      console.error("Error al consultar usuario:", userError)
      return NextResponse.json({ error: "Error al consultar la base de datos." }, { status: 500 })
    }

    if (!usuario) {
      return NextResponse.json({ error: "Credenciales incorrectas." }, { status: 401 })
    }

    // 2. Verificar si la cuenta está inactiva
    if (usuario.activo === false) {
      return NextResponse.json(
        { error: "Esta cuenta ha sido desactivada. Por favor contacta al administrador." },
        { status: 403 }
      )
    }

    // 3. Validar si el usuario tiene contraseña cifrada en la base de datos
    if (!usuario.password_hash) {
      return NextResponse.json(
        {
          error:
            "Esta cuenta no tiene una contraseña registrada con el sistema nuevo. Por favor regístrate nuevamente o contacta al soporte.",
        },
        { status: 400 }
      )
    }

    // 4. Comparar la contraseña ingresada con el hash de bcrypt
    const passwordMatches = await bcrypt.compare(password, usuario.password_hash)
    if (!passwordMatches) {
      return NextResponse.json({ error: "Credenciales incorrectas." }, { status: 401 })
    }

    // 5. Obtener el nombre del rol si existe
    let roleName = "cliente"
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

    // Compatibilidad: id_rol = 2 suele ser administrador en este sistema
    if (Number(usuario.id_rol) === 2) {
      roleName = "administrador"
    }

    // 6. Generar JWT firmado
    const token = await signAuthToken({
      id_usuario: usuario.id_usuario,
      email: usuario.email,
      nombre: usuario.nombre,
      id_rol: usuario.id_rol,
      rol: roleName,
      documento_numero: usuario.documento_numero,
      id_tipo_documento: usuario.id_tipo_documento,
      telefono: usuario.telefono,
      direccion: usuario.direccion,
    })

    // 7. Sanitizar datos del usuario para no exponer password_hash
    const { password_hash: _, ...userSafe } = usuario
    userSafe.roleName = roleName

    // 8. Crear respuesta y fijar cookie de sesión HTTP-only
    const response = NextResponse.json({
      ok: true,
      user: userSafe,
      role: roleName,
      token,
    })

    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 días
    })

    return response
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error interno del servidor."
    console.error("Error en POST /api/auth/login:", err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

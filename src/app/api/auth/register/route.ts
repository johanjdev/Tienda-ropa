import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { getDbClient } from "@/lib/db"
import { signAuthToken, AUTH_COOKIE_NAME } from "@/lib/jwt"
import { normalizeIntValue } from "@/lib/number-fields"

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: "Cuerpo de solicitud inválido." }, { status: 400 })
    }

    const nombre = String(body.nombre || "").trim()
    const email = String(body.email || "").trim().toLowerCase()
    const password = String(body.password || "")
    const telefono = normalizeIntValue(body.telefono)
    const direccion = body.direccion ? String(body.direccion).trim() : null
    const idTipoDocumento = normalizeIntValue(body.id_tipo_documento)
    const documentoNumero = normalizeIntValue(body.documento_numero)

    if (!nombre) {
      return NextResponse.json({ error: "El nombre completo es obligatorio." }, { status: 400 })
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Ingresa un correo electrónico válido." }, { status: 400 })
    }

    if (!password || password.length < 8) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres." }, { status: 400 })
    }

    const db = getDbClient()

    //Verificar si el correo ya está registrado en la tabla usuarios
    const { data: existingUser, error: findError } = await db
      .from("usuarios")
      .select("id_usuario")
      .eq("email", email)
      .maybeSingle()

    if (findError) {
      console.error("Error al buscar usuario existente:", findError)
      return NextResponse.json({ error: "Error al verificar correo en la base de datos." }, { status: 500 })
    }

    if (existingUser) {
      return NextResponse.json({ error: "Este correo electrónico ya está registrado." }, { status: 400 })
    }

    //Cifrar la contraseña con bcrypt
    const passwordHash = await bcrypt.hash(password, 10)

    //Insertar el nuevo usuario en la base de datos
    const { data: newUser, error: insertError } = await db
      .from("usuarios")
      .insert([
        {
          nombre,
          email,
          password_hash: passwordHash,
          telefono,
          direccion,
          id_rol: 1, // Rol por defecto: Cliente
          id_tipo_documento: idTipoDocumento,
          documento_numero: documentoNumero,
          activo: true,
        },
      ])
      .select("id_usuario, nombre, email, id_rol, telefono, direccion, id_tipo_documento, documento_numero, activo")
      .single()

    if (insertError || !newUser) {
      console.error("Error al insertar usuario:", insertError)
      return NextResponse.json(
        { status: 400 }
      )
    }

    //Generar JWT firmado
    const token = await signAuthToken({
      id_usuario: newUser.id_usuario,
      email: newUser.email,
      nombre: newUser.nombre,
      id_rol: newUser.id_rol,
      rol: "cliente",
      documento_numero: newUser.documento_numero,
      id_tipo_documento: newUser.id_tipo_documento,
      telefono: newUser.telefono,
      direccion: newUser.direccion,
    })

    //Crear respuesta y fijar cookie de sesión HTTP-only
    const response = NextResponse.json(
      {
        ok: true,
        user: newUser,
        token,
      },
      { status: 201 }
    )

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
    console.error("Error en POST /api/auth/register:", err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

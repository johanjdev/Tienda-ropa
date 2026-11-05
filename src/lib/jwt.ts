import { SignJWT, jwtVerify } from "jose"

export interface AuthTokenPayload {
  id_usuario: number
  email: string
  nombre?: string | null
  id_rol?: number | null
  rol?: string | null
  documento_numero?: number | string | null
  id_tipo_documento?: number | null
  telefono?: number | string | null
  direccion?: string | null
}

export const AUTH_COOKIE_NAME = "auth_token"

function getJwtSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET?.trim() || "arquetipo_jwt_default_secret_key_minimum_32_characters_long_2026!"
  return new TextEncoder().encode(secret)
}

/**
 * Genera un token JWT firmado para la sesión de usuario (válido por 7 días)
 */
export async function signAuthToken(payload: AuthTokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getJwtSecretKey())
}

/**
 * Verifica la firma y validez de un token JWT
 */
export async function verifyAuthToken(token: string): Promise<AuthTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey())
    return payload as unknown as AuthTokenPayload
  } catch {
    return null
  }
}

/**
 * Extrae el token JWT desde la cabecera Authorization: Bearer o desde la cookie auth_token
 */
export function getTokenFromRequest(request: Request): string | null {
  // 1. Authorization: Bearer <token>
  const authHeader = request.headers.get("authorization")
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice(7).trim()
    if (token) return token
  }

  // 2. Cookie: auth_token=<token>
  const cookieHeader = request.headers.get("cookie") || ""
  if (cookieHeader) {
    const pairs = cookieHeader.split(";")
    for (const pair of pairs) {
      const [key, ...val] = pair.trim().split("=")
      if (key === AUTH_COOKIE_NAME) {
        return decodeURIComponent(val.join("="))
      }
    }
  }

  return null
}

/**
 * Obtiene el usuario autenticado a partir de la petición HTTP
 */
export async function getAuthUser(request: Request): Promise<AuthTokenPayload | null> {
  const token = getTokenFromRequest(request)
  if (!token) return null
  return verifyAuthToken(token)
}

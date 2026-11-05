import { NextResponse, type NextRequest } from "next/server"
import { verifyAuthToken, AUTH_COOKIE_NAME } from "./lib/jwt"

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value
  const user = token ? await verifyAuthToken(token) : null

  const pathname = request.nextUrl.pathname

  // Proteger rutas de administración (/admin/...)
  if (pathname.startsWith("/admin")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url))
    }

    const roleName = String(user.rol || "").trim().toLowerCase()
    const isAdmin = Number(user.id_rol) === 2 || roleName === "administrador" || roleName === "admin"
    const editorAllowed =
      roleName === "editor" &&
      (pathname === "/admin" ||
        pathname.startsWith("/admin/productos") ||
        pathname.startsWith("/admin/pedidos"))

    // El rol 3 (producción) puede consultar el panel en modo lectura
    const produccionAllowed =
      Number(user.id_rol) === 3 || roleName === "produccion" || roleName === "producción"

    if (!isAdmin && !editorAllowed && !produccionAllowed) {
      return NextResponse.redirect(new URL("/", request.url))
    }
  }

  // Proteger ruta de perfil de usuario (/cuenta/...)
  if (pathname.startsWith("/cuenta")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}

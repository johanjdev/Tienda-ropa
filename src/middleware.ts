import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabasePublicEnv } from './lib/supabase-public-env'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const { url, anonKey } = getSupabasePublicEnv()

  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) return NextResponse.redirect(new URL('/login', request.url))

    const { data: dbUser } = await supabase
      .from('usuarios')
      .select('id_rol')
      .eq('auth_id', user.id)
      .maybeSingle()

    const { data: role } = dbUser
      ? await supabase.from('roles').select('tipo_rol').eq('id_rol', Number(dbUser.id_rol)).maybeSingle()
      : { data: null }

    const roleName = String(role?.tipo_rol || '').trim().toLowerCase()
    const isAdmin = Number(dbUser?.id_rol) === 2 || roleName === 'administrador' || roleName === 'admin'
    const editorAllowed =
      roleName === 'editor' &&
      (request.nextUrl.pathname === '/admin' ||
        request.nextUrl.pathname.startsWith('/admin/productos') ||
        request.nextUrl.pathname.startsWith('/admin/pedidos'))

    if (!dbUser || (!isAdmin && !editorAllowed)) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  if (request.nextUrl.pathname.startsWith('/cuenta')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}

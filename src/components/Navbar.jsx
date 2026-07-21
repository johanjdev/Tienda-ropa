"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { IoCartOutline, IoMenuOutline, IoCloseOutline, IoPersonOutline } from "react-icons/io5"
import { useAuth } from "./AuthProvider"
import { useCartTotalQuantity } from "@/hooks/useCartTotalQuantity"
import Modal from "./Modal"
import { supabase } from "@/lib/supabase"

export default function Navbar() {
  const { user, profile, signOut } = useAuth()
  const cartQty = useCartTotalQuantity()
  const router = useRouter()
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const loadRole = async () => {
      if (!user || !profile?.id_rol) return setIsAdmin(false)
      const { data: role } = await supabase
        .from("roles")
        .select("tipo_rol")
        .eq("id_rol", Number(profile.id_rol))
        .maybeSingle()
      const roleName = String(role?.tipo_rol || "").trim().toLowerCase()
      setIsAdmin(Number(profile.id_rol) === 2 || roleName === "admin" || roleName === "administrador")
    }
    void loadRole()
  }, [profile?.id_rol, user?.id])

  const displayName =
    profile?.nombre?.trim() ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Usuario"

  const handleSignOut = async () => {
    setLoggingOut(true)
    try {
      await signOut()
      setLogoutOpen(false)
      router.replace("/")
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <>
      <nav className="sticky top-0 z-50 w-full bg-black/80 backdrop-blur-xl px-4 sm:px-8 py-4 sm:py-5 shadow-black/25 shadow-lg">
        <div className="mx-auto flex max-w-[1600px] items-center gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white/10 sm:hidden"
              aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            >
              {menuOpen ? (
                <IoCloseOutline className="h-6 w-6" />
              ) : (
                <IoMenuOutline className="h-6 w-6" />
              )}
            </button>

            <Link
              href="/"
              className="text-lg font-semibold text-white hover:text-purple-300 transition"
            >
              Tienda
            </Link>
          </div>

          <div className="hidden sm:flex gap-6">
            <Link
              href="/"
              className="text-lg text-white font-semibold relative after:content-[''] after:block after:w-0 after:h-[2px] after:bg-purple-500 after:transition-all hover:after:w-full"
            >
              Inicio
            </Link>
            <Link
              href="/user"
              className="text-lg text-white font-semibold relative after:content-[''] after:block after:w-0 after:h-[2px] after:bg-purple-500 after:transition-all hover:after:w-full"
            >
              Productos
            </Link>
            <Link
              href="/user/about"
              className="text-lg text-white font-semibold relative after:content-[''] after:block after:w-0 after:h-[2px] after:bg-purple-500 after:transition-all hover:after:w-full"
            >
              Nosotros
            </Link>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <Link
              href="/cart"
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
              title="Carrito"
            >
              <IoCartOutline className="h-6 w-6" />
              {cartQty > 0 && (
                <span className="pointer-events-none absolute -top-0.5 -right-1 min-h-[1.125rem] min-w-[1.125rem] px-1 flex items-center justify-center rounded-full bg-[#6b2ad4] text-[10px] font-bold leading-none text-white ring-2 ring-black">
                  {cartQty > 99 ? "99+" : cartQty}
                </span>
              )}
            </Link>

            {!user ? (
              <Link
                href="/login"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white/10 sm:hidden"
                title="Iniciar sesión"
              >
                <IoPersonOutline className="h-5 w-5" />
              </Link>
            ) : (
              <Link
                href="/cuenta"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white/10 sm:hidden"
                title="Mi cuenta"
              >
                <IoPersonOutline className="h-5 w-5" />
              </Link>
            )}

            <div className="hidden sm:flex gap-3 items-center">
              {!user ? (
                <>
                  <Link
                    href="/login"
                    className="text-lg border border-white/40 text-white px-4 py-2 rounded-full hover:bg-[#6b2ad4] transition"
                  >
                    Iniciar sesión
                  </Link>
                  <Link
                    href="/register"
                    className="text-lg bg-[#6b2ad4] text-white px-4 py-2 rounded-full hover:scale-110 transition duration-300"
                  >
                    Crear Cuenta
                  </Link>
                </>
              ) : (
                <>
                  <span className="text-lg text-white/80 max-w-[140px] truncate" title={displayName}>
                    Hola, {displayName}
                  </span>
                  <Link
                    href="/cuenta"
                    className="text-lg border border-white/40 px-4 py-2 rounded-full text-white hover:text-[#6b2ad4] transition"
                  >
                    Mi cuenta
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="text-lg bg-[#6b2ad4] px-4 py-2 rounded-full text-white hover:bg-[#580096] transition"
                    >
                      Panel administrador
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => setLogoutOpen(true)}
                    className="text-lg bg-red-600/90 hover:bg-red-600 text-white px-4 py-2 rounded-full transition"
                  >
                    Cerrar sesión
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {menuOpen && (
          <div className="sm:hidden">
            <div className="mt-4 rounded-3xl border border-white/10 bg-zinc-950/95 p-4 shadow-2xl shadow-black/30">
              <div className="space-y-3">
                <Link
                  href="/"
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-2xl px-4 py-3 text-base font-semibold text-white hover:bg-white/5 transition"
                >
                  Inicio
                </Link>
                <Link
                  href="/user"
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-2xl px-4 py-3 text-base font-semibold text-white hover:bg-white/5 transition"
                >
                  Productos
                </Link>
                <Link
                  href="/user/about"
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-2xl px-4 py-3 text-base font-semibold text-white hover:bg-white/5 transition"
                >
                  Nosotros
                </Link>
              </div>

              <div className="mt-4 border-t border-white/10 pt-4 space-y-3">
                {!user ? (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setMenuOpen(false)}
                      className="block rounded-2xl px-4 py-3 text-base font-semibold text-white hover:bg-white/5 transition"
                    >
                      Iniciar sesión
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setMenuOpen(false)}
                      className="block rounded-2xl bg-[#6b2ad4] px-4 py-3 text-base font-semibold text-white hover:bg-[#580096] transition"
                    >
                      Crear Cuenta
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/cuenta"
                      onClick={() => setMenuOpen(false)}
                      className="block rounded-2xl px-4 py-3 text-base font-semibold text-white hover:bg-white/5 transition"
                    >
                      Mi cuenta
                    </Link>
                    {isAdmin && (
                      <Link
                        href="/admin"
                        onClick={() => setMenuOpen(false)}
                        className="block rounded-2xl bg-[#6b2ad4] px-4 py-3 text-base font-semibold text-white hover:bg-[#580096] transition"
                      >
                        Panel administrador
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false)
                        setLogoutOpen(true)
                      }}
                      className="w-full rounded-2xl bg-red-600 px-4 py-3 text-base font-semibold text-white hover:bg-red-500 transition"
                    >
                      Cerrar sesión
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      <Modal
        open={logoutOpen}
        onClose={() => !loggingOut && setLogoutOpen(false)}
        title="Cerrar sesión"
        variant="info"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              disabled={loggingOut}
              onClick={() => setLogoutOpen(false)}
              className="rounded-full border border-white/25 px-4 py-2 text-sm text-white hover:bg-white/10 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={loggingOut}
              onClick={handleSignOut}
              className="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 transition"
            >
              {loggingOut ? "Cerrando…" : "Cerrar sesión"}
            </button>
          </div>
        }
      >
        <p>¿Seguro que quieres cerrar sesión?</p>
      </Modal>
    </>
  )
}

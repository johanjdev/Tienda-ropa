/**
 * /login/page.jsx
 * ──────────────────────────────────────────────────────────────
 * Página de inicio de sesión de la tienda ARQUETIPO.
 *
 * Funcionalidades:
 * 1. Inicio de sesión con correo y contraseña usando Supabase Auth.
 * 2. Recordar correo: guarda el correo en localStorage si el usuario
 *    marca la casilla, y lo pre-carga la próxima vez que abra la página.
 * 3. Redirección según rol:
 *    - Administrador → /admin
 *    - Usuario normal → /
 * 4. Recuperación de contraseña:
 *    - Envía un OTP al correo del usuario via supabase.auth.resetPasswordForEmail().
 *    - Al cerrar el modal de confirmación, redirige a /reset-password?email=...
 * 5. Modal de feedback: muestra errores o mensajes informativos sin recargar la página.
 */

"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import Modal from "@/components/Modal"

/**
 * LoginPage
 * ──────────────────────────────────────────────────────────────
 * Componente principal de la página de login.
 * Maneja tanto el flujo de inicio de sesión como el de recuperación
 * de contraseña desde la misma pantalla.
 */
export default function LoginPage() {
  /** Correo electrónico del usuario (se pre-carga desde localStorage si "recordar" estaba activo) */
  const [email, setEmail] = useState("")

  /** Contraseña ingresada por el usuario */
  const [password, setPassword] = useState("")

  /** Si es true, el correo se guarda en localStorage para pre-cargarlo la próxima visita */
  const [remember, setRemember] = useState(false)

  /** Indica si el inicio de sesión está siendo procesado (deshabilita el botón) */
  const [loading, setLoading] = useState(false)

  /** Indica si el envío del correo de recuperación está en proceso */
  const [resetLoading, setResetLoading] = useState(false)

  /** Controla si el modal de feedback está visible */
  const [modalOpen, setModalOpen] = useState(false)

  /** Mensaje que se muestra dentro del modal */
  const [modalMessage, setModalMessage] = useState("")

  /** Título del modal (determina también si se muestra como error o como info) */
  const [modalTitle, setModalTitle] = useState("Error al iniciar sesion")

  /**
   * Bandera que indica si al cerrar el modal se debe redirigir a /reset-password.
   * Solo se activa cuando el envío del OTP fue exitoso.
   */
  const [redirectToReset, setRedirectToReset] = useState(false)

  /**
   * Al montar la página, revisa localStorage para pre-cargar el correo
   * si el usuario había activado "Recordar correo" en una visita anterior.
   */
  useEffect(() => {
    const remembered = localStorage.getItem("rememberEmail")
    if (remembered) {
      setEmail(remembered)
      setRemember(true)
    }
  }, [])

  /**
   * handleLogin
   * ──────────────────────────────────────────────────────────────
   * Maneja el submit del formulario de inicio de sesión.
   *
   * Pasos:
   * 1. Autentica con supabase.auth.signInWithPassword().
   * 2. Si "Recordar correo" está activo, guarda el email en localStorage.
   * 3. Consulta la tabla `usuarios` para obtener el id_rol del usuario.
   * 4. Consulta la tabla `roles` para obtener el nombre del rol.
   * 5. Redirige a /admin si es administrador, o a / si es usuario normal.
   *
   * Si cualquier paso falla, muestra el error en el modal.
   */
  const handleLogin = async (e) => {
    e.preventDefault()
    if (loading) return // evitar doble envío
    setLoading(true)

    try {
      // Autenticar con Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error

      // Guardar o eliminar el correo de localStorage según la preferencia del usuario
      if (remember) localStorage.setItem("rememberEmail", email)
      else localStorage.removeItem("rememberEmail")

      // Obtener el rol del usuario desde la tabla `usuarios`
      const { data: usuarioDb, error: roleError } = await supabase
        .from("usuarios")
        .select("id_rol")
        .eq("auth_id", data.user.id)
        .maybeSingle()

      if (roleError) throw roleError

      // Si tiene id_rol, obtener el nombre del rol desde la tabla `roles`
      const { data: rolDb } = usuarioDb?.id_rol
        ? await supabase
            .from("roles")
            .select("tipo_rol")
            .eq("id_rol", Number(usuarioDb.id_rol))
            .maybeSingle()
        : { data: null }

      // Determinar si el usuario es administrador por id_rol=2 o por nombre del rol
      const roleName = String(rolDb?.tipo_rol || "").trim().toLowerCase()
      const isAdmin =
        Number(usuarioDb?.id_rol) === 2 ||
        roleName === "administrador" ||
        roleName === "admin"

      // Redirigir según el rol
      window.location.href = isAdmin ? "/admin" : "/"
    } catch (err) {
      setModalTitle("Error al iniciar sesion")
      setModalMessage(err.message || "No se pudo iniciar sesion.")
      setModalOpen(true)
    } finally {
      setLoading(false)
    }
  }

  /**
   * handlePasswordReset
   * ──────────────────────────────────────────────────────────────
   * Inicia el flujo de recuperación de contraseña.
   *
   * Requisito: el campo de email debe estar lleno antes de hacer clic.
   * Si no hay email, muestra el modal pidiendo que lo ingrese primero.
   *
   * Al llamar a supabase.auth.resetPasswordForEmail():
   * - Supabase envía un correo con un OTP de 6 dígitos al usuario.
   * - Si tiene éxito, se activa `redirectToReset = true` para que al
   *   cerrar el modal se redirija a /reset-password?email=... con el
   *   correo pre-cargado en la URL.
   *
   * `redirectTo` le indica a Supabase a qué URL redirigir si el usuario
   * hace clic en el enlace del correo en lugar de copiar el código.
   */
  const handlePasswordReset = async () => {
    if (!email.trim()) {
      setModalTitle("Correo requerido")
      setModalMessage("Escribe tu correo para enviarte el código de recuperación.")
      setModalOpen(true)
      setRedirectToReset(false)
      return
    }

    setResetLoading(true)
    const redirectTo = `${window.location.origin}/reset-password`
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    })
    setResetLoading(false)
    if (error) {
      setModalTitle("No se pudo enviar")
      setModalMessage(error.message)
      setRedirectToReset(false)
    } else {
      setModalTitle("Código enviado")
      setModalMessage("Te hemos enviado un código de recuperación a tu correo. Al cerrar este mensaje, serás redirigido para ingresar el código y crear tu nueva contraseña.")
      setRedirectToReset(true) // activar redirección al cerrar el modal
    }
    setModalOpen(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950/80 p-7 shadow-2xl shadow-purple-950/20">
        <h2 className="text-center text-2xl font-black text-white mb-2">
          Iniciar sesion
        </h2>
        <p className="mb-6 text-center text-sm text-zinc-500">
          Entra para comprar y ver tus pedidos.
        </p>

        {/* ── Formulario de login ──────────────────────────────── */}
        <form onSubmit={handleLogin} className="space-y-4">

          {/* Campo de correo con ícono de Remix Icons */}
          <label className="block">
            <span className="mb-2 block text-sm text-zinc-400">Correo</span>
            <div className="flex items-center rounded-xl border border-white/10 bg-black/50 px-3 focus-within:border-purple-500">
              <i className="ri-mail-line text-zinc-500" aria-hidden />
              <input
                className="min-w-0 flex-1 bg-transparent p-3 text-white placeholder-zinc-600 outline-none"
                placeholder="tu@email.com"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </label>

          {/* Campo de contraseña con ícono de Remix Icons */}
          <label className="block">
            <span className="mb-2 block text-sm text-zinc-400">Contrasena</span>
            <div className="flex items-center rounded-xl border border-white/10 bg-black/50 px-3 focus-within:border-purple-500">
              <i className="ri-lock-line text-zinc-500" aria-hidden />
              <input
                className="min-w-0 flex-1 bg-transparent p-3 text-white placeholder-zinc-600 outline-none"
                type="password"
                placeholder="Tu contrasena"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </label>

          {/* Botón de "Olvidé mi contraseña": no es submit, llama a handlePasswordReset */}
          <button
            type="button"
            onClick={() => void handlePasswordReset()}
            disabled={resetLoading}
            className="text-sm text-[#B675FF] hover:underline disabled:opacity-60"
          >
            {resetLoading ? "Enviando código..." : "Olvidé mi contraseña"}
          </button>

          {/* Checkbox para recordar el correo en futuros inicios de sesión */}
          <label className="flex items-center space-x-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-white/30 text-purple-500 focus:ring-[#6b2ad4]"
            />
            <span>Recordar correo</span>
          </label>

          {/* Botón de submit: cambia de color y cursor según el estado de carga */}
          <button
            disabled={loading}
            className={`w-full rounded-xl py-3 font-medium transition ${
              loading
                ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                : "bg-[#6b2ad4] hover:bg-[#580096] text-white cursor-pointer"
            }`}
          >
            {loading ? "Cargando..." : "Ingresar"}
          </button>
        </form>

        {/* Enlace para registrarse si el usuario no tiene cuenta */}
        <p className="text-center text-sm text-zinc-400 mt-5">
          No tienes cuenta?{" "}
          <Link href="/register" className="text-[#B675FF] hover:underline">
            Registrate
          </Link>
        </p>
      </div>

      {/* ── Modal de feedback ────────────────────────────────────
          Se usa para mostrar errores de login y la confirmación del envío de OTP.
          La variante (error/info) se determina por el título del modal.
          Al cerrarse, si redirectToReset es true, navega a /reset-password
          con el email pre-cargado como query param.
      ── */}
      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          if (redirectToReset) {
            // Redirigir con el email en la URL para pre-cargar el campo en /reset-password
            window.location.href = `/reset-password?email=${encodeURIComponent(email.trim())}`
          }
        }}
        title={modalTitle}
        variant={modalTitle.includes("Error") || modalTitle.includes("No se") ? "error" : "info"}
      >
        <p>{modalMessage}</p>
      </Modal>
    </div>
  )
}

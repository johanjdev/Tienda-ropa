/**
 * /reset-password/page.jsx
 * ──────────────────────────────────────────────────────────────
 * Página para restablecer la contraseña mediante un código OTP.
 *
 * Flujo completo:
 * 1. El usuario llega aquí desde /login al hacer clic en "Olvidé mi contraseña".
 *    La URL trae el email pre-cargado como query param: /reset-password?email=...
 * 2. El usuario ingresa el código OTP recibido en su correo.
 * 3. Al enviar el formulario:
 *    a. Se verifica el OTP con supabase.auth.verifyOtp()
 *    b. Si es válido, se actualiza la contraseña con supabase.auth.updateUser()
 * 4. Si no llegó el correo, puede solicitar uno nuevo con "Reenviar código".
 *    - Hay un cooldown de 60 segundos entre reenvíos para no sobrecargar la API.
 *
 * El componente se envuelve en <Suspense> porque usa useSearchParams(),
 * que requiere este wrapper en Next.js App Router para evitar errores de SSR.
 */

"use client"

import Link from "next/link"
import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"

/**
 * ResetPasswordForm
 * ──────────────────────────────────────────────────────────────
 * Formulario interno del restablecimiento de contraseña.
 * Se separa del componente exportado para poder usar useSearchParams()
 * dentro del Suspense boundary requerido por Next.js.
 */
function ResetPasswordForm() {
  // useSearchParams lee los query params de la URL (?email=...)
  const searchParams = useSearchParams()

  /** Correo del usuario (pre-cargado desde la URL o editable manualmente) */
  const [email, setEmail] = useState(searchParams.get("email") || "")

  /** Código OTP de 6 dígitos recibido en el correo */
  const [code, setCode] = useState("")

  /** Nueva contraseña que el usuario desea establecer */
  const [password, setPassword] = useState("")

  /** Confirmación de la nueva contraseña (debe coincidir con password) */
  const [confirm, setConfirm] = useState("")

  /** Indica si el formulario principal está siendo procesado */
  const [loading, setLoading] = useState(false)

  /** Indica si el reenvío de código está siendo procesado */
  const [resending, setResending] = useState(false)

  /**
   * Tiempo de espera en segundos antes de permitir otro reenvío.
   * Se inicializa en 0 (sin espera). Al reenviar se fija en 60 segundos
   * y un intervalo lo decrementa cada segundo hasta llegar a 0.
   */
  const [cooldown, setCooldown] = useState(0)

  /** Mensaje informativo o de error mostrado bajo el formulario */
  const [message, setMessage] = useState("")

  /**
   * Efecto del temporizador de cooldown.
   * Cuando `cooldown` es mayor que 0, un intervalo lo decrementa cada 1 segundo.
   * Al llegar a 0 el intervalo se limpia automáticamente.
   */
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer) // limpieza al desmontar o cuando cooldown cambia
  }, [cooldown])

  /**
   * handleSubmit
   * ──────────────────────────────────────────────────────────────
   * Procesa el formulario de cambio de contraseña.
   *
   * Validaciones previas:
   * - Email y código no pueden estar vacíos.
   * - La nueva contraseña debe tener al menos 6 caracteres.
   * - Las dos contraseñas deben coincidir.
   *
   * Pasos:
   * 1. supabase.auth.verifyOtp() → verifica que el código sea válido y no haya expirado.
   * 2. supabase.auth.updateUser() → establece la nueva contraseña en Supabase Auth.
   */
  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!email || !code) return setMessage("Escribe el correo y el código de recuperación.")
    if (password.length < 6) return setMessage("La contraseña debe tener al menos 6 caracteres.")
    if (password !== confirm) return setMessage("Las contraseñas no coinciden.")
    setLoading(true)
    // Verificar el OTP: type "recovery" indica que es un código de recuperación de contraseña
    const { error: verifyError } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "recovery" })
    if (verifyError) {
      setLoading(false)
      return setMessage("El código no es válido o expiró. Solicita uno nuevo.")
    }
    // Si el OTP es válido, actualizar la contraseña del usuario
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    setMessage(error ? error.message : "Contraseña actualizada. Ya puedes iniciar sesión.")
  }

  /**
   * handleResendCode
   * ──────────────────────────────────────────────────────────────
   * Reenvía el correo de recuperación de contraseña al usuario.
   *
   * Condiciones para ejecutarse:
   * - No debe haber cooldown activo (cooldown === 0).
   * - El campo de email debe estar lleno.
   *
   * Al reenviar exitosamente:
   * - Muestra un mensaje de confirmación.
   * - Inicia el cooldown de 60 segundos para prevenir spam.
   *
   * La URL de redirección (redirectTo) lleva de vuelta a /reset-password
   * para que el usuario pueda ingresar el nuevo código en esta misma página.
   */
  const handleResendCode = async () => {
    if (cooldown > 0) return // no hacer nada si aún hay cooldown activo
    if (!email.trim()) {
      return setMessage("Escribe tu correo para poder reenviar el código.")
    }
    setResending(true)
    setMessage("")
    const redirectTo = `${window.location.origin}/reset-password`
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    })
    setResending(false)
    if (error) {
      setMessage(`No se pudo reenviar: ${error.message}`)
    } else {
      setMessage("Código reenviado con éxito. Por favor revisa tu correo.")
      setCooldown(60) // bloquear reenvíos por 60 segundos
    }
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] px-4 py-16 text-white">
      <section className="mx-auto w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950/80 p-7">
        <h1 className="text-center text-2xl font-black">Recuperar contraseña</h1>
        <p className="mt-2 text-center text-sm text-zinc-500">
          Ingresa el código recibido en tu correo y crea tu nueva contraseña.
        </p>

        {/* ── Formulario principal ──────────────────────────────── */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">

          {/* Campo de correo: pre-llenado desde la URL pero editable */}
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Correo"
            className="w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-white outline-none focus:border-purple-500"
          />

          {/* Campo del código OTP recibido en el correo */}
          <input
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Código de recuperación"
            autoComplete="one-time-code" /* ayuda a los gestores de contraseñas a identificarlo */
            className="w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-white outline-none focus:border-purple-500"
          />

          {/* Campo de la nueva contraseña */}
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nueva contraseña"
            autoComplete="new-password"
            className="w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-white outline-none focus:border-purple-500"
          />

          {/* Campo de confirmación: debe ser idéntico al campo anterior */}
          <input
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirmar contraseña"
            autoComplete="new-password"
            className="w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-white outline-none focus:border-purple-500"
          />

          {/* Botón de envío: deshabilitado mientras procesa */}
          <button
            disabled={loading}
            className="w-full rounded-xl bg-[#6b2ad4] py-3 font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Verificando..." : "Cambiar contraseña"}
          </button>
        </form>

        {/* ── Botón de reenvío de código ──────────────────────────
            Se deshabilita si: está procesando un reenvío OR hay cooldown activo.
            El texto cambia según el estado:
            - "Reenviando..."                → reenvío en proceso
            - "Reenviar código en {N}s"      → cooldown activo, muestra cuenta regresiva
            - "¿No recibiste el correo?..."  → disponible para reenviar
        ── */}
        <div className="mt-4 text-center">
          <button
            type="button"
            disabled={resending || cooldown > 0}
            onClick={handleResendCode}
            className="text-sm text-purple-300 hover:underline disabled:opacity-50"
          >
            {resending
              ? "Reenviando..."
              : cooldown > 0
              ? `Reenviar código en ${cooldown}s`
              : "¿No recibiste el correo? Reenviar código"}
          </button>
        </div>

        {/* Mensaje de éxito o error (visible solo si hay mensaje) */}
        {message && <p className="mt-4 text-center text-sm text-zinc-300">{message}</p>}

        {/* Enlace para volver al login si el usuario recuerda su contraseña */}
        <Link href="/login" className="mt-5 block text-center text-sm text-purple-300 hover:underline">
          Volver al inicio de sesión
        </Link>
      </section>
    </main>
  )
}

/**
 * ResetPasswordPage
 * ──────────────────────────────────────────────────────────────
 * Componente exportado de la página. Envuelve ResetPasswordForm en
 * un Suspense boundary requerido por Next.js cuando se usa useSearchParams().
 * El fallback es null (pantalla en blanco mientras hidrata).
 */
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  )
}

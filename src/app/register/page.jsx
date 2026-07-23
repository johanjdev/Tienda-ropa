"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import Modal from "@/components/Modal"
import { normalizeIntValue } from "@/lib/number-fields"

export default function Register() {
  const [nombre, setNombre] = useState("")
  const [email, setEmail] = useState("")
  const [telefono, setTelefono] = useState("")
  const [direccion, setDireccion] = useState("")
  const [password, setPassword] = useState("")

  const [tiposDocumento, setTiposDocumento] = useState([])
  const [idTipoDocumento, setIdTipoDocumento] = useState("")
  const [documentoNumero, setDocumentoNumero] = useState("")
  const [tiposDocumentoError, setTiposDocumentoError] = useState("")

  const [loading, setLoading] = useState(false)

  const [infoOpen, setInfoOpen] = useState(false)
  const [infoTitle, setInfoTitle] = useState("")
  const [infoMessage, setInfoMessage] = useState("")
  const [infoVariant, setInfoVariant] = useState("success")

  const [errorOpen, setErrorOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const router = useRouter()

  useEffect(() => {
    let cancelled = false

    const loadTipos = async () => {
      try {
        const res = await fetch("/api/tipo-documento", {
          cache: "no-store",
        })

        const body = await res.json()

        console.log("Tipos documento:", body)

        if (!res.ok) {
          throw new Error(
            body.error || "No se pudieron cargar los tipos de documento."
          )
        }

        if (!cancelled) {
          const rows = Array.isArray(body.data) ? body.data : []
          setTiposDocumento(rows)
          setTiposDocumentoError(
            rows.length
              ? ""
              : "No hay tipos de documento disponibles. Revisa los datos o permisos de la tabla tipo_documento."
          )
        }
      } catch (error) {
        console.error("Error cargando tipos de documento:", error)
        if (!cancelled) {
          setTiposDocumento([])
          setTiposDocumentoError(
            error.message || "No se pudieron cargar los tipos de documento."
          )
        }
      }
    }

    void loadTipos()

    return () => {
      cancelled = true
    }
  }, [])

  const handleRegister = async (e) => {
    e.preventDefault()

    if (loading) return

    setLoading(true)

    const parsedTelefono = normalizeIntValue(telefono)
    const parsedDocumentoNumero = normalizeIntValue(documentoNumero)

    try {
      // =========================
      // CREAR USUARIO AUTH
      // =========================

      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: nombre,
            id_tipo_documento: idTipoDocumento
              ? Number(idTipoDocumento)
              : null,
            documento_numero: parsedDocumentoNumero,
          },
        },
      })

      if (authError) throw authError

      const user = data.user

      if (!user) {
        throw new Error(
          "No se pudo crear el usuario. Revisa si ya existe."
        )
      }

      // =========================
      // INSERTAR EN TABLA USUARIOS
      // =========================

      const { error: dbError } = await supabase
        .from("usuarios")
        .insert([
          {
            nombre,
            email,
            telefono: parsedTelefono,
            direccion,
            auth_id: user.id,
            id_rol: 1,

            // FK correcta
            id_tipo_documento: idTipoDocumento
              ? Number(idTipoDocumento)
              : null,

            // numero real documento
            documento_numero: parsedDocumentoNumero,
          },
        ])

      if (dbError) throw dbError

      // =========================
      // RESPUESTA
      // =========================

      if (data.session) {
        setInfoTitle("Registro exitoso")
        setInfoMessage(
          "Tu cuenta esta lista. Seras redirigido al inicio."
        )
        setInfoVariant("success")
        setInfoOpen(true)

        setTimeout(() => {
          router.push("/")
        }, 1500)
      } else {
        setInfoTitle("Revisa tu correo")
        setInfoMessage(
          "Te enviamos un enlace de confirmacion. Cuando lo actives, podras iniciar sesion."
        )
        setInfoVariant("info")
        setInfoOpen(true)

        setTimeout(() => {
          router.push("/login")
        }, 2000)
      }
    } catch (error) {
      console.error(error)

      setErrorMessage(
        error.message || "Error al registrarse"
      )

      setErrorOpen(true)
    } finally {
      setLoading(false)
    }
  }

  const fieldClass =
    "min-w-0 flex-1 bg-transparent p-3 text-white placeholder-zinc-600 outline-none"

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4 py-10">
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-zinc-950/80 p-7 shadow-2xl shadow-purple-950/20">

        <h2 className="mb-2 text-center text-2xl font-black text-white">
          Crear cuenta
        </h2>

        <p className="mb-6 text-center text-sm text-zinc-500">
          Completa tus datos para comprar mas rapido.
        </p>

        <form
          onSubmit={handleRegister}
          className="grid gap-4 md:grid-cols-2"
        >
          {/* NOMBRE */}
          <Field
            icon="ri-user-line"
            className="md:col-span-2"
          >
            <input
              className={fieldClass}
              placeholder="Nombre completo"
              value={nombre}
              required
              onChange={(e) =>
                setNombre(e.target.value)
              }
            />
          </Field>

          {/* EMAIL */}
          <Field icon="ri-mail-line">
            <input
              className={fieldClass}
              placeholder="Email"
              type="email"
              value={email}
              required
              onChange={(e) =>
                setEmail(e.target.value)
              }
            />
          </Field>

          {/* PASSWORD */}
          <Field icon="ri-lock-line">
            <input
              className={fieldClass}
              type="password"
              placeholder="Contrasena"
              value={password}
              required
              onChange={(e) =>
                setPassword(e.target.value)
              }
            />
          </Field>

          {/* TIPO DOCUMENTO */}
          <Field icon="ri-id-card-line">
            <select
              className={fieldClass}
              value={idTipoDocumento}
              required
              disabled={!tiposDocumento.length}
              onChange={(e) =>
                setIdTipoDocumento(e.target.value)
              }
            >
              <option
                className="bg-zinc-950"
                value=""
              >
                Tipo de documento
              </option>

              {tiposDocumento.map((tipo) => (
                <option
                  key={tipo.id_tipo_documento}
                  value={tipo.id_tipo_documento}
                  className="bg-zinc-950"
                >
                  {tipo.descripcion}
                </option>
              ))}
            </select>
          </Field>
          {tiposDocumentoError && (
            <p className="-mt-2 text-xs text-red-300 md:col-span-2">
              {tiposDocumentoError}
            </p>
          )}

          {/* NUMERO DOCUMENTO */}
          <Field icon="ri-hashtag">
            <input
              className={fieldClass}
              placeholder="Numero de documento"
              type="number"
              inputMode="numeric"
              min="0"
              value={documentoNumero}
              required
              onChange={(e) =>
                setDocumentoNumero(e.target.value)
              }
            />
          </Field>

          {/* TELEFONO */}
          <Field icon="ri-phone-line">
            <input
              className={fieldClass}
              placeholder="Telefono"
              type="number"
              inputMode="numeric"
              min="0"
              value={telefono}
              onChange={(e) =>
                setTelefono(e.target.value)
              }
            />
          </Field>

          {/* DIRECCION */}
          <Field icon="ri-map-pin-line">
            <input
              className={fieldClass}
              placeholder="Direccion"
              value={direccion}
              onChange={(e) =>
                setDireccion(e.target.value)
              }
            />
          </Field>

          {/* BOTON */}
          <button
            type="submit"
            disabled={loading}
            className={`md:col-span-2 rounded-xl py-3 font-medium transition ${
              loading
                ? "cursor-not-allowed bg-gray-400 text-gray-200"
                : "cursor-pointer bg-[#6b2ad4] text-white hover:bg-[#580096]"
            }`}
          >
            {loading
              ? "Procesando..."
              : "Registrarse"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-zinc-400">
          Ya tienes cuenta?{" "}
          <Link
            href="/login"
            className="text-[#B675FF] hover:underline"
          >
            Inicia sesion
          </Link>
        </p>
      </div>

      {/* MODAL INFO */}
      <Modal
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        title={infoTitle}
        variant={
          infoVariant === "success"
            ? "success"
            : "info"
        }
      >
        <p>{infoMessage}</p>
      </Modal>

      {/* MODAL ERROR */}
      <Modal
        open={errorOpen}
        onClose={() => setErrorOpen(false)}
        title="No se pudo registrar"
        variant="error"
      >
        <p>{errorMessage}</p>
      </Modal>
    </div>
  )
}

function Field({
  icon,
  className = "",
  children,
}) {
  return (
    <div
      className={`flex items-center rounded-xl border border-white/10 bg-black/50 px-3 focus-within:border-purple-500 ${className}`}
    >
      <i
        className={`${icon} text-zinc-500`}
        aria-hidden
      />

      {children}
    </div>
  )
}

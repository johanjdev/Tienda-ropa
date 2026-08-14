"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import Modal from "@/components/Modal"

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

  // ============================================================
  // CARGAR TIPOS DE DOCUMENTO
  // ============================================================

  useEffect(() => {
    let cancelled = false

    const loadTipos = async () => {
      try {
        const res = await fetch("/api/tipo-documento", {
          method: "POST",
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

  // ============================================================
  // SABER QUÉ TIPO DE DOCUMENTO ESTÁ SELECCIONADO
  // ============================================================

  const tipoDocumentoSeleccionado = tiposDocumento.find(
    (tipo) =>
      String(tipo.id_tipo_documento) === String(idTipoDocumento)
  )

  const descripcionTipoDocumento =
    tipoDocumentoSeleccionado?.descripcion?.toLowerCase() || ""

  const esCedula = descripcionTipoDocumento.includes("cedula")

  const esPasaporte =
    descripcionTipoDocumento.includes("pasaporte")

  // ============================================================
  // CAMBIO DEL TIPO DE DOCUMENTO
  // ============================================================

  const handleTipoDocumentoChange = (e) => {
    const nuevoTipo = e.target.value

    setIdTipoDocumento(nuevoTipo)

    // Limpiamos el número anterior cuando cambia el tipo.
    // Así evitamos que, por ejemplo, un valor de pasaporte
    // quede cuando el usuario cambia a cédula.
    setDocumentoNumero("")
  }

  // ============================================================
  // VALIDAR TELÉFONO
  // ============================================================

  const validarTelefono = (valor) => {
    // Si el teléfono está vacío, lo dejamos pasar porque
    // tu formulario original no lo tenía como required.
    if (!valor.trim()) {
      return null
    }

    // Exactamente 10 números
    if (!/^\d{10}$/.test(valor)) {
      return "El teléfono debe tener exactamente 10 dígitos."
    }

    // Celular colombiano: debe comenzar por 3
    if (!/^3\d{9}$/.test(valor)) {
      return "El teléfono debe tener 10 dígitos y comenzar por 3."
    }

    // Evita cosas como:
    // 1111111111
    // 2222222222
    // 9999999999
    if (/^(\d)\1{9}$/.test(valor)) {
      return "Ingresa un número de teléfono válido."
    }

    return null
  }

  // ============================================================
  // VALIDAR DOCUMENTO
  // ============================================================

  const validarDocumento = (valor) => {
    const documento = valor.trim().toUpperCase()

    if (!documento) {
      return "El número de documento es obligatorio."
    }

    // ----------------------------------------------------------
    // CÉDULA
    // ----------------------------------------------------------

    if (esCedula) {
      // Solo números
      if (!/^\d+$/.test(documento)) {
        return "La cédula solamente puede contener números."
      }

      // Entre 6 y 10 dígitos
      if (!/^\d{6,10}$/.test(documento)) {
        return "La cédula debe tener entre 6 y 10 dígitos."
      }

      // Evita:
      // 00000000
      // 11111111
      // 22222222
      // etc.
      if (/^(\d)\1+$/.test(documento)) {
        return "Ingresa un número de cédula válido."
      }

      return null
    }

    // ----------------------------------------------------------
    // PASAPORTE
    // ----------------------------------------------------------

    if (esPasaporte) {
      // Letras y números únicamente
      if (!/^[A-Z0-9]+$/i.test(documento)) {
        return "El pasaporte solamente puede contener letras y números."
      }

      // Entre 6 y 15 caracteres
      if (!/^[A-Z0-9]{6,15}$/i.test(documento)) {
        return "El pasaporte debe tener entre 6 y 15 caracteres."
      }

      return null
    }

    // ----------------------------------------------------------
    // SI NO SE PUDO DETERMINAR EL TIPO
    // ----------------------------------------------------------

    return "Selecciona un tipo de documento válido."
  }

  // ============================================================
  // REGISTRO
  // ============================================================

  const handleRegister = async (e) => {
    e.preventDefault()

    if (loading) return

    setLoading(true)

    try {
      // ========================================================
      // VALIDAR NOMBRE
      // ========================================================

      const nombreLimpio = nombre.trim()

      if (!nombreLimpio) {
        throw new Error("El nombre completo es obligatorio.")
      }

      if (nombreLimpio.length < 3) {
        throw new Error("El nombre debe tener al menos 3 caracteres.")
      }

      // ========================================================
      // VALIDAR TIPO DE DOCUMENTO
      // ========================================================

      if (!idTipoDocumento) {
        throw new Error("Selecciona un tipo de documento.")
      }

      if (!tipoDocumentoSeleccionado) {
        throw new Error("El tipo de documento seleccionado no es válido.")
      }

      // ========================================================
      // VALIDAR DOCUMENTO
      // ========================================================

      const documentoFinal = documentoNumero
        .trim()
        .toUpperCase()

      const errorDocumento = validarDocumento(documentoFinal)

      if (errorDocumento) {
        throw new Error(errorDocumento)
      }

      // ========================================================
      // VALIDAR TELÉFONO
      // ========================================================

      const telefonoFinal = telefono.trim()

      const errorTelefono = validarTelefono(telefonoFinal)

      if (errorTelefono) {
        throw new Error(errorTelefono)
      }

      // ========================================================
      // VALIDAR DIRECCIÓN
      // ========================================================

      const direccionFinal = direccion.trim()

      if (direccionFinal.length > 150) {
        throw new Error(
          "La dirección no puede superar los 150 caracteres."
        )
      }

      // ========================================================
      // CREAR USUARIO AUTH
      // ========================================================

      const { data, error: authError } =
        await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: nombreLimpio,

              id_tipo_documento: idTipoDocumento
                ? Number(idTipoDocumento)
                : null,

              documento_numero: documentoFinal,

              telefono: telefonoFinal || null,

              direccion: direccionFinal || null,
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

      // ========================================================
      // INSERTAR EN TABLA USUARIOS
      // ========================================================

      const { error: dbError } = await supabase
        .from("usuarios")
        .upsert(
          {
            nombre: nombreLimpio,

            email: email.trim(),

            // Ahora son TEXT, por eso NO usamos
            // normalizeIntValue().
            telefono: telefonoFinal || null,

            direccion: direccionFinal || null,

            auth_id: user.id,

            id_rol: 1,

            id_tipo_documento: idTipoDocumento
              ? Number(idTipoDocumento)
              : null,

            documento_numero: documentoFinal,
          },
          {
            onConflict: "email",
          }
        )

      if (dbError) throw dbError

      // ========================================================
      // RESPUESTA
      // ========================================================

      if (data.session) {
        setInfoTitle("Registro exitoso")

        setInfoMessage(
          "Tu cuenta esta lista. Seras redirigido al inicio."
        )

        setInfoVariant("success")

        setInfoOpen(true)

        const searchParams = new URLSearchParams(
          window.location.search
        )

        const redirectUrl =
          searchParams.get("redirect") || "/"

        setTimeout(() => {
          router.push(redirectUrl)
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

  // ============================================================
  // CLASE DE LOS CAMPOS
  // ============================================================

  const fieldClass =
    "min-w-0 flex-1 bg-transparent p-3 text-white placeholder-zinc-600 outline-none"

  // ============================================================
  // HTML
  // ============================================================

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

          {/* =====================================================
              NOMBRE
              ===================================================== */}

          <Field
            icon="ri-user-line"
            className="md:col-span-2"
          >
            <input
              className={fieldClass}
              placeholder="Nombre completo"
              type="text"
              maxLength={80}
              value={nombre}
              required
              onChange={(e) => {
                const value = e.target.value
                  .replace(
                    /[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g,
                    ""
                  )
                  .slice(0, 80)

                setNombre(value)
              }}
            />
          </Field>

          {/* =====================================================
              EMAIL
              ===================================================== */}

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

          {/* =====================================================
              PASSWORD
              ===================================================== */}

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

          {/* =====================================================
              TIPO DOCUMENTO
              ===================================================== */}

          <Field icon="ri-id-card-line">

            <select
              className={fieldClass}
              value={idTipoDocumento}
              required
              disabled={!tiposDocumento.length}
              onChange={handleTipoDocumentoChange}
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

          {/* =====================================================
              NUMERO DE DOCUMENTO
              ===================================================== */}

          <Field icon="ri-hashtag">

            <input
              className={fieldClass}
              placeholder={
                esPasaporte
                  ? "Numero de pasaporte"
                  : esCedula
                    ? "Numero de cedula"
                    : "Numero de documento"
              }
              type="text"
              value={documentoNumero}
              required
              maxLength={esPasaporte ? 15 : 10}
              autoCapitalize="characters"
              inputMode={
                esCedula
                  ? "numeric"
                  : "text"
              }
              disabled={!idTipoDocumento}
              onChange={(e) => {

                let value = e.target.value

                // ==================================================
                // CÉDULA
                // Solo números
                // ==================================================

                if (esCedula) {
                  value = value
                    .replace(/\D/g, "")
                    .slice(0, 10)
                }

                // ==================================================
                // PASAPORTE
                // Letras + números
                // ==================================================

                else if (esPasaporte) {
                  value = value
                    .replace(/[^a-zA-Z0-9]/g, "")
                    .slice(0, 15)
                    .toUpperCase()
                }

                // ==================================================
                // SI NO HAY TIPO SELECCIONADO
                // ==================================================

                else {
                  value = ""
                }

                setDocumentoNumero(value)
              }}
            />

          </Field>

          {/* =====================================================
              TELEFONO
              ===================================================== */}

          <Field icon="ri-phone-line">

            <input
              className={fieldClass}
              placeholder="Telefono"
              type="text"
              inputMode="numeric"
              maxLength={10}
              value={telefono}
              onChange={(e) => {

                const value = e.target.value
                  .replace(/\D/g, "")
                  .slice(0, 10)

                setTelefono(value)
              }}
            />

          </Field>

          {/* =====================================================
              DIRECCION
              ===================================================== */}

          <Field icon="ri-map-pin-line">

            <input
              className={fieldClass}
              placeholder="Direccion"
              type="text"
              maxLength={150}
              value={direccion}
              onChange={(e) => {

                const value = e.target.value
                  .slice(0, 150)

                setDireccion(value)
              }}
            />

          </Field>

          {/* =====================================================
              BOTON
              ===================================================== */}

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

        {/* =======================================================
            LOGIN
            ======================================================= */}

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

      {/* =========================================================
          MODAL INFO
          ========================================================= */}

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

      {/* =========================================================
          MODAL ERROR
          ========================================================= */}

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

// ============================================================
// COMPONENTE FIELD
// ============================================================

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
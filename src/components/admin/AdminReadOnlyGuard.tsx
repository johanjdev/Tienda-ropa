"use client"

import { useState, type KeyboardEvent, type MouseEvent, type ReactNode } from "react"
import Modal from "@/components/Modal"
import { useAuth } from "@/components/AuthProvider"

const READ_ONLY_MESSAGE = "No tienes permisos para modificar esta información. Solo un administrador puede crear, editar o eliminar registros."

/** Prevents role 3 from changing data in any admin screen, while keeping it fully navigable. */
export default function AdminReadOnlyGuard({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  const [open, setOpen] = useState(false)
  const isReadOnly = Number(profile?.id_rol) === 3

  const isWriteControl = (target: EventTarget | null) => {
    if (!(target instanceof Element)) return false
    // Error/confirmation dialogs rendered by a screen must remain dismissible.
    if (target.closest('[role="dialog"]')) return false
    return Boolean(target.closest("button, input, select, textarea"))
  }

  const block = (event: MouseEvent<HTMLDivElement> | KeyboardEvent<HTMLDivElement>) => {
    if (!isReadOnly || !isWriteControl(event.target)) return
    event.preventDefault()
    event.stopPropagation()
    setOpen(true)
  }

  return (
    <>
      <div onClickCapture={block} onKeyDownCapture={block} aria-readonly={isReadOnly}>
        {children}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Acceso de solo consulta" variant="info">
        <p>{READ_ONLY_MESSAGE}</p>
      </Modal>
    </>
  )
}

export function normalizeIntValue(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null

  if (typeof value === "number") {
    return Number.isFinite(value) && Number.isInteger(value) ? value : null
  }

  const trimmed = String(value).trim()
  if (!trimmed) return null

  const parsed = Number(trimmed)
  return Number.isFinite(parsed) && Number.isInteger(parsed) ? parsed : null
}

export function formatIntValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return ""
  return String(value)
}

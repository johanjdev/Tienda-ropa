import AdminShell from "@/components/admin/AdminShell"

export const metadata = {
  title: "Panel administrador | Arquetipo",
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>
}

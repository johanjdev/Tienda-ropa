"use client"

import AdminMobileNav from "./AdminMobileNav"
import AdminSidebar from "./AdminSidebar"

export default function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#06020d] text-zinc-100 relative">
      <div className="md:hidden relative z-40">
        <AdminMobileNav />
      </div>
      <AdminSidebar />
      <main className="flex-1 min-h-0 overflow-x-hidden">
        <div className="p-5 md:p-10 max-w-[1400px] mx-auto">{children}</div>
      </main>
    </div>
  )
}

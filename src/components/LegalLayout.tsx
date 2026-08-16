import Link from "next/link"

export default function LegalLayout({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: string; children: React.ReactNode }) {
  return <main className="min-h-screen bg-[#0a0a0a] px-4 py-12 text-white md:px-8"><div className="mx-auto max-w-4xl"><Link href="/" className="text-sm text-purple-300 hover:text-purple-200">← Volver a la tienda</Link><header className="mt-10 rounded-3xl border border-white/10 bg-gradient-to-br from-[#29104e] via-zinc-950 to-zinc-950 p-8 md:p-12"><p className="text-xs font-bold uppercase tracking-[.25em] text-purple-300">{eyebrow}</p><h1 className="mt-4 text-4xl font-black md:text-6xl">{title}</h1><p className="mt-5 max-w-2xl text-zinc-300">{intro}</p><p className="mt-7 text-xs text-zinc-500">Última actualización: 16 de agosto de 2026</p></header><article className="mt-8 rounded-3xl border border-white/10 bg-zinc-950 p-6 md:p-10">{children}</article></div></main>
}

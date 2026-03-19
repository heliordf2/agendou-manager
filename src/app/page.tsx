import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#f8f4eb_0%,#eee2cc_100%)] px-6 py-16">
      <section className="mx-auto max-w-2xl rounded-2xl border border-[#d8c8b0] bg-white/90 p-8 text-center shadow-[0_16px_40px_rgba(84,55,23,0.14)]">
        <h1 className="text-3xl font-semibold text-[#2f2520]">Painel Administrativo - Agendou</h1>
        <p className="mt-2 text-sm text-[#6d5d51]">
          Acesse rapidamente as áreas principais da aplicação.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <Button className="h-12 w-full bg-[#0f766e] text-white hover:bg-[#0d9488]" asChild>
            <Link href="/manager">Abrir Manager</Link>
          </Button>
          <Button className="h-12 w-full bg-[#1e3a8a] text-white hover:bg-[#1e40af]" asChild>
            <Link href="/database">Abrir Database</Link>
          </Button>
          <Button className="h-12 w-full bg-[#8a1e1e] text-white hover:bg-[#c95757]" variant="outline" asChild>
            <Link href="/storage">Abrir Storage</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}

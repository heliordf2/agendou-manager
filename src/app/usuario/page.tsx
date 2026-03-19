"use client";

import { ShieldCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function UsuarioPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [credential, setCredential] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const nextPath = searchParams.get("next") || "/";

  const handleSubmit = async () => {
    if (!credential.trim()) {
      toast.error("Informe o usuário para continuar");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/think", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ think: credential.trim(), next: nextPath }),
      });

      const payload = (await response.json()) as { error?: string; next?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Nao foi possivel validar o usuário");
      }

      toast.success("Acesso liberado");
      router.replace(payload.next || "/");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao validar o usuário");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f8f4eb_0%,#eee2cc_100%)] p-4 md:p-8">
      <div className="mx-auto max-w-md pt-20">
        <Card className="border-[#ddcdb6] bg-white/95 shadow-[0_10px_26px_rgba(84,55,23,0.12)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#3b2f2f]">
              <ShieldCheck className="h-5 w-5" />
              Proteção de Acesso
            </CardTitle>
            <p className="text-sm text-[#6a5c52]">
              Informe o usuário para liberar acesso às páginas.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              type="password"
              placeholder="Digite o usuário"
              value={credential}
              onChange={(event) => setCredential(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleSubmit();
                }
              }}
            />
            <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Validando..." : "Entrar"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function UsuarioPage() {
  return (
    <Suspense fallback={null}>
      <UsuarioPageContent />
    </Suspense>
  );
}

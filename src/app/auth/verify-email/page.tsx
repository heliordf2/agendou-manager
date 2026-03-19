"use client";

import { CheckCircle, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { CalendarPattern } from "@/components/calendar-pattern";
import { Button } from "@/components/ui/button";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Token de verificação não encontrado.");
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await fetch(`/api/auth/verify-email?token=${token}`);
        
        // Verificar se a resposta é JSON
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Resposta inválida do servidor");
        }
        
        const data = await response.json();

        if (response.ok) {
          setStatus("success");
          setMessage(data.message || "Email verificado com sucesso!");
          
          // Redirecionar para login após 3 segundos
          setTimeout(() => {
            router.push("/auth/login");
          }, 3000);
        } else {
          setStatus("error");
          setMessage(data.error || "Erro ao verificar email.");
        }
      } catch (error) {
        console.error("Erro na verificação:", error);
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Erro ao processar verificação. Tente novamente.");
      }
    };

    verifyEmail();
  }, [token, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#eefaf4] via-white to-[#e5f7ef] relative flex items-center justify-center">
      <CalendarPattern variant="dense" opacity="opacity-10" />
      <div className="w-full max-w-md mx-auto p-6 relative z-10">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            {status === "loading" && (
              <>
                <Loader2 className="w-16 h-16 text-[#374151] animate-spin mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Verificando Email
                </h1>
                <p className="text-gray-600">
                  Aguarde enquanto verificamos seu email...
                </p>
              </>
            )}

            {status === "success" && (
              <>
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Email Verificado!
                </h1>
                <p className="text-gray-600 mb-6">
                  {message}
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Redirecionando para o login em 3 segundos...
                </p>
                <Link href="/auth/login">
                  <Button className="w-full bg-gradient-to-br from-[#374151] to-[#4B5563] hover:from-[#1F2937] hover:to-[#374151]">
                    Ir para Login
                  </Button>
                </Link>
              </>
            )}

            {status === "error" && (
              <>
                <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Erro na Verificação
                </h1>
                <p className="text-gray-600 mb-6">
                  {message}
                </p>
                <div className="space-y-3">
                  <Link href="/auth/register">
                    <Button 
                      variant="outline" 
                      className="w-full"
                    >
                      Voltar para Cadastro
                    </Button>
                  </Link>
                  <Link href="/auth/login">
                    <Button className="w-full bg-gradient-to-br from-[#374151] to-[#4B5563] hover:from-[#1F2937] hover:to-[#374151]">
                      Ir para Login
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen background-page flex items-center justify-center relative">
        <CalendarPattern />
        <div className="relative z-10">
          <Loader2 className="w-8 h-8 animate-spin text-[#374151]" />
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}

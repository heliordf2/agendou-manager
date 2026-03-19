"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ChefHat, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { CalendarPattern } from "@/components/calendar-pattern";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const formSchema = z.object({
  email: z.string().email({
    message: "Digite um e-mail válido",
  }),
});

type FormSchema = z.infer<typeof formSchema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: FormSchema) => {
    try {
      setIsLoading(true);
      
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: data.email }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao enviar e-mail");
      }
      
      toast.success("E-mail enviado com sucesso! Verifique sua caixa de entrada.");
      setEmailSent(true);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Erro ao enviar e-mail. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0fdf4] relative p-4">
      <CalendarPattern variant="dense" opacity="opacity-10" />
      <div className="w-full max-w-md relative z-10">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#4ade80] to-[#16a34a] flex items-center justify-center mb-4">
              <ChefHat className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Recuperar Senha</h1>
            <p className="text-sm text-gray-600 mt-2 text-center">
              Digite seu e-mail para receber instruções de recuperação
            </p>
          </div>

          {!emailSent ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="seu@email.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-br from-[#374151] to-[#4B5563] hover:opacity-90"
                  disabled={isLoading}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enviar instruções
                </Button>
              </form>
            </Form>
          ) : (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p className="text-gray-700">
                Enviamos as instruções para recuperação de senha para o seu e-mail.
              </p>
              <p className="text-sm text-gray-500">
                Verifique sua caixa de entrada e spam.
              </p>
            </div>
          )}

          {/* Links */}
          <div className="mt-6 text-center space-y-2">
            <Link href="/auth/login" className="block text-sm text-[#374151] hover:underline">
              Voltar para login
            </Link>
            <Link href="/" className="block text-sm text-gray-600 hover:text-gray-900">
              ← Voltar para início
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

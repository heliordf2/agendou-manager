"use client";

import {
  Building2,
  Calendar,
  Eye,
  EyeOff,
  FileText,
  Lock,
  Mail,
  Phone,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { toast } from "sonner";

import { CalendarPattern } from "@/components/calendar-pattern";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const whatsNumber = (process.env.NEXT_PUBLIC_WHATS || "").replace(/\D/g, "");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendingEmail, setResendingEmail] = useState(false);

  // Ler plano da URL antes de inicializar o estado
  const planFromUrl = searchParams.get("plan");
  const initialPlan =
    planFromUrl && ["STARTER", "PRO", "PLUS"].includes(planFromUrl)
      ? planFromUrl
      : "STARTER";

  const [formData, setFormData] = useState({
    // Dados pessoais
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    // Dados do restaurante
    restaurantName: "",
    restaurantSlug: "",
    restaurantDescription: "",
    restaurantPhone: "",
    plan: initialPlan,
  });

  useEffect(() => {
    if (!showSuccessDialog || resendCooldown <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [showSuccessDialog, resendCooldown]);

  // Gerar slug automaticamente a partir do nome do restaurante
  const handleRestaurantNameChange = (value: string) => {
    setFormData({
      ...formData,
      restaurantName: value,
      restaurantSlug: value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove acentos
        .replace(/[^a-z0-9\s-]/g, "") // Remove caracteres especiais
        .replace(/\s+/g, "-") // Substitui espaços por hífens
        .replace(/-+/g, "-") // Remove hífens duplicados
        .trim(),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações
    if (formData.password !== formData.confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres");
      return;
    }

    if (!formData.restaurantName || !formData.restaurantSlug) {
      toast.error("Preencha os dados do restaurante");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          restaurantName: formData.restaurantName,
          restaurantSlug: formData.restaurantSlug,
          restaurantDescription: formData.restaurantDescription,
          restaurantPhone: formData.restaurantPhone,
          plan: formData.plan,
        }),
      });

      // Verificar se a resposta é JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Resposta inválida do servidor");
      }

      const data = await response.json();

      if (response.ok) {
        setRegisteredEmail(formData.email);
        setResendCooldown(60);
        setShowSuccessDialog(true);
      } else {
        toast.error(data.error || "Erro ao realizar cadastro");
      }
    } catch (error) {
      console.error("Erro ao registrar:", error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Erro ao processar cadastro. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!registeredEmail || resendCooldown > 0 || resendingEmail) {
      return;
    }

    setResendingEmail(true);

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: registeredEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Não foi possível reenviar o email");
        return;
      }

      toast.success("E-mail de confirmação reenviado com sucesso!");
      setResendCooldown(60);
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Erro ao reenviar email de confirmação");
      }
    } finally {
      setResendingEmail(false);
    }
  };

  const handleHelpClick = () => {
    if (!whatsNumber) {
      toast.error("Canal de ajuda indisponível no momento");
      return;
    }

    const helpMessage = encodeURIComponent(
      "Olá! Preciso de ajuda para ativar minha conta na paladar."
    );

    window.open(`https://wa.me/${whatsNumber}?text=${helpMessage}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-[#f0fdf4] relative flex items-center justify-center p-4 md:p-8">
      <CalendarPattern variant="dense" opacity="opacity-10" />
      <div className="w-full max-w-2xl relative z-10">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#374151] to-[#4B5563] flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Cadastre seu Restaurante
            </h1>
            <p className="text-gray-600 text-sm">
              Crie sua conta e comece a usar a paladar
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Seção de Dados Pessoais */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">
                Seus Dados
              </h3>

              {/* Nome */}
              <div>
                <Label htmlFor="name">Nome Completo</Label>
                <div className="relative mt-1">
                  <User className="pointer-events-none absolute left-8 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                    className="pl-16"
                    style={{ paddingLeft: "3.75rem" }}
                    placeholder="Digite seu nome completo"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <Label htmlFor="email">Email</Label>
                <div className="relative mt-1">
                  <Mail className="pointer-events-none absolute left-8 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                    className="pl-16"
                    style={{ paddingLeft: "3.75rem" }}
                    placeholder="seu@email.com"
                  />
                </div>
              </div>

              {/* Senha */}
              <div>
                <Label htmlFor="password">Senha</Label>
                <div className="relative mt-1">
                  <Lock className="pointer-events-none absolute left-8 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    required
                    className="pl-16 pr-14"
                    style={{ paddingLeft: "3.75rem", paddingRight: "3.5rem" }}
                    placeholder="Mínimo 6 caracteres"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirmar Senha */}
              <div>
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <div className="relative mt-1">
                  <Lock className="pointer-events-none absolute left-8 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        confirmPassword: e.target.value,
                      })
                    }
                    required
                    className="pl-16 pr-14"
                    style={{ paddingLeft: "3.75rem", paddingRight: "3.5rem" }}
                    placeholder="Repita sua senha"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Seção de Dados do Restaurante */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">
                Dados do Restaurante
              </h3>

              {/* Nome do Restaurante */}
              <div>
                <Label htmlFor="restaurantName">Nome do Restaurante</Label>
                <div className="relative mt-1">
                  <Building2 className="pointer-events-none absolute left-8 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="restaurantName"
                    type="text"
                    value={formData.restaurantName}
                    onChange={(e) => handleRestaurantNameChange(e.target.value)}
                    required
                    className="pl-16"
                    style={{ paddingLeft: "3.75rem" }}
                    placeholder="Ex: Clínica Vida Plena"
                  />
                </div>
              </div>

              {/* Slug (gerado automaticamente) */}
              <div>
                <Label htmlFor="restaurantSlug">
                  URL do Restaurante
                  <span className="text-xs text-gray-500 ml-2">
                    (gerado automaticamente)
                  </span>
                </Label>
                <div className="relative mt-1">
                  <Input
                    id="restaurantSlug"
                    type="text"
                    value={formData.restaurantSlug}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        restaurantSlug: e.target.value,
                      })
                    }
                    required
                    className="font-mono text-sm"
                    placeholder="pizzaria-bella-vista"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Seu restaurante estará em: /
                  {formData.restaurantSlug || "seu-slug"}
                </p>
              </div>

              {/* Descrição */}
              <div>
                <Label htmlFor="restaurantDescription">
                  Descrição{" "}
                  <span className="text-xs text-gray-500">(opcional)</span>
                </Label>
                <div className="relative mt-1">
                  <FileText className="pointer-events-none absolute left-8 top-3 w-5 h-5 text-gray-400" />
                  <textarea
                    id="restaurantDescription"
                    value={formData.restaurantDescription}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        restaurantDescription: e.target.value,
                      })
                    }
                    className="w-full pl-16 pr-6 py-3 text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#374151] focus:border-transparent resize-y min-h-[110px]"
                    style={{ paddingLeft: "3.75rem", paddingRight: "1.5rem" }}
                    placeholder="Descreva seu restaurante..."
                  />
                </div>
              </div>

              {/* Telefone */}
              <div>
                <Label htmlFor="restaurantPhone">
                  Telefone/WhatsApp{" "}
                  <span className="text-xs text-gray-500">(opcional)</span>
                </Label>
                <div className="relative mt-1">
                  <Phone className="pointer-events-none absolute left-8 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="restaurantPhone"
                    type="tel"
                    value={formData.restaurantPhone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        restaurantPhone: e.target.value,
                      })
                    }
                    className="pl-16"
                    style={{ paddingLeft: "3.75rem" }}
                    placeholder="(11) 98765-4321"
                  />
                </div>
              </div>

              {/* Plano */}
              <div>
                <Label htmlFor="plan">Plano</Label>
                <Select
                  value={formData.plan}
                  onValueChange={(value) =>
                    setFormData({ ...formData, plan: value })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione um plano" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STARTER">
                      Starter - R$ 29,90/mês
                    </SelectItem>
                    <SelectItem value="PRO">
                      Pro - R$ 79,90/mês (Mais popular)
                    </SelectItem>
                    <SelectItem value="PLUS">Plus - R$ 160,00/mês</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Você poderá alterar seu plano posteriormente
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-br from-[#374151] to-[#4B5563] hover:from-[#1F2937] hover:to-[#374151] text-white"
            >
              {loading ? "Cadastrando..." : "Criar Conta"}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center text-sm">
            <span className="text-gray-600">Já tem uma conta? </span>
            <Link
              href="/auth/login"
              className="text-[#374151] hover:underline font-medium"
            >
              Fazer login
            </Link>
          </div>
        </div>
      </div>

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="h-auto max-h-[90vh] w-[calc(100vw-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Conta criada com sucesso!</DialogTitle>
            <DialogDescription>
              Enviamos um e-mail de confirmação para <strong>{registeredEmail}</strong>. Para ativar sua conta, confirme o e-mail antes de fazer login.
            </DialogDescription>
            <p className="text-sm text-muted-foreground">
              Seja bem-vindo à paladar! Confirme seu e-mail para ativar sua conta e começar a usar todos os recursos.
            </p>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <div className="grid w-full grid-cols-1 sm:grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleResendVerification}
                disabled={resendingEmail || resendCooldown > 0}
                className="w-full"
              >
                {resendingEmail
                  ? "Reenviando..."
                  : resendCooldown > 0
                    ? `Reenviar em ${resendCooldown}s`
                    : "Reenviar e-mail"}
              </Button>

              <Button
                type="button"
                onClick={() => router.push("/auth/login?registered=true")}
                className="w-full bg-gradient-to-br from-[#374151] to-[#4B5563] hover:from-[#1F2937] hover:to-[#374151] text-white"
              >
                Ir para login
              </Button>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleHelpClick}
              className="w-full inline-flex items-center justify-center gap-2"
            >
              Preciso de ajuda
              <FaWhatsapp className="h-4 w-4 text-green-500" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando...</p>
          </div>
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}

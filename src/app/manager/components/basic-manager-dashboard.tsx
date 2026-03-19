"use client";

import { Lock, LockOpen, Pencil, Save, Search, Settings2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type BasicPayload = {
  comercio: {
    id: string;
    name: string;
    slug: string;
    phone: string;
    ativo: boolean;
    plano: string;
  };
  user: {
    id: string;
    email: string;
    emailVerified: boolean;
  } | null;
  comercios: Array<{
    id: string;
    name: string;
    slug: string;
    ativo: boolean;
    plano: string;
  }>;
};

const defaultForm = {
  name: "",
  slug: "",
  phone: "",
  ativo: false,
  plano: "Starter",
  email: "",
  emailVerified: false,
  newPassword: "",
  confirmPassword: "",
};

export default function BasicManagerDashboard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingComercioId, setTogglingComercioId] = useState<string | null>(null);
  const [selectedComercioId, setSelectedComercioId] = useState<string>("");
  const [comercios, setComercios] = useState<BasicPayload["comercios"]>([]);
  const [comercioQuery, setComercioQuery] = useState("");
  const [selectedHasUser, setSelectedHasUser] = useState(true);
  const [form, setForm] = useState(defaultForm);

  const filteredComercios = useMemo(() => {
    const normalized = comercioQuery.trim().toLowerCase();

    if (!normalized) {
      return comercios;
    }

    return comercios.filter((comercio) => comercio.name.toLowerCase().includes(normalized));
  }, [comercioQuery, comercios]);

  const loadData = useCallback(async (comercioId?: string) => {
    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (comercioId) {
        params.set("comercioId", comercioId);
      }

      const response = await fetch(`/api/manager/basic${params.toString() ? `?${params.toString()}` : ""}`);
      if (!response.ok) {
        throw new Error("Não foi possível carregar dados básicos");
      }

      const payload = (await response.json()) as BasicPayload;
      setComercios(payload.comercios ?? []);
      setSelectedComercioId(payload.comercio.id);
      setSelectedHasUser(Boolean(payload.user));

      setForm((prev) => ({
        ...prev,
        name: payload.comercio.name ?? "",
        slug: payload.comercio.slug ?? "",
        phone: payload.comercio.phone ?? "",
        ativo: payload.comercio.ativo,
        plano: payload.comercio.plano,
        email: payload.user?.email ?? "",
        emailVerified: payload.user?.emailVerified ?? false,
        newPassword: "",
        confirmPassword: "",
      }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectComercio = (comercioId: string) => {
    setSelectedComercioId(comercioId);
    void loadData(comercioId);

    if (typeof document !== "undefined") {
      document.getElementById("manager-edit-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleReload = () => {
    void loadData(selectedComercioId || undefined);
  };

  const handleSave = async () => {
    if (form.newPassword || form.confirmPassword) {
      if (form.newPassword.length < 6) {
        toast.error("A nova senha deve ter no mínimo 6 caracteres");
        return;
      }

      if (form.newPassword !== form.confirmPassword) {
        toast.error("Confirmação de senha não confere");
        return;
      }
    }

    setSaving(true);

    try {
      const response = await fetch("/api/manager/basic", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comercioId: selectedComercioId,
          comercio: {
            name: form.name,
            slug: form.slug,
            phone: form.phone,
            ativo: form.ativo,
            plano: form.plano,
          },
          user: selectedHasUser
            ? {
                email: form.email,
                emailVerified: form.emailVerified,
              }
            : undefined,
          newPassword: form.newPassword.trim() || undefined,
        }),
      });

      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error || "Erro ao salvar");
      }

      toast.success("Dados atualizados com sucesso");
      setForm((prev) => ({ ...prev, newPassword: "", confirmPassword: "" }));
      await loadData(selectedComercioId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar dados");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAtivo = async (comercio: BasicPayload["comercios"][number]) => {
    setTogglingComercioId(comercio.id);

    try {
      const response = await fetch("/api/manager/basic", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comercioId: comercio.id,
          comercio: {
            ativo: !comercio.ativo,
          },
        }),
      });

      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error || "Erro ao alterar status");
      }

      const nextAtivo = !comercio.ativo;
      setComercios((prev) =>
        prev.map((item) => (item.id === comercio.id ? { ...item, ativo: nextAtivo } : item))
      );

      if (selectedComercioId === comercio.id) {
        setForm((prev) => ({ ...prev, ativo: nextAtivo }));
      }

      toast.success(nextAtivo ? "Estabelecimento ativado" : "Estabelecimento desativado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao alterar status");
    } finally {
      setTogglingComercioId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f0fdf4_0%,#dcfce7_100%)] p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <Card className="border-[#bbf7d0] bg-white/90 shadow-[0_14px_42px_rgba(22,163,74,0.12)] backdrop-blur">
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2 text-[#3b2f2f]">
                <Settings2 className="h-5 w-5" />
                Manager - Gestão Básica
              </CardTitle>
              <p className="mt-1 text-sm text-[#6a5c52]">
                Gerencie dados principais do comércio e da conta de acesso.
              </p>
            </div>
          </CardHeader>
        </Card>

        <Card className="border-[#bbf7d0] bg-white/95 shadow-[0_10px_26px_rgba(22,163,74,0.10)]">
          <CardHeader>
            <CardTitle className="text-base text-[#3b2f2f]">Estabelecimentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#8f7a67]">Buscar estabelecimento</p>
              <div className="relative mb-3">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8f7a67]" />
                <Input
                  value={comercioQuery}
                  onChange={(event) => setComercioQuery(event.target.value)}
                  placeholder="Buscar comércio por nome"
                  className="pl-11"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-[#bbf7d0]">
              <table className="min-w-full divide-y divide-[#dcfce7] text-sm">
                <thead className="bg-[#ecfdf5]">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-[#166534]">Nome</th>
                    <th className="px-3 py-2 text-left font-semibold text-[#166534]">Plano</th>
                    <th className="px-3 py-2 text-left font-semibold text-[#166534]">Status</th>
                    <th className="px-3 py-2 text-right font-semibold text-[#166534]">Acoes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dcfce7] bg-white">
                  {filteredComercios.length ? (
                    filteredComercios.map((comercio) => {
                      const isSelected = comercio.id === selectedComercioId;
                      const isToggling = togglingComercioId === comercio.id;

                      return (
                        <tr
                          key={comercio.id}
                          className={isSelected ? "bg-[#ecfdf5]" : "hover:bg-[#f0fdf4]"}
                        >
                          <td className="px-3 py-2 font-medium text-[#14532d]">{comercio.name}</td>
                          <td className="px-3 py-2 text-[#166534]">{comercio.plano}</td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
                                comercio.ativo
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {comercio.ativo ? "Ativo (true)" : "Inativo (false)"}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSelectComercio(comercio.id)}
                                className="border-[#86efac]"
                              >
                                <Pencil className="h-4 w-4" /> Editar
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                disabled={isToggling || loading || saving}
                                onClick={() => void handleToggleAtivo(comercio)}
                                className={
                                  comercio.ativo
                                    ? "border-emerald-500 text-emerald-700 hover:bg-emerald-50"
                                    : "border-red-500 text-red-700 hover:bg-red-50"
                                }
                                title={comercio.ativo ? "Desativar estabelecimento" : "Ativar estabelecimento"}
                              >
                                {comercio.ativo ? (
                                  <LockOpen className="h-4 w-4" />
                                ) : (
                                  <Lock className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-[#166534]">
                        Nenhum estabelecimento encontrado para o filtro informado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card id="manager-edit-form" className="border-[#bbf7d0] bg-white/95 shadow-[0_10px_26px_rgba(22,163,74,0.10)]">
          <CardHeader>
            <CardTitle className="text-base text-[#3b2f2f]">Dados principais</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#8f7a67]">Comercio selecionado</p>
              <Input value={form.name} disabled />
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#8f7a67]">Nome do comércio</p>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#8f7a67]">Slug</p>
              <Input value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} />
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#8f7a67]">Telefone</p>
              <Input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#8f7a67]">Ativo</p>
              <Select
                value={form.ativo ? "true" : "false"}
                onValueChange={(value) => setForm((p) => ({ ...p, ativo: value === "true" }))}
              >
                <SelectTrigger className="border-[#86efac] bg-[#f0fdf4]">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="border-[#86efac] bg-[#f0fdf4]">
                  <SelectItem value="true">true</SelectItem>
                  <SelectItem value="false">false</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#8f7a67]">Plano</p>
              <Input
                value={form.plano}
                onChange={(e) => setForm((p) => ({ ...p, plano: e.target.value }))}
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#8f7a67]">Email</p>
              <Input
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                disabled={!selectedHasUser}
                placeholder={selectedHasUser ? "" : "Comércio sem usuário vinculado"}
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#8f7a67]">Email verificado</p>
              <Select
                value={form.emailVerified ? "true" : "false"}
                onValueChange={(value) =>
                  setForm((p) => ({ ...p, emailVerified: value === "true" }))
                }
                disabled={!selectedHasUser}
              >
                <SelectTrigger className="border-[#86efac] bg-[#f0fdf4]">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="border-[#86efac] bg-[#f0fdf4]">
                  <SelectItem value="true">true</SelectItem>
                  <SelectItem value="false">false</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#bbf7d0] bg-white/95 shadow-[0_10px_26px_rgba(22,163,74,0.10)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-[#3b2f2f]">
              <Lock className="h-4 w-4" />
              Alterar senha
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#8f7a67]">Nova senha</p>
              <Input
                type="password"
                value={form.newPassword}
                onChange={(e) => setForm((p) => ({ ...p, newPassword: e.target.value }))}
                disabled={!selectedHasUser}
              />
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#8f7a67]">Confirmar nova senha</p>
              <Input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                disabled={!selectedHasUser}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={handleSave} disabled={loading || saving} className="w-full sm:w-auto">
            <Save className="h-4 w-4" /> Salvar alterações
          </Button>
          <Button
            variant="outline"
            onClick={handleReload}
            disabled={loading || saving}
            className="w-full sm:w-auto"
          >
            Recarregar dados
          </Button>
        </div>
      </div>
    </div>
  );
}

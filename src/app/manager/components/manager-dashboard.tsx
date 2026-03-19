"use client";

import {
  Columns3,
  Database,
  Download,
  ExternalLink,
  Eye,
  FileJson,
  Files,
  FileSpreadsheet,
  FileText,
  ImageOff,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type ManagerFieldInfo = {
  name: string;
  type: string;
  kind: "scalar" | "enum" | "object";
  isRequired: boolean;
  hasDefaultValue: boolean;
  isList: boolean;
  isId: boolean;
  isReadOnly: boolean;
  isUpdatedAt: boolean;
};

type ManagerModelInfo = {
  name: string;
  dbName: string;
  primaryKey: string[];
  fields: ManagerFieldInfo[];
};

type ModelsResponse = {
  models: ManagerModelInfo[];
};

type RecordsResponse = {
  records: Record<string, unknown>[];
  total: number;
};

type DeleteImpactResponse = {
  impact: {
    model: string;
    summary: string;
    counts: Record<string, number>;
  };
};

type Props = {
  panelTitle?: string;
  allowCreate?: boolean;
};

const PAGE_SIZE = 25;
const IMAGE_FIELD_NAME_REGEX = /(image|imagem|avatar|cover|logo|photo|foto|banner|thumb)/i;

const TABLE_PRIORITY_REGEX_LIST: RegExp[] = [
  /name|nome|title|titulo/i,
  /slug/i,
  /email/i,
  /phone|telefone|cel/i,
  /status|ativo|active|plan/i,
  /price|preco|total|amount|valor/i,
  /createdat|updatedat|date|data/i,
  IMAGE_FIELD_NAME_REGEX,
];

function hasImageExtension(pathname: string): boolean {
  return /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(pathname);
}

function isLikelyUrlOrImagePath(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  if (trimmed.startsWith("data:image/")) {
    return true;
  }

  return (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/")
  );
}

function isImageString(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  if (trimmed.startsWith("data:image/")) {
    return true;
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const parsed = new URL(trimmed);
      return hasImageExtension(parsed.pathname);
    } catch {
      return false;
    }
  }

  if (trimmed.startsWith("/")) {
    const cleanPath = trimmed.split("?")[0]?.split("#")[0] ?? trimmed;
    return hasImageExtension(cleanPath);
  }

  return false;
}

function shouldRenderImage(fieldName: string, value: unknown): value is string {
  if (IMAGE_FIELD_NAME_REGEX.test(fieldName)) {
    return isLikelyUrlOrImagePath(value);
  }

  return isImageString(value);
}

function ImageThumbnail({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border border-dashed border-[#d7c7b1] bg-[#f7f0e6] ${className ?? "h-10 w-10"}`}
        title="Imagem indisponível"
      >
        <ImageOff className="h-4 w-4 text-[#8a7358]" />
      </div>
    );
  }

  return (
    <a
      href={src}
      target="_blank"
      rel="noreferrer"
      className={`group relative block overflow-hidden rounded-lg border border-[#d7c7b1] bg-[#f7f0e6] ${className ?? "h-10 w-10"}`}
      title="Abrir imagem"
    >
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
        loading="lazy"
        onError={() => setHasError(true)}
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-200 group-hover:bg-black/25">
        <ExternalLink className="h-3.5 w-3.5 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
      </div>
    </a>
  );
}

function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

function normalizeFormValue(
  raw: string,
  field: ManagerFieldInfo
): string | null {
  const trimmed = raw.trim();

  if (field.type === "Boolean") {
    if (!trimmed && !field.isRequired) {
      return null;
    }

    return trimmed.toLowerCase() === "true" ? "true" : "false";
  }

  if (!trimmed && !field.isRequired) {
    return null;
  }

  return raw;
}

export default function ManagerDashboard({
  panelTitle = "Painel Database",
  allowCreate = true,
}: Props) {
  const [models, setModels] = useState<ManagerModelInfo[]>([]);
  const [selectedModelName, setSelectedModelName] = useState<string>("");
  const [records, setRecords] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsRecord, setDetailsRecord] = useState<Record<string, unknown> | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Record<string, unknown> | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [createData, setCreateData] = useState<Record<string, string>>({});
  const [columnsDialogOpen, setColumnsDialogOpen] = useState(false);
  const [columnsByModel, setColumnsByModel] = useState<Record<string, string[]>>({});

  const selectedModel = useMemo(
    () => models.find((model) => model.name === selectedModelName) ?? null,
    [models, selectedModelName]
  );

  const visibleFields = useMemo(() => {
    if (!selectedModel) {
      return [] as ManagerFieldInfo[];
    }

    return selectedModel.fields.filter(
      (field) => field.kind === "scalar" || field.kind === "enum"
    );
  }, [selectedModel]);

  const editableFields = useMemo(
    () =>
      visibleFields.filter(
        (field) => !field.isId && !field.isReadOnly && !field.isUpdatedAt
      ),
    [visibleFields]
  );

  const recommendedTableFields = useMemo(() => {
    const scoreField = (field: ManagerFieldInfo): number => {
      for (let i = 0; i < TABLE_PRIORITY_REGEX_LIST.length; i += 1) {
        if (TABLE_PRIORITY_REGEX_LIST[i].test(field.name)) {
          return 100 - i;
        }
      }
      return 10;
    };

    return [...visibleFields]
      .filter((field) => !field.isId)
      .sort((a, b) => {
        const scoreDiff = scoreField(b) - scoreField(a);
        if (scoreDiff !== 0) {
          return scoreDiff;
        }
        return a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" });
      })
      .slice(0, 6);
  }, [visibleFields]);

  useEffect(() => {
    if (!selectedModelName || !visibleFields.length) {
      return;
    }

    setColumnsByModel((prev) => {
      if (prev[selectedModelName]?.length) {
        return prev;
      }

      return {
        ...prev,
        [selectedModelName]: recommendedTableFields.map((field) => field.name),
      };
    });
  }, [recommendedTableFields, selectedModelName, visibleFields]);

  const tableFields = useMemo(() => {
    const selected = columnsByModel[selectedModelName] ?? [];

    if (!selected.length) {
      return recommendedTableFields;
    }

    const set = new Set(selected);
    const fields = visibleFields.filter((field) => set.has(field.name));

    if (!fields.length) {
      return recommendedTableFields;
    }

    return fields;
  }, [columnsByModel, recommendedTableFields, selectedModelName, visibleFields]);

  const toggleTableColumn = (fieldName: string) => {
    if (!selectedModelName) {
      return;
    }

    setColumnsByModel((prev) => {
      const current = prev[selectedModelName] ?? recommendedTableFields.map((field) => field.name);
      const hasField = current.includes(fieldName);

      if (hasField && current.length === 1) {
        toast.info("Mantenha pelo menos uma coluna visível");
        return prev;
      }

      const next = hasField
        ? current.filter((name) => name !== fieldName)
        : [...current, fieldName];

      return {
        ...prev,
        [selectedModelName]: next,
      };
    });
  };

  const creatableFields = useMemo(
    () =>
      visibleFields.filter((field) => {
        if (field.isReadOnly || field.isUpdatedAt) {
          return false;
        }

        if (field.isId && field.hasDefaultValue) {
          return false;
        }

        return true;
      }),
    [visibleFields]
  );

  const loadModels = useCallback(async () => {
    const response = await fetch("/api/manager/models");

    if (!response.ok) {
      throw new Error("Não foi possível carregar os modelos");
    }

    const payload = (await response.json()) as ModelsResponse;
    setModels(payload.models);

    if (!selectedModelName && payload.models.length) {
      setSelectedModelName(payload.models[0].name);
    }
  }, [selectedModelName]);

  const loadRecords = useCallback(async () => {
    if (!selectedModelName) {
      return;
    }

    setLoading(true);

    try {
      const params = new URLSearchParams({
        model: selectedModelName,
        limit: String(PAGE_SIZE),
        offset: String(offset),
      });

      const response = await fetch(`/api/manager/records?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Não foi possível carregar os registros");
      }

      const payload = (await response.json()) as RecordsResponse;
      setRecords(payload.records);
      setTotal(payload.total);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [offset, selectedModelName]);

  useEffect(() => {
    loadModels().catch((error) => {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar modelos");
    });
  }, [loadModels]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const maxPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  const buildPkFromRecord = useCallback(
    (record: Record<string, unknown>): Record<string, unknown> => {
      if (!selectedModel) {
        throw new Error("Modelo não selecionado");
      }

      return Object.fromEntries(
        selectedModel.primaryKey.map((field) => [field, record[field]])
      );
    },
    [selectedModel]
  );

  const openDetails = (record: Record<string, unknown>) => {
    setDetailsRecord(record);
    setDetailsOpen(true);
  };

  const openEdit = (record: Record<string, unknown>) => {
    setEditRecord(record);

    const nextForm: Record<string, string> = {};
    editableFields.forEach((field) => {
      nextForm[field.name] = stringifyValue(record[field.name]);
    });

    setFormData(nextForm);
    setEditOpen(true);
  };

  const handleDelete = async (record: Record<string, unknown>) => {
    if (!selectedModel) {
      return;
    }

    let confirmationText = `Deseja excluir este registro de ${selectedModel.name}? Essa ação não pode ser desfeita.`;

    try {
      const impactResponse = await fetch("/api/manager/delete-impact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: selectedModel.name,
          pk: buildPkFromRecord(record),
        }),
      });

      if (impactResponse.ok) {
        const payload = (await impactResponse.json()) as DeleteImpactResponse;
        const details = Object.entries(payload.impact.counts)
          .filter(([, value]) => value > 0)
          .map(([table, value]) => `${table}: ${value}`)
          .join("\n");

        if (details) {
          confirmationText = `${confirmationText}\n\nImpacto estimado:\n${details}`;
        }
      }
    } catch {
      // Se a análise falhar, mantém o fluxo de exclusão com confirmação padrão.
    }

    const confirmation = window.confirm(confirmationText);

    if (!confirmation) {
      return;
    }

    try {
      const response = await fetch("/api/manager/records", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: selectedModel.name,
          pk: buildPkFromRecord(record),
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Não foi possível excluir o registro");
      }

      toast.success("Registro excluído com sucesso");
      await loadRecords();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir registro");
    }
  };

  const submitEdit = async () => {
    if (!selectedModel || !editRecord) {
      return;
    }

    const data: Record<string, unknown> = {};

    editableFields.forEach((field) => {
      const rawValue = formData[field.name] ?? "";
      const normalizedCurrent = normalizeFormValue(rawValue, field);
      const originalRaw = stringifyValue(editRecord[field.name]);
      const normalizedOriginal = normalizeFormValue(originalRaw, field);

      if (JSON.stringify(normalizedCurrent) !== JSON.stringify(normalizedOriginal)) {
        data[field.name] = normalizedCurrent;
      }
    });

    if (!Object.keys(data).length) {
      toast.info("Nenhuma alteração para salvar");
      return;
    }

    try {
      const response = await fetch("/api/manager/records", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: selectedModel.name,
          pk: buildPkFromRecord(editRecord),
          data,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Não foi possível atualizar o registro");
      }

      toast.success("Registro atualizado com sucesso");
      setEditOpen(false);
      await loadRecords();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar registro");
    }
  };

  const openCreate = () => {
    const nextForm: Record<string, string> = {};
    creatableFields.forEach((field) => {
      nextForm[field.name] = "";
    });
    setCreateData(nextForm);
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    if (!selectedModel) {
      return;
    }

    const data: Record<string, unknown> = {};

    creatableFields.forEach((field) => {
      const rawValue = createData[field.name] ?? "";
      const normalized = normalizeFormValue(rawValue, field);
      if (normalized !== null && normalized !== "") {
        data[field.name] = normalized;
      }
    });

    try {
      const response = await fetch("/api/manager/records", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: selectedModel.name,
          data,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Não foi possível criar o registro");
      }

      toast.success("Registro criado com sucesso");
      setCreateOpen(false);
      await loadRecords();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar registro");
    }
  };

  const triggerBackup = (format: "json" | "csv" | "xls", fullDatabase: boolean) => {
    const params = new URLSearchParams({ format });

    if (!fullDatabase && selectedModelName) {
      params.set("model", selectedModelName);
    }

    window.open(`/api/manager/backup?${params.toString()}`, "_blank");
  };

  const goToPage = (nextPage: number) => {
    const safePage = Math.max(1, Math.min(maxPage, nextPage));
    setOffset((safePage - 1) * PAGE_SIZE);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff6e7_0%,#f4ecde_40%,#efe3d0_100%)] p-4 md:p-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <Card className="border-[#ddcdb6] bg-white/85 shadow-[0_14px_42px_rgba(84,55,23,0.12)] backdrop-blur">
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-[#3b2f2f]">
                <Database className="h-5 w-5" />
                {panelTitle}
              </CardTitle>
              <p className="mt-1 text-sm text-[#6a5c52]">
                Olá, Administrador. Gerencie tabelas, imagens e backups do banco de dados.
              </p>
            </div>
            {allowCreate ? (
              <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-3">
                <Button
                  className="w-full bg-[#cd3b3b] text-white hover:bg-[#2d3c6d] sm:w-auto"
                  asChild
                >
                  <Link href="/storage">
                    <Files className="h-4 w-4" /> Storage
                  </Link>
                </Button>
                <Button className="w-full sm:w-auto" onClick={openCreate} disabled={!selectedModelName}>
                  <Plus className="h-4 w-4" /> Novo registro
                </Button>
                <Button variant="outline" className="w-full sm:w-auto" asChild>
                  <Link href="/">Voltar ao Início</Link>
                </Button>
              </div>
            ) : null}
          </CardHeader>
        </Card>

        <Card className="border-[#ddcdb6] bg-gradient-to-br from-white to-[#f9f3e9] shadow-[0_10px_30px_rgba(84,55,23,0.10)]">
          <CardHeader className="space-y-3">
            <CardTitle className="text-base text-[#3b2f2f]">Ações e Backups</CardTitle>
            <p className="text-sm text-[#6f5f52]">
              Selecione a tabela para operar no grid e use os backups para exportar dados da tabela atual ou do banco completo.
            </p>
            <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
              <div className="space-y-2 rounded-xl border border-[#e4d4c2] bg-white/90 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8f7a67]">Tabela</p>
                <Select
                  value={selectedModelName}
                  onValueChange={(value) => {
                    setSelectedModelName(value);
                    setOffset(0);
                  }}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Selecione uma tabela" />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((model) => (
                      <SelectItem key={model.name} value={model.name}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 rounded-xl border border-[#e4d4c2] bg-white/90 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8f7a67]">Backup da tabela atual</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <Button variant="outline" className="w-full" onClick={() => triggerBackup("json", false)}>
                    <FileJson className="h-4 w-4" /> JSON
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => triggerBackup("csv", false)}>
                    <FileText className="h-4 w-4" /> CSV
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => triggerBackup("xls", false)}>
                    <FileSpreadsheet className="h-4 w-4" /> XLS
                  </Button>
                </div>
              </div>

              <div className="space-y-2 rounded-xl border border-[#e4d4c2] bg-white/90 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8f7a67]">Backup completo do banco</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <Button className="w-full" onClick={() => triggerBackup("json", true)}>
                    <Download className="h-4 w-4" /> JSON
                  </Button>
                  <Button className="w-full" onClick={() => triggerBackup("csv", true)}>
                    <Download className="h-4 w-4" /> CSV
                  </Button>
                  <Button className="w-full" onClick={() => triggerBackup("xls", true)}>
                    <Download className="h-4 w-4" /> XLS
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="border-[#ddcdb6] bg-white/95 shadow-[0_10px_26px_rgba(84,55,23,0.08)]">
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base text-[#3b2f2f]">
                {selectedModelName ? `Registros de ${selectedModelName}` : "Selecione uma tabela"}
              </CardTitle>
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                disabled={!selectedModelName || !visibleFields.length}
                onClick={() => setColumnsDialogOpen(true)}
              >
                <Columns3 className="h-4 w-4" /> Colunas
              </Button>
            </div>
            <p className="text-sm text-[#6a5c52]">
              Total de registros: {total} | Página {currentPage} de {maxPage}
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-xl border border-[#e5d6c3] bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-[#efe1ce] text-left text-[#4f3f33]">
                  <tr>
                    {tableFields.map((field) => (
                      <th key={field.name} className="px-3 py-2.5 font-semibold">
                        {field.name}
                      </th>
                    ))}
                    <th className="px-3 py-2.5 font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td className="px-3 py-6 text-center text-[#6a5c52]" colSpan={tableFields.length + 1}>
                        Carregando registros...
                      </td>
                    </tr>
                  ) : records.length === 0 ? (
                    <tr>
                      <td className="px-3 py-6 text-center text-[#6a5c52]" colSpan={tableFields.length + 1}>
                        Sem registros para exibir.
                      </td>
                    </tr>
                  ) : (
                    records.map((record, index) => (
                      <tr
                        key={index}
                        className="border-t border-[#f0e7db] align-top transition-colors hover:bg-[#fff8ef]"
                      >
                        {tableFields.map((field) => {
                          const value = record[field.name];
                          return (
                            <td key={field.name} className="max-w-[260px] px-3 py-2 text-[#2f2a25]">
                              {shouldRenderImage(field.name, value) ? (
                                <ImageThumbnail src={value} alt={field.name} className="h-12 w-12" />
                              ) : (
                                <span className="line-clamp-2">{stringifyValue(value) || "-"}</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2">
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => openDetails(record)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => openEdit(record)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDelete(record)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-[auto_1fr_auto] sm:items-center">
              <Button variant="outline" className="w-full sm:w-auto" disabled={currentPage <= 1} onClick={() => goToPage(currentPage - 1)}>
                Anterior
              </Button>
              <p className="text-center text-sm text-[#6a5c52]">Mostrando {Math.min(PAGE_SIZE, records.length)} por página</p>
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                disabled={currentPage >= maxPage}
                onClick={() => goToPage(currentPage + 1)}
              >
                Próxima
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="fullscreen overflow-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do registro</DialogTitle>
            <DialogDescription>Visualização completa com todos os campos.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {detailsRecord &&
              Object.entries(detailsRecord).map(([key, value]) => (
                <div key={key} className="rounded-md border p-3">
                  <p className="text-xs uppercase text-muted-foreground">{key}</p>
                  {shouldRenderImage(key, value) ? (
                    <div className="mt-2">
                      <ImageThumbnail src={value} alt={key} className="h-40 w-full max-w-sm" />
                    </div>
                  ) : (
                    <pre className="mt-2 overflow-auto whitespace-pre-wrap text-sm">{stringifyValue(value) || "-"}</pre>
                  )}
                </div>
              ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="fullscreen overflow-auto">
          <DialogHeader>
            <DialogTitle>Editar registro</DialogTitle>
            <DialogDescription>
              Campos não editáveis (chave primária e controle interno) foram bloqueados.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {editableFields.map((field) => (
              <div key={field.name} className="space-y-1">
                <p className="text-sm font-medium text-[#4f3f33]">
                  {field.name} <span className="text-xs text-[#8f7a67]">({field.type})</span>
                </p>
                {field.type === "Json" || (formData[field.name] || "").length > 120 ? (
                  <Textarea
                    value={formData[field.name] ?? ""}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, [field.name]: event.target.value }))
                    }
                    rows={5}
                  />
                ) : field.type === "Boolean" ? (
                  <Select
                    value={(formData[field.name] ?? "false").toLowerCase() === "true" ? "true" : "false"}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, [field.name]: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Ativo (true)</SelectItem>
                      <SelectItem value="false">Inativo (false)</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={formData[field.name] ?? ""}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, [field.name]: event.target.value }))
                    }
                  />
                )}
                {shouldRenderImage(field.name, formData[field.name]) && (
                  <ImageThumbnail
                    src={formData[field.name]}
                    alt={field.name}
                    className="mt-2 h-20 w-20"
                  />
                )}
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submitEdit}>Salvar alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={allowCreate && createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="fullscreen overflow-auto">
          <DialogHeader>
            <DialogTitle>Novo registro</DialogTitle>
            <DialogDescription>
              Preencha os campos para criar um novo item em {selectedModelName || "..."}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {creatableFields.map((field) => (
              <div key={field.name} className="space-y-1">
                <p className="text-sm font-medium text-[#4f3f33]">
                  {field.name}
                  <span className="text-xs text-[#8f7a67]"> ({field.type})</span>
                  {field.isRequired && !field.hasDefaultValue ? " *" : ""}
                </p>
                {field.type === "Json" || (createData[field.name] || "").length > 120 ? (
                  <Textarea
                    value={createData[field.name] ?? ""}
                    onChange={(event) =>
                      setCreateData((prev) => ({ ...prev, [field.name]: event.target.value }))
                    }
                    rows={5}
                  />
                ) : field.type === "Boolean" ? (
                  <Select
                    value={(createData[field.name] ?? "false").toLowerCase() === "true" ? "true" : "false"}
                    onValueChange={(value) =>
                      setCreateData((prev) => ({ ...prev, [field.name]: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Ativo (true)</SelectItem>
                      <SelectItem value="false">Inativo (false)</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={createData[field.name] ?? ""}
                    onChange={(event) =>
                      setCreateData((prev) => ({ ...prev, [field.name]: event.target.value }))
                    }
                  />
                )}
                {shouldRenderImage(field.name, createData[field.name]) && (
                  <ImageThumbnail
                    src={createData[field.name]}
                    alt={field.name}
                    className="mt-2 h-20 w-20"
                  />
                )}
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submitCreate}>Criar registro</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={columnsDialogOpen} onOpenChange={setColumnsDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Colunas da tabela</DialogTitle>
            <DialogDescription>
              Escolha quais colunas serão mostradas no grid principal. O `id` fica por padrão apenas nos detalhes.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {visibleFields.map((field) => {
              const selected = (columnsByModel[selectedModelName] ?? []).includes(field.name);

              return (
                <Button
                  key={field.name}
                  type="button"
                  variant={selected ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => toggleTableColumn(field.name)}
                >
                  {field.name}
                </Button>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setColumnsDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
